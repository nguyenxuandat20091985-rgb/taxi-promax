// Initialize package from license
init: function() {
    this.licenseInfo = Storage.getCurrentLicense();
    
    if (this.licenseInfo && this.licenseInfo.package) {
        this.currentPackage = this.licenseInfo.package;
    } else {
        this.currentPackage = 'FREE';
    }
    
    this.updateUI();
    return this.currentPackage;
},

// Update UI based on current package
updateUI: function() {
    // Update package badge
    const packageBadge = document.getElementById('package-badge');
    if (packageBadge) {
        packageBadge.textContent = this.currentPackage;
        
        // Update badge color based on package
        const colors = {
            'FREE': 'bg-secondary',
            'BASIC': 'bg-primary',
            'PRO': 'bg-warning',
            'VIP': 'bg-danger'
        };
        
        packageBadge.className = 'badge ' + (colors[this.currentPackage] || 'bg-secondary');
    }
    
    // Update license status
    const licenseStatus = document.getElementById('license-status');
    if (licenseStatus) {
        if (this.currentPackage === 'FREE') {
            licenseStatus.textContent = 'Chưa kích hoạt';
            licenseStatus.className = 'badge bg-danger';
        } else {
            licenseStatus.textContent = 'Đã kích hoạt';
            licenseStatus.className = 'badge bg-success';
            
            // Show expiration date if available
            if (this.licenseInfo && this.licenseInfo.expires) {
                const expiresDate = new Date(this.licenseInfo.expires);
                const now = new Date();
                const daysLeft = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
                
                if (daysLeft <= 7) {
                    licenseStatus.textContent = `Hết hạn sau ${daysLeft} ngày`;
                    licenseStatus.className = 'badge bg-warning';
                } else if (daysLeft <= 0) {
                    licenseStatus.textContent = 'Đã hết hạn';
                    licenseStatus.className = 'badge bg-danger';
                }
            }
        }
    }
    
    // Enable/disable features based on package
    this.applyFeatureRestrictions();
},

// Apply feature restrictions based on package
applyFeatureRestrictions: function() {
    const packageConfig = CONFIG.PACKAGES[this.currentPackage];
    
    // Example: Disable export button for FREE package
    const exportButtons = document.querySelectorAll('[data-feature="export"]');
    exportButtons.forEach(button => {
        button.disabled = !packageConfig.exportReport;
        if (button.disabled) {
            button.title = 'Chức năng chỉ có từ gói BASIC trở lên';
        }
    });
    
    // Example: Limit distance input for FREE package
    if (this.currentPackage === 'FREE') {
        const distanceInputs = document.querySelectorAll('[data-max-distance]');
        distanceInputs.forEach(input => {
            const maxDistance = packageConfig.maxDistance;
            input.max = maxDistance;
            input.title = `Giới hạn: ${maxDistance}km cho gói FREE`;
        });
    }
    
    // Update package pricing display
    this.updatePackagePricing();
},

// Update package pricing information
updatePackagePricing: function() {
    const packageElements = document.querySelectorAll('[data-package-price]');
    packageElements.forEach(element => {
        const packageType = element.getAttribute('data-package-price');
        const price = Pricing.getPackagePrice(packageType, 1);
        element.textContent = Pricing.formatCurrency(price);
    });
},

// Check if feature is available
hasFeature: function(featureName) {
    return Security.checkFeatureAccess(featureName, this.currentPackage);
},

