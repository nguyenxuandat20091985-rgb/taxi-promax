// js/ui.js - Module UI & Event Handlers
class UIManager {
    constructor(taxiSystem, gpsTracker, paymentManager) {
        this.taxiSystem = taxiSystem;
        this.gpsTracker = gpsTracker;
        this.paymentManager = paymentManager;
        this.currentTab = 'home';
    }
    
    // ==================== INITIALIZE EVENTS ====================
    initEvents() {
        this.initTripEvents();
        this.initPackageEvents();
        this.initPaymentEvents();
        this.initNavigationEvents();
        this.initModalEvents();
        this.initUtilityEvents();
    }
    
    initTripEvents() {
        // Rate slider
        document.getElementById('rateSlider').addEventListener('input', (e) => {
            this.taxiSystem.updateRate(parseInt(e.target.value));
        });
        
        // Main trip button
        document.getElementById('mainBtn').addEventListener('click', async () => {
            await this.handleTripAction();
        });
    }
    
    initPackageEvents() {
        // Package selection
        document.querySelectorAll('.p-card').forEach(card => {
            card.addEventListener('click', () => {
                const price = parseInt(card.dataset.price);
                const id = card.dataset.id;
                const name = card.dataset.name;
                this.taxiSystem.selectPackage(price, id, name, card);
            });
        });
    }
    
    initPaymentEvents() {
        // Copy payment info
        document.getElementById('copyPaymentBtn').addEventListener('click', async () => {
            const success = await this.paymentManager.copyPaymentInfo();
            if (success) {
                this.showSuccess("✅ Đã sao chép thông tin chuyển khoản!");
            }
        });
        
        // Zalo request
        document.getElementById('zaloRequestBtn').addEventListener('click', () => {
            this.openZaloRequest();
        });
        
        // Zalo support
        document.getElementById('zaloSupportBtn').addEventListener('click', async () => {
            const success = await this.paymentManager.copySupportMessage();
            if (success) {
                this.showSuccess("✅ Đã sao chép tin nhắn hỗ trợ! Dán vào Zalo để liên hệ admin.");
            }
        });
        
        // Copy Zalo message
        document.getElementById('copyZaloMessageBtn').addEventListener('click', async () => {
            const success = await this.paymentManager.copyZaloMessage();
            if (success) {
                this.showSuccess("✅ Đã sao chép tin nhắn! Dán vào Zalo để gửi cho admin.");
            }
        });
        
        // Verify payment
        document.getElementById('verifyPaymentBtn').addEventListener('click', async () => {
            await this.handlePaymentVerification();
        });
    }
    
