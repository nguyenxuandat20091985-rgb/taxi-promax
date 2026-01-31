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

// GIỮ MÀN HÌNH LUÔN SÁNG (MỤC 4)
let wakeLock = null;
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) { console.log("WakeLock lỗi"); }
}
requestWakeLock();

// ICON XE DI CHUYỂN CÓ MŨI TÊN XOAY (MỤC 2)
var smIcon = L.divIcon({
    className: 'sm-div-icon',
    html: "<div class='sm-marker'><div class='sm-arrow' id='car-arrow'></div></div>",
    iconSize: [24, 24], iconAnchor: [12, 12]
});
var marker = L.marker([21.02, 105.83], { icon: smIcon }).addTo(map);

let isRunning = false, totalKm = 0, lastPos = null, currentRate = 15000;

// CẬP NHẬT GIÁ (GIỮ NGUYÊN GIAO DIỆN CỦA ANH)
function updateRate(v) { 
    currentRate = v; 
    document.getElementById('rateLabel').innerText = parseInt(v).toLocaleString(); 
}

// XỬ LÝ CHUYẾN ĐI (GIỮ NGUYÊN CẤU TRÚC ANH YÊU CẦU)
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
        document.getElementById('endSummary').innerHTML = `Quãng đường: <b>${totalKm.toFixed(2)} KM</b><br>Tổng: <b style="color:var(--primary); font-size:20px;">${finalCost.toLocaleString()}đ</b>`;
        document.getElementById('endModal').style.display = 'flex';
    }
}

// THUẬT TOÁN XANH SM: ĐỊNH VỊ CHUẨN & CHỐNG NHẢY KM (MỤC 2 & 3)
map.on('locationfound', (e) => {
    const { lat, lng, heading, accuracy } = e;
    
    // 1. LỌC NHIỄU GPS: Nếu sai số > 25m thì bỏ qua không tính tiền (Chống nhảy KM)
    if (accuracy > 25) return; 

    const newPos = e.latlng;
    marker.setLatLng(newPos);
    
    // 2. XOAY MŨI TÊN THEO HƯỚNG XE CHẠY (MỤC 2)
    if (heading !== null && heading !== undefined) {
        const arrow = document.getElementById('car-arrow');
        if (arrow) arrow.style.transform = `translateX(-50%) rotate(${heading}deg)`;
    }

    // 3. ĐỊNH VỊ THEO XE (LUÔN BÁM THEO XE KỂ CẢ KHI KHÔNG CÓ KHÁCH)
    map.panTo(newPos, { animate: true, duration: 0.5 });

    if(isRunning) {
        if(lastPos) {
            let d = newPos.distanceTo(lastPos) / 1000;
            
            // THUẬT TOÁN SM: Chỉ tính tiền khi di chuyển thực tế > 15 mét (Chống rung GPS)
            // Và tốc độ phải dưới 150km/h (Loại bỏ nhảy tọa độ ảo xa hàng km)
            if(d > 0.015 && d < 0.2) { 
                totalKm += d;
                lastPos = newPos;
                document.getElementById('km').innerText = totalKm.toFixed(2);
                document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
            }
        } else { lastPos = newPos; }
    }
});

map.on('locationerror', (e) => { console.log("Lỗi định vị: " + e.message); });
