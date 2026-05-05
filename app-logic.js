/**
 * TAXI PROMAX - CORE LOGIC 2026 (FINAL SYNC)
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 * Tính năng: Chống sai số GPS, Auto-Start, Voice Assistant, Admin Sync.
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
        
        // 1. Kiểm tra đăng ký (Đồng bộ với UI của anh)
        const phone = localStorage.getItem('userPhone');
        if (!phone) {
            document.getElementById('regModal').style.display = 'flex';
            return;
        }

        // 2. Kiểm tra hạn dùng
        if (!this.checkLicense()) return;

        // 3. Khởi tạo bản đồ chuyên nghiệp
        this.initMap();

        // 4. Các tính năng hệ thống
        this.watchGPS();
        this.restoreSession();
        this.initAdminSync(); // Kết nối với letet.html qua Firebase
        this.keepScreenAlive();
        
        // Cập nhật giao diện ID
        this.updateHeaderUI(phone);
    },

    initMap() {
        this.map = L.map('map', {zoomControl: false, attributionControl: false}).setView([16.047, 108.206], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        
        // Marker tùy chỉnh kiểu Xanh SM/Grab
        const carIcon = L.divIcon({ 
            className: 'pulsating-circle',
            html: '<div style="width:18px;height:18px;background:#0054a3;border-radius:50%;border:3px solid white;box-shadow: 0 0 15px rgba(0,0,0,0.4);"></div>' 
        });
        this.marker = L.marker([0,0], { icon: carIcon }).addTo(this.map);
    },

    checkLicense() {
        const expiry = localStorage.getItem('tp_expiry');
        const now = Date.now();
        if (!expiry || now > parseInt(expiry)) {
            this.speak("Ứng dụng hết hạn, anh vui lòng nạp thêm gói cước.");
            showTab('vi'); // Tự động chuyển sang tab ví để tài xế nạp tiền
            return false;
        }
        return true;
    },

    watchGPS() {
        navigator.geolocation.watchPosition(p => {
            const {latitude: lat, longitude: lon, speed, accuracy: acc} = p.coords;
            const currentSpeed = Math.round((speed || 0) * 3.6); 
            
            // Cập nhật vị trí marker
            const newPos = L.latLng(lat, lon);
            this.marker.setLatLng(newPos);
            if (!this.state.lastPos) this.map.setView(newPos, 16);

            // THUẬT TOÁN CHỐNG NHIỄU GPS ĐẶC QUYỀN CỦA ANH ĐẠT
            if (acc <= this.config.minAcc) {
                if (this.state.active && this.state.lastPos) {
                    const d = this.map.distance(this.state.lastPos, newPos);
                    // Lọc nhiễu: Chỉ tính khi di chuyển từ 3m - 300m giữa 2 lần quét
                    if (d > 3 && d < 300) { 
                        this.state.km += (d / 1000);
                        this.updateStats();
                        // Lưu trạng thái liên tục phòng khi sập nguồn
                        localStorage.setItem('TX_CURRENT_SESSION', JSON.stringify(this.state));
                    }
                }
                this.state.lastPos = newPos;
            }

            // TÍNH NĂNG AUTO-START
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
            // BẮT ĐẦU
            this.state.active = true;
            this.state.km = 0;
            this.state.startTime = Date.now();
            btn.innerText = "KẾT THÚC CHUYẾN ĐI";
            btn.style.background = "#d32f2f";
            this.speak("Bắt đầu tính cước. Chúc anh Đạt lái xe an toàn.");
        } else {
            // KẾT THÚC
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
        if (typeof renderHistory === "function") renderHistory(); 
    },

    initAdminSync() {
        if (typeof firebase !== 'undefined') {
            firebase.database().ref('currentEvent').on('value', (snapshot) => {
                const mode = snapshot.val();
                if (mode === 'tet') {
                    document.body.classList.add('tet-mode');
                    this.speak("Hệ thống đã chuyển sang chế độ Tết.");
                } else {
                    document.body.classList.remove('tet-mode');
                }
            });
        }
    },

    restoreSession() {
        const saved = JSON.parse(localStorage.getItem('TX_CURRENT_SESSION'));
        if (saved && saved.active) {
            this.state = saved;
            this.state.active = true;
            this.updateStats();
            document.getElementById('mainBtn').innerText = "KẾT THÚC CHUYẾN ĐI";
            document.getElementById('mainBtn').style.background = "#d32f2f";
        }
    },

    updateHeaderUI(phone) {
        document.getElementById('idShow').innerText = "🆔 " + phone;
        document.getElementById('profilePhone').innerText = phone;
        const plan = localStorage.getItem('current_plan') || 'DÙNG THỬ';
        document.getElementById('planShow').innerText = "⭐ GÓI: " + plan;
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

// Khởi chạy đồng bộ
window.onload = () => App.init();
