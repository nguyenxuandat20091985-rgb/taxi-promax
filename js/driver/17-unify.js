// Extracted from index.html; load order is intentionally preserved.
(function(){
    function getDriver(){
        try { if (typeof driverInfo !== 'undefined' && driverInfo && driverInfo.uid) return driverInfo; } catch(e){}
        try { var s = localStorage.getItem('driverInfo'); if (s) { var d = JSON.parse(s); if (d && d.uid) return d; } } catch(e){}
        return null;
    }

    /* 1) Menu "Ví tiền & Gói cước" → mở tab HỆ THỐNG GÓI CƯỚC gốc */
    function unifyMenu(){
        var items = document.querySelectorAll('.sidebar-item');
        for (var i = 0; i < items.length; i++) {
            var el = items[i];
            if ((el.innerText || '').indexOf('Ví tiền') !== -1 && !el.dataset.unified) {
                el.dataset.unified = '1';
                el.onclick = function(){
                    try { closeSidebar(); } catch(e){}
                    try { showTab('vi', null); } catch(e){}
                    try {
                        document.querySelectorAll('.tab-content').forEach(function(x){ x.style.display = 'none'; });
                        var tab = document.getElementById('tab-vi');
                        if (tab) tab.style.display = 'flex';
                    } catch(e){}
                };
            }
        }
        /* 2) Gỡ modal ví cũ 99k/249k/799k (không dùng nữa) */
        var wm = document.getElementById('wmModal');
        if (wm) wm.remove();
    }

    /* 3) Sau khi quét QR PayOS: TỰ kiểm tra kích hoạt, không cần admin */
    function watchActivation(){
        var pending = localStorage.getItem('pending_plan');
        var drv = getDriver();
        if (!pending || !drv) return;
        var tries = 0;
        if (typeof showToast === 'function') showToast('⏳ Đang đối soát thanh toán ' + pending + '...');
        var iv = setInterval(function(){
            tries++;
            try {
                db.ref('drivers/' + drv.uid).once('value').then(function(s){
                    var d = s.val() || {};
                    if (d.tp_expiry && parseInt(d.tp_expiry) > Date.now()) {
                        clearInterval(iv);
                        localStorage.removeItem('pending_plan');
                        if (typeof showToast === 'function') showToast('✅ Gói đã kích hoạt: ' + (d.active_plan || pending) + ' 🎉');
                        if (typeof initCountdown === 'function') initCountdown();
                    } else if (tries >= 12) {
                        clearInterval(iv);
                        if (typeof showToast === 'function') showToast('ℹ️ Đã chuyển khoản? Hệ thống kích hoạt trong ~1 phút. Kéo làm mới app.');
                    }
                });
            } catch(e){}
        }, 5000);
    }

    function boot(){ unifyMenu(); watchActivation(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    setInterval(unifyMenu, 2000);
})();
