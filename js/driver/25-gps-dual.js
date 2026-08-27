// Extracted from index.html; load order is intentionally preserved.
(function(){
    var MIN_FARE = 20000;

    /* ===== 1) Modal kết thúc: không bao giờ hiện 0đ ===== */
    var _ct = window.completeTrip;
    window.completeTrip = function(){
        var km = (typeof totalKm !== 'undefined') ? totalKm : 0;
        var rate = (typeof currentRate !== 'undefined') ? currentRate : 15000;
        var fare = Math.max(MIN_FARE, Math.round(km * rate));
        var street = (typeof isStreetHail !== 'undefined') && isStreetHail;
        var r = _ct ? _ct.apply(this, arguments) : undefined;
        setTimeout(function(){
            var es = document.getElementById('endSummary');
            if (es) es.innerHTML = 'Quãng đường: <b>' + km.toFixed(2) + ' KM</b><br>Tổng: <b style="color:var(--primary);font-size:20px;">' + fare.toLocaleString('vi-VN') + 'đ</b><br><span style="font-size:11px;">' + (street ? '🚕 Chuyến vẫy' : '📱 Chuyến app') + ' · giá mở cửa 20k</span>';
        }, 80);
        return r;
    };

    /* ===== 2) GPS dự phòng bằng sóng/WiFi khi vệ tinh timeout ===== */
    function hav(a,b,c,d){var R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)*Math.sin(y/2);return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));}
    var fLast = null, lastUse = 0;

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function(p){
            var now = Date.now(), ts = p.timestamp || now;
            var lat = p.coords.latitude, lng = p.coords.longitude, acc = p.coords.accuracy || 999;
            var pill = (document.getElementById('gpsStatusText') || {}).innerText || '';
            var gpsDead = /Timeout|từ chối|thử lại/i.test(pill);

            /* Cho marker + bản đồ "sống" ngay cả khi GPS vệ tinh chết */
            try { if (typeof driverMarker !== 'undefined' && driverMarker && typeof map !== 'undefined' && map) driverMarker.setLatLng([lat, lng]); } catch(e){}
            var t = document.getElementById('gpsStatusText');
            if (t && gpsDead) t.innerText = '📡 Định vị mạng (±' + Math.round(acc) + 'm)';

            /* Chỉ cộng km khi GPS vệ tinh đang chết + đang chạy chuyến */
            if (!gpsDead) { fLast = null; return; }
            if (acc > 280) return;
            if (typeof isRunning === 'undefined' || !isRunning) return;

            if (fLast) {
                var dt = (ts - fLast.t) / 1000;
                if (dt > 0.5) {
                    var d = hav(fLast.lat, fLast.lng, lat, lng);          // km
                    var kmh = d / dt * 3600;
                    /* Chống nhảy: 8m–500m mỗi bước, <140km/h */
                    if (d * 1000 >= 8 && d < 0.5 && kmh < 140 && now - lastUse > 1000) {
                        lastUse = now;
                        try { totalKm += d; } catch(e){}
                    }
                }
            }
            fLast = { lat: lat, lng: lng, t: ts };
        }, function(){}, { enableHighAccuracy: false, maximumAge: 15000, timeout: 20000 });
    }
    console.log('✅ GPS DUAL v1 loaded');
})();
