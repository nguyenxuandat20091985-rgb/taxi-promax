// Extracted from index.html; load order is intentionally preserved.
(function(){
    function hav(a,b,c,d){var R=6371,x=(c-a)*Math.PI/180,y=(d-b)*Math.PI/180,s=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)*Math.sin(y/2);return R*2*Math.atan2(Math.sqrt(s),Math.sqrt(1-s));}
    function getDriver(){
        try { if (typeof driverInfo !== 'undefined' && driverInfo && driverInfo.uid) return driverInfo; } catch(e){}
        try { var s = localStorage.getItem('driverInfo'); if (s) { var d = JSON.parse(s); if (d && d.uid) return d; } } catch(e){}
        return null;
    }
    var warned = 0;
    function flag(type, val){
        warned++;
        var drv = getDriver(); if (!drv) return;
        try { db.ref('fraud_alerts/' + drv.uid + '/' + Date.now()).set({ type: type, val: val, at: Date.now() }); } catch(e){}
        if (warned === 2 && typeof showToast === 'function') showToast('⚠️ Hệ thống ghi nhận vị trí bất thường');
    }

    /* 1) Bắt GPS giả: acc ~0, tốc độ >180km/h, teleport >3km/10s */
    var last = null, lastT = 0;
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function(p){
            var lat = p.coords.latitude, lng = p.coords.longitude, acc = p.coords.accuracy || 0, ts = p.timestamp || Date.now();
            if (acc > 0 && acc < 3) flag('mock_gps', acc);
            if (last) {
                var dt = (ts - lastT) / 1000;
                if (dt > 0 && dt < 30) {
                    var km = hav(last.lat, last.lng, lat, lng);
                    var kmh = km / dt * 3600;
                    if (kmh > 180) flag('speed', Math.round(kmh));
                    if (km > 3 && dt < 10) flag('teleport', Math.round(km));
                }
            }
            last = { lat: lat, lng: lng }; lastT = ts;
        }, function(){}, { enableHighAccuracy: false, maximumAge: 5000 });
    }

    /* 2) Chống sửa gói cước trong máy (so với server mỗi 60s) */
    setInterval(function(){
        var drv = getDriver(); if (!drv) return;
        var local = parseInt(localStorage.getItem('tp_expiry') || '0');
        if (!local) return;
        try {
            db.ref('drivers/' + drv.uid + '/tp_expiry').once('value').then(function(s){
                var remote = parseInt(s.val() || '0');
                if (local > remote + 86400000) {
                    localStorage.setItem('tp_expiry', remote || '0');
                    flag('expiry_tamper', local - remote);
                    if (typeof showToast === 'function') showToast('🔄 Đã đồng bộ gói cước từ máy chủ');
                    if (typeof initCountdown === 'function') initCountdown();
                }
            });
        } catch(e){}
    }, 60000);

    /* 3) Chặn km ảo: tối đa 500km/chuyến */
    var _ct = window.completeTrip;
    window.completeTrip = function(){
        try { if (typeof totalKm === 'number' && totalKm > 500) totalKm = 500; } catch(e){}
        return _ct ? _ct.apply(this, arguments) : undefined;
    };
})();
