// --- 1. KHỞI TẠO BIẾN TOÀN CỤC ---
const TX_ID = localStorage.getItem('tx_id') || 'PRO-' + Math.random().toString(36).substr(2, 5).toUpperCase();
localStorage.setItem('tx_id', TX_ID);
document.getElementById('idShow').innerText = "🆔 " + TX_ID;
document.getElementById('profileID').innerText = TX_ID;

let isRunning = false, totalKm = 0, lastPos = null, currentRate = 15000, watchId = null, wakeLock = null;

// --- 2. BẢN ĐỒ ---
var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([21.02, 105.83], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map); 
var smIcon = L.divIcon({ className: 'sm-div-icon', html: "<div class='sm-marker'><div class='sm-arrow'></div></div>", iconSize: [24, 24], iconAnchor: [12, 12] });
var marker = L.marker([21.02, 105.83], { icon: smIcon }).addTo(map);

// --- 3. CHỨC NĂNG ---
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            document.getElementById('screenStatus').innerText = "LUÔN SÁNG (ON)";
        }
    } catch (err) { console.log("WakeLock lỗi"); }
}

function startTracking() {
    if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude, speed } = pos.coords;
                const newPos = L.latLng(latitude, longitude);
                marker.setLatLng(newPos);
                if(isRunning) {
                    map.panTo(newPos);
                    if(lastPos && (speed > 0.3 || speed === null)) {
                        let d = newPos.distanceTo(lastPos) / 1000;
                        if(d > 0.005) { 
                            totalKm += d;
                            document.getElementById('km').innerText = totalKm.toFixed(2);
                            document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
                        }
                    }
                    lastPos = newPos;
                }
            },
            (err) => { console.error(err); },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
    }
}

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
        requestWakeLock();
        startTracking();
    } else {
        isRunning = false;
        btn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
        btn.style.background = "var(--primary)";
        if(watchId) navigator.geolocation.clearWatch(watchId);
        if(wakeLock) wakeLock.release();
        let finalCost = Math.round(totalKm * currentRate);
        saveHistory(totalKm.toFixed(2), finalCost.toLocaleString());
        document.getElementById('endSummary').innerHTML = `Quãng đường: <b>${totalKm.toFixed(2)} KM</b><br>Tổng: <b style="color:var(--primary); font-size:20px;">${finalCost.toLocaleString()}đ</b>`;
        document.getElementById('endModal').style.display = 'flex';
    }
}

function saveHistory(km, cost) {
    const list = document.getElementById('historyList');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    let history = JSON.parse(localStorage.getItem('trip_history') || '[]');
    history.unshift({ time, km, cost });
    localStorage.setItem('trip_history', JSON.stringify(history.slice(0, 50)));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    let history = JSON.parse(localStorage.getItem('trip_history') || '[]');
    history.forEach(h => {
        const item = document.createElement('div');
        item.className = 'history-card';
        item.innerHTML = `<div class="h-info"><b>${h.time}</b><br><small>${h.km} KM</small></div><div class="h-price">${h.cost}đ</div>`;
        list.appendChild(item);
    });
}

function clearHistory() { if(confirm("Xóa sạch lịch sử?")) { localStorage.removeItem('trip_history'); renderHistory(); } }

function selectPack(price, name, el) {
    document.querySelectorAll('.p-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const content = `${TX_ID} NAP ${name}`;
    document.getElementById('qrContent').innerText = content;
    document.getElementById('qrImg').src = `https://img.vietqr.io/image/bidv-4430269669-compact2.png?amount=${price}&addInfo=${encodeURIComponent(content)}`;
}

function showTab(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if(tab === 'home') {
        document.getElementById('homeControls').style.display = 'block';
    } else {
        document.getElementById('homeControls').style.display = 'none';
        document.getElementById('tab-' + tab).style.display = 'flex';
        if(tab === 'vi') selectPack(49000, 'VIP 1TH', document.querySelectorAll('.p-card')[2]);
    }
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

window.onload = renderHistory;
