/**
 * ai-copilot-v4.js - Trợ lý AI thông minh cho Taxi Promax
 * Phiên bản: 4.1 (đã tinh chỉnh theo góp ý)
 */
;(function(window, document, undefined) {
    'use strict';

    // ======================== CẤU HÌNH ========================
    const CONFIG = {
        GPS_ACCURACY_WARN: 50,
        GPS_ACCURACY_CRITICAL: 100,
        ROUTE_DEVIATION_WARN: 150,
        ROUTE_DEVIATION_CRITICAL: 300,
        HARSH_ACCEL_THRESHOLD: 3.0,
        HARSH_BRAKE_THRESHOLD: -3.5,
        MIN_SPEED_FOR_ACCEL: 2.0, // m/s (~7.2 km/h) - tránh nhiễu khi đứng yên
        DEBOUNCE_MS: 5000,
        FIREBASE_ALERTS_PATH: '/ai/alerts',
    };

    // ======================== BIẾN NỘI BỘ ========================
    let _enabled = true;
    let _mode = null;
    let _lastAlertTime = 0;
    let _gpsWatchId = null;
    let _gpsUnsubscribe = null;
    let _listeners = [];
    let _lastGps = null;

    // ======================== PHÁT HIỆN MÔI TRƯỜNG ========================
    function detectMode() {
        const path = window.location.pathname;
        if (path.includes('index.html') || path.endsWith('/') || path.includes('taxi')) return 'driving';
        if (path.includes('admin.html')) return 'monitoring';
        if (document.querySelector('.driver-panel, #trip-controls')) return 'driving';
        if (document.querySelector('.admin-panel, #admin-dashboard')) return 'monitoring';
        return null;
    }

    // ======================== LOGGING ========================
    function log(msg, type = 'info') {
        const prefix = '[AI-Copilot v4.1]';
        if (type === 'warn') console.warn(prefix, msg);
        else if (type === 'error') console.error(prefix, msg);
        else console.log(prefix, msg);
    }

    // ======================== GIAO TIẾP VỚI CÁC MODULE KHÁC ========================
    function getCockpit() { return window.cockpit || null; }
    function getSafety() { return window.safety || null; }
    
    // ✅ Cập nhật hàm getFirebase để tương thích với window.db hoặc window.firebase
    function getFirebase() {
        if (window.db && typeof window.db.ref === 'function') {
            return window.db; // Anh đang dùng cách này trong index.html
        }
        if (window.firebase && typeof window.firebase.database === 'function') {
            return window.firebase.database(); // Fallback
        }
        return null;
    }

    // ======================== CẢNH BÁO HIỂN THỊ UI ========================
    function showAlert(message, type = 'warning', duration = 8000) {
        // (code giữ nguyên như cũ, không thay đổi)
        let container = document.querySelector('.ai-copilot-alerts');
        if (!container) {
            container = document.createElement('div');
            container.className = 'ai-copilot-alerts';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                max-width: 90%;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(container);
        }
        const alertEl = document.createElement('div');
        alertEl.className = `alert alert-${type}`;
        alertEl.style.cssText = `
            pointer-events: auto;
            background: ${type === 'danger' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: ${type === 'warning' ? '#212529' : '#fff'};
            padding: 12px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-weight: 500;
            transition: opacity 0.3s ease;
            opacity: 1;
            font-size: 1rem;
            max-width: 600px;
            text-align: center;
        `;
        alertEl.textContent = message;
        container.appendChild(alertEl);
        setTimeout(() => {
            alertEl.style.opacity = '0';
            setTimeout(() => { if (alertEl.parentNode) alertEl.remove(); }, 300);
        }, duration);
        alertEl.addEventListener('click', () => {
            alertEl.style.opacity = '0';
            setTimeout(() => { if (alertEl.parentNode) alertEl.remove(); }, 300);
        });
    }

    // ======================== CHẾ ĐỘ LÁI XE (DRIVING MODE) ========================
    function startDrivingMode() {
        log('Khởi động chế độ Lái xe (Driving Mode)');
        _mode = 'driving';

        // Lắng nghe GPS (ưu tiên dùng cockpit nếu có)
        const cockpit = getCockpit();
        if (cockpit && typeof cockpit.getCurrentPosition === 'function') {
            // Có thể lấy dữ liệu từ cockpit (ví dụ: dùng sự kiện)
            // Nhưng để đơn giản, ta vẫn dùng navigator.geolocation
        }
        if (window.PromaxGPSCore && typeof window.PromaxGPSCore.onFix === 'function') {
            if (_gpsUnsubscribe) _gpsUnsubscribe();
            _gpsUnsubscribe = window.PromaxGPSCore.onFix((fix) => {
                if (!fix || fix.error) return;
                handleGpsUpdate({
                    coords: {
                        latitude: fix.lat,
                        longitude: fix.lng,
                        speed: fix.speed || 0,
                        accuracy: fix.accuracy || 999,
                        heading: fix.heading || 0
                    },
                    timestamp: fix.timestamp || Date.now()
                });
            });
            log('GPS: Đã kết nối ProMaxGPSCore (single watcher)');
        } else if (navigator.geolocation) {
            if (_gpsWatchId) navigator.geolocation.clearWatch(_gpsWatchId);
            _gpsWatchId = navigator.geolocation.watchPosition(
                (pos) => handleGpsUpdate(pos),
                (err) => log('Lỗi GPS: ' + err.message, 'error'),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
        } else {
            log('Không có GPS sẵn sàng', 'warn');
        }

        // Lắng nghe safety alerts
        document.addEventListener('safety:alert', (e) => {
            if (!_enabled) return;
            const { type, message } = e.detail || {};
            if (type === 'harsh_event') {
                showAlert('⚠️ ' + message, 'danger', 10000);
            }
        });

        // Lắng nghe sự kiện chuyến đi từ trip-engine (sẽ được phát ra sau)
        document.addEventListener('trip:status', (e) => {
            if (!_enabled) return;
            const status = e.detail?.status;
            if (status === 'arrived_pickup') {
                showAlert('📍 Anh đã đến điểm đón, bấm "Đã đến" để thông báo cho khách.', 'info', 6000);
            } else if (status === 'passenger_onboard') {
                showAlert('🚗 Khách đã lên xe, nhớ bấm "Bắt đầu chuyến" để tính cước.', 'info', 6000);
            } else if (status === 'completed') {
                showAlert('✅ Chuyến đi hoàn tất! Cảm ơn anh.', 'info', 4000);
            }
        });
    }

    // Xử lý cập nhật GPS (đã áp dụng gợi ý chống nhiễu)
    function handleGpsUpdate(position) {
        if (!_enabled) return;
        const coords = position.coords;
        const accuracy = coords.accuracy;
        const speed = coords.speed || 0;

        // Cảnh báo độ chính xác
        if (accuracy > CONFIG.GPS_ACCURACY_CRITICAL) {
            showAlert('📡 GPS rất kém (độ chính xác >100m), hãy ra nơi thoáng đãng.', 'danger', 5000);
        } else if (accuracy > CONFIG.GPS_ACCURACY_WARN) {
            showAlert('📡 GPS đang yếu (độ chính xác >50m), có thể ảnh hưởng đến định vị.', 'warning', 5000);
        }

        // 🛡️ Chỉ tính gia tốc khi xe thực sự di chuyển (trên 2 m/s)
        if (_lastGps && speed > CONFIG.MIN_SPEED_FOR_ACCEL) {
            const dt = (position.timestamp - _lastGps.timestamp) / 1000;
            if (dt > 0 && dt < 5) {
                const dv = speed - _lastGps.speed;
                const accel = dv / dt;
                if (accel > CONFIG.HARSH_ACCEL_THRESHOLD) {
                    showAlert('🚀 Tăng tốc gấp! Hãy lái xe an toàn.', 'warning', 4000);
                } else if (accel < CONFIG.HARSH_BRAKE_THRESHOLD) {
                    showAlert('🛑 Phanh gấp! Giữ khoảng cách an toàn.', 'warning', 4000);
                }
            }
        }

        /* 
         * ✅ TODO: Tích hợp với Route Engine để tính khoảng cách vuông góc 
         * từ (coords.latitude, coords.longitude) đến polyline của chuyến đi.
         * Nếu distance > CONFIG.ROUTE_DEVIATION_WARN -> showAlert(...)
         */

        // Cập nhật _lastGps
        _lastGps = {
            timestamp: position.timestamp,
            speed: speed,
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: accuracy,
        };
    }

    // ======================== CHẾ ĐỘ GIÁM SÁT (MONITORING MODE) ========================
    function startMonitoringMode() {
        log('Khởi động chế độ Giám sát (Monitoring Mode)');
        _mode = 'monitoring';

        const db = getFirebase();
        if (db) {
            const alertsRef = db.ref(CONFIG.FIREBASE_ALERTS_PATH);
            alertsRef.on('child_added', (snapshot) => {
                if (!_enabled) return;
                const alertData = snapshot.val();
                if (alertData) displayAdminAlert(alertData);
            });
        } else {
            log('Không tìm thấy Firebase, chuyển sang chế độ mô phỏng', 'warn');
            const mockInterval = setInterval(() => {
                if (!_enabled) { clearInterval(mockInterval); return; }
                const mockAlert = generateMockAlert();
                displayAdminAlert(mockAlert);
            }, 15000);
            _listeners.push({ type: 'interval', ref: mockInterval });
        }

        document.addEventListener('admin:refresh', (e) => {
            log('Admin yêu cầu làm mới dữ liệu', 'info');
            // Có thể gọi API lấy dữ liệu mới
        });
    }

    function displayAdminAlert(alertData) {
        // (code giữ nguyên, không thay đổi)
        let container = document.querySelector('.admin-alerts .alert-list');
        if (!container) {
            const adminPanel = document.querySelector('.admin-panel, #admin-dashboard');
            if (adminPanel) {
                const wrapper = document.createElement('div');
                wrapper.className = 'admin-alerts';
                wrapper.innerHTML = `<h5>🚨 Cảnh báo AI</h5><ul class="alert-list" style="list-style:none; padding:0;"></ul>`;
                adminPanel.prepend(wrapper);
                container = wrapper.querySelector('.alert-list');
            } else {
                log('Không tìm thấy container cho admin alerts', 'warn');
                return;
            }
        }
        const item = document.createElement('li');
        item.style.cssText = `
            background: ${alertData.severity === 'critical' ? '#f8d7da' : '#fff3cd'};
            border-left: 4px solid ${alertData.severity === 'critical' ? '#dc3545' : '#ffc107'};
            padding: 8px 12px;
            margin-bottom: 6px;
            border-radius: 4px;
            font-size: 0.9rem;
        `;
        const time = new Date(alertData.timestamp || Date.now()).toLocaleTimeString();
        item.innerHTML = `<strong>${time}</strong> - ${alertData.message}`;
        container.prepend(item);
        while (container.children.length > 20) {
            container.removeChild(container.lastChild);
        }
        const badge = document.querySelector('.admin-alerts .badge-count');
        if (badge) badge.textContent = container.children.length;
    }

    function generateMockAlert() {
        const messages = [
            '🚨 Chuyến #12345 có dấu hiệu ảo hóa km (tốc độ trung bình 5km/h, quãng đường 10km)',
            '⚠️ Tài xế Nguyễn Văn A hủy 3 chuyến liên tiếp trong 1 giờ',
            '📊 Khu vực Quận 1 đang thiếu 3 xe – gợi ý kích hoạt surge pricing',
            '🔔 Tài xế Trần Thị B có 2 khiếu nại về thái độ trong ngày',
            '📈 Doanh thu hôm nay thấp hơn 20% so với cùng kỳ tuần trước',
        ];
        const severities = ['warning', 'critical', 'info', 'warning', 'critical'];
        const idx = Math.floor(Math.random() * messages.length);
        return {
            message: messages[idx],
            severity: severities[idx] || 'warning',
            timestamp: Date.now(),
        };
    }

    // ======================== PUBLIC API ========================
    const publicAPI = {
        init: function() {
            log('Khởi tạo AI Copilot v4.1...');
            const mode = detectMode();
            if (!mode) {
                log('Không xác định được chế độ, thoát.', 'warn');
                return;
            }
            if (mode === 'driving') startDrivingMode();
            else if (mode === 'monitoring') startMonitoringMode();
        },
        enable: function() { _enabled = true; log('Đã bật'); },
        disable: function() { _enabled = false; log('Đã tắt'); },
        getMode: function() { return _mode; },
        destroy: function() {
            log('Hủy AI Copilot');
            if (_gpsWatchId) {
                navigator.geolocation.clearWatch(_gpsWatchId);
                _gpsWatchId = null;
            }
            if (_gpsUnsubscribe) {
                _gpsUnsubscribe();
                _gpsUnsubscribe = null;
            }
            const db = getFirebase();
            if (db) {
                const alertsRef = db.ref(CONFIG.FIREBASE_ALERTS_PATH);
                alertsRef.off();
            }
            _listeners.forEach(l => {
                if (l.type === 'interval') clearInterval(l.ref);
            });
            _listeners = [];
            _mode = null;
            _enabled = false;
            const container = document.querySelector('.ai-copilot-alerts');
            if (container) container.remove();
        },
    };

    window.aiCopilotV4 = publicAPI;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.aiCopilotV4.init());
    } else {
        window.aiCopilotV4.init();
    }

})(window, document);