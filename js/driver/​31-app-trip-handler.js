/**
 * Taxi ProMax — App Trip Handler v1.0
 * 
 * Xử lý riêng biệt luồng CHUYẾN APP (App Booking)
 * - Nhận đơn từ Firebase
 * - Hiển thị modal đếm ngược
 * - Xác nhận đón khách
 * - Nhập điểm đến (nếu chưa có)
 * - Kết thúc chuyến
 * 
 * KHÔNG ảnh hưởng đến chuyến vẫy.
 */
;(function(window, document, undefined) {
    'use strict';

    // ==================== STATE ====================
    const state = {
        currentOrderId: null,
        currentOrderData: null,
        isModalOpening: false,
        countdownInterval: null,
        processedOrders: new Set(),
        isRunning: false,
        hasPickedUp: false,
        totalKm: 0,
        lastPosition: null,
        tripType: null
    };

    // ==================== DOM REFERENCES ====================
    const DOM = {
        get orderModal() { return document.getElementById('orderModal'); },
        get modalPhone() { return document.getElementById('modalPhone'); },
        get modalFrom() { return document.getElementById('modalFrom'); },
        get modalTo() { return document.getElementById('modalTo'); },
        get modalClientName() { return document.getElementById('modalClientName'); },
        get modalCarType() { return document.getElementById('modalCarType'); },
        get modalTimer() { return document.getElementById('tp-modal-timer-val'); },
        get tripPanel() { return document.getElementById('tripInfoPanel'); },
        get homeControls() { return document.getElementById('homeControls'); },
        get statsUI() { return document.getElementById('statsUI'); },
        get tripStatusText() { return document.getElementById('tripStatusText'); },
        get tripClientName() { return document.getElementById('tripClientName'); },
        get tripClientPhone() { return document.getElementById('tripClientPhone'); },
        get tripFrom() { return document.getElementById('tripFrom'); },
        get tripTo() { return document.getElementById('tripTo'); },
        get tripPrice() { return document.getElementById('tripPrice'); },
        get tripKmLive() { return document.getElementById('tripKmLive'); },
        get tripCarType() { return document.getElementById('tripCarType'); },
        get tripActionButtons() { return document.getElementById('tripActionButtons'); },
        get pickupBtn() { return document.getElementById('pickupBtn'); },
        get navBtn() { return document.getElementById('navToPickupBtn'); },
        get endTripBtn() { return document.getElementById('endTripBtn'); },
        get kmDisplay() { return document.getElementById('km'); },
        get costDisplay() { return document.getElementById('cost'); },
        get endSummary() { return document.getElementById('endSummary'); },
        get endModal() { return document.getElementById('endModal'); }
    };

    // ==================== MAIN FUNCTIONS ====================
    function showOrderModal(orderId, orderData) {
        if (state.isModalOpening || state.isRunning) return;
        if (state.processedOrders.has(orderId)) return;

        state.currentOrderId = orderId;
        state.currentOrderData = orderData;
        state.isModalOpening = true;
        state.processedOrders.add(orderId);

        if (DOM.modalPhone) DOM.modalPhone.innerText = orderData.phone || '...';
        if (DOM.modalFrom) DOM.modalFrom.innerText = orderData.pickup || '...';
        if (DOM.modalTo) DOM.modalTo.innerText = orderData.dropoff || 'Chưa xác định';
        if (DOM.modalClientName) DOM.modalClientName.innerText = orderData.clientName || 'Khách';
        if (DOM.modalCarType) {
            DOM.modalCarType.innerText = orderData.carType === '7_seats' ? '7 Chỗ' : '4 Chỗ';
        }

        let countdown = 15;
        if (DOM.modalTimer) DOM.modalTimer.innerText = countdown;
        if (DOM.orderModal) DOM.orderModal.style.display = 'flex';

        if (state.countdownInterval) clearInterval(state.countdownInterval);
        state.countdownInterval = setInterval(function() {
            countdown--;
            if (DOM.modalTimer) DOM.modalTimer.innerText = countdown;
            if (countdown <= 0) {
                declineOrder();
            }
        }, 1000);

        if (typeof window.speak === 'function') {
            window.speak('Có đơn đặt xe mới.');
        }
    }

    function acceptOrder() {
        clearInterval(state.countdownInterval);
        state.countdownInterval = null;

        if (!state.currentOrderId || !state.currentOrderData) {
            closeModal();
            state.isModalOpening = false;
            return;
        }

        const orderRef = window.db.ref(`datxe/${state.currentOrderId}`);
        orderRef.transaction(function(order) {
            if (!order || order.status !== 'waiting') return;
            return {
                ...order,
                status: 'driving',
                driverId: window.driverInfo ? window.driverInfo.uid : null,
                driverName: window.driverInfo ? window.driverInfo.name : null,
                driverPhone: window.driverInfo ? window.driverInfo.phone : null,
                driverPlate: window.driverInfo ? window.driverInfo.plate : null,
                acceptedAt: Date.now(),
                statusHistory: { ...(order.statusHistory || {}), driving: Date.now() }
            };
        }).then(function(result) {
            if (result && result.committed) {
                state.currentOrderData = result.snapshot.val() || state.currentOrderData;
                state.isRunning = true;
                state.hasPickedUp = false;
                state.totalKm = 0;
                state.lastPosition = null;

                const hasDest = Boolean(
                    state.currentOrderData.dropoffLat != null ||
                    (state.currentOrderData.dropoff && typeof state.currentOrderData.dropoff === 'string' && state.currentOrderData.dropoff.trim() !== '')
                );
                state.tripType = hasDest ? 'WITH_DESTINATION' : 'WITHOUT_DESTINATION';

                closeModal();
                state.isModalOpening = false;

                showTripUI(state.currentOrderData);
                if (typeof window.speak === 'function') {
                    window.speak('Đã nhận đơn.');
                }

                if (state.currentOrderData.pickupLat && state.currentOrderData.pickupLng) {
                    drawRouteToPickup(state.currentOrderData.pickupLat, state.currentOrderData.pickupLng);
                }

                startForegroundService();
                enableKeepAwake();
                syncToFirebase('driving');
            } else {
                closeModal();
                state.isModalOpening = false;
                if (typeof window.showToast === 'function') {
                    window.showToast('Đơn này đã được tài xế khác nhận hoặc đã hết hạn.');
                }
            }
        }).catch(function() {
            state.isModalOpening = false;
            closeModal();
            if (typeof window.showToast === 'function') {
                window.showToast('Không thể nhận chuyến. Vui lòng thử lại.');
            }
        });
    }

    function declineOrder() {
        clearInterval(state.countdownInterval);
        state.countdownInterval = null;
        closeModal();
        state.isModalOpening = false;
        if (typeof window.speak === 'function') {
            window.speak('Đã bỏ qua đơn.');
        }
    }

    function closeModal() {
        if (DOM.orderModal) DOM.orderModal.style.display = 'none';
    }

    // ==================== UI ====================
    function showTripUI(orderData) {
        if (DOM.homeControls) DOM.homeControls.style.display = 'none';
        if (DOM.tripPanel) DOM.tripPanel.style.display = 'block';
        if (DOM.statsUI) DOM.statsUI.classList.add('show');

        if (DOM.tripClientName) DOM.tripClientName.innerText = orderData.clientName || 'Khách';
        if (DOM.tripClientPhone) DOM.tripClientPhone.innerText = orderData.phone || '...';
        if (DOM.tripFrom) DOM.tripFrom.innerText = orderData.pickup || '...';
        if (DOM.tripTo) DOM.tripTo.innerText = orderData.dropoff || '...';
        if (DOM.tripCarType) {
            DOM.tripCarType.innerHTML = orderData.carType === '7_seats' ? '🚙 7 Chỗ' : '🚗 4 Chỗ';
        }
        if (DOM.tripStatusText) DOM.tripStatusText.innerHTML = '🚗 ĐANG ĐẾN ĐÓN KHÁCH';

        const estimatePrice = orderData.estimatePrice || 0;
        const estimateKm = orderData.estimateKm || 0;
        if (DOM.tripPrice) {
            DOM.tripPrice.innerHTML = estimatePrice > 0 ? estimatePrice.toLocaleString() + 'đ' : 'Tính theo KM';
        }
        if (DOM.tripKmLive) DOM.tripKmLive.innerText = '0.00 KM';

        if (DOM.tripActionButtons) DOM.tripActionButtons.style.display = 'flex';
        if (DOM.pickupBtn) {
            DOM.pickupBtn.textContent = '📍 ĐÃ ĐẾN ĐIỂM ĐÓN';
            DOM.pickupBtn.onclick = function() {
                arrivedAtPickup();
            };
        }
        if (DOM.navBtn) {
            DOM.navBtn.onclick = function() {
                navigateToPickup();
            };
        }
        if (DOM.endTripBtn) {
            DOM.endTripBtn.style.display = 'none';
        }

        const nav = document.querySelector('.nav-grid');
        if (nav) nav.style.display = 'none';
        const brand = document.querySelector('.brand-footer');
        if (brand) brand.style.display = 'none';
    }

    function arrivedAtPickup() {
        if (DOM.tripStatusText) DOM.tripStatusText.innerHTML = '📍 ĐÃ ĐẾN ĐIỂM ĐÓN';
        if (DOM.pickupBtn) {
            DOM.pickupBtn.textContent = '🚗 KHÁCH ĐÃ LÊN XE';
            DOM.pickupBtn.onclick = function() {
                passengerOnboard();
            };
        }
        if (DOM.navBtn) DOM.navBtn.style.display = 'none';
    }

    function passengerOnboard() {
        state.hasPickedUp = true;
        state.lastPosition = {
            lat: window.currentLat || 0,
            lng: window.currentLng || 0
        };
        state.totalKm = 0;

        if (DOM.tripStatusText) DOM.tripStatusText.innerHTML = '🚕 ĐÃ ĐÓN KHÁCH - ĐANG CHẠY';
        if (DOM.tripActionButtons) DOM.tripActionButtons.style.display = 'none';
        if (DOM.endTripBtn) {
            DOM.endTripBtn.style.display = 'block';
            DOM.endTripBtn.innerText = '🏁 KẾT THÚC CHUYẾN ĐI';
            DOM.endTripBtn.onclick = function() {
                showConfirmComplete();
            };
        }

        if (state.currentOrderData.dropoffLat && state.currentOrderData.dropoffLng) {
            drawRouteToDestination(state.currentOrderData.dropoffLat, state.currentOrderData.dropoffLng);
        } else if (state.currentOrderData.dropoff && typeof state.currentOrderData.dropoff === 'string') {
            geocodeAddress(state.currentOrderData.dropoff, function(lat, lng) {
                drawRouteToDestination(lat, lng);
            });
        }

        syncToFirebase('in_progress');

        if (typeof window.speak === 'function') {
            window.speak('Đã đón khách, bắt đầu hành trình.');
        }
    }

    function showConfirmComplete() {
        if (typeof window.showConfirmDialog === 'function') {
            window.showConfirmDialog('Bạn có chắc chắn muốn kết thúc chuyến đi?', function() {
                completeTrip();
            });
        } else {
            if (confirm('Bạn có chắc chắn muốn kết thúc chuyến đi?')) {
                completeTrip();
            }
        }
    }

    function completeTrip() {
        const MIN_FARE = 20000;
        const finalKm = state.totalKm;
        const rate = getFareRate();
        let finalCost = Math.round(finalKm * rate);
        if (finalCost < MIN_FARE) finalCost = MIN_FARE;

        if (typeof window.saveHistory === 'function') {
            window.saveHistory(finalKm, finalCost.toLocaleString('vi-VN'), finalCost, 'APP_BOOKING');
        }

        if (state.currentOrderId) {
            window.db.ref(`datxe/${state.currentOrderId}`).update({
                status: 'completed',
                completedAt: Date.now(),
                actualKm: finalKm,
                actualPrice: finalCost,
                statusHistory: { ...(state.currentOrderData.statusHistory || {}), completed: Date.now() }
            }).catch(function() {});
        }

        state.isRunning = false;
        state.hasPickedUp = false;
        state.totalKm = 0;
        state.currentOrderId = null;
        state.currentOrderData = null;
        state.lastPosition = null;

        resetUI(finalKm, finalCost);

        if (typeof window.stopForegroundService === 'function') window.stopForegroundService();
        if (typeof window.disableKeepAwake === 'function') window.disableKeepAwake();

        if (DOM.endSummary) {
            DOM.endSummary.innerHTML = `
                Quãng đường: <b>${finalKm.toFixed(2)} KM</b><br>
                Tổng: <b style="color:var(--primary);font-size:20px;">${finalCost.toLocaleString('vi-VN')}đ</b><br>
                <span style="font-size:11px;">📱 Chuyến app</span>
            `;
        }
        if (DOM.endModal) DOM.endModal.style.display = 'flex';

        if (typeof window.speak === 'function') {
            window.speak(`Chuyến đi kết thúc. Tổng tiền ${finalCost.toLocaleString('vi-VN')} đồng.`);
        }

        syncToFirebase('completed');
    }

    function resetUI(km, fare) {
        if (DOM.homeControls) DOM.homeControls.style.display = 'block';
        if (DOM.tripPanel) DOM.tripPanel.style.display = 'none';
        if (DOM.statsUI) DOM.statsUI.classList.remove('show');
        if (DOM.kmDisplay) DOM.kmDisplay.innerText = '0.00';
        if (DOM.costDisplay) DOM.costDisplay.innerText = '0';
        if (DOM.endTripBtn) DOM.endTripBtn.style.display = 'none';

        const nav = document.querySelector('.nav-grid');
        if (nav) nav.style.display = 'flex';
        const brand = document.querySelector('.brand-footer');
        if (brand) brand.style.display = 'block';

        const mainBtn = document.getElementById('mainBtn');
        if (mainBtn) {
            mainBtn.innerText = '🚖 BẮT ĐẦU CHUYẾN ĐI';
            mainBtn.style.background = 'var(--accent)';
        }
    }

    // ==================== GPS UPDATE ====================
    function onGPSUpdate(position) {
        if (!state.isRunning || !state.hasPickedUp) return;
        if (!position || position.lat == null || position.lng == null) return;

        const lat = Number(position.lat);
        const lng = Number(position.lng);
        const currentPos = { lat, lng };

        if (!state.lastPosition) {
            state.lastPosition = currentPos;
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
    }

    function updateDisplay(km, fare) {
        if (DOM.kmDisplay) DOM.kmDisplay.innerText = km.toFixed(2);
        if (DOM.costDisplay) DOM.costDisplay.innerText = fare.toLocaleString();
        if (DOM.tripKmLive) DOM.tripKmLive.innerText = km.toFixed(2) + ' KM';
        if (DOM.tripPrice) DOM.tripPrice.innerHTML = fare.toLocaleString() + 'đ';
    }

    // ==================== NAVIGATION ====================
    function drawRouteToPickup(fromLat, fromLng) {
        if (typeof window.drawRoute === 'function') {
            const currentLat = window.currentLat || 0;
            const currentLng = window.currentLng || 0;
            window.drawRoute(currentLat, currentLng, fromLat, fromLng);
        }
    }

    function drawRouteToDestination(toLat, toLng) {
        if (typeof window.drawRoute === 'function') {
            const currentLat = window.currentLat || 0;
            const currentLng = window.currentLng || 0;
            window.drawRoute(currentLat, currentLng, toLat, toLng);
        }
    }

    function navigateToPickup() {
        if (!state.currentOrderData) return;
        const pickupLat = state.currentOrderData.pickupLat;
        const pickupLng = state.currentOrderData.pickupLng;
        const pickup = state.currentOrderData.pickup;
        const currentLat = window.currentLat || 0;
        const currentLng = window.currentLng || 0;

        if (pickupLat && pickupLng) {
            window.open(
                `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${pickupLat},${pickupLng}&travelmode=driving`,
                '_blank'
            );
        } else if (pickup) {
            window.open(
                `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${encodeURIComponent(pickup)}&travelmode=driving`,
                '_blank'
            );
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

    function geocodeAddress(address, callback) {
        if (!address) return;
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data && data[0]) {
                    callback(parseFloat(data[0].lat), parseFloat(data[0].lon));
                }
            })
            .catch(function() {});
    }

    function syncToFirebase(status) {
        try {
            const uid = window.driverInfo ? window.driverInfo.uid : null;
            if (!uid) return;
            const db = window.db;
            if (!db) return;
            db.ref(`app_trip/${uid}`).set({
                orderId: state.currentOrderId,
                status: status,
                totalKm: state.totalKm,
                updatedAt: Date.now()
            }).catch(function() {});
        } catch(e) {}
    }

    function startForegroundService() {
        if (typeof window.startForegroundService === 'function') {
            window.startForegroundService();
        }
    }

    function enableKeepAwake() {
        if (typeof window.enableKeepAwake === 'function') {
            window.enableKeepAwake();
        }
    }

    // ==================== PUBLIC API ====================
    window.AppTripHandler = {
        showOrderModal: showOrderModal,
        acceptOrder: acceptOrder,
        declineOrder: declineOrder,
        onGPSUpdate: onGPSUpdate,
        isRunning: function() { return state.isRunning; },
        getTotalKm: function() { return state.totalKm; },
        getFare: function() { return Math.round(state.totalKm * getFareRate()); }
    };

    window.showOrderModal = showOrderModal;
    window.acceptOrder = acceptOrder;
    window.declineOrder = declineOrder;

    console.log('✅ AppTripHandler v1.0 loaded — independent app trip flow');

})(window, document);