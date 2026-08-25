/**
 * smart-dispatch.js
 * Phát hiện tài xế đang trên cầu / cao tốc / đường lớn
 * → Lọc đơn thông minh (tránh gán đơn đón ngược chiều / đón xa)
 * Phiên bản: 1.0
 */

(function(window) {
    'use strict';

    const CONFIG = {
        HIGHWAY_SPEED_KMH: 55,          // Tốc độ coi như đang trên đường lớn/cầu
        HIGHWAY_MIN_DURATION_S: 25,     // Duy trì tốc độ cao ít nhất 25 giây
        MAX_PICKUP_DISTANCE_KM: 3.5,    // Khoảng cách đón tối đa khi đang trên đường lớn
        REVERSE_ANGLE_DEG: 110,         // Góc lệch hướng coi là ngược chiều
        CHECK_INTERVAL_MS: 4000,
        COOLDOWN_MS: 45000              // Thời gian giữ trạng thái "đang trên đường lớn"
    };

    let isOnMajorRoad = false;
    let highSpeedStart = 0;
    let lastMajorRoadTime = 0;
    let currentHeading = 0;
    let lastPos = null;

    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function bearing(lat1, lon1, lat2, lon2) {
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δλ = (lon2 - lon1) * Math.PI/180;
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1)*Math.cos(φ2) - Math.sin(φ1)*Math.sin(φ2)*Math.cos(Δλ);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    function angleDiff(a, b) {
        let d = Math.abs(a - b) % 360;
        return d > 180 ? 360 - d : d;
    }

    // Cập nhật trạng thái đang trên đường lớn / cầu
    function updateRoadContext(pos) {
        if (!pos || !pos.lat) return;

        const speed = pos.speed || 0; // km/h
        const now = Date.now();

        if (speed >= CONFIG.HIGHWAY_SPEED_KMH) {
            if (!highSpeedStart) highSpeedStart = now;
            if ((now - highSpeedStart) / 1000 >= CONFIG.HIGHWAY_MIN_DURATION_S) {
                isOnMajorRoad = true;
                lastMajorRoadTime = now;
            }
        } else {
            highSpeedStart = 0;
            // Giữ trạng thái một lúc sau khi giảm tốc
            if (now - lastMajorRoadTime > CONFIG.COOLDOWN_MS) {
                isOnMajorRoad = false;
            }
        }

        // Cập nhật heading
        if (lastPos) {
            const dist = haversine(lastPos.lat, lastPos.lng, pos.lat, pos.lng);
            if (dist > 0.03) { // chỉ cập nhật khi đi được > 30m
                currentHeading = bearing(lastPos.lat, lastPos.lng, pos.lat, pos.lng);
            }
        }
        lastPos = { lat: pos.lat, lng: pos.lng };
    }

    /**
     * Kiểm tra đơn có nên nhận hay không khi đang trên đường lớn
     * @returns {object} { accept: boolean, reason: string, score: number }
     */
    function evaluateOrder(order, driverPos) {
        if (!order || !driverPos) {
            return { accept: true, reason: 'Thiếu dữ liệu', score: 50 };
        }

        const pickupLat = order.pickupLat || order.pickup?.lat;
        const pickupLng = order.pickupLng || order.pickup?.lng;

        if (!pickupLat || !pickupLng) {
            return { accept: true, reason: 'Không có điểm đón', score: 40 };
        }

        const distKm = haversine(driverPos.lat, driverPos.lng, pickupLat, pickupLng);
        const toPickupBearing = bearing(driverPos.lat, driverPos.lng, pickupLat, pickupLng);
        const reverse = angleDiff(currentHeading, toPickupBearing) > CONFIG.REVERSE_ANGLE_DEG;

        // Nếu đang trên đường lớn / cầu
        if (isOnMajorRoad) {
            // Đơn quá xa
            if (distKm > CONFIG.MAX_PICKUP_DISTANCE_KM) {
                return {
                    accept: false,
                    reason: `Đang trên đường lớn, điểm đón quá xa (${distKm.toFixed(1)}km)`,
                    score: 10
                };
            }
            // Đơn ngược chiều
            if (reverse && distKm > 1.2) {
                return {
                    accept: false,
                    reason: `Đang trên đường lớn, điểm đón ngược chiều`,
                    score: 15
                };
            }
        }

        // Tính điểm ưu tiên
        let score = 100;
        score -= distKm * 12;
        if (reverse) score -= 25;
        if (isOnMajorRoad) score -= 10;

        return {
            accept: score >= 35,
            reason: score >= 35 ? 'Phù hợp' : 'Điểm ưu tiên thấp',
            score: Math.max(0, Math.round(score)),
            distanceKm: distKm,
            isReverse: reverse,
            onMajorRoad: isOnMajorRoad
        };
    }

    // Public API
    window.SmartDispatch = {
        isOnMajorRoad: function() { return isOnMajorRoad; },
        getHeading: function() { return currentHeading; },
        evaluateOrder: evaluateOrder,
        update: updateRoadContext,

        // Lọc danh sách đơn
        filterOrders: function(orders, driverPos) {
            if (!Array.isArray(orders)) return [];
            return orders
                .map(o => {
                    const ev = evaluateOrder(o, driverPos);
                    return { ...o, _eval: ev };
                })
                .filter(o => o._eval.accept)
                .sort((a, b) => b._eval.score - a._eval.score);
        }
    };

    // Tự động nhận GPS từ cockpit / bridge
    function startListening() {
        if (window.cockpit && typeof window.cockpit.onPosition === 'function') {
            window.cockpit.onPosition(function(pos) {
                updateRoadContext(pos);
            });
            console.log('[SmartDispatch] Đã kết nối GPS từ cockpit');
            return;
        }
        // Fallback
        setTimeout(startListening, 2000);
    }

    startListening();
    console.log('✅ SmartDispatch v1.0 loaded');
})(window);