/* ========== 💳 PAYOS PAYMENT INTEGRATION v1.0 ========== */
(function() {
    'use strict';

    // Override hàm handlePayment cũ
    const originalHandlePayment = window.handlePayment;

    window.handlePayment = async function(amount, plan) {
        // Trial plan - dùng logic cũ
        if (amount === 0) {
            if (originalHandlePayment) {
                return originalHandlePayment(amount, plan);
            }
            return;
        }

        // Paid plan - dùng PayOS
        if (!window.driverInfo || !driverInfo.uid) {
            showToast('⚠️ Vui lòng đăng nhập trước khi thanh toán');
            return;
        }

        const btn = document.getElementById('mainBtn');
        const originalText = btn ? btn.innerText : '';

        if (btn) {
            btn.disabled = true;
            btn.innerText = '⏳ ĐANG TẠO THANH TOÁN...';
        }

        try {
            const response = await fetch('/api/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amount,
                    planName: plan.name,
                    driverUid: driverInfo.uid,
                    driverPhone: driverInfo.phone
                })
            });

            const data = await response.json();

            if (data.success && data.checkoutUrl) {
                // Lưu thông tin để xử lý khi quay về
                localStorage.setItem('pending_plan', plan.name);
                localStorage.setItem('pending_uid', driverInfo.uid);
                localStorage.setItem('pending_order', data.orderCode);

                // Redirect đến PayOS checkout
                window.location.href = data.checkoutUrl;
            } else {
                if (btn) {
                    btn.disabled = false;
                    btn.innerText = originalText;
                }
                showToast('❌ Lỗi: ' + (data.error || 'Không thể tạo thanh toán'));
            }

        } catch (error) {
            console.error('[PayOS] Error:', error);
            if (btn) {
                btn.disabled = false;
                btn.innerText = originalText;
            }
            showToast('❌ Không thể kết nối máy chủ thanh toán');
        }
    };

    // Xử lý callback từ PayOS
    function checkPaymentCallback() {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const plan = params.get('plan');
        const uid = params.get('uid');

        if (status === 'success' && plan && uid) {
            // Xóa params khỏi URL
            window.history.replaceState({}, '', window.location.pathname);

            // Hiển thị thông báo thành công
            showToast('✅ Thanh toán thành công! Đang kích hoạt gói...', 'success');

            // Reload sau 2 giây để cập nhật UI
            setTimeout(() => {
                location.reload();
            }, 2000);

        } else if (status === 'cancel') {
            window.history.replaceState({}, '', window.location.pathname);
            showToast('❌ Thanh toán đã bị hủy', 'error');

            // Xóa pending data
            localStorage.removeItem('pending_plan');
            localStorage.removeItem('pending_uid');
            localStorage.removeItem('pending_order');
        }
    }

    // Check callback khi page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkPaymentCallback);
    } else {
        checkPaymentCallback();
    }

    console.log('✅ PayOS Payment Integration loaded');
})();

/* ========== 💳 PAYOS CONNECT v1 — nối nút NẠP NGAY với PayOS ========== */
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

/* ========== 💳 PAYOS CONNECT v2 — vá lỗi "chưa đăng nhập" ========== */
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