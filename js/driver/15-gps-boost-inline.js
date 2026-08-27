// Extracted from index.html; load order is intentionally preserved.
(function(){
    var KEY = 'promax_lastpos';
    function savePos(lat, lng, acc, src){ try { localStorage.setItem(KEY, JSON.stringify({ lat: lat, lng: lng, acc: acc, src: src, t: Date.now() })); } catch(e){} }
    function loadPos(){ try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch(e){ return null; } }

    var tempMarker = null;

    function realMarkerOnMap(){
        try { return (typeof driverMarker !== 'undefined' && driverMarker && map.hasLayer(driverMarker)); } catch(e){ return false; }
    }
    function placeTemp(lat, lng){
        if (typeof map === 'undefined' || !map) return;
        if (realMarkerOnMap()) { if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; } return; }
        if (!tempMarker) {
            var icon = L.divIcon({ html: '<div style="width:18px;height:18px;border-radius:50%;background:#2196f3;border:3px solid #fff;box-shadow:0 2px 8px rgba(33,150,243,.6);"></div>', className: '', iconSize: [18,18], iconAnchor: [9,9] });
            tempMarker = L.marker([lat, lng], { icon: icon }).addTo(map);
        } else tempMarker.setLatLng([lat, lng]);
    }
    function setStatus(txt, cls){
        var t = document.getElementById('gpsStatusText'), d = document.getElementById('gpsDot');
        if (t) t.innerText = txt;
        if (d && cls) d.className = 'gps-dot ' + cls;
    }

    function boost(){
        // === TẦNG 0: vị trí nhớ lần cuối → hiện NGAY LẬP TỨC (0 giây) ===
        var c = loadPos();
        if (c && c.lat) {
            map.setView([c.lat, c.lng], 16);
            placeTemp(c.lat, c.lng);
            setStatus('📍 Vị trí gần đúng — đang tối ưu...', 'weak');
        }

        if (!navigator.geolocation) return;

        // === TẦNG 1: định vị nhanh bằng sóng/WiFi (1–2 giây) ===
        navigator.geolocation.getCurrentPosition(function(p){
            var lat = p.coords.latitude, lng = p.coords.longitude, acc = p.coords.accuracy || 999;
            savePos(lat, lng, acc, 'fast');
            try { currentLat = lat; currentLng = lng; } catch(e){}
            map.setView([lat, lng], 16);
            placeTemp(lat, lng);
            setStatus('📡 Định vị nhanh (±' + Math.round(acc) + 'm)', 'weak');
        }, function(){}, { enableHighAccuracy: false, maximumAge: 120000, timeout: 4000 });

        // === TẦNG 2: GPS chính xác bám nền, nhớ vị trí cho lần sau ===
        navigator.geolocation.watchPosition(function(p){
            var lat = p.coords.latitude, lng = p.coords.longitude, acc = p.coords.accuracy || 999;
            savePos(lat, lng, acc, 'gps');
            try { currentLat = lat; currentLng = lng; } catch(e){}
            if (realMarkerOnMap() && tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
        }, function(){}, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });

        // === Cảnh báo nếu kẹt quá 8 giây ===
        setTimeout(function(){
            var t = document.getElementById('gpsStatusText');
            if (t && t.innerText.indexOf('xin quyền') !== -1) {
                setStatus('⚠️ Bật GPS + "Vị trí chính xác" trong Cài đặt', 'bad');
                if (typeof showToast === 'function') showToast('📍 Mẹo: bật "Vị trí chính xác" để nhanh như Grab');
            }
        }, 8000);
    }

    function waitMap(){
        var n = 0;
        var iv = setInterval(function(){
            n++;
            if (typeof map !== 'undefined' && map) { clearInterval(iv); boost(); }
            if (n > 30) clearInterval(iv);
        }, 500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitMap);
    else waitMap();
})();
