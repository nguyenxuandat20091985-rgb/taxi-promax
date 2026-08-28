// ============================================================
// 🧰 CLEAN FIX v5: GPS + MENU + AI — single marker / single owner
// ============================================================
(function(){
    /* ===== CSS: sửa menu chồng chữ + ẩn các nút nổi còn sót ===== */
    var css = document.createElement('style');
    css.textContent =
        '.sidebar{display:flex;flex-direction:column;overflow:hidden;}' +
        '.sidebar-menu{flex:1;overflow-y:auto;padding-bottom:10px !important;}' +
        '.sidebar-footer{position:relative !important;bottom:auto !important;background:#fff;border-top:1px solid #eee;padding:12px 20px !important;}' +
        '.sidebar-footer .badge{display:block !important;margin:4px 0 !important;}' +
        '#langSwitcher,#aiBtn,#fixGpsBtn,[id*="aiBtn"],[id*="AiBtn"]{display:none !important;}';
    document.head.appendChild(css);

    /* ===== 1) FOLLOW GPS: không tạo marker/watcher thứ hai ===== */
    var followMode = true, gpsHinted = false;
    function fixGpsTick(lat, lng, acc) {
        // GPS core (00-core-runtime.js) là owner duy nhất của marker tài xế.
        // Hàm này chỉ còn là adapter an toàn cho code legacy nếu có gọi lại.
        try { currentLat = lat; currentLng = lng; } catch(e) {}
        if (followMode && typeof map !== 'undefined' && map && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
            try { map.panTo([lat, lng], { animate: true }); } catch(e) {}
        }
        if (typeof updateGpsStatusUI === 'function') updateGpsStatusUI(acc, false);
        if (acc > 150 && !gpsHinted) {
            gpsHinted = true;
            if (typeof showToast === 'function') showToast('📍 GPS yếu: bật "Vị trí chính xác" trong Cài đặt');
        }
    }
    function startFixGps() {
        // Không gọi watchPosition ở đây. 00-core-runtime.js đã là GPS owner.
        return false;
    }
    function toggleFollow() {
        followMode = !followMode;
        if (followMode && typeof currentLat !== 'undefined' && currentLat && typeof map !== 'undefined' && map) {
            map.flyTo([currentLat, currentLng], 17, { duration: 1 });
        }
        if (typeof forceRefreshGPS === 'function') forceRefreshGPS();
        if (typeof showToast === 'function') showToast(followMode ? '🎯 BẬT theo dõi vị trí' : '🎯 TẮT theo dõi vị trí');
    }

    /* ===== 2) Ẩn nút mặt trăng/sáng tối nổi trên đầu ===== */
    function hideFloatingMoon() {
        document.querySelectorAll('button, div').forEach(function(el) {
            if (el.closest('.sidebar')) return;
            var t = (el.textContent || '').trim();
            var hasIcon = el.querySelector ? el.querySelector('.fa-moon, .fa-sun') : null;
            if (t === '🌙' || t === '☀️' || t === '🌛' || t === '🌜' || hasIcon) {
                var r = el.getBoundingClientRect();
                if (r.top < 120) el.style.display = 'none';
            }
        });
    }

    /* ===== 3) Thêm Ngôn ngữ + Sáng/Tối + AI + GPS vào menu ===== */
    function triggerLang() {
        var cur = localStorage.getItem('promax_lang') || 'vi';
        localStorage.setItem('promax_lang', cur === 'vi' ? 'en' : 'vi');
        location.reload();
    }
    function triggerDark() {
        var fns = ['toggleDarkMode','toggleDark','switchDark','darkMode','toggleTheme','setDarkMode'];
        for (var i = 0; i < fns.length; i++) { if (typeof window[fns[i]] === 'function') { window[fns[i]](); return; } }
        var item = Array.from(document.querySelectorAll('.sidebar-item')).find(function(x) { return (x.innerText || '').includes('Chế độ tối'); });
        if (item) item.click();
    }

    /* ===== 4) AI TRỢ LÝ TÀI XẾ ===== */
    var HOTSPOTS_AI = {
        HN: [
            { name: 'Sân bay Nội Bài', lat: 21.2142, lng: 105.8075, t: 'airport' },
            { name: 'Bến xe Mỹ Đình', lat: 21.0085, lng: 105.7892, t: 'market' },
            { name: 'Hoàn Kiếm / Phố cổ', lat: 21.0285, lng: 105.8542, t: 'fun' },
            { name: 'Cầu Giấy / Văn phòng', lat: 21.0352, lng: 105.7878, t: 'office' },
            { name: 'Times City', lat: 21.0015, lng: 105.8625, t: 'office' },
            { name: 'Khu ăn uống Tống Duy Tân', lat: 21.0295, lng: 105.8495, t: 'food' },
            { name: 'Làng ĐH Bách Khoa', lat: 21.0058, lng: 105.8426, t: 'school' }
        ],
        HCM: [
            { name: 'Sân bay Tân Sơn Nhất', lat: 10.8188, lng: 106.6519, t: 'airport' },
            { name: 'Quận 1 / Nguyễn Huệ', lat: 10.7769, lng: 106.7009, t: 'fun' },
            { name: 'Phú Mỹ Hưng', lat: 10.7288, lng: 106.7181, t: 'office' },
            { name: 'Thủ Đức / Làng ĐH', lat: 10.8611, lng: 106.7721, t: 'school' },
            { name: 'Bến xe Miền Tây', lat: 10.7464, lng: 106.6290, t: 'market' },
            { name: 'Khu ăn uống Vĩnh Khánh', lat: 10.7620, lng: 106.7060, t: 'food' }
        ]
    };
    var WEIGHT = {
        m: { airport: 5, office: 4, school: 3, market: 4, food: 2, fun: 2 },
        n: { airport: 2, office: 4, school: 2, market: 3, food: 5, fun: 2 },
        a: { airport: 3, office: 4, school: 5, market: 5, food: 3, fun: 2 },
        e: { airport: 4, office: 3, school: 2, market: 3, food: 4, fun: 5 },
        l: { airport: 5, office: 1, school: 1, market: 1, food: 2, fun: 4 }
    };
    var aiOn = false, aiLayers = [], aiTimer = null, aiRain = false;
    function aiSlot() { var h = new Date().getHours(); if (h >= 5 && h < 10) return 'm'; if (h >= 10 && h < 14) return 'n'; if (h >= 14 && h < 18) return 'a'; if (h >= 18 && h < 23) return 'e'; return 'l'; }
    function aiCity() { var lat = (typeof currentLat !== 'undefined' && currentLat) ? currentLat : 21.0285; return lat > 15 ? 'HN' : 'HCM'; }
    function aiScore(p) { var s = WEIGHT[aiSlot()][p.t] || 2; if (aiRain && (p.t === 'airport' || p.t === 'fun')) s += 1; if (aiRain && p.t === 'market') s -= 1; return s; }
    function aiColor(s) { return s >= 5 ? '#d32f2f' : s >= 4 ? '#ff6b35' : s >= 3 ? '#f7931e' : '#00bfa5'; }
    function aiCheckWeather() {
        var lat = (typeof currentLat !== 'undefined' && currentLat) ? currentLat : 21.0285;
        var lng = (typeof currentLng !== 'undefined' && currentLng) ? currentLng : 105.8542;
        fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&current_weather=true')
            .then(function(r) { return r.json(); })
            .then(function(d) { aiRain = d.current_weather && d.current_weather.weathercode >= 51; if (aiOn) aiDraw(); })
            .catch(function() {});
    }
    function aiDraw() {
        if (typeof map === 'undefined' || !map) return;
        aiLayers.forEach(function(l) { try { map.removeLayer(l); } catch(e) {} });
        aiLayers = [];
        var list = HOTSPOTS_AI[aiCity()].slice().sort(function(a, b) { return aiScore(b) - aiScore(a); });
        list.slice(0, 4).forEach(function(p) {
            var s = aiScore(p);
            var c = L.circle([p.lat, p.lng], { radius: 500 + s * 150, color: aiColor(s), weight: 2, fillColor: aiColor(s), fillOpacity: 0.25 }).addTo(map);
            c.bindTooltip('🔥 ' + p.name + ' — nhu cầu ' + s + '/5');
            aiLayers.push(c);
        });
        var top = list[0];
        if (typeof showToast === 'function') showToast('🤖 AI: nên về ' + top.name + ' (nhu cầu ' + aiScore(top) + '/5)');
        if (typeof speak === 'function') speak('AI đề xuất di chuyển về ' + top.name);
    }
    function toggleAI(on) {
        aiOn = (on === undefined) ? !aiOn : on;
        if (aiOn) {
            aiCheckWeather(); aiDraw();
            if (!aiTimer) aiTimer = setInterval(function() { aiCheckWeather(); aiDraw(); }, 600000);
            if (typeof showToast === 'function') showToast('🤖 Đã bật AI trợ lý');
        } else {
            aiLayers.forEach(function(l) { try { map.removeLayer(l); } catch(e) {} });
            aiLayers = [];
            if (aiTimer) { clearInterval(aiTimer); aiTimer = null; }
            if (typeof showToast === 'function') showToast('🤖 Đã tắt AI trợ lý');
        }
    }
    window.toggleAI = toggleAI;

    function addMenuItems() {
        var menu = document.querySelector('.sidebar-menu');
        if (!menu || menu.dataset.cleanFixAdded) return;
        menu.dataset.cleanFixAdded = '1';
        var logout = Array.from(menu.querySelectorAll('.sidebar-item')).find(function(x) { return (x.innerText || '').includes('Đăng xuất'); });
        var hasDark = Array.from(menu.querySelectorAll('.sidebar-item')).some(function(x) { return (x.innerText || '').includes('Chế độ tối'); });
        var hasLang = Array.from(menu.querySelectorAll('.sidebar-item')).some(function(x) { return (x.innerText || '').includes('Ngôn ngữ'); });
        var hasAI = Array.from(menu.querySelectorAll('.sidebar-item')).some(function(x) { return (x.innerText || '').includes('Bản đồ nhiệt AI'); });
        var hasGPS = Array.from(menu.querySelectorAll('.sidebar-item')).some(function(x) { return (x.innerText || '').includes('Theo dõi vị trí'); });
        var mk = function(icon, label, fn) {
            var d = document.createElement('div');
            d.className = 'sidebar-item';
            d.innerHTML = '<span style="width:24px;text-align:center;font-size:18px;">' + icon + '</span><span>' + label + '</span>';
            d.onclick = fn;
            return d;
        };
        var items = [];
        if (!hasAI) items.push(mk('🤖', 'Bản đồ nhiệt AI', function(){ toggleAI(); }));
        if (!hasGPS) items.push(mk('🎯', 'Theo dõi vị trí', toggleFollow));
        if (!hasLang) items.push(mk('🌐', 'Ngôn ngữ: ' + ((localStorage.getItem('promax_lang') || 'vi') === 'vi' ? 'Tiếng Việt' : 'English'), triggerLang));
        if (!hasDark) items.push(mk('🌓', 'Sáng / Tối', triggerDark));
        if (logout) { items.reverse().forEach(function(it) { menu.insertBefore(it, logout); }); }
        else { items.forEach(function(it) { menu.appendChild(it); }); }
    }

    /* ===== KHỞI ĐỘNG ===== */
    function boot() {
        hideFloatingMoon(); addMenuItems();
        setInterval(function() { hideFloatingMoon(); addMenuItems(); }, 1000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
