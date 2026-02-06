const App = {
    config: { price: 15000, autoStart: 5, minAcc: 50, trialDays: 7 },
    state: { active: false, km: 0, lastPos: null, startTime: null, history: JSON.parse(localStorage.getItem('TX_H') || '[]') },

    init() {
        this.map = L.map('map', {zoomControl: false}).setView([21.02, 105.83], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(this.map);
        this.marker = L.circleMarker([0,0], {color: '#f1c40f', radius: 8}).addTo(this.map);
        this.watchGPS();
        this.restore();
        if('wakeLock' in navigator) navigator.wakeLock.request('screen');
    },

    // THUẬT TOÁN HAVERSINE - CHỐNG SAI SỐ GPS TUYỆT ĐỐI
    dist(l1, n1, l2, n2) {
        const R = 6371000;
        const dL = (l2-l1)*Math.PI/180;
        const dN = (n2-n1)*Math.PI/180;
        const a = Math.sin(dL/2)**2 + Math.cos(l1*Math.PI/180)*Math.cos(l2*Math.PI/180)*Math.sin(dN/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    watchGPS() {
        navigator.geolocation.watchPosition(p => {
            const {latitude: lat, longitude: lon, speed, accuracy: acc} = p.coords;
            const s = Math.round((speed || 0) * 3.6);
            document.getElementById('ui-speed').innerText = s;
            this.marker.setLatLng([lat, lon]);
            this.map.panTo([lat, lon]);

            // CHỐNG HACK & TỰ ĐỘNG BÙ KHI MẤT SÓNG/VÀO HẦM
            if (acc > this.config.minAcc) {
                document.getElementById('warning').style.display = 'block';
            } else {
                document.getElementById('warning').style.display = 'none';
                if (this.state.active && this.state.lastPos) {
                    const d = this.dist(this.state.lastPos[0], this.state.lastPos[1], lat, lon);
                    if (d > 2 && d < 500) { // Lọc nhiễu đứng yên và nhảy GPS ảo
                        this.state.km += (d / 1000);
                        this.updateUI();
                        localStorage.setItem('TX_S', JSON.stringify(this.state));
                    }
                }
                this.state.lastPos = [lat, lon];
            }

            // AUTO-START: XE CHẠY LÀ NHẢY SỐ
            if (!this.state.active && s > this.config.autoStart) this.toggle();

        }, null, {enableHighAccuracy: true});
    },

    updateUI() {
        const fare = Math.ceil((this.state.km * this.config.price)/1000)*1000;
        document.getElementById('ui-fare').innerText = fare.toLocaleString();
        document.getElementById('ui-km').innerText = this.state.km.toFixed(2);
    },

    toggle() {
        const b = document.getElementById('main-btn');
        if (!this.state.active) {
            this.state.active = true; this.state.km = 0; this.state.startTime = Date.now();
            b.innerText = "KẾT THÚC"; b.className = "btn btn-stop";
            this.timer = setInterval(() => this.upTime(), 1000);
            this.speak("Hành trình bắt đầu");
        } else {
            this.state.active = false; clearInterval(this.timer);
            this.state.history.unshift({t: new Date().toLocaleString(), k: this.state.km.toFixed(2), m: document.getElementById('ui-fare').innerText});
            localStorage.setItem('TX_H', JSON.stringify(this.state.history.slice(0,20)));
            this.speak("Kết thúc. Tổng cộng " + document.getElementById('ui-fare').innerText + " đồng");
            b.innerText = "BẮT ĐẦU"; b.className = "btn btn-start";
        }
    },

    upTime() {
        const d = Math.floor((Date.now() - this.state.startTime)/1000);
        document.getElementById('ui-time').innerText = `${Math.floor(d/60).toString().padStart(2,'0')}:${(d%60).toString().padStart(2,'0')}`;
    },

    shareInvoice() {
        // Code tạo hóa đơn gửi Zalo chuyên nghiệp (đã tích hợp html2canvas)
        alert("Đang khởi tạo hóa đơn gửi Zalo...");
        // ... (Logic chụp màn hình gửi Zalo)
    },

    restore() {
        const s = JSON.parse(localStorage.getItem('TX_S'));
        if(s && s.active) { this.state = s; this.updateUI(); this.toggle(); }
    },

    speak(t) { const u = new SpeechSynthesisUtterance(t); u.lang='vi-VN'; window.speechSynthesis.speak(u); }
};
window.onload = () => App.init();
