/**
 * TAXI PROMAX - CORE LOGIC 2026 (DEVICE SECURITY VERSION)
 * Phát triển bởi: NGUYỄN XUÂN ĐẠT
 */

const App = {
    config: { price: 15000, autoStart: 5, minAcc: 50 },
    state: { 
        active: false, 
        km: 0, 
        lastPos: null, 
        history: JSON.parse(localStorage.getItem('trip_history') || '[]') 
    },

    init() {
        // 1. Tạo hoặc lấy Mã ID thiết bị (Chống dùng chung tài khoản)
        if (!localStorage.getItem('deviceId')) {
            const newId = 'PRO-' + Math.random().toString(36).substring(2, 9).toUpperCase();
            localStorage.setItem('deviceId', newId);
        }

        const phone = localStorage.getItem('userPhone');
        if (!phone) {
            document.getElementById('regModal').style.display = 'flex';
            return;
        }
        document.getElementById('regModal').style.display = 'none';

        this.initMap();
        this.watchGPS();
        this.updateHeaderUI(phone);
        this.bindEvents();
        
        console.log("Hệ thống sẵn sàng. Thiết bị: " + localStorage.getItem('deviceId'));
    },

    initMap() {
        // Tọa độ Hạ Long của anh Đạt
        this.map = L.map('map', {zoomControl: false, attributionControl: false}).setView([20.95, 107.05], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        
        const carIcon = L.divIcon({ 
            className: 'pulsating-circle',
            html: `<div style="width:18px;height:18px;background:#0054a3;border-radius:50%;border:3px solid white;box-shadow: 0 0 15px rgba(0,0,0,0.4);"></div>` 
        });
        this.marker = L.marker([20.95, 107.05], { icon: carIcon }).addTo(this.map);
    },

    bindEvents() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(btn => {
            btn.onclick = () => {
                const label = btn.innerText.trim();
                if (label.includes("Trang chủ")) window.showTab('home', btn);
                else if (label.includes("Ví tiền")) window.showTab('vi', btn);
                else if (label.includes("Lịch sử")) window.showTab('lichsu', btn);
                else if (label.includes("Tôi")) window.showTab('toi', btn);
            };
        });
    },

    watchGPS() {
        navigator.geolocation.watchPosition(p => {
            const {latitude: lat, longitude: lon, accuracy: acc} = p.coords;
            const newPos = L.latLng(lat, lon);
            this.marker.setLatLng(newPos);
            
            if (!this.state.lastPos) this.map.setView(newPos, 16);

            if (acc <= this.config.minAcc && this.state.active && this.state.lastPos) {
                const d = this.map.distance(this.state.lastPos, newPos);
                if (d > 3 && d < 300) { 
                    this.state.km += (d / 1000);
                    this.updateStats();
                }
            }
            this.state.lastPos = newPos;
        }, null, { enableHighAccuracy: true });
    },

    updateStats() {
        const fare = Math.round(this.state.km * this.config.price);
        document.getElementById('km').innerText = this.state.km.toFixed(2);
        document.getElementById('cost').innerText = fare.toLocaleString();
    },

    updateHeaderUI(phone) {
        const dId = localStorage.getItem('deviceId');
        // Hiển thị SĐT và Mã thiết bị để anh dễ quản lý
        document.getElementById('idShow').innerText = "🆔 " + phone;
        if(document.getElementById('profilePhone')) document.getElementById('profilePhone').innerText = phone;
        if(document.getElementById('profileID')) document.getElementById('profileID').innerText = dId;
    }
};

// --- CÁC HÀM TOÀN CỤC ---
window.showTab = function(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    if (tabId !== 'home') {
        const target = document.getElementById('tab-' + tabId);
        if (target) target.style.display = 'block';
    }
    if (btn) btn.classList.add('active');
};

window.processRegistration = () => {
    const phone = document.getElementById('regPhone').value;
    if (phone.length >= 10) {
        localStorage.setItem('userPhone', phone);
        // Khi đăng ký, gán luôn mã máy hiện tại
        console.log("Đã kích hoạt cho máy: " + localStorage.getItem('deviceId'));
        location.reload();
    } else {
        alert("Anh nhập thiếu số điện thoại rồi!");
    }
};

window.handleTrip = () => {
    App.state.active = !App.state.active;
    const btn = document.getElementById('mainBtn');
    if (App.state.active) {
        App.state.km = 0;
        btn.innerText = "KẾT THÚC CHUYẾN ĐI";
        btn.style.background = "#d32f2f";
    } else {
        btn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
        btn.style.background = "#00bfa5";
    }
};

window.updateRate = (val) => {
    App.config.price = parseInt(val);
    document.getElementById('rateVal').innerText = App.config.price.toLocaleString() + "đ";
};

window.onload = () => App.init();
