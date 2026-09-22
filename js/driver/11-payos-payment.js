// PayOS payment — load trước 13-payos-connect-v2 (13 sẽ override handlePayment)
// Giữ file để tương thích; payload chuẩn: plan là STRING key (LẺ|PRO|PROMAX)
(function () {
  'use strict';

  function planKey(plan) {
    if (plan == null) return 'PRO';
    if (typeof plan === 'object') return String(plan.key || plan.name || plan.plan || 'PRO');
    return String(plan);
  }

  var originalHandlePayment = window.handlePayment;

  window.handlePayment = async function (amount, plan) {
    if (amount === 0) {
      if (originalHandlePayment) return originalHandlePayment(amount, plan);
      return;
    }

    if (!window.driverInfo || !driverInfo.uid) {
      if (typeof showToast === 'function') showToast('⚠️ Vui lòng đăng nhập trước khi thanh toán');
      return;
    }

    var btn = document.getElementById('mainBtn');
    var originalText = btn ? btn.innerText : '';
    if (btn) {
      btn.disabled = true;
      btn.innerText = '⏳ ĐANG TẠO THANH TOÁN...';
    }

    var key = planKey(plan);

    try {
      var response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          plan: key,
          planName: key,
          driverUid: driverInfo.uid,
          driverPhone: driverInfo.phone
        })
      });

      var data = await response.json();

      if (data.success && data.checkoutUrl) {
        localStorage.setItem('pending_plan', key);
        localStorage.setItem('pending_uid', driverInfo.uid);
        localStorage.setItem('pending_order', String(data.orderCode));
        window.location.href = data.checkoutUrl;
      } else {
        if (btn) {
          btn.disabled = false;
          btn.innerText = originalText;
        }
        if (typeof showToast === 'function') {
          showToast('❌ Lỗi: ' + (data.error || 'Không thể tạo thanh toán'));
        }
      }
    } catch (error) {
      console.error('[PayOS] Error:', error);
      if (btn) {
        btn.disabled = false;
        btn.innerText = originalText;
      }
      if (typeof showToast === 'function') showToast('❌ Không thể kết nối máy chủ thanh toán');
    }
  };

  function checkPaymentCallback() {
    var params = new URLSearchParams(window.location.search);
    var status = params.get('status');

    if (status === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
      if (typeof showToast === 'function') {
        showToast('✅ Thanh toán thành công! Đang kích hoạt gói...');
      }
      setTimeout(function () {
        location.reload();
      }, 2000);
    } else if (status === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
      if (typeof showToast === 'function') showToast('❌ Thanh toán đã bị hủy');
      localStorage.removeItem('pending_plan');
      localStorage.removeItem('pending_uid');
      localStorage.removeItem('pending_order');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkPaymentCallback);
  } else {
    checkPaymentCallback();
  }

  console.log('[PayOS] 11-payos-payment loaded');
})();
