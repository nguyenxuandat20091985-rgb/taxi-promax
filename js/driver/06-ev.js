// Extracted from index.html; load order is intentionally preserved.
(function(){
    var css = document.createElement('style');
    css.textContent =
        '.ev-overlay{position:fixed;inset:0;background:rgba(10,15,25,.6);backdrop-filter:blur(6px);z-index:15000;display:none;align-items:flex-end;justify-content:center;}' +
        '.ev-overlay.show{display:flex;}' +
        '.ev-sheet{background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;max-height:92vh;overflow-y:auto;padding-bottom:20px;}' +
        '.ev-head{background:linear-gradient(135deg,#00796b,#00bfa5);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:24px 24px 0 0;position:sticky;top:0;z-index:5;}' +
        '.ev-body{padding:16px;}' +
        '.ev-batt-card{border-radius:16px;padding:16px;margin-bottom:14px;background:#f0fdfa;border:1px solid #99f6e4;}' +
        '.ev-batt-val{font-size:30px;font-weight:900;}' +
        '.ev-batt-bar{height:10px;border-radius:6px;background:#e2e8f0;overflow:hidden;margin:8px 0;}' +
        '.ev-batt-fill{height:100%;border-radius:6px;transition:width .3s,background .3s;}' +
        '.ev-quick{display:flex;gap:8px;margin:10px 0;}' +
        '.ev-quick button{flex:1;padding:8px;border:1px solid #cbd5e1;background:#fff;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;}' +
        '.ev-station{display:flex;align-items:center;gap:10px;border:1px solid #e2e8f0;border-radius:14px;padding:12px;margin-bottom:8px;}' +
        '.ev-station .ico{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#00796b,#00bfa5);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}' +
        '.ev-station .info{flex:1;min-width:0;}' +
        '.ev-station .name{font-size:13px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
        '.ev-station .dist{font-size:11px;color:#64748b;}' +
        '.ev-station a{background:#0054a3;color:#fff;text-decoration:none;font-size:11px;font-weight:800;padding:8px 10px;border-radius:10px;flex-shrink:0;}';
    document.head.appendChild(css);

    var evMarkers = [];
    function evHav(a, b, c, d) {
        var R = 6371, dLa = (c - a) * Math.PI / 180, dLo = (d - b) * Math.PI / 180;
        var x = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }
    function getPos() {
        var lat = (typeof currentLat !== 'undefined' && currentLat) ? currentLat : 21.0285;
        var lng = (typeof currentLng !== 'undefined' && currentLng) ? currentLng : 105.8542;
        return { lat: lat, lng: lng };
    }
    function fallbackStations(lat) {
        if (lat > 15) return [
            { name: 'Trạm sạc VinFast Cầu Giấy', lat: 21.0352, lng: 105.7878 },
            { name: 'Trạm sạc VinFast Times City', lat: 21.0015, lng: 105.8625 },
            { name: 'Trạm sạc VinFast Hà Đông', lat: 20.9714, lng: 105.7776 },
            { name: 'Trạm sạc VinFast Nội Bài', lat: 21.2142, lng: 105.8075 }
        ];
        return [
            { name: 'Trạm sạc VinFast Quận 1', lat: 10.7769, lng: 106.7009 },
            { name: 'Trạm sạc VinFast Phú Mỹ Hưng', lat: 10.7288, lng: 106.7181 },
            { name: 'Trạm sạc VinFast Tân Sơn Nhất', lat: 10.8188, lng: 106.6519 },
            { name: 'Trạm sạc VinFast Thủ Đức', lat: 10.8611, lng: 106.7721 }
        ];
    }

    /* ===== Modal ===== */
    function buildEVModal() {
        if (document.getElementById('evModal')) return;
        var m = document.createElement('div');
        m.id = 'evModal'; m.className = 'ev-overlay';
        m.innerHTML =
            '<div class="ev-sheet"><div class="ev-head"><b>⚡ Xe điện & Trạm sạc</b>' +
            '<button onclick="document.getElementById(\'evModal\').classList.remove(\'show\')" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div class="ev-body">' +
            '<div class="ev-batt-card">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:13px;font-weight:700;color:#0f766e;">🔋 Mức pin hiện tại</span><span id="evEco" style="font-size:12px;font-weight:800;color:#00796b;"></span></div>' +
            '<div class="ev-batt-val" id="evBattVal">--%</div>' +
            '<div class="ev-batt-bar"><div class="ev-batt-fill" id="evBattFill" style="width:0%;"></div></div>' +
            '<input type="range" id="evBattRange" min="5" max="100" step="5" value="80" style="width:100%;accent-color:#00bfa5;">' +
            '<div class="ev-quick">' +
            '<button onclick="evSetBatt(100)">100%</button><button onclick="evSetBatt(80)">80%</button>' +
            '<button onclick="evSetBatt(50)">50%</button><button onclick="evSetBatt(20)">20%</button></div>' +
            '<button id="evSaveBatt" style="width:100%;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#00796b,#00bfa5);color:#fff;font-weight:800;font-size:14px;cursor:pointer;">💾 Lưu mức pin</button>' +
            '</div>' +
            '<button id="evFindBtn" style="width:100%;padding:13px;border:none;border-radius:12px;background:#0054a3;color:#fff;font-weight:800;font-size:14px;cursor:pointer;margin-bottom:12px;">🔌 Tìm trạm sạc gần nhất</button>' +
            '<div id="evList"></div>' +
            '</div></div>';
        document.body.appendChild(m);
        document.getElementById('evBattRange').oninput = function() { evPreview(parseInt(this.value)); };
        document.getElementById('evSaveBatt').onclick = evSaveBatt;
        document.getElementById('evFindBtn').onclick = findStations;
    }
    function evColor(v) { return v > 50 ? '#00bfa5' : v > 30 ? '#f7931e' : '#d32f2f'; }
    function evPreview(v) {
        var val = document.getElementById('evBattVal');
        var fill = document.getElementById('evBattFill');
        if (val) { val.textContent = v + '%'; val.style.color = evColor(v); }
        if (fill) { fill.style.width = v + '%'; fill.style.background = evColor(v); }
    }
    window.evSetBatt = function(v) {
        var r = document.getElementById('evBattRange');
        if (r) r.value = v;
        evPreview(v);
    };
    function evSaveBatt() {
        var v = parseInt(document.getElementById('evBattRange').value);
        localStorage.setItem('promax_battery', v);
        try {
            if (window.driverInfo && driverInfo.uid && typeof db !== 'undefined') {
                db.ref('drivers/' + driverInfo.uid + '/battery').set({ level: v, updatedAt: Date.now() });
            }
        } catch(e) {}
        evPreview(v);
        if (typeof showToast === 'function') showToast('💾 Đã lưu pin ' + v + '%');
        if (v <= 30) evLowAlert();
    }
    function evLowAlert() {
        if (typeof showToast === 'function') showToast('⚠️ Pin thấp! Nên tìm trạm sạc gần nhất');
        if (typeof speak === 'function') speak('Pin thấp. Đề xuất tìm trạm sạc gần nhất.');
    }
    function evCheckOnBoot() {
        var v = parseInt(localStorage.getItem('promax_battery') || '0');
        if (v > 0 && v <= 30) setTimeout(evLowAlert, 3000);
    }

    /* ===== Tìm trạm sạc ===== */
    function clearEvMarkers() {
        evMarkers.forEach(function(mk) { try { map.removeLayer(mk); } catch(e) {} });
        evMarkers = [];
    }
    function findStations() {
        var p = getPos();
        var box = document.getElementById('evList');
        box.innerHTML = '<div style="text-align:center;padding:16px;color:#64748b;font-size:13px;">⏳ Đang tìm trạm sạc quanh bạn...</div>';
        var q = '[out:json][timeout:12];node[amenity=charging_station](around:8000,' + p.lat + ',' + p.lng + ');out body 15;';
        fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q))
            .then(function(r) { return r.json(); })
            .then(function(d) {
                var list = (d.elements || []).map(function(e) {
                    return { name: (e.tags && e.tags.name) || 'Trạm sạc', lat: e.lat, lng: e.lon };
                });
                if (!list.length) list = fallbackStations(p.lat);
                renderStations(list);
            })
            .catch(function() { renderStations(fallbackStations(p.lat)); });
    }
    function renderStations(list) {
        var p = getPos();
        list.forEach(function(s) { s.d = evHav(p.lat, p.lng, s.lat, s.lng); });
        list.sort(function(a, b) { return a.d - b.d; });
        list = list.slice(0, 6);
        var box = document.getElementById('evList');
        if (!list.length) { box.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:13px;">Không tìm thấy trạm gần đây</div>'; return; }
        box.innerHTML = list.map(function(s) {
            return '<div class="ev-station"><div class="ico">⚡</div>' +
                '<div class="info"><div class="name">' + s.name + '</div><div class="dist">📍 Cách ' + s.d.toFixed(1) + ' km</div></div>' +
                '<a href="https://www.google.com/maps/dir/?api=1&origin=' + p.lat + ',' + p.lng + '&destination=' + s.lat + ',' + s.lng + '" target="_blank">🧭 Đến</a></div>';
        }).join('');
        // Chấm ⚡ lên bản đồ
        if (typeof map !== 'undefined' && map && typeof L !== 'undefined') {
            clearEvMarkers();
            list.forEach(function(s) {
                var mk = L.circleMarker([s.lat, s.lng], { radius: 9, color: '#00796b', weight: 2, fillColor: '#00bfa5', fillOpacity: 0.7 })
                    .addTo(map).bindTooltip('⚡ ' + s.name + ' (' + s.d.toFixed(1) + ' km)');
                evMarkers.push(mk);
            });
        }
        if (typeof showToast === 'function') showToast('⚡ Tìm thấy ' + list.length + ' trạm sạc');
    }

    /* ===== Điểm Eco (trừ khi tăng tốc/phanh gấp) ===== */
    var ecoScore = parseInt(localStorage.getItem('promax_eco') || '100');
    var lastV = null, lastT = null;
    function updateEcoUI() {
        var el = document.getElementById('evEco');
        if (el) el.textContent = '🌿 Eco: ' + ecoScore + '/100';
    }
    function startEco() {
        if (!('geolocation' in navigator)) return;
        navigator.geolocation.watchPosition(function(p) {
            if (p.coords.speed == null) return;
            var v = p.coords.speed, t = p.timestamp;
            if (lastV != null && lastT != null) {
                var dt = (t - lastT) / 1000;
                if (dt > 0 && dt < 5) {
                    var a = Math.abs(v - lastV) / dt;
                    if (a > 3) {
                        ecoScore = Math.max(60, ecoScore - 2);
                        localStorage.setItem('promax_eco', ecoScore);
                        updateEcoUI();
                    }
                }
            }
            lastV = v; lastT = t;
        }, function() {}, { enableHighAccuracy: false, maximumAge: 5000 });
    }

    /* ===== Mở modal + menu ===== */
    function openEV() {
        buildEVModal();
        document.getElementById('evModal').classList.add('show');
        var v = parseInt(localStorage.getItem('promax_battery') || '80');
        var r = document.getElementById('evBattRange');
        if (r) r.value = v;
        evPreview(v);
        updateEcoUI();
    }
    window.openEV = openEV;

    function addEVMenu() {
        var menu = document.querySelector('.sidebar-menu');
        if (!menu || menu.dataset.evAdded) return;
        menu.dataset.evAdded = '1';
        var logout = null;
        for (var i = 0; i < menu.children.length; i++) {
            if ((menu.children[i].innerText || '').indexOf('Đăng xuất') !== -1) logout = menu.children[i];
        }
        var d = document.createElement('div');
        d.className = 'sidebar-item';
        d.innerHTML = '<span style="width:24px;text-align:center;font-size:18px;">⚡</span><span>Xe điện & Trạm sạc</span>';
        d.onclick = openEV;
        if (logout) menu.insertBefore(d, logout); else menu.appendChild(d);
    }

    function boot() { addEVMenu(); startEco(); evCheckOnBoot(); setInterval(addEVMenu, 1000); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
