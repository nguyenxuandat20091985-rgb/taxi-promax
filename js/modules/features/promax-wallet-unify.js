/* ProMax extracted module: promax-wallet-unify */
(function(){
    var ADMIN_PHONE = '0388724966';
    var PLANS = [
        { key: 'LẺ',     label: 'CHUYẾN LẺ · 1 ngày', price: 5000,   days: 1 },
        { key: 'PRO',    label: 'GÓI PRO · 30 ngày',  price: 49000,  days: 30 },
        { key: 'PROMAX', label: 'PRO MAX · 90 ngày',  price: 129000, days: 90 }
    ];
    function getDriver(){
        try { if (typeof driverInfo !== 'undefined' && driverInfo && driverInfo.uid) return driverInfo; } catch(e){}
        try { var s = localStorage.getItem('driverInfo'); if (s) { var d = JSON.parse(s); if (d && d.uid) return d; } } catch(e){}
        return null;
    }
    function fmt(n){ return (n || 0).toLocaleString('vi-VN') + 'đ'; }
    var selPlan = PLANS[1];

    window.openWallet = function(){
        var ov = document.getElementById('wmOverlay');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'wmOverlay';
            ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,25,.6);backdrop-filter:blur(6px);z-index:15000;display:none;align-items:flex-end;justify-content:center;';
            document.body.appendChild(ov);
        }
        ov.innerHTML = '<div style="background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;max-height:92vh;overflow-y:auto;padding-bottom:24px;">' +
            '<div style="background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;border-radius:24px 24px 0 0;position:sticky;top:0;z-index:5;">' +
            '<b>💰 Ví tiền của tôi</b><button onclick="document.getElementById(\'wmOverlay\').style.display=\'none\'" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button></div>' +
            '<div style="padding:16px;" id="wmBody"><div style="text-align:center;color:#94a3b8;padding:20px;">Đang tải...</div></div></div>';
        ov.style.display = 'flex';
        renderBody(getDriver());
    };

    function renderBody(drv){
        var box = document.getElementById('wmBody');
        if (!drv) { box.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">Vui lòng đăng nhập</div>'; return; }

        db.ref('drivers/' + drv.uid).once('value').then(function(snap){
            var d = snap.val() || {};
            var exp = parseInt(d.tp_expiry || 0);
            var days = exp > Date.now() ? Math.floor((exp - Date.now()) / 86400000) : 0;
            var html = '';

            html += days > 0
                ? '<div style="background:#e8f9ee;border:1px solid #86efac;color:#15803d;border-radius:14px;padding:12px 14px;font-size:13px;font-weight:800;margin-bottom:14px;">✅ Gói ' + (d.active_plan || 'PROMAX') + ' — còn ' + days + ' ngày (đến ' + new Date(exp).toLocaleDateString('vi-VN') + ')</div>'
                : '<div style="background:#fff7e6;border:1px solid #fcd34d;color:#b45309;border-radius:14px;padding:12px 14px;font-size:13px;font-weight:800;margin-bottom:14px;">⚠️ Gói cước đã hết hạn — gia hạn để nhận đơn</div>';

            html += '<button id="wmGoBuy" style="width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:6px;">🛒 Mua / Gia hạn gói (PayOS tự động)</button>';
            html += '<button id="wmManualToggle" style="width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#475569;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:14px;">🏦 Hoặc chuyển khoản thủ công (admin xác nhận)</button>';

            html += '<div id="wmManual" style="display:none;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:14px;margin-bottom:14px;">' +
                '<div style="display:flex;gap:6px;margin-bottom:10px;" id="wmPlanChips">' +
                PLANS.map(function(p, i){ return '<button data-i="' + i + '" style="flex:1;padding:8px 4px;border-radius:10px;border:2px solid ' + (i === 1 ? '#00bfa5' : '#e2e8f0') + ';background:' + (i === 1 ? '#e8f8f5' : '#fff') + ';font-size:10px;font-weight:800;cursor:pointer;">' + p.label + '<br><b>' + fmt(p.price) + '</b></button>'; }).join('') +
                '</div>' +
                '<div style="font-size:12px;color:#475569;line-height:1.8;">🏦 MB Bank: <b style="color:#0054a3;">0388724966</b><br>👤 NGUYEN XUAN DAT<br>✏️ Nội dung: <b style="color:#d32f2f;">PROMAX ' + (drv.phone || '') + '</b></div>' +
                '<div style="display:flex;gap:8px;margin-top:10px;"><button id="wmCopy" style="flex:1;padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-size:12px;font-weight:700;cursor:pointer;">📋 Sao chép</button>' +
                '<button id="wmDone" style="flex:1;padding:10px;border:none;border-radius:10px;background:#00796b;color:#fff;font-size:12px;font-weight:800;cursor:pointer;">✅ Đã chuyển khoản</button></div></div>';

            html += '<div style="font-size:13px;font-weight:800;margin-bottom:8px;">📜 Lịch sử giao dịch</div><div id="wmTxList"></div>';
            if (String(drv.phone) === ADMIN_PHONE) html += '<div style="font-size:13px;font-weight:800;margin:14px 0 8px;">🛡️ Xác nhận thanh toán (admin)</div><div id="wmAdminList"></div>';

            box.innerHTML = html;

            document.getElementById('wmGoBuy').onclick = function(){
                document.getElementById('wmOverlay').style.display = 'none';
                try { showTab('vi', null); } catch(e){}
            };
            document.getElementById('wmManualToggle').onclick = function(){
                var m = document.getElementById('wmManual');
                m.style.display = (m.style.display === 'none') ? 'block' : 'none';
            };
            document.getElementById('wmPlanChips').querySelectorAll('button').forEach(function(b){
                b.onclick = function(){
                    selPlan = PLANS[parseInt(b.dataset.i)];
                    document.getElementById('wmPlanChips').querySelectorAll('button').forEach(function(x){
                        var on = (x === b);
                        x.style.borderColor = on ? '#00bfa5' : '#e2e8f0';
                        x.style.background = on ? '#e8f8f5' : '#fff';
                    });
                };
            });
            document.getElementById('wmCopy').onclick = function(){
                var t = 'PROMAX ' + (drv.phone || '');
                if (navigator.clipboard) navigator.clipboard.writeText(t);
                if (typeof showToast === 'function') showToast('📋 Đã sao chép: ' + t);
            };
            document.getElementById('wmDone').onclick = function(){
                var tid = 'tx_' + Date.now();
                db.ref('drivers/' + drv.uid + '/wallet/transactions/' + tid).set({
                    id: tid, type: 'manual', plan: selPlan.key, planName: selPlan.label,
                    amount: selPlan.price, code: 'PROMAX ' + (drv.phone || ''),
                    status: 'pending', createdAt: Date.now()
                }).then(function(){
                    if (typeof showToast === 'function') showToast('⏳ Đã báo chuyển khoản — chờ admin xác nhận');
                    renderBody(drv);
                });
            };

            renderTx(drv);
            if (String(drv.phone) === ADMIN_PHONE) renderAdmin();
        });
    }

    function renderTx(drv){
        var box = document.getElementById('wmTxList');
        db.ref('drivers/' + drv.uid + '/wallet/transactions').once('value').then(function(snap){
            var list = [];
            if (snap.exists()) snap.forEach(function(c){ list.push(c.val()); });
            list.sort(function(a, b){ return (b.createdAt || 0) - (a.createdAt || 0); });
            box.innerHTML = list.length ? list.slice(0, 10).map(function(t){
                var st = t.status === 'paid' ? '✅' : (t.status === 'pending' ? '⏳' : '❌');
                return '<div style="display:flex;justify-content:space-between;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:12px;">' +
                    '<span>' + st + ' ' + (t.planName || t.plan || '') + '<br><small style="color:#94a3b8;">' + new Date(t.createdAt || Date.now()).toLocaleString('vi-VN') + '</small></span>' +
                    '<b style="color:#0054a3;">' + fmt(t.amount) + '</b></div>';
            }).join('') : '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px;">Chưa có giao dịch</div>';
        });
    }

    function renderAdmin(){
        var box = document.getElementById('wmAdminList');
        db.ref('drivers').once('value').then(function(snap){
            var html = '';
            snap.forEach(function(c){
                var d = c.val() || {};
                var txs = (d.wallet && d.wallet.transactions) || {};
                Object.keys(txs).forEach(function(tid){
                    var t = txs[tid];
                    if (t.status !== 'pending') return;
                    html += '<div style="border:1px solid #fcd34d;background:#fffbeb;border-radius:12px;padding:10px 12px;margin-bottom:8px;font-size:12px;">' +
                        '<b>👤 ' + (d.name || '---') + '</b> · ' + (t.planName || '') + ' · <b>' + fmt(t.amount) + '</b>' +
                        '<div style="display:flex;gap:6px;margin-top:8px;">' +
                        '<button onclick="wmApprove2(\'' + c.key + '\',\'' + tid + '\')" style="flex:1;padding:8px;border:none;border-radius:10px;background:#15803d;color:#fff;font-weight:800;font-size:11px;cursor:pointer;">✅ Duyệt</button>' +
                        '<button onclick="wmReject2(\'' + c.key + '\',\'' + tid + '\')" style="flex:1;padding:8px;border:none;border-radius:10px;background:#b91c1c;color:#fff;font-weight:800;font-size:11px;cursor:pointer;">❌ Từ chối</button>' +
                        '</div></div>';
                });
            });
            box.innerHTML = html || '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px;">Không có thanh toán chờ</div>';
        });
    }

    window.wmApprove2 = function(uid, tid){
        db.ref('drivers/' + uid).once('value').then(function(s){
            var d = s.val() || {};
            var t = ((d.wallet || {}).transactions || {})[tid];
            if (!t) return;
            var plan = PLANS.filter(function(p){ return p.key === t.plan; })[0];
            var days = plan ? plan.days : ({ 'm1': 30, 'm3': 90, 'm12': 365 }[t.plan] || 30);
            var base = parseInt(d.tp_expiry || 0);
            var start = base > Date.now() ? base : Date.now();
            var upd = {};
            upd['wallet/transactions/' + tid + '/status'] = 'paid';
            upd['wallet/transactions/' + tid + '/approvedAt'] = Date.now();
            upd['tp_expiry'] = start + days * 86400000;
            upd['active_plan'] = t.plan || 'PRO';
            return db.ref('drivers/' + uid).update(upd);
        }).then(function(){
            if (typeof showToast === 'function') showToast('✅ Đã duyệt — gia hạn thành công');
            renderBody(getDriver());
        });
    };
    window.wmReject2 = function(uid, tid){
        db.ref('drivers/' + uid + '/wallet/transactions/' + tid).update({ status: 'rejected', rejectedAt: Date.now() })
            .then(function(){ renderBody(getDriver()); });
    };
})();
