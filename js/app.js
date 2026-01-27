/* app.js - Hệ thống điều hành Taxi ProMax v5.1 */
const TaxiApp = {
    isRunning: false,
    tripData: { distance: 0, fare: 0, startTime: null, waitTime: 0 },
    lastCoords: null,
    watchID: null,
    timerID: null,

    // 1. Khởi động cuốc xe
    start() {
        const license = Security.getLicense();
        if (license.expired) return alert("Gói của anh đã hết hạn. Hãy nạp tiền để tiếp tục!");

        this.isRunning = true;
        this.tripData = { distance: 0, fare: TAXI_CONFIG.TARIFF.BASE_FEE, startTime: Date.now(), waitTime: 0 };
        this.lastCoords = null;
        
        // Bật GPS vệ tinh
        this.watchID = navigator.geolocation.watchPosition(
            (pos) => this.updateLocation(pos),
            (err) => alert("Lỗi GPS: Anh hãy bật vị trí trên điện thoại!"),
            { enableHighAccuracy: true, maximumAge: 0 }
        );

        // Chạy đồng hồ đếm thời gian (tính tiền chờ)
        this.timerID = setInterval(() => this.updateTimer(), 1000);
        this.updateUI();
    },

    // 2. Xử lý di chuyển và tính Km
    updateLocation(pos) {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        if (accuracy > 30) return; // Bỏ qua nếu nhiễu sóng

        if (this.lastCoords) {
            const d = this.calculateDistance(this.lastCoords.lat, this.lastCoords.lng, latitude, longitude);
            // Lọc nhiễu: chỉ tính nếu di chuyển trên 5m và tốc độ dưới 150km/h
            if (d > 0.005 && d < 0.5) {
                this.tripData.distance += d;
                this.calculateFare();
                this.updateUI();
            }
        }
        this.lastCoords = { lat: latitude, lng: longitude };
    },

    // 3. Tính tiền dựa trên Km + Thời gian chờ
    calculateFare() {
        const config = TAXI_CONFIG.TARIFF;
        let total = config.BASE_FEE + (this.tripData.distance * config.PRICE_PER_KM);
        
        // Cộng thêm tiền chờ (nếu có)
        total += (this.tripData.waitTime / 60) * config.PRICE_PER_MINUTE;
        
        this.tripData.fare = Math.round(total);
    },

    // 4. Cập nhật giao diện (Màn hình tài xế)
    updateUI() {
        document.getElementById('display-fare').innerText = this.tripData.fare.toLocaleString('vi-VN') + " VNĐ";
        document.getElementById('display-km').innerText = this.tripData.distance.toFixed(2);
        
        const minutes = Math.floor((Date.now() - this.tripData.startTime) / 60000);
        const seconds = Math.floor(((Date.now() - this.tripData.startTime) % 60000) / 1000);
        document.getElementById('display-time').innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    },

    updateTimer() {
        if (!this.isRunning) return;
        this.updateUI();
    },

    // 5. Kết thúc cuốc xe và lưu vào sổ
    stop() {
        this.isRunning = false;
        navigator.geolocation.clearWatch(this.watchID);
        clearInterval(this.timerID);
        
        // Lưu vào lịch sử (Storage)
        Storage.saveTrip({
            distance: this.tripData.distance,
            fare: this.tripData.fare,
            duration: document.getElementById('display-time').innerText
        });

        alert(`Cuốc xe kết thúc! \nTổng: ${this.tripData.fare.toLocaleString()} VNĐ`);
    },

    // Công thức Haversine tính Km chuẩn quốc tế
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
};
