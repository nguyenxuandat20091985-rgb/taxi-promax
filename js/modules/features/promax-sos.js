/* ProMax extracted module: promax-sos */
(function(){
    var ADMIN_PHONE = '0388724966';
    var sosState = { code: null, liveTimer: null, recEnd: 0, cdTimer: null };

    var css = document.createElement('style');
    css.textContent =
        '.sos-overlay{position:fixed;inset:0;background:linear-gradient(160deg,#7f1d1d,#d32f2f);z-index:17000;display:none;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;color:#fff;}' +
        '.sos-overlay.show{display:flex;}' +
        '.sos-pulse{width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:52px;animation:sosP 1.2s infinite;}' +
        '@keyframes sosP{0%{box-shadow:0 0 0 0 rgba(255,255,255,.4);}70%{box-shadow:0 0 0 30px rgba(255,255,255,0);}100%{box-shadow:0 0 0 0 rgba(255,255,255,0);}}' +
        '.sos-btn{width:100%;max-width:320px;padding:14px;border:none;border-radius:14px;font-size:15px;font-weight:900;cursor:pointer;margin-top:10px;}' +
        '.sos-item{border:1px solid #fecaca;border-radius:14px;padding:12px;margin-bottom:10px;background:#fff;}' ;
    document.head.appendChild(css);

    function sosPos() {
        var lat = (typeof currentLat !== 'undefined' && currentLat) ? currentLat : 21.0285;
        var lng = (typeof currentLng !== 'undefined' && currentLng) ? currentLng : 105.8542;
        return { lat: lat, lng: lng };
    }

    /* ===== Kích hoạt SOS (ghi đè openSOS cũ) ===== */
    function triggerSOS() {
        if (sosState.code) { if (typeof showToast === 'function') showToast('🚨 SOS đang hoạt động'); return; }
        if (!window.driverInfo || typeof db === 'undefined') return;
        var code = 'SOS' + Date.now().toString(36).toUpperCase();
        sosState.code = code;
        var p = sosPos();
        db.ref('sos/' + code).set({
            code: code, driverUid: driverInfo.uid, driverName: driverInfo.name || '',
            phone: driverInfo.phone || '', plate: driverInfo.plate || '',
            lat: p.lat, lng: p.lng, createdAt: Date.now(), status: 'active'
        });
        showSOSOverlay(code);
        startSOSRecording(code);
        startLiveLocation(code);
        if (typeof speak === 'function') speak('SOS khẩn cấp đã kích hoạt. Đang ghi âm và gửi vị trí.');
    }
    window.triggerSOS = triggerSOS;
    window.openSOS = triggerSOS; // ghi đè hàm cũ

    /* ===== Màn hình SOS ===== */
    function showSOSOverlay(code) {
        var ov = document.getElementById('sosOverlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'sosOverlay'; ov.className = 'sos-overlay';
            document.body.appendChild(ov);
        }
        sosState.recEnd = Date.now() + 120000;
        ov.innerHTML =
            '<div class="sos-pulse">🚨</div>' +
            '<div style="font-size:22px;font-weight:900;margin-top:16px;">SOS ĐÃ KÍCH HOẠT</div>' +
            '<div style="font-size:13px;opacity:.9;margin-top:6px;">Mã: ' + code + '</div>' +
            '<div id="sosRecStatus" style="margin-top:12px;font-size:14px;font-weight:800;">🎙 Đang ghi âm... 02:00</div>' +
            '<div style="font-size:11px;opacity:.85;margin-top:6px;">📍 Vị trí đang được gửi trực tiếp cho quản lý</div>' +
            '<div style="width:100%;max-width:320px;margin-top:22px;">' +
            '<a href="tel:113" class="sos-btn" style="display:block;background:#fff;color:#d32f2f;text-decoration:none;">📞 GỌI 113 NGAY</a>' +
            '<button class="sos-btn" style="background:rgba(255,255,255,.2);color:#fff;" onclick="cancelSOS()">❌ Báo động giả — Hủy</button>' +
            '</div>';
        ov.classList.add('show');
        if (sosState.cdTimer) clearInterval(sosState.cdTimer);
        sosState.cdTimer = setInterval(function() {
            var el = document.getElementById('sosRecStatus');
            if (!el) return;
            var s = Math.max(0, Math.round((sosState.recEnd - Date.now()) / 1000));
            if (s > 0) el.textContent = '🎙 Đang ghi âm... 0' + Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
            else el.textContent = '✅ Ghi âm đã lưu — vẫn gửi vị trí';
        }, 1000);
    }
    window.cancelSOS = function() {
        if (!sosState.code) return;
        try { db.ref('sos/' + sosState.code).update({ status: 'cancelled', cancelledAt: Date.now() }); } catch(e) {}
        stopSOSTimers();
        if (typeof showToast === 'function') showToast('Đã hủy báo động SOS');
    };
    function stopSOSTimers() {
        sosState.code = null;
        if (sosState.liveTimer) { clearInterval(sosState.liveTimer); sosState.liveTimer = null; }
        if (sosState.cdTimer) { clearInterval(sosState.cdTimer); sosState.cdTimer = null; }
        var ov = document.getElementById('sosOverlay');
        if (ov) ov.classList.remove('show');
    }

    /* ===== Ghi âm 2 phút ===== */
    function startSOSRecording(code) {
        if (!navigator.mediaDevices || !window.MediaRecorder) return;
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
            var opts = { audioBitsPerSecond: 16000 };
            var mimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
            for (var i = 0; i < mimes.length; i++) {
                if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mimes[i])) { opts.mimeType = mimes[i]; break; }
            }
            var rec = new MediaRecorder(stream, opts);
            var chunks = [];
            rec.ondataavailable = function(e) { if (e.data && e.data.size) chunks.push(e.data); };
            rec.onstop = function() {
                stream.getTracks().forEach(function(t) { t.stop(); });
                var blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
                if (blob.size > 3 * 1024 * 1024) {
                    if (typeof showToast === 'function') showToast('⚠️ Ghi âm SOS quá lớn, đã bỏ phần audio nhưng vẫn giữ cảnh báo');
                    return;
                }
                var fr = new FileReader();
                fr.onload = function() {
                    try { db.ref('sos/' + code).update({ audio: fr.result, audioType: blob.type, audioSavedAt: Date.now() }); } catch(e) {}
                };
                fr.readAsDataURL(blob);
            };
            rec.start();
            setTimeout(function() { try { rec.stop(); } catch(e) {} }, 120000);
        }).catch(function() {});
    }

    /* ===== Vị trí trực tiếp 10 phút ===== */
    function startLiveLocation(code) {
        var end = Date.now() + 600000;
        sosState.liveTimer = setInterval(function() {
            if (Date.now() > end || !sosState.code) { stopSOSTimers(); return; }
            var p = sosPos();
            try { db.ref('sos/' + code).update({ lat: p.lat, lng: p.lng, lastUpdate: Date.now() }); } catch(e) {}
        }, 5000);
    }

    /* ===== Admin: giám sát SOS ===== */
    function openSOSAdmin() {
        if (!window.driverInfo || String(driverInfo.phone) !== ADMIN_PHONE) {
            if (typeof showToast === 'function') showToast('⛔ Chỉ admin mới dùng');
            return;
        }
        var ov = document.getElementById('sosAdmin');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'sosAdmin'; ov.className = 'rc-overlay';
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,25,.6);backdrop-filter:blur(6px);z-index:15000;display:none;align-items:flex-end;justify-content:center;';
            ov.innerHTML = '<div style="background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;max-height:92vh;overflow-y:auto;padding-bottom:20px;">' +
                '<div style="background:linear-gradient(135deg,#7f1d1d,#d32f2f);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:24px 24px 0 0;position:sticky;top:0;z-index:5;"><b>🚨 Giám sát SOS</b>' +
                '<button onclick="document.getElementById(\'sosAdmin\').style.display=\'none\'" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
                '<div style="padding:16px;" id="sosAdminList"></div></div>';
            document.body.appendChild(ov);
        }
        ov.style.display = 'flex';
        loadSOSAdmin();
    }
    window.openSOSAdmin = openSOSAdmin;

    function loadSOSAdmin() {
        var box = document.getElementById('sosAdminList');
        box.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8;">Đang tải...</div>';
        db.ref('sos').orderByChild('createdAt').limitToLast(20).once('value').then(function(snap) {
            var list = [];
            if (snap.exists()) snap.forEach(function(c) { list.push(c.val()); });
            list.sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
            window._sosCache = list;
            box.innerHTML = list.length ? list.map(function(s, i) {
                var st = s.status === 'active' ? '🔴 ĐANG BÁO' : (s.status === 'safe' ? '✅ An toàn' : '❌ Đã hủy');
                return '<div class="sos-item">' +
                    '<div style="display:flex;justify-content:space-between;"><b style="font-size:13px;">👤 ' + (s.driverName || '---') + '</b><span style="font-size:11px;font-weight:800;">' + st + '</span></div>' +
                    '<div style="font-size:11px;color:#64748b;margin:4px 0;">📞 ' + (s.phone || '') + ' · ' + new Date(s.createdAt).toLocaleString('vi-VN') + '</div>' +
                    '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
                    '<a href="https://www.google.com/maps/?q=' + (s.lat || 0) + ',' + (s.lng || 0) + '" target="_blank" style="background:#0054a3;color:#fff;text-decoration:none;border-radius:10px;padding:8px 10px;font-size:11px;font-weight:800;">🗺 Vị trí</a>' +
                    '<a href="tel:' + (s.phone || '') + '" style="background:#00bfa5;color:#fff;text-decoration:none;border-radius:10px;padding:8px 10px;font-size:11px;font-weight:800;">📞 Gọi</a>' +
                    (s.audio ? '<button onclick="playSOSAudio(' + i + ')" style="background:#7f1d1d;color:#fff;border:none;border-radius:10px;padding:8px 10px;font-size:11px;font-weight:800;cursor:pointer;">🔊 Nghe</button>' : '') +
                    (s.status === 'active' ? '<button onclick="markSOSSafe(' + i + ')" style="background:#15803d;color:#fff;border:none;border-radius:10px;padding:8px 10px;font-size:11px;font-weight:800;cursor:pointer;">✅ An toàn</button>' : '') +
                    '</div></div>';
            }).join('') : '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:16px;">Không có báo động SOS nào 🎉</div>';
        });
    }
    window.playSOSAudio = function(i) {
        var s = window._sosCache[i];
        if (!s || !s.audio) return;
        var ov = document.getElementById('sosAudio');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'sosAudio';
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:18000;display:none;align-items:center;justify-content:center;padding:20px;';
            document.body.appendChild(ov);
        }
        ov.innerHTML = '<div style="background:#fff;border-radius:20px;padding:20px;width:100%;max-width:360px;text-align:center;">' +
            '<b style="font-size:14px;">🔊 Ghi âm khẩn cấp — ' + s.code + '</b>' +
            '<audio controls autoplay src="' + s.audio + '" style="width:100%;margin-top:12px;"></audio>' +
            '<button onclick="document.getElementById(\'sosAudio\').style.display=\'none\'" style="margin-top:12px;width:100%;padding:12px;border:none;border-radius:12px;background:#0054a3;color:#fff;font-weight:800;cursor:pointer;">Đóng</button></div>';
        ov.style.display = 'flex';
    };
    window.markSOSSafe = function(i) {
        var s = window._sosCache[i];
        if (!s) return;
        db.ref('sos/' + s.code).update({ status: 'safe', safeAt: Date.now() }).then(function() {
            if (typeof showToast === 'function') showToast('✅ Đã đánh dấu an toàn');
            loadSOSAdmin();
        });
    };

    /* ===== Menu ===== */
    function addSOSMenu() {
        var menu = document.querySelector('.sidebar-menu');
        if (!menu || menu.dataset.sosAdded || !window.driverInfo) return;
        menu.dataset.sosAdded = '1';
        if (String(driverInfo.phone) === ADMIN_PHONE) {
            var logout = null;
            for (var i = 0; i < menu.children.length; i++) {
                if ((menu.children[i].innerText || '').indexOf('Đăng xuất') !== -1) logout = menu.children[i];
            }
            var d = document.createElement('div');
            d.className = 'sidebar-item';
            d.innerHTML = '<span style="width:24px;text-align:center;font-size:18px;">🚨</span><span>Giám sát SOS</span>';
            d.onclick = openSOSAdmin;
            if (logout) menu.insertBefore(d, logout); else menu.appendChild(d);
        }
    }
    function boot() { addSOSMenu(); setInterval(addSOSMenu, 1000); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
