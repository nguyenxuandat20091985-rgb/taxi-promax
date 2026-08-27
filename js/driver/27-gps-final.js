// Extracted from index.html; load order is intentionally preserved.
(function(){
    'use strict';
    
    // Override handleTrip để force start GPS
    var _origHandleTrip = window.handleTrip;
    window.handleTrip = function() {
        console.log('🚕 [GPS FINAL] handleTrip called');
        var result = _origHandleTrip ? _origHandleTrip.apply(this, arguments) : undefined;
        
        // Force start GPS tracking
        setTimeout(function() {
            forceStartGPSTracking();
        }, 500);
        
        return result;
    };
    
    // Force start GPS tracking
    function forceStartGPSTracking() {
        console.log('🚕 [GPS FINAL] Starting GPS tracking...');
        
        // Reset lastValidPos
        if (typeof lastValidPos !== 'undefined') {
            lastValidPos = null;
            lastValidTime = 0;
        }
        
        // Stop existing watchPosition if any
        if (window._gpsWatchId) {
            navigator.geolocation.clearWatch(window._gpsWatchId);
        }
        
        // Start new watchPosition with aggressive settings
        window._gpsWatchId = navigator.geolocation.watchPosition(
            function(position) {
                processGPSUpdate(position);
            },
            function(error) {
                console.error('🚕 [GPS FINAL] GPS error:', error.message);
                if (error.code === 1) {
                    showToast('⚠️ GPS bị từ chối. Vui lòng cấp quyền vị trí!', 'error');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
        
        console.log('🚕 [GPS FINAL] GPS watchPosition started, ID:', window._gpsWatchId);
    }
    
    // Process GPS update - simplified và aggressive hơn
    function processGPSUpdate(position) {
        if (!isRunning) return;
        
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        var acc = position.coords.accuracy || 999;
        var ts = position.timestamp || Date.now();
        
        console.log('🚕 [GPS FINAL] GPS update:', lat.toFixed(5), lng.toFixed(5), 'acc:', acc);
        
        // Update current position
        if (typeof currentLat !== 'undefined') {
            currentLat = lat;
            currentLng = lng;
        }
        
        // Update marker
        if (typeof updateDriverMarker === 'function') {
            updateDriverMarker(lat, lng, true);
        }
        
        // Tính km - logic đơn giản và aggressive hơn
        if (typeof lastValidPos !== 'undefined' && lastValidPos) {
            var dist = haversineDistance(lastValidPos.lat, lastValidPos.lng, lat, lng);
            var timeDiff = (ts - lastValidTime) / 1000; // seconds
            
            console.log('🚕 [GPS FINAL] Distance:', dist.toFixed(3), 'km, Time:', timeDiff.toFixed(1), 's');
            
            // Điều kiện relaxed hơn: chỉ cần dist > 0.005 km (5m) và < 2 km
            if (dist > 0.005 && dist < 2.0 && timeDiff > 0.5) {
                if (typeof totalKm !== 'undefined') {
                    totalKm += dist;
                    console.log('🚕 [GPS FINAL] Total KM:', totalKm.toFixed(2));
                    
                    // Update displays
                    if (typeof updateAllDisplays === 'function') {
                        var fare = Math.round(totalKm * (typeof currentRate !== 'undefined' ? currentRate : 15000));
                        updateAllDisplays(totalKm, fare);
                    }
                    
                    // Update UI elements directly as fallback
                    var kmEl = document.getElementById('km');
                    var costEl = document.getElementById('cost');
                    if (kmEl) kmEl.innerText = totalKm.toFixed(2);
                    if (costEl) {
                        var fare = Math.round(totalKm * (typeof currentRate !== 'undefined' ? currentRate : 15000));
                        costEl.innerText = fare.toLocaleString();
                    }
                }
            } else {
                console.log('🚕 [GPS FINAL] Distance filtered out');
            }
        }
        
        // Update lastValidPos
        if (typeof lastValidPos !== 'undefined') {
            lastValidPos = { lat: lat, lng: lng };
            lastValidTime = ts;
        }
    }
    
    // Override completeTrip để stop GPS
    var _origCompleteTrip = window.completeTrip;
    window.completeTrip = function() {
        console.log('🚕 [GPS FINAL] completeTrip called');
        
        // Stop GPS tracking
        if (window._gpsWatchId) {
            navigator.geolocation.clearWatch(window._gpsWatchId);
            window._gpsWatchId = null;
            console.log('🚕 [GPS FINAL] GPS tracking stopped');
        }
        
        return _origCompleteTrip ? _origCompleteTrip.apply(this, arguments) : undefined;
    };
    
    // Auto-start nếu đang trong chuyến (khi reload page)
    setTimeout(function() {
        if (typeof isRunning !== 'undefined' && isRunning) {
            console.log('🚕 [GPS FINAL] Auto-starting GPS (trip in progress)');
            forceStartGPSTracking();
        }
    }, 2000);
    
    console.log('✅ [GPS FINAL v4] Loaded');
})();
