/**
 * Taxi ProMax — Street Hail Handler v1.0
 * 
 * Xử lý riêng biệt luồng CHUYẾN VẪY (Street Hail)
 * - Bắt đầu chuyến
 * - Tính cước dựa trên quãng đường Haversine (không phụ thuộc độ chính xác GPS)
 * - Hiển thị nút "KẾT THÚC CHUYẾN ĐI" khi đang chạy
 * - Lưu lịch sử khi kết thúc
 * 
 * KHÔNG ảnh hưởng đến các luồng app booking.
 */
;(function(window, document, undefined) {
    'use strict';

    // ==================== STATE ====================
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

    // ==================== DOM REFERENCES ====================
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
            wishModal: document.getElementById('wishModal')
        };
    }

    // ==================== CORE FUNCTIONS ====================
    function startStreetHail() {
        if (state.isActive) {
            if (typeof window.showConfirmDialog === 'function') {
                window.showConfirmDialog('Bạn có chắc chắn muốn kết thúc chuyến đi?', function() {
                    endStreetHail();
                });
            } else {
                alert('Đã có chuyến đang chạy! Hãy kết thúc trước khi bắt đầu mới.');
            }
            return;
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
            window.showToast('🚕 Chuyến vẫy đã bắt đầu! Đồng hồ tính cước đã sẵn sàng.');
        }

        syncToFirebase('active');
    }

    function endStreetHail() {
        if (!state.isActive) {
            if (typeof window.showToast === 'function') {
                window.showToast('Không có chuyến nào để kết thúc.');
            }
            return;
        }

        stopUIUpdateTimer();

        const finalKm = state.totalKm;
        const rate = getFareRate();
        let finalCost = Math.round(finalKm * rate);
        if (finalCost < state.minFare) finalCost = state.minFare;

        if (typeof window.saveHistory === 'function') {
            window.saveHistory(finalKm, finalCost.toLocaleString('vi-VN'), finalCost, 'STREET_HAIL');
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
                localStorage.setItem('trip_history', JSON.stringify(history.slice(0, 100)));
            } catch(e) {}
        }

        state.isActive = false;
        state.totalKm = 0;
        state.startTime = null;
        state.lastPosition = null;
        state.lastTime = null;

        hideStreetHailUI();
        showEndSummary(finalKm, finalCost);

        syncToFirebase('idle');

        if (typeof window.speak === 'function') {
            window.speak(`Chuyến vẫy kết thúc. Tổng tiền ${finalCost.toLocaleString('vi-VN')} đồng.`);
        }
        if (typeof window.showToast === 'function') {
            window.showToast('✅ Chuyến vẫy đã kết thúc!');
        }
    }

    // ==================== GPS UPDATE ====================
    function onGPSUpdate(position) {
        if (!state.isActive) return;
        if (!position || position.lat == null || position.lng == null) return;

        const lat = Number(position.lat);
        const lng = Number(position.lng);
        const accuracy = Number(position.accuracy) || 999;
        const timestamp = Number(position.timestamp) || Date.now();

        const currentPos = { lat, lng };

        if (!state.lastPosition) {
            state.lastPosition = currentPos;
            state.lastTime = timestamp;
            return;
        }

        const dist = haversineDistance(
            state.lastPosition.lat, state.lastPosition.lng,
            currentPos.lat, currentPos.lng
        );

        if (dist > 0.01 && dist < 0.5) {
            state.totalKm += dist;
            updateDisplay(state.totalKm, Math.round(state.totalKm * getFareRate()));
        }

        state.lastPosition = currentPos;
        state.lastTime = timestamp;
    }

    // ==================== UI ====================
    function showStreetHailUI() {
        const els = getElements();
        if (els.homeControls) els.homeControls.style.display = 'none';
        if (els.tripPanel) els.tripPanel.style.display = 'block';
        if (els.statsUI) els.statsUI.classList.add('show');
        if (els.mainBtn) {
            els.mainBtn.innerText = '⏳ ĐANG CHẠY CHUYẾN';
            els.mainBtn.style.background = '#f39c12';
        }

        if (els.tripClientName) els.tripClientName.innerText = '🚕 Khách vẫy';
        if (els.tripClientPhone) els.tripClientPhone.innerText = '---';
        if (els.tripFrom) els.tripFrom.innerText = 'Vị trí hiện tại';
        if (els.tripTo) els.tripTo.innerText = 'Chưa xác định';
        if (els.tripCarType) {
            const carClass = window.driverInfo ? window.driverInfo.carClass : '4_seats';
            els.tripCarType.innerHTML = carClass === '7_seats' ? '🚙 7 Chỗ' : '🚗 4 Chỗ';
        }
        if (els.tripStatusText) els.tripStatusText.innerHTML = '🚕 CHUYẾN VẪY - ĐANG CHẠY';
        if (els.tripActionButtons) els.tripActionButtons.style.display = 'none';

        if (els.endTripBtn) {
            els.endTripBtn.style.display = 'block';
            els.endTripBtn.innerText = '🏁 KẾT THÚC CHUYẾN ĐI';
            els.endTripBtn.onclick = function() {
                if (typeof window.showConfirmDialog === 'function') {
                    window.showConfirmDialog('Bạn có chắc chắn muốn kết thúc chuyến đi?', function() {
                        endStreetHail();
                    });
                } else {
                    if (confirm('Bạn có chắc chắn muốn kết thúc chuyến đi?')) {
                        endStreetHail();
                    }
                }
            };
        }

        const nav = document.querySelector('.nav-grid');
        if (nav) nav.style.display = 'none';
        const brand = document.querySelector('.brand-footer');
        if (brand) brand.style.display = 'none';
    }

    function hideStreetHailUI() {
        const els = getElements();
        if (els.homeControls) els.homeControls.style.display = 'block';
        if (els.tripPanel) els.tripPanel.style.display = 'none';
        if (els.statsUI) els.statsUI.classList.remove('show');
        if (els.mainBtn) {
            els.mainBtn.innerText = '🚖 BẮT ĐẦU CHUYẾN ĐI';
            els.mainBtn.style.background = 'var(--accent)';
        }
        if (els.endTripBtn) {
            els.endTripBtn.style.display = 'none';
            els.endTripBtn.onclick = null;
        }

        const nav = document.querySelector('.nav-grid');
        if (nav) nav.style.display = 'flex';
        const brand = document.querySelector('.brand-footer');
        if (brand) brand.style.display = 'block';

        if (els.kmDisplay) els.kmDisplay.innerText = '0.00';
        if (els.costDisplay) els.costDisplay.innerText = '0';
    }

    function updateDisplay(km, fare) {
        const els = getElements();
        if (els.kmDisplay) els.kmDisplay.innerText = km.toFixed(2);
        if (els.costDisplay) els.costDisplay.innerText = fare.toLocaleString();
        if (els.tripKmLive) els.tripKmLive.innerText = km.toFixed(2) + ' KM';
        if (els.tripPrice) els.tripPrice.innerHTML = fare.toLocaleString() + 'đ';
    }

    function showEndSummary(km, fare) {
        const summary = document.getElementById('endSummary');
        if (summary) {
            summary.innerHTML = `
                Quãng đường: <b>${km.toFixed(2)} KM</b><br>
                Tổng: <b style="color:var(--primary);font-size:20px;">${fare.toLocaleString('vi-VN')}đ</b><br>
                <span style="font-size:11px;">🚕 Chuyến vẫy</span>
            `;
        }
        const modal = document.getElementById('endModal');
        if (modal) modal.style.display = 'flex';
    }

    function startUIUpdateTimer() {
        stopUIUpdateTimer();
        state.intervalId = setInterval(function() {
            if (state.isActive) {
                const km = state.totalKm;
                const fare = Math.round(km * getFareRate());
                updateDisplay(km, fare);
            }
        }, 1000);
    }

    function stopUIUpdateTimer() {
        if (state.intervalId) {
            clearInterval(state.intervalId);
            state.intervalId = null;
        }
    }

    // ==================== HELPERS ====================
    function getFareRate() {
        if (window.currentRate !== undefined && window.currentRate !== null) {
            return Number(window.currentRate);
        }
        if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.getRate === 'function') {
            return window.PromaxLegacyRuntime.getRate();
        }
        return 15000;
    }

    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) ** 2 +
                  Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
                  Math.sin(dLon/2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    function syncToFirebase(status) {
        try {
            const uid = window.driverInfo ? window.driverInfo.uid : null;
            if (!uid) return;
            const db = window.db;
            if (!db) return;
            db.ref(`street_hail/${uid}`).set({
                status: status,
                totalKm: state.totalKm,
                startTime: state.startTime,
                updatedAt: Date.now()
            }).catch(function() {});
        } catch(e) {}
    }

    // ==================== PUBLIC API ====================
    window.StreetHailHandler = {
        start: startStreetHail,
        end: endStreetHail,
        onGPSUpdate: onGPSUpdate,
        isActive: function() { return state.isActive; },
        getTotalKm: function() { return state.totalKm; },
        getFare: function() { return Math.round(state.totalKm * getFareRate()); }
    };

    // Gắn vào window để core gọi khi cần
    window.startStreetHail = startStreetHail;
    window.endStreetHail = endStreetHail;

    console.log('✅ StreetHailHandler v1.0 loaded — independent street hail flow');

})(window, document);