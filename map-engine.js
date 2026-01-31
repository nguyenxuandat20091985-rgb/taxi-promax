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

// --- PHẦN MỚI: TỰ ĐỘNG KHÔI PHỤC DỮ LIỆU KHI SẬP APP ---
window.onload = function() {
    const savedTrip = localStorage.getItem('active_trip');
    if (savedTrip) {
        const data = JSON.parse(savedTrip);
        isRunning = true;
        totalKm = data.totalKm;
        currentRate = data.currentRate;
        
        // Cập nhật lại giao diện ngay khi mở app
        const btn = document.getElementById('mainBtn');
        btn.innerText = "KẾT THÚC CHUYẾN ĐI";
        btn.style.background = "var(--danger)";
        document.getElementById('km').innerText = totalKm.toFixed(2);
        document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
        document.getElementById('rateLabel').innerText = currentRate.toLocaleString();
        
        // Kích hoạt lại định vị
        map.locate({ watch: true, enableHighAccuracy: true });
        console.log("Đã khôi phục chuyến đi đang dang dở!");
    }
};

function updateRate(v) { 
    currentRate = v; 
    document.getElementById('rateLabel').innerText = parseInt(v).toLocaleString(); 
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
        
        // Lưu trạng thái bắt đầu để phòng khi sập app
        localStorage.setItem('active_trip', JSON.stringify({totalKm: 0, currentRate: currentRate}));
        
        map.locate({ watch: true, enableHighAccuracy: true });
    } else {
        isRunning = false;
        btn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
        btn.style.background = "var(--primary)";
        map.stopLocate();
        
        let finalCost = Math.round(totalKm * currentRate);
        saveHistory(totalKm.toFixed(2), finalCost.toLocaleString());
        
        // Xóa bộ nhớ đệm vì chuyến đi đã kết thúc an toàn
        localStorage.removeItem('active_trip');
        
        document.getElementById('endSummary').innerHTML = `Quãng đường: <b>${totalKm.toFixed(2)} KM</b><br>Tổng: <b style="color:var(--primary); font-size:20px;">${finalCost.toLocaleString()}đ</b>`;
        document.getElementById('endModal').style.display = 'flex';
    }
}

// THUẬT TOÁN XANH SM: ĐỊNH VỊ CHUẨN & LƯU LIÊN TỤC
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
            if(d > 0.015 && d < 0.2) { 
                totalKm += d;
                lastPos = newPos;
                document.getElementById('km').innerText = totalKm.toFixed(2);
                document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
                
                // CẬP NHẬT BỘ NHỚ ĐỆM LIÊN TỤC (Phòng khi sập app giữa đường)
                localStorage.setItem('active_trip', JSON.stringify({totalKm: totalKm, currentRate: currentRate}));
            }
        } else { lastPos = newPos; }
    }
});
