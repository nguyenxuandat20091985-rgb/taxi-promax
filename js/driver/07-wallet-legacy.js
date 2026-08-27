// Extracted from index.html; load order is intentionally preserved.
(function(){
    var ADMIN_PHONE = '0388724966';
    var BANK = { bank: 'MB Bank', acc: '0388724966', name: 'NGUYEN XUAN DAT', momo: '0388724966' };
    var PLANS = {
        m1:  { name: '1 tháng',            price: 99000,  days: 30 },
        m3:  { name: '3 tháng (tiết kiệm 15%)', price: 249000, days: 90 },
        m12: { name: '12 tháng (tiết kiệm 200k)', price: 799000, days: 365 }
    };
    var selPlan = 'm1';

    var css = document.createElement('style');
    css.textContent =
        '.wm-overlay{position:fixed;inset:0;background:rgba(10,15,25,.6);backdrop-filter:blur(6px);z-index:15000;display:none;align-items:flex-end;justify-content:center;}' +
        '.wm-overlay.show{display:flex;}' +
        '.wm-sheet{background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;max-height:92vh;overflow-y:auto;padding-bottom:20px;}' +
        '.wm-head{background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:24px 24px 0 0;position:sticky;top:0;z-index:5;}' +
        '.wm-body{padding:16px;}' +
        '.wm-tx{display:flex;align-items:center;gap:10px;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:12px;}' +
        '.wm-tx .amt{margin-left:auto;font-weight:900;color:#0054a3;}';
    document.head.appendChild(css);

    function copyText(t) {
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(function() {
            if (typeof showToast === 'function') showToast('📋 Đã sao chép: ' + t);
        });
        else prompt('Sao chép nội dung:', t);
    }

    function buildModal() {
        if (document.getElementById('wmModal')) return;
        var m = document.createElement('div');
        m.id = 'wmModal'; m.className = 'wm-overlay';
        m.innerHTML =
            '<div class="wm-sheet"><div class="wm-head"><b>💰 Ví tiền & Gói cước</b>' +
            '<button onclick="document.getElementById(\'wmModal\').classList.remove(\'show\')" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div class="wm-body">' +
            '<div id="wmPlanStatus"></div>' +
            '<div style="font-size:13px;font-weight:800;margin:12px 0 8px;">📦 Chọn gói thuê bao</div>' +
            '<div id="wmPlans" style="display:flex;gap:8px;"></div>' +
            '<div id="wmPayPanel" style="margin-top:12px;"></div>' +
            '<div style="font-size:13px;font-weight:800;margin:6px 0 8px;">📜 Lịch sử giao dịch</div>' +
            '<div id="wmTxList"></div>' +
            '<div id="wmAdminBox"></div>' +
            '</div></div>';
        document.body.appendChild(m);
    }
    function openWallet() {
        buildModal();
        document.getElementById('wmModal').classList.add('show');
        loadWallet();
    }
    window.openWallet = openWallet;

    function loadWallet() {
        if (!window.driverInfo || !driverInfo.uid || typeof db === 'undefined') return;
        var uid = driverInfo.uid;
        db.ref('drivers/' + uid).once('value').then(function(snap) {
            var d = snap.val() || {};
            var exp = parseInt(d.tp_expiry || 0);
            var days = exp > Date.now() ? Math.floor((exp - Date.now()) / 86400000) : 0;
            document.getElementById('wmPlanStatus').innerHTML = days > 0
                ? '<div style="background:#e8f9ee;border:1px solid #86efac;color:#15803d;border-radius:14px;padding:12px 14px;font-size:13px;font-weight:800;">✅ Gói PROMAX đang hoạt động — còn ' + days + ' ngày</div>'
                : '<div style="background:#fff7e6;border:1px solid #fcd34d;color:#b45309;border-radius:14px;padding:12px 14px;font-size:13px;font-weight:800;">⚠️ Gói cước đã hết hạn — gia hạn để tiếp tục nhận đơn</div>';
            renderPlans();
            renderPayPanel();
            var txs = (d.wallet && d.wallet.transactions) || {};
            var list = Object.keys(txs).map(function(k) { return txs[k]; })
                .sort(function(a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }).slice(0, 10);
            document.getElementById('wmTxList').innerHTML = list.length ? list.map(function(t) {
                return '<div class="wm-tx"><span>' + (t.status === 'paid' ? '✅' : '⏳') + '</span>' +
                    '<span>' + (t.planName || 'Gói') + ' · ' + new Date(t.createdAt || Date.now()).toLocaleDateString('vi-VN') + '</span>' +
                    '<span class="amt">' + (t.amount || 0).toLocaleString() + '₫</span></div>';
            }).join('') : '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px;">Chưa có giao dịch</div>';
            if (String(driverInfo.phone) === ADMIN_PHONE) loadApprovals();
            else document.getElementById('wmAdminBox').innerHTML = '';
        });
    }

    function renderPlans() {
        var box = document.getElementById('wmPlans');
        box.innerHTML = Object.keys(PLANS).map(function(k) {
            var p = PLANS[k], sel = k === selPlan;
            return '<div data-plan="' + k + '" style="flex:1;border:2px solid ' + (sel ? '#00bfa5' : '#e2e8f0') + ';background:' + (sel ? '#e8f8f5' : '#fff') + ';border-radius:14px;padding:10px;text-align:center;cursor:pointer;">' +
                '<div style="font-size:11px;font-weight:800;color:#1e293b;">' + p.name + '</div>' +
                '<div style="font-size:13px;font-weight:900;color:#0054a3;">' + p.price.toLocaleString() + '₫</div></div>';
        }).join('');
        box.querySelectorAll('[data-plan]').forEach(function(el) {
            el.onclick = function() { selPlan = el.dataset.plan; renderPlans(); renderPayPanel(); };
        });
    }

    function renderPayPanel() {
        var p = PLANS[selPlan];
        var code = 'PROMAX ' + (window.driverInfo ? driverInfo.phone : '');
        var qr = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(code + ' ' + p.price);
        document.getElementById('wmPayPanel').innerHTML =
            '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px;">' +
            '<div style="font-size:13px;font-weight:800;margin-bottom:10px;">💳 Quét QR hoặc chuyển khoản</div>' +
            '<div style="display:flex;gap:12px;align-items:center;">' +
            '<img src="' + qr + '" style="width:110px;height:110px;border-radius:10px;background:#fff;padding:4px;">' +
            '<div style="flex:1;font-size:12px;line-height:1.8;color:#475569;">' +
            '🏦 <b>' + BANK.bank + '</b>: <b style="color:#0054a3;">' + BANK.acc + '</b><br>' +
            '👤 ' + BANK.name + '<br>📱 MoMo: <b>' + BANK.momo + '</b><br>' +
            '✏️ Nội dung: <b style="color:#d32f2f;">' + code + '</b></div></div>' +
            '<div style="display:flex;gap:8px;margin-top:10px;">' +
            '<button id="wmCopy" style="flex:1;padding:10px;border:1px solid #cbd5e1;background:#fff;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;">📋 Sao chép</button>' +
            '<button id="wmDone" style="flex:1;padding:10px;border:none;background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;">✅ Đã chuyển khoản</button>' +
            '</div></div>';
        document.getElementById('wmCopy').onclick = function() { copyText(code); };
        document.getElementById('wmDone').onclick = confirmPaid;
    }

    function confirmPaid() {
        if (!window.driverInfo || !driverInfo.uid) return;
        var p = PLANS[selPlan];
        var tid = 'tx_' + Date.now();
        db.ref('drivers/' + driverInfo.uid + '/wallet/transactions/' + tid).set({
            id: tid, type: 'payment', plan: selPlan, planName: p.name,
            amount: p.price, code: 'PROMAX ' + driverInfo.phone,
            status: 'pending', createdAt: Date.now()
        }).then(function() {
            if (typeof showToast === 'function') showToast('⏳ Đã báo chuyển khoản — chờ admin xác nhận');
            loadWallet();
        });
    }

    /* ===== Admin duyệt thanh toán ===== */
    function loadApprovals() {
        var box = document.getElementById('wmAdminBox');
        box.innerHTML = '<div style="font-size:13px;font-weight:800;margin:10px 0 8px;">🛡️ Xác nhận thanh toán (admin)</div>';
        db.ref('drivers').once('value').then(function(snap) {
            var html = '';
            snap.forEach(function(c) {
                var d = c.val() || {};
                var txs = (d.wallet && d.wallet.transactions) || {};
                Object.keys(txs).forEach(function(tid) {
                    var t = txs[tid];
                    if (t.status === 'pending') {
                        html += '<div class="wm-tx"><span>⏳</span><span><b>' + (d.name || '---') + '</b> · ' +
                            (t.planName || '') + '<br><small style="color:#64748b;">' + (d.phone || '') + ' · mã: ' + (t.code || '') + '</small></span>' +
                            '<button onclick="wmApprove(\'' + c.key + '\',\'' + tid + '\')" style="background:#00bfa5;color:#fff;border:none;border-radius:10px;padding:8px 10px;font-weight:800;font-size:11px;cursor:pointer;">Duyệt</button></div>';
                    }
                });
            });
            box.innerHTML += html || '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px;">Không có thanh toán chờ</div>';
        });
    }
    window.wmApprove = function(uid, tid) {
        db.ref('drivers/' + uid).once('value').then(function(s) {
            var d = s.val() || {};
            var t = ((d.wallet || {}).transactions || {})[tid];
            if (!t) return;
            var plan = PLANS[t.plan] || PLANS.m1;
            var base = parseInt(d.tp_expiry || 0);
            var start = base > Date.now() ? base : Date.now();
            var upd = {};
            upd['wallet/transactions/' + tid + '/status'] = 'paid';
            upd['wallet/transactions/' + tid + '/approvedAt'] = Date.now();
            upd['tp_expiry'] = start + plan.days * 86400000;
            upd['active_plan'] = 'PROMAX';
            return db.ref('drivers/' + uid).update(upd);
        }).then(function() {
            if (typeof showToast === 'function') showToast('✅ Đã duyệt — gia hạn gói thành công');
            loadWallet();
        });
    };

    /* ===== Gắn vào menu "Ví tiền" có sẵn ===== */
    function bindWalletMenu() {
        var menu = document.querySelector('.sidebar-menu');
        if (!menu || menu.dataset.walletBound) return;
        menu.dataset.walletBound = '1';
        var items = menu.querySelectorAll('.sidebar-item'), found = null;
        for (var i = 0; i < items.length; i++) {
            if ((items[i].innerText || '').indexOf('Ví tiền') !== -1) { found = items[i]; break; }
        }
        if (found) found.onclick = function() { openWallet(); };
        else {
            var logout = null;
            for (var j = 0; j < menu.children.length; j++) {
                if ((menu.children[j].innerText || '').indexOf('Đăng xuất') !== -1) logout = menu.children[j];
            }
            var d = document.createElement('div');
            d.className = 'sidebar-item';
            d.innerHTML = '<span style="width:24px;text-align:center;font-size:18px;">💰</span><span>Ví tiền & Gói cước</span>';
            d.onclick = openWallet;
            if (logout) menu.insertBefore(d, logout); else menu.appendChild(d);
        }
    }
    function boot() { bindWalletMenu(); setInterval(bindWalletMenu, 1000); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
