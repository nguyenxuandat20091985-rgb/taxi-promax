/* ProMax Cockpit UI — presentation only; no GPS watcher and no fare writer */
(function (window, document) {
  'use strict';
  if (window.PromaxCockpitUI) return;

  var state = { tripStartedAt: 0, eta: null, etaRequest: null, lastRunning: false };
  var CFG = { BASE_RATE: 15000, SURGE_AM: 1.2, SURGE_PM: 1.25, SURGE_WEEKEND: 1.15, CAP: 1.5 };

  function isRunning() { try { return typeof window.isRunning !== 'undefined' && window.isRunning === true; } catch (e) { return false; } }
  function isPicked() { try { return typeof window.hasPickedUp !== 'undefined' && window.hasPickedUp === true; } catch (e) { return false; } }
  function num(v, fallback) { var n = Number(v); return Number.isFinite(n) ? n : fallback; }

  function surgeMultiplier() {
    var d = new Date(), h = d.getHours(), m = 1;
    if (h >= 7 && h <= 9) m *= CFG.SURGE_AM;
    if (h >= 17 && h <= 19) m *= CFG.SURGE_PM;
    if (d.getDay() === 0 || d.getDay() === 6) m *= CFG.SURGE_WEEKEND;
    try { if (window.currentWeather && window.currentWeather.rain) m *= 1.3; } catch (e) {}
    return Math.min(CFG.CAP, m);
  }

  function calculatedRate() {
    var r = CFG.BASE_RATE;
    try { r = num(window.currentRate, CFG.BASE_RATE); } catch (e) {}
    return Math.round(r * surgeMultiplier());
  }

  function addStats() {
    var bar = document.getElementById('statsUI');
    if (!bar || bar.dataset.promaxStats) return;
    bar.dataset.promaxStats = '1';
    bar.insertAdjacentHTML('beforeend', '<div class="stat-item"><div class="stat-label">THỜI GIAN</div><div class="stat-value" id="t2val">0:00</div></div><div class="stat-item"><div class="stat-label">TỐC ĐỘ</div><div class="stat-value" id="speedVal">0</div></div>');
  }

  function addTripHandle() {
    var panel = document.getElementById('tripInfoPanel');
    if (!panel || panel.dataset.promaxHandle) return;
    panel.dataset.promaxHandle = '1';
    var h = document.createElement('button');
    h.className = 'cp-handle';
    h.type = 'button';
    h.textContent = '▲ Mở rộng';
    h.onclick = function () {
      panel.classList.toggle('compact');
      h.textContent = panel.classList.contains('compact') ? '▲ Mở rộng' : '▼ Thu gọn';
      try { if (window.map) map.invalidateSize(); } catch (e) {}
    };
    panel.insertBefore(h, panel.firstChild);
  }

  function addHomeHandle() {
    var footer = document.querySelector('.footer-panel');
    if (!footer || footer.dataset.promaxHandle) return;
    footer.dataset.promaxHandle = '1';
    var h = document.createElement('button');
    h.className = 'hp-handle';
    h.type = 'button';
    h.textContent = '▼ Bản đồ to hơn';
    h.onclick = function () {
      footer.classList.toggle('deck-compact');
      h.textContent = footer.classList.contains('deck-compact') ? '▲ Hiện đủ controls' : '▼ Bản đồ to hơn';
      try { if (window.map) map.invalidateSize(); } catch (e) {}
    };
    footer.insertBefore(h, footer.firstChild);
    if (window.innerHeight < 700) {
      footer.classList.add('deck-compact');
      h.textContent = '▲ Hiện đủ controls';
    }
  }

  function updateSurgeBadge() {
    var rate = document.getElementById('rateLabel');
    if (!rate) return;
    var badge = document.getElementById('surgeBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'surgeBadge';
      badge.className = 'surge-badge';
      rate.insertAdjacentElement('afterend', badge);
    }
    var m = surgeMultiplier();
    badge.textContent = 'x' + m.toFixed(2);
    badge.style.display = m > 1.05 ? 'inline-block' : 'none';
  }

  function calcETA(toLat, toLng, mode) {
    var lat, lng;
    try { lat = Number(currentLat); lng = Number(currentLng); } catch (e) { return; }
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !toLat || !toLng) return;
    if (state.etaRequest && state.etaRequest.abort) state.etaRequest.abort();
    state.etaRequest = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var signal = state.etaRequest ? { signal: state.etaRequest.signal } : {};
    var url = 'https://router.project-osrm.org/route/v1/driving/' + lng + ',' + lat + ';' + toLng + ',' + toLat + '?overview=false';
    fetch(url, signal).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.routes || !d.routes[0]) return;
      var sec = Number(d.routes[0].duration) || 0;
      state.eta = { min: Math.ceil(sec / 60), km: (Number(d.routes[0].distance) / 1000).toFixed(1), mode: mode };
    }).catch(function () {});
  }

  function updateETADisplay() {
    var pill = document.getElementById('etaPill');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'etaPill';
      pill.className = 'eta-pill';
      document.body.appendChild(pill);
    }
    if (state.eta && isRunning()) {
      pill.style.display = 'block';
      pill.textContent = isPicked() ? '🏁 Đến nơi: ' + state.eta.min + ' phút' : '🕐 Tới khách: ' + state.eta.min + ' phút · ' + state.eta.km + ' km';
    } else {
      pill.style.display = 'none';
    }
  }

  function tick() {
    addStats();
    addTripHandle();
    addHomeHandle();
    updateSurgeBadge();
    updateETADisplay();
    var running = isRunning();
    if (running && !state.lastRunning) state.tripStartedAt = Date.now();
    if (!running) state.tripStartedAt = 0;
    state.lastRunning = running;
    if (!running) return;
    var elapsed = Math.floor((Date.now() - state.tripStartedAt) / 1000);
    var t = document.getElementById('t2val');
    if (t) t.textContent = Math.floor(elapsed / 60) + ':' + (elapsed % 60 < 10 ? '0' : '') + (elapsed % 60);
    var speed = document.getElementById('speedVal');
    if (speed) {
      try { speed.textContent = window.PromaxGPSCore && PromaxGPSCore.getState().lastFix ? Math.round(PromaxGPSCore.getState().lastFix.speedKmh || 0) : '0'; } catch (e) { speed.textContent = '0'; }
    }
    try {
      var data = window.currentCustomerData;
      if (isPicked() && data && data.dropoffLat && (!window._promaxEtaAt || Date.now() - window._promaxEtaAt > 30000)) {
        calcETA(data.dropoffLat, data.dropoffLng, 'drop');
        window._promaxEtaAt = Date.now();
      }
    } catch (e) {}
  }

  var css = document.createElement('style');
  css.textContent = '#statsUI{background:#16213e!important;border:none!important;box-shadow:0 6px 18px rgba(0,0,0,.35)!important;}#statsUI .stat-label{color:#8fa3bf!important;font-size:8px!important;}#statsUI .stat-value{color:#fff!important;font-size:18px!important;}.hp-handle,.cp-handle{width:100%;border:none;background:transparent;cursor:pointer;text-align:center;font-size:11px;font-weight:800;color:#94a3b8;padding:0 0 6px;}.footer-panel.deck-compact .hp-rate-row,.footer-panel.deck-compact input[type=range],.footer-panel.deck-compact .brand-footer{display:none!important;}.footer-panel.deck-compact{padding-top:6px!important;}.eta-pill{position:fixed;top:55px;right:10px;background:rgba(0,95,163,.95);color:#fff;padding:6px 12px;border-radius:20px;font-size:11px;font-weight:800;z-index:1002;display:none;}.surge-badge{display:inline-block;background:#fbbf24;color:#78350f;padding:1px 6px;border-radius:8px;font-size:9px;font-weight:900;margin-left:4px;}@media (max-height:640px){.btn-main{padding:12px!important;font-size:16px!important;}.nav-item i{font-size:18px!important;}}@media (min-width:480px){.footer-panel{max-width:560px;left:50%;transform:translateX(-50%);border-radius:25px 25px 0 0;}}';
  document.head.appendChild(css);

  window.PromaxCockpitUI = {
    surgeMultiplier: surgeMultiplier,
    currentRate: calculatedRate,
    calcETA: calcETA,
    tick: tick
  };
  window.calcETA = calcETA;
  window.currentFareRate = calculatedRate;
  window.updateSurgeBadge = updateSurgeBadge;
  window.updateETADisplay = updateETADisplay;
  setInterval(tick, 500);
  console.log('✅ ProMax Cockpit UI loaded — presentation only');
})(window, document);
