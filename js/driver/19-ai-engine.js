// Extracted from index.html; load order is intentionally preserved.
(function(){
    function getDriver(){
        try { if (typeof driverInfo !== 'undefined' && driverInfo && driverInfo.uid) return driverInfo; } catch(e){}
        try { var s = localStorage.getItem('driverInfo'); if (s) { var d = JSON.parse(s); if (d && d.uid) return d; } } catch(e){}
        return null;
    }
    function sayOnce(key, text){
        var k = 'ai_' + key + '_' + new Date().toDateString();
        if (localStorage.getItem(k)) return;
        localStorage.setItem(k, '1');
        if (typeof showToast === 'function') showToast(text);
        if (typeof speak === 'function') speak(text);
    }

    /* ===== 1) AI NHẮC NẠP TIỀN: trước hạn 2 ngày, nhắc đúng giờ cao điểm ===== */
    function renewAI(){
        var drv = getDriver(); if (!drv) return;
        var h = new Date().getHours();
        if (!((h >= 7 && h < 10) || (h >= 17 && h < 20))) return; // chỉ nhắc giờ đông đơn
        try {
            db.ref('drivers/' + drv.uid + '/tp_expiry').once('value').then(function(s){
                var remain = parseInt(s.val() || 0) - Date.now();
                if (remain > 0 && remain < 2 * 86400000)
                    sayOnce('renew', 'Gói còn dưới 2 ngày. Gia hạn ngay kẻo lỡ đơn giờ cao điểm!');
            });
        } catch(e){}
    }

    /* ===== 2) AI CHỐNG MỆT MỎI: chạy liên tục 4h → nhắc nghỉ ===== */
    var runSec = 0;
    setInterval(function(){
        try {
            if (typeof isRunning !== 'undefined' && isRunning) runSec += 60;
            else runSec = Math.max(0, runSec - 120);
        } catch(e){}
        if (runSec >= 4 * 3600) { sayOnce('fatigue', 'Anh đã chạy 4 tiếng liên tục. Nghỉ 15 phút cho an toàn nhé!'); runSec = 0; }
    }, 60000);

    /* ===== 3) AI ĐIỂM UY TÍN: tổng hợp tín hiệu gian lận → trustScore ===== */
    function trustAI(){
        var drv = getDriver(); if (!drv) return;
        try {
            db.ref('fraud_alerts/' + drv.uid).once('value').then(function(s){
                var score = Math.max(40, 100 - (s.numChildren ? s.numChildren() : 0) * 5);
                db.ref('drivers/' + drv.uid).update({ trustScore: score });
            });
        } catch(e){}
    }

    /* ===== 4) AI DỰ BÁO NHU CẦU v2 + GỢI Ý GIÁ ĐỘNG ===== */
    function demandAI(){
        var h = new Date().getHours(), day = new Date().getDay();
        var lat = 21.02, lng = 105.85;
        try { if (typeof currentLat !== 'undefined' && currentLat) { lat = currentLat; lng = currentLng; } } catch(e){}
        fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&current_weather=true')
        .then(function(r){ return r.json(); })
        .then(function(d){
            var rain = d.current_weather && d.current_weather.weathercode >= 51;
            var hot = 0;
            if ((h >= 7 && h < 9) || (h >= 17 && h < 19)) hot += 40;   // cao điểm
            if (rain) hot += 30;                                       // mưa
            if ((day === 6 || day === 0) && h >= 19 && h < 23) hot += 25; // cuối tuần tối
            if (h >= 11 && h < 13) hot += 15;                          // trưa
            if (hot >= 50) {
                if (typeof showToast === 'function')
                    showToast('🔥 AI: nhu cầu ' + hot + '% — ' + (rain ? 'trời mưa, khách cần xe gấp!' : 'giờ cao điểm!'));
                if (hot >= 60) {
                    try {
                        if (typeof currentRate !== 'undefined') {
                            var sug = Math.round(currentRate * 1.2 / 1000) * 1000;
                            sayOnce('surge', 'Nhu cầu rất cao. Gợi ý chỉnh giá ' + sug.toLocaleString() + ' đồng một km.');
                        }
                    } catch(e){}
                }
            }
        }).catch(function(){});
    }

    setTimeout(function(){ renewAI(); demandAI(); trustAI(); }, 5000);
    setInterval(function(){ renewAI(); demandAI(); }, 30 * 60000);
    setInterval(trustAI, 6 * 3600000);
})();
