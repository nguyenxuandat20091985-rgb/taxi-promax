// js/ui.js - Điều khiển giao diện và tương tác người dùng
class UIManager {
    constructor(taxiSystem, gpsTracker, paymentManager) {
        this.taxiSystem = taxiSystem;
        this.gpsTracker = gpsTracker;
        this.paymentManager = paymentManager;
        this.currentTab = 'home';
    }
    
    initEvents() {
        this.initTripEvents();
        this.initPackageEvents();
        this.initPaymentEvents();
        this.initNavigationEvents();
        this.initModalEvents();
        this.initUtilityEvents();
    }
    
    // ==================== TRIP HANDLING ====================
    initTripEvents() {
        // Cập nhật giá tiền thời gian thực khi kéo thanh trượt
        const rateSlider = document.getElementById('rateSlider');
        if (rateSlider) {
            rateSlider.addEventListener('input', (e) => {
                this.taxiSystem.updateRate(parseInt(e.target.value));
            });
        }
        
        // Nút bấm chính: Bắt đầu / Kết thúc
        const mainBtn = document.getElementById('mainBtn');
        if (mainBtn) {
            mainBtn.addEventListener('click', async () => {
                // Rung nhẹ khi bấm (nếu thiết bị hỗ trợ)
                if (navigator.vibrate) navigator.vibrate(50);
                await this.handleTripAction();
            });
        }
    }
    
    async handleTripAction() {
        const btn = document.getElementById('mainBtn');
        
        if (!this.taxiSystem.isRunning) {
            // Kiểm tra quyền hạn (Gói cước/Giới hạn chuyến)
            if (!this.taxiSystem.canStartTrip()) return;
            
            // TRẠNG THÁI: ĐANG CHẠY
            this.taxiSystem.isRunning = true;
            this.taxiSystem.totalKm = 0;
            
            // Cập nhật UI nút bấm
            btn.innerHTML = `<span>🛑 KẾT THÚC CHUYẾN</span>`;
            btn.classList.add('btn-running');
            
            // Hiển thị lời chúc và tự đóng sau 3s
            this.showModal('wishModal');
            setTimeout(() => this.closeModal('wishModal'), 3000);
            
            // Kích hoạt GPS
            const success = await this.gpsTracker.startTracking();
            if (!success) {
                this.resetTripUI();
            }
        } else {
            // TRẠNG THÁI: DỪNG
            this.taxiSystem.isRunning = false;
            this.resetTripUI();
            
            this.gpsTracker.stopTracking();
            
            const finalCost = Math.round(this.taxiSystem.totalKm * this.taxiSystem.currentRate);
            this.taxiSystem.saveTrip(this.taxiSystem.totalKm, finalCost);
            
            // Hiện tổng kết chuyến đi
            this.taxiSystem.showTripSummary(this.taxiSystem.totalKm, finalCost);
            this.showModal('endModal');
        }
    }

    resetTripUI() {
        const btn = document.getElementById('mainBtn');
        btn.innerHTML = `<span>🚕 BẮT ĐẦU CHUYẾN ĐI</span>`;
        btn.classList.remove('btn-running');
    }

    // ==================== NAVIGATION & TABS ====================
    initNavigationEvents() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.switchTab(tab, item);
            });
        });
    }

    switchTab(tabId, activeEl) {
        // Chuyển đổi class active ở menu dưới
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        activeEl.classList.add('active');

        // Chuyển đổi các màn hình nội dung
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`tab-${tabId}`);
        if (targetTab) targetTab.classList.add('active');

        // Load lại dữ liệu theo tab
        if (tabId === 'lichsu') this.taxiSystem.loadHistory();
        if (tabId === 'toi') this.taxiSystem.updateStatistics();
        
        // Ẩn/Hiện điều khiển trang chủ
        const homeControls = document.getElementById('homeControls');
        if (homeControls) {
            homeControls.style.display = (tabId === 'home') ? 'block' : 'none';
        }
    }

    // ==================== MODAL & NOTIFICATIONS ====================
    initModalEvents() {
        // Đóng các modal bằng phím X hoặc bấm ra ngoài vùng xám
        const modals = ['wishModal', 'endModal', 'zaloModal', 'successModal'];
        modals.forEach(id => {
            const m = document.getElementById(id);
            if (!m) return;
            
            // Nút đóng
            const closeBtn = m.querySelector('.close-modal');
            if (closeBtn) closeBtn.onclick = () => this.closeModal(id);
            
            // Bấm ra ngoài để đóng
            m.onclick = (e) => {
                if (e.target === m) this.closeModal(id);
            };
        });
    }

    showModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('fade-in');
        }
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    }

    // ==================== PAYMENT & PACKAGES ====================
    initPackageEvents() {
        document.querySelectorAll('.p-card').forEach(card => {
            card.onclick = () => {
                const { price, id, name } = card.dataset;
                this.taxiSystem.selectPackage(parseInt(price), id, name, card);
            };
        });
    }

    initPaymentEvents() {
        // Sao chép nội dung chuyển khoản
        const copyBtn = document.getElementById('copyPaymentBtn');
        if (copyBtn) {
            copyBtn.onclick = async () => {
                const content = document.getElementById('qrContent').textContent;
                await navigator.clipboard.writeText(content);
                this.showToast("Đã chép nội dung CK!");
            };
        }

        // Xác thực thanh toán
        const verifyBtn = document.getElementById('verifyPaymentBtn');
        if (verifyBtn) {
            verifyBtn.onclick = () => this.handlePaymentVerification();
        }
    }

    async handlePaymentVerification() {
        const code = document.getElementById('transactionCode').value;
        if (!code) return this.showToast("Vui lòng nhập mã GD!");

        this.showLoading("Đang kiểm tra giao dịch...");
        
        // Giả lập độ trễ kiểm tra
        setTimeout(async () => {
            const result = await this.paymentManager.verifyPayment(code);
            this.closeModal('successModal'); // Đóng loading
            
            if (result.success) {
                this.showSuccessModal("Kích hoạt thành công! Chúc bạn vạn dặm bình an.");
            } else {
                alert("Hệ thống chưa tìm thấy giao dịch. Vui lòng thử lại sau ít phút.");
            }
        }, 2000);
    }

    // ==================== UTILS ====================
    showToast(msg) {
        // Anh có thể dùng thư viện Toastify hoặc tạo một div thông báo nhỏ ở dưới
        alert(msg); 
    }

    showLoading(msg) {
        const msgEl = document.getElementById('successMessage');
        if (msgEl) msgEl.innerHTML = `<div class="spinner"></div><p>${msg}</p>`;
        this.showModal('successModal');
    }

    showSuccessModal(msg) {
        const msgEl = document.getElementById('successMessage');
        if (msgEl) msgEl.innerHTML = `<h3>🎉 CHÚC MỪNG</h3><p>${msg}</p>`;
        this.showModal('successModal');
    }
}
