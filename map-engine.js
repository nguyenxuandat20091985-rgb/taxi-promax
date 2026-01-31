// BẢN ĐỒ SIÊU SẮC NÉT & GIỮ MÀN HÌNH LUÔN SÁNG
var map = L.map('map', { 
    zoomControl: false,
    maxZoom: 18,
    preferCanvas: true 
}).setView([21.02, 105.83], 16);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    className: 'map-retina'
}).addTo(map);

// GIỮ MÀN HÌNH LUÔN SÁNG
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) { console.log("WakeLock lỗi"); }
}
requestWakeLock();

// ICON XE DI CHUYỂN
var smIcon = L.divIcon({
    className: 'sm-div-icon',
    html: "<div class='sm-marker'><div class='sm-arrow' id='car-arrow'></div></div>",
    iconSize: [24, 24], iconAnchor: [12, 12]
});
var marker = L.marker([21.02, 105.83], { icon: smIcon }).addTo(map);

let isRunning = false, totalKm = 0, lastPos = null, currentRate = 15000;

// --- KHÔI PHỤC DỮ LIỆU THÔNG SUỐT ---
window.onload = function() {
    const savedTrip = localStorage.getItem('active_trip');
    if (savedTrip) {
        const data = JSON.parse(savedTrip);
        isRunning = true;
        totalKm = data.totalKm;
        currentRate = data.currentRate;
        // QUAN TRỌNG: Khôi phục tọa độ cuối để không bị nhảy KM thẳng hàng
        if(data.lastLat && data.lastLng) {
            lastPos = L.latLng(data.lastLat, data.lastLng);
        }
        
        const btn = document.getElementById('mainBtn');
        btn.innerText = "KẾT THÚC CHUYẾN ĐI";
        btn.style.background = "var(--danger)";
        document.getElementById('km').innerText = totalKm.toFixed(2);
        document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
        
        map.locate({ watch: true, enableHighAccuracy: true });
    }
};

function updateRate(v) { 
    currentRate = v; 
    document.getElementById('rateLabel').innerText = parseInt(v).toLocaleString(); 
}

// HÀM LƯU LỊCH SỬ (Nếu file khác chưa có thì phải thêm vào đây)
function saveHistory(km, price) {
    let history = JSON.parse(localStorage.getItem('taxi_history') || '[]');
    history.unshift({ date: new Date().toLocaleString(), km: km, price: price });
    localStorage.setItem('taxi_history', JSON.stringify(history.slice(0, 50))); // Lưu 50 chuyến gần nhất
}

function handleTrip() {
    const btn = document.getElementById('mainBtn');
    if(!isRunning) {
        isRunning = true;
        btn.innerText = "KẾT THÚC CHUYẾN ĐI";
        btn.style.background = "var(--danger)";
        document.getElementById('wishModal').style.display = 'flex';
        totalKm = 0; lastPos = null;
        document.getElementById('km').innerText = "0.00";
        document.getElementById('cost').innerText = "0";
        map.locate({ watch: true, enableHighAccuracy: true });
    } else {
        isRunning = false;
        btn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
        btn.style.background = "var(--primary)";
        map.stopLocate();
        
        let finalCost = Math.round(totalKm * currentRate);
        saveHistory(totalKm.toFixed(2), finalCost.toLocaleString());
        localStorage.removeItem('active_trip');
        
        document.getElementById('endSummary').innerHTML = `Quãng đường: <b>${totalKm.toFixed(2)} KM</b><br>Tổng: <b style="color:var(--primary); font-size:20px;">${finalCost.toLocaleString()}đ</b>`;
        document.getElementById('endModal').style.display = 'flex';
    }
}

// THUẬT TOÁN XANH SM: ĐỊNH VỊ CHUẨN & LƯU TỌA ĐỘ CUỐI
map.on('locationfound', (e) => {
    const { heading, accuracy } = e;
    if (accuracy > 25) return; 

    const newPos = e.latlng;
    marker.setLatLng(newPos);
    
    if (heading !== null && heading !== undefined) {
        const arrow = document.getElementById('car-arrow');
        if (arrow) arrow.style.transform = `translateX(-50%) rotate(${heading}deg)`;
    }

    map.panTo(newPos, { animate: true, duration: 0.5 });

    if(isRunning) {
        if(lastPos) {
            let d = newPos.distanceTo(lastPos) / 1000;
            // Thuật toán lọc nhiễu 15m của Xanh SM
            if(d > 0.015 && d < 0.2) { 
                totalKm += d;
                lastPos = newPos;
                document.getElementById('km').innerText = totalKm.toFixed(2);
                document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
                
                // LƯU CẢ TỌA ĐỘ ĐỂ CHỐNG LỖI NHẢY KM KHI MỞ LẠI APP
                localStorage.setItem('active_trip', JSON.stringify({
                    totalKm: totalKm, 
                    currentRate: currentRate,
                    lastLat: newPos.lat,
                    lastLng: newPos.lng
                }));
            }
        } else { lastPos = newPos; }
    }
});
