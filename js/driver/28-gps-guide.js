// Extracted from index.html; load order is intentionally preserved.
(function(){
    'use strict';
    
    // GPS Guide chạy ngầm - chỉ log và tự động kiểm tra, KHÔNG hiển thị popup
    var shown = false;

    function show() {
        if (shown) return;
        shown = true;
        
        // Chỉ log ra console, không hiển thị popup
        console.log('📡 [GPS Guide] GPS đang yếu, khuyến nghị bật Vị trí chính xác');
        
        // Phát âm thanh nếu cần (tùy chọn)
        // if (typeof speak === 'function') speak('GPS chưa chính xác. Vui lòng bật vị trí chính xác.');
    }

    // Kiểm tra GPS khi khởi động
    if (navigator.geolocation) {
        // Kiểm tra nhanh lần đầu
        navigator.geolocation.getCurrentPosition(
            function(p) {
                // GPS OK - không làm gì
                console.log('📡 [GPS Guide] GPS hoạt động tốt, độ chính xác: ' + Math.round(p.coords.accuracy) + 'm');
            },
            function(err) {
                // GPS bị lỗi - chỉ log, không hiển thị
                if (err && err.code === 1) {
                    console.warn('📡 [GPS Guide] GPS bị từ chối quyền (chạy ngầm)');
                }
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }

    // Theo dõi GPS liên tục nhưng KHÔNG hiển thị popup
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            function(p) {
                if ((p.coords.accuracy || 0) > 800) {
                    // GPS yếu - chỉ log
                    console.log('📡 [GPS Guide] GPS yếu: ' + Math.round(p.coords.accuracy) + 'm (chạy ngầm)');
                }
            },
            function(err) {
                if (err && err.code === 1) {
                    // GPS bị từ chối - không hiển thị popup
                    console.warn('📡 [GPS Guide] GPS bị từ chối quyền (chạy ngầm)');
                }
            },
            { enableHighAccuracy: false, maximumAge: 5000 }
        );
    }

    console.log('✅ GPS GUIDE v3 - CHẠY NGẦM (không popup)');
})();
