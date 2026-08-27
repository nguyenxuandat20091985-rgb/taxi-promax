/* ProMax extracted module: promax-receipt */
(function(){
    var css = document.createElement('style');
    css.textContent =
        '.rc-overlay{position:fixed;inset:0;background:rgba(10,15,25,.6);backdrop-filter:blur(6px);z-index:15000;display:none;align-items:flex-end;justify-content:center;}' +
        '.rc-overlay.show{display:flex;}' +
        '.rc-sheet{background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;max-height:92vh;overflow-y:auto;padding-bottom:20px;}' +
        '.rc-head{background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:24px 24px 0 0;position:sticky;top:0;z-index:5;}' +
        '.rc-body{padding:16px;}' +
        '.rc-paper{background:#fffdf7;border:1px dashed #94a3b8;border-radius:14px;padding:16px;font-size:12.5px;color:#334155;}' +
        '.rc-row{display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px dotted #e2e8f0;}' +
        '.rc-row:last-child{border-bottom:none;}' +
        '.rc-total{font-size:20px;font-weight:900;color:#d32f2f;}' +
        '.rc-item{display:flex;align-items:center;gap:10px;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:12px;}';
    document.head.appendChild(css);

    function rcCopy(t) {
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(function() {
            if (typeof showToast === 'function') showToast('📋 Đã sao chép');
        });
        else prompt('Sao chép:', t);
    }
    function rcUrl(code) { return location.origin + location.pathname + '?receipt=' + code; }
    function rcText(rec) {
        return '🧾 HÓA ĐƠN CHUYẾN ĐI ' + rec.code +
            '\n🚕 Tài xế: ' + (rec.driverName || '') + ' — ' + (rec.plate || '') +
            '\n📍 ' + (rec.pickup || '') + ' → ' + (rec.dropoff || '') +
            '\n📏 ' + (rec.km || 0).toFixed(1) + ' km' +
            '\n💰 Thành tiền: ' + (rec.price || 0).toLocaleString() + '₫' +
            '\n🔗 Xem: ' + rcUrl(rec.code);
    }

    /* ===== 1) Tạo hóa đơn từ sự kiện hoàn tất chuyến ===== */
    function createReceiptFromTrip(trip) {
        if (!window.driverInfo || typeof window.db === 'undefined' || !trip) return;
        var code = 'HD' + Date.now().toString(36).toUpperCase();
        var receipt = {
            code: code, createdAt: Date.now(), orderId: trip.orderId || null,
            driverName: window.driverInfo.name || '', driverPhone: window.driverInfo.phone || '', plate: window.driverInfo.plate || '',
            customerName: trip.customerName || 'Khách', pickup: trip.pickup || 'Vị trí hiện tại',
            dropoff: trip.dropoff || 'Không xác định', km: Number(trip.km) || 0,
            price: Number(trip.cost) || 0, tripType: trip.tripType || 'APP_BOOKING'
        };
        window.db.ref('receipts/' + code).set(receipt).then(function () {
            if (typeof showToast === 'function') showToast('🧾 Đã tạo hóa đơn ' + code);
        }).catch(function () {});
    }
    document.addEventListener('trip:completed', function (event) { createReceiptFromTrip(event.detail); });

    /* ===== 2) Xem hóa đơn (dạng giấy biên lai) ===== */
    function showReceipt(rec) {
        var ov = document.getElementById('rcView');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'rcView'; ov.className = 'rc-overlay';
            document.body.appendChild(ov);
        }
        var time = new Date(rec.createdAt || Date.now()).toLocaleString('vi-VN');
        ov.innerHTML =
            '<div class="rc-sheet"><div class="rc-head"><b>🧾 Hóa đơn điện tử</b>' +
            '<button onclick="document.getElementById(\'rcView\').classList.remove(\'show\')" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div class="rc-body"><div class="rc-paper">' +
            '<div style="text-align:center;margin-bottom:10px;">' +
            '<div style="font-size:16px;font-weight:900;color:#0054a3;letter-spacing:1px;">TAXI PROMAX</div>' +
            '<div style="font-size:10px;color:#64748b;">Nền tảng kết nối vận chuyển · Hotline 0388724966</div>' +
            '<div style="font-size:12px;font-weight:800;margin-top:6px;">BIÊN LAI CHUYẾN ĐI — ' + rec.code + '</div></div>' +
            '<div class="rc-row"><span>⏰ Thời gian</span><b>' + time + '</b></div>' +
            '<div class="rc-row"><span>👤 Hành khách</span><b>' + (rec.customerName || 'Khách') + '</b></div>' +
            '<div class="rc-row"><span>🚕 Tài xế</span><b>' + (rec.driverName || '') + '</b></div>' +
            '<div class="rc-row"><span>🚗 Biển số</span><b>' + (rec.plate || '') + '</b></div>' +
            '<div class="rc-row"><span>📍 Điểm đón</span><b>' + (rec.pickup || '') + '</b></div>' +
            '<div class="rc-row"><span>🏁 Điểm đến</span><b>' + (rec.dropoff || '') + '</b></div>' +
            '<div class="rc-row"><span>📏 Quãng đường</span><b>' + (rec.km || 0).toFixed(1) + ' km</b></div>' +
            '<div class="rc-row"><span>💰 THÀNH TIỀN</span><span class="rc-total">' + (rec.price || 0).toLocaleString() + '₫</span></div>' +
            '<div style="margin-top:10px;font-size:10.5px;color:#64748b;line-height:1.6;">' +
            '• Hành khách thanh toán trực tiếp cho tài xế.<br>' +
            '• Taxi ProMax là nền tảng kết nối, không thu tiền chuyến đi.<br>' +
            '• Biên lai điện tử có giá trị làm bằng chứng giao dịch.</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-top:12px;">' +
            '<button id="rcShare" style="flex:1;padding:12px;border:none;border-radius:12px;background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;font-weight:800;font-size:13px;cursor:pointer;">📤 Chia sẻ</button>' +
            '<button id="rcMail" style="flex:1;padding:12px;border:none;border-radius:12px;background:#00796b;color:#fff;font-weight:800;font-size:13px;cursor:pointer;">📧 Email</button>' +
            '<button id="rcCopyBtn" style="flex:1;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#fff;font-weight:800;font-size:13px;cursor:pointer;">📋 Copy</button>' +
            '</div></div></div>';
        ov.classList.add('show');
        ov.querySelector('#rcShare').onclick = function() {
            if (navigator.share) navigator.share({ title: 'Taxi ProMax — Hóa đơn', text: rcText(rec) });
            else rcCopy(rcText(rec));
        };
        ov.querySelector('#rcMail').onclick = function() {
            location.href = 'mailto:?subject=' + encodeURIComponent('Hóa đơn chuyến đi ' + rec.code) + '&body=' + encodeURIComponent(rcText(rec));
        };
        ov.querySelector('#rcCopyBtn').onclick = function() { rcCopy(rcText(rec)); };
    }
    window.showReceipt = showReceipt;

    /* ===== 3) Danh sách hóa đơn của tài xế ===== */
    function openReceiptList() {
        var ov = document.getElementById('rcList');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'rcList'; ov.className = 'rc-overlay';
            ov.innerHTML = '<div class="rc-sheet"><div class="rc-head"><b>🧾 Hóa đơn chuyến đi</b>' +
                '<button onclick="document.getElementById(\'rcList\').classList.remove(\'show\')" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
                '<div class="rc-body" id="rcListBox"></div></div>';
            document.body.appendChild(ov);
        }
        ov.classList.add('show');
        var box = document.getElementById('rcListBox');
        box.innerHTML = '<div style="text-align:center;padding:16px;color:#94a3b8;">Đang tải...</div>';
        if (!window.driverInfo || typeof db === 'undefined') return;
        db.ref('receipts').orderByChild('driverPhone').equalTo(driverInfo.phone).limitToLast(30).once('value').then(function(snap) {
            var list = [];
            if (snap.exists()) snap.forEach(function(c) { list.push(c.val()); });
            list.sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
            box.innerHTML = list.length ? list.map(function(r, idx) {
                return '<div class="rc-item"><span>🧾</span>' +
                    '<span><b>' + r.code + '</b> · ' + (r.km || 0).toFixed(1) + ' km<br><small style="color:#64748b;">' + new Date(r.createdAt).toLocaleDateString('vi-VN') + ' · ' + (r.customerName || 'Khách') + '</small></span>' +
                    '<span style="margin-left:auto;font-weight:900;color:#d32f2f;">' + (r.price || 0).toLocaleString() + '₫</span>' +
                    '<button data-idx="' + idx + '" style="background:#0054a3;color:#fff;border:none;border-radius:10px;padding:8px 10px;font-weight:800;font-size:11px;cursor:pointer;">Xem</button></div>';
            }).join('') : '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:16px;">Chưa có hóa đơn nào</div>';
            window._rcCache = list;
            box.querySelectorAll('button[data-idx]').forEach(function(b) {
                b.onclick = function() { showReceipt(window._rcCache[parseInt(b.dataset.idx)]); };
            });
        });
    }
    window.openReceiptList = openReceiptList;

    /* ===== 4) Mở hóa đơn bằng link công khai ===== */
    try {
        var rp = new URLSearchParams(window.location.search).get('receipt');
        if (rp && typeof db !== 'undefined') {
            setTimeout(function() {
                db.ref('receipts/' + rp).once('value').then(function(s) {
                    if (s.exists()) showReceipt(s.val());
                });
            }, 400);
        }
    } catch(e) {}

    /* ===== Menu ===== */
    function addRCMenu() {
        var menu = document.querySelector('.sidebar-menu');
        if (!menu || menu.dataset.rcAdded) return;
        menu.dataset.rcAdded = '1';
        var logout = null;
        for (var i = 0; i < menu.children.length; i++) {
            if ((menu.children[i].innerText || '').indexOf('Đăng xuất') !== -1) logout = menu.children[i];
        }
        var d = document.createElement('div');
        d.className = 'sidebar-item';
        d.innerHTML = '<span style="width:24px;text-align:center;font-size:18px;">🧾</span><span>Hóa đơn chuyến đi</span>';
        d.onclick = openReceiptList;
        if (logout) menu.insertBefore(d, logout); else menu.appendChild(d);
    }
    function boot() { addRCMenu(); setInterval(addRCMenu, 1000); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
