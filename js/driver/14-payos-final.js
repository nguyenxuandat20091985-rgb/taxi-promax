/**
 * 14-payos-final.js — override CUỐI CÙNG cho handlePayment
 * Nguyên nhân lỗi "Failed to fetch": 00-core-runtime gọi thẳng
 * https://api.payos.vn với YOUR_CLIENT_ID (CORS + key giả).
 * File này ép mọi nút NẠP NGAY đi qua /api/create-payment trên Vercel.
 */
(function () {
  'use strict';

  function getDriver() {
    try {
      if (typeof window.getDriverInfo === 'function') {
        var g = window.getDriverInfo();
        if (g && g.uid) return g;
      }
    } catch (e) {}
    try {
      if (typeof driverInfo !== 'undefined' && driverInfo && driverInfo.uid) return driverInfo;
    } catch (e) {}
    try {
      if (window.driverInfo && window.driverInfo.uid) return window.driverInfo;
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

  function planKey(plan) {
    if (plan == null) return 'PRO';
    if (typeof plan === 'object') return String(plan.key || plan.name || plan.plan || 'PRO');
    return String(plan);
  }

  function apiBase() {
    // PWA / WebView: luôn dùng origin hiện tại; fallback production
    try {
      if (location && location.origin && location.protocol.indexOf('http') === 0) {
        return location.origin;
      }
    } catch (e) {}
    return 'https://taxi-promax.vercel.app';
  }

  window.handlePayment = async function (amount, plan) {
    var drv = getDriver();
    if (!drv || !drv.uid) {
      if (typeof showToast === 'function') showToast('⚠️ Vui lòng đăng nhập trước');
      return;
    }

    // Trial 0đ — kích hoạt local + Firebase
    if (Number(amount) === 0) {
      try {
        var nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
        if (typeof db !== 'undefined' && db) {
          await db.ref('drivers/' + drv.uid).update({
            tp_expiry: nextWeek,
            active_plan: planKey(plan) || 'TRIAL 7D'
          });
        }
        if (typeof showToast === 'function') showToast('✅ Kích hoạt gói dùng thử 7 ngày!');
        if (typeof initCountdown === 'function') initCountdown();
        setTimeout(function () {
          try {
            location.reload();
          } catch (e) {}
        }, 1200);
      } catch (e) {
        if (typeof showToast === 'function') showToast('⚠️ Không kích hoạt được trial: ' + (e.message || e));
      }
      return;
    }

    var key = planKey(plan);
    if (typeof showToast === 'function') showToast('⏳ Đang tạo thanh toán PayOS...');

    try {
      var url = apiBase() + '/api/create-payment';
      var r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          plan: key,
          planName: key,
          driverUid: drv.uid,
          driverPhone: drv.phone || ''
        })
      });

      var d = await r.json().catch(function () {
        return { success: false, error: 'Phản hồi không hợp lệ' };
      });

      if (d.success && d.checkoutUrl) {
        try {
          localStorage.setItem('pending_plan', key);
          localStorage.setItem('pending_uid', drv.uid);
          localStorage.setItem('pending_order', String(d.orderCode || ''));
        } catch (e) {}
        window.location.href = d.checkoutUrl;
        return;
      }

      if (typeof showToast === 'function') {
        showToast('❌ Lỗi PayOS: ' + (d.error || ('HTTP ' + r.status)));
      }
    } catch (e) {
      console.error('[PayOS final]', e);
      if (typeof showToast === 'function') {
        showToast('❌ Không kết nối máy chủ thanh toán. Thử lại hoặc mở taxi-promax.vercel.app');
      }
    }
  };

  // Callback return từ PayOS
  function onReturn() {
    try {
      var p = new URLSearchParams(location.search);
      var st = p.get('status');
      if (st === 'success') {
        history.replaceState({}, '', location.pathname + location.hash);
        if (typeof showToast === 'function') {
          showToast('✅ Thanh toán thành công! Đang kích hoạt gói...');
        }
        setTimeout(function () {
          location.reload();
        }, 2200);
      } else if (st === 'cancel') {
        history.replaceState({}, '', location.pathname + location.hash);
        if (typeof showToast === 'function') showToast('❌ Đã hủy thanh toán');
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReturn);
  } else {
    onReturn();
  }

  console.log('[PayOS] 14-payos-final active — /api/create-payment');
})();
