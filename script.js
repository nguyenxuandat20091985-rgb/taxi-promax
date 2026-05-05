// --- 1. KHỞI TẠO BIẾN TOÀN CỤC ---
let map, marker, lastPos;
let isRunning = false, totalKm = 0, currentRate = 15000;

// --- 2. QUẢN LÝ ĐĂNG KÝ SĐT ---
function checkRegistration() {
    const phone = localStorage.getItem('user_phone');
    if (!phone) {
        document.getElementById('regModal').style.display = 'flex';
    } else {
        updateUI(phone);
    }
}

function processRegistration() {
    const phone = document.getElementById('regPhone').value;
    if (phone.length >= 10) {
        localStorage.setItem('user_phone', phone);
        updateUI(phone);
        document.getElementById('regModal').style.display = 'none';
        if (!localStorage.getItem('tp_trial_used')) tpHandlePayment(0, 'Gói THỬ 7D');
    } else {
        alert("SĐT không hợp lệ!");
    }
}

function updateUI(phone) {
    document.getElementById('idShow').innerText = "🆔 " + phone;
    document.getElementById('profilePhone').innerText = phone;
    const txId = localStorage.getItem('tx_id') || 'TX-' + Math.random().toString(36).toUpperCase().slice(2, 7);
    localStorage.setItem('tx_id', txId);
    document.getElementById('profileID').innerText = txId;
}

// --- 3. GPS & BẢN ĐỒ ---
function initMap() {
    map = L.map('map', { zoomControl: false }).setView([21.02, 105.83], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    
    const icon = L.divIcon({ className: 'pulsating-circle', html: '<div style="width:20px;height:20px;background:#00bfa5;border-radius:50%;border:2px solid white;"></div>' });
    marker = L.marker([21.02, 105.83], { icon }).addTo(map);

    navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords;
        const newPos = L.latLng(latitude, longitude);
        marker.setLatLng(newPos);
        if (isRunning && lastPos) {
            totalKm += newPos.distanceTo(lastPos) / 1000;
            document.getElementById('km').innerText = totalKm.toFixed(2);
            document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
        }
        if (!lastPos) map.setView(newPos, 16);
        lastPos = newPos;
    }, null, { enableHighAccuracy: true });
}

// --- 4. ĐIỀU HƯỚNG TAB ---
function showTab(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (tabName !== 'home') document.getElementById('tab-' + tabName).style.display = 'flex';
    map.invalidateSize();
}

// --- KHỞI CHẠY ---
window.onload = () => {
    checkRegistration();
    initMap();
};
