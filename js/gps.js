// js/gps.js - Module GPS Tracking chính xác cao
class GPSTracker {
    constructor(taxiSystem) {
        this.taxiSystem = taxiSystem;
        this.watchId = null;
        this.wakeLock = null;
        this.isTracking = false;
        this.lastUpdateTime = 0;
    }
    
    async startTracking() {
        if (!("geolocation" in navigator)) {
            this.taxiSystem.showError("Trình duyệt của bạn không hỗ trợ GPS.");
            return false;
        }
        
        try {
            // Giữ màn hình luôn sáng (Wake Lock)
            await this.requestWakeLock();
            
            // Theo dõi vị trí với cấu hình tối ưu nhất cho Mobile
            this.watchId = navigator.geolocation.watchPosition(
                (position) => this.handlePositionUpdate(position),
                (error) => this.handlePositionError(error),
                {
                    enableHighAccuracy: true, // Bật GPS độ chính xác cao
                    maximumAge: 0,            // Không dùng vị trí cũ trong bộ nhớ đệm
                    timeout: 5000             // Thử lại sau mỗi 5s nếu mất tín hiệu
                }
            );
            
            this.isTracking = true;
            return true;
        } catch (error) {
            console.error('Lỗi khởi động GPS:', error);
            return false;
        }
    }
    
    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.releaseWakeLock();
        this.isTracking = false;
        this.updateScreenStatus("BÌNH THƯỜNG");
    }

    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                this.updateScreenStatus("LUÔN SÁNG (ON)");
                
                // Tự động yêu cầu lại nếu bị mất (khi quay lại từ tab khác)
                this.wakeLock.addEventListener('release', () => {
                    if (this.isTracking) this.requestWakeLock();
                });
            } catch (err) {
                console.warn("WakeLock thất bại:", err.message);
            }
        }
    }

    releaseWakeLock() {
        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
    }

    handlePositionUpdate(position) {
        const { latitude, longitude, speed, accuracy } = position.coords;
        const now = Date.now();

        // 1. LỌC NHIỄU: Nếu sai số quá lớn (> 30m) thì bỏ qua tọa độ này
        if (accuracy > 30) return;

        // 2. GIỚI HẠN TẦN SUẤT: Chỉ xử lý nếu cách lần trước ít nhất 1 giây
        if (now - this.lastUpdateTime < 1000) return;
        this.lastUpdateTime = now;

        const newPos = L.latLng(latitude, longitude);

        // Cập nhật vị trí Marker xe trên bản đồ
        if (this.taxiSystem.marker) {
            this.taxiSystem.marker.setLatLng(newPos);
        }

        // Nếu đang trong chuyến đi (isRunning = true)
        if (this.taxiSystem.isRunning) {
            // Tự động xoay bản đồ theo hướng di chuyển
            if (this.taxiSystem.map) {
                this.taxiSystem.map.panTo(newPos);
            }

            if (this.taxiSystem.lastPos) {
                // Tính khoảng cách (đơn vị: mét)
                const distanceMeters = newPos.distanceTo(this.taxiSystem.lastPos);
                
                /* 3. THUẬT TOÁN CHỐNG NHẢY KM: 
                   - Chỉ cộng dồn nếu di chuyển > 5m (loại bỏ rung lắc GPS khi đứng yên)
                   - Hoặc vận tốc đo được > 1km/h
                */
                const currentSpeedKmH = (speed || 0) * 3.6;
                
                if (distanceMeters > 5 || currentSpeedKmH > 1) {
                    const distanceKm = distanceMeters / 1000;
                    this.taxiSystem.totalKm += distanceKm;
                    
                    // Cập nhật hiển thị tiền và km ngay lập tức
                    if (typeof this.taxiSystem.updateDisplay === 'function') {
                        this.taxiSystem.updateDisplay();
                    }
                }
            }
            this.taxiSystem.lastPos = newPos;
        }
    }

    handlePositionError(error) {
        let msg = "";
        switch(error.code) {
            case 1: msg = "Vui lòng cho phép quyền truy cập GPS!"; break;
            case 2: msg = "Không tìm thấy tín hiệu GPS. Hãy ra chỗ thoáng."; break;
            case 3: msg = "Hết thời gian chờ GPS."; break;
        }
        if (msg) this.taxiSystem.showError(msg);
    }

    updateScreenStatus(status) {
        const el = document.getElementById('screenStatus');
        if (el) el.textContent = status;
    }
}
