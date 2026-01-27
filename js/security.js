// File: js/security.js
class TaxiSecuritySystem {
    constructor() {
        this.deviceId = null;
        this.userPackage = 'FREE';
        this.tripCount = 0;
        this.maxFreeTrips = 10;
        this.isInitialized = false;
        
        // Khóa AES (trong thực tế nên lưu ở server)
        this.encryptionKey = 'TAXI-PROMAX-SECURE-KEY-2026';
        this.iv = 'TAXI-PROMAX-IV-2026';
        
        this.init();
    }
    
    async init() {
        console.log('🚖 Hệ thống bảo mật Taxi ProMax đang khởi động...');
        
        // Kích hoạt các lớp bảo vệ
        this.enableF12Protection();
        this.enableRightClickProtection();
        this.enableDevToolsProtection();
        
        // Tạo Device ID
        await this.generateDeviceId();
        
        // Kiểm tra license
        await this.validateLicense();
        
        // Kiểm tra gói dịch vụ
        await this.checkPackage();
        
        // Khởi tạo hệ thống đếm chuyến
        this.initTripCounter();
        
        this.isInitialized = true;
        console.log('✅ Hệ thống bảo mật đã sẵn sàng!');
        console.log(`📦 Gói hiện tại: ${this.userPackage}`);
        console.log(`🆔 Device ID: ${this.deviceId}`);
        
        // Cập nhật UI
        this.updateUI();
    }
    
    // Tạo Device ID duy nhất cho thiết bị
    async generateDeviceId() {
        try {
            // Nếu đã có Device ID trong localStorage
            const storedDeviceId = localStorage.getItem('taxi_device_id');
            
            if (storedDeviceId) {
                this.deviceId = storedDeviceId;
                return this.deviceId;
            }
            
            // Tạo Device ID dựa trên các thông số trình duyệt
            const fingerprintData = {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: navigator.platform,
                hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                cookiesEnabled: navigator.cookieEnabled,
                localStorage: !!window.localStorage,
                sessionStorage: !!window.sessionStorage
            };
            
            // Tạo hash từ fingerprint
            const fingerprintString = JSON.stringify(fingerprintData);
            const fingerprintHash = this.hashString(fingerprintString);
            
            // Thêm timestamp để đảm bảo độc nhất
            const timestamp = Date.now();
            this.deviceId = `TAXI-${fingerprintHash.substring(0, 8)}-${timestamp.toString(16)}`;
            
            // Lưu vào localStorage
            localStorage.setItem('taxi_device_id', this.deviceId);
            
            console.log('🆔 Device ID đã được tạo:', this.deviceId);
            return this.deviceId;
            
        } catch (error) {
            console.error('❌ Lỗi tạo Device ID:', error);
            // Fallback ID
            this.deviceId = `TAXI-FALLBACK-${Date.now()}`;
            localStorage.setItem('taxi_device_id', this.deviceId);
            return this.deviceId;
        }
    }
    
    // Hàm băm đơn giản
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    
    // Kiểm tra license
    async validateLicense() {
        try {
            const licenseKey = localStorage.getItem('taxi_license_key');
            
            if (!licenseKey) {
                console.log('⚠️ Chưa có license key, sử dụng gói FREE');
                this.userPackage = 'FREE';
                return false;
            }
            
            // Giải mã license key
            const decryptedKey = this.decryptData(licenseKey);
            
            // Kiểm tra định dạng license
            if (!decryptedKey || !decryptedKey.startsWith('TAXIPRO-')) {
                console.warn('⚠️ License key không hợp lệ');
                this.userPackage = 'FREE';
                return false;
            }
            
            // Kiểm tra Device ID trong license
            const licenseData = decryptedKey.split('-');
            const licensedDeviceId = licenseData[2];
            
            if (licensedDeviceId !== this.deviceId) {
                console.error('🚫 License không khớp với thiết bị!');
                this.showError('License không hợp lệ cho thiết bị này');
                this.userPackage = 'FREE';
                return false;
            }
            
            // Xác định gói dịch vụ từ license
            const packageType = licenseData[1];
            this.userPackage = packageType;
            
            console.log(`✅ License hợp lệ! Gói: ${this.userPackage}`);
            return true;
            
        } catch (error) {
            console.error('❌ Lỗi kiểm tra license:', error);
            this.userPackage = 'FREE';
            return false;
        }
    }
    
