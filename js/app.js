// js/app.js - Module chính khởi tạo ứng dụng
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
            console.log('🚕 Taxi Pro Max đang khởi động...');
            
            // 1. Khởi tạo hệ thống core
            this.taxiSystem = new TaxiSystem();
            await this.taxiSystem.init();
            
            // 2. Khởi tạo các module
            this.gpsTracker = new GPSTracker(this.taxiSystem);
            this.paymentManager = new PaymentManager(this.taxiSystem);
            this.uiManager = new UIManager(this.taxiSystem, this.gpsTracker, this.paymentManager);
            
            // 3. Khởi tạo events
            this.uiManager.initEvents();
            
            // 4. Khởi tạo event listeners toàn cục
            this.initGlobalEvents();
            
            // 5. Hiển thị welcome modal
            setTimeout(() => {
                this.uiManager.showModal('wishModal');
            }, 1000);
            
            this.isInitialized = true;
            console.log('✅ Taxi Pro Max đã sẵn sàng!');
            
            return this;
            
        } catch (error) {
            console.error('❌ Lỗi khởi động ứng dụng:', error);
            this.showCriticalError('Lỗi khởi động ứng dụng: ' + error.message);
            throw error;
        }
    }
    
    initGlobalEvents() {
        // Online/Offline detection
        window.addEventListener('online', () => {
            this.uiManager.showSuccess("✅ Đã kết nối lại Internet!");
        });
        
        window.addEventListener('offline', () => {
            this.taxiSystem.showError("⚠️ Mất kết nối mạng. Ứng dụng vẫn hoạt động ở chế độ offline.");
        });
        
        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.taxiSystem.isRunning) {
                e.preventDefault();
                e.returnValue = 'Bạn có chuyến đi đang chạy. Bạn có chắc muốn thoát?';
                return e.returnValue;
            }
        });
        
        // Fullscreen support
        document.addEventListener('fullscreenchange', () => {
            if (this.taxiSystem.map) {
                this.taxiSystem.map.invalidateSize();
            }
        });
        
        // Service worker registration (PWA)
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
            });
        }
        
        // Prevent context menu on some elements
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#map')) {
                e.preventDefault();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }
    
    handleKeyboardShortcuts(e) {
        // Prevent F12 for dev tools (basic protection)
        if (e.keyCode === 123) { // F12
            e.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+I for dev tools
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+U for view source
        if (e.ctrlKey && e.keyCode === 85) {
            e.preventDefault();
            return false;
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            this.closeAllModals();
        }
        
        // Space to start/stop trip when on home tab
        if (e.key === ' ' && this.uiManager.currentTab === 'home') {
            e.preventDefault();
            document.getElementById('mainBtn').click();
        }
    }
    
    closeAllModals() {
        const modals = ['wishModal', 'endModal', 'zaloModal', 'successModal'];
        modals.forEach(modalId => {
            this.uiManager.closeModal(modalId);
        });
    }
    
    showCriticalError(message) {
        // Hiển thị lỗi nghiêm trọng
        const errorHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: var(--danger); color: white; display: flex; 
                flex-direction: column; align-items: center; justify-content: center; 
                z-index: 100000; padding: 20px; text-align: center;">
                <div style="font-size: 48px;">❌</div>
                <h1 style="margin: 20px 0 10px 0;">LỖI NGHIÊM TRỌNG</h1>
                <p style="margin-bottom: 20px;">${message}</p>
                <button onclick="location.reload()" 
                    style="background: white; color: var(--danger); border: none; 
                    padding: 12px 24px; border-radius: 10px; font-weight: 900; 
                    cursor: pointer;">
                    🔄 TẢI LẠI ỨNG DỤNG
                </button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorHTML);
    }
    
    // Public API methods
    getSystem() {
        return this.taxiSystem;
    }
    
    getGPS() {
        return this.gpsTracker;
    }
    
    getPayment() {
        return this.paymentManager;
    }
    
    getUI() {
        return this.uiManager;
    }
    
    isReady() {
        return this.isInitialized;
    }
}

// ==================== GLOBAL INITIALIZATION ====================
let taxiApp;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        taxiApp = new TaxiProMaxApp();
        await taxiApp.init();
        
        // Expose to global scope for debugging (optional)
        window.taxiApp = taxiApp;
        
    } catch (error) {
        console.error('Fatal initialization error:', error);
        alert('Không thể khởi động ứng dụng. Vui lòng tải lại trang.');
    }
});

// ==================== PUBLIC GLOBAL FUNCTIONS ====================
// Các hàm này có thể được gọi từ console hoặc external scripts
window.TaxiProMax = {
    getApp: () => taxiApp,
    startTrip: () => document.getElementById('mainBtn').click(),
    stopTrip: () => {
        if (taxiApp && taxiApp.getSystem().isRunning) {
            document.getElementById('mainBtn').click();
        }
    },
    selectPackage: (packageId) => {
        const card = document.querySelector(`.p-card[data-id="${packageId}"]`);
        if (card) card.click();
    },
    showTab: (tabName) => {
        const tabBtn = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
        if (tabBtn) tabBtn.click();
    },
    exportData: () => document.getElementById('exportDataBtn').click(),
    clearHistory: () => document.getElementById('clearHistoryBtn').click()
};
