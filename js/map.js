// js/map.js - Quản lý bản đồ và GPS (Tích hợp ProMaxLocation Core)
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

// Định vị GPS - Sử dụng ProMaxLocation Core để chống trôi và tiết kiệm pin
function startTracking() {
    if (window.ProMaxLocation) {
        ProMaxLocation.ensurePermission().then(function(granted) {
            if (!granted) {
                console.warn("Chưa được cấp quyền vị trí!");
                return;
            }

            ProMaxLocation.startDriver({
                onFix: function(fix) {
                    const newPos = L.latLng(fix.lat, fix.lng);
                    
                    if (!marker) {
                        marker = L.marker(newPos, { icon: smIcon }).addTo(map);
                        map.setView(newPos, 16);
                    } else {
                        marker.setLatLng(newPos);
                    }
                    
                    updateMarkerRotation();
                    
                    // Xử lý logic hành trình (gọi hàm từ index.html)
                    if(typeof onLocationUpdate === 'function') {
                        onLocationUpdate(newPos, fix.speed);
                    }

                    // Đồng bộ lên Firebase
                    syncDriverLocationToFirebase(fix.lat, fix.lng, fix.speed);
                }
            });
        });
    } else {
        console.error("Lỗi: Chưa nạp file location-core.js trước map.js!");
    }
}

function syncDriverLocationToFirebase(lat, lng, speed) {
    if (typeof FIREBASE_BASE_URL === 'undefined' || typeof TX_ID === 'undefined') return;

    const driverData = {
        lat: lat,
        lng: lng,
        heading: currentHeading, 
        speed: speed,
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
// Tự động bật xin quyền GPS ngay khi app vừa mở lên
window.addEventListener('DOMContentLoaded', function() {
    // Đợi 1 giây cho app load ổn định rồi tự động gọi bảng xin quyền
    setTimeout(function() {
        if (window.ProMaxLocation) {
            ProMaxLocation.ensurePermission().then(function(granted) {
                if (granted) {
                    console.log("🟢 Tài xế đã cấp quyền GPS, bắt đầu chạy định vị...");
                    startTracking(); // Gọi hàm chạy GPS và đồng hồ
                } else {
                    // Nếu tài xế lỡ bấm Chặn trước đó, hiện bảng thông báo to để hướng dẫn chạm vào ổ khóa bật lại
                    alert("⚠️ Taxi Promax cần quyền GPS để tính cước. Vui lòng bấm 'Cho phép' khi trình duyệt hỏi, hoặc bấm vào biểu tượng ổ khóa trên thanh địa chỉ để bật lại vị trí!");
                }
            });
        }
    }, 1000);
});
