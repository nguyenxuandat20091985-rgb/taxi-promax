// js/gps.js - Module GPS Tracking
class GPSTracker {
    constructor(taxiSystem) {
        this.taxiSystem = taxiSystem;
        this.watchId = null;
        this.wakeLock = null;
        this.isTracking = false;
    }
    
    async startTracking() {
        if (!("geolocation" in navigator)) {
            this.taxiSystem.showError("Trình duyệt không hỗ trợ GPS");
            return false;
        }
        
        try {
            // Request wake lock
            await this.requestWakeLock();
            
            // Start GPS watch
            this.watchId = navigator.geolocation.watchPosition(
                (position) => this.handlePositionUpdate(position),
                (error) => this.handlePositionError(error),
                {
                    enableHighAccuracy: true,
                    maximumAge: 1000,
                    timeout: 10000
                }
            );
            
            this.isTracking = true;
            return true;
            
        } catch (error) {
            console.error('Start tracking error:', error);
            this.taxiSystem.showError("Lỗi khởi động GPS: " + error.message);
            return false;
        }
    }
    
    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        if (this.wakeLock !== null) {
            this.wakeLock.release();
            this.wakeLock = null;
        }
        
        this.isTracking = false;
        
        // Reset screen status
        document.getElementById('screenStatus').textContent = "BÌNH THƯỜNG";
    }
    
    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                document.getElementById('screenStatus').textContent = "LUÔN SÁNG (ON)";
                return true;
            }
        } catch (err) {
            console.warn("WakeLock không khả dụng:", err);
        }
        return false;
    }
    
    handlePositionUpdate(position) {
        try {
            const { latitude, longitude, speed, accuracy } = position.coords;
            
            // Kiểm tra độ chính xác GPS
            if (accuracy > 50) { // Độ chính xác kém (>50m)
                console.log("GPS độ chính xác thấp:", accuracy);
                return;
            }
            
            const newPos = L.latLng(latitude, longitude);
            
            // Cập nhật marker
            if (this.taxiSystem.marker) {
                this.taxiSystem.marker.setLatLng(newPos);
            }
            
            if (this.taxiSystem.isRunning) {
                // Pan map đến vị trí mới
                if (this.taxiSystem.map) {
                    this.taxiSystem.map.panTo(newPos);
                }
                
                // Tính khoảng cách di chuyển
                if (this.taxiSystem.lastPos) {
                    // Chỉ tính nếu có tốc độ di chuyển > 0.5 km/h
                    const minSpeed = 0.5 / 3.6; // Convert km/h to m/s
                    if (speed === null || speed > minSpeed) {
                        const distance = newPos.distanceTo(this.taxiSystem.lastPos) / 1000; // Convert to km
                        
                        // Chống nhảy số: chỉ tính nếu di chuyển > 10m
                        if (distance > 0.01) {
                            this.taxiSystem.totalKm += distance;
                            this.taxiSystem.updateDisplay();
                        }
                    }
                }
                
                this.taxiSystem.lastPos = newPos;
            }
        } catch (error) {
            console.error('Position update error:', error);
        }
    }
    
    handlePositionError(error) {
        console.error('GPS Error:', error);
        let message = "Lỗi GPS: ";
        
        switch(error.code) {
            case error.PERMISSION_DENIED:
                message += "Bị từ chối quyền truy cập";
                break;
            case error.POSITION_UNAVAILABLE:
                message += "Không thể lấy vị trí";
                break;
            case error.TIMEOUT:
                message += "Hết thời gian chờ";
                break;
            default:
                message += error.message;
        }
        
        this.taxiSystem.showError(message);
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        // Haversine formula để tính khoảng cách giữa 2 điểm
        const R = 6371; // Bán kính Trái đất tính bằng km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!("geolocation" in navigator)) {
                reject(new Error("Geolocation không được hỗ trợ"));
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        speed: position.coords.speed
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }
    
    isLocationAccurate(accuracy) {
        // Độ chính xác dưới 50m được coi là tốt
        return accuracy <= 50;
    }
}
