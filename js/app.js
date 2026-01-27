// app.js - SIMPLE & WORKING
const App = {
    // App state
    isRunning: false,
    startTime: null,
    timerInterval: null,
    distance: 0,
    
    // Initialize app
    init: function() {
        console.log('Taxi Promax - Simple Version');
        
        // Setup ALL event listeners
        this.setupEventListeners();
        
        // Update device info
        this.updateDeviceInfo();
        
        // Show initial page
        this.showPage('dashboard');
        
        alert('Ứng dụng đã khởi động! Các nút đã sẵn sàng.');
    },
    
    // Setup ALL event listeners
    setupEventListeners: function() {
        console.log('Setting up event listeners...');
        
        // ===== NAVIGATION BUTTONS =====
        document.getElementById('nav-dashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('dashboard');
            alert('Chuyển đến Dashboard');
        });
        
        document.getElementById('nav-booking').addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('booking');
            alert('Chuyển đến Đặt xe');
        });
        
        document.getElementById('nav-history').addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('history');
            alert('Chuyển đến Lịch sử');
        });
        
        document.getElementById('nav-package').addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('package');
            alert('Chuyển đến Gói dịch vụ');
        });
        
        document.getElementById('nav-payment').addEventListener('click', (e) => {
            e.preventDefault();
            this.showPage('payment');
            alert('Chuyển đến Thanh toán');
        });
        
        document.getElementById('nav-admin').addEventListener('click', (e) => {
            e.preventDefault();
            alert('Chuyển đến Admin');
            window.location.href = 'admin.html';
        });
        
        // ===== TRIP CONTROL BUTTONS =====
        document.getElementById('btn-start').addEventListener('click', () => {
            this.startTrip();
        });
        
        document.getElementById('btn-stop').addEventListener('click', () => {
            this.stopTrip();
        });
        
        document.getElementById('btn-location').addEventListener('click', () => {
            this.getCurrentLocation();
        });
        
        // ===== SETTINGS BUTTON =====
        document.getElementById('btn-save-settings').addEventListener('click', () => {
            this.saveSettings();
        });
        
        // ===== DEVICE BUTTON =====
        document.getElementById('btn-copy-id').addEventListener('click', () => {
            this.copyDeviceId();
        });
        
        console.log('All event listeners setup complete');
    },
    
    // Show page function
    showPage: function(pageName) {
        console.log('Showing page:', pageName);
        
        // Hide all pages
        const pages = ['dashboard', 'booking', 'history', 'package', 'payment'];
        pages.forEach(page => {
            const element = document.getElementById(page + '-page');
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // Show selected page
        const pageElement = document.getElementById(pageName + '-page');
        if (pageElement) {
            pageElement.style.display = 'block';
        }
        
        // Update page title
        const titles = {
            'dashboard': 'Dashboard',
            'booking': 'Đặt xe',
            'history': 'Lịch sử',
            'package': 'Gói dịch vụ',
            'payment': 'Thanh toán'
        };
        
        const titleElement = document.getElementById('page-title');
        if (titleElement) {
            titleElement.textContent = titles[pageName] || 'Dashboard';
        }
        
        // Update active nav
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const navElement = document.getElementById('nav-' + pageName);
        if (navElement) {
            navElement.classList.add('active');
        }
    },
    
    // Start trip
    startTrip: function() {
        if (this.isRunning) {
            alert('Chuyến xe đang chạy!');
            return;
        }
        
        this.isRunning = true;
        this.startTime = new Date();
        this.distance = 0;
        
        // Update UI
        document.getElementById('btn-start').disabled = true;
        document.getElementById('btn-stop').disabled = false;
        document.getElementById('status-value').textContent = 'ĐANG CHẠY';
        
        // Start timer
        this.timerInterval = setInterval(() => {
            this.updateTrip();
        }, 1000);
        
        alert('🚕 Bắt đầu chuyến xe thành công!');
    },
    
    // Stop trip
    stopTrip: function() {
        if (!this.isRunning) {
            alert('Không có chuyến xe nào đang chạy!');
            return;
        }
        
        this.isRunning = false;
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Update UI
        document.getElementById('btn-start').disabled = false;
        document.getElementById('btn-stop').disabled = true;
        document.getElementById('status-value').textContent = 'HOÀN THÀNH';
        
        // Calculate fare
        const duration = Math.floor((new Date() - this.startTime) / 1000);
        const fare = this.calculateFare(this.distance, duration);
        
        // Show summary
        alert(`✅ Chuyến xe hoàn thành!\n📏 Quãng đường: ${this.distance.toFixed(2)} km\n⏱ Thời gian: ${this.formatTime(duration)}\n💰 Tổng tiền: ${this.formatCurrency(fare)}`);
    },
    
    // Update trip
    updateTrip: function() {
        if (!this.isRunning) return;
        
        // Simulate distance increase
        this.distance += 0.01; // 0.01 km per second = 36 km/h
        
        // Update display
        document.getElementById('distance-value').textContent = this.distance.toFixed(2) + ' km';
        
        // Update time
        const duration = Math.floor((new Date() - this.startTime) / 1000);
        document.getElementById('time-value').textContent = this.formatTime(duration);
        
        // Update fare
        const fare = this.calculateFare(this.distance, duration);
        document.getElementById('price-value').textContent = this.formatCurrency(fare);
    },
    
    // Get current location
    getCurrentLocation: function() {
        if (navigator.geolocation) {
            alert('Đang lấy vị trí...');
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    document.getElementById('coordinates').textContent = 
                        lat.toFixed(6) + ', ' + lng.toFixed(6);
                    
                    document.getElementById('current-location').textContent = 
                        'Vị trí: ' + lat.toFixed(4) + ', ' + lng.toFixed(4);
                    
                    alert('✅ Đã lấy vị trí thành công!');
                },
                (error) => {
                    alert('❌ Lỗi lấy vị trí: ' + error.message);
                }
            );
        } else {
            alert('❌ Trình duyệt không hỗ trợ GPS');
        }
    },
    
    // Save settings
    saveSettings: function() {
        const pricePerKm = document.getElementById('price-per-km').value;
        const pricePerMinute = document.getElementById('price-per-minute').value;
        const baseFee = document.getElementById('base-fee').value;
        
        alert(`✅ Đã lưu cài đặt:\n💰 Giá/km: ${pricePerKm} ₫\n⏱ Giá/phút: ${pricePerMinute} ₫\n🚪 Phí mở cửa: ${baseFee} ₫`);
    },
    
    // Update device info
    updateDeviceInfo: function() {
        const deviceId = 'DEV-' + Date.now().toString().slice(-6);
        document.getElementById('device-id').textContent = deviceId;
        document.getElementById('device-id-text').textContent = deviceId;
        document.getElementById('license-key-text').textContent = 'Chưa kích hoạt';
    },
    
    // Copy device ID
    copyDeviceId: function() {
        const deviceId = document.getElementById('device-id').textContent;
        navigator.clipboard.writeText(deviceId).then(() => {
            alert('✅ Đã copy Device ID: ' + deviceId);
        });
    },
    
    // Calculate fare
    calculateFare: function(distanceKm, durationSeconds) {
        const pricePerKm = parseInt(document.getElementById('price-per-km').value) || 12000;
        const pricePerMinute = parseInt(document.getElementById('price-per-minute').value) || 500;
        const baseFee = parseInt(document.getElementById('base-fee').value) || 10000;
        
        const durationMinutes = durationSeconds / 60;
        let fare = baseFee;
        fare += distanceKm * pricePerKm;
        fare += durationMinutes * pricePerMinute;
        
        return Math.round(fare / 1000) * 1000;
    },
    
    // Format time
    formatTime: function(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return hours.toString().padStart(2, '0') + ':' + 
               minutes.toString().padStart(2, '0') + ':' + 
               secs.toString().padStart(2, '0');
    },
    
    // Format currency
    formatCurrency: function(amount) {
        return amount.toLocaleString('vi-VN') + ' ₫';
    }
};

// Start app when page loads
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});