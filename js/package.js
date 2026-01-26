// Taxi Promax v5.1 - Package Management
const PackageManager = {
    currentPackage: 'FREE',
    licenseInfo: null,
    trialInfo: null,
    
    // Initialize package system
    init: function() {
        console.log('Initializing Package Manager...');
        
        // Load license from storage
        this.licenseInfo = Storage.getCurrentLicense();
        
        // Load trial info
        this.trialInfo = this.loadTrialInfo();
        
        // Check trial expiration
        if (this.trialInfo && this.checkTrialExpired()) {
            this.currentPackage = 'EXPIRED';
            this.showTrialExpired();
        } else if (this.licenseInfo && this.licenseInfo.package) {
            // Check license expiration
            if (this.checkLicenseExpired()) {
                this.currentPackage = 'FREE';
                this.showLicenseExpired();
            } else {
                this.currentPackage = this.licenseInfo.package;
            }
        } else {
            this.currentPackage = 'FREE';
        }
        
        // Update UI
        this.updateUI();
        this.renderPackageCards();
        
        console.log('Current package:', this.currentPackage);
        return this.currentPackage;
    },
    
    // Load trial information
    loadTrialInfo: function() {
        let trialInfo = localStorage.getItem('trial_info');
        if (!trialInfo) {
            // Start new trial
            trialInfo = {
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                tripsUsed: 0,
                maxTrips: 10
            };
            localStorage.setItem('trial_info', JSON.stringify(trialInfo));
        }
        return JSON.parse(trialInfo);
    },
    
    // Check if trial expired
    checkTrialExpired: function() {
        if (!this.trialInfo) return false;
        const endDate = new Date(this.trialInfo.endDate);
        const now = new Date();
        return now > endDate || this.trialInfo.tripsUsed >= this.trialInfo.maxTrips;
    },
    
    // Check if license expired
    checkLicenseExpired: function() {
        if (!this.licenseInfo || !this.licenseInfo.expires) return true;
        const expires = new Date(this.licenseInfo.expires);
        const now = new Date();
        return now > expires;
    },
    
    // Update trial counter
    incrementTripCount: function() {
        if (this.currentPackage === 'FREE' && this.trialInfo) {
            this.trialInfo.tripsUsed++;
            localStorage.setItem('trial_info', JSON.stringify(this.trialInfo));
            
            // Check if reached limit
            if (this.trialInfo.tripsUsed >= this.trialInfo.maxTrips) {
                this.showTrialLimitReached();
                return false;
            }
        }
        return true;
    },
    
    // Update UI
    updateUI: function() {
        // Update package badge
        const packageBadge = document.getElementById('package-badge');
        if (packageBadge) {
            packageBadge.textContent = this.currentPackage;
            
            const colors = {
                'FREE': 'bg-secondary',
                'BASIC': 'bg-primary',
                'PRO': 'bg-warning',
                'VIP': 'bg-danger',
                'EXPIRED': 'bg-dark'
            };
            
            packageBadge.className = 'badge ' + (colors[this.currentPackage] || 'bg-secondary');
        }
        
        // Update license status
        const licenseStatus = document.getElementById('license-status');
        if (licenseStatus) {
            if (this.currentPackage === 'FREE' && this.trialInfo) {
                const daysLeft = Math.ceil((new Date(this.trialInfo.endDate) - new Date()) / (1000 * 60 * 60 * 24));
                const tripsLeft = this.trialInfo.maxTrips - this.trialInfo.tripsUsed;
                licenseStatus.textContent = `Dùng thử: ${tripsLeft} chuyến, ${daysLeft} ngày`;
                licenseStatus.className = 'badge bg-info';
            } else if (this.currentPackage === 'EXPIRED') {
                licenseStatus.textContent = 'Hết hạn dùng thử';
                licenseStatus.className = 'badge bg-danger';
            } else if (this.currentPackage === 'FREE') {
                licenseStatus.textContent = 'Chưa kích hoạt';
                licenseStatus.className = 'badge bg-secondary';
            } else {
                licenseStatus.textContent = 'Đã kích hoạt';
                licenseStatus.className = 'badge bg-success';
            }
        }
        
        // Update feature availability
        this.updateFeatureAvailability();
    },
    
    // Render package cards
    renderPackageCards: function() {
        const container = document.getElementById('package-cards-container');
        if (!container) return;
        
        const packages = CONFIG.PACKAGES;
        let html = '<div class="row">';
        
        for (const [key, pkg] of Object.entries(packages)) {
            const isCurrent = this.currentPackage === key;
            const isPopular = key === 'PRO'; // PRO là gói phổ biến
            
            html += `
                <div class="col-md-3 mb-4">
                    <div class="package-card ${key.toLowerCase()} ${isPopular ? 'popular' : ''}">
                        <div class="package-header">
                            <h4 class="mb-2">${pkg.name}</h4>
                            <p class="small mb-0">${pkg.description}</p>
                        </div>
                        <div class="package-body">
                            ${pkg.pricing.monthly > 0 ? `
                                <div class="package-price">
                                    ${this.formatPrice(pkg.pricing.monthly)}
                                    <span class="period">/tháng</span>
                                </div>
                                ${pkg.pricing.yearly > 0 ? `
                                    <p class="text-success mb-2">
                                        <i class="fas fa-calendar-alt"></i> 
                                        ${this.formatPrice(pkg.pricing.yearly)}/năm
                                    </p>
                                ` : ''}
                                ${pkg.pricing.lifetime > 0 ? `
                                    <p class="text-warning mb-3">
                                        <i class="fas fa-crown"></i> 
                                        ${this.formatPrice(pkg.pricing.lifetime)} trọn đời
                                    </p>
                                ` : ''}
                            ` : `
                                <div class="package-price text-success">
                                    MIỄN PHÍ
                                </div>
                            `}
                            
                            <ul class="package-features">
                                ${pkg.features.map(feature => `
                                    <li>${feature}</li>
                                `).join('')}
                            </ul>
                            
                            <div class="d-grid gap-2">
                                ${isCurrent ? `
                                    <button class="btn btn-outline-primary" disabled>
                                        <i class="fas fa-check"></i> Đang sử dụng
                                    </button>
                                ` : `
                                    <button class="btn btn-primary" onclick="PackageManager.showUpgradeOptions('${key}')">
                                        <i class="fas fa-arrow-up"></i> Nâng cấp ngay
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    // Show upgrade options
    showUpgradeOptions: function(packageType) {
        const pkg = CONFIG.PACKAGES[packageType];
        if (!pkg) return;
        
        let optionsHtml = `
            <h4>Nâng cấp lên ${pkg.name}</h4>
            <p class="text-muted">${pkg.description}</p>
            <div class="row mt-3">
        `;
        
        if (pkg.pricing.monthly > 0) {
            optionsHtml += `
                <div class="col-md-4 mb-3">
                    <div class="card text-center h-100">
                        <div class="card-body">
                            <h5 class="text-primary">Hàng tháng</h5>
                            <h3 class="my-3">${this.formatPrice(pkg.pricing.monthly)}</h3>
                            <p class="small text-muted">Thanh toán mỗi tháng</p>
                            <button class="btn btn-outline-primary w-100" 
                                onclick="PackageManager.upgradePackage('${packageType}', 'monthly')">
                                <i class="fas fa-shopping-cart"></i> Chọn
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (pkg.pricing.yearly > 0) {
            optionsHtml += `
                <div class="col-md-4 mb-3">
                    <div class="card text-center h-100">
                        <div class="card-body">
                            <h5 class="text-success">Hàng năm</h5>
                            <h3 class="my-3">${this.formatPrice(pkg.pricing.yearly)}</h3>
                            <p class="small text-muted">Tiết kiệm ${Math.round((1 - pkg.pricing.yearly/(pkg.pricing.monthly*12)) * 100)}%</p>
                            <button class="btn btn-outline-success w-100" 
                                onclick="PackageManager.upgradePackage('${packageType}', 'yearly')">
                                <i class="fas fa-calendar-star"></i> Chọn
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (pkg.pricing.lifetime > 0) {
            optionsHtml += `
                <div class="col-md-4 mb-3">
                    <div class="card text-center h-100">
                        <div class="card-body">
                            <h5 class="text-warning">Trọn đời</h5>
                            <h3 class="my-3">${this.formatPrice(pkg.pricing.lifetime)}</h3>
                            <p class="small text-muted">Một lần, dùng mãi mãi</p>
                            <button class="btn btn-outline-warning w-100" 
                                onclick="PackageManager.upgradePackage('${packageType}', 'lifetime')">
                                <i class="fas fa-crown"></i> Chọn
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        optionsHtml += '</div>';
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('upgradeModal'));
        document.getElementById('upgradeModalBody').innerHTML = optionsHtml;
        modal.show();
    },
    
    // Upgrade package
    upgradePackage: function(packageType, duration) {
        const pkg = CONFIG.PACKAGES[packageType];
        const amount = pkg.pricing[duration] || 0;
        
        // Redirect to payment page
        window.location.href = `payment.html?package=${packageType.toLowerCase()}&duration=${duration}&amount=${amount}`;
    },
    
    // Check feature access
    hasFeature: function(feature) {
        const pkg = CONFIG.PACKAGES[this.currentPackage];
        if (!pkg) return false;
        
        const featureMap = {
            'unlimited_trips': this.currentPackage !== 'FREE',
            'offline_mode': pkg.limits.hasOffline,
            'real_time_map': pkg.limits.hasMap,
            'price_estimate': pkg.limits.hasPriceEstimate,
            'pdf_invoice': pkg.limits.hasInvoice,
            'inter_province': pkg.limits.hasInterProvince,
            'analytics': pkg.limits.hasAnalytics,
            'ai_pricing': pkg.limits.hasAI,
            'voice_assistant': pkg.limits.hasVoice,
            'cloud_backup': pkg.limits.hasCloud,
            'no_ads': pkg.limits.noAds
        };
        
        return featureMap[feature] || false;
    },
    
    // Format price
    formatPrice: function(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    // Update feature availability in UI
    updateFeatureAvailability: function() {
        // Disable/enable features based on package
        const features = {
            'btn-export': this.hasFeature('pdf_invoice'),
            'btn-offline': this.hasFeature('offline_mode'),
            'btn-analytics': this.hasFeature('analytics'),
            'btn-ai': this.hasFeature('ai_pricing')
        };
        
        for (const [btnId, hasAccess] of Object.entries(features)) {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = !hasAccess;
                if (!hasAccess) {
                    btn.title = 'Tính năng chỉ có từ gói cao hơn';
                }
            }
        }
    },
    
    // Show trial expired message
    showTrialExpired: function() {
        const modal = new bootstrap.Modal(document.getElementById('trialModal'));
        document.getElementById('trialModalBody').innerHTML = `
            <div class="text-center">
                <i class="fas fa-clock fa-3x text-danger mb-3"></i>
                <h4>Hết hạn dùng thử!</h4>
                <p>Bạn đã sử dụng hết 7 ngày dùng thử hoặc 10 chuyến miễn phí.</p>
                <p>Vui lòng nâng cấp để tiếp tục sử dụng Taxi Promax.</p>
                <button class="btn btn-primary mt-3" onclick="App.showPage('package')">
                    <i class="fas fa-crown"></i> Xem gói dịch vụ
                </button>
            </div>
        `;
        modal.show();
    },
    
    // Show trial limit reached
    showTrialLimitReached: function() {
        alert('Bạn đã sử dụng hết 10 chuyến miễn phí. Vui lòng nâng cấp để tiếp tục!');
        App.showPage('package');
    },
    
    // Show license expired
    showLicenseExpired: function() {
        const modal = new bootstrap.Modal(document.getElementById('licenseModal'));
        document.getElementById('licenseModalBody').innerHTML = `
            <div class="text-center">
                <i class="fas fa-key fa-3x text-warning mb-3"></i>
                <h4>License đã hết hạn!</h4>
                <p>License của bạn đã hết hạn vào ${new Date(this.licenseInfo.expires).toLocaleDateString('vi-VN')}</p>
                <p>Vui lòng gia hạn để tiếp tục sử dụng.</p>
                <button class="btn btn-warning mt-3" onclick="App.showPage('payment')">
                    <i class="fas fa-credit-card"></i> Gia hạn ngay
                </button>
            </div>
        `;
        modal.show();
    }
};

// Add modals to HTML
document.addEventListener('DOMContentLoaded', function() {
    // Add upgrade modal
    const modalHtml = `
        <div class="modal fade" id="upgradeModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title"><i class="fas fa-crown"></i> Nâng cấp gói dịch vụ</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="upgradeModalBody">
                        <!-- Content will be inserted here -->
                    </div>
                </div>
            </div>
        </div>
        
        <div class="modal fade" id="trialModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title"><i class="fas fa-exclamation-triangle"></i> Thông báo</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="trialModalBody"></div>
                </div>
            </div>
        </div>
        
        <div class="modal fade" id="licenseModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-white">
                        <h5 class="modal-title"><i class="fas fa-key"></i> Thông báo License</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" id="licenseModalBody"></div>
                </div>
            </div>
        </div>
    `;
    
    // Add to body if not exists
    if (!document.getElementById('upgradeModal')) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
});
