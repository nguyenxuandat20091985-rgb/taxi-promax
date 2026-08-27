// Extracted from index.html; load order is intentionally preserved.
(function(){
    var _orig = window.handlePayment;

    window.handlePayment = async function(amount, plan) {
        // Gói 0đ giữ nguyên logic cũ
        if (amount === 0) { return _orig ? _orig(amount, plan) : null; }

        if (!window.driverInfo || !driverInfo.uid) { showToast('⚠️ Vui lòng đăng nhập trước'); return; }

        showToast('⏳ Đang tạo thanh toán PayOS...');
        try {
            var r = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amount, plan: plan, driverUid: driverInfo.uid })
            });
            var d = await r.json();
            if (d.success && d.checkoutUrl) {
                localStorage.setItem('pending_plan', plan);
                window.location.href = d.checkoutUrl;
            } else {
                showToast('❌ Lỗi PayOS: ' + (d.error || 'thử lại'));
            }
        } catch (e) {
            showToast('❌ Không kết nối được máy chủ thanh toán');
        }
    };

    // Xử lý khi PayOS trả về ?status=success / cancel
    function cb() {
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
