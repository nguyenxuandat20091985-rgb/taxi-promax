// js/app.js - Bộ não điều khiển Taxi Pro Max
class TaxiProMaxApp {
    constructor() {
        this.taxiSystem = null;
        this.gpsTracker = null;
        this.paymentManager = null;
        this.uiManager = null;
        this.isInitialized = false;
    }
    
    async init() {
        try {
            console.log('🚕 Taxi Pro Max đang nổ máy...');
            
            // 1. Kiểm tra sự tồn tại của TaxiSystem (Bắt buộc)
            if (typeof TaxiSystem === 'undefined') {
                throw new Error("Không tìm thấy file TaxiSystem.js. Vui lòng kiểm tra lại đường dẫn.");
            }

            // 2. Khởi tạo hệ thống core
            this.taxiSystem = new TaxiSystem();
            await this.taxiSystem.init();
            
            // 3. Khởi tạo các module (Với kiểm tra an toàn)
            // Lưu ý: Đảm bảo các Class này đã được định nghĩa trong TaxiSystem.js hoặc Utils.js
            this.gpsTracker = (typeof GPSTracker !== 'undefined') ? new GPSTracker(this.taxiSystem) : null;
            this.paymentManager = (typeof PaymentManager !== 'undefined') ? new PaymentManager(this.taxiSystem) : null;
            this.uiManager = (typeof UIManager !== 'undefined') ? new UIManager(this.taxiSystem, this.gpsTracker, this.paymentManager) : null;
            
            if (!this.uiManager) {
                throw new Error("Không khởi tạo được giao diện (UIManager).");
            }

            // 4. Khởi chạy sự kiện
            this.uiManager.initEvents();
            this.initGlobalEvents();
            
            // 5. Hiện lời chào sau 1.5 giây
            setTimeout(() => {
                if(this.uiManager) this.uiManager.showModal('wishModal');
            }, 1500);
            
            this.isInitialized = true;
            console.log('✅ Hệ thống đã sẵn sàng phục vụ!');
            return this;
            
        } catch (error) {
            console.error('❌ Lỗi khởi động:', error);
            this.showCriticalError(error.message);
            throw error;
        }
    }
    
    initGlobalEvents() {
        // Phát hiện mạng Online/Offline
        window.addEventListener('online', () => {
            if(this.uiManager) this.uiManager.showSuccess("✅ Đã có mạng lại!");
        });
        
        window.addEventListener('offline', () => {
            alert("⚠️ Bạn đang ngoại tuyến. Một số tính năng bản đồ có thể bị chậm.");
        });
        
        // Cảnh báo khi lỡ tay thoát ứng dụng lúc đang chạy chuyến
        window.addEventListener('beforeunload', (e) => {
            if (this.taxiSystem && this.taxiSystem.isRunning) {
                e.preventDefault();
                e.returnValue = 'Chuyến đi đang diễn ra, bạn có chắc muốn thoát?';
            }
        });
        
        // Chống chuột phải trên bản đồ để chuyên nghiệp hơn
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#map')) e.preventDefault();
        });

        // Xử lý phím tắt
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }
    
    handleKeyboardShortcuts(e) {
        // Phím Space để Bắt đầu/Kết thúc nhanh
        if (e.key === ' ' && (!this.uiManager || this.uiManager.currentTab === 'home')) {
            const mainBtn = document.getElementById('mainBtn');
            if (mainBtn) {
                e.preventDefault();
                mainBtn.click();
            }
        }
        // Phím Esc để đóng các bảng thông báo
        if (e.key === 'Escape') this.closeAllModals();
    }
    
    closeAllModals() {
        const modals = ['wishModal', 'endModal', 'zaloModal', 'successModal'];
        modals.forEach(id => {
            const m = document.getElementById(id);
            if (m) m.style.display = 'none';
        });
    }
    
    showCriticalError(message) {
        const errorHTML = `
            <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:#ff5252;color:white;
                 display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;padding:20px;text-align:center;">
                <h1 style="font-size:50px">⚠️</h1>
                <h2>LỖI KHỞI ĐỘNG</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="padding:15px 30px; border-radius:10px; border:none; font-weight:bold; cursor:pointer">THỬ LẠI</button>
            </div>
        `;
        document.body.innerHTML = errorHTML;
    }
}

// Khởi tạo ứng dụng khi trang web nạp xong
let taxiApp;
document.addEventListener('DOMContentLoaded', async () => {
    taxiApp = new TaxiProMaxApp();
    await taxiApp.init();
    window.taxiApp = taxiApp; // Để anh có thể kiểm tra qua Console của trình duyệt
});

// Cổng kết nối điều khiển từ bên ngoài (API)
window.TaxiProMax = {
    start: () => document.getElementById('mainBtn')?.click(),
    goToTab: (name) => {
        const btn = document.querySelector(`.nav-item[data-tab="${name}"]`);
        if (btn) btn.click();
    }
};