// Upgrade package
upgradePackage: function(packageType, paymentMethod = null) {
    return new Promise((resolve, reject) => {
        const packageConfig = CONFIG.PACKAGES[packageType];
        
        if (!packageConfig) {
            reject(new Error('Gói không hợp lệ'));
            return;
        }
        
        // Check if already have this package or higher
        const packageOrder = ['FREE', 'BASIC', 'PRO', 'VIP'];
        const currentIndex = packageOrder.indexOf(this.currentPackage);
        const newIndex = packageOrder.indexOf(packageType);
        
        if (newIndex <= currentIndex) {
            reject(new Error(`Bạn đã có gói ${this.currentPackage} hoặc cao hơn`));
            return;
        }
        
        // Generate license for new package
        const licenseKey = Security.generateLicense(packageType);
        const activationResult = Security.activateLicense(licenseKey);
        
        if (activationResult.success) {
            // Update current package
            this.currentPackage = packageType;
            this.licenseInfo = Storage.getCurrentLicense();
            
            // Update UI
            this.updateUI();
            
            // Save upgrade event
            Storage.saveStatistic('revenue', packageConfig.price);
            
            resolve({
                success: true,
                message: `Nâng cấp lên gói ${packageType} thành công!`,
                licenseKey: licenseKey,
                package: packageType
            });
        } else {
            reject(new Error(activationResult.message));
        }
    });
},

// Get package benefits
getPackageBenefits: function(packageType) {
    const packageConfig = CONFIG.PACKAGES[packageType];
    if (!packageConfig) return [];
    
    const benefits = [];
    
    benefits.push(`Tối đa ${packageConfig.maxDistance === 9999 ? 'không giới hạn' : packageConfig.maxDistance + 'km'}/chuyến`);
    benefits.push(`Lịch sử ${packageConfig.historyDays} ngày`);
    
    if (packageConfig.exportReport) {
        benefits.push('Xuất báo cáo');
    }
    
    if (packageConfig.prioritySupport) {
        benefits.push('Hỗ trợ ưu tiên');
    }
    
    if (packageConfig.apiAccess) {
        benefits.push('Truy cập API');
    }
    
    if (packageConfig.customUI) {
        benefits.push('Tùy chỉnh giao diện');
    }
    
    return benefits;
},

// Get package comparison
getPackageComparison: function() {
    const packages = ['FREE', 'BASIC', 'PRO', 'VIP'];
    const comparison = {};
    
    packages.forEach(pkg => {
        comparison[pkg] = {
            price: CONFIG.PACKAGES[pkg].price,
            benefits: this.getPackageBenefits(pkg),
            features: {
                maxDistance: CONFIG.PACKAGES[pkg].maxDistance,
                historyDays: CONFIG.PACKAGES[pkg].historyDays,
                exportReport: CONFIG.PACKAGES[pkg].exportReport,
                prioritySupport: CONFIG.PACKAGES[pkg].prioritySupport,
                apiAccess: CONFIG.PACKAGES[pkg].apiAccess || false,
                customUI: CONFIG.PACKAGES[pkg].customUI || false
            }
        };
    });
    
    return comparison;
},

// Check license expiration
checkLicenseExpiration: function() {
    if (!this.licenseInfo || !this.licenseInfo.expires) {
        return { expired: false };
    }
    
    const expires = new Date(this.licenseInfo.expires);
    const now = new Date();
    const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
    
    return {
        expired: now > expires,
        daysLeft: daysLeft,
        expires: expires
    };
},

// Show package upgrade modal
showUpgradeModal: function(packageType) {
    const packageConfig = CONFIG.PACKAGES[packageType];
    const price = Pricing.getPackagePrice(packageType, 1);
    
    const modalBody = `
        <h4>Nâng cấp lên gói ${packageType}</h4>
        <p>Giá: <strong>${Pricing.formatCurrency(price)}/tháng</strong></p>
        <ul>
            ${this.getPackageBenefits(packageType).map(benefit => `<li>${benefit}</li>`).join('')}
        </ul>
        <p>Bạn sẽ được chuyển đến trang thanh toán.</p>
    `;
    
    // In a real app, this would show a modal
    console.log('Upgrade modal:', modalBody);
    
    // For demo, simulate payment redirect
    setTimeout(() => {
        window.location.href = `payment.html?package=${packageType.toLowerCase()}&amount=${price}`;
    }, 1000);
},

// Validate trip against package limits
validateTrip: function(distanceKm, durationMinutes) {
    return Pricing.checkPackageLimit(this.currentPackage, distanceKm, durationMinutes);
}
