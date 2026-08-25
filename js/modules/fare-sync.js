/**
 * fare-sync.js
 * Làm sạch việc tính km + đồng bộ fare giữa Trip Engine và UI
 */

(function(window) {
    'use strict';

    function getEngine() {
        return window.tripEngine || null;
    }

    // Lấy km sạch từ Trip Engine (ưu tiên)
    function getCleanKm() {
        const engine = getEngine();
        if (engine && typeof engine.getOdometer === 'function') {
            return engine.getOdometer() || 0;
        }
        // Fallback về biến cũ
        return (typeof totalKm !== 'undefined') ? totalKm : 0;
    }

    // Cập nhật UI km + tiền
    function updateFareUI() {
        const km = getCleanKm();
        const rate = (typeof currentRate !== 'undefined') ? currentRate : 15000;
        const fare = Math.max(20000, Math.round(km * rate));

        const kmEl = document.getElementById('km');
        const costEl = document.getElementById('cost');
        const tripPriceEl = document.getElementById('tripPrice');

        if (kmEl) kmEl.innerText = km.toFixed(2);
        if (costEl) costEl.innerText = fare.toLocaleString('vi-VN');
        if (tripPriceEl) tripPriceEl.innerHTML = fare.toLocaleString('vi-VN') + 'đ';
    }

    // Đồng bộ định kỳ khi đang chạy
    setInterval(function() {
        const engine = getEngine();
        if (!engine) return;

        const state = engine.getCurrentState ? engine.getCurrentState() : 'IDLE';
        if (state === 'ONBOARD' || state === 'TO_DESTINATION') {
            updateFareUI();
        }
    }, 1000);

    // Export
    window.FareSync = {
        getCleanKm: getCleanKm,
        updateFareUI: updateFareUI
    };

    console.log('✅ FareSync loaded');
})(window);