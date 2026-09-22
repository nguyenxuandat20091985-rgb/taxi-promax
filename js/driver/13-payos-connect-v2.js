// PayOS connect v2 — bản cuối cùng override handlePayment (sau 11-payos)
(function () {
  'use strict';

  /* Cầu nối driverInfo (let scope → window) */
  try {
    Object.defineProperty(window, 'driverInfo', {
      configurable: true,
      get: function () {
        return typeof driverInfo !== 'undefined' ? driverInfo : undefined;
      },
      set: function (v) {
        try {
          driverInfo = v;
        } catch (e) {}
      }
    });
  } catch (e) {
    setInterval(function () {
      try {
        if (typeof driverInfo !== 'undefined') window.driverInfo = driverInfo;
      } catch (err) {}
    }, 800);
  }

  function getDriver() {
    try {
      if (typeof driverInfo !== 'undefined' && driverInfo && driverInfo.uid) return driverInfo;
    } catch (e) {}
    try {
      var s = localStorage.getItem('driverInfo');
      if (s) {
        var d = JSON.parse(s);
        if (d && d.uid) return d;
      }
    } catch (e) {}
    return null;
  }
  window.getDriverInfo = getDriver;

  function planKey(plan) {
    if (plan == null) return 'PRO';
    if (typeof plan === 'object') return String(plan.key || plan.name || plan.plan || 'PRO');
    return String(plan);
  }

  var _orig = window.handlePayment;
  window.handlePayment = async function (amount, plan) {
    if (amount === 0) {
      return _orig ? _orig(amount, plan) : null;
    }

    var drv = getDriver();
    if (!drv) {
      if (typeof showToast === 'function') showToast('⚠️ Vui lòng đăng nhập trước');
      return;
    }

    var key = planKey(plan);
    if (typeof showToast === 'function') showToast('⏳ Đang tạo thanh toán PayOS...');

    try {
      var r = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          plan: key,
          planName: key,
          driverUid: drv.uid
        })
      });
      var d = await r.json();
      if (d.success && d.checkoutUrl) {
        localStorage.setItem('pending_plan', key);
        localStorage.setItem('pending_uid', drv.uid);
        localStorage.setItem('pending_order', String(d.orderCode || ''));
        window.location.href = d.checkoutUrl;
      } else {
        if (typeof showToast === 'function') {
          showToast('❌ Lỗi PayOS: ' + (d.error || 'thử lại'));
        }
      }
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ Không kết nối được máy chủ thanh toán');
    }
  };

  function cb() {
    var p = new URLSearchParams(location.search);
    var st = p.get('status');
    if (st === 'success') {
      history.replaceState({}, '', location.pathname);
      if (typeof showToast === 'function') {
        showToast('✅ Thanh toán thành công! Đang kích hoạt gói...');
      }
      setTimeout(function () {
        location.reload();
      }, 2500);
    } else if (st === 'cancel') {
      history.replaceState({}, '', location.pathname);
      if (typeof showToast === 'function') showToast('❌ Đã hủy thanh toán');
      localStorage.removeItem('pending_plan');
      localStorage.removeItem('pending_uid');
      localStorage.removeItem('pending_order');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cb);
  else cb();

  console.log('[PayOS] 13-payos-connect-v2 loaded');
})();
