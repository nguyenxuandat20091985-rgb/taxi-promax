/**
 * Taxi ProMax — Street Hail Handler v1.1
 *
 * Luồng CHUYẾN VẪY (Street Hail) — độc lập theo PROJECT architecture.
 * - Bắt đầu / kết thúc chuyến vẫy
 * - Tính cước Haversine, minFare 20.000đ
 * - LUÔN hiện nút "KẾT THÚC CHUYẾN ĐI" khi đang chạy
 * - Ưu tiên TripUIHandler nếu có; fallback DOM trực tiếp
 */
;(function(window, document, undefined) {
    'use strict';

    const state = {
        isActive: false,
        totalKm: 0,
        startTime: null,
        lastPosition: null,
        lastTime: null,
        isGapMode: false,
        intervalId: null,
        fareRate: 15000,
        minFare: 20000
    };

    function getElements() {
        return {
            mainBtn: document.getElementById('mainBtn'),
            homeControls: document.getElementById('homeControls'),
            tripPanel: document.getElementById('tripInfoPanel'),
            statsUI: document.getElementById('statsUI'),
            tripStatusText: document.getElementById('tripStatusText'),
            tripClientName: document.getElementById('tripClientName'),
            tripClientPhone: document.getElementById('tripClientPhone'),
            tripFrom: document.getElementById('tripFrom'),
            tripTo: document.getElementById('tripTo'),
            tripPrice: document.getElementById('tripPrice'),
            tripKmLive: document.getElementById('tripKmLive'),
            tripCarType: document.getElementById('tripCarType'),
            tripActionButtons: document.getElementById('tripActionButtons'),
            endTripBtn: document.getElementById('endTripBtn'),
            kmDisplay: document.getElementById('km'),
            costDisplay: document.getElementById('cost'),
            endSummary: document.getElementById('endSummary'),
            endModal: document.getElementById('endModal'),
            wishModal: document.getElementById('wishModal'),
            navGrid: document.querySelector('.nav-grid'),
            brandFooter: document.querySelector('.brand-footer'),
            footerPanel: document.querySelector('.footer-panel')
        };
    }

    function getFareRate() {
        try {
            if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.getRate === 'function') {
                const r = Number(window.PromaxLegacyRuntime.getRate());
                if (r > 0) return r;
            }
        } catch (e) {}
        const slider = document.getElementById('priceSlider');
        if (slider) {
            const v = Number(slider.value);
            if (v > 0) return v;
        }
        return state.fareRate || 15000;
    }

    function haversineKm(lat1, lon1, lat2, lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function forceShow(el, display) {
        if (!el) return;
        el.style.setProperty('display', display, 'important');
        el.removeAttribute('hidden');
    }

    function forceHide(el) {
        if (!el) return;
        el.style.setProperty('display', 'none', 'important');
    }

    function setTripBodyClass(active) {
        try {
            document.body.classList.toggle('trip-active', !!active);
            document.body.classList.toggle('trip-street-hail', !!active);
            document.documentElement.setAttribute('data-trip-type', active ? 'STREET_HAIL' : '');
            document.documentElement.setAttribute('data-trip-state', active ? 'STREET_HAIL' : 'IDLE');
        } catch (e) {}
    }

    function ensureEndButton(onEnd) {
        const els = getElements();
        let btn = els.endTripBtn;

        // Tạo nút nếu HTML thiếu
        if (!btn && els.tripPanel) {
            btn = document.createElement('button');
            btn.id = 'endTripBtn';
            btn.className = 'trip-end-btn';
            els.tripPanel.appendChild(btn);
        }

        // Nút sticky dự phòng (luôn thấy, không bị scroll/nav che)
        let sticky = document.getElementById('streetHailEndSticky');
        if (!sticky) {
            sticky = document.createElement('button');
            sticky.id = 'streetHailEndSticky';
            sticky.type = 'button';
            sticky.className = 'trip-end-sticky';
            sticky.textContent = '🏁 KẾT THÚC CHUYẾN ĐI';
            document.body.appendChild(sticky);
        }

        const handler = function(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            confirmEnd();
        };

        if (btn) {
            forceShow(btn, 'block');
            btn.innerText = '🏁 KẾT THÚC CHUYẾN ĐI';
            btn.onclick = handler;
        }

        forceShow(sticky, 'block');
        sticky.onclick = handler;

        // TripUIHandler nếu có
        if (window.TripUIHandler && typeof window.TripUIHandler.showEndButton === 'function') {
            try { window.TripUIHandler.showEndButton(handler); } catch (e) {}
        }

        if (typeof onEnd === 'function') onEnd(btn);
        return btn;
    }

    function hideEndButton() {
        const btn = document.getElementById('endTripBtn');
        if (btn) {
            forceHide(btn);
            btn.onclick = null;
        }
        const sticky = document.getElementById('streetHailEndSticky');
        if (sticky) forceHide(sticky);
        if (window.TripUIHandler && typeof window.TripUIHandler.hideEndButton === 'function') {
            try { window.TripUIHandler.hideEndButton(); } catch (e) {}
        }
    }

    function confirmEnd() {
        if (!state.isActive) {
            if (typeof window.showToast === 'function') window.showToast('Không có chuyến nào để kết thúc.');
            return;
        }
        if (typeof window.showConfirmDialog === 'function') {
            window.showConfirmDialog('Bạn có chắc chắn muốn kết thúc chuyến đi?', function() {
                endStreetHail();
            });
        } else if (window.confirm('Bạn có chắc chắn muốn kết thúc chuyến đi?')) {
            endStreetHail();
        }
    }

    function showStreetHailUI() {
        const els = getElements();
        setTripBodyClass(true);

        if (window.TripUIHandler && typeof window.TripUIHandler.showTripPanel === 'function') {
            try {
                window.TripUIHandler.showTripPanel('STREET_HAIL', {
                    clientName: 'Khách vẫy',
                    clientPhone: '---',
                    from: 'Vị trí hiện tại',
                    to: 'Chưa xác định',
                    status: 'ĐANG CHẠY CHUYẾN'
                });
            } catch (e) {}
        }

        forceHide(els.homeControls);
        forceShow(els.tripPanel, 'block');
        if (els.statsUI) els.statsUI.classList.add('show');

        // Ẩn nav bằng !important (premium-ui dùng display:flex !important)
        forceHide(els.navGrid);
        forceHide(els.brandFooter);

        if (els.mainBtn) {
            els.mainBtn.innerText = 'ĐANG CHẠY CHUYẾN';
            els.mainBtn.style.background = '#f39c12';
        }

        if (els.tripClientName) els.tripClientName.innerText = 'Khách vẫy';
        if (els.tripClientPhone) els.tripClientPhone.innerText = '---';
        if (els.tripFrom) els.tripFrom.innerText = 'Vị trí hiện tại';
        if (els.tripTo) els.tripTo.innerText = 'Chưa xác định';
        if (els.tripStatusText) els.tripStatusText.innerText = 'ĐANG CHẠY CHUYẾN';
        if (els.tripCarType) {
            const carClass = window.driverInfo ? window.driverInfo.carClass : '4_seats';
            els.tripCarType.innerHTML = carClass === '7_seats' ? '7 Chỗ' : '4 Chỗ';
        }
        forceHide(els.tripActionButtons);

        ensureEndButton();
        updateDisplay(state.totalKm, calcFare(state.totalKm));
    }

    function hideStreetHailUI() {
        const els = getElements();
        setTripBodyClass(false);

        if (window.TripUIHandler && typeof window.TripUIHandler.hideTripPanel === 'function') {
            try { window.TripUIHandler.hideTripPanel(); } catch (e) {}
        }

        forceShow(els.homeControls, 'block');
        forceHide(els.tripPanel);
        if (els.statsUI) els.statsUI.classList.remove('show');

        if (els.navGrid) els.navGrid.style.setProperty('display', 'flex', 'important');
        if (els.brandFooter) els.brandFooter.style.setProperty('display', 'block', 'important');

        if (els.mainBtn) {
            els.mainBtn.innerText = 'BẮT ĐẦU CHUYẾN ĐI';
            els.mainBtn.style.background = '';
        }

        hideEndButton();

        if (els.kmDisplay) els.kmDisplay.innerText = '0.00';
        if (els.costDisplay) els.costDisplay.innerText = '0';
        if (els.tripKmLive) els.tripKmLive.innerText = '0.00 KM';
        if (els.tripPrice) els.tripPrice.innerText = '0đ';
    }

    function calcFare(km) {
        let fare = Math.round(Number(km || 0) * getFareRate());
        if (fare < state.minFare) fare = state.minFare;
        // Chuyến 0km vẫn min fare khi đang active? Chỉ áp min khi kết thúc.
        // Trong lúc chạy: hiện km * rate, tối thiểu 0 cho đến khi end
        if (state.isActive && Number(km || 0) <= 0) return 0;
        return fare;
    }

    function updateDisplay(km, fare) {
        const els = getElements();
        const k = Number(km || 0);
        const f = fare == null ? calcFare(k) : Number(fare);
        if (els.kmDisplay) els.kmDisplay.innerText = k.toFixed(2);
        if (els.costDisplay) els.costDisplay.innerText = f.toLocaleString('vi-VN');
        if (els.tripKmLive) els.tripKmLive.innerText = k.toFixed(2) + ' KM';
        if (els.tripPrice) els.tripPrice.innerText = f.toLocaleString('vi-VN') + 'đ';
        if (window.TripUIHandler && typeof window.TripUIHandler.updateFareDisplay === 'function') {
            try { window.TripUIHandler.updateFareDisplay(k, f); } catch (e) {}
        }
    }

    function startUIUpdateTimer() {
        stopUIUpdateTimer();
        state.intervalId = setInterval(function() {
            if (!state.isActive) return;
            // Re-assert end button mỗi 2s (phòng script khác ẩn)
            ensureEndButton();
            updateDisplay(state.totalKm, calcFare(state.totalKm));
        }, 2000);
    }

    function stopUIUpdateTimer() {
        if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }
    }

    function onGPSUpdate(lat, lng) {
        if (!state.isActive) return;
        if (lat == null || lng == null) return;
        const now = Date.now();
        if (state.lastPosition && state.lastPosition.lat && state.lastPosition.lng) {
            const d = haversineKm(state.lastPosition.lat, state.lastPosition.lng, lat, lng);
            // Lọc nhiễu: chỉ cộng nếu di chuyển hợp lý (< 0.5km / tick và > 5m)
            if (d >= 0.005 && d < 0.5) {
                state.totalKm += d;
            }
        }
        state.lastPosition = { lat: Number(lat), lng: Number(lng) };
        state.lastTime = now;
        updateDisplay(state.totalKm, calcFare(state.totalKm));
    }

    function syncToFirebase(status) {
        try {
            const uid = window.driverInfo ? window.driverInfo.uid : null;
            if (!uid) return;
            const db = window.db || (window.firebase && firebase.database && firebase.database());
            if (!db || !db.ref) return;
            db.ref('street_hail/' + uid).set({
                status: status,
                totalKm: state.totalKm,
                startTime: state.startTime,
                updatedAt: Date.now()
            }).catch(function() {});
        } catch (e) {}
    }

    function showEndSummary(km, fare) {
        const summary = document.getElementById('endSummary');
        if (summary) {
            summary.innerHTML =
                'Quãng đường: <b>' + km.toFixed(2) + ' KM</b><br>' +
                'Tổng: <b style="color:var(--primary);font-size:20px;">' + fare.toLocaleString('vi-VN') + 'đ</b><br>' +
                '<span style="font-size:11px;">Chuyến vẫy</span>';
        }
        const modal = document.getElementById('endModal');
        if (modal) modal.style.display = 'flex';
        if (window.TripUIHandler && typeof window.TripUIHandler.showEndModal === 'function') {
            try { window.TripUIHandler.showEndModal(km, fare, 'STREET_HAIL'); } catch (e) {}
        }
    }

    function startStreetHail() {
        if (state.isActive) {
            confirmEnd();
            return true;
        }

        // Chặn nếu đang có chuyến app
        if (window.AppTripHandler && typeof window.AppTripHandler.isRunning === 'function' && window.AppTripHandler.isRunning()) {
            if (typeof window.showToast === 'function') {
                window.showToast('Đang có chuyến app. Vui lòng kết thúc trước.');
            }
            return false;
        }

        state.isActive = true;
        state.totalKm = 0;
        state.startTime = Date.now();
        state.lastPosition = {
            lat: window.currentLat || 0,
            lng: window.currentLng || 0
        };
        state.lastTime = Date.now();
        state.isGapMode = false;

        showStreetHailUI();
        updateDisplay(0, 0);
        startUIUpdateTimer();

        const wishModal = document.getElementById('wishModal');
        if (wishModal) wishModal.style.display = 'flex';

        if (typeof window.speak === 'function') {
            window.speak('Bắt đầu chuyến vẫy. Đồng hồ sẽ nhảy khi xe di chuyển.');
        }
        if (typeof window.showToast === 'function') {
            window.showToast('Chuyến vẫy đã bắt đầu! Đồng hồ tính cước đã sẵn sàng.');
        }

        syncToFirebase('active');

        // Báo state manager nếu có
        if (window.TripStateManager && typeof window.TripStateManager.setState === 'function') {
            try { window.TripStateManager.setState('STREET_HAIL'); } catch (e) {}
        }

        return true;
    }

    function endStreetHail() {
        if (!state.isActive) {
            if (typeof window.showToast === 'function') {
                window.showToast('Không có chuyến nào để kết thúc.');
            }
            return false;
        }

        stopUIUpdateTimer();

        const finalKm = state.totalKm;
        const rate = getFareRate();
        let finalCost = Math.round(finalKm * rate);
        if (finalCost < state.minFare) finalCost = state.minFare;

        if (typeof window.saveHistory === 'function') {
            try {
                window.saveHistory(finalKm, finalCost.toLocaleString('vi-VN'), finalCost, 'STREET_HAIL');
            } catch (e) {}
        } else {
            try {
                const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
                history.unshift({
                    km: finalKm,
                    cost: finalCost,
                    costLabel: finalCost.toLocaleString('vi-VN') + 'đ',
                    time: new Date().toLocaleString('vi-VN'),
                    timestamp: Date.now(),
                    rate: rate,
                    driverId: window.driverInfo ? window.driverInfo.uid : 'local',
                    tripType: 'STREET_HAIL'
                });
                localStorage.setItem('trip_history', JSON.stringify(history.slice(0, 200)));
            } catch (e) {}
        }

        state.isActive = false;
        state.totalKm = 0;
        state.startTime = null;
        state.lastPosition = null;

        hideStreetHailUI();
        showEndSummary(finalKm, finalCost);
        syncToFirebase('completed');

        if (typeof window.showToast === 'function') {
            window.showToast('Chuyến vẫy đã kết thúc!');
        }
        if (typeof window.speak === 'function') {
            window.speak('Kết thúc chuyến. Cảm ơn bạn.');
        }

        if (window.TripStateManager && typeof window.TripStateManager.setState === 'function') {
            try { window.TripStateManager.setState('IDLE'); } catch (e) {}
        }

        return true;
    }

    // Nhận GPS từ core
    function bindGpsBridge() {
        const prev = window.processBackgroundLocation;
        window.processBackgroundLocation = function(loc) {
            try {
                if (loc && state.isActive) {
                    const lat = loc.lat != null ? loc.lat : loc.latitude;
                    const lng = loc.lng != null ? loc.lng : loc.longitude;
                    onGPSUpdate(lat, lng);
                }
            } catch (e) {}
            if (typeof prev === 'function') return prev.apply(this, arguments);
        };
        // Cũng lắng nghe currentLat/Lng poll nhẹ
        setInterval(function() {
            if (!state.isActive) return;
            if (window.currentLat != null && window.currentLng != null) {
                onGPSUpdate(window.currentLat, window.currentLng);
            }
        }, 3000);
    }

    window.StreetHailHandler = {
        start: startStreetHail,
        end: endStreetHail,
        onGPSUpdate: onGPSUpdate,
        isActive: function() { return state.isActive; },
        getTotalKm: function() { return state.totalKm; },
        getFare: function() { return calcFare(state.totalKm); }
    };

    window.startStreetHail = startStreetHail;
    window.endStreetHail = endStreetHail;

    // Đồng bộ handleTrip nếu chưa có engine
    if (typeof window.handleTrip !== 'function') {
        window.handleTrip = function() {
            return startStreetHail();
        };
    }

    bindGpsBridge();
    console.log('StreetHailHandler v1.1 loaded — end button forced visible');

})(window, document);
