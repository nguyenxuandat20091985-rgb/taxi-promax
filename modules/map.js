mapInstance: null,
markers: [],
trackLine: null,

// Initialize map
init: function(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error('Map container not found:', containerId);
        return false;
    }
    
    // Set default options
    const defaultOptions = {
        center: CONFIG.MAP.DEFAULT_CENTER,
        zoom: CONFIG.MAP.DEFAULT_ZOOM,
        interactive: false // For demo, real maps would be interactive
    };
    
    const mapOptions = { ...defaultOptions, ...options };
    
    // Create simulated map
    this.mapInstance = {
        container: container,
        options: mapOptions,
        center: mapOptions.center,
        zoom: mapOptions.zoom
    };
    
    this.updateMapDisplay();
    return true;
},

// Update map display
updateMapDisplay: function() {
    if (!this.mapInstance) return;
    
    const { container, center, zoom } = this.mapInstance;
    
    // Create simple map visualization for demo
    container.innerHTML = `
        <div class="map-simulation" style="width: 100%; height: 100%; position: relative; background: linear-gradient(145deg, #e6f2ff, #cce5ff); border-radius: 8px; overflow: hidden;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                <i class="fas fa-map-marked-alt" style="font-size: 48px; color: var(--primary-color); margin-bottom: 10px;"></i>
                <p style="color: #666;">Bản đồ theo dõi trực tuyến</p>
                <p style="font-size: 12px; color: #999;">Tọa độ: ${center[0].toFixed(4)}, ${center[1].toFixed(4)} | Zoom: ${zoom}</p>
            </div>
            
            <!-- Simulated route line -->
            <div style="position: absolute; top: 30%; left: 20%; width: 60%; height: 2px; background: ${CONFIG.MAP.TRACK_COLOR}; transform: rotate(45deg);"></div>
            
            <!-- Simulated markers -->
            <div style="position: absolute; top: 30%; left: 20%; width: 12px; height: 12px; background: ${CONFIG.MAP.MARKER_COLOR}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
            <div style="position: absolute; bottom: 30%; right: 20%; width: 12px; height: 12px; background: ${CONFIG.MAP.MARKER_COLOR}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
            
            <!-- Current position marker -->
            <div class="current-marker" style="position: absolute; top: 50%; left: 50%; width: 16px; height: 16px; background: #dc3545; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(220,53,69,0.5); transform: translate(-50%, -50%);"></div>
        </div>
    `;
},

// Set center
setCenter: function(lat, lng) {
    if (!this.mapInstance) return;
    
    this.mapInstance.center = [lat, lng];
    this.updateMapDisplay();
},

// Add marker
addMarker: function(lat, lng, options = {}) {
    const marker = {
        id: 'marker-' + Date.now() + '-' + Math.random(),
        position: [lat, lng],
        options: options
    };
    
    this.markers.push(marker);
    this.updateMapDisplay();
    
    return marker.id;
},

// Remove marker
removeMarker: function(markerId) {
    this.markers = this.markers.filter(m => m.id !== markerId);
    this.updateMapDisplay();
},

// Clear all markers
clearMarkers: function() {
    this.markers = [];
    this.updateMapDisplay();
},

// Add track line
addTrack: function(positions, options = {}) {
    this.trackLine = {
        positions: positions,
        options: {
            color: CONFIG.MAP.TRACK_COLOR,
            weight: 3,
            ...options
        }
    };
    
    this.updateMapDisplay();
},

// Clear track
clearTrack: function() {
    this.trackLine = null;
    this.updateMapDisplay();
},

// Fit bounds to include all markers
fitBounds: function() {
    if (this.markers.length === 0) return;
    
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    
    this.markers.forEach(marker => {
        const [lat, lng] = marker.position;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
    });
    
    // Calculate center
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    this.setCenter(centerLat, centerLng);
},

// Get distance between two points on map (simulated)
getDistance: function(lat1, lng1, lat2, lng2) {
    // Simple calculation for demo
    const latDiff = Math.abs(lat1 - lat2);
    const lngDiff = Math.abs(lng1 - lng2);
    
    // Rough approximation: 1 degree ≈ 111km
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
    
    return distance;
},

// Get estimated time
getEstimatedTime: function(distanceKm, speedKmh = 30) {
    if (speedKmh <= 0) return 0;
    return (distanceKm / speedKmh) * 60; // in minutes
},

// Show route between two points
showRoute: function(startLat, startLng, endLat, endLng) {
    // Clear existing markers and track
    this.clearMarkers();
    this.clearTrack();
    
    // Add markers
    this.addMarker(startLat, startLng, { title: 'Điểm đón' });
    this.addMarker(endLat, endLng, { title: 'Điểm đến' });
    
    // Add track line
    this.addTrack([
        [startLat, startLng],
        [endLat, endLng]
    ]);
    
    // Fit bounds
    this.fitBounds();
    
    // Calculate distance
    const distance = this.getDistance(startLat, startLng, endLat, endLng);
    
    return {
        distance: distance,
        estimatedTime: this.getEstimatedTime(distance),
        points: 2
    };
},

// Update current position
updateCurrentPosition: function(lat, lng, heading = null) {
    if (!this.mapInstance) return;
    
    this.setCenter(lat, lng);
    
    // Update current marker position in simulation
    const currentMarker = document.querySelector('.current-marker');
    if (currentMarker) {
        // In real map, this would update the marker position
        // For demo, we just update the coordinates display
        const coordDisplay = document.querySelector('.map-simulation p:nth-child(3)');
        if (coordDisplay) {
            coordDisplay.textContent = `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)} | Zoom: ${this.mapInstance.zoom}`;
        }
    }
    
    // Add to track if tracking
    if (App.isRunning && App.currentTrip) {
        if (!this.trackLine) {
            this.trackLine = {
                positions: [],
                options: {
                    color: CONFIG.MAP.TRACK_COLOR,
                    weight: 3
                }
            };
        }
        
        this.trackLine.positions.push([lat, lng]);
        this.updateMapDisplay();
    }
},

// Export map data
exportData: function() {
    return {
        center: this.mapInstance ? this.mapInstance.center : null,
        zoom: this.mapInstance ? this.mapInstance.zoom : null,
        markers: this.markers,
        track: this.trackLine
    };
},

// Import map data
importData: function(data) {
    if (data.center) {
        this.setCenter(data.center[0], data.center[1]);
    }
    
    if (data.markers) {
        this.markers = data.markers;
    }
    
    if (data.track) {
        this.trackLine = data.track;
    }
    
    this.updateMapDisplay();
}
