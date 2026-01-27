/**
 * TAXI PROMAX - HỆ THỐNG TÍNH TIỀN THÔNG MINH
 * PHÁT TRIỂN BỞI: NGUYEN XUAN DAT
 */

const TaxiApp = {
    isRunning: false,
    watchID: null,
    timerID: null,
    lastCoords: null,
    customBaseFare: 0, // Lưu giá thỏa thuận cuốc vẫy
    tripData: {
        distance: 0,
        fare: 0,
        startTime: null,
        waitTime: 0
    },

    // 1. HÀM THỎA THUẬN GIÁ (Dành cho cuốc vẫy linh hoạt)
    setCustomPrice() {
        let price = prompt("Nhập số tiền đã thỏa thuận với khách (VNĐ):", "");
        
        if (price === null || price === "") {
            alert("Anh chưa nhập giá, hệ thống sẽ dùng giá mở cửa mặc định!");
            this.customBaseFare = TAXI_CONFIG.TARIFF.BASE_FEE; 
        } else {
            // Loại bỏ ký tự không phải số và chuyển thành số nguyên
            this.customBaseFare = parseInt(price.replace(/\D/g,''));
            alert("✅ Đã chốt giá: " + this.customBaseFare.toLocaleString() + " VNĐ");
        }
        
        // Hiển thị ngay số tiền lên vòng tròn trung tâm
        document.getElementById('display-fare').innerText = this.customBaseFare.toLocaleString('vi-VN') + " VNĐ";
        const statusLabel = document.getElementById('trip-status');
        if(statusLabel) {
            statusLabel.innerText = "ĐÃ CHỐT GIÁ";
            statusLabel.style.color = "#e84393"; // Màu hồng nổi bật
        }
    },

    // 2. BẮT ĐẦU CHUYẾN ĐI
    start() {
        if (this.isRunning) return;

        // Kiểm tra giấy phép (Gói cước)
        const license = Security.getLicense();
        if (license.expired) {
            alert("Gói cước của anh đã hết hạn. Vui lòng nạp tiền để tiếp tục!");
            return window.location.href = 'payment.html';
        }

        this.isRunning = true;
        // Sử dụng giá thỏa thuận nếu có, nếu không dùng giá mở cửa trong config
        const startFare = (this.customBaseFare > 0) ? this.customBaseFare : TAXI_CONFIG.TARIFF.BASE_FEE;

        this.tripData = {
            distance: 0,
            fare: startFare,
            startTime: Date.now(),
            waitTime: 0
        };

        this.lastCoords = null;
        
        // Kích hoạt định vị GPS thời gian thực
        this.watchID = navigator.geolocation.watchPosition(
            (pos) => this.updateLocation(pos),
            (err) => console.error("Lỗi GPS: ", err),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

        // Chạy đồng hồ đếm thời gian
        this.timerID = setInterval(() => this.updateTimer(), 1000);
        
        this.updateUI();
        console.log("Cuốc xe bắt đầu với giá: " + startFare);
    },

    // 3. CẬP NHẬT VỊ TRÍ VÀ TÍNH QUÃNG ĐƯỜNG
    updateLocation(position) {
        if (!this.isRunning) return;

        const { latitude, longitude, speed } = position.coords;
        const currentCoords = { latitude, longitude };

        if (this.lastCoords) {
            const dist = this.calculateDistance(this.lastCoords, currentCoords);
            // Chỉ tính nếu di chuyển trên 5 mét để tránh nhiễu GPS
            if (dist > 0.005) {
                this.tripData.distance += dist;
                this.calculateFare();
                this.updateUI();
            }
        }
        this.lastCoords = currentCoords;
    },

    // 4. CÔNG THỨC TÍNH TIỀN
    calculateFare() {
        const config = TAXI_CONFIG.TARIFF;
        // Tổng tiền = Giá thỏa thuận ban đầu + (Số Km chạy thêm * Đơn giá Km)
        // Lưu ý: Giá thỏa thuận thường đã bao gồm 1km đầu
        let total = this.tripData.fare + (this.tripData.distance * config.PRICE_PER_KM);
        
        // Cộng thêm tiền chờ nếu xe dừng lâu (dưới 5km/h)
        total += (this.tripData.waitTime / 60) * config.PRICE_PER_MINUTE;
        
        document.getElementById('display-fare').innerText = Math.round(total).toLocaleString('vi-VN') + " VNĐ";
    },

    // 5. CÔNG THỨC TÍNH KHOẢNG CÁCH (Haversine)
    calculateDistance(p1, p2) {
        const R = 6371; // Bán kính Trái đất (km)
        const dLat = (p2.latitude - p1.latitude) * Math.PI / 180;
        const dLon = (p2.longitude - p1.longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(p1.latitude * Math.PI / 180) * Math.cos(p2.latitude * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },

    // 6. CẬP NHẬT ĐỒNG HỒ VÀ GIAO DIỆN
    updateTimer() {
        if (!this.isRunning) return;
        const elapsed = Math.floor((Date.now() - this.tripData.startTime) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        
        const timeDisplay = document.getElementById('display-time');
        if (timeDisplay) timeDisplay.innerText = `${m}:${s}`;
    },

    updateUI() {
        document.getElementById('display-km').innerText = this.tripData.distance.toFixed(2) + " Km";
    },

    // 7. KẾT THÚC CHUYẾN
    stop() {
        if (!this.isRunning) return;
        if (confirm("Anh có chắc muốn kết thúc chuyến xe và thu tiền khách?")) {
            this.isRunning = false;
            navigator.geolocation.clearWatch(this.watchID);
            clearInterval(this.timerID);
            
            // Lưu lịch sử (Sẽ phát triển ở bản PRO)
            alert("Cuốc xe kết thúc! Tổng thu: " + document.getElementById('display-fare').innerText);
            
            // Reset dữ liệu về 0 cho cuốc sau
            this.customBaseFare = 0;
        }
    }
};
