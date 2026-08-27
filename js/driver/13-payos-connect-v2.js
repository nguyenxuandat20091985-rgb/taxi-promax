// Extracted from index.html; load order is intentionally preserved.
(function(){
    /* [FIX CỐT LÕI] driverInfo khai báo bằng let → không có trên window.
       Tạo "cầu nối" để window.driverInfo luôn đọc đúng giá trị thật.
       → Sửa luôn cho các module Ví tiền / KYC / PayOS cùng lúc. */
    try {
        Object.defineProperty(window, 'driverInfo', {
            configurable: true,
            get: function(){ return (typeof driverInfo !== 'undefined') ? driverInfo : undefined; },
            set: function(v){ try { driverInfo = v; } catch(e){} }
        });
    } catch(e) {
        setInterval(function(){ try { if (typeof driverInfo !== 'undefined') window.driverInfo = driverInfo; } catch(err){} }, 800);
    }

    /* Lấy tài xế an toàn (fallback localStorage) */
    function getDriver(){
        try { if (typeof driverInfo !== 'undefined' && driverInfo && driverInfo.uid) return driverInfo; } catch(e){}
        try {
            var s = localStorage.getItem('driverInfo');
            if (s) { var d = JSON.parse(s); if (d && d.uid) return d; }
        } catch(e){}
        return null;
    }
    window.getDriverInfo = getDriver;

    /* Nối nút NẠP NGAY với PayOS */
    var _orig = window.handlePayment;
    window.handlePayment = async function(amount, plan){
        if (amount === 0) { return _orig ? _orig(amount, plan) : null; }  // gói 0đ giữ logic cũ

        var drv = getDriver();
        if (!drv) { showToast('⚠️ Vui lòng đăng nhập trước'); return; }

        showToast('⏳ Đang tạo thanh toán PayOS...');
        try {
            var r = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amount, plan: plan, driverUid: drv.uid })
            });
            var d = await r.json();
            if (d.success && d.checkoutUrl) {
                localStorage.setItem('pending_plan', plan);
                window.location.href = d.checkoutUrl;
            } else {
                showToast('❌ Lỗi PayOS: ' + (d.error || 'thử lại'));
            }
        } catch(e) {
            showToast('❌ Không kết nối được máy chủ thanh toán');
        }
    };

    /* Xử lý khi PayOS trả về */
    function cb(){
        var p = new URLSearchParams(location.search);
        var st = p.get('status');
        if (st === 'success') {
            history.replaceState({}, '', location.pathname);
            showToast('✅ Thanh toán thành công! Đang kích hoạt gói...');
            setTimeout(function(){ location.reload(); }, 2500);
        } else if (st === 'cancel') {
            history.replaceState({}, '', location.pathname);
            showToast('❌ Đã hủy thanh toán');
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cb);
    else cb();
})();
