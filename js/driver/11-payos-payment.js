// Extracted from index.html; load order is intentionally preserved.
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
            showToast('✅ Thanh toán thành công! Đang kích hoạt gói...');
            
            // Reload sau 2 giây để cập nhật UI
            setTimeout(() => {
                location.reload();
            }, 2000);

        } else if (status === 'cancel') {
            window.history.replaceState({}, '', window.location.pathname);
            showToast('❌ Thanh toán đã bị hủy');
            
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
