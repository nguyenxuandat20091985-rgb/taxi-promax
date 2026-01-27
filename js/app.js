const taxiApp = {
    isRunning: false,
    distance: parseFloat(localStorage.getItem('saved_dist')) || 0,
    lastCoords: null,
    basePrice: 12000,   // Giá mở cửa (anh tự sửa số này)
    pricePerKm: 15000,  // Giá mỗi Km (anh tự sửa số này)
    watchID: null,

    startTrip() {
        this.isRunning = true;
        this.distance = 0;
        localStorage.setItem('trip_active', 'true');
        this.updateUI();
        this.watchID = navigator.geolocation.watchPosition(
            (pos) => this.handleGPS(pos),
            (err) => alert("Anh bật GPS lên mới tính tiền được nhé!"),
            { enableHighAccuracy: true, maximumAge: 0 }
        );
    },

    handleGPS(pos) {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > 30) return; // Bỏ qua nếu sóng GPS yếu để tránh tiền nhảy ảo

        if (this.lastCoords) {
            const d = this.calculateDist(this.lastCoords.lat, this.lastCoords.lng, latitude, longitude);
            if (d > 0.01) { // Chỉ tính khi xe di chuyển trên 10m
                this.distance += d;
                localStorage.setItem('saved_dist', this.distance);
                this.updateUI();
            }
        }
        this.lastCoords = { lat: latitude, lng: longitude };
    },

    calculateDist(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    },

    updateUI() {
        const fare = this.basePrice + (this.distance * this.pricePerKm);
        document.getElementById('meter-km').innerText = this.distance.toFixed(2);
        document.getElementById('meter-fare').innerText = Math.round(fare).toLocaleString('vi-VN') + " VNĐ";
    },

    stopTrip() {
        this.isRunning = false;
        localStorage.removeItem('trip_active');
        navigator.geolocation.clearWatch(this.watchID);
    }
};
