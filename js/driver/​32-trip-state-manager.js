/**
 * Taxi ProMax — Trip State Manager v1.0
 * 
 * Quản lý trạng thái toàn cục cho tất cả các loại chuyến.
 * - Theo dõi trạng thái hiện tại (IDLE, STREET_HAIL, APP_TRIP)
 * - Chuyển đổi giữa các trạng thái
 * - Đồng bộ trạng thái lên Firebase
 * - Cung cấp API cho các handler khác
 * 
 * KHÔNG xử lý logic chuyến cụ thể.
 */
;(function(window, document, undefined) {
    'use strict';

    const TRIP_TYPES = {
        IDLE: 'IDLE',
        STREET_HAIL: 'STREET_HAIL',
        APP_TRIP: 'APP_TRIP'
    };

    const state = {
        currentType: TRIP_TYPES.IDLE,
        isLocked: false,
        listeners: []
    };

    function setTripType(type) {
        if (!Object.values(TRIP_TYPES).includes(type)) {
            console.warn('[TripStateManager] Invalid type:', type);
            return false;
        }

        const oldType = state.currentType;
        state.currentType = type;

        updateDocumentState(type);
        syncToFirebase(type);
        notifyListeners(type, oldType);
        updateMainButton(type);

        return true;
    }

    function getCurrentType() {
        return state.currentType;
    }

    function isTripActive() {
        return state.currentType !== TRIP_TYPES.IDLE;
    }

    function setLocked(locked) {
        state.isLocked = locked;
    }

    function isLocked() {
        return state.isLocked;
    }

    function addListener(callback) {
        if (typeof callback === 'function') {
            state.listeners.push(callback);
        }
    }

    function removeListener(callback) {
        state.listeners = state.listeners.filter(function(fn) {
            return fn !== callback;
        });
    }

    function updateDocumentState(type) {
        document.documentElement.setAttribute('data-trip-type', type);
        document.documentElement.setAttribute('data-trip-active', type !== TRIP_TYPES.IDLE ? 'true' : 'false');

        if (document.body) {
            document.body.setAttribute('data-trip-type', type);
            document.body.setAttribute('data-trip-active', type !== TRIP_TYPES.IDLE ? 'true' : 'false');
        }
    }

    function updateMainButton(type) {
        const mainBtn = document.getElementById('mainBtn');
        if (!mainBtn) return;

        if (type === TRIP_TYPES.IDLE) {
            mainBtn.innerText = '🚖 BẮT ĐẦU CHUYẾN ĐI';
            mainBtn.style.background = 'var(--accent)';
        } else {
            mainBtn.innerText = '⏳ ĐANG CÓ CHUYẾN';
            mainBtn.style.background = '#f39c12';
        }
    }

    function notifyListeners(type, oldType) {
        state.listeners.forEach(function(fn) {
            try {
                fn(type, oldType);
            } catch(e) {
                console.warn('[TripStateManager] Listener error:', e);
            }
        });
    }

    function syncToFirebase(type) {
        try {
            const uid = window.driverInfo ? window.driverInfo.uid : null;
            if (!uid) return;
            const db = window.db;
            if (!db) return;
            db.ref(`driver_state/${uid}`).set({
                type: type,
                updatedAt: Date.now(),
                online: window.isDriverOnline !== undefined ? window.isDriverOnline : true
            }).catch(function() {});
        } catch(e) {}
    }

    window.TripStateManager = {
        TRIP_TYPES: TRIP_TYPES,
        setTripType: setTripType,
        getCurrentType: getCurrentType,
        isTripActive: isTripActive,
        setLocked: setLocked,
        isLocked: isLocked,
        addListener: addListener,
        removeListener: removeListener
    };

    window.__tripTypes = TRIP_TYPES;

    console.log('✅ TripStateManager v1.0 loaded — central state management');

})(window, document);