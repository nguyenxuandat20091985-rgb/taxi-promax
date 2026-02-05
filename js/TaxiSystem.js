// js/TaxiSystem.js - Trái tim điều khiển hệ thống
class TaxiSystem {
    constructor() {
        // Trạng thái chuyến đi
        this.isRunning = false;
        this.totalKm = 0;
        this.lastPos = null;
        this.currentRate = 15000;
        
        // Dữ liệu người dùng
        this.driverId = null;
        this.selectedPackage = null;
        this.dailyTrips = 0;
        this.tripLimit = 3; // Giới hạn cho bản Free
        
        // Bản đồ & GPS
        this.map = null;
        this.marker = null;
        this.gps = new GPSTracker(this);
        this.payment = new PaymentManager(this);
    }
    
    async init() {
        try {
            this.initDriverId();
            this.initMap();
            
            // Tải dữ liệu từ bộ nhớ máy
            this.loadTrialStatus();
            this.checkDailyTrips();
            this.loadHistory();
            this.loadStatistics();
            
            // Chọn gói cước mặc định trên giao diện
            this.selectDefaultPackage();
            
            console.log('Hệ thống Taxi đã sẵn sàng!');
            return this;
        } catch (error) {
            console.error('Lỗi khởi tạo:', error);
            this.showError('Không thể khởi động hệ thống. Vui lòng tải lại trang.');
        }
    }
    