    initNavigationEvents() {
        // Tab navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.showTab(tab, item);
            });
        });
        
        // Clear history
        document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            this.handleClearHistory();
        });
        
        // Export data
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.handleExportData();
        });
    }
    
    initModalEvents() {
        // Modal close buttons
        document.getElementById('closeWishModal').addEventListener('click', () => {
            this.closeModal('wishModal');
        });
        
        document.getElementById('closeEndModal').addEventListener('click', () => {
            this.closeModal('endModal');
        });
        
        document.getElementById('closeZaloModal').addEventListener('click', () => {
            this.closeModal('zaloModal');
        });
        
        document.getElementById('closeSuccessModal').addEventListener('click', () => {
            this.closeModal('successModal');
        });
    }
    
    initUtilityEvents() {
        // Input validation for transaction code
        document.getElementById('transactionCode').addEventListener('input', (e) => {
            this.validateTransactionCode(e.target.value);
        });
    }
    
    // ==================== TRIP HANDLING ====================
    async handleTripAction() {
        const btn = document.getElementById('mainBtn');
        
        if (!this.taxiSystem.isRunning) {
            // Kiểm tra giới hạn chuyến
            if (!this.taxiSystem.canStartTrip()) {
                return;
            }
            
            // Bắt đầu chuyến đi
            this.taxiSystem.isRunning = true;
            this.taxiSystem.totalKm = 0;
            this.taxiSystem.lastPos = null;
            
            btn.textContent = "🛑 KẾT THÚC CHUYẾN ĐI";
            btn.style.background = "linear-gradient(135deg, var(--danger) 0%, #ff4081 100%)";
            
            // Hiển thị modal chúc mừng
            this.showModal('wishModal');
            
            // Khởi động GPS tracking
            const trackingStarted = await this.gpsTracker.startTracking();
            
            if (!trackingStarted) {
                // Nếu GPS không khởi động được, reset trạng thái
                this.taxiSystem.isRunning = false;
                btn.textContent = "🚕 BẮT ĐẦU CHUYẾN ĐI";
                btn.style.background = "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)";
                return;
            }
            
            // Tăng số chuyến trong ngày
            this.taxiSystem.dailyTrips++;
            this.taxiSystem.saveDailyTrips();
            
        } else {
            // Kết thúc chuyến đi
            this.taxiSystem.isRunning = false;
            
            btn.textContent = "🚕 BẮT ĐẦU CHUYẾN ĐI";
            btn.style.background = "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)";
            
            // Dừng tracking
            this.gpsTracker.stopTracking();
            
            // Tính toán và lưu chuyến đi
            const finalCost = Math.round(this.taxiSystem.totalKm * this.taxiSystem.currentRate);
            this.taxiSystem.saveTrip(this.taxiSystem.totalKm, finalCost);
            
            // Hiển thị tổng kết
            this.taxiSystem.showTripSummary(this.taxiSystem.totalKm, finalCost);
            this.showModal('endModal');
        }
    }
    
    // ==================== PAYMENT HANDLING ====================
    async handlePaymentVerification() {
        const transCode = document.getElementById('transactionCode').value.trim();
        
        if (!transCode) {
            this.taxiSystem.showError("Vui lòng nhập mã giao dịch từ ngân hàng!");
            return;
        }
        
        if (!this.taxiSystem.selectedPackage) {
            this.taxiSystem.showError("Vui lòng chọn gói cước trước!");
            return;
        }
        
        // Hiển thị loading
        this.showLoading("Đang xác thực giao dịch...");
        
        try {
            const result = await this.paymentManager.verifyPayment(transCode);
            
            if (result.success) {
                this.showSuccess(`
                    🎉 KÍCH HOẠT THÀNH CÔNG!
                    
                    Gói <b>${result.package.name}</b> đã được kích hoạt.
                    
                    📅 Hạn sử dụng đến: ${this.taxiSystem.formatDate(result.package.expiry)}
                    
                    Cảm ơn bạn đã sử dụng dịch vụ!
                `);
            } else {
                this.showError(`
                    ❌ CHƯA NHẬN ĐƯỢC THANH TOÁN
                    
                    ${result.message}
                    
                    Vui lòng:
                    1. Kiểm tra lại số tài khoản và nội dung chuyển khoản
                    2. Đợi 3-5 phút để ngân hàng xử lý
                    3. Liên hệ Zalo nếu đã chuyển khoản trên 10 phút
                `);
            }
        } catch (error) {
            this.taxiSystem.showError("Lỗi xác thực thanh toán: " + error.message);
        }
    }
    
    validateTransactionCode(code) {
        // Basic validation for transaction code
        const isValid = /^[A-Z0-9]{8,20}$/.test(code);
        
        const input = document.getElementById('transactionCode');
        if (code && !isValid) {
            input.style.borderColor = 'var(--danger)';
        } else {
            input.style.borderColor = isValid ? 'var(--success)' : '#e0e0e0';
        }
        
        return isValid;
    }
    
    // ==================== UI CONTROLS ====================
    showTab(tab, element) {
        try {
            // Ẩn tất cả tab
            document.querySelectorAll('.tab-content').forEach(t => {
                t.style.display = 'none';
            });
            
            // Xóa active class từ tất cả nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Thêm active class cho nav item được chọn
            if (element) {
                element.classList.add('active');
            }
            
            // Hiển thị tab được chọn
            if (tab === 'home') {
                document.getElementById('homeControls').style.display = 'block';
            } else {
                document.getElementById('homeControls').style.display = 'none';
                const tabElement = document.getElementById('tab-' + tab);
                if (tabElement) {
                    tabElement.style.display = 'flex';
                    
                    // Tải lại dữ liệu nếu cần
                    if (tab === 'lichsu') {
                        this.taxiSystem.loadHistory();
                    }
                    if (tab === 'toi') {
                        this.taxiSystem.updateStatistics();
                    }
                }
            }
            
            this.currentTab = tab;
            
        } catch (error) {
            console.error('Show tab error:', error);
        }
    }
    
    openZaloRequest() {
        try {
            if (!this.taxiSystem.selectedPackage) {
                this.taxiSystem.showError("Vui lòng chọn gói cước trước!");
                return;
            }
            
            // Chuẩn bị thông tin Zalo
            this.paymentManager.prepareZaloMessage();
            
            // Hiển thị modal
            this.showModal('zaloModal');
            
        } catch (error) {
            console.error('Open Zalo request error:', error);
            this.taxiSystem.showError("Lỗi mở form Zalo: " + error.message);
        }
    }
    
    // ==================== HISTORY & DATA ====================
    handleClearHistory() {
        if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử chuyến đi?\nThao tác này không thể hoàn tác.")) {
            return;
        }
        
        const success = this.taxiSystem.clearHistory();
        if (success) {
            this.showSuccess("✅ Đã xóa toàn bộ lịch sử chuyến đi!");
        } else {
            this.taxiSystem.showError("Lỗi xóa lịch sử!");
        }
    }
    
    handleExportData() {
        try {
            const exportData = this.taxiSystem.exportData();
            
            const downloadLink = document.createElement('a');
            downloadLink.href = URL.createObjectURL(exportData.blob);
            downloadLink.download = exportData.filename;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            this.showSuccess("✅ Đã xuất dữ liệu thành công!");
            
        } catch (error) {
            console.error('Export data error:', error);
            this.taxiSystem.showError("Lỗi xuất dữ liệu: " + error.message);
        }
    }
    
    // ==================== MODAL CONTROLS ====================
    showModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'flex';
            }
        } catch (error) {
            console.error('Show modal error:', error);
        }
    }
    
    closeModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        } catch (error) {
            console.error('Close modal error:', error);
        }
    }
    
    showLoading(message) {
        try {
            const successMessage = document.getElementById('successMessage');
            successMessage.innerHTML = `
                <div class="spinner"></div>
                <p>${message}</p>
            `;
            this.showModal('successModal');
        } catch (error) {
            console.error('Show loading error:', error);
        }
    }
    
    showSuccess(message) {
        try {
            const successMessage = document.getElementById('successMessage');
            successMessage.innerHTML = message;
            this.showModal('successModal');
        } catch (error) {
            console.error('Show success error:', error);
        }
    }
}