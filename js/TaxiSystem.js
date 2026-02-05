// js/TaxiSystem.js - Module Core System
class TaxiSystem {
    constructor() {
        this.isRunning = false;
        this.totalKm = 0;
        this.lastPos = null;
        this.currentRate = 15000;
        this.watchId = null;
        this.wakeLock = null;
        this.selectedPackage = null;
        this.dailyTrips = 0;
        this.tripLimit = 3;
        this.driverId = null;
        this.map = null;
        this.marker = null;
        this.routeLayer = null;
    }
    
    async init() {
        try {
            // Khởi tạo driver ID
            await this.initDriverId();
            
            // Khởi tạo bản đồ
            await this.initMap();
            
            // Tải dữ liệu
            this.loadTrialStatus();
            this.checkDailyTrips();
            this.loadHistory();
            this.loadStatistics();
            
            // Chọn gói mặc định
            this.selectDefaultPackage();
            
            console.log('TaxiSystem initialized successfully');
            return this;
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Khởi tạo hệ thống thất bại: ' + error.message);
            throw error;
        }
    }
    
    initDriverId() {
        try {
            let storedId = localStorage.getItem('tx_id');
            if (!storedId) {
                const timestamp = Date.now().toString(36);
                const random = Math.random().toString(36).substr(2, 4);
                storedId = `TAXI-${timestamp}-${random}`.toUpperCase();
                localStorage.setItem('tx_id', storedId);
            }
            
            this.driverId = storedId;
            
            // Hiển thị ID
            document.getElementById('idShow').textContent = "🆔 " + this.driverId;
            document.getElementById('profileID').textContent = this.driverId;
            
            return this.driverId;
        } catch (error) {
            console.error('Driver ID init error:', error);
            throw error;
        }
    }
    
