/**
 * trip-engine-v4.js - Bộ não điều phối chuyến đi (State Machine)
 * Phiên bản: 4.0
 * Tác giả: Nguyễn Xuân Đạt
 * Mô tả: Quản lý vòng đời chuyến đi, phát sự kiện cho AI Copilot,
 *        tính cước, đồng bộ Firebase, và chống gian lận.
 */

;(function(window, document, undefined) {
    'use strict';

    // ================================================================
    // 1. ĐỊNH NGHĨA TRẠNG THÁI (STATE MACHINE)
    // ================================================================
    const TRIP_STATE = {
        IDLE: 'IDLE',
        SEARCHING: 'SEARCHING',
        ASSIGNED: 'ASSIGNED',
        ACCEPTED: 'ACCEPTED',
        TO_PICKUP: 'TO_PICKUP',
        ARRIVED: 'ARRIVED',
        WAITING: 'WAITING',
        ONBOARD: 'ONBOARD',
        TO_DESTINATION: 'TO_DESTINATION',
        COMPLETED: 'COMPLETED',
        CANCELLED: 'CANCELLED'
    };

    const TRIP_TYPE = {
        APP_DESTINATION: 'APP_DESTINATION',
        APP_NO_DESTINATION: 'APP_NO_DESTINATION',
        STREET_HAIL: 'STREET_HAIL',
        DISPATCH: 'DISPATCH'
    };

    // ================================================================
    // 2. CẤU HÌNH
    // ================================================================
    const CONFIG = {
        FARE_BASE: 15000,            // Giá khởi điểm (VNĐ)
        FARE_PER_KM: 12000,          // Giá mỗi km
        FARE_PER_MIN: 2000,          // Giá mỗi phút chờ/tắc đường
        FREE_WAIT_TIME_MIN: 5,       // Phút chờ miễn phí
        SURGE_MULTIPLIER: 1.0,       // Hệ số tăng giá (mặc định 1.0)
        MIN_FARE: 25000,             // Cước tối thiểu
        MAX_FARE: 500000,            // Cước tối đa (chống tràn)
        GPS_UPDATE_INTERVAL_MS: 1000, // Tần suất cập nhật GPS (ms)
        MAX_SPEED_KMH: 120,          // Tốc độ tối đa cho phép (km/h)
        ANTI_FRAUD_ENABLED: true,    // Bật/tắt chống gian lận
        FIREBASE_PATH: 'datxe',      // Path chính trên Firebase
        ALERTS_PATH: 'ai/alerts'     // Path lưu cảnh báo AI
    };

    // ================================================================
    // 3. CLASS TRIP ENGINE
    // ================================================================
    class TripEngine {
        constructor() {
            // Trạng thái hiện tại
            this.currentState = TRIP_STATE.IDLE;
            this.currentTrip = null;

            // Dữ liệu tính cước
            this.tripStartTime = null;       // Timestamp bắt đầu tính cước (ONBOARD)
            this.tripStartLocation = null;   // {lat, lng} lúc ONBOARD
            this.currentOdometerKm = 0;      // Tổng km đã đi (chỉ tính khi ONBOARD)
            this.waitTimeMin = 0;            // Tổng thời gian chờ (phút)
            this.lastGpsUpdate = null;       // Dữ liệu GPS cuối cùng
            this.gpsWatchId = null;          // ID của watchPosition

            // Bản đồ chuyển trạng thái hợp lệ
            this.validTransitions = {
                [TRIP_STATE.IDLE]: [TRIP_STATE.ASSIGNED, TRIP_STATE.STREET_HAIL, TRIP_STATE.SEARCHING],
                [TRIP_STATE.SEARCHING]: [TRIP_STATE.ASSIGNED, TRIP_STATE.IDLE],
                [TRIP_STATE.ASSIGNED]: [TRIP_STATE.ACCEPTED, TRIP_STATE.CANCELLED],
                [TRIP_STATE.ACCEPTED]: [TRIP_STATE.TO_PICKUP, TRIP_STATE.CANCELLED],
                [TRIP_STATE.TO_PICKUP]: [TRIP_STATE.ARRIVED, TRIP_STATE.CANCELLED],
                [TRIP_STATE.ARRIVED]: [TRIP_STATE.WAITING, TRIP_STATE.CANCELLED],
                [TRIP_STATE.WAITING]: [TRIP_STATE.ONBOARD, TRIP_STATE.CANCELLED],
                [TRIP_STATE.ONBOARD]: [TRIP_STATE.TO_DESTINATION, TRIP_STATE.COMPLETED, TRIP_STATE.CANCELLED],
                [TRIP_STATE.TO_DESTINATION]: [TRIP_STATE.COMPLETED, TRIP_STATE.CANCELLED],
                [TRIP_STATE.COMPLETED]: [TRIP_STATE.IDLE],
                [TRIP_STATE.CANCELLED]: [TRIP_STATE.IDLE]
            };

            // Tự động khởi tạo
            this.init();
        }

        // ================================================================
        // 4. KHỞI TẠO
        // ================================================================
        init() {
            this.log('🧠 Trip Engine V4 khởi động', 'info');
            this.log(`Trạng thái ban đầu: ${this.currentState}`, 'info');

            // Kết nối GPS
            this.startGpsListener();

            // Lắng nghe đơn hàng mới từ Firebase (nếu có)
            this.listenForNewOrders();

            // Lắng nghe sự kiện từ UI (nếu có)
            this.bindUIEvents();
        }

        // ================================================================
        // 5. GPS LISTENER
        // ================================================================
        startGpsListener() {
            // Ưu tiên dùng cockpit nếu có
            if (window.cockpit && typeof window.cockpit.onPosition === 'function') {
                window.cockpit.onPosition((position) => {
                    this.updateGPS(position);
                });
                this.log('GPS: Kết nối với cockpit.js', 'info');
                return;
            }

            // Fallback: dùng navigator.geolocation
            if (navigator.geolocation) {
                this.gpsWatchId = navigator.geolocation.watchPosition(
                    (pos) => this.updateGPS(pos),
                    (err) => this.log(`GPS lỗi: ${err.message}`, 'error'),
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 5000
                    }
                );
                this.log('GPS: Đang theo dõi vị trí (navigator.geolocation)', 'info');
            } else {
                this.log('⚠️ GPS không khả dụng', 'warn');
            }
        }

        // ================================================================
        // 6. XỬ LÝ GPS UPDATE (CORE)
        // ================================================================
        updateGPS(position) {
            if (!position || !position.coords) return;

            const coords = position.coords;
            const speed = (coords.speed || 0) * 3.6; // m/s → km/h
            const accuracy = coords.accuracy || 0;

            // Kiểm tra tốc độ bất thường (chống gian lận)
            if (CONFIG.ANTI_FRAUD_ENABLED && speed > CONFIG.MAX_SPEED_KMH) {
                this.emitEvent('fraud_alert', {
                    type: 'overspeed',
                    message: `Tốc độ ${speed.toFixed(0)} km/h vượt ngưỡng cho phép!`,
                    severity: 'critical'
                });
                this.pushAlertToFirebase(`🚨 Tài xế chạy quá tốc độ: ${speed.toFixed(0)} km/h`, 'critical');
            }

            // Nếu đang ở trạng thái tính cước (ONBOARD hoặc TO_DESTINATION)
            if (this.currentState === TRIP_STATE.ONBOARD || this.currentState === TRIP_STATE.TO_DESTINATION) {
                // Tính quãng đường di chuyển (chỉ khi có điểm bắt đầu)
                if (this.tripStartLocation) {
                    const prevLat = this.tripStartLocation.lat;
                    const prevLng = this.tripStartLocation.lng;
                    const currentLat = coords.latitude;
                    const currentLng = coords.longitude;

                    // Tính khoảng cách Haversine (km)
                    const distanceKm = this.calculateDistance(prevLat, prevLng, currentLat, currentLng);
                    this.currentOdometerKm += distanceKm;

                    // Cập nhật điểm bắt đầu để tính cho lần sau
                    this.tripStartLocation = { lat: currentLat, lng: currentLng };

                    // Cập nhật lên Firebase realtime để khách hàng xem
                    this.syncLiveData({
                        live_km: this.currentOdometerKm,
                        live_lat: currentLat,
                        live_lng: currentLng,
                        live_speed: speed
                    });
                }

                // Kiểm tra gian lận quãng đường (nếu km tăng đột biến > 1km trong 1s)
                if (this.lastGpsUpdate && CONFIG.ANTI_FRAUD_ENABLED) {
                    const dt = (Date.now() - this.lastGpsUpdate.timestamp) / 1000;
                    if (dt > 0 && dt < 2) {
                        const lastKm = this.lastGpsUpdate.odometer || 0;
                        const deltaKm = this.currentOdometerKm - lastKm;
                        if (deltaKm > 1.0) {
                            this.emitEvent('fraud_alert', {
                                type: 'teleport',
                                message: `⚠️ Phát hiện nhảy km: +${deltaKm.toFixed(2)} km trong ${dt.toFixed(1)}s`,
                                severity: 'critical'
                            });
                            this.pushAlertToFirebase(`⚠️ Nghi ngờ gian lận km: +${deltaKm.toFixed(2)} km trong ${dt.toFixed(1)}s`, 'critical');
                        }
                    }
                }

                // Lưu lại để so sánh lần sau
                this.lastGpsUpdate = {
                    timestamp: Date.now(),
                    odometer: this.currentOdometerKm,
                    speed: speed
                };
            }

            // Lưu vị trí cuối cùng (dùng cho các mục đích khác)
            this.lastKnownPosition = {
                lat: coords.latitude,
                lng: coords.longitude,
                speed: speed,
                accuracy: accuracy,
                timestamp: Date.now()
            };
        }

        // ================================================================
        // 7. HÀM TIỆN ÍCH: TÍNH KHOẢNG CÁCH (HAVERSINE)
        // ================================================================
        calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371; // Bán kính trái đất (km)
            const dLat = this.deg2rad(lat2 - lat1);
            const dLon = this.deg2rad(lon2 - lon1);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // km
        }

        deg2rad(deg) {
            return deg * (Math.PI / 180);
        }

        // ================================================================
        // 8. LẮNG NGHE ĐƠN HÀNG MỚI TỪ FIREBASE
        // ================================================================
        listenForNewOrders() {
            if (!window.db) {
                this.log('⚠️ Firebase chưa sẵn sàng, bỏ qua lắng nghe đơn mới', 'warn');
                return;
            }

            const db = window.db;
            const ordersRef = db.ref(`${CONFIG.FIREBASE_PATH}/orders`);

            ordersRef.orderByChild('status').equalTo('pending').on('child_added', (snapshot) => {
                const tripData = snapshot.val();
                const tripId = snapshot.key;

                // Chỉ nhận đơn nếu đang rảnh
                if (this.currentState === TRIP_STATE.IDLE) {
                    this.log(`📩 Đơn mới từ Firebase: ${tripId}`, 'info');
                    this.acceptOrder(tripId, tripData);
                } else {
                    this.log(`⏳ Bỏ qua đơn ${tripId} vì đang bận (${this.currentState})`, 'warn');
                }
            });
        }

        // ================================================================
        // 9. GÁN SỰ KIỆN UI (Nếu có nút bấm)
        // ================================================================
        bindUIEvents() {
            // Tìm các nút trong DOM và gán sự kiện
            document.addEventListener('DOMContentLoaded', () => {
                const btnArrived = document.getElementById('btn-arrived');
                const btnStart = document.getElementById('btn-start-trip');
                const btnComplete = document.getElementById('btn-complete');
                const btnCancel = document.getElementById('btn-cancel');

                if (btnArrived) btnArrived.addEventListener('click', () => this.arrivedAtPickup());
                if (btnStart) btnStart.addEventListener('click', () => this.passengerOnboard());
                if (btnComplete) btnComplete.addEventListener('click', () => this.completeTrip());
                if (btnCancel) btnCancel.addEventListener('click', () => this.cancelTrip('User cancelled'));

                this.log('UI: Đã gán sự kiện cho các nút điều khiển', 'info');
            });
        }

        // ================================================================
        // 10. BỘ CHUYỂN TRẠNG THÁI (CORE)
        // ================================================================
        transition(newState, payload = {}) {
            const allowedStates = this.validTransitions[this.currentState] || [];

            if (!allowedStates.includes(newState)) {
                this.log(`⛔ Chuyển trạng thái không hợp lệ: ${this.currentState} ➔ ${newState}`, 'error');
                this.emitEvent('error', {
                    message: `Không thể chuyển từ ${this.currentState} sang ${newState}`,
                    code: 'INVALID_TRANSITION'
                });
                return false;
            }

            const previousState = this.currentState;
            this.currentState = newState;
            this.log(`✅ ${previousState} ➔ ${newState}`, 'info');

            // Kích hoạt hành động đặc thù khi vào trạng thái mới
            this.onStateEnter(newState, previousState, payload);

            // Phát sự kiện cho AI Copilot và UI
            this.emitEvent('status', {
                status: newState,
                previousStatus: previousState,
                trip: this.currentTrip,
                payload
            });

            // Đồng bộ lên Firebase
            this.syncStateToFirebase(newState);

            return true;
        }

        // ================================================================
        // 11. XỬ LÝ KHI VÀO TRẠNG THÁI MỚI
        // ================================================================
        onStateEnter(newState, previousState, payload) {
            switch (newState) {
                case TRIP_STATE.ASSIGNED:
                    this.currentTrip = { ...payload.tripData, id: payload.tripId };
                    this.playSound('new_order');
                    break;

                case TRIP_STATE.TO_PICKUP:
                    this.log('🗺️ Bắt đầu dẫn đường đến điểm đón', 'info');
                    this.emitEvent('navigation', { type: 'to_pickup', destination: this.currentTrip?.pickup });
                    break;

                case TRIP_STATE.ARRIVED:
                    this.currentTrip.arrivedAt = Date.now();
                    this.log('📍 Đã đến điểm đón', 'info');
                    break;

                case TRIP_STATE.WAITING:
                    this.waitTimeMin = 0;
                    // Bắt đầu đếm thời gian chờ
                    this.startWaitTimer();
                    this.log('⏳ Bắt đầu chờ khách', 'info');
                    break;

                case TRIP_STATE.ONBOARD:
                    // BẮT ĐẦU TÍNH CƯỚC
                    this.tripStartTime = Date.now();
                    this.tripStartLocation = this.getCurrentGPS();
                    this.currentOdometerKm = 0;
                    this.lastGpsUpdate = null;
                    // Dừng đếm thời gian chờ
                    this.stopWaitTimer();

                    // Nếu chuyến không có điểm đến, yêu cầu khách nhập
                    if (this.currentTrip?.type === TRIP_TYPE.APP_NO_DESTINATION) {
                        this.emitEvent('request_destination', {
                            message: 'Vui lòng nhập điểm đến để bắt đầu di chuyển'
                        });
                    }

                    this.log('💰 Bắt đầu tính cước. Km: 0, Thời gian: ' + new Date().toLocaleTimeString(), 'info');
                    break;

                case TRIP_STATE.TO_DESTINATION:
                    this.log('🗺️ Bắt đầu dẫn đường đến điểm trả', 'info');
                    this.emitEvent('navigation', { type: 'to_destination', destination: this.currentTrip?.destination });
                    break;

                case TRIP_STATE.COMPLETED:
                    this.calculateFinalFare();
                    this.saveTripToHistory();
                    this.log(`🏁 Chuyến hoàn tất. Tổng cước: ${this.currentTrip?.finalFare}đ`, 'info');
                    break;

                case TRIP_STATE.CANCELLED:
                    this.log(`❌ Hủy chuyến. Lý do: ${payload.reason || 'Không xác định'}`, 'warn');
                    this.resetTripData();
                    break;

                case TRIP_STATE.IDLE:
                    this.resetTripData();
                    break;
            }
        }

        // ================================================================
        // 12. TÍNH CƯỚC THÔNG MINH
        // ================================================================
        calculateFinalFare() {
            if (!this.currentTrip) return;

            const durationMin = (Date.now() - this.tripStartTime) / 60000;
            let fare = CONFIG.FARE_BASE + (this.currentOdometerKm * CONFIG.FARE_PER_KM);

            // Phí chờ (nếu có)
            const extraWait = Math.max(0, this.waitTimeMin - CONFIG.FREE_WAIT_TIME_MIN);
            fare += extraWait * CONFIG.FARE_PER_MIN;

            // Áp dụng hệ số tăng giá (surge)
            fare *= CONFIG.SURGE_MULTIPLIER;

            // Giới hạn tối thiểu/tối đa
            fare = Math.max(CONFIG.MIN_FARE, Math.min(CONFIG.MAX_FARE, fare));

            // Làm tròn đến 1000đ
            this.currentTrip.finalFare = Math.round(fare / 1000) * 1000;

            this.log(`💰 Chi tiết cước: Base=${CONFIG.FARE_BASE}, Km=${this.currentOdometerKm.toFixed(2)}x${CONFIG.FARE_PER_KM}, Chờ=${extraWait.toFixed(0)}p x ${CONFIG.FARE_PER_MIN}, Surge=${CONFIG.SURGE_MULTIPLIER}, Tổng=${this.currentTrip.finalFare}đ`, 'info');
        }

        // ================================================================
        // 13. ĐẾM THỜI GIAN CHỜ (WAITING)
        // ================================================================
        startWaitTimer() {
            if (this._waitInterval) clearInterval(this._waitInterval);
            this._waitInterval = setInterval(() => {
                if (this.currentState === TRIP_STATE.WAITING) {
                    this.waitTimeMin += 0.0167; // mỗi giây tăng 1/60 phút
                } else {
                    clearInterval(this._waitInterval);
                }
            }, 1000);
        }

        stopWaitTimer() {
            if (this._waitInterval) {
                clearInterval(this._waitInterval);
                this._waitInterval = null;
            }
        }

        // ================================================================
        // 14. RESET DỮ LIỆU
        // ================================================================
        resetTripData() {
            this.currentTrip = null;
            this.tripStartTime = null;
            this.tripStartLocation = null;
            this.currentOdometerKm = 0;
            this.waitTimeMin = 0;
            this.lastGpsUpdate = null;
            this.stopWaitTimer();
        }

        // ================================================================
        // 15. PHÁT SỰ KIỆN (Event Bus)
        // ================================================================
        emitEvent(eventType, data) {
            const eventName = `trip:${eventType}`;
            document.dispatchEvent(new CustomEvent(eventName, { detail: data }));
            this.log(`📡 Event: ${eventName}`, 'debug');
        }

        // ================================================================
        // 16. ĐỒNG BỘ FIREBASE
        // ================================================================
        syncStateToFirebase(state) {
            if (!window.db || !this.currentTrip || !this.currentTrip.id) return;

            const db = window.db;
            const tripRef = db.ref(`${CONFIG.FIREBASE_PATH}/trips/${this.currentTrip.id}`);

            // Cập nhật trạng thái
            tripRef.update({
                status: state,
                lastUpdate: Date.now()
            }).catch(err => this.log(`Lỗi sync Firebase: ${err.message}`, 'error'));
        }

        syncLiveData(data) {
            if (!window.db || !this.currentTrip || !this.currentTrip.id) return;
            const db = window.db;
            const ref = db.ref(`${CONFIG.FIREBASE_PATH}/trips/${this.currentTrip.id}/live`);
            ref.update(data).catch(() => {});
        }

        pushAlertToFirebase(message, severity = 'warning') {
            if (!window.db) return;
            const db = window.db;
            const alertsRef = db.ref(CONFIG.ALERTS_PATH);
            alertsRef.push({
                timestamp: Date.now(),
                tripId: this.currentTrip?.id || 'unknown',
                message: message,
                severity: severity
            }).catch(() => {});
        }

        saveTripToHistory() {
            if (!window.db || !this.currentTrip) return;
            const db = window.db;
            const historyRef = db.ref(`${CONFIG.FIREBASE_PATH}/history/${this.currentTrip.id}`);
            historyRef.set({
                ...this.currentTrip,
                completedAt: Date.now(),
                totalKm: this.currentOdometerKm,
                waitTimeMin: this.waitTimeMin
            }).catch(err => this.log(`Lỗi lưu lịch sử: ${err.message}`, 'error'));
        }

        // ================================================================
        // 17. LẤY VỊ TRÍ GPS HIỆN TẠI
        // ================================================================
        getCurrentGPS() {
            if (this.lastKnownPosition) {
                return {
                    lat: this.lastKnownPosition.lat,
                    lng: this.lastKnownPosition.lng
                };
            }
            return null;
        }

        // ================================================================
        // 18. PHÁT ÂM THANH
        // ================================================================
        playSound(type) {
            if (typeof window.playOrderSound === 'function' && type === 'new_order') {
                window.playOrderSound();
            }
        }

        // ================================================================
        // 19. LOGGING
        // ================================================================
        log(message, level = 'info') {
            const prefix = '[TripEngine]';
            if (level === 'error') console.error(prefix, message);
            else if (level === 'warn') console.warn(prefix, message);
            else if (level === 'debug' && window._DEBUG) console.debug(prefix, message);
            else console.log(prefix, message);
        }

        // ================================================================
        // 20. PUBLIC API (Dành cho UI và các module khác gọi)
        // ================================================================
        getCurrentState() { return this.currentState; }
        getCurrentTrip() { return this.currentTrip; }
        getOdometer() { return this.currentOdometerKm; }
        getWaitTime() { return this.waitTimeMin; }

        // Các hành động
        acceptOrder(tripId, tripData) {
            return this.transition(TRIP_STATE.ACCEPTED, { tripId, tripData });
        }

        arrivedAtPickup() {
            return this.transition(TRIP_STATE.ARRIVED);
        }

        passengerOnboard() {
            return this.transition(TRIP_STATE.ONBOARD);
        }

        startDestinationRoute(destination) {
            if (this.currentTrip) {
                this.currentTrip.destination = destination;
            }
            return this.transition(TRIP_STATE.TO_DESTINATION);
        }

        completeTrip() {
            return this.transition(TRIP_STATE.COMPLETED);
        }

        cancelTrip(reason = 'User cancelled') {
            return this.transition(TRIP_STATE.CANCELLED, { reason });
        }

        // Hàm này cho phép admin hoặc hệ thống gán đơn trực tiếp
        assignOrder(tripId, tripData) {
            return this.transition(TRIP_STATE.ASSIGNED, { tripId, tripData });
        }

        // ================================================================
        // 21. HỦY BỎ (Dọn dẹp tài nguyên)
        // ================================================================
        destroy() {
            if (this.gpsWatchId) {
                navigator.geolocation.clearWatch(this.gpsWatchId);
                this.gpsWatchId = null;
            }
            this.stopWaitTimer();
            this.log('🧹 Trip Engine đã bị hủy', 'info');
        }
    }

    // ================================================================
    // 22. KHỞI TẠO GLOBAL
    // ================================================================
    // Tạo instance duy nhất và gắn vào window
    const engine = new TripEngine();
    window.tripEngine = engine;

    // Nếu muốn debug, bật _DEBUG = true
    window._DEBUG = window._DEBUG || false;

    // Tự động dọn dẹp khi trang unload
    window.addEventListener('beforeunload', () => {
        engine.destroy();
    });

    // ================================================================
    // 23. EXPOSE CÁC HẰNG SỐ (Để các module khác dùng nếu cần)
    // ================================================================
    window.TRIP_STATE = TRIP_STATE;
    window.TRIP_TYPE = TRIP_TYPE;

})(window, document);