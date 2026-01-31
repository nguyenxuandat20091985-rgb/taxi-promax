// =========================================================
// HỆ THỐNG ĐIỀU HÀNH BẢN ĐỒ - PHÁT TRIỂN BỞI: NGUYEN XUAN DAT
// =========================================================

var map = L.map('map', { 
    zoomControl: false,
    maxZoom: 18,
    preferCanvas: true,
    bounceAtZoomLimits: false
}).setView([21.02, 105.83], 16);

// Tối ưu bản đồ sắc nét và load nhanh (Mục 1)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    updateWhenIdle: true,
    keepBuffer: 2,
    className: 'map-retina'
}).addTo(map);

// GIỮ MÀN HÌNH LUÔN SÁNG (MỤC 4)
let wakeLock = null;
const requestWakeLock = async () => {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } 
    catch (e) { console.log("Sáng màn hình: ON"); }
};
requestWakeLock();

// ICON XE VỚI MŨI TÊN TỰ XOAY (MỤC 2)
var smIcon = L.divIcon({
    className: 'sm-div-icon',
    html: "<div class='sm-marker'><div class='sm-arrow' id='car-arrow'></div></div>",
    iconSize: [24, 24], iconAnchor: [12, 12]
});
var marker = L.marker([21.02, 105.83], { icon: smIcon }).addTo(map);

let isRunning = false, totalKm = 0, lastPos = null, currentRate = 15000;

// --- HÀM LƯU LỊCH SỬ BẢO MẬT (CHỈ THÊM, CẤM XÓA) ---
function saveHistory(km, price) {
    let history = JSON.parse(localStorage.getItem('taxi_history') || '[]');
    const newEntry = {
        id: Date.now(),
        date: new Date().toLocaleString('vi-VN'),
        km: km,
        price: price,
        status: 'Hoàn thành'
    };
    history.unshift(newEntry);
    localStorage.setItem('taxi_history', JSON.stringify(history.slice(0, 100))); // Giữ 100 chuyến gần nhất
}

// --- KHÔI PHỤC DỮ LIỆU KHI MỞ LẠI APP (ANTI-CRASH) ---
window.addEventListener('load', () => {
    const backup = localStorage.getItem('trip_backup');
    if (backup) {
        const d = JSON.parse(backup);
        isRunning = true;
        totalKm = d.km;
        currentRate = d.rate;
        if(d.lat && d.lng) lastPos = L.latLng(d.lat, d.lng);
        
        // Cập nhật giao diện
        document.getElementById('mainBtn').innerText = "KẾT THÚC CHUYẾN ĐI";
        document.getElementById('mainBtn').style.background = "var(--danger)";
        document.getElementById('km').innerText = totalKm.toFixed(2);
        document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
        
        map.locate({ watch: true, enableHighAccuracy: true });
    }
});

function updateRate(v) { 
    currentRate = parseInt(v); 
    document.getElementById('rateLabel').innerText = currentRate.toLocaleString(); 
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
        localStorage.removeItem('trip_backup'); // Xóa bản nháp khi kết thúc
        
        document.getElementById('endSummary').innerHTML = `Quãng đường: <b>${totalKm.toFixed(2)} KM</b><br>Tổng: <b style="color:var(--primary); font-size:20px;">${finalCost.toLocaleString()}đ</b>`;
        document.getElementById('endModal').style.display = 'flex';
    }
}

// THUẬT TOÁN XANH SM: CHỐNG NHẢY TIỀN & ĐỊNH VỊ THEO XE (MỤC 3)
map.on('locationfound', (e) => {
    const { heading, accuracy, latlng } = e;
    
    // LỌC NHIỄU: Nếu GPS sai số > 20m thì bỏ qua (Chống nhảy KM khi dừng đèn đỏ)
    if (accuracy > 20) return; 

    marker.setLatLng(latlng);
    
    // Xoay mũi tên theo hướng xe di chuyển (Mục 2)
    if (heading) {
        const arrow = document.getElementById('car-arrow');
        if (arrow) arrow.style.transform = `translateX(-50%) rotate(${heading}deg)`;
    }

    // Luôn bám theo xe (Mục 2)
    map.panTo(latlng, { animate: true, duration: 0.5 });

    if(isRunning) {
        if(lastPos) {
            let d = latlng.distanceTo(lastPos) / 1000;
            // Thuật toán chuẩn Xanh SM: Phải di chuyển > 15m và < 200m (loại bỏ nhảy tọa độ xa)
            if(d > 0.015 && d < 0.2) { 
                totalKm += d;
                lastPos = latlng;
                document.getElementById('km').innerText = totalKm.toFixed(2);
                document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
                
                // Ghi vào "Hộp đen" liên tục
                localStorage.setItem('trip_backup', JSON.stringify({
                    km: totalKm, 
                    rate: currentRate,
                    lat: latlng.lat,
                    lng: latlng.lng
                }));
            }
        } else { lastPos = latlng; }
    }
});