    // Kiểm tra và áp dụng gói dịch vụ
    async checkPackage() {
        // Lưu thông tin gói vào localStorage
        localStorage.setItem('taxi_current_package', this.userPackage);
        
        // Áp dụng tính năng theo gói
        this.applyPackageFeatures();
        
        // Hiển thị thông báo gói
        this.showPackageInfo();
    }
    
    // Áp dụng tính năng theo gói
    applyPackageFeatures() {
        // Reset tất cả tính năng
        this.disableAllFeatures();
        
        // Tính năng cho gói FREE
        if (this.userPackage === 'FREE') {
            this.enableFreeFeatures();
        }
        
        // Tính năng cho gói PRO
        if (this.userPackage === 'PRO') {
            this.enableProFeatures();
        }
        
        // Tính năng cho gói VIP
        if (this.userPackage === 'VIP') {
            this.enableVipFeatures();
        }
        
        // Cập nhật UI
        this.updateFeatureUI();
    }
    
    // Kích hoạt tính năng FREE
    enableFreeFeatures() {
        console.log('🔓 Kích hoạt tính năng FREE');
        // FREE chỉ có tính năng cơ bản
        document.getElementById('free-features')?.classList.remove('hidden');
    }
    
    // Kích hoạt tính năng PRO
    enableProFeatures() {
        console.log('🔓 Kích hoạt tính năng PRO');
        this.enableFreeFeatures();
        
        // Mở tính năng Báo giá trước
        this.enablePriceEstimation();
        
        // Mở tính năng Bảng giá 63 tỉnh thành
        this.enableProvincePricing();
        
        document.getElementById('pro-features')?.classList.remove('hidden');
    }
    
    // Kích hoạt tính năng VIP
    enableVipFeatures() {
        console.log('🔓 Kích hoạt tính năng VIP');
        this.enableProFeatures();
        
        // Kích hoạt Trợ lý giọng nói
        this.enableVoiceAssistant();
        
        // Kích hoạt Dashboard Admin
        this.enableAdminDashboard();
        
        document.getElementById('vip-features')?.classList.remove('hidden');
    }
    
    // Vô hiệu hóa tất cả tính năng
    disableAllFeatures() {
        const featureSections = ['free-features', 'pro-features', 'vip-features'];
        featureSections.forEach(id => {
            document.getElementById(id)?.classList.add('hidden');
        });
    }
    
    // Cập nhật UI tính năng
    updateFeatureUI() {
        // Cập nhật hiển thị gói
        const packageElements = document.querySelectorAll('.package-indicator');
        packageElements.forEach(el => {
            el.textContent = this.userPackage;
            el.className = `package-indicator package-${this.userPackage.toLowerCase()}`;
        });
        
        // Cập nhật badge gói
        const packageBadge = document.getElementById('package-badge');
        if (packageBadge) {
            packageBadge.textContent = `Gói: ${this.userPackage}`;
            packageBadge.className = `badge package-${this.userPackage.toLowerCase()}`;
        }
    }
    
    // Đếm số chuyến (cho gói FREE)
    initTripCounter() {
        const today = new Date().toDateString();
        const storedDate = localStorage.getItem('taxi_trip_date');
        const storedCount = localStorage.getItem('taxi_trip_count');
        
        // Nếu là ngày mới, reset counter
        if (storedDate !== today) {
            localStorage.setItem('taxi_trip_date', today);
            localStorage.setItem('taxi_trip_count', '0');
            this.tripCount = 0;
        } else {
            this.tripCount = parseInt(storedCount) || 0;
        }
        
        console.log(`📊 Số chuyến hôm nay: ${this.tripCount}/${this.maxFreeTrips}`);
        
        // Cập nhật UI
        this.updateTripCounterUI();
    }
    
    // Tăng số chuyến
    incrementTripCount() {
        if (this.userPackage === 'FREE') {
            this.tripCount++;
            localStorage.setItem('taxi_trip_count', this.tripCount.toString());
            
            // Kiểm tra giới hạn
            if (this.tripCount >= this.maxFreeTrips) {
                this.handleTripLimitReached();
            }
            
            this.updateTripCounterUI();
        }
    }
    
