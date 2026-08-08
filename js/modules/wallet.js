/* ========== 💰 WALLET UNIFY v2 - 1 ví, 1 bảng giá ========== */
(function(){
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

            html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">';
            PLANS.forEach(function(p){
                var sel = selPlan.key === p.key;
                html += '<div data-key="' + p.key + '" class="wmPlan" style="border:2px solid ' + (sel ? '#0054a3' : '#ecf0f1') + ';background:' + (sel ? '#f0f4f8' : '#fff') + ';border-radius:14px;padding:10px;text-align:center;cursor:pointer;">' +
                    '<div style="font-size:10px;font-weight:800;">' + p.label + '</div>' +
                    '<div style="font-size:13px;font-weight:900;color:#d32f2f;margin-top:4px;">' + fmt(p.price) + '</div></div>';
            });
            html += '</div>';

            html += '<button id="wmGoBuy" style="width:100%;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#0054a3,#00bfa5);color:#fff;font-size:15px;font-weight:800;cursor:pointer;">🛒 Mua / Gia hạn gói (PayOS tự động)</button>';
            html += '<div style="margin-top:10px;font-size:10px;color:#64748b;text-align:center;">Thanh toán qua PayOS · Gói kích hoạt tự động</div>';

            box.innerHTML = html;

            box.querySelectorAll('.wmPlan').forEach(function(el){
                el.onclick = function(){
                    selPlan = PLANS.filter(function(p){ return p.key === el.getAttribute('data-key'); })[0] || PLANS[1];
                    renderBody(drv);
                };
            });
            var buy = box.querySelector('#wmGoBuy');
            if (buy) buy.onclick = function(){
                if (typeof window.handlePayment === 'function') window.handlePayment(selPlan.price, selPlan.key);
                else if (typeof showToast === 'function') showToast('❌ Lỗi thanh toán');
            };
        }).catch(function(){
            box.innerHTML = '<div style="text-align:center;color:#b91c1c;padding:20px;">Lỗi tải dữ liệu</div>';
        });
    }

    // Nối mục sidebar "Ví tiền & Gói cước" mở ví
    function bindSidebar(){
        var items = document.querySelectorAll('.sidebar-item');
        for (var i = 0; i < items.length; i++) {
            var el = items[i];
            if ((el.innerText || '').indexOf('Ví tiền') !== -1 && !el.dataset.wm) {
                el.dataset.wm = '1';
                el.addEventListener('click', function(e){
                    e.preventDefault(); e.stopPropagation();
                    try { if (typeof closeSidebar === 'function') closeSidebar(); } catch(err){}
                    window.openWallet();
                }, true);
            }
        }
    }
    setInterval(bindSidebar, 1500);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindSidebar);
    console.log('✅ WALLET UNIFY v2 (module) loaded');
})();