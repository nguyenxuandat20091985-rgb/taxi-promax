// Taxi Promax v5.1 - Package Management
const PackageManager = {
    currentPackage: 'FREE',
    licenseInfo: null,
    
    init: function() {
        this.licenseInfo = Storage.getCurrentLicense();
        if (this.licenseInfo && this.licenseInfo.package) {
            this.currentPackage = this.licenseInfo.package;
        }
        this.updateUI();
        return this.currentPackage;
    },
    
    updateUI: function() {
        const packageBadge = document.getElementById('package-badge');
        if (packageBadge) {
            packageBadge.textContent = this.currentPackage;
            const colors = {
                'FREE': 'bg-secondary',
                'BASIC': 'bg-primary',
                'PRO': 'bg-warning',
                'VIP': 'bg-danger'
            };
            packageBadge.className = 'badge ' + (colors[this.currentPackage] || 'bg-secondary');
        }
        
        const licenseStatus = document.getElementById('license-status');
        if (licenseStatus) {
            if (this.currentPackage === 'FREE') {
                licenseStatus.textContent = 'Chưa kích hoạt';
                licenseStatus.className = 'badge bg-danger';
            } else {
                licenseStatus.textContent = 'Đã kích hoạt';
                licenseStatus.className = 'badge bg-success';
            }
        }
    },
    
    hasFeature: function(featureName) {
        const packages = {
            FREE: { maxDistance: 10, exportReport: false },
            BASIC: { maxDistance: 50, exportReport: true },
            PRO: { maxDistance: 9999, exportReport: true },
            VIP: { maxDistance: 9999, exportReport: true }
        };
        
        const packageConfig = packages[this.currentPackage];
        if (!packageConfig) return false;
        
        switch(featureName) {
            case 'export_report': return packageConfig.exportReport;
            case 'unlimited_distance': return packageConfig.maxDistance > 50;
            default: return true;
        }
    },
    
    validateTrip: function(distanceKm, durationMinutes) {
        const packages = {
            FREE: { maxDistance: 10 },
            BASIC: { maxDistance: 50 },
            PRO: { maxDistance: 9999 },
            VIP: { maxDistance: 9999 }
        };
        
        const packageConfig = packages[this.currentPackage];
        if (!packageConfig) return { allowed: false, reason: 'Gói không hợp lệ' };
        
        if (distanceKm > packageConfig.maxDistance) {
            return {
                allowed: false,
                reason: `Gói ${this.currentPackage} giới hạn ${packageConfig.maxDistance}km`
            };
        }
        
        return { allowed: true };
    },
    
    showUpgradeModal: function(packageType) {
        const prices = {
            'BASIC': 50000,
            'PRO': 100000,
            'VIP': 200000
        };
        
        const price = prices[packageType] || 0;
        const modalBody = `
            <h4>Nâng cấp lên gói ${packageType}</h4>
            <p>Giá: <strong>${new Intl.NumberFormat('vi-VN').format(price)} đ/tháng</strong></p>
            <p>Bạn sẽ được chuyển đến trang thanh toán.</p>
        `;
        
        setTimeout(() => {
            window.location.href = `payment.html?package=${packageType.toLowerCase()}&amount=${price}`;
        }, 1000);
    }
};