    // Xử lý khi đạt giới hạn chuyến
    handleTripLimitReached() {
        console.warn('⚠️ Đã đạt giới hạn 10 chuyến/ngày cho gói FREE');
        this.showError('Bạn đã đạt giới hạn 10 chuyến/ngày. Nâng cấp lên PRO để tiếp tục!');
        
        // Khóa tính năng đặt xe
        document.querySelectorAll('.book-trip-btn').forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-lock"></i> Đã đạt giới hạn';
        });
    }
    
    // Cập nhật UI đếm chuyến
    updateTripCounterUI() {
        const counterElement = document.getElementById('trip-counter');
        if (counterElement) {
            counterElement.textContent = `${this.tripCount}/${this.maxFreeTrips} chuyến`;
            
            // Đổi màu khi gần đạt giới hạn
            if (this.tripCount >= this.maxFreeTrips) {
                counterElement.style.color = '#e74c3c';
            } else if (this.tripCount >= this.maxFreeTrips * 0.8) {
                counterElement.style.color = '#f39c12';
            }
        }
    }
    
    // Mã hóa dữ liệu cước phí
    encryptFareData(fareData) {
        try {
            const dataString = JSON.stringify(fareData);
            
            // Sử dụng CryptoJS nếu có
            if (typeof CryptoJS !== 'undefined') {
                const encrypted = CryptoJS.AES.encrypt(
                    dataString, 
                    CryptoJS.enc.Utf8.parse(this.encryptionKey),
                    {
                        iv: CryptoJS.enc.Utf8.parse(this.iv),
                        mode: CryptoJS.mode.CBC,
                        padding: CryptoJS.pad.Pkcs7
                    }
                );
                return encrypted.toString();
            } else {
                // Fallback simple encryption
                return btoa(encodeURIComponent(dataString));
            }
        } catch (error) {
            console.error('❌ Lỗi mã hóa dữ liệu:', error);
            return null;
        }
    }
    
    // Giải mã dữ liệu cước phí
    decryptFareData(encryptedData) {
        try {
            // Sử dụng CryptoJS nếu có
            if (typeof CryptoJS !== 'undefined') {
                const decrypted = CryptoJS.AES.decrypt(
                    encryptedData,
                    CryptoJS.enc.Utf8.parse(this.encryptionKey),
                    {
                        iv: CryptoJS.enc.Utf8.parse(this.iv),
                        mode: CryptoJS.mode.CBC,
                        padding: CryptoJS.pad.Pkcs7
                    }
                );
                const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
                return JSON.parse(decryptedString);
            } else {
                // Fallback simple decryption
                const decoded = decodeURIComponent(atob(encryptedData));
                return JSON.parse(decoded);
            }
        } catch (error) {
            console.error('❌ Lỗi giải mã dữ liệu:', error);
            return null;
        }
    }
    
    // Giải mã dữ liệu chung
    decryptData(encryptedData) {
        try {
            return decodeURIComponent(atob(encryptedData));
        } catch {
            return encryptedData;
        }
    }
    
    // Bảo vệ F12 (DevTools)
    enableF12Protection() {
        document.addEventListener('keydown', (e) => {
            // Chặn F12
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault();
                this.showWarning('Tính năng này đã bị vô hiệu hóa vì lý do bảo mật');
                return false;
            }
            
            // Chặn Ctrl+Shift+I (DevTools)
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                e.preventDefault();
                this.showWarning('Tính năng này đã bị vô hiệu hóa vì lý do bảo mật');
                return false;
            }
            
            // Chặn Ctrl+Shift+J (Console)
            if (e.ctrlKey && e.shiftKey && e.key === 'J') {
                e.preventDefault();
                this.showWarning('Tính năng này đã bị vô hiệu hóa vì lý do bảo mật');
                return false;
            }
            
            // Chặn Ctrl+U (View Source)
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                this.showWarning('Tính năng này đã bị vô hiệu hóa vì lý do bảo mật');
                return false;
            }
        });
    }
    
    // Chống chuột phải
    enableRightClickProtection() {
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showWarning('Chuột phải đã bị vô hiệu hóa trên trang này');
            return false;
        });
        
        // Chặn kéo thả hình ảnh
        document.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
                return false;
            }
        });
    }
    
    // Phát hiện DevTools
    enableDevToolsProtection() {
        const devtoolsCheck = () => {
            const widthThreshold = window.outerWidth - window.innerWidth > 160;
            const heightThreshold = window.outerHeight - window.innerHeight > 160;
            
            if (widthThreshold || heightThreshold) {
                this.showError('Phát hiện công cụ phát triển! Vui lòng đóng DevTools để tiếp tục sử dụng.');
                document.body.innerHTML = `
                    <div style="
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: #2c3e50;
                        color: white;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        z-index: 9999;
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 20px;
                    ">
                        <h1 style="color: #e74c3c; font-size: 2.5em; margin-bottom: 20px;">
                            <i class="fas fa-shield-alt"></i> CẢNH BÁO BẢO MẬT
                        </h1>
                        <p style="font-size: 1.2em; margin-bottom: 30px; max-width: 600px;">
                            Phát hiện công cụ phát triển (DevTools) đang mở.<br>
                            Vui lòng đóng DevTools để tiếp tục sử dụng Taxi ProMax.
                        </p>
                        <div style="background: #34495e; padding: 20px; border-radius: 10px; max-width: 500px;">
                            <p><strong>Lý do:</strong> Tính năng này đã bị vô hiệu hóa để bảo vệ hệ thống và dữ liệu của bạn.</p>
                            <p style="margin-top: 10px; font-size: 0.9em; color: #bdc3c7;">
                                Taxi ProMax v5.1 - Hệ thống bảo mật nghiêm ngặt
                            </p>
                        </div>
                        <p style="margin-top: 30px; color: #7f8c8d;">
                            © 2026 NGUYEN XUAN ĐAT. Mọi quyền được bảo hộ.
                        </p>
                    </div>
                `;
            }
        };
        
        // Kiểm tra định kỳ
        setInterval(devtoolsCheck, 1000);
        
        // Kiểm tra khi resize
        window.addEventListener('resize', devtoolsCheck);
    }
    
    // Hiển thị thông tin gói
    showPackageInfo() {
        const messages = {
            'FREE': `Bạn đang sử dụng gói FREE. Giới hạn: ${this.maxFreeTrips} chuyến/ngày`,
            'PRO': 'Bạn đang sử dụng gói PRO với đầy đủ tính năng!',
            'VIP': 'Bạn đang sử dụng gói VIP cao cấp!'
        };
        
        this.showNotification(messages[this.userPackage], 'info');
    }
    
    // Hiển thị thông báo
    showNotification(message, type = 'info') {
        // Tạo thông báo nếu có hệ thống UI
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : '#3498db'};
            color: white;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Tự động xóa sau 5 giây
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    showWarning(message) {
        this.showNotification(message, 'warning');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    // Cập nhật UI tổng thể
    updateUI() {
        // Cập nhật Device ID trong UI nếu có
        const deviceIdElement = document.getElementById('device-id');
        if (deviceIdElement) {
            deviceIdElement.textContent = this.deviceId.substring(0, 12) + '...';
            deviceIdElement.title = this.deviceId;
        }
        
        // Cập nhật trạng thái bảo mật
        const securityStatus = document.getElementById('security-status');
        if (securityStatus) {
            securityStatus.innerHTML = `
                <i class="fas fa-shield-alt"></i>
                Hệ thống bảo mật: <span style="color: #2ecc71;">ĐANG HOẠT ĐỘNG</span>
            `;
        }
    }
    
    // API để các module khác sử dụng
    getCurrentPackage() {
        return this.userPackage;
    }
    
    getDeviceId() {
        return this.deviceId;
    }
    
    canBookTrip() {
        if (this.userPackage === 'FREE') {
            return this.tripCount < this.maxFreeTrips;
        }
        return true;
    }
    
    // Các hàm giả lập cho tính năng nâng cao
    enablePriceEstimation() {
        console.log('📊 Đã kích hoạt tính năng Báo giá trước');
    }
    
    enableProvincePricing() {
        console.log('🗺️ Đã kích hoạt Bảng giá 63 tỉnh thành');
    }
    
    enableVoiceAssistant() {
        console.log('🎤 Đã kích hoạt Trợ lý giọng nói');
    }
    
    enableAdminDashboard() {
        console.log('👑 Đã kích hoạt Dashboard Admin');
    }
}

// Khởi tạo hệ thống bảo mật toàn cục
window.taxiSecurity = new TaxiSecuritySystem();