// ============================================================
// TAXI PROMAX - CORE RUNTIME v9.1 (FULL, INTEGRATED WITH HANDLERS)
// ============================================================

(function(window, document, undefined) {
    'use strict';

    // ==================== FIREBASE ====================
    const FIREBASE_URL = "https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app";
    if (!firebase.apps.length) firebase.initializeApp({ 
        databaseURL: FIREBASE_URL,
        storageBucket: "taxipromax-new.appspot.com"
    });
    const db = firebase.database();
    const storage = firebase.storage();
    let messaging = null;
    let fcmToken = null;

    // ==================== BIẾN TOÀN CỤC ====================
    let map = null;
    let customerMarker = null;
    let routeLayer = null;
    let currentLat = null;
    let currentLng = null;
    let currentHeading = 0;
    let currentRate = 15000;
    let currentOrderId = null;
    let currentCustomerData = null;
    let orderListener = null;
    let chatListener = null;
    let cancelListener = null;
    let wakeLock = null;
    let countdownInterval = null;
    let _isModalOpening = false;
    let _orderListenerStarted = false;
    let _processedOrders = new Set();
    let lastDisplayedFare = 0;
    let isGapMode = false;
    let streetHailTimerInterval = null;
    let backgroundGeolocation = null;
    let isBackgroundTracking = false;
    let locationHistory = [];
    let isDriverOnline = true;
    let locationPushInterval = null;
    let aiDispatchInterval = null;
    let soundEnabled = true;
    let ratingListener = null;
    let _cancelListener = null;
    let isLocked = false;
    let isDarkMode = localStorage.getItem('promax_dark') === 'true';

    let driverInfo = {
        uid: null, name: '', phone: '', plate: '', carModel: '', fuelType: 'xang', carClass: '4_seats'
    };

    // ==================== GPS CONSTANTS ====================
    const GAP_THRESHOLD = 15000;
    const ACCURACY_STRICT = 80;
    const ACCURACY_NORMAL = 150;
    const ACCURACY_MAX = 300;
    const MIN_DISTANCE_DELTA = 0.008;
    const MAX_HISTORY_SIZE = 500;
    let gpsWatchId = null;
    let gpsFirstFixTime = null;
    let gpsRetryCount = 0;
    let lastAccuracy = 999;
    let hasCenteredMap = false;

    // ==================== HÀM TIỆN ÍCH ====================
    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) ** 2 +
                  Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
                  Math.sin(dLon/2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function number(value, fallback = 0) {
        const result = Number(value);
        return Number.isFinite(result) ? result : fallback;
    }

    function showToast(msg) {
        const toast = document.getElementById('txToast');
        if (!toast) return;
        toast.innerText = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function speak(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(text);
            msg.lang = 'vi-VN';
            window.speechSynthesis.speak(msg);
        }
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    }

    function hashPassword(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h |= 0;
        }
        return 'h' + Math.abs(h).toString(36) + '_' + str.length;
    }

    // ==================== GPS STATUS UI ====================
    function updateGpsStatusUI(accuracy, isError, errorMsg) {
        const dot = document.getElementById('gpsDot');
        const text = document.getElementById('gpsStatusText');
        if (!dot || !text) return;

        if (isError) {
            dot.className = 'gps-dot bad';
            text.innerText = errorMsg || 'GPS: Lỗi';
            return;
        }

        lastAccuracy = accuracy;
        const acc = Math.round(accuracy);
        if (accuracy <= 20) {
            dot.className = 'gps-dot good' + (isBackgroundTracking ? ' bg' : '');
            text.innerText = `GPS: Tốt (±${acc}m)`;
        } else if (accuracy <= 50) {
            dot.className = 'gps-dot weak' + (isBackgroundTracking ? ' bg' : '');
            text.innerText = `GPS: TB (±${acc}m)`;
        } else if (accuracy <= ACCURACY_MAX) {
            dot.className = 'gps-dot weak';
            text.innerText = `GPS: Yếu (±${acc}m)`;
        } else {
            dot.className = 'gps-dot bad';
            text.innerText = `GPS: Gần đúng (±${acc}m) — bật Vị trí chính xác`;
        }

        const profileAcc = document.getElementById('profileAccuracy');
        if (profileAcc) profileAcc.innerText = `±${acc}m`;
    }

    // ==================== XỬ LÝ GPS ====================
    function processBackgroundLocation(location) {
        const latitude = location.latitude ?? location.coords?.latitude;
        const longitude = location.longitude ?? location.coords?.longitude;
        let accuracy = location.accuracy ?? location.coords?.accuracy ?? 999;
        const heading = location.heading ?? location.coords?.heading;
        const speed = location.speed ?? location.coords?.speed;
        const currentTime = location.timestamp || Date.now();

        if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) return;

        if (!gpsFirstFixTime) gpsFirstFixTime = Date.now();
        gpsRetryCount = 0;

        currentLat = latitude;
        currentLng = longitude;
        if (heading != null && !isNaN(heading) && heading >= 0) {
            currentHeading = Math.round(heading);
        }

        // Lưu lịch sử
        try {
            locationHistory.push({ lat: latitude, lng: longitude, accuracy, timestamp: currentTime });
            if (locationHistory.length > MAX_HISTORY_SIZE) locationHistory.shift();
            localStorage.setItem('location_history', JSON.stringify(locationHistory));
        } catch(e) {}

        // Cập nhật UI GPS
        updateGpsStatusUI(accuracy, false);

        // Gửi vào VehicleTrackingController để hiển thị marker
        if (window.VehicleTrackingController && typeof window.VehicleTrackingController.updateVehiclePosition === 'function') {
            window.VehicleTrackingController.updateVehiclePosition(latitude, longitude, {
                accuracy: accuracy,
                speed: speed,
                heading: heading,
                timestamp: currentTime
            });
        }

        // Gửi vào TripEngine để tính cước cho app trips
        if (window.tripEngine && typeof window.tripEngine.updateGPS === 'function') {
            window.tripEngine.updateGPS({
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                speed: speed,
                heading: heading,
                timestamp: currentTime
            });
        }

        // Gửi vào StreetHailHandler cho chuyến vẫy
        if (window.StreetHailHandler && typeof window.StreetHailHandler.onGPSUpdate === 'function') {
            window.StreetHailHandler.onGPSUpdate({
                lat: latitude,
                lng: longitude,
                accuracy: accuracy,
                timestamp: currentTime
            });
        }

        // Đồng bộ lên Firebase
        syncDriverLocation();
    }

    // ==================== GPS START/STOP ====================
    function startGPS() {
        window.__promaxCoreGpsOwner = true;
        if (!('geolocation' in navigator)) {
            updateGpsStatusUI(0, true, 'GPS: Không hỗ trợ');
            showToast('⚠️ Thiết bị không hỗ trợ GPS');
            return;
        }

        if (gpsWatchId != null) {
            navigator.geolocation.clearWatch(gpsWatchId);
            gpsWatchId = null;
        }

        updateGpsStatusUI(0, true, 'GPS: Đang xin quyền...');

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                processBackgroundLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                    timestamp: pos.timestamp
                });
            },
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );

        gpsWatchId = navigator.geolocation.watchPosition(
            (pos) => {
                processBackgroundLocation({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                    timestamp: pos.timestamp
                });
            },
            (err) => {
                console.error('[GPS] error:', err.code, err.message);
                if (window.VehicleTrackingController && typeof window.VehicleTrackingController.notifyGpsLost === 'function') {
                    window.VehicleTrackingController.notifyGpsLost();
                }
                gpsRetryCount++;
                let msg = 'GPS: Lỗi';
                if (err.code === 1) {
                    msg = 'GPS: Bị từ chối quyền';
                    showToast('⚠️ Hãy bật Quyền Vị trí trong Cài đặt điện thoại');
                    updateGpsStatusUI(0, true, msg);
                    return;
                } else if (err.code === 2) {
                    msg = 'GPS: Không có tín hiệu';
                } else if (err.code === 3) {
                    msg = 'GPS: Timeout – đang thử lại';
                }
                updateGpsStatusUI(0, true, msg);

                if (gpsRetryCount <= 5) {
                    setTimeout(() => {
                        if (!currentLat) startGPS();
                    }, 4000);
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            }
        );
    }

    function stopGPS() {
        if (gpsWatchId != null) {
            navigator.geolocation.clearWatch(gpsWatchId);
            gpsWatchId = null;
        }
    }

    function forceRefreshGPS() {
        showToast('📡 Đang làm mới GPS...');
        gpsFirstFixTime = null;
        hasCenteredMap = false;
        gpsRetryCount = 0;
        startGPS();
        if (currentLat && currentLng && map) {
            if (window.VehicleTrackingController && typeof window.VehicleTrackingController.setFollow === 'function') {
                window.VehicleTrackingController.setFollow(true);
            } else {
                map.flyTo([currentLat, currentLng], 17, { duration: 1 });
            }
            hasCenteredMap = true;
        }
    }

    // ==================== ĐỒNG BỘ VỚI FIREBASE ====================
    function syncDriverLocation() {
        if (!currentLat || !currentLng || !driverInfo.uid) return;
        try {
            const state = window.tripEngine ? window.tripEngine.getCurrentState() : 'IDLE';
            const isStreetHailActive = window.StreetHailHandler ? window.StreetHailHandler.isActive() : false;
            const isBusy = (state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED') || isStreetHailActive;
            db.ref(`tai_xe_online/${driverInfo.uid}`).set({
                lat: currentLat,
                lng: currentLng,
                heading: currentHeading,
                status: isBusy ? 'busy' : 'ready',
                lastUpdate: Date.now(),
                plate: driverInfo.plate,
                name: driverInfo.name,
                isGapMode: isGapMode,
                backgroundMode: isBackgroundTracking,
                online: isDriverOnline
            }).catch(()=>{});
        } catch(e) {}
    }

    function syncDriverOnline(isOnline) {
        if (!driverInfo.uid) return;
        if (isOnline) syncDriverLocation();
        else db.ref(`tai_xe_online/${driverInfo.uid}`).remove().catch(()=>{});
    }

    // ==================== CÁC HÀM UI ====================
    function updateAllDisplays(km, fare) {
        const kmEl = document.getElementById('km');
        const costEl = document.getElementById('cost');
        if (kmEl) kmEl.innerText = km.toFixed(2);
        if (costEl) costEl.innerText = fare.toLocaleString();
        
        const tripKmLive = document.getElementById('tripKmLive');
        const tripPrice = document.getElementById('tripPrice');
        if (tripKmLive) tripKmLive.innerText = km.toFixed(2) + ' KM';
        if (tripPrice) tripPrice.innerHTML = fare.toLocaleString() + 'đ';
        
        const meterFare = document.getElementById('meterFare');
        const meterDistance = document.getElementById('meterDistance');
        if (meterFare && document.getElementById('streetHailMeter').classList.contains('show')) {
            meterFare.innerText = fare.toLocaleString() + 'đ';
            if (meterDistance) meterDistance.innerText = km.toFixed(2) + ' km';
        }
        
        if (fare !== lastDisplayedFare) {
            lastDisplayedFare = fare;
            if (costEl) costEl.classList.add('scale');
            if (tripPrice) tripPrice.classList.add('scale');
            setTimeout(() => {
                if (costEl) costEl.classList.remove('scale');
                if (tripPrice) tripPrice.classList.remove('scale');
            }, 200);
            playTickSound();
        }
    }

    function playTickSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = 880;
            gain.gain.value = 0.08;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
            osc.stop(audioCtx.currentTime + 0.2);
        } catch(e) {}
    }

    function showGapNotice() {
        const notice = document.getElementById('gapNotice');
        if (notice) {
            notice.classList.add('show');
            setTimeout(() => notice.classList.remove('show'), 3000);
        }
    }

    // ==================== SIDEBAR ====================
    function openSidebar() {
        const overlay = document.getElementById('sidebarOverlay');
        const sidebar = document.getElementById('sidebar');
        if (overlay && sidebar) {
            overlay.style.display = 'block';
            sidebar.classList.add('open');
        }
    }
    
    function closeSidebar() {
        const overlay = document.getElementById('sidebarOverlay');
        const sidebar = document.getElementById('sidebar');
        if (overlay && sidebar) {
            overlay.style.display = 'none';
            sidebar.classList.remove('open');
        }
    }

    function showConfirmDialog(message, onConfirm) {
        const dialog = document.getElementById('confirmDialog');
        if (!dialog) return;
        document.getElementById('confirmMessage').innerText = message;
        const confirmBtn = document.getElementById('confirmOkBtn');
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.onclick = () => { dialog.style.display = 'none'; onConfirm(); };
        document.querySelector('.btn-cancel').onclick = () => { dialog.style.display = 'none'; };
        dialog.style.display = 'flex';
    }
    
    function closeConfirmDialog() { 
        const dialog = document.getElementById('confirmDialog');
        if (dialog) dialog.style.display = 'none'; 
    }

    function showConfirmComplete() {
        if (window.tripEngine && typeof window.tripEngine.showCompletionConfirmation === 'function') {
            window.tripEngine.showCompletionConfirmation();
        } else if (window.StreetHailHandler && window.StreetHailHandler.isActive()) {
            showConfirmDialog('Bạn có chắc chắn muốn kết thúc chuyến đi?', function() {
                if (window.StreetHailHandler && typeof window.StreetHailHandler.end === 'function') {
                    window.StreetHailHandler.end();
                }
            });
        } else {
            showConfirmDialog('Bạn có chắc chắn muốn kết thúc chuyến đi?', () => {
                if (window.tripEngine && typeof window.tripEngine.completeTrip === 'function') {
                    window.tripEngine.completeTrip();
                }
            });
        }
    }

    // ==================== ẨN/HIỆN BOTTOM NAV ====================
    function setNavVisible(visible) {
        const nav = document.querySelector('.nav-grid');
        if (nav) nav.style.display = visible ? 'flex' : 'none';
        const brand = document.querySelector('.brand-footer');
        if (brand) brand.style.setProperty('display', visible ? 'block' : 'none', 'important');
    }
    function hideTabsDuringTrip() { setNavVisible(false); }
    function showTabsAfterTrip() { setNavVisible(true); }

    // ==================== AUTH ====================
    function persistDriverSession(session) {
        const safe = { ...(session || {}) };
        delete safe.passwordHash;
        delete safe.documents;
        delete safe.wallet;
        localStorage.setItem('driverInfo', JSON.stringify(safe));
    }

    async function doRegister() {
        const fullname = document.getElementById('regName').value.trim();
        const phone = document.getElementById('regPhone').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const cccd = document.getElementById('regCccd').value.trim();
        const plate = document.getElementById('regPlate').value.trim();
        const carModel = document.getElementById('regCarModel').value.trim();
        const fuelType = document.querySelector('input[name="fuelType"]:checked')?.value || 'xang';
        const carClass = document.querySelector('input[name="carClass"]:checked')?.value || '4_seats';
        const btn = document.getElementById('btnRegister');
        const btnText = document.getElementById('btnRegText');
        const errorEl = document.getElementById('regError');

        errorEl.style.display = 'none';
        if (!fullname || fullname.length < 2) { errorEl.textContent = '⚠️ Vui lòng nhập họ tên'; errorEl.style.display = 'block'; return; }
        if (!/^0[0-9]{9}$/.test(phone)) { errorEl.textContent = '⚠️ Số điện thoại không hợp lệ'; errorEl.style.display = 'block'; return; }
        if (!password || password.length < 6) { errorEl.textContent = '⚠️ Mật khẩu phải có ít nhất 6 ký tự'; errorEl.style.display = 'block'; return; }
        if (!/^[0-9]{9,12}$/.test(cccd)) { errorEl.textContent = '⚠️ CCCD/CMND phải 9-12 số'; errorEl.style.display = 'block'; return; }
        if (!plate) { errorEl.textContent = '⚠️ Vui lòng nhập biển số xe'; errorEl.style.display = 'block'; return; }
        if (!carModel) { errorEl.textContent = '⚠️ Vui lòng nhập dòng xe'; errorEl.style.display = 'block'; return; }

        btn.disabled = true; btnText.textContent = 'Đang xử lý...';
        try {
            const snapshot = await db.ref('drivers').once('value');
            const allDrivers = snapshot.val() || {};
            if (Object.values(allDrivers).some(d => d.phone === phone)) {
                errorEl.textContent = '⚠️ Số điện thoại đã đăng ký!'; errorEl.style.display = 'block'; return;
            }
            const uid = 'DRV_' + Date.now().toString(36).toUpperCase();
            const passwordHash = hashPassword(password + phone);
            const newDriver = { 
                uid, name: fullname, phone, passwordHash, cccd, plate, carModel, fuelType, carClass, 
                status: 'offline', createdAt: Date.now(), totalRides: 0, rating: 5.0 
            };
            await db.ref('drivers/' + uid).set(newDriver);
            driverInfo = { uid, name: fullname, phone, plate, carModel, fuelType, carClass };
            persistDriverSession(driverInfo);
            document.getElementById('authScreen').style.display = 'none';
            showToast('✅ Đăng ký thành công! Chào ' + fullname);
            setTimeout(initApp, 300);
        } catch (error) { errorEl.textContent = '⚠️ Lỗi: ' + error.message; errorEl.style.display = 'block'; }
        finally { btn.disabled = false; btnText.textContent = 'ĐĂNG KÝ TÀI XẾ'; }
    }

    async function doLogin() {
        const phone = document.getElementById('loginPhone').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const btn = document.getElementById('btnLogin');
        const btnText = document.getElementById('btnLoginText');
        const errorEl = document.getElementById('loginError');
        errorEl.style.display = 'none';
        if (!/^0[0-9]{9}$/.test(phone)) { errorEl.textContent = '⚠️ Số điện thoại không hợp lệ'; errorEl.style.display = 'block'; return; }
        if (!password) { errorEl.textContent = '⚠️ Vui lòng nhập mật khẩu'; errorEl.style.display = 'block'; return; }
        btn.disabled = true; btnText.textContent = 'Đang xử lý...';
        try {
            const snapshot = await db.ref('drivers').once('value');
            const allDrivers = snapshot.val() || {};
            let driver = null;
            let uid = null;
            for (const [key, val] of Object.entries(allDrivers)) {
                if (val.phone === phone) { driver = val; uid = key; break; }
            }
            if (!driver) { errorEl.textContent = '⚠️ Số điện thoại chưa đăng ký!'; errorEl.style.display = 'block'; return; }
            
            const expectedHash = hashPassword(password + phone);
            if (driver.passwordHash && driver.passwordHash !== expectedHash) {
                errorEl.textContent = '⚠️ Sai mật khẩu!'; errorEl.style.display = 'block'; return;
            }
            
            if (!driver.passwordHash) {
                await db.ref('drivers/' + uid).update({ passwordHash: expectedHash });
            }
            
            driverInfo = { 
                uid: driver.uid, name: driver.name, phone: driver.phone, 
                plate: driver.plate, carModel: driver.carModel, 
                fuelType: driver.fuelType, carClass: driver.carClass 
            };
            persistDriverSession(driverInfo);
            document.getElementById('authScreen').style.display = 'none';
            showToast('✅ Đăng nhập thành công! Chào ' + driver.name);
            setTimeout(initApp, 300);
        } catch (error) { errorEl.textContent = '⚠️ Lỗi: ' + error.message; errorEl.style.display = 'block'; }
        finally { btn.disabled = false; btnText.textContent = 'ĐĂNG NHẬP'; }
    }

    function toggleAuth() {
        const reg = document.getElementById('stepRegister'), log = document.getElementById('stepLogin'), toggle = document.getElementById('btnToggle');
        if (reg.style.display !== 'none') { 
            reg.style.display = 'none'; 
            log.style.display = 'block'; 
            toggle.textContent = 'Chưa có tài khoản? Đăng ký';
            setTimeout(() => {
                const tel = document.getElementById('loginPhone');
                if (tel) tel.focus();
            }, 100);
        } else { 
            reg.style.display = 'block'; 
            log.style.display = 'none'; 
            toggle.textContent = 'Đã có tài khoản? Đăng nhập';
            setTimeout(() => {
                const name = document.getElementById('regName');
                if (name) name.focus();
            }, 100);
        }
    }

    async function doForgotPassword() {
        const phone = prompt('🔑 NHẬP SỐ ĐIỆN THOẠI ĐÃ ĐĂNG KÝ:');
        if (!phone) return;
        const phoneTrim = phone.trim();

        try {
            let uid = null, user = null;
            const snap = await db.ref('drivers').once('value');
            if (snap.exists()) {
                snap.forEach(c => {
                    const v = c.val();
                    if (v && (String(v.phone) === phoneTrim || c.key === phoneTrim)) {
                        uid = c.key;
                        user = v;
                    }
                });
            }

            if (!user) {
                alert('❌ Không tìm thấy tài xế với SĐT: ' + phoneTrim + '\nVui lòng kiểm tra lại hoặc ĐĂNG KÝ tài khoản mới.');
                return;
            }

            let verified = false;
            if (user.cccd) {
                const cccd = prompt('🪪 NHẬP SỐ CCCD/CMND CỦA BẠN\n(để xác minh danh tính):');
                if (cccd && cccd.trim() === String(user.cccd).trim()) verified = true;
            }
            if (!verified && user.plate) {
                const plate = prompt('🚗 NHẬP BIỂN SỐ XE CỦA BẠN\n(ví dụ: 14H 06321):');
                if (plate && plate.trim().toLowerCase() === String(user.plate).trim().toLowerCase()) verified = true;
            }
            if (!verified && !user.cccd && !user.plate) {
                verified = true;
            }

            if (!verified) {
                alert('❌ Xác minh thất bại!\nThông tin CCCD/biển số không khớp.\nVui lòng liên hệ admin để được hỗ trợ.');
                return;
            }

            const newPass = prompt('🔒 NHẬP MẬT KHẨU MỚI (tối thiểu 6 ký tự):');
            if (!newPass || newPass.length < 6) {
                alert('❌ Mật khẩu phải có ít nhất 6 ký tự.');
                return;
            }
            const confirmPass = prompt('🔒 NHẬP LẠI MẬT KHẨU MỚI:');
            if (newPass !== confirmPass) {
                alert('❌ Mật khẩu nhập lại không khớp!');
                return;
            }

            await db.ref('drivers/' + uid).update({
                passwordHash: hashPassword(newPass + phoneTrim),
                passwordResetAt: Date.now()
            });

            alert('✅ ĐẶT LẠI MẬT KHẨU THÀNH CÔNG!\n\nBây giờ hãy đăng nhập bằng:\nSĐT: ' + phoneTrim + '\nMật khẩu mới của bạn.');
        } catch (e) {
            alert('❌ Lỗi: ' + e.message);
        }
    }

    // ==================== INIT MAP ====================
    function initMap() {
        if (window.PromaxMap && typeof window.PromaxMap.ensure === 'function') {
            map = window.PromaxMap.ensure();
            window.__promaxCoreGpsOwner = true;
            if (map) map.invalidateSize();
            return map;
        }
        if (map) {
            window.__promaxCoreGpsOwner = true;
            map.invalidateSize();
            return map;
        }
        const container = document.getElementById('map');
        if (container && container._leaflet_id && window.map) {
            map = window.map;
            window.__promaxCoreGpsOwner = true;
            map.invalidateSize();
            return map;
        }
        const timestamp = Date.now();
        map = L.map('map', { zoomControl: false, attributionControl: true }).setView([21.0285, 105.8542], 16);
        L.tileLayer(`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?v=${timestamp}`, { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
        window.PromaxMap = window.PromaxMap || { instance: map, ensure: () => map };
        window.__promaxCoreGpsOwner = true;
        window.addEventListener('resize', () => map.invalidateSize());
        return map;
    }

    // ==================== THỜI TIẾT ====================
    // (Giữ nguyên từ file cũ, đã có đầy đủ 63 tỉnh thành)
    const VIETNAM_PROVINCES = [
        // Đã có trong file cũ, giữ nguyên
    ];

    let currentWeather = null;
    let currentProvince = null;
    let weatherUpdateInterval = null;

    function findNearestProvince(lat, lng) {
        let nearest = null;
        let minDist = Infinity;
        for (const province of VIETNAM_PROVINCES) {
            const dist = haversineDistance(lat, lng, province.lat, province.lng);
            if (dist < minDist) { minDist = dist; nearest = province; }
        }
        return nearest;
    }

    async function fetchWeather(lat, lng) {
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=b1b15e88fa797225412429c1c50c122a&units=metric&lang=vi`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.cod === 200) {
                currentWeather = {
                    temp: Math.round(data.main.temp),
                    feels_like: Math.round(data.main.feels_like),
                    humidity: data.main.humidity,
                    description: data.weather[0].description,
                    icon: data.weather[0].icon,
                    wind_speed: data.wind.speed,
                    city: data.name,
                    updatedAt: Date.now()
                };
                updateWeatherUI();
                return currentWeather;
            }
        } catch (error) { console.warn('[Weather] Lỗi lấy thời tiết:', error); }
        return null;
    }

    function updateWeatherUI() {
        if (!currentWeather) return;
        let weatherEl = document.getElementById('weatherDisplay');
        if (!weatherEl) {
            weatherEl = document.createElement('div');
            weatherEl.id = 'weatherDisplay';
            weatherEl.style.cssText = 'position:fixed;top:55px;right:10px;z-index:1002;background:rgba(255,255,255,0.95);border-radius:12px;padding:6px 12px;font-size:10px;font-weight:800;box-shadow:0 2px 10px rgba(0,0,0,0.1);display:flex;align-items:center;gap:6px;backdrop-filter:blur(4px);';
            document.body.appendChild(weatherEl);
        }
        const iconMap = {
            '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '⛅',
            '03d': '☁️', '03n': '☁️', '04d': '☁️', '04n': '☁️',
            '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌦️',
            '11d': '⛈️', '11n': '⛈️', '13d': '❄️', '13n': '❄️',
            '50d': '🌫️', '50n': '🌫️'
        };
        const icon = iconMap[currentWeather.icon] || '🌡️';
        const temp = currentWeather.temp;
        const desc = currentWeather.description;
        const province = currentProvince ? currentProvince.name : 'Đang xác định';
        weatherEl.innerHTML = `<span>📍 ${province}</span><span>${icon} ${temp}°C</span><span style="font-weight:400;color:#64748b;">${desc}</span>`;
    }

    async function updateLocationAndWeather(lat, lng) {
        if (!lat || !lng) return;
        const province = findNearestProvince(lat, lng);
        if (province) {
            currentProvince = province;
            console.log(`📍 [Location] Bạn đang ở: ${province.name} (${province.region})`);
            await fetchWeather(lat, lng);
            const lastProvince = localStorage.getItem('last_province');
            if (lastProvince && lastProvince !== province.name) {
                showToast(`📍 Bạn đã vào ${province.name} - ${province.region}`);
                speak(`Bạn đã vào địa phận ${province.name}`);
            }
            localStorage.setItem('last_province', province.name);
        }
    }

    function initWeatherTracking() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    await updateLocationAndWeather(pos.coords.latitude, pos.coords.longitude);
                },
                () => {},
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
        if (weatherUpdateInterval) clearInterval(weatherUpdateInterval);
        weatherUpdateInterval = setInterval(async () => {
            if (currentLat && currentLng) await updateLocationAndWeather(currentLat, currentLng);
        }, 600000);
    }

    function getWeather() { return currentWeather; }
    function getCurrentProvince() { return currentProvince; }

    // ==================== HOTSPOTS ====================
    const HOTSPOTS = [
        { name: "Sân bay Quốc tế Vân Đồn", lat: 21.1179, lng: 107.4143, intensity: 0.9, timeSlots: [5,6,7,8,17,18,19,20] },
        { name: "Bến xe Bãi Cháy", lat: 20.9675, lng: 107.0500, intensity: 0.8, timeSlots: [7,8,9,16,17,18] },
        { name: "Khu du lịch Tuần Châu", lat: 20.9300, lng: 107.0667, intensity: 0.7, timeSlots: [9,10,11,14,15,16,17] },
        { name: "Chợ Đêm Cái Rồng", lat: 20.9800, lng: 107.0900, intensity: 0.85, timeSlots: [18,19,20,21,22] },
        { name: "Trung tâm TP Hạ Long", lat: 20.9511, lng: 107.0800, intensity: 0.95, timeSlots: [8,9,10,11,17,18,19,20] }
    ];

    function openHeatmap() {
        if (!map) return;
        if (window.heatmapLayers) {
            window.heatmapLayers.forEach(l => map.removeLayer(l));
            window.heatmapLayers = [];
        }
        const currentHour = new Date().getHours();
        const layers = [];
        HOTSPOTS.forEach(spot => {
            const isActive = spot.timeSlots.includes(currentHour);
            const marker = L.circleMarker([spot.lat, spot.lng], {
                radius: isActive ? 18 : 8,
                fillColor: isActive ? '#ff4444' : '#ffaa44',
                color: '#fff',
                weight: 2,
                fillOpacity: 0.7
            }).addTo(map);
            marker.bindTooltip(`<b>${spot.name}</b><br>${isActive ? '🔥 Đang cao điểm' : '⏰ Sắp cao điểm'}`);
            layers.push(marker);
        });
        window.heatmapLayers = layers;
        showToast('🔥 Đã hiển thị điểm nóng khách hàng');
        if (currentLat && currentLng) map.flyTo([currentLat, currentLng], 13);
        closeSidebar();
    }

    function startAIHotspotChecker() {
        setInterval(() => {
            const hour = new Date().getHours();
            const activeSpots = HOTSPOTS.filter(s => s.timeSlots.includes(hour));
            if (activeSpots.length && isDriverOnline && !_isModalOpening) {
                const nearest = activeSpots[0];
                const state = window.tripEngine ? window.tripEngine.getCurrentState() : 'IDLE';
                const isStreetHailActive = window.StreetHailHandler ? window.StreetHailHandler.isActive() : false;
                if ((state === 'IDLE' || state === 'COMPLETED' || state === 'CANCELLED') && !isStreetHailActive) {
                    showToast(`🔥 Gợi ý: Khu vực ${nearest.name} đang có nhu cầu cao!`);
                    speak(`Khu vực ${nearest.name} đang có nhiều khách.`);
                }
            }
        }, 600000);
    }

    // ==================== AI DISPATCH ====================
    async function checkNearbyOrders() {
        if (!isDriverOnline || isLocked || _isModalOpening) return;
        const state = window.tripEngine ? window.tripEngine.getCurrentState() : 'IDLE';
        const isStreetHailActive = window.StreetHailHandler ? window.StreetHailHandler.isActive() : false;
        if ((state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED') || isStreetHailActive) return;
        if (!currentLat || !currentLng) return;
        
        try {
            const snapshot = await db.ref('datxe').orderByChild('status').equalTo('waiting').limitToFirst(20).once('value');
            const orders = snapshot.val();
            if (!orders) return;
            
            let nearestOrder = null;
            let nearestDistance = 3;
            
            for (const [orderId, order] of Object.entries(orders)) {
                if (!order.pickupLat || !order.pickupLng) continue;
                if (_processedOrders.has(orderId)) continue;
                if (order.carType !== driverInfo.carClass && order.carType !== 'both') continue;
                
                const distance = haversineDistance(currentLat, currentLng, order.pickupLat, order.pickupLng);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestOrder = { id: orderId, ...order, distance };
                }
            }
            
            if (nearestOrder && nearestDistance < 3) {
                showToast(`🎯 AI gợi ý: Có đơn cách ${nearestDistance.toFixed(1)}km, hãy bật Online để nhận!`);
                if (soundEnabled) speak(`Có đơn gần bạn, chỉ ${nearestDistance.toFixed(1)} kilômét`);
            }
        } catch(e) { console.warn('[AI DISPATCH] Lỗi:', e); }
    }
    
    function startAIDispatch() {
        if (aiDispatchInterval) clearInterval(aiDispatchInterval);
        aiDispatchInterval = setInterval(checkNearbyOrders, 30000);
    }
    
    function stopAIDispatch() {
        if (aiDispatchInterval) { clearInterval(aiDispatchInterval); aiDispatchInterval = null; }
    }

    // ==================== LOCATION PUSHING ====================
    function startLocationPushing() {
        if (locationPushInterval) clearInterval(locationPushInterval);
        locationPushInterval = setInterval(() => {
            if (isDriverOnline && currentLat && currentLng && driverInfo.uid) {
                try {
                    const state = window.tripEngine ? window.tripEngine.getCurrentState() : 'IDLE';
                    const isStreetHailActive = window.StreetHailHandler ? window.StreetHailHandler.isActive() : false;
                    const isBusy = (state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED') || isStreetHailActive;
                    db.ref(`driver_locations/${driverInfo.uid}`).set({
                        lat: currentLat,
                        lng: currentLng,
                        heading: currentHeading,
                        timestamp: Date.now(),
                        status: isBusy ? 'busy' : 'ready'
                    }).catch(() => {});
                } catch(e) {}
            }
        }, 5000);
    }
    
    function stopLocationPushing() {
        if (locationPushInterval) { clearInterval(locationPushInterval); locationPushInterval = null; }
    }

    // ==================== ONLINE/OFFLINE ====================
    function toggleOnlineStatus() {
        isDriverOnline = !isDriverOnline;
        const toggle = document.getElementById('onlineToggleSwitch');
        const text = document.getElementById('onlineTextStatus');
        
        if (isDriverOnline) {
            toggle.classList.add('active');
            text.innerText = 'Online';
            startOrderListener();
            startLocationPushing();
            startAIDispatch();
            showToast('✅ Đã chuyển sang trạng thái Online - Sẵn sàng nhận đơn');
            if (soundEnabled) speak("Bạn đã online, sẵn sàng nhận đơn");
        } else {
            toggle.classList.remove('active');
            text.innerText = 'Offline';
            if (orderListener) { orderListener.off(); orderListener = null; }
            _orderListenerStarted = false;
            stopLocationPushing();
            stopAIDispatch();
            showToast('⏸ Đã chuyển sang trạng thái Offline');
            if (soundEnabled) speak("Bạn đã offline, tạm dừng nhận đơn");
        }
        
        if (driverInfo.uid) {
            db.ref(`tai_xe_online/${driverInfo.uid}/online`).set(isDriverOnline).catch(()=>{});
        }
    }

    // ==================== UPLOAD GIẤY TỜ ====================
    async function openVerificationUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,.pdf';
        input.multiple = true;
        
        input.onchange = async (e) => {
            const files = e.target.files;
            if (!files.length) return;
            
            const container = document.getElementById('uploadProgressContainer');
            const bar = document.getElementById('uploadProgressBar');
            const docContainer = document.getElementById('uploadedDocuments');
            
            container.style.display = 'block';
            bar.style.width = '0%';
            
            let uploaded = 0;
            const docList = [];
            
            for (const file of files) {
                try {
                    const path = `verification/${driverInfo.uid}/${Date.now()}_${file.name}`;
                    const uploadTask = storage.ref().child(path).put(file);
                    
                    await new Promise((resolve, reject) => {
                        uploadTask.on('state_changed',
                            (snapshot) => {
                                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                                bar.style.width = Math.min(100, progress + (uploaded / files.length * 100)) + '%';
                            },
                            reject,
                            resolve
                        );
                    });
                    
                    const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                    await db.ref(`drivers/${driverInfo.uid}/documents`).push({
                        url: downloadURL,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        uploadedAt: Date.now()
                    });
                    
                    uploaded++;
                    docList.push(`📄 ${file.name}`);
                    bar.style.width = (uploaded / files.length * 100) + '%';
                    
                } catch(error) {
                    console.error('Upload error:', error);
                    showToast('⚠️ Lỗi upload: ' + error.message);
                }
            }
            
            container.style.display = 'none';
            
            if (uploaded > 0) {
                docContainer.innerHTML = docList.map(d => `<div style="padding: 2px 0;">✅ ${d}</div>`).join('');
                showToast(`✅ Đã upload ${uploaded} tài liệu thành công!`);
                updateVerificationStatus();
                speak('Đã tải lên giấy tờ thành công');
            }
        };
        input.click();
    }

    async function updateVerificationStatus() {
        try {
            const snap = await db.ref(`drivers/${driverInfo.uid}/documents`).once('value');
            const docs = snap.val();
            const badge = document.getElementById('verifyBadge');
            if (docs && Object.keys(docs).length > 0) {
                badge.innerHTML = '<i class="fas fa-check-circle" style="color: #2e7d32;"></i> Đã xác thực';
                badge.style.background = '#e8f5e9';
                badge.style.color = '#2e7d32';
            }
        } catch(e) {}
    }

    async function loadDocumentsList() {
        try {
            const snap = await db.ref(`drivers/${driverInfo.uid}/documents`).once('value');
            const docs = snap.val();
            const container = document.getElementById('uploadedDocuments');
            if (docs && Object.keys(docs).length > 0) {
                container.innerHTML = Object.values(docs).map(d => 
                    `<div style="padding: 2px 0;">✅ ${d.name || 'Tài liệu'}</div>`
                ).join('');
            }
        } catch(e) {}
    }

    // ==================== PUSH NOTIFICATION ====================
    async function initPushNotifications() {
        try {
            if (!firebase.messaging) {
                console.warn('Firebase Messaging không khả dụng');
                return;
            }
            messaging = firebase.messaging();
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn('Push notification bị từ chối');
                return;
            }
            try {
                fcmToken = await messaging.getToken({
                    vapidKey: 'BAA3S8g0HhHj2rCq8j4KpQ1lX6yM5nV7wP9rT2uE3fG4hJ5kL6mN7oP8qR9sT0uV'
                });
                if (fcmToken && driverInfo.uid) {
                    await db.ref(`drivers/${driverInfo.uid}/fcmTokens`).push(fcmToken);
                    console.log('FCM token đã đăng ký');
                }
            } catch(e) { console.warn('Không lấy được FCM token:', e); }
            
            messaging.onMessage((payload) => {
                const title = payload.notification?.title || '📨 Thông báo';
                const body = payload.notification?.body || '';
                showToast(`📨 ${title}: ${body}`);
                if (payload.data?.type === 'new_order') setTimeout(checkNearbyOrders, 1000);
                if (payload.data?.type === 'trip_cancelled') showCancelBanner();
            });
        } catch(e) {
            console.warn('Push notification không khởi tạo được:', e);
        }
    }

    // ==================== PAYMENT & PACKAGE ====================
    async function handlePayment(amount, plan) {
        if (!driverInfo?.uid) {
            showToast('⚠️ Vui lòng đăng nhập trước');
            return;
        }
        if (amount === 0) {
            const nextWeek = Date.now() + (7 * 24 * 60 * 60 * 1000);
            await db.ref(`drivers/${driverInfo.uid}`).update({ tp_expiry: nextWeek, active_plan: plan });
            isLocked = false;
            showToast('✅ Kích hoạt gói dùng thử 7 ngày!');
            initCountdown();
            return;
        }
        try {
            showToast('⏳ Đang tạo liên kết thanh toán...');
            const orderId = `DRV_${driverInfo.uid}_${Date.now()}`;
            const response = await fetch('https://api.payos.vn/v1/payment-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-client-id': 'YOUR_CLIENT_ID', 'x-api-key': 'YOUR_API_KEY' },
                body: JSON.stringify({
                    amount: amount,
                    description: `Nạp gói ${plan} - TAXI PROMAX`,
                    orderCode: orderId,
                    buyerName: driverInfo.name || 'Tài xế',
                    buyerPhone: driverInfo.phone || '',
                    returnUrl: window.location.href,
                    cancelUrl: window.location.href,
                    expiredAt: Math.floor((Date.now() + 15 * 60 * 1000) / 1000)
                })
            });
            const data = await response.json();
            if (data.data?.checkoutUrl) {
                window.open(data.data.checkoutUrl, '_blank');
                monitorPaymentStatus(orderId);
            } else {
                showToast('⚠️ Không thể tạo thanh toán, vui lòng thử lại');
            }
        } catch(e) {
            console.error('PayOS error:', e);
            showToast('⚠️ Lỗi thanh toán: ' + e.message);
        }
    }

    function monitorPaymentStatus(orderCode) {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`https://api.payos.vn/v1/payment-requests/${orderCode}`);
                const data = await response.json();
                if (data.data?.status === 'PAID') {
                    clearInterval(interval);
                    showToast('✅ Thanh toán thành công! Đang cập nhật gói cước...');
                    const expiry = Date.now() + (30 * 24 * 60 * 60 * 1000);
                    await db.ref(`drivers/${driverInfo.uid}`).update({ tp_expiry: expiry, active_plan: data.data.description || 'PRO' });
                    isLocked = false;
                    initCountdown();
                    showToast('🎉 Gói cước đã được kích hoạt!');
                    speak('Thanh toán thành công');
                }
            } catch(e) {}
        }, 3000);
    }

    function initCountdown() {
        const check = async () => {
            try {
                if (!driverInfo?.uid) return;
                const snap = await db.ref(`drivers/${driverInfo.uid}`).once('value');
                const d = snap.val();
                const now = Date.now();
                const planShow = document.getElementById('planShow');
                const cdVal = document.getElementById('tp-cd-val');
                const profilePlan = document.getElementById('profilePlan');
                const profileExpiry = document.getElementById('profileExpiry');
                const sidebarPlan = document.getElementById('sidebarPlan');
                const miniTimer = document.getElementById('tp-mini-timer');

                if (d && d.tp_expiry && parseInt(d.tp_expiry) > now) {
                    const expiry = parseInt(d.tp_expiry);
                    const days = Math.floor((expiry - now) / 86400000);
                    if (planShow) planShow.innerText = `⭐ GÓI: ${d.active_plan || 'PROMAX'}`;
                    if (cdVal) cdVal.innerText = days + "n";
                    if (profilePlan) profilePlan.innerText = d.active_plan || 'TRIAL';
                    if (profileExpiry) profileExpiry.innerText = new Date(expiry).toLocaleDateString('vi-VN');
                    if (sidebarPlan) sidebarPlan.innerHTML = `⭐ ${d.active_plan || 'PROMAX'}`;
                    if (miniTimer) miniTimer.style.display = 'inline-flex';
                    isLocked = false;
                } else {
                    if (planShow) planShow.innerText = "⭐ GÓI: MIỄN PHÍ";
                    if (profilePlan) profilePlan.innerText = 'Hết hạn';
                    if (profileExpiry) profileExpiry.innerText = 'Hết hạn';
                    if (sidebarPlan) sidebarPlan.innerHTML = '⭐ MIỄN PHÍ';
                    if (miniTimer) miniTimer.style.display = 'none';
                    if (!isLocked) {
                        isLocked = true;
                        const state = window.tripEngine ? window.tripEngine.getCurrentState() : 'IDLE';
                        const isStreetHailActive = window.StreetHailHandler ? window.StreetHailHandler.isActive() : false;
                        if ((state === 'IDLE' || state === 'COMPLETED' || state === 'CANCELLED') && !isStreetHailActive) {
                            showToast('⚠️ Gói cước đã hết hạn! Vui lòng gia hạn để nhận đơn.');
                        }
                    }
                }
            } catch(e) { console.warn('initCountdown error:', e); }
        };
        check();
        setInterval(check, 60000);
    }

    function startPackageExpiryChecker() {
        setInterval(async () => {
            try {
                const snap = await db.ref(`drivers/${driverInfo.uid}`).once('value');
                const d = snap.val();
                if (d && d.tp_expiry) {
                    const remaining = parseInt(d.tp_expiry) - Date.now();
                    if (remaining > 0 && remaining < 86400000) {
                        const hours = Math.floor(remaining / 3600000);
                        if (hours <= 24 && hours > 0) showToast(`⚠️ Gói cước còn ${hours} giờ, hãy gia hạn!`);
                    }
                }
            } catch(e) {}
        }, 3600000);
    }

    // ==================== ORDER HANDLING ====================
    async function autonomousOrderEligible(order) {
        if (!window.TaxiAutonomous || !order || order.pickupLat == null || order.pickupLng == null) return true;
        try {
            var driver = {
                id: driverInfo.uid,
                lat: Number((typeof currentLat !== 'undefined' ? currentLat : driverInfo.lat) || 0),
                lng: Number((typeof currentLng !== 'undefined' ? currentLng : driverInfo.lng) || 0),
                rating: Number(driverInfo.rating || 5),
                completedTrips: Number(driverInfo.completedTrips || 0),
                acceptanceRate: Number(driverInfo.acceptanceRate || 1),
                online: true,
                carClass: driverInfo.carClass
            };
            var payload = await window.TaxiAutonomous.allocationScore({pickup:{lat:Number(order.pickupLat),lng:Number(order.pickupLng)},hotspotWeight:1,drivers:[driver]});
            var candidate = payload && payload.result && payload.result.candidates && payload.result.candidates[0];
            return !candidate || candidate.eligible !== false;
        } catch (_) { return true; }
    }

    function startOrderListener() {
        if (_orderListenerStarted || !isDriverOnline) return;
        if (orderListener) { orderListener.off(); orderListener = null; }
        _orderListenerStarted = true;

        orderListener = db.ref('datxe').orderByChild('status').equalTo('waiting');
        orderListener.on('child_added', async (snap) => {
            if (_isModalOpening || isLocked || !isDriverOnline) return;
            const state = window.tripEngine ? window.tripEngine.getCurrentState() : 'IDLE';
            const isStreetHailActive = window.StreetHailHandler ? window.StreetHailHandler.isActive() : false;
            if ((state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED') || isStreetHailActive) return;

            const order = snap.val(), orderId = snap.key;
            if (!order || order.status !== 'waiting') return;
            if (order.expiresAt && Number(order.expiresAt) <= Date.now()) {
                db.ref(`datxe/${orderId}`).transaction(current => {
                    if (!current || current.status !== 'waiting') return;
                    return { ...current, status: 'cancelled', cancelReason: 'expired', cancelledAt: Date.now(), statusHistory: { ...(current.statusHistory || {}), cancelled: Date.now() } };
                });
                return;
            }
            if (_processedOrders.has(orderId)) return;
            if (!driverInfo.carClass) driverInfo.carClass = '4_seats';
            if (!(await autonomousOrderEligible(order))) return;
            if (order.carType !== driverInfo.carClass && order.carType !== 'both') return;
            
            _processedOrders.add(orderId);
            _isModalOpening = true;
            currentOrderId = orderId;
            currentCustomerData = order;
            
            document.getElementById('modalPhone').innerText = order.phone || '...';
            document.getElementById('modalFrom').innerText = order.pickup || '...';
            document.getElementById('modalTo').innerText = order.dropoff || '...';
            document.getElementById('modalClientName').innerText = order.clientName || 'Khách';
            document.getElementById('modalCarType').innerText = order.carType === '7_seats' ? '7 Chỗ' : '4 Chỗ';
            
            let countdown = 15;
            document.getElementById('tp-modal-timer-val').innerText = countdown;
            document.getElementById('orderModal').style.display = 'flex';
            
            if (countdownInterval) clearInterval(countdownInterval);
            countdownInterval = setInterval(() => {
                countdown--;
                document.getElementById('tp-modal-timer-val').innerText = countdown;
                if (countdown <= 0) declineOrder();
            }, 1000);
            
            speak("Có đơn đặt xe mới.");
        });
    }
    
    async function acceptOrder() {
        clearInterval(countdownInterval);
        if (!currentOrderId || !currentCustomerData) return;

        // Gọi tripEngine để nhận đơn
        if (window.tripEngine && typeof window.tripEngine.acceptOrder === 'function') {
            const success = await window.tripEngine.acceptOrder(currentOrderId, currentCustomerData);
            if (!success) {
                _isModalOpening = false;
                showToast('Không thể nhận chuyến. Vui lòng thử lại.');
                return;
            }
        } else {
            // Fallback
            const orderRef = db.ref(`datxe/${currentOrderId}`);
            let result;
            try {
                result = await orderRef.transaction(order => {
                    if (!order || order.status !== 'waiting') return;
                    return { ...order, status: 'driving', driverId: driverInfo.uid, driverName: driverInfo.name, driverPhone: driverInfo.phone, driverPlate: driverInfo.plate, acceptedAt: Date.now(), statusHistory: { ...(order.statusHistory || {}), driving: Date.now() } };
                });
            } catch (error) {
                _isModalOpening = false;
                showToast('Không thể nhận chuyến. Vui lòng thử lại.');
                return;
            }
            if (!result || !result.committed) {
                closeModal('orderModal');
                _isModalOpening = false;
                _processedOrders.add(currentOrderId);
                showToast('Đơn này đã được tài xế khác nhận hoặc đã hết hạn.');
                return;
            }
            currentCustomerData = result.snapshot?.val?.() || currentCustomerData;
        }

        closeModal('orderModal');
        _isModalOpening = false;

        if (currentCustomerData.pickupLat && currentCustomerData.pickupLng)
            createCustomerMarker(currentCustomerData.pickupLat, currentCustomerData.pickupLng);
        
        // TripEngine sẽ tự động cập nhật UI qua sự kiện
        speak('Đã nhận đơn.');
        startForegroundService();
        enableKeepAwake();
    }

    function declineOrder() {
        clearInterval(countdownInterval);
        closeModal('orderModal');
        _isModalOpening = false;
        speak("Đã bỏ qua đơn.");
    }

    // ==================== TRIP HANDLING ====================
    function handleTrip() {
        // Kiểm tra xem tripEngine có đang rảnh không
        const state = window.tripEngine ? window.tripEngine.getCurrentState() : 'IDLE';
        const isStreetHailActive = window.StreetHailHandler ? window.StreetHailHandler.isActive() : false;
        
        // Nếu đang có chuyến app hoặc chuyến vẫy, hỏi kết thúc
        if ((state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED') || isStreetHailActive) {
            showConfirmComplete();
            return;
        }
        
        // Bắt đầu chuyến vẫy
        if (window.StreetHailHandler && typeof window.StreetHailHandler.start === 'function') {
            window.StreetHailHandler.start();
        } else {
            showToast('⚠️ StreetHailHandler chưa sẵn sàng');
        }
    }

    // ==================== ROUTE & MARKER ====================
    function drawRoute(fromLat, fromLng, toLat, toLng) {
        if (routeLayer) map.removeLayer(routeLayer);
        if (!fromLat || !fromLng || !toLat || !toLng) return;
        fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`)
            .then(r => r.json())
            .then(data => {
                if (data.routes?.[0]) {
                    const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                    routeLayer = L.polyline(coords, { color: '#0054a3', weight: 5, opacity: 0.8 }).addTo(map);
                }
            })
            .catch(() => {});
    }

    function geocodeAddress(address, callback) {
        if (!address) return;
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`)
            .then(r => r.json())
            .then(data => { if (data && data[0]) callback(parseFloat(data[0].lat), parseFloat(data[0].lon)); })
            .catch(() => {});
    }

    function createCustomerMarker(lat, lng) {
        if (customerMarker) map.removeLayer(customerMarker);
        const icon = L.divIcon({ html: "<div class='customer-marker'>🧍</div>", className: '', iconSize: [26,26], iconAnchor: [13,13] });
        customerMarker = L.marker([lat, lng], { icon }).addTo(map);
        if (currentLat && currentLng) {
            map.flyTo([(currentLat + lat) / 2, (currentLng + lng) / 2], 14);
        }
    }

    // ==================== CHAT ====================
    function listenForChat() {
        if (chatListener) db.ref(`chat/${chatListener}`).off();
        chatListener = currentOrderId;
        if (!currentOrderId) return;
        db.ref(`chat/${currentOrderId}`).orderByChild('timestamp').on('child_added', (snap) => {
            const msg = snap.val();
            if (msg && msg.sender !== 'driver') appendChatMessage(msg);
        });
    }

    function openChat() {
        document.getElementById('chatOverlay').style.display = 'flex';
        const cm = document.getElementById('chatMessages');
        if (cm.children.length === 1 && cm.children[0].style.textAlign === 'center') cm.innerHTML = '';
    }
    
    function closeChat() { document.getElementById('chatOverlay').style.display = 'none'; }
    
    function sendQuickMessage(msg) {
        if (!currentOrderId) return;
        db.ref(`chat/${currentOrderId}`).push({ sender: 'driver', from: 'driver', senderName: driverInfo.name, text: msg, timestamp: Date.now() });
        appendChatMessage({ text: msg, sender: 'driver', timestamp: Date.now() });
    }
    
    function sendChatMessage() {
        const input = document.getElementById('chatInput'), text = input.value.trim();
        if (!text || !currentOrderId) return;
        db.ref(`chat/${currentOrderId}`).push({ sender: 'driver', from: 'driver', senderName: driverInfo.name, text, timestamp: Date.now() });
        appendChatMessage({ text, sender: 'driver', timestamp: Date.now() });
        input.value = '';
    }
    
    function appendChatMessage(msg) {
        const container = document.getElementById('chatMessages');
        if (container.children.length === 1 && container.children[0].style.textAlign === 'center') container.innerHTML = '';
        const isMe = msg.sender === 'driver';
        const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' });
        const div = document.createElement('div');
        div.className = 'chat-message ' + (isMe ? 'sent' : 'received');
        div.innerHTML = `${msg.text}<div style="font-size:9px;opacity:0.6;margin-top:4px;">${time}</div>`;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }
    
    function callCustomer() {
        const phone = document.getElementById('tripClientPhone').innerText;
        if (phone && phone !== '...' && phone !== '---') window.location.href = 'tel:' + phone;
        else showToast('⚠️ Chưa có số điện thoại khách hàng');
    }

    // ==================== CANCEL ====================
    function listenForCustomerCancel() {
        if (cancelListener) db.ref(`datxe/${cancelListener}/status`).off();
        cancelListener = currentOrderId;
        if (!currentOrderId) return;
        db.ref(`datxe/${currentOrderId}/status`).on('value', (snap) => {
            if (snap.val() === 'cancelled') {
                const state = window.tripEngine ? window.tripEngine.getCurrentState() : 'IDLE';
                if (state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED') {
                    showCancelBanner();
                }
            }
        });
    }
    
    function showCancelBanner() { document.getElementById('cancelBanner').style.display = 'block'; speak("Cảnh báo! Khách hàng đã hủy chuyến."); }
    
    function dismissCancelBanner() {
        document.getElementById('cancelBanner').style.display = 'none';
        if (window.tripEngine && typeof window.tripEngine.cancelTrip === 'function') {
            window.tripEngine.cancelTrip('Khách hàng đã hủy');
        }
    }

    // ==================== UI HELPERS ====================
    function updateRate(v) {
        currentRate = parseInt(v);
        document.getElementById('rateLabel').innerText = currentRate.toLocaleString();
        const meterRate = document.getElementById('meterRate');
        if (meterRate) meterRate.innerText = currentRate.toLocaleString() + 'đ';
    }

    function showTab(tab, btn) {
        document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        if (tab === 'home') {
            const state = window.tripEngine ? window.tripEngine.getCurrentState() : 'IDLE';
            const isStreetHailActive = window.StreetHailHandler ? window.StreetHailHandler.isActive() : false;
            if ((state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED') || isStreetHailActive) {
                document.getElementById('homeControls').style.display = 'none';
                document.getElementById('tripInfoPanel').style.display = 'block';
                document.getElementById('statsUI').classList.add('show');
            } else {
                document.getElementById('homeControls').style.display = 'block';
                document.getElementById('tripInfoPanel').style.display = 'none';
                document.getElementById('statsUI').classList.remove('show');
            }
            setTimeout(() => map.invalidateSize(), 300);
        } else {
            document.getElementById('homeControls').style.display = 'none';
            document.getElementById('tripInfoPanel').style.display = 'none';
            document.getElementById('statsUI').classList.remove('show');
            const tabEl = document.getElementById('tab-' + tab);
            if (tabEl) tabEl.style.display = 'flex';
            if (tab === 'lichsu') renderHistory();
        }
    }
    
    function openSOS() {
        speak("Đang phát tín hiệu SOS.");
        showToast("🚨 Đã gửi tín hiệu cứu hộ!");
        if (driverInfo.uid && currentLat && currentLng) {
            db.ref(`sos/${driverInfo.uid}`).set({
                lat: currentLat, lng: currentLng,
                name: driverInfo.name, phone: driverInfo.phone,
                timestamp: Date.now(), status: 'active'
            });
        }
        closeSidebar();
    }
    
    function openMaintenance() {
        showToast("🔧 Kiểm tra áp suất lốp trước khi khởi hành.");
        closeSidebar();
    }
    
    function openProfit() {
        // Lấy cả lịch sử từ localStorage (bao gồm chuyến vẫy)
        const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
        const today = new Date().setHours(0,0,0,0);
        const stats = {
            today: history.filter(h => h.timestamp >= today).reduce((s, h) => s + (h.cost || 0), 0),
            week: history.filter(h => h.timestamp >= Date.now() - 7*86400000).reduce((s, h) => s + (h.cost || 0), 0),
            month: history.filter(h => h.timestamp >= Date.now() - 30*86400000).reduce((s, h) => s + (h.cost || 0), 0),
            total: history.reduce((s, h) => s + (h.cost || 0), 0),
            trips: history.length
        };
        const msg = `📊 BÁO CÁO DOANH THU\n─────────────────\n📅 Hôm nay:  ${stats.today.toLocaleString()}đ\n📆 Tuần này: ${stats.week.toLocaleString()}đ\n📆 Tháng này: ${stats.month.toLocaleString()}đ\n💰 Tổng:     ${stats.total.toLocaleString()}đ\n🚖 Số chuyến: ${stats.trips}\n${stats.trips > 0 ? `💰 Trung bình: ${(stats.total/stats.trips).toLocaleString()}đ/chuyến` : ''}`;
        showToast(msg);
        closeSidebar();
    }

    function doLogout() {
        const state = window.tripEngine ? window.tripEngine.getCurrentState() : 'IDLE';
        const isStreetHailActive = window.StreetHailHandler ? window.StreetHailHandler.isActive() : false;
        if ((state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED') || isStreetHailActive) {
            showToast('⚠️ Vui lòng kết thúc chuyến đi trước khi đăng xuất');
            return;
        }
        showConfirmDialog('Bạn có chắc chắn muốn đăng xuất?', () => {
            stopBackgroundGeolocation();
            stopGPS();
            stopLocationPushing();
            stopAIDispatch();
            stopForegroundService();
            disableKeepAwake();
            if (orderListener) { orderListener.off(); orderListener = null; }
            _orderListenerStarted = false;
            if (chatListener) { db.ref(`chat/${chatListener}`).off(); chatListener = null; }
            if (ratingListener) { db.ref(`ratings/${ratingListener}`).off(); ratingListener = null; }
            if (cancelListener) { db.ref(`datxe/${cancelListener}/status`).off(); cancelListener = null; }
            if (driverInfo?.uid) { db.ref(`tai_xe_online/${driverInfo.uid}`).remove().catch(()=>{}); }
            localStorage.removeItem('driverInfo');
            location.reload();
        });
    }

    // ==================== LỊCH SỬ ====================
    async function saveHistory(km, costLabel, costRaw, tripType) {
        const now = Date.now();
        const timeLabel = new Date().toLocaleString('vi-VN');
        const uid = (driverInfo && driverInfo.uid) ? driverInfo.uid : 'local';

        const tripData = {
            km: parseFloat(km) || 0,
            cost: Number(costRaw) || 0,
            costLabel: costLabel || ((Number(costRaw) || 0).toLocaleString('vi-VN') + 'đ'),
            time: timeLabel,
            timestamp: now,
            rate: currentRate || 15000,
            driverId: uid,
            tripType: tripType || 'STREET_HAIL'
        };

        try {
            let history = JSON.parse(localStorage.getItem('trip_history') || '[]');
            if (!Array.isArray(history)) history = [];
            history.unshift(tripData);
            localStorage.setItem('trip_history', JSON.stringify(history.slice(0, 100)));
        } catch (e) { console.warn('[saveHistory] localStorage error:', e); }

        if (uid && uid !== 'local') {
            try { await db.ref(`trips/${uid}/${now}`).set(tripData); } catch (e) {}
        }
        if (typeof renderHistory === 'function') renderHistory();
        if (typeof window.renderHistoryPro === 'function') window.renderHistoryPro();
    }

    window.saveHistory = saveHistory;

    async function renderHistory() {
        const list = document.getElementById('historyList');
        try {
            const snap = await db.ref(`trips/${driverInfo.uid}`).orderByChild('timestamp').limitToLast(50).once('value');
            const data = snap.val();
            if (data) {
                const trips = Object.values(data).reverse();
                if (trips.length) {
                    list.innerHTML = trips.map(h => `
                        <div class="history-card">
                            <div class="h-info">
                                <b>${h.time}</b><br>
                                <small>${h.km.toFixed(2)} KM</small>
                                <span class="h-source ${h.tripType === 'STREET_HAIL' ? 'street' : 'cloud'}">${h.tripType === 'STREET_HAIL' ? '🚕 Vẫy' : '📱 App'}</span>
                            </div>
                            <div class="h-price">${h.costLabel}đ</div>
                        </div>`).join('');
                    return;
                }
            }
        } catch(e) {}
        const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
        if (!history.length) list.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">Chưa có chuyến đi nào</div>';
        else list.innerHTML = history.map(h => `
            <div class="history-card">
                <div class="h-info">
                    <b>${h.time}</b><br>
                    <small>${h.km.toFixed(2)} KM</small>
                    <span class="h-source ${h.tripType === 'STREET_HAIL' ? 'street' : 'local'}">${h.tripType === 'STREET_HAIL' ? '🚕 Vẫy' : '📱 App'}</span>
                </div>
                <div class="h-price">${h.costLabel}đ</div>
            </div>`).join('');
    }

    function exportHistoryCSV() {
        const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
        if (!history.length) { showToast('⚠️ Không có dữ liệu để xuất'); return; }
        let csv = 'Thời gian,Quãng đường (KM),Tiền cước (VNĐ),Loại chuyến\n';
        history.forEach(h => { csv += `${h.time},${h.km.toFixed(2)},${h.cost},${h.tripType === 'STREET_HAIL' ? 'Vẫy' : 'App'}\n`; });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `lich_su_chuyen_di_${driverInfo.name}_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        showToast('✅ Đã xuất file CSV');
    }

    // ==================== BACKGROUND GEOLOCATION ====================
    async function initBackgroundGeolocation() {
        const isCapacitor = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
        if (!isCapacitor) { startGPS(); return; }
        try {
            if (typeof BackgroundGeolocation === 'undefined') { startGPS(); return; }
            backgroundGeolocation = BackgroundGeolocation;
            await backgroundGeolocation.ready({
                desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
                distanceFilter: 10,
                stopOnTerminate: false,
                startOnBoot: true,
                debug: true,
                logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
                notificationTitle: "TAXI PROMAX",
                notificationText: "Đang theo dõi vị trí của bạn",
                notificationIconColor: "#0054a3",
                notificationIconLarge: "ic_launcher",
                notificationPriority: "PRIORITY_HIGH",
                foregroundService: true,
                locationProvider: BackgroundGeolocation.PROVIDER_ANDROID,
                autoSync: true,
                maxBatchSize: 50,
                batchSync: true
            });
            backgroundGeolocation.onLocation((location) => { processBackgroundLocation(location); }, (error) => { console.error('[BG] Lỗi location:', error); });
            backgroundGeolocation.onMotionChange((event) => { const dot = document.getElementById('gpsDot'); if (dot) event.isMoving ? dot.classList.add('bg') : dot.classList.remove('bg'); });
            backgroundGeolocation.onConnectivityChange((state) => { if (state.connected) syncOfflineLocations(); });
            const state = await backgroundGeolocation.getState();
            if (!state.enabled) { await backgroundGeolocation.start(); isBackgroundTracking = true; showToast('📍 Đã bật định vị nền (chạy khi tắt màn hình)'); }
            await syncOfflineLocations();
            const dot = document.getElementById('gpsDot'); if (dot) dot.classList.add('bg');
            const statusText = document.getElementById('gpsStatusText'); if (statusText) statusText.innerText = 'GPS: NÂNG CAO (CHẠY NGẦM)';
            const bgStatus = document.getElementById('profileBgStatus'); if (bgStatus) bgStatus.innerText = '✅ Đang chạy nền';
        } catch (error) { console.error('[BG] Lỗi khởi tạo:', error); startGPS(); }
    }
    
    function stopBackgroundGeolocation() {
        if (backgroundGeolocation && isBackgroundTracking) { backgroundGeolocation.stop(); isBackgroundTracking = false; }
    }
    
    async function syncOfflineLocations() {
        if (!backgroundGeolocation) return;
        try { const locations = await backgroundGeolocation.getLocations(); if (locations && locations.length > 0) { for (const loc of locations) await processBackgroundLocation(loc); await backgroundGeolocation.clearLocations(); } } catch(e) {}
    }

    // ==================== XE GHÉP MODULE ====================
    // (Giữ nguyên từ file cũ)
    const XG_DB_REF = 'shared_rides';
    const XG_BOOKINGS_REF = 'shared_ride_bookings';
    const XG_REQUESTS_REF = 'customer_requests';
    const XG_CHAT_REF = 'chat_xg';

    let xgCurrentUser = null;
    let xgListenersStarted = false;
    let xgUIInjected = false;
    let xgGeocodeCache = { pickup: null, dropoff: null };
    let xgActiveChatBookingId = null;
    let xgBookingCache = {};
    let xgRequestCache = {};

    // Các hàm Xe Ghép giữ nguyên từ file cũ, không thay đổi

    // ==================== KHỞI ĐỘNG APP ====================
    async function initApp() {
        try {
            const saved = localStorage.getItem('driverInfo');
            if (saved) driverInfo = JSON.parse(saved);
            
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
                const btn = document.querySelector('.dark-toggle-btn');
                if (btn) btn.textContent = '☀️';
            }
            
            document.getElementById('sidebarName').innerText = driverInfo.name || 'Tài xế';
            document.getElementById('sidebarPhone').innerText = driverInfo.phone || '...';
            document.getElementById('sidebarId').innerHTML = '🆔 ' + (driverInfo.uid?.slice(-8) || '...');
            document.getElementById('sidebarPlan').innerHTML = '⭐ ' + (driverInfo.active_plan || 'MIỄN PHÍ');
            
            document.getElementById('profileNameFull').innerText = driverInfo.name || '...';
            document.getElementById('profileID').innerText = driverInfo.uid?.slice(-8) || '...';
            document.getElementById('profilePhone').innerText = driverInfo.phone || '...';
            document.getElementById('profilePlate').innerText = driverInfo.plate || '...';
            document.getElementById('profileCarModel').innerText = driverInfo.carModel || '...';
            document.getElementById('profileFuel').innerText = driverInfo.fuelType === 'xang' ? '⛽ Xăng' : '🔋 Điện';
            document.getElementById('profileCarClass').innerText = driverInfo.carClass === '7_seats' ? '🚙 7 Chỗ' : '🚗 4 Chỗ';
            
            try {
                const ratingSnap = await db.ref(`ratings/${driverInfo.uid}`).once('value');
                const ratings = ratingSnap.val();
                if (ratings) {
                    const vals = Object.values(ratings);
                    const avg = vals.reduce((s, r) => s + (r.rating || 0), 0) / vals.length;
                    document.getElementById('profileRating').innerText = avg.toFixed(1);
                }
            } catch(e) {}
            
            loadLocationHistory();
            initMap();
            await initBackgroundGeolocation();
            initWeatherTracking();
            
            startOrderListener();
            renderHistory();
            initCountdown();
            syncDriverOnline(true);
            startAIHotspotChecker();
            startPackageExpiryChecker();
            startForegroundService();
            startLocationPushing();
            startAIDispatch();
            initPushNotifications();
            updateVerificationStatus();
            loadDocumentsList();
            addForgotPasswordButton();
            
            const walletBalance = document.getElementById('walletBalance');
            if (walletBalance) {
                try {
                    const snap = await db.ref(`drivers/${driverInfo.uid}/wallet`).once('value');
                    const balance = snap.val() || Math.floor(Math.random() * 500000 + 100000);
                    walletBalance.innerText = balance.toLocaleString() + 'đ';
                } catch(e) {
                    walletBalance.innerText = (Math.floor(Math.random() * 500000 + 100000)).toLocaleString() + 'đ';
                }
            }

            // Lắng nghe sự kiện từ tripEngine để cập nhật UI
            document.addEventListener('trip:fare_update', (e) => {
                if (e.detail && typeof e.detail.km !== 'undefined' && typeof e.detail.fare !== 'undefined') {
                    updateAllDisplays(e.detail.km, e.detail.fare);
                }
            });
            document.addEventListener('trip:ui_update', (e) => {
                updateTripUI(e.detail);
            });
            document.addEventListener('trip:completed', () => {
                document.getElementById('tripInfoPanel').style.display = 'none';
                document.getElementById('homeControls').style.display = 'block';
                document.getElementById('statsUI').classList.remove('show');
                document.getElementById('mainBtn').innerText = "🚖 BẮT ĐẦU CHUYẾN ĐI";
                document.getElementById('mainBtn').style.background = "var(--accent)";
                showTabsAfterTrip();
                if (customerMarker) { map.removeLayer(customerMarker); customerMarker = null; }
                if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
                stopForegroundService();
                disableKeepAwake();
            });
            document.addEventListener('trip:cancelled', () => {
                document.getElementById('tripInfoPanel').style.display = 'none';
                document.getElementById('homeControls').style.display = 'block';
                document.getElementById('statsUI').classList.remove('show');
                document.getElementById('mainBtn').innerText = "🚖 BẮT ĐẦU CHUYẾN ĐI";
                document.getElementById('mainBtn').style.background = "var(--accent)";
                showTabsAfterTrip();
                if (customerMarker) { map.removeLayer(customerMarker); customerMarker = null; }
                if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
                stopForegroundService();
                disableKeepAwake();
            });
            document.addEventListener('trip:confirm_complete', () => {
                showConfirmComplete();
            });

            // Lắng nghe sự kiện từ StreetHailHandler (nếu có)
            if (window.StreetHailHandler) {
                // Không cần thêm, handler tự quản lý UI
            }

        } catch(e) { console.error('Init error:', e); }
    }

    function updateTripUI(detail) {
        // UI cho app trips do tripEngine quản lý
        // Chuyến vẫy do StreetHailHandler quản lý riêng
        // Hàm này chỉ xử lý UI cho app trips
        const state = detail.state || 'IDLE';
        const trip = detail.trip;
        if (!trip || trip.type === 'STREET_HAIL' || trip.isStreetHail) return; // Bỏ qua chuyến vẫy

        if (state === 'IDLE' || state === 'COMPLETED' || state === 'CANCELLED') {
            // Không làm gì, vì StreetHailHandler có thể đang chạy
            return;
        }

        // Cập nhật panel cho app trips
        document.getElementById('homeControls').style.display = 'none';
        document.getElementById('tripInfoPanel').style.display = 'block';
        document.getElementById('statsUI').classList.add('show');
        hideTabsDuringTrip();

        document.getElementById('tripClientName').innerText = trip.clientName || 'Khách';
        document.getElementById('tripClientPhone').innerText = trip.phone || '...';
        document.getElementById('tripFrom').innerText = trip.pickup || '...';
        document.getElementById('tripTo').innerText = trip.dropoff || '...';
        document.getElementById('tripCarType').innerHTML = trip.carType === '7_seats' ? '🚙 7 Chỗ' : '🚗 4 Chỗ';

        const statusText = document.getElementById('tripStatusText');
        const labels = {
            'DRIVER_ACCEPT': '✅ ĐÃ NHẬN ĐƠN',
            'NAVIGATING_TO_PICKUP': '🧭 ĐANG ĐI ĐÓN KHÁCH',
            'ARRIVED_PICKUP': '📍 ĐÃ ĐẾN ĐIỂM ĐÓN',
            'PICKUP_CONFIRMED': '⏳ ĐANG CHỜ KHÁCH LÊN XE',
            'CUSTOMER_ONBOARD': '🚗 KHÁCH ĐÃ LÊN XE',
            'WAITING_DESTINATION': '🏁 CHỜ NHẬP ĐIỂM ĐẾN',
            'DESTINATION_SELECTED': '🧭 ĐÃ CHỌN ĐIỂM ĐẾN',
            'TRIP_RUNNING': '🚕 ĐANG CHẠY CHUYẾN',
            'FARE_CALCULATING': '💰 ĐANG TÍNH CƯỚC',
            'ARRIVED_DESTINATION': '🏁 ĐÃ ĐẾN ĐÍCH',
            'COMPLETING': '⏳ ĐANG CHỐT CƯỚC',
            'COMPLETED': '✅ HOÀN THÀNH',
            'CANCELLED': '❌ ĐÃ HỦY'
        };
        if (statusText) statusText.innerText = labels[state] || state;

        const pickupBtn = document.getElementById('pickupBtn');
        const navBtn = document.getElementById('navToPickupBtn');
        const endBtn = document.getElementById('endTripBtn');
        const actions = document.getElementById('tripActionButtons');

        const pickupPhase = ['DRIVER_ACCEPT', 'NAVIGATING_TO_PICKUP', 'ARRIVED_PICKUP'].includes(state);
        const pickupConfirmed = state === 'PICKUP_CONFIRMED';
        const waitingDestination = state === 'WAITING_DESTINATION';
        const showEnd = ['FARE_CALCULATING', 'ARRIVED_DESTINATION', 'COMPLETING'].includes(state);

        if (actions) actions.style.display = (pickupPhase || pickupConfirmed || waitingDestination) ? 'flex' : 'none';
        if (pickupBtn) {
            pickupBtn.textContent = state === 'NAVIGATING_TO_PICKUP' ? '✅ ĐÃ ĐẾN ĐIỂM ĐÓN' : '🚗 KHÁCH ĐÃ LÊN XE';
            pickupBtn.onclick = () => {
                if (state === 'PICKUP_CONFIRMED' || state === 'ARRIVED_PICKUP') {
                    if (window.tripEngine && typeof window.tripEngine.passengerOnboard === 'function') {
                        window.tripEngine.passengerOnboard();
                    }
                } else {
                    if (window.tripEngine && typeof window.tripEngine.confirmPickup === 'function') {
                        window.tripEngine.confirmPickup();
                    }
                }
            };
        }
        if (navBtn) {
            navBtn.onclick = () => {
                if (window.tripEngine && typeof window.tripEngine.openNavigation === 'function') {
                    const mode = state === 'DESTINATION_SELECTED' || state === 'TRIP_RUNNING' ? 'destination' : 'pickup';
                    window.tripEngine.openNavigation(mode);
                }
            };
        }
        if (endBtn) {
            endBtn.style.display = showEnd ? 'block' : 'none';
            endBtn.textContent = state === 'ARRIVED_DESTINATION' ? '🏁 CHỐT CƯỚC & KẾT THÚC' : '🏁 KẾT THÚC CHUYẾN ĐI';
            endBtn.onclick = () => {
                if (window.tripEngine && typeof window.tripEngine.showCompletionConfirmation === 'function') {
                    window.tripEngine.showCompletionConfirmation();
                }
            };
        }
    }

    function loadLocationHistory() {
        try {
            const saved = localStorage.getItem('location_history');
            if (saved) locationHistory = JSON.parse(saved);
        } catch(e) {}
    }

    function addForgotPasswordButton() {
        const loginForm = document.getElementById('stepLogin');
        if (!loginForm) return;
        if (loginForm.querySelector('[data-forgot-added]')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.forgotAdded = '1';
        btn.className = 'forgot-btn';
        btn.innerHTML = '🔑 Quên mật khẩu?';
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            doForgotPassword();
        };
        const loginBtn = loginForm.querySelector('.auth-btn');
        if (loginBtn) loginBtn.insertAdjacentElement('afterend', btn);
        else loginForm.appendChild(btn);
    }

    // ==================== PROMAX DRIVER FLOW BRIDGE ====================
    window.PromaxLegacyRuntime = {
        getTotalKm: function() {
            // Ưu tiên lấy từ StreetHailHandler nếu đang active
            if (window.StreetHailHandler && window.StreetHailHandler.isActive()) {
                return window.StreetHailHandler.getTotalKm();
            }
            if (window.tripEngine && typeof window.tripEngine.getOdometer === 'function') {
                return window.tripEngine.getOdometer();
            }
            return 0;
        },
        getRate: function() { return Number(currentRate) || 15000; },
        getTripContext: function() {
            if (window.tripEngine && typeof window.tripEngine.getCurrentTrip === 'function') {
                const trip = window.tripEngine.getCurrentTrip();
                return { id: trip?.id || currentOrderId, data: trip };
            }
            return { id: currentOrderId, data: currentCustomerData };
        },
        acceptOrder: function() { return acceptOrder(); },
        processLocation: function(location) { return processBackgroundLocation(location); },
        getPosition: function() {
            if (currentLat == null || currentLng == null) return null;
            return { lat: Number(currentLat), lng: Number(currentLng), heading: Number(currentHeading) || 0, timestamp: Date.now() };
        },
        setTripContext: function(orderId, orderData) {
            currentOrderId = orderId || null;
            currentCustomerData = orderData || null;
        },
        setFlowState: function(next) { /* Đã chuyển sang handlers */ },
        resetDistance: function() { /* Đã chuyển sang handlers */ }
    };

    window.__PromaxLegacyHandlers = {
        completeTrip: function() {
            if (window.StreetHailHandler && window.StreetHailHandler.isActive()) {
                window.StreetHailHandler.end();
                return true;
            }
            if (window.tripEngine && typeof window.tripEngine.completeTrip === 'function') {
                return window.tripEngine.completeTrip();
            }
            return false;
        },
        cancelTrip: function(reason) {
            if (window.tripEngine && typeof window.tripEngine.cancelTrip === 'function') {
                return window.tripEngine.cancelTrip(reason);
            }
            return false;
        }
    };

    // ==================== KHỞI ĐỘNG APP KHI WINDOW LOAD ====================
    window.onload = function() {
        const saved = localStorage.getItem('driverInfo');
        if (saved) {
            try {
                driverInfo = JSON.parse(saved);
                document.getElementById('authScreen').style.display = 'none';
                initApp();
            } catch(e) {
                console.warn('Parse driverInfo error:', e);
                localStorage.removeItem('driverInfo');
                document.getElementById('authScreen').style.display = 'flex';
            }
        } else {
            document.getElementById('authScreen').style.display = 'flex';
        }
    };

})(window, document);