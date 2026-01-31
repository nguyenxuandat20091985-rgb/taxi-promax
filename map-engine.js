// MAP-ENGINE.JS - XỬ LÝ GPS & TÍNH TIỀN
var map = L.map('map', { zoomControl: false }).setView([21.02, 105.83], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

var smIcon = L.divIcon({
    className: 'sm-div-icon',
    html: "<div class='sm-marker'><div class='sm-arrow'></div></div>",
    iconSize: [24, 24], iconAnchor: [12, 12]
});
var marker = L.marker([21.02, 105.83], { icon: smIcon }).addTo(map);

let isRunning = false, totalKm = 0, lastPos = null, currentRate = 15000;

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
        totalKm = 0; lastPos = null;
        document.getElementById('km').innerText = "0.00";
        document.getElementById('cost').innerText = "0";
        map.locate({ watch: true, enableHighAccuracy: true });
    } else {
        isRunning = false;
        btn.innerText = "BẮT ĐẦU CHUYẾN ĐI";
        btn.style.background = "var(--primary)";
        map.stopLocate();
        saveHistory(totalKm.toFixed(2), Math.round(totalKm * currentRate).toLocaleString());
    }
}

map.on('locationfound', (e) => {
    marker.setLatLng(e.latlng);
    map.panTo(e.latlng);
    if(isRunning) {
        if(lastPos) {
            let d = e.latlng.distanceTo(lastPos) / 1000;
            if(d > 0.01) { 
                totalKm += d;
                lastPos = e.latlng;
                document.getElementById('km').innerText = totalKm.toFixed(2);
                document.getElementById('cost').innerText = Math.round(totalKm * currentRate).toLocaleString();
            }
        } else { lastPos = e.latlng; }
    }
});
