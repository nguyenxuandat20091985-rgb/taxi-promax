// js/map.js - Quản lý bản đồ và GPS
var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([21.02, 105.83], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

var smIcon = L.divIcon({ 
    className: 'sm-div-icon', 
    html: `
        <div class="sm-marker-container">
            <div class="sm-pulse-ring"></div>
            <div id="tp-driver-compass" class="sm-direction-wrapper">
                <div class="sm-marker-arrow"></div>
                <div class="sm-marker-circle"></div>
            </div>
        </div>
    `, 
    iconSize: [40, 40], iconAnchor: [20, 20] 
});

var marker = null;
var lastPos = null;
var currentHeading = 0;
var customerMarker = null;

// Theo dõi hướng xoay la bàn
if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', function(event) {
        let heading = event.webkitCompassHeading || (360 - event.alpha);
        if (heading) {
            currentHeading = Math.round(heading);
            updateMarkerRotation();
        }
    }, true);
}

function updateMarkerRotation() {
    const compassEl = document.getElementById('tp-driver-compass');
    if (compassEl) {
        compassEl.style.transform = `rotate(${currentHeading}deg)`;
    }
}

// Định vị GPS
function startTracking() {
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition((pos) => {
            const { latitude, longitude, speed, heading } = pos.coords;
            const newPos = L.latLng(latitude, longitude);
            
            if (heading !== null && heading !== undefined && !isNaN(heading)) {
                currentHeading = Math.round(heading);
            }

            if (!marker) {
                marker = L.marker(newPos, { icon: smIcon }).addTo(map);
                map.setView(newPos, 16);
            } else {
                marker.setLatLng(newPos);
            }
            
            updateMarkerRotation();
            
            const currentSpeed = (speed !== null && speed !== undefined) ? speed : 0;
            
            // Xử lý logic hành trình (gọi hàm từ index.html)
            if(typeof onLocationUpdate === 'function') {
                onLocationUpdate(newPos, currentSpeed);
            }

            lastPos = newPos;
            syncDriverLocationToFirebase(latitude, longitude);

        }, (err) => console.error("GPS Error:", err), { enableHighAccuracy: true });
    }
}

function syncDriverLocationToFirebase(lat, lng) {
    // Lưu ý: FIREBASE_BASE_URL và TX_ID được định nghĩa ở index.html
    const driverData = {
        lat: lat,
        lng: lng,
        heading: currentHeading, 
        lastUpdated: Date.now(),
        status: (typeof isRunning !== 'undefined' && isRunning) ? "busy" : "ready",
        carType: "4_seats"
    };
    
    fetch(`${FIREBASE_BASE_URL}/tai_xe_online/${TX_ID}.json`, {
        method: 'PATCH',
        body: JSON.stringify(driverData)
    }).catch(err => console.error(err));
}

function setupCustomerMarker(lat, lng, clientName) {
    if(customerMarker) map.removeLayer(customerMarker);

    var custIcon = L.divIcon({
        className: 'cust-div-icon',
        html: "<div class='customer-marker'>🧍</div>",
        iconSize: [26, 26], iconAnchor: [13, 13]
    });

    customerMarker = L.marker([lat, lng], { icon: custIcon }).addTo(map);
    customerMarker.bindTooltip(`<b>Khách: ${clientName || 'Khách vãng lai'}</b>`).openTooltip();

    if (marker) {
        var group = new L.featureGroup([marker, customerMarker]);
        map.fitBounds(group.getBounds().pad(0.3));
    } else {
        map.setView([lat, lng], 16);
    }
}
