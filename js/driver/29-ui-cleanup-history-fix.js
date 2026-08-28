/*
 * Taxi ProMax — UI Cleanup + History Force-Save v1
 * Load SAU tất cả module driver (cuối index.html).
 * - Ẩn banner GPS kém / sheet hướng dẫn GPS
 * - Ẩn box hướng dẫn xanh khi đang chạy chuyến
 * - Ép lưu lịch sử chắc chắn khi hoàn tất
 * - Toast hoàn tất tự ẩn, không đè nút
 */
(function (window, document) {
  'use strict';

  var MIN_FARE = 20000;

  /* ========== 1. ẨN BANNER GPS KÉM & SHEET HƯỚNG DẪN ========== */
  function hideGpsNoise() {
    // Banner đỏ "GPS rất kém..."
    var nodes = document.querySelectorAll('div, section, aside, p, span');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el || !el.textContent) continue;
      var t = (el.textContent || '').trim();
      // Banner GPS kém
      if (
        (t.indexOf('GPS rất kém') !== -1 || t.indexOf('độ chính xác') !== -1 || t.indexOf('thoáng đãng') !== -1) &&
        t.length < 120
      ) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('height', '0', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    }
    // Sheet GPS guide
    var guide = document.getElementById('gpsGuide');
    if (guide) guide.style.display = 'none';
  }

  /* ========== 2. ẨN BOX HƯỚNG DẪN XANH KHI ĐANG CHẠY ========== */
  function hideTripInstructionBoxes() {
    var nodes = document.querySelectorAll('div');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el || !el.textContent) continue;
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      var isTip =
        (t.indexOf('Khách đã lên xe') !== -1 && t.indexOf('tính cước') !== -1) ||
        (t.indexOf('Đã bắt đầu tính cước') !== -1 && t.indexOf('kết thúc chuyến') !== -1) ||
        (t.indexOf('Chọn điểm đến hoặc bắt đầu tính cước') !== -1);
      if (isTip && t.length < 200) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('opacity', '0', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        el.style.setProperty('height', '0', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '0', 'important');
      }
    }
  }

  /* ========== 3. TOAST HOÀN TẤT — TỰ ẨN, KHÔNG ĐÈ NÚT ========== */
  function styleSuccessToast() {
    var nodes = document.querySelectorAll('div');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el || !el.textContent) continue;
      var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.indexOf('Chuyến đi hoàn tất') !== -1 || (t.indexOf('Cảm ơn anh') !== -1 && t.length < 80)) {
        // Đưa lên giữa, tự ẩn sau 2.5s
        el.style.setProperty('position', 'fixed', 'important');
        el.style.setProperty('left', '50%', 'important');
        el.style.setProperty('bottom', '110px', 'important');
        el.style.setProperty('transform', 'translateX(-50%)', 'important');
        el.style.setProperty('z-index', '25000', 'important');
        el.style.setProperty('max-width', '90%', 'important');
        el.style.setProperty('box-shadow', '0 8px 24px rgba(0,0,0,.18)', 'important');
        (function (node) {
          setTimeout(function () {
            if (node && node.parentNode) {
              node.style.setProperty('display', 'none', 'important');
              try { node.remove(); } catch (e) {}
            }
          }, 2500);
        })(el);
      }
    }
    // Toast chuẩn #txToast
    var toast = document.getElementById('txToast');
    if (toast && toast.classList.contains('show')) {
      var txt = (toast.innerText || '').trim();
      if (txt.indexOf('hoàn tất') !== -1 || txt.indexOf('Cảm ơn') !== -1) {
        setTimeout(function () {
          toast.classList.remove('show');
        }, 2500);
      }
    }
  }

  /* ========== 4. ÉP LƯU LỊCH SỬ CHẮC CHẮN ========== */
  function forceSaveHistory(km, cost, tripType) {
    km = Number(km) || 0;
    cost = Number(cost) || 0;
    if (cost < MIN_FARE) cost = MIN_FARE;
    tripType = tripType || 'STREET_HAIL';

    var now = Date.now();
    var uid = 'local';
    try {
      if (typeof driverInfo !== 'undefined' && driverInfo && driverInfo.uid) uid = driverInfo.uid;
      else {
        var s = localStorage.getItem('driverInfo');
        if (s) {
          var d = JSON.parse(s);
          if (d && d.uid) uid = d.uid;
        }
      }
    } catch (e) {}

    var tripData = {
      km: km,
      cost: cost,
      costLabel: cost.toLocaleString('vi-VN') + 'đ',
      time: new Date(now).toLocaleString('vi-VN'),
      timestamp: now,
      rate: (typeof currentRate !== 'undefined' ? currentRate : 15000),
      driverId: uid,
      tripType: tripType
    };

    // localStorage trước
    try {
      var history = [];
      try { history = JSON.parse(localStorage.getItem('trip_history') || '[]'); } catch (e) {}
      if (!Array.isArray(history)) history = [];
      history.unshift(tripData);
      localStorage.setItem('trip_history', JSON.stringify(history.slice(0, 100)));
    } catch (e) {
      console.warn('[UI-CLEANUP] localStorage save fail', e);
    }

    // Firebase nếu có
    try {
      if (uid && uid !== 'local' && typeof db !== 'undefined') {
        db.ref('trips/' + uid + '/' + now).set(tripData).catch(function () {});
      }
    } catch (e) {}

    // Render lại
    try {
      if (typeof window.renderHistory === 'function') window.renderHistory();
    } catch (e) {}
    try {
      renderHistoryLocal(tripData);
    } catch (e) {}

    return tripData;
  }

  function renderHistoryLocal(latest) {
    var box = document.getElementById('historyList');
    if (!box) return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem('trip_history') || '[]'); } catch (e) {}
    if (!Array.isArray(list) || !list.length) {
      if (latest) list = [latest];
      else {
        box.innerHTML = '<div style="text-align:center;padding:30px;color:#999;">Chưa có chuyến đi nào</div>';
        return;
      }
    }
    box.innerHTML = list.map(function (h) {
      var km = (Number(h.km) || 0).toFixed(2);
      var cost = h.costLabel || ((Number(h.cost) || 0).toLocaleString('vi-VN') + 'đ');
      var time = h.time || '';
      var tag = h.tripType === 'STREET_HAIL' ? '🚕 Vẫy' : '📱 App';
      return '<div class="history-card" style="display:flex;justify-content:space-between;align-items:center;padding:12px;margin:8px 12px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);">' +
        '<div><b>' + time + '</b><br><small>' + km + ' KM</small> <span style="font-size:11px;color:#64748b;">' + tag + '</span></div>' +
        '<div style="font-weight:900;color:#0054a3;">' + cost + '</div></div>';
    }).join('');
  }

  /* Patch completeTrip / legacy handler */
  function patchComplete() {
    // Patch window.__PromaxLegacyHandlers.completeTrip
    try {
      var handlers = window.__PromaxLegacyHandlers || {};
      var prev = handlers.completeTrip;
      handlers.completeTrip = function () {
        var km = 0, cost = 0, tripType = 'STREET_HAIL';
        try {
          if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.getTotalKm === 'function') {
            km = Number(window.PromaxLegacyRuntime.getTotalKm()) || 0;
          }
          if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.getRate === 'function') {
            cost = Math.round(km * Number(window.PromaxLegacyRuntime.getRate() || 15000));
          }
          if (window.tripEngine && window.tripEngine.currentFare) {
            try { cost = Number(window.tripEngine.currentFare()) || cost; } catch (e) {}
          }
        } catch (e) {}
        if (cost < MIN_FARE) cost = MIN_FARE;
        forceSaveHistory(km, cost, tripType);
        var result;
        if (typeof prev === 'function') {
          try { result = prev.apply(this, arguments); } catch (e) {}
        }
        // Lưu thêm 1 lần sau khi legacy chạy (tránh bị ghi đè)
        setTimeout(function () { forceSaveHistory(km, cost, tripType); }, 300);
        return result;
      };
      window.__PromaxLegacyHandlers = handlers;
    } catch (e) {}

    // Patch saveHistory nếu có trên window
    try {
      var prevSave = window.saveHistory;
      window.saveHistory = async function (km, costLabel, costRaw, tripType) {
        var cost = Number(costRaw) || 0;
        if (cost < MIN_FARE) cost = MIN_FARE;
        forceSaveHistory(Number(km) || 0, cost, tripType || 'STREET_HAIL');
        if (typeof prevSave === 'function') {
          try { return await prevSave.apply(this, arguments); } catch (e) {}
        }
      };
    } catch (e) {}
  }

  /* ========== 5. ẨN BOTTOM NAV KHI ĐANG CHẠY (bổ sung) ========== */
  function syncNavVisibility() {
    var running = false;
    try {
      if (window.tripEngine && typeof window.tripEngine.isTripActive === 'function') {
        running = window.tripEngine.isTripActive();
      } else if (typeof isRunning !== 'undefined') {
        running = !!isRunning;
      } else {
        var st = document.documentElement.getAttribute('data-trip-state') || '';
        running = st && st !== 'IDLE' && st !== 'COMPLETED' && st !== 'CANCELLED';
      }
    } catch (e) {}
    var nav = document.querySelector('.nav-grid');
    if (nav) nav.style.display = running ? 'none' : 'flex';
    // Brand: luôn hiện khi idle (ghi đè CSS overrides)
    var brand = document.querySelector('.brand-footer');
    if (brand) {
      brand.style.setProperty('display', running ? 'none' : 'block', 'important');
      if (!running && !(brand.textContent || '').trim()) {
        brand.textContent = 'PHÁT TRIỂN BỞI: NGUYEN XUAN DAT';
      }
    }
  }

  /* ========== BOOT ========== */
  function tick() {
    hideGpsNoise();
    hideTripInstructionBoxes();
    styleSuccessToast();
    syncNavVisibility();
  }


  /* Ép hiện vầng quang marker + brand footer (ghi đè overrides cũ) */
  function injectMarkerBrandCSS() {
    if (document.getElementById('sm-pulse-ring-force')) return;
    var s = document.createElement('style');
    s.id = 'sm-pulse-ring-force';
    s.textContent = [
      '.sm-pulse-ring{display:block!important;position:absolute!important;width:48px!important;height:48px!important;border-radius:50%!important;background:rgba(0,191,165,.35)!important;animation:smSpread 2s infinite ease-out!important;pointer-events:none!important;left:50%!important;top:50%!important;margin-left:-24px!important;margin-top:-24px!important;}',
      '@keyframes smSpread{0%{transform:scale(.55);opacity:1}100%{transform:scale(1.7);opacity:0}}',
      '.sm-marker-container{width:48px!important;height:48px!important;}',
      '.footer-panel .brand-footer{display:block!important;font-size:9px!important;text-align:center!important;color:#94a3b8!important;padding:4px 0 2px!important;font-weight:700!important;}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function boot() {
    injectMarkerBrandCSS();
    patchComplete();
    tick();
    setInterval(tick, 800);
    document.addEventListener('trip:status', function () {
      setTimeout(tick, 50);
      setTimeout(tick, 400);
    });
    document.addEventListener('trip:completed', function () {
      setTimeout(function () {
        try {
          var km = 0, cost = MIN_FARE;
          if (window.PromaxLegacyRuntime) {
            if (typeof window.PromaxLegacyRuntime.getTotalKm === 'function') km = Number(window.PromaxLegacyRuntime.getTotalKm()) || 0;
            if (typeof window.PromaxLegacyRuntime.getRate === 'function') cost = Math.max(MIN_FARE, Math.round(km * Number(window.PromaxLegacyRuntime.getRate() || 15000)));
          }
          forceSaveHistory(km, cost, 'STREET_HAIL');
        } catch (e) {}
        styleSuccessToast();
      }, 200);
    });
    // Khi mở tab lịch sử → render local
    var prevShowTab = window.showTab;
    window.showTab = function (tab, btn) {
      var r = typeof prevShowTab === 'function' ? prevShowTab.apply(this, arguments) : undefined;
      if (tab === 'lichsu') setTimeout(function () { renderHistoryLocal(); }, 150);
      return r;
    };
    console.log('✅ UI Cleanup + History Force-Save v1 loaded');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
