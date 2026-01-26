// Taxi Promax v5.1 - GPS Tracking
const GPS = {
    currentPosition: null,
    watchId: null,
    isTracking: false,
    positions: [],
    startTime: null,
    totalDistance: 0,
    
    init: function() {
        if (!navigator.geolocation) {
            console.error('Geolocation không được hỗ trợ');
            return false;
        }
        return true;
    },
    
    startTracking: function(onUpdate) {
        if (this.isTracking) return false;
        
        const options = {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        };
        
        this.positions = [];
        this.totalDistance = 0;
        this.startTime = new Date();
        this.isTracking = true;
        
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePositionUpdate(position, onUpdate),
            (error) => this.handlePositionError(error),
            options
        );
        
        return true;
    },
    
    stopTracking: function() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        this.isTracking = false;
        return this.getTripSummary();
    },
    
    handlePositionUpdate: function(position, callback) {
        this.currentPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || 0,
            timestamp: position.timestamp || Date.now()
        };
        
        this.positions.push({ ...this.currentPosition });
        
        if (this.positions.length > 1) {
            const prevPos = this.positions[this.positions.length - 2];
            const distance = this.calculateDistance(
                prevPos.latitude, prevPos.longitude,
                this.currentPosition.latitude, this.currentPosition.longitude
            );
            
            if (distance < 0.1) {
                this.totalDistance += distance;
            }
        }
        
        if (typeof callback === 'function') {
            callback(this.currentPosition, this.totalDistance);
        }
    },
    
    handlePositionError: function(error) {
        let errorMessage = 'Không thể lấy vị trí: ';
        switch(error.code) {
            case error.PERMISSION_DENIED:
                errorMessage += 'Người dùng từ chối cho phép định vị.';
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage += 'Thông tin vị trí không có sẵn.';
                break;
            case error.TIMEOUT:
                errorMessage += 'Hết thời gian chờ lấy vị trí.';
                break;
            default:
                errorMessage += 'Lỗi không xác định.';
        }
        console.error('GPS Error:', errorMessage);
    },
    
    calculateDistance: function(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    },
    
    toRad: function(degrees) {
        return degrees * (Math.PI / 180);
    },
    
    getTripDuration: function() {
        if (!this.startTime) return 0;
        return Math.floor((new Date() - this.startTime) / 1000);
    },
    
    getFormattedDuration: function() {
        const seconds = this.getTripDuration();
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return {
            formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        };
    },
    
    getTripSummary: function() {
        const duration = this.getTripDuration();
        return {
            distance: this.totalDistance,
            duration: duration,
            formattedDuration: this.getFormattedDuration().formatted,
            positions: [...this.positions],
            startTime: this.startTime,
            endTime: new Date()
        };
    },
    
    getCurrentSpeed: function() {
        if (!this.currentPosition) return 0;
        return this.currentPosition.speed ? this.currentPosition.speed * 3.6 : 0;
    },
    
    getAddressFromCoords: function(lat, lng, callback) {
        const addresses = [
            '123 Đường Lê Lợi, Quận 1, TP.HCM',
            '456 Đường Nguyễn Huệ, Quận 1, TP.HCM',
            '789 Đường Cách Mạng Tháng 8, Quận 3, TP.HCM'
        ];
        
        const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
        
        if (typeof callback === 'function') {
            setTimeout(() => callback(randomAddress), 500);
        }
        
        return randomAddress;
    }
};