    initDriverId() {
        let storedId = localStorage.getItem('tx_id');
        if (!storedId) {
            // Tạo ID ngẫu nhiên: TX-XXXX (VD: TX-A7B2)
            storedId = 'TX-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            localStorage.setItem('tx_id', storedId);
        }
        this.driverId = storedId;
        
        // Cập nhật ID lên các vị trí trong HTML
        ['idShow', 'profileID', 'zaloDriverId'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.driverId;
        });
    }

    initMap() {
        try {
            // Mặc định view về Hà Nội nếu chưa có GPS
            this.map = L.map('map', { 
                zoomControl: false, 
                attributionControl: false 
            }).setView([21.0285, 105.8542], 15);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
            
            // Icon xe taxi (SM-Marker)
            const taxiIcon = L.divIcon({ 
                className: 'taxi-marker-icon', 
                html: `<div class="marker-pin"></div>`,
                iconSize: [30, 30]
            });
            
            this.marker = L.marker([21.0285, 105.8542], { icon: taxiIcon }).addTo(this.map);
        } catch (e) {
            console.error("Lỗi bản đồ:", e);
        }
    }

    // ==================== QUẢN LÝ GÓI CƯỚC & HẠN DÙNG ====================

    loadTrialStatus() {
        const userPkg = JSON.parse(localStorage.getItem('user_package'));
        const trialStart = localStorage.getItem('trial_start') || Date.now();
        
        if (!localStorage.getItem('trial_start')) {
            localStorage.setItem('trial_start', trialStart);
        }

        if (userPkg) {
            this.updatePackageDisplay(userPkg);
        } else {
            // Xử lý gói dùng thử 7 ngày
            const daysUsed = Math.floor((Date.now() - trialStart) / (1000 * 60 * 60 * 24));
            const daysLeft = Math.max(0, 7 - daysUsed);
            
            const badge = document.getElementById('planShow');
            if (daysLeft > 0) {
                badge.innerHTML = `⭐ DÙNG THỬ: ${daysLeft} NGÀY`;
                badge.className = "badge status-trial";
            } else {
                badge.innerHTML = `⚠️ HẾT HẠN`;
                badge.className = "badge status-expired";
            }
        }
    }

    canStartTrip() {
        const userPkg = JSON.parse(localStorage.getItem('user_package'));
        if (userPkg) return true; // Đã mua gói thì không giới hạn

        // Gói Free: Kiểm tra giới hạn 3 chuyến/ngày
        if (this.dailyTrips >= this.tripLimit) {
            this.showError(`Gói Miễn Phí giới hạn ${this.tripLimit} chuyến/ngày. Vui lòng nâng cấp để không giới hạn!`);
            return false;
        }
        return true;
    }

    activatePackage(packageInfo) {
        const days = packageInfo.days || 30;
        const expiryDate = Date.now() + (days * 24 * 60 * 60 * 1000);
        
        const data = {
            ...packageInfo,
            expiry: expiryDate,
            activatedDate: Date.now()
        };
        
        localStorage.setItem('user_package', JSON.stringify(data));
        this.updatePackageDisplay(data);
        return data;
    }

    updatePackageDisplay(pkg) {
        const planShow = document.getElementById('planShow');
        if (planShow) {
            planShow.innerHTML = `💎 ${pkg.name}`;
            planShow.style.color = "#f1c40f";
        }
        // Ẩn quảng cáo nếu đã mua gói
        const ad = document.getElementById('adBanner');
        if (ad) ad.style.display = 'none';
    }

    // ==================== XỬ LÝ CHUYẾN ĐI ====================

    updateDisplay() {
        const kmEl = document.getElementById('km');
        const costEl = document.getElementById('cost');
        
        if (kmEl) kmEl.textContent = this.totalKm.toFixed(2);
        if (costEl) {
            const currentCost = Math.round(this.totalKm * this.currentRate);
            costEl.textContent = currentCost.toLocaleString('vi-VN');
        }
    }

    saveTrip(distance, cost) {
        const trip = {
            id: Date.now(),
            date: new Date().toLocaleDateString('vi-VN'),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            km: distance.toFixed(2),
            cost: cost,
            rate: this.currentRate
        };

        const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
        history.unshift(trip);
        localStorage.setItem('trip_history', JSON.stringify(history.slice(0, 50))); // Lưu 50 chuyến gần nhất
        
        this.dailyTrips++;
        localStorage.setItem('daily_trips_count', this.dailyTrips);
        
        this.loadHistory();
        this.loadStatistics();
    }

    // ==================== GIAO DIỆN & LỊCH SỬ ====================

    loadHistory() {
        const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
        const list = document.getElementById('historyList');
        if (!list) return;

        list.innerHTML = history.map(t => `
            <div class="history-card">
                <div class="h-info">
                    <b>${t.time}</b> - <small>${t.date}</small><br>
                    <span>${t.km} KM (Giá: ${t.rate.toLocaleString()}đ)</span>
                </div>
                <div class="h-price">${t.cost.toLocaleString()}đ</div>
            </div>
        `).join('') || '<p style="text-align:center; padding:20px; color:#999;">Chưa có chuyến đi nào</p>';
    }

    loadStatistics() {
        const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
        const totalKm = history.reduce((sum, t) => sum + parseFloat(t.km), 0);
        const totalMoney = history.reduce((sum, t) => sum + t.cost, 0);

        if(document.getElementById('totalTrips')) document.getElementById('totalTrips').textContent = history.length;
        if(document.getElementById('totalKm')) document.getElementById('totalKm').textContent = totalKm.toFixed(1);
        if(document.getElementById('totalEarned')) document.getElementById('totalEarned').textContent = totalMoney.toLocaleString() + 'đ';
    }

    // ==================== CÔNG CỤ ====================

    selectPackage(price, id, name, element) {
        this.selectedPackage = { price, id, name };
        
        // Highlight thẻ được chọn
        document.querySelectorAll('.p-card').forEach(el => el.classList.remove('active'));
        element.classList.add('active');

        // Tạo mã QR thanh toán (VietQR/BIDV)
        const content = `NAP ${this.driverId} ${id}`;
        document.getElementById('qrContent').textContent = content;
        
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`BIDV|4430269669|NGUYEN XUAN DAT|${price}|${content}`)}`;
        document.getElementById('qrImg').src = qrUrl;
    }

    selectDefaultPackage() {
        const firstPkg = document.querySelector('.p-card');
        if (firstPkg) firstPkg.click();
    }

    checkDailyTrips() {
        const savedDate = localStorage.getItem('daily_trips_date');
        const today = new Date().toDateString();
        
        if (savedDate !== today) {
            this.dailyTrips = 0;
            localStorage.setItem('daily_trips_date', today);
            localStorage.setItem('daily_trips_count', 0);
        } else {
            this.dailyTrips = parseInt(localStorage.getItem('daily_trips_count') || 0);
        }
    }

    showError(msg) {
        // Có thể dùng Toast hoặc Alert tùy anh
        alert(msg);
    }
}
