/* ProMax Integrity — anti-spoofing and package sync, no GPS watcher */
(function (window) {
  'use strict';
  if (window.PromaxIntegrity) return;

  var state = { previous: null, warnings: 0, lastExpiryCheck: 0 };
  var CFG = { MAX_TRIP_KM: 500, TELEPORT_KM: 3, TELEPORT_SECONDS: 10, MAX_SPEED_KMH: 180 };

  function driver() {
    try { if (window.driverInfo && driverInfo.uid) return driverInfo; } catch (e) {}
    try { var raw = localStorage.getItem('driverInfo'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function flag(type, value) {
    state.warnings += 1;
    var d = driver();
    if (d && d.uid && typeof db !== 'undefined') {
      try { db.ref('fraud_alerts/' + d.uid + '/' + Date.now()).set({ type: type, value: value, at: Date.now() }); } catch (e) {}
    }
    if (state.warnings === 2 && typeof window.showToast === 'function') {
      try { window.showToast('⚠️ Hệ thống ghi nhận vị trí bất thường'); } catch (e) {}
    }
  }
  function check(fix) {
    if (!fix || fix.error) return;
    if (fix.accuracy > 0 && fix.accuracy < 3) flag('mock_gps', fix.accuracy);
    if (state.previous) {
      var dt = (fix.timestamp - state.previous.timestamp) / 1000;
      var km = window.PromaxGPSCore ? PromaxGPSCore.distanceKm(state.previous, fix) : 0;
      if (dt > 0 && dt < 30) {
        var kmh = km / dt * 3600;
        if (kmh > CFG.MAX_SPEED_KMH) flag('speed', Math.round(kmh));
        if (km > CFG.TELEPORT_KM && dt < CFG.TELEPORT_SECONDS) flag('teleport', Number(km.toFixed(2)));
      }
    }
    state.previous = fix;
    try {
      if (typeof totalKm !== 'undefined' && Number(totalKm) > CFG.MAX_TRIP_KM) totalKm = CFG.MAX_TRIP_KM;
    } catch (e) {}
  }
  function syncExpiry() {
    var d = driver();
    if (!d || !d.uid || typeof db === 'undefined') return;
    var local = parseInt(localStorage.getItem('tp_expiry') || '0', 10);
    if (!local) return;
    try {
      db.ref('drivers/' + d.uid + '/tp_expiry').once('value').then(function (snap) {
        var remote = parseInt(snap.val() || '0', 10);
        if (remote && local > remote + 86400000) {
          localStorage.setItem('tp_expiry', String(remote));
          flag('expiry_tamper', local - remote);
          if (typeof window.initCountdown === 'function') window.initCountdown();
        }
      }).catch(function () {});
    } catch (e) {}
  }

  window.PromaxIntegrity = { config: CFG, check: check, syncExpiry: syncExpiry };
  function attach() {
    if (!window.PromaxGPSCore) return;
    window.PromaxGPSCore.onFix(check);
    setInterval(syncExpiry, 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
  console.log('✅ ProMax Integrity loaded — no duplicate watcher or fare writer');
})(window);
