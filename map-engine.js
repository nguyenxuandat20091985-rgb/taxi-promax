// MAP-ENGINE.JS - PHÁT TRIỂN BỞI NGUYEN XUAN DAT
var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([21.02, 105.83], 17);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);

var marker = L.marker([21.02, 105.83], { 
    icon: L.divIcon({ className: 'sm-icon', html: "<div class='sm-marker' id='car-marker'><div class='sm-arrow'></div></div>", iconSize: [30, 30] }) 
}).addTo(map);

let isRunning = false, totalKm = 0, lastPos = null;

document.getElementById('mainBtn').onclick = function() {
    if(!isRunning) {
        isRunning = true;
        this.innerText = "KẾT THÚC CHUYẾN ĐI";
        this.style.background = "var(--danger)";
        totalKm = 0; lastPos = null;
        document.getElementById('km').innerText = "0.00";
        document.getElementById('cost').innerText = "0";
    } else {
        isRunning = false;
        this.innerText = "BẮT ĐẦU CHUYẾN ĐI";
        this.style.background = "var(--primary)";
        // Lưu lịch sử tự động
        const cost = Math.round(totalKm * document.getElementById('rateInput').value).toLocaleString();
        const item = document.createElement('div');
        item.className = 'p-card'; item.style.margin = "10px";
        item.innerHTML = `<b>${new Date().toLocaleTimeString()}</b> - ${totalKm.toFixed(2)}km - <span>${cost}đ</span>`;
        document.getElementById('historyList').prepend(item);
    }
};

navigator.geolocation.watchPosition((e) => {
    const newPos = L.latLng(e.coords.latitude, e.coords.longitude);
    marker.setLatLng(newPos);
    map.panTo(newPos); // ĐỊNH VỊ DI CHUYỂN THEO XE

    if(isRunning) {
        if(lastPos) {
            let d = newPos.distanceTo(lastPos) / 1000;
            // THUẬT TOÁN XANH SM: CHẶN NHẢY TIỀN DƯỚI 20 MÉT
            if(d > 0.02) { 
                totalKm += d;
                lastPos = newPos;
                document.getElementById('km').innerText = totalKm.toFixed(2);
                document.getElementById('cost').innerText = Math.round(totalKm * document.getElementById('rateInput').value).toLocaleString();
            }
        } else { lastPos = newPos; }
    }
}, null, { enableHighAccuracy: true });
