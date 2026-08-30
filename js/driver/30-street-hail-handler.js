/**
 * Taxi ProMax — Street Hail Handler v4.0 (chuẩn Xanh SM)
 * Luồng ĐỘC LẬP: không trộn app booking.
 *
 * UI khi chạy:
 *  - Top meter: Khoảng cách | Cước | Thời gian
 *  - Map full
 *  - Bottom: KHÁCH VẪY + Điều hướng + HOÀN THÀNH CHUYẾN
 *
 * Persist: localStorage — đổi tab / reload / mất mạng tạm vẫn giữ chuyến.
 * GPS: accuracy + anti-teleport; mất GPS không reset km/cước.
 */
;(function (window, document) {
  'use strict';

  var STORAGE_KEY = 'promax_street_hail_v4';
  var MIN_FARE = 20000;
  var DEFAULT_RATE = 15000;
  var MIN_DELTA_KM = 0.004;   // ~4m
  var MAX_DELTA_KM = 0.35;    // anti teleport ~350m/tick
  var MAX_SPEED_KMH = 160;

  var PHASE = {
    IDLE: 'IDLE',
    CONFIRM: 'CONFIRM',
    RUNNING: 'RUNNING',
    COMPLETING: 'COMPLETING'
  };

  var state = {
    phase: PHASE.IDLE,
    tripId: null,
    totalKm: 0,
    startTime: null,
    lastLat: null,
    lastLng: null,
    lastFixAt: null,
    destAddress: '',
    destLat: null,
    destLng: null,
    hasDest: false,
    rate: DEFAULT_RATE
  };

  function $(id) { return document.getElementById(id); }

  function now() { return Date.now(); }

  function rate() {
    try {
      if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.getRate === 'function') {
        var r = Number(window.PromaxLegacyRuntime.getRate());
        if (r > 0) return r;
      }
    } catch (e) {}
    var slider = $('priceSlider');
    if (slider && Number(slider.value) > 0) return Number(slider.value);
    return state.rate || DEFAULT_RATE;
  }

  function haversine(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function fareLive() {
    var f = Math.round(state.totalKm * rate());
    // Hiển thị tối thiểu 0 khi mới bắt đầu; khi kết thúc mới min fare
    return f;
  }

  function fareFinal() {
    var f = Math.round(state.totalKm * rate());
    if (f < MIN_FARE) f = MIN_FARE;
    return f;
  }

  function elapsedMs() {
    if (!state.startTime) return 0;
    return Math.max(0, now() - state.startTime);
  }

  function elapsedLabel() {
    var s = Math.floor(elapsedMs() / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    if (m >= 60) {
      var h = Math.floor(m / 60);
      m = m % 60;
      return h + 'h' + (m < 10 ? '0' : '') + m + 'p';
    }
    return m + 'Phút' + (s > 0 && m < 10 ? '' : '');
  }

  function elapsedLabelFull() {
    var s = Math.floor(elapsedMs() / 1000);
    var m = Math.floor(s / 60);
    s = s % 60;
    return m + ' phút ' + (s < 10 ? '0' : '') + s + 's';
  }

  function isActive() {
    return state.phase === PHASE.CONFIRM || state.phase === PHASE.RUNNING || state.phase === PHASE.COMPLETING;
  }

  /* ========== PERSIST ========== */
  function persist() {
    try {
      if (state.phase === PHASE.IDLE) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        phase: state.phase,
        tripId: state.tripId,
        totalKm: state.totalKm,
        startTime: state.startTime,
        lastLat: state.lastLat,
        lastLng: state.lastLng,
        lastFixAt: state.lastFixAt,
        destAddress: state.destAddress,
        destLat: state.destLat,
        destLng: state.destLng,
        hasDest: state.hasDest,
        rate: rate(),
        savedAt: now()
      }));
    } catch (e) {}
  }

  function restore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || !data.phase || data.phase === PHASE.IDLE) return false;
      // Quá 12h bỏ
      if (data.savedAt && now() - data.savedAt > 12 * 3600 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      state.phase = data.phase === PHASE.COMPLETING ? PHASE.RUNNING : data.phase;
      if (state.phase === PHASE.CONFIRM) state.phase = PHASE.RUNNING; // resume vào running
      state.tripId = data.tripId || ('SH_' + (data.startTime || now()));
      state.totalKm = Number(data.totalKm) || 0;
      state.startTime = data.startTime || now();
      state.lastLat = data.lastLat != null ? Number(data.lastLat) : null;
      state.lastLng = data.lastLng != null ? Number(data.lastLng) : null;
      state.lastFixAt = data.lastFixAt || null;
      state.destAddress = data.destAddress || '';
      state.destLat = data.destLat != null ? Number(data.destLat) : null;
      state.destLng = data.destLng != null ? Number(data.destLng) : null;
      state.hasDest = !!data.hasDest;
      state.rate = Number(data.rate) || DEFAULT_RATE;
      return state.phase === PHASE.RUNNING;
    } catch (e) {
      return false;
    }
  }

  /* ========== UI (Xanh SM style) ========== */
  function ensureStyles() {
    if ($('shV4Styles')) return;
    var st = document.createElement('style');
    st.id = 'shV4Styles';
    st.textContent = [
      'body.sh-v4-active .footer-panel,',
      'body.sh-v4-active #homeControls,',
      'body.sh-v4-active .nav-grid,',
      'body.sh-v4-active #tripInfoPanel,',
      'body.sh-v4-active #streetHailMeter,',
      'body.sh-v4-active #streetHailEndSticky,',
      'body.sh-v4-active .brand-footer{display:none!important}',
      '#shV4Root{display:none;position:fixed;inset:0;z-index:10500;pointer-events:none}',
      'body.sh-v4-active #shV4Root{display:block}',
      '#shV4Top{pointer-events:auto;position:absolute;left:12px;right:12px;top:calc(12px + env(safe-area-inset-top,0px));',
      '  background:#0f172a;color:#fff;border-radius:16px;padding:12px 10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;',
      '  box-shadow:0 10px 28px rgba(15,23,42,.35);z-index:2}',
      '#shV4Top .cell{text-align:center}',
      '#shV4Top .label{font-size:10px;font-weight:700;opacity:.75;margin-bottom:4px}',
      '#shV4Top .value{font-size:16px;font-weight:900;letter-spacing:.2px}',
      '#shV4Bottom{pointer-events:auto;position:absolute;left:0;right:0;bottom:0;',
      '  background:#fff;border-radius:22px 22px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));',
      '  box-shadow:0 -12px 40px rgba(15,23,42,.18);z-index:2}',
      '#shV4Pax{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}',
      '#shV4Pax .name{font-size:15px;font-weight:800;color:#0f172a}',
      '#shV4Pax .sub{font-size:12px;color:#64748b;font-weight:600;margin-top:2px}',
      '#shV4NavBtn{width:44px;height:44px;border-radius:50%;border:none;background:#2563eb;color:#fff;',
      '  font-size:18px;font-weight:900;cursor:pointer;box-shadow:0 6px 16px rgba(37,99,235,.35)}',
      '#shV4Actions{display:flex;gap:10px;margin-bottom:12px}',
      '#shV4Actions button{flex:1;padding:10px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;',
      '  font-size:13px;font-weight:700;color:#0f172a;cursor:pointer}',
      '#shV4Complete{width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(135deg,#00bfa5,#00a389);',
      '  color:#fff;font-size:16px;font-weight:900;cursor:pointer;box-shadow:0 8px 24px rgba(0,191,165,.35);touch-action:manipulation}',
      '#shV4Overlay{display:none;position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:12000;',
      '  align-items:flex-end;justify-content:center;padding:16px;pointer-events:auto}',
      '#shV4Overlay.show{display:flex}',
      '#shV4Card{width:100%;max-width:420px;background:#fff;border-radius:20px;padding:20px;',
      '  box-shadow:0 20px 50px rgba(0,0,0,.3)}',
      '#shV4Card h3{margin:0 0 10px;text-align:center;font-size:17px;font-weight:900;color:#0f172a}',
      '#shV4Card .sum{background:#f1f5f9;border-radius:14px;padding:12px 14px;margin-bottom:14px}',
      '#shV4Card .sum-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px;font-weight:700;color:#334155}',
      '#shV4Card .sum-row.big{font-size:18px;color:#0054a3;font-weight:900}',
      '#shV4Card .row{display:flex;gap:10px}',
      '#shV4Card .row button{flex:1;padding:13px;border:none;border-radius:12px;font-size:14px;font-weight:900;cursor:pointer}',
      '.sh-btn-gray{background:#e2e8f0;color:#0f172a}',
      '.sh-btn-teal{background:linear-gradient(135deg,#00bfa5,#00a389);color:#fff}',
      '.sh-btn-blue{background:linear-gradient(135deg,#0054a3,#003d7a);color:#fff}',
      '#shV4DestInput{width:100%;box-sizing:border-box;padding:12px;border:1px solid #cbd5e1;border-radius:12px;',
      '  font-size:14px;font-weight:600;margin-bottom:12px}'
    ].join('');
    document.head.appendChild(st);
  }

  function ensureRoot() {
    ensureStyles();
    var root = $('shV4Root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'shV4Root';
      root.innerHTML =
        '<div id="shV4Top">' +
        '  <div class="cell"><div class="label">Khoảng cách</div><div class="value" id="shV4Km">0km</div></div>' +
        '  <div class="cell"><div class="label">Cước phí</div><div class="value" id="shV4Fare">0đ</div></div>' +
        '  <div class="cell"><div class="label">Thời gian</div><div class="value" id="shV4Time">0Phút</div></div>' +
        '</div>' +
        '<div id="shV4Bottom">' +
        '  <div id="shV4Pax">' +
        '    <div><div class="name">Hành khách</div><div class="sub" id="shV4PaxName">Khách vẫy</div></div>' +
        '    <button type="button" id="shV4NavBtn" title="Điều hướng">🧭</button>' +
        '  </div>' +
        '  <div id="shV4Actions">' +
        '    <button type="button" id="shV4DestBtn">Nhập điểm đến</button>' +
        '    <button type="button" id="shV4CallBtn">Gọi / Ghi chú</button>' +
        '  </div>' +
        '  <button type="button" id="shV4Complete">Hoàn thành chuyến</button>' +
        '</div>';
      document.body.appendChild(root);
      $('shV4NavBtn').onclick = function () { navigateDest(); };
      $('shV4DestBtn').onclick = function () { openDestDialog(); };
      $('shV4CallBtn').onclick = function () {
        if (typeof window.showToast === 'function') window.showToast('Chuyến vẫy — không có SĐT app');
      };
      $('shV4Complete').onclick = function () { openComplete(); };
    }
    var ov = $('shV4Overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'shV4Overlay';
      ov.innerHTML = '<div id="shV4Card"></div>';
      document.body.appendChild(ov);
    }
    return root;
  }

  function setBodyActive(on) {
    document.body.classList.toggle('sh-v4-active', !!on);
    document.body.classList.toggle('trip-active', !!on);
    document.body.classList.toggle('trip-street-hail', !!on);
    try {
      document.documentElement.setAttribute('data-trip-type', on ? 'STREET_HAIL' : '');
      document.documentElement.setAttribute('data-trip-state', on ? state.phase : 'IDLE');
      if (document.body) document.body.setAttribute('data-trip-state', on ? state.phase : 'IDLE');
    } catch (e) {}
  }

  function hideNativeChrome() {
    ['homeControls', 'tripInfoPanel', 'streetHailMeter', 'endTripBtn', 'streetHailEndSticky'].forEach(function (id) {
      var el = $(id);
      if (el) el.style.setProperty('display', 'none', 'important');
    });
    var nav = document.querySelector('.nav-grid');
    if (nav) nav.style.setProperty('display', 'none', 'important');
    var footer = document.querySelector('.footer-panel');
    if (footer) footer.style.setProperty('display', 'none', 'important');
  }

  function restoreNativeChrome() {
    setBodyActive(false);
    var root = $('shV4Root');
    if (root) root.style.display = 'none';
    var ov = $('shV4Overlay');
    if (ov) ov.classList.remove('show');

    var home = $('homeControls');
    if (home) home.style.setProperty('display', 'block', 'important');
    var panel = $('tripInfoPanel');
    if (panel) panel.style.setProperty('display', 'none', 'important');
    var nav = document.querySelector('.nav-grid');
    if (nav) nav.style.setProperty('display', 'flex', 'important');
    var footer = document.querySelector('.footer-panel');
    if (footer) footer.style.removeProperty('display');
    var mainBtn = $('mainBtn');
    if (mainBtn) {
      mainBtn.innerText = 'BẮT ĐẦU CHUYẾN ĐI';
      mainBtn.style.background = '';
    }
  }

  function paintMeter() {
    var kmEl = $('shV4Km');
    var fareEl = $('shV4Fare');
    var timeEl = $('shV4Time');
    var destBtn = $('shV4DestBtn');
    var pax = $('shV4PaxName');
    if (kmEl) kmEl.textContent = (state.totalKm < 0.01 ? state.totalKm.toFixed(2) : state.totalKm.toFixed(2)) + 'km';
    if (fareEl) fareEl.textContent = fareLive().toLocaleString('vi-VN') + 'đ';
    if (timeEl) timeEl.textContent = elapsedLabel();
    if (pax) pax.textContent = state.hasDest ? ('Khách vẫy → ' + (state.destAddress || 'Điểm đến')) : 'Khách vẫy';
    if (destBtn) destBtn.textContent = state.hasDest ? 'Đổi điểm đến' : 'Nhập điểm đến';
  }

  function showRunningUI() {
    ensureRoot();
    hideNativeChrome();
    setBodyActive(true);
    var root = $('shV4Root');
    if (root) root.style.display = 'block';
    paintMeter();
  }

  function openConfirmStart() {
    ensureRoot();
    var ov = $('shV4Overlay');
    var card = $('shV4Card');
    if (!ov || !card) return;
    card.innerHTML =
      '<h3>Khách vẫy</h3>' +
      '<p style="text-align:center;color:#475569;font-size:13px;margin:0 0 14px;line-height:1.5">' +
      'Xác nhận đón khách trên đường.<br>Có thể nhập điểm đến ngay hoặc sau khi chạy.</p>' +
      '<div class="row">' +
      '<button type="button" class="sh-btn-gray" id="shV4CancelStart">Hủy</button>' +
      '<button type="button" class="sh-btn-blue" id="shV4OkStart">Bắt đầu chuyến</button>' +
      '</div>';
    ov.classList.add('show');
    $('shV4CancelStart').onclick = function () {
      ov.classList.remove('show');
      state.phase = PHASE.IDLE;
      persist();
      restoreNativeChrome();
    };
    $('shV4OkStart').onclick = function () {
      ov.classList.remove('show');
      beginRunning();
    };
  }

  function openDestDialog() {
    var ov = $('shV4Overlay');
    var card = $('shV4Card');
    if (!ov || !card) return;
    card.innerHTML =
      '<h3>Điểm đến</h3>' +
      '<input id="shV4DestInput" type="text" placeholder="Ví dụ: Vincom, bến xe..." value="' +
      (state.destAddress || '').replace(/"/g, '&quot;') + '" />' +
      '<div class="row">' +
      '<button type="button" class="sh-btn-gray" id="shV4DestCancel">Hủy</button>' +
      '<button type="button" class="sh-btn-blue" id="shV4DestOk">Xác nhận</button>' +
      '</div>';
    ov.classList.add('show');
    $('shV4DestCancel').onclick = function () { ov.classList.remove('show'); };
    $('shV4DestOk').onclick = function () {
      var v = (($('shV4DestInput') && $('shV4DestInput').value) || '').trim();
      if (!v) {
        if (typeof window.showToast === 'function') window.showToast('Nhập điểm đến hoặc hủy');
        return;
      }
      state.hasDest = true;
      state.destAddress = v;
      persist();
      ov.classList.remove('show');
      paintMeter();
      if (typeof window.showToast === 'function') window.showToast('Đã ghi điểm đến');
    };
  }

  function navigateDest() {
    if (state.destLat != null && state.destLng != null) {
      window.open('https://www.google.com/maps/dir/?api=1&destination=' + state.destLat + ',' + state.destLng, '_blank');
      return;
    }
    if (state.destAddress) {
      window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(state.destAddress), '_blank');
      return;
    }
    if (typeof window.showToast === 'function') window.showToast('Chưa có điểm đến — bấm Nhập điểm đến');
  }

  function openComplete() {
    if (state.phase !== PHASE.RUNNING) return;
    state.phase = PHASE.COMPLETING;
    persist();
    var km = state.totalKm;
    var cost = fareFinal();
    var ov = $('shV4Overlay');
    var card = $('shV4Card');
    if (!ov || !card) return;
    card.innerHTML =
      '<h3>Xác nhận hoàn thành</h3>' +
      '<div class="sum">' +
      '<div class="sum-row"><span>Khoảng cách</span><span>' + km.toFixed(2) + ' km</span></div>' +
      '<div class="sum-row"><span>Thời gian</span><span>' + elapsedLabelFull() + '</span></div>' +
      '<div class="sum-row big"><span>Cước phí</span><span>' + cost.toLocaleString('vi-VN') + 'đ</span></div>' +
      '</div>' +
      '<div class="row">' +
      '<button type="button" class="sh-btn-gray" id="shV4CompCancel">Quay lại</button>' +
      '<button type="button" class="sh-btn-teal" id="shV4CompOk">Xác nhận</button>' +
      '</div>';
    ov.classList.add('show');
    $('shV4CompCancel').onclick = function () {
      ov.classList.remove('show');
      state.phase = PHASE.RUNNING;
      persist();
    };
    $('shV4CompOk').onclick = function () {
      ov.classList.remove('show');
      finalizeTrip(km, cost);
    };
  }

  function saveHistory(km, cost) {
    if (typeof window.saveHistory === 'function') {
      try {
        window.saveHistory(km, cost.toLocaleString('vi-VN'), cost, 'STREET_HAIL');
        return;
      } catch (e) {}
    }
    try {
      var history = JSON.parse(localStorage.getItem('trip_history') || '[]');
      history.unshift({
        km: km,
        cost: cost,
        costLabel: cost.toLocaleString('vi-VN') + 'đ',
        time: new Date().toLocaleString('vi-VN'),
        timestamp: now(),
        rate: rate(),
        driverId: (window.driverInfo && window.driverInfo.uid) || 'local',
        tripType: 'STREET_HAIL',
        dest: state.destAddress || '',
        tripId: state.tripId
      });
      localStorage.setItem('trip_history', JSON.stringify(history.slice(0, 200)));
    } catch (e) {}
  }

  function finalizeTrip(km, cost) {
    if (state._timer) { clearInterval(state._timer); state._timer = null; }
    saveHistory(km, cost);

    state.phase = PHASE.IDLE;
    state.tripId = null;
    state.totalKm = 0;
    state.startTime = null;
    state.lastLat = null;
    state.lastLng = null;
    state.lastFixAt = null;
    state.hasDest = false;
    state.destAddress = '';
    state.destLat = null;
    state.destLng = null;
    persist();

    restoreNativeChrome();

    var summary = $('endSummary');
    if (summary) {
      summary.innerHTML =
        'Quãng đường: <b>' + km.toFixed(2) + ' KM</b><br>' +
        'Tổng: <b style="color:var(--primary);font-size:20px;">' + cost.toLocaleString('vi-VN') + 'đ</b><br>' +
        '<span style="font-size:11px">Chuyến vẫy</span>';
    }
    var endModal = $('endModal');
    if (endModal) endModal.style.display = 'flex';

    if (typeof window.showToast === 'function') {
      window.showToast('Hoàn thành — ' + cost.toLocaleString('vi-VN') + 'đ');
    }
    if (typeof window.speak === 'function') window.speak('Hoàn thành chuyến');
    if (window.TripStateManager && window.TripStateManager.setState) {
      try { window.TripStateManager.setState('IDLE'); } catch (e) {}
    }
  }

  function beginRunning() {
    state.phase = PHASE.RUNNING;
    state.tripId = 'SH_' + now();
    state.totalKm = 0;
    state.startTime = now();
    state.rate = rate();
    state.lastLat = window.currentLat != null ? Number(window.currentLat) : null;
    state.lastLng = window.currentLng != null ? Number(window.currentLng) : null;
    state.lastFixAt = now();
    persist();

    showRunningUI();
    if (state._timer) clearInterval(state._timer);
    state._timer = setInterval(function () {
      if (state.phase !== PHASE.RUNNING) return;
      paintMeter();
      persist();
    }, 1000);

    var wish = $('wishModal');
    if (wish) try { wish.style.display = 'none'; } catch (e) {}

    if (typeof window.showToast === 'function') window.showToast('Chuyến vẫy đang chạy');
    if (typeof window.speak === 'function') window.speak('Bắt đầu chuyến vẫy');
    if (window.TripStateManager && window.TripStateManager.setState) {
      try { window.TripStateManager.setState('STREET_HAIL'); } catch (e) {}
    }
  }

  /* ========== GPS ========== */
  function onGPS(lat, lng, accuracy, speed) {
    if (state.phase !== PHASE.RUNNING) return;
    if (lat == null || lng == null) return;
    lat = Number(lat); lng = Number(lng);
    if (!isFinite(lat) || !isFinite(lng)) return;

    // Accuracy filter
    if (accuracy != null && Number(accuracy) > 80) {
      // vẫn cập nhật last fix time nhẹ, không cộng km
      return;
    }

    if (state.lastLat != null && state.lastLng != null) {
      var d = haversine(state.lastLat, state.lastLng, lat, lng);
      var dt = state.lastFixAt ? (now() - state.lastFixAt) / 1000 : 0;

      // Anti teleport
      if (d > MAX_DELTA_KM) {
        state.lastLat = lat;
        state.lastLng = lng;
        state.lastFixAt = now();
        persist();
        return;
      }
      // Speed check
      if (dt > 0 && d > 0) {
        var sp = (d / dt) * 3600;
        if (sp > MAX_SPEED_KMH) {
          state.lastLat = lat;
          state.lastLng = lng;
          state.lastFixAt = now();
          persist();
          return;
        }
      }
      if (d >= MIN_DELTA_KM) {
        state.totalKm += d;
      }
    }

    state.lastLat = lat;
    state.lastLng = lng;
    state.lastFixAt = now();
    paintMeter();
    persist();
  }

  /* ========== PUBLIC ========== */
  function startStreetHail() {
    if (state.phase === PHASE.RUNNING) {
      // Đang chạy: không “end” bằng nút bắt đầu — chỉ focus UI
      showRunningUI();
      if (typeof window.showToast === 'function') window.showToast('Đang trong chuyến vẫy');
      return true;
    }
    if (state.phase === PHASE.COMPLETING) {
      openComplete();
      return true;
    }
    if (state.phase === PHASE.CONFIRM) {
      openConfirmStart();
      return true;
    }
    if (window.AppTripHandler && window.AppTripHandler.isRunning && window.AppTripHandler.isRunning()) {
      if (typeof window.showToast === 'function') window.showToast('Đang có chuyến app — kết thúc trước');
      return false;
    }

    state.phase = PHASE.CONFIRM;
    state.hasDest = false;
    state.destAddress = '';
    persist();
    openConfirmStart();
    return true;
  }

  function endStreetHail() {
    if (state.phase === PHASE.RUNNING) {
      openComplete();
      return true;
    }
    state.phase = PHASE.IDLE;
    persist();
    restoreNativeChrome();
    return false;
  }

  // GPS bridges
  var prevProcess = window.processBackgroundLocation;
  window.processBackgroundLocation = function (loc) {
    try {
      if (loc && state.phase === PHASE.RUNNING) {
        onGPS(
          loc.lat != null ? loc.lat : loc.latitude,
          loc.lng != null ? loc.lng : loc.longitude,
          loc.accuracy != null ? loc.accuracy : loc.acc,
          loc.speed
        );
      }
    } catch (e) {}
    if (typeof prevProcess === 'function') return prevProcess.apply(this, arguments);
  };

  setInterval(function () {
    if (state.phase === PHASE.RUNNING && window.currentLat != null && window.currentLng != null) {
      onGPS(window.currentLat, window.currentLng, window.lastAccuracy, null);
    }
  }, 2000);

  // Không mất chuyến khi đổi tab / visibility
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && state.phase === PHASE.RUNNING) {
      showRunningUI();
      paintMeter();
    }
    if (state.phase === PHASE.RUNNING) persist();
  });
  window.addEventListener('pagehide', function () { if (isActive()) persist(); });
  window.addEventListener('beforeunload', function () { if (isActive()) persist(); });

  // Override handleTrip — luôn vào street hail
  window.handleTrip = function () {
    return startStreetHail();
  };

  window.StreetHailHandler = {
    start: startStreetHail,
    end: endStreetHail,
    onGPSUpdate: onGPS,
    isActive: isActive,
    getPhase: function () { return state.phase; },
    getTotalKm: function () { return state.totalKm; },
    getFare: function () { return state.phase === PHASE.RUNNING ? fareLive() : 0 },
    restore: function () {
      if (restore()) {
        showRunningUI();
        if (state._timer) clearInterval(state._timer);
        state._timer = setInterval(function () {
          if (state.phase !== PHASE.RUNNING) return;
          paintMeter();
          persist();
        }, 1000);
        return true;
      }
      return false;
    }
  };
  window.startStreetHail = startStreetHail;
  window.endStreetHail = endStreetHail;

  function boot() {
    ensureRoot();
    if (window.StreetHailHandler.restore()) {
      if (typeof window.showToast === 'function') {
        window.showToast('Khôi phục chuyến vẫy đang chạy');
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 300);
  }

  console.log('StreetHailHandler v4.0 — Xanh SM style + persist');
})(window, document);
