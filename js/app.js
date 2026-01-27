/* app.js - Bộ điều khiển tính tiền cuốc vẫy */
const taxiApp = {
    isRunning: false,
    distance: 0,
    startTime: null,
    basePrice: 12000, // Giá mở cửa
    pricePerKm: 15000, // Giá mỗi km tiếp theo
    watchID: null,

    // Bắt đầu tính tiền khi khách lên xe
    startTrip() {
        this.isRunning = true;
        this.distance = 0;
        this.startTime = new Date();
        
        // Bắt đầu đo GPS
        this.watchID = navigator.geolocation.watchPosition(
            (position) => {
                // Tính quãng đường thực tế khi xe di chuyển
                this.updateDistance(position.coords.latitude, position.coords.longitude);
            },
            (err) => console.error("Lỗi GPS: ", err),
            { enableHighAccuracy: true }
        );
        alert("▶️ Đã bắt đầu cuốc xe!");
    },

    // Tính tiền dựa trên Km thực tế
    calculateFare() {
        let total = this.basePrice + (this.distance * this.pricePerKm);
        return total.toLocaleString('vi-VN') + " VNĐ";
    },

    stopTrip() {
        this.isRunning = false;
        navigator.geolocation.clearWatch(this.watchID);
        alert("🏁 Kết thúc! Tổng tiền: " + this.calculateFare());
    }
};
