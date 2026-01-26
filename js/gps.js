// Initialize GPS
init: function() {
    if (!navigator.geolocation) {
        console.error('Geolocation is not supported by this browser.');
        return false;
    }
    return true;
},

// Start tracking
startTracking: function(onUpdate) {
    if (this.isTracking) {
        console.warn('GPS tracking already started');
        return false;
    }
    
    const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    };
    
    this.positions = [];
    this.totalDistance = 0;
    this.startTime = new Date();
    this.isTracking = true;
    
    // Start watching position
    this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePositionUpdate(position, onUpdate),
        (error) => this.handlePositionError(error),
        options
    );
    
    console.log('GPS tracking started');
    return true;
},

// Stop tracking
stopTracking: function() {
    if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
    }
    
    this.isTracking = false;
    console.log('GPS tracking stopped');
    return this.getTripSummary();
},

// Handle position update
handlePositionUpdate: function(position, callback) {
    this.currentPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed || 0,
        heading: position.coords.heading,
        timestamp: position.timestamp || Date.now()
    };
    
    // Add to positions history
    this.positions.push({ ...this.currentPosition });
    
    // Calculate distance from previous position
    if (this.positions.length > 1) {
        const prevPos = this.positions[this.positions.length - 2];
        const distance = this.calculateDistance(
            prevPos.latitude, prevPos.longitude,
            this.currentPosition.latitude, this.currentPosition.longitude
        );
        
        if (distance < 0.1) { // Filter out small movements (less than 100m)
            this.totalDistance += distance;
        }
    }
    
    // Call callback with updated data
    if (typeof callback === 'function') {
        callback(this.currentPosition, this.totalDistance);
    }
},

// Handle position error
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
            break;
    }
    
    console.error('GPS Error:', errorMessage);
    
    // Show error to user
    if (typeof this.onError === 'function') {
        this.onError(errorMessage);
    }
},

// Calculate distance between two coordinates in kilometers (Haversine formula)
calculateDistance: function(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
},

// Convert degrees to radians
toRad: function(degrees) {
    return degrees * (Math.PI / 180);
},

// Get current trip duration in seconds
getTripDuration: function() {
    if (!this.startTime) return 0;
    return Math.floor((new Date() - this.startTime) / 1000);
},

// Get formatted trip duration
getFormattedDuration: function() {
    const seconds = this.getTripDuration();
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return {
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: secs.toString().padStart(2, '0'),
        formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    };
},

// Get trip summary
getTripSummary: function() {
    const duration = this.getTripDuration();
    const formattedDuration = this.getFormattedDuration();
    
    return {
        distance: this.totalDistance,
        duration: duration,
        formattedDuration: formattedDuration.formatted,
        positions: [...this.positions],
        startTime: this.startTime,
        endTime: new Date(),
        averageSpeed: duration > 0 ? (this.totalDistance / (duration / 3600)) : 0
    };
},

// Get current speed in km/h
getCurrentSpeed: function() {
    if (!this.currentPosition) return 0;
    return this.currentPosition.speed ? this.currentPosition.speed * 3.6 : 0; // Convert m/s to km/h
},

// Get address from coordinates (simulated - in real app, use reverse geocoding API)
getAddressFromCoords: function(lat, lng, callback) {
    // Simulated addresses for demo
    const addresses = [
        '123 Đường Lê Lợi, Quận 1, TP.HCM',
        '456 Đường Nguyễn Huệ, Quận 1, TP.HCM',
        '789 Đường Cách Mạng Tháng 8, Quận 3, TP.HCM',
        '321 Đường Phạm Văn Đồng, Thủ Đức, TP.HCM'
    ];
    
    // Return a random address for demo
    const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];
    
    if (typeof callback === 'function') {
        setTimeout(() => callback(randomAddress), 500);
    }
    
    return randomAddress;
},

// Check if in peak hour
isPeakHour: function() {
    const now = new Date();
    const currentHour = now.getHours();
    
    for (const peak of CONFIG.PRICING.PEAK_HOURS) {
        if (currentHour >= peak.start && currentHour < peak.end) {
            return true;
        }
    }
    
    return false;
},

// Get estimated time to destination (simulated)
getEstimatedTime: function(distanceKm, currentSpeed) {
    if (currentSpeed <= 0) return 0;
    return (distanceKm / currentSpeed) * 60; // in minutes
}
