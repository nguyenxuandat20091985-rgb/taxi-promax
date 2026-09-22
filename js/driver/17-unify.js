/*
 * Taxi ProMax — PayOS override CUỐI (load sau core)
 * Ép handlePayment → /api/create-payment; re-bind định kỳ chống core ghi đè
 */
(function () {
  'use strict';

  function getDriver() {
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
    try {
      if (location && location.origin && location.protocol.indexOf('http') === 0) return location.origin;
    } catch (e) {}
    return 'https://taxi-promax.vercel.app';
  }

  var PLAN_DAYS = { 'LẺ': 1, 'LE': 1, 'PRO': 30, 'PROMAX': 90, 'TRIAL 7D': 7 };

  async function activateLocal(uid, plan) {
    var days = PLAN_DAYS[plan] || 30;
    try {
      if (typeof db === 'undefined' || !db) return false;
      var snap = await db.ref('drivers/' + uid).once('value');
      var d = snap.val() || {};
      var base = Date.now();
      if (d.tp_expiry && parseInt(d.tp_expiry, 10) > base) base = parseInt(d.tp_expiry, 10);
      var expiry = base + days * 86400000;
      await db.ref('drivers/' + uid).update({ tp_expiry: expiry, active_plan: plan });
      return true;
    } catch (e) {
      console.warn('[PayOS] activateLocal', e);
      return false;
    }
  }

  async function promaxHandlePayment(amount, plan) {
    var drv = getDriver();
    if (!drv || !drv.uid) {
      if (typeof showToast === 'function') showToast('⚠️ Vui lòng đăng nhập trước');
      return;
    }

    if (Number(amount) === 0) {
      try {
        await activateLocal(drv.uid, planKey(plan) || 'TRIAL 7D');
        if (typeof showToast === 'function') showToast('✅ Kích hoạt gói dùng thử 7 ngày!');
        setTimeout(function () {
          try {
            location.reload();
          } catch (e) {}
        }, 1200);
      } catch (e) {
        if (typeof showToast === 'function') showToast('⚠️ ' + ((e && e.message) || e));
      }
      return;
    }

    var key = planKey(plan);
    if (typeof showToast === 'function') showToast('⏳ Đang tạo thanh toán PayOS...');

    try {
      var r = await fetch(apiBase() + '/api/create-payment', {
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

      var msg = d.error || ('HTTP ' + r.status);
      if (typeof showToast === 'function') showToast('❌ Lỗi PayOS: ' + msg);
    } catch (e) {
      console.error('[PayOS]', e);
      if (typeof showToast === 'function') {
        showToast('❌ Không kết nối máy chủ thanh toán');
      }
    }
  }

  function bindPayos() {
    window.handlePayment = promaxHandlePayment;
  }
  bindPayos();
  // Chống core / module khác ghi đè lại
  setInterval(bindPayos, 1500);

  function tripBusy() {
    try {
      if (window.tripEngine && typeof window.tripEngine.isTripActive === 'function') {
        return window.tripEngine.isTripActive();
      }
      var state =
        document.documentElement.getAttribute('data-trip-state') ||
        document.body.getAttribute('data-trip-state') ||
        '';
      return state && state !== 'IDLE' && state !== 'COMPLETED' && state !== 'CANCELLED';
    } catch (e) {
      return false;
    }
  }

  var pendingNotice = '';
  function showWhenIdle(message) {
    if (tripBusy()) {
      pendingNotice = message;
      return false;
    }
    if (typeof showToast === 'function') showToast(message);
    return true;
  }
  function flushNotice() {
    if (pendingNotice && !tripBusy()) {
      var message = pendingNotice;
      pendingNotice = '';
      if (typeof showToast === 'function') showToast(message);
    }
  }

  function unifyMenu() {
    var items = document.querySelectorAll('.sidebar-item');
    for (var i = 0; i < items.length; i++) {
      var el = items[i];
      if ((el.innerText || '').indexOf('Ví tiền') !== -1 && !el.dataset.unified) {
        el.dataset.unified = '1';
        el.onclick = function () {
          try {
            closeSidebar();
          } catch (e) {}
          try {
            showTab('vi', null);
          } catch (e) {}
          try {
            document.querySelectorAll('.tab-content').forEach(function (x) {
              x.style.display = 'none';
            });
            var tab = document.getElementById('tab-vi');
            if (tab) tab.style.display = 'flex';
          } catch (e) {}
        };
      }
    }
    var wm = document.getElementById('wmModal');
    if (wm) wm.remove();
  }

  function watchActivation() {
    var pending = localStorage.getItem('pending_plan');
    var drv = getDriver();
    if (!pending || !drv) return;
    var tries = 0;
    showWhenIdle('⏳ Đang đối soát thanh toán ' + pending + '...');
    var iv = setInterval(function () {
      tries++;
      try {
        if (typeof db === 'undefined') throw new Error('db unavailable');
        db.ref('drivers/' + drv.uid)
          .once('value')
          .then(function (s) {
            var d = s.val() || {};
            if (d.tp_expiry && parseInt(d.tp_expiry, 10) > Date.now()) {
              clearInterval(iv);
              localStorage.removeItem('pending_plan');
              showWhenIdle('✅ Gói đã kích hoạt: ' + (d.active_plan || pending) + ' 🎉');
            } else if (tries >= 12) {
              clearInterval(iv);
              showWhenIdle('ℹ️ Hệ thống sẽ kích hoạt sau khi đối soát.');
            }
          })
          .catch(function () {
            if (tries >= 12) {
              clearInterval(iv);
              showWhenIdle('ℹ️ Chưa nhận được xác nhận thanh toán.');
            }
          });
      } catch (e) {
        if (tries >= 12) {
          clearInterval(iv);
          showWhenIdle('ℹ️ Chưa nhận được xác nhận thanh toán.');
        }
      }
    }, 5000);
  }

  async function onPayosReturn() {
    try {
      var p = new URLSearchParams(location.search);
      var st = p.get('status');
      if (st === 'success') {
        var plan = p.get('plan') || localStorage.getItem('pending_plan') || 'PRO';
        var uid = p.get('uid') || localStorage.getItem('pending_uid');
        history.replaceState({}, '', location.pathname + location.hash);
        if (typeof showToast === 'function') showToast('✅ Thanh toán thành công! Đang kích hoạt gói...');
        if (uid) await activateLocal(uid, plan);
        localStorage.removeItem('pending_plan');
        setTimeout(function () {
          location.reload();
        }, 2000);
      } else if (st === 'cancel') {
        history.replaceState({}, '', location.pathname + location.hash);
        if (typeof showToast === 'function') showToast('❌ Đã hủy thanh toán');
      }
    } catch (e) {}
  }

  function boot() {
    bindPayos();
    unifyMenu();
    watchActivation();
    onPayosReturn();
    setInterval(function () {
      unifyMenu();
      flushNotice();
    }, 2000);
    console.log('[PayOS] 17-unify active → /api/create-payment');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
