/**
 * TAXI PROMAX - CORE LOGIC 2026
 * Phát triển bởi: Nguyễn Xuân Đạt
 * Hệ thống tính cước thông minh & Chống sai số GPS
 */

const App = {
    config: { 
        price: 15000,     // Giá cước mỗi KM
        autoStart: 5,     // Vận tốc tự khởi động (km/h)
        minAcc: 50,       // Độ sai số GPS tối đa (mét)
        trialDays: 7      // Ngày dùng thử mặc định
    },
    state: { 
        active: false, 
        km: 0, 
        lastPos: null, 
        startTime: null, 
        history: JSON.parse(localStorage.getItem('TX_H') || '[]') 
    },

    init() {
        // 1. Kiểm tra bản quyền/Hạn dùng trước khi chạy
        if (!this.checkLicense()) return;

        // 2. Khởi tạo bản đồ (Dark Mode chuyên nghiệp)
        this.map = L.map('map', {zoomControl: false, attributionControl: false}).setView([21.02, 105.83], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(this.map);
        
        // Marker xe di chuyển
        this.marker = L.circleMarker([0,0], {
            color: '#00bfa5', 
            fillColor: '#f1c40f', 
            fillOpacity: 1, 
            radius: 8, 
            weight: 3
        }).addTo(this.map);

        this.watchGPS();
        this.restore();
        this.initFirebase(); // Kết nối bộ điều khiển Tết

        // Giữ màn hình luôn sáng khi lái xe
        if('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').catch(() => console.log("WakeLock chưa bật"));
        }
    },

    // KIỂM TRA HẠN DÙNG (Kết nối với dữ liệu nạp tiền từ payment.js)
    checkLicense() {
        const expiry = localStorage.getItem('tp_expiry');
        const now = new Date().getTime();

        if (!expiry) {
            // Nếu là lần đầu, tặng 7 ngày dùng thử
            const trial = now + (this.config.trialDays * 24 * 60 * 60 * 1000);
            localStorage.setItem('tp_expiry', trial);
            return true;
        }

        if (now > parseInt(expiry)) {
            this.speak("Ứng dụng đã hết hạn. Anh Đạt vui lòng nạp thêm để tiếp tục sử dụng.");
            alert("Hết hạn sử dụng! Mời anh sang tab Ví Tiền để gia hạn.");
            // Chuyển sang Tab ví tiền (nếu có id tab)
            return false;
        }
        return true;
    },

    // THUẬT TOÁN HAVERSINE - TÍNH QUÃNG ĐƯỜNG CHUẨN MÉT
    dist(l1, n1, l2, n2) {
        const R = 6371000; // Bán kính trái đất (mét)
        const dL = (l2-l1)*Math.PI/180;
        const dN = (n2-n1)*Math.PI/180;
        const a = Math.sin(dL/2)**2 + Math.cos(l1*Math.PI/180)*Math.cos(l2*Math.PI/180)*Math.sin(dN/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    watchGPS() {
        navigator.geolocation.watchPosition(p => {
            const {latitude: lat, longitude: lon, speed, accuracy: acc} = p.coords;
            const s = Math.round((speed || 0) * 3.6); // Chuyển sang km/h
            
            // Cập nhật UI tốc độ
            const speedEl = document.getElementById('ui-speed');
            if(speedEl) speedEl.innerText = s;

            this.marker.setLatLng([lat, lon]);
            this.map.panTo([lat, lon]);

            // CHỐNG NHIỄU KHI DỪNG ĐÈN ĐỎ & TỰ ĐỘNG BÙ KHI MẤT SÓNG
            if (acc > this.config.minAcc) {
                const warn = document.getElementById('warning');
                if(warn) warn.style.display = 'block';
            } else {
                const warn = document.getElementById('warning');
                if(warn) warn.style.display = 'none';

                if (this.state.active && this.state.lastPos) {
                    const d = this.dist(this.state.lastPos[0], this.state.lastPos[1], lat, lon);
                    // Chỉ tính khi di chuyển > 2m và < 500m (loại bỏ nhảy vọt GPS ảo)
                    if (d > 2 && d < 500) { 
                        this.state.km += (d / 1000);
                        this.updateUI();
                        // Lưu trạng thái chuyến đi liên tục (phòng khi App bị tắt đột ngột)
                        localStorage.setItem('TX_S', JSON.stringify(this.state));
                    }
                }
                this.state.lastPos = [lat, lon];
            }

            // AUTO-START: XE LĂN BÁNH TRÊN 5KM/H LÀ TỰ BẬT CƯỚC
            if (!this.state.active && s > this.config.autoStart) {
                this.toggle();
            }

        }, (err) => console.error("GPS Error:", err), {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        });
    },

    updateUI() {
        // Tính tiền theo KM, làm tròn lên nghìn đồng
        const fare = Math.ceil((this.state.km * this.config.price)/1000)*1000;
        const fareEl = document.getElementById('ui-fare');
        const kmEl = document.getElementById('ui-km');
        
        if(fareEl) fareEl.innerText = fare.toLocaleString();
        if(kmEl) kmEl.innerText = this.state.km.toFixed(2);
    },

    toggle() {
        const b = document.getElementById('main-btn');
        if (!this.state.active) {
            // BẮT ĐẦU CHUYẾN
            this.state.active = true; 
            this.state.km = 0; 
            this.state.startTime = Date.now();
            if(b) {
                b.innerText = "KẾT THÚC";
                b.style.background = "#ff5252"; // Đổi sang màu đỏ
            }
            this.timer = setInterval(() => this.upTime(), 1000);
            this.speak("Chúc anh Đạt vạn dặm bình an");
        } else {
            // KẾT THÚC CHUYẾN
            this.state.active = false; 
            clearInterval(this.timer);
            const totalFare = document.getElementById('ui-fare').innerText;
            
            // Lưu lịch sử
            this.state.history.unshift({
                t: new Date().toLocaleString('vi-VN'), 
                k: this.state.km.toFixed(2), 
                m: totalFare
            });
            localStorage.setItem('TX_H', JSON.stringify(this.state.history.slice(0,20)));
            localStorage.removeItem('TX_S'); // Xóa trạng thái chuyến cũ

            this.speak(`Kết thúc hành trình. Tổng cước ${totalFare} đồng.`);
            
            if(b) {
                b.innerText = "BẮT ĐẦU";
                b.style.background = "#00bfa5"; // Về màu xanh
            }
        }
    },

    upTime() {
        const d = Math.floor((Date.now() - this.state.startTime)/1000);
        const timeEl = document.getElementById('ui-time');
        if(timeEl) {
            timeEl.innerText = `${Math.floor(d/60).toString().padStart(2,'0')}:${(d%60).toString().padStart(2,'0')}`;
        }
    },

    // KẾT NỐI BỘ ĐIỀU KHIỂN TẾT (Từ letet.html)
    initFirebase() {
        // Kiểm tra xem Firebase đã được load ở index chưa
        if (typeof firebase !== 'undefined') {
            firebase.database().ref('currentEvent').on('value', (snapshot) => {
                const mode = snapshot.val();
                const body = document.body;
                if (mode === 'tet') {
                    body.style.border = "5px solid red"; // Hiện viền đỏ Chế độ Tết
                    console.log("Đã bật chế độ Tết");
                } else {
                    body.style.border = "none";
                }
            });
        }
    },

    restore() {
        const s = JSON.parse(localStorage.getItem('TX_S'));
        if(s && s.active) { 
            this.state = s; 
            this.updateUI(); 
            // Khôi phục đồng hồ thời gian
            this.timer = setInterval(() => this.upTime(), 1000);
            const b = document.getElementById('main-btn');
            if(b) {
                b.innerText = "KẾT THÚC";
                b.style.background = "#ff5252";
            }
        }
    },

    speak(t) { 
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(t); 
            u.lang='vi-VN'; 
            u.rate = 1.1;
            window.speechSynthesis.speak(u); 
        }
    }
};

// Khởi chạy khi tải xong trang
window.onload = () => App.init();
