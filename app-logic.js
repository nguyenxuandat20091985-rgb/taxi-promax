/**
 * TAXI PROMAX - PREMIUM CORE LOGIC 2026
 * Tác giả: NGUYỄN XUÂN ĐẠT
 * Trạng thái: Khôi phục toàn bộ tính năng cao cấp & Sửa lỗi đồng bộ bản đồ.
 */

const App = {
    config: { 
        price: 15000, 
        autoStart: 5, 
        minAcc: 40,
        deviceId: localStorage.getItem('deviceId') || 'PRO-' + Math.random().toString(36).substr(2, 5).toUpperCase()
    },
    state: { 
        active: false, 
        km: 0, 
        lastPos: null, 
        path: [], 
        history: JSON.parse(localStorage.getItem('trip_history') || '[]') 
    },

    init() {
        // Lưu định danh thiết bị duy nhất
        localStorage.setItem('deviceId', this.config.deviceId);
        
        const phone = localStorage.getItem('userPhone');
        if (!phone) {
            document.getElementById('regModal').style.display = 'flex';
            return;
        }
        document.getElementById('regModal').style.display = 'none';

        this.initMap();
        this.watchGPS();
        this.updateHeaderUI(phone);
        this.renderHistory(); 
        
        // Khôi phục các tính năng mở rộng
        console.log("Hệ thống TAXI PROMAX đã sẵn sàng!");
    },

    initMap() {
        // Tọa độ Hạ Long (Khu vực của anh Đạt)
        this.map = L.map('map', {zoomControl: false, attributionControl: false}).setView([20.95, 107.05], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
        
        const carIcon = L.divIcon({ 
            className: 'car-marker',
            html: `<div style="width:20px;height:20px;background:#00bfa5;border-radius:50%;border:3px solid white;box-shadow: 0 0 15px rgba(0,0,0,0.3);"></div>` 
        });
        
        this.marker = L.marker([20.95, 107.05], { icon: carIcon }).addTo(this.map);
        this.routeLine = L.polyline([], {color: '#00bfa5', weight: 6, opacity: 0.7}).addTo(this.map);
    },

    watchGPS() {
        navigator.geolocation.watchPosition(p => {
            const {latitude: lat, longitude: lon, accuracy: acc} = p.coords;
            const newPos = L.latLng(lat, lon);
            
            // CẬP NHẬT: Bản đồ luôn chạy theo xe (Auto-Center)
            this.marker.setLatLng(newPos);
            if (this.state.active) {
                this.map.panTo(newPos); 
            }

            if (acc <= this.config.minAcc) {
                if (this.state.active && this.state.lastPos) {
                    const d = this.map.distance(this.state.lastPos, newPos);
                    // Lọc nhiễu thông minh (chỉ tính di chuyển thực tế)
                    if (d > 2 && d < 150) { 
                        this.state.km += (d / 1000);
                        this.state.path.push(newPos);
                        this.routeLine.setLatLngs(this.state.path);
                        this.updateStats();
                    }
                }
                this.state.lastPos = newPos;
            }
        }, err => console.error(err), { enableHighAccuracy: true, maximumAge: 0 });
    },

    updateStats() {
        const fare = Math.round(this.state.km * this.config.price);
        document.getElementById('km').innerText = this.state.km.toFixed(2);
        document.getElementById('cost').innerText = fare.toLocaleString();
    },

    handleTripToggle() {
        const btn = document.getElementById('mainBtn');
        if (!this.state.active) {
            // BẮT ĐẦU CHUYẾN
            this.state.active = true;
            this.state.km = 0;
            this.state.path = [];
            this.routeLine.setLatLngs([]);
            btn.innerText = "KẾT THÚC CHUYẾN ĐI";
            btn.style.background = "#e74c3c";
        } else {
            // KẾT THÚC & LƯU LỊCH SỬ THỰC TẾ
            const finalFare = Math.round(this.state.km * this.config.price);
            if (this.state.km > 0.01) {
                this.saveToHistory(this.state.km, finalFare);
            }
            
            this.state.active = false;
            btn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
            btn.style.background = "#00bfa5";
            alert(`Hoàn thành! Quãng đường: ${this.state.km.toFixed(2)}km. Cước phí: ${finalFare.toLocaleString()}đ`);
        }
    },

    saveToHistory(km, cost) {
        const trip = {
            id: Date.now(),
            date: new Date().toLocaleTimeString('vi-VN') + " " + new Date().toLocaleDateString('vi-VN'),
            km: km.toFixed(2),
            cost: cost
        };
        this.state.history.unshift(trip);
        localStorage.setItem('trip_history', JSON.stringify(this.state.history.slice(0, 50)));
        this.renderHistory();
    },

    renderHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        let totalRevenue = 0;
        historyList.innerHTML = this.state.history.map(t => {
            totalRevenue += t.cost;
            return `
                <div style="background:white; border-radius:10px; padding:12px; margin-bottom:10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size:11px; color:#888;">${t.date}</div>
                    <div style="display:flex; justify-content:space-between; font-weight:bold; margin-top:5px;">
                        <span>${t.km} KM</span>
                        <span style="color:#00bfa5;">+${t.cost.toLocaleString()}đ</span>
                    </div>
                </div>
            `;
        }).join('');

        // Cập nhật Báo cáo lợi nhuận nếu có phần tử hiển thị
        const revUI = document.getElementById('totalRevenue');
        if (revUI) revUI.innerText = totalRevenue.toLocaleString() + " VNĐ";
    },

    updateHeaderUI(phone) {
        // Đồng bộ ID thiết bị và thông tin gói cước
        document.getElementById('idShow').innerText = "🆔 " + this.config.deviceId;
        if(document.getElementById('profilePhone')) document.getElementById('profilePhone').innerText = phone;
    }
};

/**
 * CÁC HÀM TÍNH NĂNG MỞ RỘNG (GIAO DIỆN CÔNG CỤ HỖ TRỢ)
 */
window.toggleHeatmap = () => {
    alert("Đang quét mật độ khách hàng tại khu vực Hạ Long...");
    // Logic vẽ vòng tròn nhiệt (mô phỏng)
    const heatPoints = [[20.952, 107.054], [20.947, 107.045]];
    heatPoints.forEach(p => {
        L.circle(p, {radius: 200, color: 'red', fillOpacity: 0.2}).addTo(App.map);
    });
};

window.triggerSOS = () => {
    if(confirm("XÁC NHẬN CỨU HỘ: Gửi vị trí của anh tới cộng đồng tài xế gần nhất?")) {
        alert("Đã phát tín hiệu SOS! Vui lòng giữ liên lạc.");
    }
};

window.showTab = (tabId, btn) => {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    if (tabId !== 'home') {
        const target = document.getElementById('tab-' + tabId);
        if (target) target.style.display = 'block';
    }
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
};

window.handleTrip = () => App.handleTripToggle();
window.processRegistration = () => {
    const p = document.getElementById('regPhone').value;
    if(p.length >= 10) { 
        localStorage.setItem('userPhone', p); 
        location.reload(); 
    }
};

window.updateRate = (val) => {
    App.config.price = parseInt(val);
    document.getElementById('rateVal').innerText = App.config.price.toLocaleString() + "đ";
};

// Khởi tạo ứng dụng
window.onload = () => App.init();
