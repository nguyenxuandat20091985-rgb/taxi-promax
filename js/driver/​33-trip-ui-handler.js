/**
 * Taxi ProMax — Trip UI Handler v1.0
 * 
 * Xử lý tất cả các tương tác UI liên quan đến chuyến đi.
 * - Cập nhật panel thông tin chuyến
 * - Hiển thị/ẩn các nút điều khiển
 * - Cập nhật trạng thái hiển thị
 * - Hiển thị thông báo, toast
 * 
 * KHÔNG xử lý logic chuyến cụ thể.
 */
;(function(window, document, undefined) {
    'use strict';

    // ==================== DOM REFERENCES ====================
    const DOM = {
        get mainBtn() { return document.getElementById('mainBtn'); },
        get homeControls() { return document.getElementById('homeControls'); },
        get tripPanel() { return document.getElementById('tripInfoPanel'); },
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
        get navGrid() { return document.querySelector('.nav-grid'); },
        get brandFooter() { return document.querySelector('.brand-footer'); }
    };

    // ==================== STATE ====================
    const state = {
        isVisible: false,
        tripType: null // 'STREET_HAIL' | 'APP_TRIP'
    };

    // ==================== MAIN FUNCTIONS ====================

    /**
     * Hiển thị panel thông tin chuyến
     */
    function showTripPanel(tripType, data) {
        state.isVisible = true;
        state.tripType = tripType;

        // Ẩn home, hiện trip panel
        if (DOM.homeControls) DOM.homeControls.style.display = 'none';
        if (DOM.tripPanel) DOM.tripPanel.style.display = 'block';
        if (DOM.statsUI) DOM.statsUI.classList.add('show');

        // Ẩn tab navigation
        if (DOM.navGrid) DOM.navGrid.style.display = 'none';
        if (DOM.brandFooter) DOM.brandFooter.style.display = 'none';

        // Cập nhật thông tin
        if (data) {
            updateTripInfo(data);
        }

        // Cập nhật nút chính
        if (DOM.mainBtn) {
            DOM.mainBtn.innerText = '⏳ ĐANG CÓ CHUYẾN';
            DOM.mainBtn.style.background = '#f39c12';
        }
    }

    /**
     * Ẩn panel thông tin chuyến
     */
    function hideTripPanel() {
        state.isVisible = false;
        state.tripType = null;

        if (DOM.homeControls) DOM.homeControls.style.display = 'block';
        if (DOM.tripPanel) DOM.tripPanel.style.display = 'none';
        if (DOM.statsUI) DOM.statsUI.classList.remove('show');

        // Hiện lại tab navigation
        if (DOM.navGrid) DOM.navGrid.style.display = 'flex';
        if (DOM.brandFooter) DOM.brandFooter.style.display = 'block';

        // Reset nút chính
        if (DOM.mainBtn) {
            DOM.mainBtn.innerText = '🚖 BẮT ĐẦU CHUYẾN ĐI';
            DOM.mainBtn.style.background = 'var(--accent)';
        }

        // Reset display
        if (DOM.kmDisplay) DOM.kmDisplay.innerText = '0.00';
        if (DOM.costDisplay) DOM.costDisplay.innerText = '0';
    }

    /**
     * Cập nhật thông tin chuyến
     */
    function updateTripInfo(data) {
        if (!data) return;

        if (DOM.tripClientName) {
            DOM.tripClientName.innerText = data.clientName || 'Khách';
        }
        if (DOM.tripClientPhone) {
            DOM.tripClientPhone.innerText = data.phone || '...';
        }
        if (DOM.tripFrom) {
            DOM.tripFrom.innerText = data.pickup || '...';
        }
        if (DOM.tripTo) {
            DOM.tripTo.innerText = data.dropoff || 'Chưa xác định';
        }
        if (DOM.tripCarType) {
            const carClass = data.carType || '4_seats';
            DOM.tripCarType.innerHTML = carClass === '7_seats' ? '🚙 7 Chỗ' : '🚗 4 Chỗ';
        }
        if (DOM.tripPrice) {
            const price = data.estimatePrice || 0;
            DOM.tripPrice.innerHTML = price > 0 ? price.toLocaleString() + 'đ' : 'Tính theo KM';
        }
        if (DOM.tripKmLive) {
            DOM.tripKmLive.innerText = '0.00 KM';
        }
    }

    /**
     * Cập nhật trạng thái chuyến (text hiển thị)
     */
    function updateTripStatus(statusText) {
        if (DOM.tripStatusText) {
            DOM.tripStatusText.innerHTML = statusText || '🚗 ĐANG CHẠY CHUYẾN';
        }
    }

    /**
     * Cập nhật số KM và cước hiển thị
     */
    function updateFareDisplay(km, fare) {
        if (DOM.kmDisplay) DOM.kmDisplay.innerText = km.toFixed(2);
        if (DOM.costDisplay) DOM.costDisplay.innerText = fare.toLocaleString();
        if (DOM.tripKmLive) DOM.tripKmLive.innerText = km.toFixed(2) + ' KM';
        if (DOM.tripPrice) DOM.tripPrice.innerHTML = fare.toLocaleString() + 'đ';
    }

    /**
     * Hiển thị nút hành động (đón khách, chỉ đường, kết thúc)
     */
    function showActionButtons(config) {
        if (!DOM.tripActionButtons) return;

        // Hiển thị panel
        DOM.tripActionButtons.style.display = 'flex';

        // Cập nhật nút pickup
        if (DOM.pickupBtn) {
            DOM.pickupBtn.textContent = config.pickupText || '✅ ĐÃ ĐÓN KHÁCH';
            DOM.pickupBtn.onclick = config.pickupCallback || null;
            DOM.pickupBtn.style.display = config.showPickup !== false ? 'block' : 'none';
        }

        // Cập nhật nút navigation
        if (DOM.navBtn) {
            DOM.navBtn.textContent = config.navText || '🧭 CHỈ ĐƯỜNG ĐÓN';
            DOM.navBtn.onclick = config.navCallback || null;
            DOM.navBtn.style.display = config.showNav !== false ? 'block' : 'none';
        }

        // Cập nhật nút kết thúc
        if (DOM.endTripBtn) {
            DOM.endTripBtn.textContent = config.endText || '🏁 KẾT THÚC CHUYẾN ĐI';
            DOM.endTripBtn.onclick = config.endCallback || null;
            DOM.endTripBtn.style.display = config.showEnd ? 'block' : 'none';
        }
    }

    /**
     * Ẩn tất cả nút hành động
     */
    function hideActionButtons() {
        if (DOM.tripActionButtons) DOM.tripActionButtons.style.display = 'none';
        if (DOM.endTripBtn) DOM.endTripBtn.style.display = 'none';
    }

    /**
     * Hiển thị nút kết thúc chuyến
     */
    function showEndButton(callback) {
        if (DOM.endTripBtn) {
            DOM.endTripBtn.style.display = 'block';
            DOM.endTripBtn.innerText = '🏁 KẾT THÚC CHUYẾN ĐI';
            DOM.endTripBtn.onclick = callback || null;
        }
    }

    /**
     * Ẩn nút kết thúc chuyến
     */
    function hideEndButton() {
        if (DOM.endTripBtn) {
            DOM.endTripBtn.style.display = 'none';
            DOM.endTripBtn.onclick = null;
        }
    }

    /**
     * Hiển thị modal kết thúc chuyến
     */
    function showEndModal(km, fare, tripType) {
        const summary = document.getElementById('endSummary');
        if (summary) {
            const typeLabel = tripType === 'STREET_HAIL' ? '🚕 Chuyến vẫy' : '📱 Chuyến app';
            summary.innerHTML = `
                Quãng đường: <b>${km.toFixed(2)} KM</b><br>
                Tổng: <b style="color:var(--primary);font-size:20px;">${fare.toLocaleString('vi-VN')}đ</b><br>
                <span style="font-size:11px;">${typeLabel}</span>
            `;
        }
        const modal = document.getElementById('endModal');
        if (modal) modal.style.display = 'flex';
    }

    /**
     * Ẩn modal kết thúc
     */
    function hideEndModal() {
        const modal = document.getElementById('endModal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Hiển thị modal chúc (bắt đầu chuyến)
     */
    function showWishModal() {
        const modal = document.getElementById('wishModal');
        if (modal) modal.style.display = 'flex';
    }

    /**
     * Ẩn modal chúc
     */
    function hideWishModal() {
        const modal = document.getElementById('wishModal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Hiển thị toast thông báo
     */
    function showToast(message) {
        if (typeof window.showToast === 'function') {
            window.showToast(message);
            return;
        }
        // Fallback
        const toast = document.getElementById('txToast');
        if (toast) {
            toast.innerText = message;
            toast.classList.add('show');
            setTimeout(function() {
                toast.classList.remove('show');
            }, 3000);
        }
    }

    /**
     * Hiển thị modal xác nhận
     */
    function showConfirmDialog(message, onConfirm, onCancel) {
        if (typeof window.showConfirmDialog === 'function') {
            window.showConfirmDialog(message, onConfirm);
            return;
        }
        // Fallback
        if (confirm(message)) {
            if (typeof onConfirm === 'function') onConfirm();
        } else {
            if (typeof onCancel === 'function') onCancel();
        }
    }

    // ==================== PUBLIC API ====================

    window.TripUIHandler = {
        showTripPanel: showTripPanel,
        hideTripPanel: hideTripPanel,
        updateTripInfo: updateTripInfo,
        updateTripStatus: updateTripStatus,
        updateFareDisplay: updateFareDisplay,
        showActionButtons: showActionButtons,
        hideActionButtons: hideActionButtons,
        showEndButton: showEndButton,
        hideEndButton: hideEndButton,
        showEndModal: showEndModal,
        hideEndModal: hideEndModal,
        showWishModal: showWishModal,
        hideWishModal: hideWishModal,
        showToast: showToast,
        showConfirmDialog: showConfirmDialog,
        isVisible: function() { return state.isVisible; },
        getTripType: function() { return state.tripType; }
    };

    console.log('✅ TripUIHandler v1.0 loaded — central UI management');

})(window, document);