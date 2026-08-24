/**
 * gps-bridge.js
 * Cầu nối GPS sạch từ cockpit.js → trip-engine-v4.js
 * Phiên bản: 1.0
 * Mục tiêu: 
 *  - cockpit là nguồn GPS sạch duy nhất
 *  - trip-engine chỉ nhận GPS đã lọc
 *  - Tránh đếm km trùng
 */

(function(window) {
    'use strict';

    console.log('[GPS-Bridge] Đang khởi tạo...');

    // ======================== 1. Đảm bảo cockpit có API ========================
    window.cockpit = window.cockpit || {};

    // Nếu cockpit chưa có getCleanPosition thì tạo tạm
    if (typeof window.cockpit.getCleanPosition !== 'function') {
        window.cockpit.getCleanPosition = function() {
            // Fallback: lấy từ biến global nếu có
            if (typeof lastGood !== 'undefined' && lastGood) {
                return {
                    lat: lastGood.lat,
                    lng: lastGood.lng,
                    speed: (typeof curSpeed !== 'undefined') ? curSpeed : 0,
                    accuracy: (typeof acc !== 'undefined') ? acc : 999,
                    heading: lastGood.heading || 0,
                    timestamp: lastGood.t || Date.now()
                };
            }
            return null;
        };
    }

    // ======================== 2. Hệ thống đăng ký nhận GPS ========================
    var positionCallbacks = [];

    window.cockpit.onPosition = function(callback) {
        if (typeof callback === 'function') {
            positionCallbacks.push(callback);
            console.log('[GPS-Bridge] Đã đăng ký 1 listener GPS');
        }
    };

    // ======================== 3. Publish GPS định kỳ ========================
    setInterval(function() {
        if (positionCallbacks.length === 0) return;

        var pos = null;
        try {
            pos = window.cockpit.getCleanPosition();
        } catch (e) {
            return;
        }

        if (!pos || !pos.lat || !pos.lng) return;

        // Gọi tất cả listener
        positionCallbacks.forEach(function(cb) {
            try {
                cb(pos);
            } catch (err) {
                console.warn('[GPS-Bridge] Lỗi khi gọi callback:', err);
            }
        });
    }, 1000); // 1 giây / lần

    // ======================== 4. Kết nối với Trip Engine ========================
    function connectToTripEngine() {
        if (!window.tripEngine) {
            // Chưa có tripEngine → thử lại sau
            setTimeout(connectToTripEngine, 1500);
            return;
        }

        // Đăng ký nhận GPS sạch
        window.cockpit.onPosition(function(pos) {
            if (!window.tripEngine || typeof window.tripEngine.updateGPS !== 'function') return;

            // Chuyển sang format mà trip-engine đang dùng
            window.tripEngine.updateGPS({
                coords: {
                    latitude: pos.lat,
                    longitude: pos.lng,
                    speed: (pos.speed || 0) / 3.6,   // km/h → m/s
                    accuracy: pos.accuracy || 999,
                    heading: pos.heading || 0
                },
                timestamp: pos.timestamp || Date.now()
            });
        });

        console.log('[GPS-Bridge] ✅ Đã kết nối thành công cockpit → trip-engine');
    }

    // Bắt đầu kết nối
    connectToTripEngine();

    // ======================== 5. Public API ========================
    window.GPSBridge = {
        getPosition: function() {
            return window.cockpit.getCleanPosition();
        },
        onPosition: function(cb) {
            window.cockpit.onPosition(cb);
        },
        version: '1.0'
    };

    console.log('[GPS-Bridge] ✅ Sẵn sàng');
})(window);