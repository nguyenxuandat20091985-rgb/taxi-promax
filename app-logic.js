/**
 * TAXI PROMAX - CORE LOGIC 2026 (FINAL SYNC)
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 * Trạng thái: Đã đồng bộ với hệ thống đăng ký và thanh toán mới.
 */

const App = {
    config: { 
        price: 15000,     
        autoStart: 5,     // Tốc độ (km/h) để tự kích hoạt chuyến
        minAcc: 50,       // Mét sai số tối đa
        trialDays: 7      
    },
    state: { 
        active: false, 
        km: 0, 
        lastPos: null, 
        startTime: null, 
        history: JSON.parse(localStorage.getItem('trip_history') || '[]') 
    },

    init() {
        console.log("Hệ thống Taxi ProMax đang khởi động...");
        
        // 1. Kiểm tra đăng ký
        const phone = localStorage.getItem('userPhone');
        if (!phone) {
            document.getElementById('regModal').style.display = 'flex';
            return;
        } else {
            document.getElementById('regModal').style.display = 'none';
        }

        // 2. Khởi tạo bản đồ
        this.initMap();

        // 3. Các tính năng hệ thống
        this.watchGPS();
        this.restoreSession();
        this.keepScreenAlive();
        
        // Cập nhật giao diện ID và gói cước
        this.updateHeaderUI(phone);
    },

    initMap() {
        // Khởi tạo tại vị trí mặc định nếu chưa có GPS
        this.map = L.map('map', {zoomControl: false, attributionControl: false}).setView([16.047, 108.206], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        
        const carIcon = L.divIcon({ 
            className: 'pulsating-circle',
            html: '<div style="width:18px;height:18px;background:#0054a3;border-radius:50%;border:3px solid white;box-shadow: 0 0 15px rgba(0,0,0,0.4);"></div>' 
        });
        this.marker = L.marker([16.047, 108.206], { icon: carIcon }).addTo(this.map);
    },

    watchGPS() {
        navigator.geolocation.watchPosition(p => {
            const {latitude: lat, longitude: lon, speed, accuracy: acc} = p.coords;
            const currentSpeed = Math.round((speed || 0) * 3.6); 
            
            const newPos = L.latLng(lat, lon);
            this.marker.setLatLng(newPos);
            
            // Nếu là lần quét đầu tiên, đưa bản đồ về vị trí tài xế
            if (!this.state.lastPos) {
                this.map.setView(newPos, 16);
                this.state.lastPos = newPos;
            }

            // Thuật toán chống nhiễu
            if (acc <= this.config.minAcc) {
                if (this.state.active && this.state.lastPos) {
                    const d = this.map.distance(this.state.lastPos, newPos);
                    if (d > 3 && d < 300) { 
                        this.state.km += (d / 1000);
                        this.updateStats();
                        localStorage.setItem('TX_CURRENT_SESSION', JSON.stringify(this.state));
                    }
                }
                this.state.lastPos = newPos;
            }

            // Tự động bắt đầu nếu chạy nhanh
            if (!this.state.active && currentSpeed > this.config.autoStart) {
                this.handleTripToggle();
            }

        }, err => console.error(err), { enableHighAccuracy: true });
    },

    updateStats() {
        const fare = Math.round(this.state.km * this.config.price);
        document.getElementById('km').innerText = this.state.km.toFixed(2);
        document.getElementById('cost').innerText = fare.toLocaleString();
    },

    handleTripToggle() {
        const btn = document.getElementById('mainBtn');
        if (!this.state.active) {
            this.state.active = true;
            this.state.km = 0;
            this.state.startTime = Date.now();
            btn.innerText = "KẾT THÚC CHUYẾN ĐI";
            btn.style.background = "#d32f2f";
            this.speak("Bắt đầu tính cước. Chúc anh lái xe an toàn.");
        } else {
            this.state.active = false;
            const finalFare = Math.round(this.state.km * this.config.price);
            this.saveToHistory(this.state.km, finalFare);
            
            btn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
            btn.style.background = "#00bfa5";
            this.speak(`Kết thúc chuyến đi. Tổng cộng ${finalFare.toLocaleString()} đồng.`);
            localStorage.removeItem('TX_CURRENT_SESSION');
        }
    },

    saveToHistory(km, cost) {
        const trip = {
            time: new Date().toLocaleTimeString('vi-VN') + " " + new Date().toLocaleDateString('vi-VN'),
            km: km.toFixed(2),
            cost: cost.toLocaleString()
        };
        this.state.history.unshift(trip);
        localStorage.setItem('trip_history', JSON.stringify(this.state.history.slice(0, 20)));
        this.renderHistory();
    },

    renderHistory() {
        const historyDiv = document.getElementById('historyList');
        if (!historyDiv) return;
        historyDiv.innerHTML = this.state.history.map(t => `
            <div class="p-card" style="background:white; color:#333; margin-bottom:10px; padding:10px;">
                <small>${t.time}</small>
                <div style="display:flex; justify-content:space-between; font-weight:bold;">
                    <span>${t.km} km</span>
                    <span style="color:#e74c3c;">${t.cost}đ</span>
                </div>
            </div>
        `).join('');
    },

    restoreSession() {
        const saved = JSON.parse(localStorage.getItem('TX_CURRENT_SESSION'));
        if (saved && saved.active) {
            this.state = saved;
            this.updateStats();
            const btn = document.getElementById('mainBtn');
            btn.innerText = "KẾT THÚC CHUYẾN ĐI";
            btn.style.background = "#d32f2f";
        }
    },

    updateHeaderUI(phone) {
        if(document.getElementById('idShow')) document.getElementById('idShow').innerText = "🆔 " + phone;
        if(document.getElementById('profilePhone')) document.getElementById('profilePhone').innerText = phone;
        if(document.getElementById('profileID')) document.getElementById('profileID').innerText = "TX-" + phone.slice(-4);
    },

    keepScreenAlive() {
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').catch(() => {});
        }
    },

    speak(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(text);
            msg.lang = 'vi-VN';
            window.speechSynthesis.speak(msg);
        }
    }
};

/** * CÁC HÀM TOÀN CỤC ĐỂ INDEX.HTML GỌI ĐƯỢC
 */
window.processRegistration = function() {
    const phone = document.getElementById('regPhone').value;
    if (phone.length >= 10) {
        localStorage.setItem('userPhone', phone);
        // Tặng gói dùng thử 7 ngày cho lần đầu đăng ký
        if (!localStorage.getItem('tp_expiry')) {
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            localStorage.setItem('tp_expiry', Date.now() + sevenDays);
            localStorage.setItem('active_plan_name', "DÙNG THỬ (7D)");
        }
        location.reload(); 
    } else {
        alert("Anh vui lòng nhập đúng số điện thoại!");
    }
};

window.clearRegistration = function() {
    if (confirm("Anh có chắc muốn đăng xuất và xóa dữ liệu không?")) {
        localStorage.clear();
        location.reload();
    }
};

window.showTab = function(tabId, btn) {
    // Ẩn tất cả tab
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    // Hiện tab được chọn (Trang chủ thì không có tab-content riêng vì nó là bản đồ)
    if (tabId !== 'home') {
        const target = document.getElementById('tab-' + tabId);
        if (target) target.classList.add('active');
    }
    // Đổi màu nút menu
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    if (tabId === 'lichsu') App.renderHistory();
};

window.handleTrip = () => App.handleTripToggle();
window.updateRate = (val) => {
    App.config.price = parseInt(val);
    document.getElementById('rateVal').innerText = App.config.price.toLocaleString() + "đ";
};

// Khởi chạy
window.onload = () => App.init();
