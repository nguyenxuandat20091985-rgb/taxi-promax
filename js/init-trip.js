/**
 * init-trip.js
 * Kết nối các nút UI hiện tại với Trip Engine V4
 */

(function() {
    'use strict';

    function getEngine() {
        return window.tripEngine || null;
    }

    function safeCall(fnName, ...args) {
        const engine = getEngine();
        if (engine && typeof engine[fnName] === 'function') {
            return engine[fnName](...args);
        }
        console.warn('[init-trip] tripEngine.' + fnName + ' không tồn tại');
        return false;
    }

    // ====================== GÁN SỰ KIỆN NÚT ======================
    function bindButtons() {
        // Nút ĐÃ ĐẾN ĐIỂM ĐÓN
        const btnArrived = document.getElementById('btn-arrived') || 
                           document.querySelector('[data-action="arrived"]') ||
                           document.querySelector('.btn-arrived');
        if (btnArrived && !btnArrived.dataset.bound) {
            btnArrived.dataset.bound = '1';
            btnArrived.addEventListener('click', function() {
                safeCall('arrivedAtPickup');
                if (typeof showToast === 'function') showToast('📍 Đã đến điểm đón');
            });
        }

        // Nút KHÁCH ĐÃ LÊN XE / BẮT ĐẦU TÍNH CƯỚC
        const btnStart = document.getElementById('btn-start-trip') ||
                         document.querySelector('[data-action="start"]') ||
                         document.querySelector('.btn-start-trip');
        if (btnStart && !btnStart.dataset.bound) {
            btnStart.dataset.bound = '1';
            btnStart.addEventListener('click', function() {
                safeCall('passengerOnboard');
                if (typeof showToast === 'function') showToast('🚗 Bắt đầu tính cước');
            });
        }

        // Nút HOÀN THÀNH CHUYẾN
        const btnComplete = document.getElementById('btn-complete') ||
                            document.querySelector('[data-action="complete"]') ||
                            document.querySelector('.trip-end-btn') ||
                            document.querySelector('.btn-complete');
        if (btnComplete && !btnComplete.dataset.bound) {
            btnComplete.dataset.bound = '1';
            btnComplete.addEventListener('click', function() {
                safeCall('completeTrip');
            });
        }

        // Nút HỦY CHUYẾN
        const btnCancel = document.getElementById('btn-cancel') ||
                          document.querySelector('[data-action="cancel"]');
        if (btnCancel && !btnCancel.dataset.bound) {
            btnCancel.dataset.bound = '1';
            btnCancel.addEventListener('click', function() {
                if (confirm('Bạn chắc chắn muốn hủy chuyến?')) {
                    safeCall('cancelTrip', 'Tài xế hủy');
                }
            });
        }
    }

    // ====================== ĐỒNG BỘ TRẠNG THÁI CŨ → ENGINE ======================
    // Giữ tương thích với code cũ (isRunning, hasPickedUp...)
    function syncLegacyFlags() {
        const engine = getEngine();
        if (!engine) return;

        const state = engine.getCurrentState ? engine.getCurrentState() : 'IDLE';

        // Map state → cờ cũ để UI cũ vẫn chạy
        window.isRunning = ['TO_PICKUP','ARRIVED','WAITING','ONBOARD','TO_DESTINATION'].includes(state);
        window.hasPickedUp = ['ONBOARD','TO_DESTINATION'].includes(state);
    }

    // Lắng nghe event từ Trip Engine
    document.addEventListener('trip:status', function(e) {
        const status = e.detail && e.detail.status;
        console.log('[init-trip] Trạng thái mới:', status);
        syncLegacyFlags();

        // Cập nhật UI nếu cần
        if (status === 'COMPLETED') {
            if (typeof showToast === 'function') showToast('🏁 Chuyến đi hoàn tất');
        }
        if (status === 'CANCELLED') {
            if (typeof showToast === 'function') showToast('❌ Đã hủy chuyến');
        }
    });

    // ====================== KHỞI TẠO ======================
    function init() {
        bindButtons();
        // Bind lại định kỳ phòng UI render động
        setInterval(bindButtons, 3000);
        console.log('✅ init-trip.js đã kết nối UI ↔ Trip Engine');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();