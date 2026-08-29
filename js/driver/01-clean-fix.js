// ============================================================
// 🧰 CLEAN FIX v5.1: GPS + MENU + AI TOÀN QUỐC + BÁN KÍNH THÔNG MINH
// ============================================================
(function(){
    /* ===== CSS: sửa menu ===== */
    var css = document.createElement('style');
    css.textContent =
        '.sidebar{display:flex;flex-direction:column;overflow:hidden;}' +
        '.sidebar-menu{flex:1;overflow-y:auto;padding-bottom:10px !important;}' +
        '.sidebar-footer{position:relative !important;bottom:auto !important;background:#fff;border-top:1px solid #eee;padding:12px 20px !important;}' +
        '.sidebar-footer .badge{display:block !important;margin:4px 0 !important;}' +
        '#langSwitcher,#aiBtn,#fixGpsBtn,[id*="aiBtn"],[id*="AiBtn"]{display:none !important;}';
    document.head.appendChild(css);

    /* ===== FOLLOW GPS ===== */
    var followMode = true, gpsHinted = false;
    function fixGpsTick(lat, lng, acc) {
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
    function startFixGps() { return false; }
    function toggleFollow() {
        followMode = !followMode;
        if (followMode && typeof currentLat !== 'undefined' && currentLat && typeof map !== 'undefined' && map) {
            map.flyTo([currentLat, currentLng], 17, { duration: 1 });
        }
        if (typeof forceRefreshGPS === 'function') forceRefreshGPS();
        if (typeof showToast === 'function') showToast(followMode ? '🎯 BẬT theo dõi vị trí' : '🎯 TẮT theo dõi vị trí');
    }

    /* ===== Ẩn nút nổi ===== */
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

    /* ===== Menu items ===== */
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

    /* ====== AI TRỢ LÝ TOÀN QUỐC – TÍCH HỢP BÁN KÍNH THÔNG MINH ====== */
    // 1. Dữ liệu 63 tỉnh thành (tọa độ trung tâm) – em lấy từ API Vietnam-Provinces, ở đây rút gọn các tỉnh trọng điểm
    var CITY_COORDS = {
        // Miền Bắc
        'Hà Nội': { lat: 21.0285, lng: 105.8542, type: 'tp' },
        'Bắc Ninh': { lat: 21.1833, lng: 106.0500, type: 'tinh' },
        'Hưng Yên': { lat: 20.6500, lng: 106.0500, type: 'tinh' },
        'Hải Dương': { lat: 20.9500, lng: 106.3333, type: 'tinh' },
        'Quảng Ninh (Hạ Long)': { lat: 20.9511, lng: 107.0800, type: 'tinh' },
        'Hải Phòng': { lat: 20.8575, lng: 106.6833, type: 'tp' },
        'Thái Bình': { lat: 20.4500, lng: 106.3333, type: 'tinh' },
        'Nam Định': { lat: 20.4333, lng: 106.1667, type: 'tinh' },
        'Ninh Bình': { lat: 20.2500, lng: 105.9667, type: 'tinh' },
        'Vĩnh Phúc': { lat: 21.3000, lng: 105.6000, type: 'tinh' },
        'Phú Thọ': { lat: 21.4167, lng: 105.2333, type: 'tinh' },
        'Thái Nguyên': { lat: 21.6000, lng: 105.8333, type: 'tinh' },
        'Bắc Giang': { lat: 21.2667, lng: 106.2000, type: 'tinh' },
        'Lạng Sơn': { lat: 21.8500, lng: 106.7333, type: 'tinh' },
        'Cao Bằng': { lat: 22.6667, lng: 106.2500, type: 'tinh' },
        'Lào Cai': { lat: 22.4833, lng: 103.9667, type: 'tinh' },
        'Yên Bái': { lat: 21.7000, lng: 104.8833, type: 'tinh' },
        'Hà Giang': { lat: 22.8333, lng: 104.9833, type: 'tinh' },
        'Tuyên Quang': { lat: 21.8167, lng: 105.2167, type: 'tinh' },
        // Miền Trung
        'Đà Nẵng': { lat: 16.0544, lng: 108.2022, type: 'tp' },
        'Huế': { lat: 16.4667, lng: 107.6000, type: 'tinh' },
        'Quảng Nam': { lat: 15.5500, lng: 108.0500, type: 'tinh' },
        'Quảng Ngãi': { lat: 15.1167, lng: 108.8000, type: 'tinh' },
        'Bình Định': { lat: 13.7667, lng: 109.2333, type: 'tinh' },
        'Phú Yên': { lat: 13.1000, lng: 109.3000, type: 'tinh' },
        'Nha Trang (Khánh Hòa)': { lat: 12.2420, lng: 109.1917, type: 'tinh' },
        'Ninh Thuận': { lat: 11.5667, lng: 108.9833, type: 'tinh' },
        'Bình Thuận': { lat: 10.9333, lng: 108.1000, type: 'tinh' },
        'Kon Tum': { lat: 14.3500, lng: 108.0000, type: 'tinh' },
        'Gia Lai': { lat: 13.9833, lng: 108.0000, type: 'tinh' },
        'Đắk Lắk': { lat: 12.6667, lng: 108.0500, type: 'tinh' },
        'Đà Lạt (Lâm Đồng)': { lat: 11.9421, lng: 108.4383, type: 'tinh' },
        // Miền Nam
        'TP.HCM': { lat: 10.8231, lng: 106.6297, type: 'tp' },
        'Vũng Tàu (Bà Rịa)': { lat: 10.3567, lng: 107.0842, type: 'tinh' },
        'Đồng Nai': { lat: 10.9500, lng: 106.8333, type: 'tinh' },
        'Bình Dương': { lat: 11.0000, lng: 106.6667, type: 'tinh' },
        'Tây Ninh': { lat: 11.3333, lng: 106.1333, type: 'tinh' },
        'Long An': { lat: 10.5333, lng: 106.4000, type: 'tinh' },
        'Tiền Giang': { lat: 10.3667, lng: 106.3667, type: 'tinh' },
        'Bến Tre': { lat: 10.2333, lng: 106.3833, type: 'tinh' },
        'Vĩnh Long': { lat: 10.2500, lng: 106.0000, type: 'tinh' },
        'Cần Thơ': { lat: 10.0452, lng: 105.7468, type: 'tp' },
        'Đồng Tháp': { lat: 10.4667, lng: 105.6333, type: 'tinh' },
        'An Giang': { lat: 10.3833, lng: 105.4167, type: 'tinh' },
        'Kiên Giang': { lat: 10.0167, lng: 105.0833, type: 'tinh' },
        'Cà Mau': { lat: 9.1833, lng: 105.1500, type: 'tinh' },
        'Bạc Liêu': { lat: 9.2833, lng: 105.7167, type: 'tinh' },
        'Sóc Trăng': { lat: 9.6000, lng: 105.9667, type: 'tinh' },
        'Hậu Giang': { lat: 9.7833, lng: 105.4667, type: 'tinh' },
        'Trà Vinh': { lat: 9.9500, lng: 106.3500, type: 'tinh' },
    };

    // 2. Danh sách điểm nóng – ánh xạ theo tỉnh (mỗi tỉnh có 3-7 điểm)
    var HOTSPOTS_AI = {
        'Hà Nội': [
            { name: 'Sân bay Nội Bài', lat: 21.2142, lng: 105.8075, t: 'airport' },
            { name: 'Bến xe Mỹ Đình', lat: 21.0085, lng: 105.7892, t: 'market' },
            { name: 'Hoàn Kiếm / Phố cổ', lat: 21.0285, lng: 105.8542, t: 'fun' },
            { name: 'Cầu Giấy / Văn phòng', lat: 21.0352, lng: 105.7878, t: 'office' },
            { name: 'Times City', lat: 21.0015, lng: 105.8625, t: 'office' },
            { name: 'Khu ăn uống Tống Duy Tân', lat: 21.0295, lng: 105.8495, t: 'food' },
            { name: 'Làng ĐH Bách Khoa', lat: 21.0058, lng: 105.8426, t: 'school' },
        ],
        'TP.HCM': [
            { name: 'Sân bay Tân Sơn Nhất', lat: 10.8188, lng: 106.6519, t: 'airport' },
            { name: 'Quận 1 / Nguyễn Huệ', lat: 10.7769, lng: 106.7009, t: 'fun' },
            { name: 'Phú Mỹ Hưng', lat: 10.7288, lng: 106.7181, t: 'office' },
            { name: 'Thủ Đức / Làng ĐH', lat: 10.8611, lng: 106.7721, t: 'school' },
            { name: 'Bến xe Miền Tây', lat: 10.7464, lng: 106.6290, t: 'market' },
            { name: 'Khu ăn uống Vĩnh Khánh', lat: 10.7620, lng: 106.7060, t: 'food' },
            { name: 'Quận 7 / Khu đô thị mới', lat: 10.7390, lng: 106.7260, t: 'office' }
        ],
        'Đà Nẵng': [
            { name: 'Sân bay Đà Nẵng', lat: 16.0439, lng: 108.1994, t: 'airport' },
            { name: 'Bãi biển Mỹ Khê', lat: 16.0572, lng: 108.2442, t: 'fun' },
            { name: 'Trung tâm thành phố', lat: 16.0544, lng: 108.2022, t: 'office' },
            { name: 'Bến xe Đà Nẵng', lat: 16.0428, lng: 108.2172, t: 'market' },
            { name: 'Khu du lịch Bà Nà', lat: 15.9969, lng: 107.9869, t: 'fun' }
        ],
        'Hải Phòng': [
            { name: 'Sân bay Cát Bi', lat: 20.8167, lng: 106.7244, t: 'airport' },
            { name: 'Trung tâm thành phố', lat: 20.8575, lng: 106.6833, t: 'fun' },
            { name: 'Bến xe Lạc Long', lat: 20.8481, lng: 106.6950, t: 'market' },
            { name: 'Khu công nghiệp Đình Vũ', lat: 20.8067, lng: 106.6917, t: 'office' }
        ],
        'Cần Thơ': [
            { name: 'Sân bay Cần Thơ', lat: 10.0852, lng: 105.7119, t: 'airport' },
            { name: 'Trung tâm thành phố', lat: 10.0452, lng: 105.7468, t: 'fun' },
            { name: 'Bến xe Cần Thơ', lat: 10.0352, lng: 105.7808, t: 'market' },
            { name: 'Khu công nghiệp Trà Nóc', lat: 10.0600, lng: 105.7333, t: 'office' }
        ],
        'Quảng Ninh (Hạ Long)': [
            { name: 'Sân bay Quốc tế Vân Đồn', lat: 21.1179, lng: 107.4143, t: 'airport' },
            { name: 'Khu du lịch Tuần Châu', lat: 20.9300, lng: 107.0667, t: 'fun' },
            { name: 'Trung tâm TP Hạ Long', lat: 20.9511, lng: 107.0800, t: 'fun' },
            { name: 'Bến xe Bãi Cháy', lat: 20.9675, lng: 107.0500, t: 'market' }
        ],
        'Nha Trang (Khánh Hòa)': [
            { name: 'Sân bay Cam Ranh', lat: 11.9985, lng: 109.2198, t: 'airport' },
            { name: 'Trung tâm thành phố', lat: 12.2420, lng: 109.1917, t: 'fun' },
            { name: 'Bến xe Nha Trang', lat: 12.2520, lng: 109.2017, t: 'market' },
            { name: 'Khu du lịch Vinpearl', lat: 12.2075, lng: 109.2533, t: 'fun' }
        ],
        'Huế': [
            { name: 'Trung tâm thành phố', lat: 16.4667, lng: 107.6000, t: 'fun' },
            { name: 'Sân bay Phú Bài', lat: 16.4014, lng: 107.7028, t: 'airport' },
            { name: 'Bến xe Huế', lat: 16.4567, lng: 107.5833, t: 'market' }
        ],
        'Đà Lạt (Lâm Đồng)': [
            { name: 'Trung tâm thành phố', lat: 11.9421, lng: 108.4383, t: 'fun' },
            { name: 'Sân bay Liên Khương', lat: 11.7506, lng: 108.3670, t: 'airport' },
            { name: 'Chợ Đà Lạt', lat: 11.9469, lng: 108.4417, t: 'market' }
        ],
        // Có thể thêm điểm nóng cho các tỉnh khác nếu cần
    };
    // Nếu tỉnh nào chưa có điểm nóng, dùng tập mặc định của tỉnh lân cận
    var DEFAULT_HOTSPOTS = HOTSPOTS_AI['Hà Nội'];

    // 3. Hàm khoảng cách Haversine
    function distance(lat1, lng1, lat2, lng2) {
        var R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // 4. Xác định tỉnh hiện tại và bán kính động
    function getCurrentCityAndRadius() {
        var lat = (typeof currentLat !== 'undefined' && currentLat) ? currentLat : 21.0285;
        var lng = (typeof currentLng !== 'undefined' && currentLng) ? currentLng : 105.8542;
        var minDist = Infinity, nearest = null;
        for (var city in CITY_COORDS) {
            var c = CITY_COORDS[city];
            var d = distance(lat, lng, c.lat, c.lng);
            if (d < minDist) {
                minDist = d;
                nearest = city;
            }
        }
        // Phân loại khu vực để chọn bán kính
        var type = CITY_COORDS[nearest] ? CITY_COORDS[nearest].type : 'tinh';
        var radius = 7; // mặc định
        if (type === 'tp') radius = 5;        // thành phố lớn
        else if (type === 'tinh') radius = 8; // tỉnh
        // Nếu khoảng cách tới trung tâm > 50 km, coi như đang ở vùng xa → tăng bán kính
        if (minDist > 50) radius = 12;
        if (minDist > 100) radius = 15;
        return { city: nearest, radius: radius, distance: minDist };
    }

    // 5. Trọng số theo thời gian
    var WEIGHT = {
        m: { airport: 5, office: 4, school: 3, market: 4, food: 2, fun: 2 },
        n: { airport: 2, office: 4, school: 2, market: 3, food: 5, fun: 2 },
        a: { airport: 3, office: 4, school: 5, market: 5, food: 3, fun: 2 },
        e: { airport: 4, office: 3, school: 2, market: 3, food: 4, fun: 5 },
        l: { airport: 5, office: 1, school: 1, market: 1, food: 2, fun: 4 }
    };
    function aiSlot() { var h = new Date().getHours(); if (h >= 5 && h < 10) return 'm'; if (h >= 10 && h < 14) return 'n'; if (h >= 14 && h < 18) return 'a'; if (h >= 18 && h < 23) return 'e'; return 'l'; }
    function aiScore(p) { return WEIGHT[aiSlot()][p.t] || 2; }

    // 6. Biến toàn cục
    var aiOn = false, aiLayers = [], aiTimer = null, aiRain = false;

    // 7. Lấy điểm nóng trong bán kính
    function getHotspotsInRadius() {
        var lat = (typeof currentLat !== 'undefined' && currentLat) ? currentLat : 21.0285;
        var lng = (typeof currentLng !== 'undefined' && currentLng) ? currentLng : 105.8542;
        var info = getCurrentCityAndRadius();
        var city = info.city;
        var radius = info.radius;
        var spots = HOTSPOTS_AI[city] || DEFAULT_HOTSPOTS;
        var filtered = [];
        spots.forEach(function(p) {
            var d = distance(lat, lng, p.lat, p.lng);
            if (d <= radius) {
                filtered.push({ point: p, dist: d });
            }
        });
        // Sắp xếp theo điểm số giảm dần, rồi khoảng cách tăng dần
        filtered.sort(function(a, b) {
            var sa = aiScore(a.point);
            var sb = aiScore(b.point);
            if (sa !== sb) return sb - sa;
            return a.dist - b.dist;
        });
        return { city: city, radius: radius, hotspots: filtered };
    }

    // 8. Vẽ AI và thông báo
    function aiDraw() {
        if (typeof map === 'undefined' || !map) return;
        aiLayers.forEach(function(l) { try { map.removeLayer(l); } catch(e) {} });
        aiLayers = [];

        var result = getHotspotsInRadius();
        var city = result.city;
        var radius = result.radius;
        var list = result.hotspots;
        var msg = '🤖 AI: ' + city + ' — Bán kính ' + radius + 'km, có ' + list.length + ' điểm nóng.';

        // Lấy top 5 gần nhất và điểm cao
        var top5 = list.slice(0, 5);
        top5.forEach(function(item) {
            var p = item.point;
            var s = aiScore(p);
            var color = s >= 5 ? '#d32f2f' : s >= 4 ? '#ff6b35' : s >= 3 ? '#f7931e' : '#00bfa5';
            var circle = L.circle([p.lat, p.lng], {
                radius: 400 + s * 120,
                color: color,
                weight: 2,
                fillColor: color,
                fillOpacity: 0.25
            }).addTo(map);
            var tooltip = '🔥 ' + p.name + ' (nhu cầu ' + s + '/5, cách ' + item.dist.toFixed(1) + 'km)';
            circle.bindTooltip(tooltip);
            aiLayers.push(circle);
        });

        // Thông báo nổi bật cho điểm tốt nhất
        if (list.length > 0) {
            var best = list[0];
            msg += ' ✅ Gợi ý: ' + best.point.name + ' (nhu cầu ' + aiScore(best.point) + '/5, cách ' + best.dist.toFixed(1) + 'km)';
        } else {
            msg += ' ⚠️ Không có điểm nóng nào trong bán kính, hãy di chuyển đến trung tâm.';
        }
        if (typeof showToast === 'function') showToast(msg);
        if (typeof speak === 'function' && list.length > 0) speak('AI gợi ý: ' + list[0].point.name);
    }

    function aiCheckWeather() {
        var lat = (typeof currentLat !== 'undefined' && currentLat) ? currentLat : 21.0285;
        var lng = (typeof currentLng !== 'undefined' && currentLng) ? currentLng : 105.8542;
        fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng + '&current_weather=true')
            .then(function(r) { return r.json(); })
            .then(function(d) { aiRain = d.current_weather && d.current_weather.weathercode >= 51; if (aiOn) aiDraw(); })
            .catch(function() {});
    }

    function toggleAI(on) {
        aiOn = (on === undefined) ? !aiOn : on;
        if (aiOn) {
            aiCheckWeather();
            aiDraw();
            if (!aiTimer) aiTimer = setInterval(function() { aiCheckWeather(); aiDraw(); }, 600000);
            if (typeof showToast === 'function') showToast('🤖 Đã bật AI trợ lý toàn quốc – bán kính thông minh');
        } else {
            aiLayers.forEach(function(l) { try { map.removeLayer(l); } catch(e) {} });
            aiLayers = [];
            if (aiTimer) { clearInterval(aiTimer); aiTimer = null; }
            if (typeof showToast === 'function') showToast('🤖 Đã tắt AI trợ lý');
        }
    }
    window.toggleAI = toggleAI;

    /* ===== Thêm menu ===== */
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
        hideFloatingMoon();
        addMenuItems();
        setInterval(function() { hideFloatingMoon(); addMenuItems(); }, 1000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();