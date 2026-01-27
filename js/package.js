// File: js/package.js
class TaxiPackageManager {
    constructor(securitySystem) {
        this.security = securitySystem;
        this.packages = {
            'FREE': {
                name: 'Gói FREE',
                price: 'Miễn phí',
                duration: '7 ngày',
                features: [
                    'Tối đa 10 chuyến/ngày',
                    'Bản đồ cơ bản',
                    'Theo dõi lịch sử',
                    'Hỗ trợ 24/7'
                ],
                limitations: [
                    'Không có báo giá trước',
                    'Không có bảng giá tỉnh thành',
                    'Không có trợ lý giọng nói',
                    'Không có dashboard admin'
                ]
            },
            'PRO': {
                name: 'Gói PRO',
                price: '499.000đ/tháng',
                duration: '30 ngày',
                features: [
                    'Không giới hạn chuyến',
                    'Báo giá trước chính xác',
                    'Bảng giá 63 tỉnh thành',
                    'Bản đồ nâng cao',
                    'Thống kê chi tiết',
                    'Hỗ trợ ưu tiên'
                ],
                limitations: [
                    'Không có trợ lý giọng nói',
                    'Không có dashboard admin'
                ]
            },
            'VIP': {
                name: 'Gói VIP',
                price: '1.299.000đ/tháng',
                duration: '30 ngày',
                features: [
                    'Tất cả tính năng PRO',
                    'Trợ lý giọng nói AI',
                    'Dashboard Admin quản lý',
                    'Quản lý đội xe (tối đa 50 xe)',
                    'Báo cáo doanh thu nâng cao',
                    'API tích hợp hệ thống',
                    'Hỗ trợ 24/7 qua điện thoại'
                ],
                limitations: []
            }
        };
        
        this.init();
    }
    
    init() {
        console.log('📦 Trình quản lý gói dịch vụ đã sẵn sàng');
        this.displayCurrentPackage();
        this.renderPackageOptions();
    }
    
    // Hiển thị thông tin gói hiện tại
    displayCurrentPackage() {
        const currentPackage = this.security.getCurrentPackage();
        const packageInfo = this.packages[currentPackage];
        
        // Cập nhật UI
        const packageInfoElement = document.getElementById('package-info');
        if (packageInfoElement) {
            packageInfoElement.innerHTML = `
                <h3><i class="fas fa-crown"></i> ${packageInfo.name}</h3>
                <p><strong>Giá:</strong> ${packageInfo.price}</p>
                <p><strong>Thời hạn:</strong> ${packageInfo.duration}</p>
                <div class="features-list">
                    <h4>Tính năng:</h4>
                    <ul>
                        ${packageInfo.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('')}
                    </ul>
                </div>
                ${packageInfo.limitations.length > 0 ? `
                    <div class="limitations">
                        <h4>Hạn chế:</h4>
                        <ul>
                            ${packageInfo.limitations.map(l => `<li><i class="fas fa-times"></i> ${l}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;
        }
    }
    
    // Hiển thị các tùy chọn nâng cấp
    renderPackageOptions() {
        const packagesContainer = document.getElementById('package-options');
        if (!packagesContainer) return;
        
        const currentPackage = this.security.getCurrentPackage();
        
        packagesContainer.innerHTML = Object.entries(this.packages)
            .map(([key, pkg]) => {
                const isCurrent = key === currentPackage;
                const isUpgrade = this.isUpgradePossible(currentPackage, key);
                
                return `
                    <div class="package-card ${isCurrent ? 'current' : ''}">
                        <div class="package-header">
                            <h3>${pkg.name}</h3>
                            <div class="package-price">${pkg.price}</div>
                            <div class="package-duration">${pkg.duration}</div>
                        </div>
                        <div class="package-features">
                            <ul>
                                ${pkg.features.map(f => `<li><i class="fas fa-check"></i> ${f}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="package-actions">
                            ${isCurrent ? 
                                `<button class="btn-current" disabled>
                                    <i class="fas fa-check"></i> Đang sử dụng
                                </button>` :
                                `<button class="btn-upgrade" onclick="packageManager.upgradePackage('${key}')" 
                                 ${!isUpgrade ? 'disabled' : ''}>
                                    <i class="fas fa-arrow-up"></i> 
                                    ${isUpgrade ? 'Nâng cấp ngay' : 'Không khả dụng'}
                                </button>`
                            }
                        </div>
                    </div>
                `;
            })
            .join('');
    }
    
    // Kiểm tra có thể nâng cấp không
    isUpgradePossible(current, target) {
        const order = ['FREE', 'PRO', 'VIP'];
        const currentIndex = order.indexOf(current);
        const targetIndex = order.indexOf(target);
        
        return targetIndex > currentIndex;
    }
    
    // Xử lý nâng cấp gói
    async upgradePackage(packageType) {
        try {
            console.log(`🔄 Đang xử lý nâng cấp lên gói ${packageType}...`);
            
            // Hiển thị loading
            this.showUpgradeModal(packageType);
            
            // Trong thực tế, đây là nơi gọi API thanh toán
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Tạo license key mới
            const deviceId = this.security.getDeviceId();
            const licenseKey = `TAXIPRO-${packageType}-${deviceId}-${Date.now()}`;
            
            // Mã hóa và lưu license
            const encryptedKey = btoa(encodeURIComponent(licenseKey));
            localStorage.setItem('taxi_license_key', encryptedKey);
            
            // Thông báo thành công
            this.showSuccess(`Nâng cấp lên ${packageType} thành công!`);
            
            // Reload để áp dụng thay đổi
            setTimeout(() => {
                location.reload();
            }, 2000);
            
        } catch (error) {
            console.error('❌ Lỗi nâng cấp gói:', error);
            this.showError('Có lỗi xảy ra khi nâng cấp. Vui lòng thử lại!');
        }
    }
    
    // Hiển thị modal nâng cấp
    showUpgradeModal(packageType) {
        const packageInfo = this.packages[packageType];
        
        const modal = document.createElement('div');
        modal.className = 'upgrade-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-rocket"></i> Nâng cấp gói dịch vụ</h2>
                    <button class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="upgrade-info">
                        <p>Bạn đang nâng cấp lên:</p>
                        <h3>${packageInfo.name} - ${packageInfo.price}</h3>
                        <div class="processing">
                            <div class="spinner"></div>
                            <p>Đang xử lý yêu cầu nâng cấp...</p>
                            <p class="note">Vui lòng không đóng trình duyệt</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <p><i class="fas fa-shield-alt"></i> Thanh toán an toàn được bảo vệ bởi Taxi ProMax</p>
                </div>
            </div>
        `;
        
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        modal.querySelector('.modal-content').style.cssText = `
            background: white;
            border-radius: 10px;
            width: 90%;
            max-width: 500px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(modal);
    }
    
    showSuccess(message) {
        alert('✅ ' + message);
    }
    
    showError(message) {
        alert('❌ ' + message);
    }
}

// Khởi tạo Package Manager khi hệ thống bảo mật sẵn sàng
let packageManager;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        packageManager = new TaxiPackageManager(window.taxiSecurity);
    }, 1000);
});