    initMap() {
        return new Promise((resolve, reject) => {
            try {
                this.map = L.map('map', { 
                    zoomControl: false, 
                    attributionControl: false,
                    gestureHandling: true
                }).setView([21.02, 105.83], 16);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap'
                }).addTo(this.map);
                
                const smIcon = L.divIcon({ 
                    className: 'sm-div-icon', 
                    html: "<div class='sm-marker'><div class='sm-arrow'></div></div>", 
                    iconSize: [24, 24], 
                    iconAnchor: [12, 12] 
                });
                
                this.marker = L.marker([21.02, 105.83], { 
                    icon: smIcon,
                    draggable: false
                }).addTo(this.map);
                
                this.routeLayer = L.layerGroup().addTo(this.map);
                resolve();
            } catch (error) {
                console.error('Map initialization error:', error);
                reject(error);
            }
        });
    }
    
    // ==================== TRIAL & PACKAGE MANAGEMENT ====================
    loadTrialStatus() {
        try {
            let trialStart = localStorage.getItem('trial_start');
            if (!trialStart) {
                trialStart = Date.now().toString();
                localStorage.setItem('trial_start', trialStart);
            }
            
            const startTime = parseInt(trialStart);
            const now = Date.now();
            const daysPassed = Math.floor((now - startTime) / (1000 * 60 * 60 * 24));
            const daysLeft = 7 - daysPassed;
            
            if (daysLeft > 0) {
                document.getElementById('trialDays').textContent = `Còn ${daysLeft} ngày dùng thử`;
                document.getElementById('currentPackage').textContent = `DÙNG THỬ (${daysLeft} ngày còn lại)`;
                document.getElementById('expiryDate').textContent = this.formatDate(startTime + 7 * 24 * 60 * 60 * 1000);
                document.getElementById('planShow').innerHTML = '⭐ DÙNG THỬ 7 NGÀY';
                document.getElementById('planShow').style.color = 'var(--gold)';
                
                // Ẩn quảng cáo
                document.getElementById('adBanner').style.display = 'none';
            } else {
                document.getElementById('trialDays').textContent = 'ĐÃ HẾT HẠN DÙNG THỬ';
                document.getElementById('currentPackage').textContent = 'HẾT HẠN - CẦN NÂNG CẤP';
                document.getElementById('expiryDate').textContent = 'ĐÃ HẾT HẠN';
                document.getElementById('planShow').innerHTML = '⚠️ HẾT HẠN DÙNG THỬ';
                document.getElementById('planShow').style.color = 'var(--danger)';
                
                // Hiển thị quảng cáo
                document.getElementById('adBanner').style.display = 'block';
            }
            
            // Tải user package
            const userPackage = JSON.parse(localStorage.getItem('user_package') || '{"type":"FREE_TRIAL"}');
            if (userPackage.type !== 'FREE_TRIAL') {
                this.updatePackageDisplay(userPackage);
            }
            
        } catch (error) {
            console.error('Trial status error:', error);
        }
    }
    
    checkDailyTrips() {
        try {
            const today = new Date().toDateString();
            const storedDate = localStorage.getItem('daily_trips_date');
            
            if (storedDate !== today) {
                // Reset daily trips count
                this.dailyTrips = 0;
                localStorage.setItem('daily_trips_date', today);
                localStorage.setItem('daily_trips_count', '0');
            } else {
                this.dailyTrips = parseInt(localStorage.getItem('daily_trips_count') || '0');
            }
        } catch (error) {
            console.error('Daily trips check error:', error);
        }
    }
    
    saveDailyTrips() {
        try {
            localStorage.setItem('daily_trips_count', this.dailyTrips.toString());
        } catch (error) {
            console.error('Save daily trips error:', error);
        }
    }
    
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }
    
    canStartTrip() {
        // Kiểm tra giới hạn chuyến cho gói free
        const userPackage = JSON.parse(localStorage.getItem('user_package') || '{"type":"FREE_TRIAL"}');
        
        if (userPackage.type === 'FREE_TRIAL') {
            const trialStart = parseInt(localStorage.getItem('trial_start') || Date.now());
            const now = Date.now();
            const daysPassed = Math.floor((now - trialStart) / (1000 * 60 * 60 * 24));
            
            if (daysPassed > 7) {
                // Đã hết hạn dùng thử
                if (this.dailyTrips >= this.tripLimit) {
                    this.showError(`Đã đạt giới hạn ${this.tripLimit} chuyến/ngày cho gói miễn phí. Vui lòng nâng cấp!`);
                    return false;
                }
            }
        }
        
        return true;
    }
    
    // ==================== PACKAGE SELECTION ====================
    selectPackage(price, id, name, element) {
        try {
            // Cập nhật giao diện
            document.querySelectorAll('.p-card').forEach(c => c.classList.remove('active'));
            element.classList.add('active');
            
            // Lưu thông tin gói đã chọn
            this.selectedPackage = {
                id: id,
                price: price,
                name: name
            };
            
            // Tạo mã giao dịch
            const timestamp = Date.now();
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const transCode = `TAXI${timestamp.toString().slice(-6)}${random}`;
            
            // Lưu mã giao dịch tạm thời
            localStorage.setItem('pending_transaction', JSON.stringify({
                code: transCode,
                package: id,
                price: price,
                timestamp: timestamp
            }));
            
            // Tạo nội dung chuyển khoản
            const content = `${this.driverId} ${id} ${transCode}`;
            document.getElementById('qrContent').textContent = content;
            
            // Tạo QR code
            const qrData = `BIDV|4430269669|NGUYEN XUAN DAT|${price}|${content}`;
            const encodedData = encodeURIComponent(qrData);
            document.getElementById('qrImg').src = 
                `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodedData}`;
            
            // Hiển thị mã giao dịch mặc định
            document.getElementById('transactionCode').value = transCode;
            
        } catch (error) {
            console.error('Package selection error:', error);
            this.showError('Lỗi chọn gói: ' + error.message);
        }
    }
    
    selectDefaultPackage() {
        try {
            const defaultCard = document.querySelector('.p-card.active');
            if (defaultCard) {
                const price = parseInt(defaultCard.dataset.price);
                const id = defaultCard.dataset.id;
                const name = defaultCard.dataset.name;
                this.selectPackage(price, id, name, defaultCard);
            }
        } catch (error) {
            console.error('Default package selection error:', error);
        }
    }
    
    // ==================== PACKAGE ACTIVATION ====================
    activatePackage(packageInfo) {
        try {
            // Tính ngày hết hạn
            const expiryDate = this.calculateExpiryDate(packageInfo.id);
            
            // Lưu thông tin gói cước
            const userPackage = {
                type: packageInfo.id,
                name: packageInfo.name,
                price: packageInfo.price,
                activated: Date.now(),
                expiry: expiryDate
            };
            
            localStorage.setItem('user_package', JSON.stringify(userPackage));
            
            // Cập nhật giao diện
            this.updatePackageDisplay(userPackage);
            
            // Reset daily trips limit
            this.dailyTrips = 0;
            this.saveDailyTrips();
            
            // Reset selected package
            this.selectedPackage = null;
            
            return userPackage;
            
        } catch (error) {
            console.error('Package activation error:', error);
            this.showError("Lỗi kích hoạt gói: " + error.message);
            throw error;
        }
    }
    
    calculateExpiryDate(packageId) {
        const now = Date.now();
        const dayInMs = 24 * 60 * 60 * 1000;
        
        switch(packageId) {
            case 'FREE_TRIAL':
                return now + (7 * dayInMs);
            case 'BASIC_1M':
                return now + (30 * dayInMs);
            case 'PRO_1M':
                return now + (30 * dayInMs);
            case 'VIP_1M':
                return now + (30 * dayInMs);
            case 'COMBO_PRO_3M':
                return now + (90 * dayInMs);
            case 'COMBO_VIP_6M':
                return now + (180 * dayInMs);
            case 'LIFETIME':
                return now + (365 * 25 * dayInMs); // 25 năm
            default:
                return now + (30 * dayInMs);
        }
    }
    
    updatePackageDisplay(packageInfo) {
        try {
            document.getElementById('currentPackage').textContent = packageInfo.name;
            document.getElementById('expiryDate').textContent = this.formatDate(packageInfo.expiry);
            
            // Cập nhật badge header
            const badge = document.getElementById('planShow');
            badge.innerHTML = `⭐ ${packageInfo.name}`;
            badge.style.color = 'var(--gold)';
            
            // Ẩn quảng cáo
            document.getElementById('adBanner').style.display = 'none';
        } catch (error) {
            console.error('Update package display error:', error);
        }
    }
    
    // ==================== HISTORY & STATISTICS ====================
    saveTrip(distance, cost) {
        try {
            const time = new Date().toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit'
            });
            
            const date = new Date().toLocaleDateString('vi-VN');
            const tripData = { 
                time, 
                date,
                km: parseFloat(distance.toFixed(2)), 
                cost: parseInt(cost),
                rate: this.currentRate
            };
            
            // Lưu vào localStorage
            let history = JSON.parse(localStorage.getItem('trip_history') || '[]');
            history.unshift(tripData);
            
            // Giới hạn 100 chuyến gần nhất
            if (history.length > 100) {
                history = history.slice(0, 100);
            }
            
            localStorage.setItem('trip_history', JSON.stringify(history));
            
            // Thêm vào giao diện
            this.addTripToHistory(tripData);
            
            // Cập nhật thống kê
            this.updateStatistics();
            
            return tripData;
            
        } catch (error) {
            console.error('Save trip error:', error);
            return null;
        }
    }
    
    addTripToHistory(trip) {
        try {
            const list = document.getElementById('historyList');
            const item = document.createElement('div');
            item.className = 'history-card';
            item.innerHTML = `
                <div class="h-info">
                    <b>${trip.time}</b><br>
                    <small style="color: #666;">${trip.date} | ${trip.km} KM</small>
                </div>
                <div class="h-price">${trip.cost.toLocaleString('vi-VN')}đ</div>
            `;
            list.prepend(item);
        } catch (error) {
            console.error('Add trip to history error:', error);
        }
    }
    
    loadHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
            const list = document.getElementById('historyList');
            list.innerHTML = '';
            
            if (history.length === 0) {
                list.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: #95a5a6;">
                        <div style="font-size: 48px;">📊</div>
                        <p style="font-weight: 900; margin: 10px 0;">CHƯA CÓ CHUYẾN ĐI NÀO</p>
                        <p style="font-size: 12px;">Bắt đầu chuyến đi đầu tiên ngay!</p>
                    </div>
                `;
                return;
            }
            
            history.forEach(trip => {
                this.addTripToHistory(trip);
            });
            
        } catch (error) {
            console.error('Load history error:', error);
            const list = document.getElementById('historyList');
            list.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--danger);">
                    <div style="font-size: 48px;">❌</div>
                    <p style="font-weight: 900; margin: 10px 0;">LỖI TẢI LỊCH SỬ</p>
                    <p style="font-size: 12px;">Vui lòng thử lại</p>
                </div>
            `;
        }
    }
    
    loadStatistics() {
        try {
            const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
            
            const totalTrips = history.length;
            const totalKm = history.reduce((sum, trip) => sum + trip.km, 0);
            const totalEarned = history.reduce((sum, trip) => sum + trip.cost, 0);
            
            document.getElementById('totalTrips').textContent = totalTrips;
            document.getElementById('totalKm').textContent = totalKm.toFixed(1);
            document.getElementById('totalEarned').textContent = totalEarned.toLocaleString('vi-VN') + 'đ';
            
            return { totalTrips, totalKm, totalEarned };
        } catch (error) {
            console.error('Load statistics error:', error);
            return { totalTrips: 0, totalKm: 0, totalEarned: 0 };
        }
    }
    
    updateStatistics() {
        return this.loadStatistics();
    }
    
    clearHistory() {
        try {
            localStorage.removeItem('trip_history');
            this.loadHistory();
            this.updateStatistics();
            return true;
        } catch (error) {
            console.error('Clear history error:', error);
            return false;
        }
    }
    
    exportData() {
        try {
            const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
            const userPackage = JSON.parse(localStorage.getItem('user_package') || '{"type":"FREE_TRIAL"}');
            
            const exportData = {
                driverId: this.driverId,
                exportDate: new Date().toISOString(),
                package: userPackage,
                statistics: {
                    totalTrips: history.length,
                    totalKm: history.reduce((sum, trip) => sum + trip.km, 0),
                    totalEarned: history.reduce((sum, trip) => sum + trip.cost, 0),
                    averagePerTrip: history.length > 0 ? 
                        Math.round(history.reduce((sum, trip) => sum + trip.cost, 0) / history.length) : 0
                },
                trips: history
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            return {
                data: exportData,
                blob: dataBlob,
                filename: `TAXI_PROMAX_${this.driverId}_${new Date().toISOString().split('T')[0]}.json`
            };
        } catch (error) {
            console.error('Export data error:', error);
            throw error;
        }
    }
    
    // ==================== UTILITIES ====================
    updateRate(value) {
        this.currentRate = value;
        document.getElementById('rateLabel').textContent = value.toLocaleString('vi-VN');
        this.updateDisplay();
    }
    
    updateDisplay() {
        try {
            document.getElementById('km').textContent = this.totalKm.toFixed(2);
            const cost = Math.round(this.totalKm * this.currentRate);
            document.getElementById('cost').textContent = cost.toLocaleString('vi-VN');
        } catch (error) {
            console.error('Display update error:', error);
        }
    }
    
    showTripSummary(distance, cost) {
        try {
            const summary = document.getElementById('endSummary');
            summary.innerHTML = `
                Quãng đường: <b>${distance.toFixed(2)} KM</b><br>
                Đơn giá: <b>${this.currentRate.toLocaleString('vi-VN')}đ/KM</b><br>
                <hr style="margin: 10px 0; border-color: #eee;">
                <h3 style="color:var(--primary); margin: 5px 0;">TỔNG CƯỚC:</h3>
                <div style="font-size: 28px; font-weight: 900; color: var(--primary);">
                    ${cost.toLocaleString('vi-VN')}đ
                </div>
            `;
        } catch (error) {
            console.error('Show trip summary error:', error);
        }
    }
    
    // ==================== ERROR HANDLING ====================
    showError(message) {
        try {
            const errorElement = document.getElementById('errorMessage');
            if (errorElement) {
                errorElement.innerHTML = message;
                errorElement.style.display = 'block';
                
                // Tự động ẩn sau 5 giây
                setTimeout(() => {
                    errorElement.style.display = 'none';
                }, 5000);
            } else {
                alert(message);
            }
        } catch (error) {
            console.error('Show error error:', error);
            alert(message);
        }
    }
}
