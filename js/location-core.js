/*
 * PROMAX LOCATION CORE v2.1
 * Adapter đọc-only. Không tự mở watchPosition.
 * Tất cả GPS đều đi qua PromaxGPSCore.
 */
(function (window) {
  'use strict';

  const M = {
    version: '2.1-adapter'
  };

  let last = null;
  let speed = 0;
  let driverUnsubscribe = null;

  M.haversine = function (a, b, c, d) {
    const R = 6371;
    const x = (c - a) * Math.PI / 180;
    const y = (d - b) * Math.PI / 180;
    const s = Math.sin(x / 2) * Math.sin(x / 2) +
              Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) *
              Math.sin(y / 2) * Math.sin(y / 2);
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  };

  M.smooth = function (lat, lng, acc) {
    // Giữ API cũ, nhưng thực tế smoothing đã làm ở Core
    return { lat, lng, acc };
  };

  M.checkTeleport = function (lat, lng, ts) {
    if (!last) return false;
    const dt = (ts - last.t) / 1000;
    const d = M.haversine(last.lat, last.lng, lat, lng);
    return (dt < 5 && d > 2) || (dt > 0 && d / dt * 3600 > 180);
  };

  M.setLast = function (lat, lng, ts) {
    last = { lat, lng, t: ts };
  };

  M.getLast = function () {
    return last;
  };

  M.ensurePermission = function () {
    return new Promise(function (resolve) {
      if (!navigator.geolocation) return resolve(false);
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  };

  function fromCore(fix, opts) {
    if (!fix || !opts || typeof opts.onFix !== 'function') return;

    const lat = Number(fix.lat != null ? fix.lat : (fix.coords && fix.coords.latitude));
    const lng = Number(fix.lng != null ? fix.lng : (fix.coords && fix.coords.longitude));
    const acc = Number(fix.accuracy != null ? fix.accuracy : (fix.acc != null ? fix.acc : (fix.coords && fix.coords.accuracy))) || 999;
    const ts = Number(fix.timestamp || fix.ts || Date.now());

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || M.checkTeleport(lat, lng, ts)) return;

    const s = M.smooth(lat, lng, acc);
    M.setLast(s.lat, s.lng, ts);
    speed = Number(fix.speedKmh != null ? fix.speedKmh : fix.speed) || 0;

    opts.onFix({
      lat: s.lat,
      lng: s.lng,
      acc: s.acc,
      accuracy: s.acc,
      speed: speed,
      ts: ts,
      timestamp: ts,
      heading: Number(fix.heading) || 0,
      source: fix.source || 'core'
    });
  }

  M.startDriver = function (opts) {
    opts = opts || {};
    M.stopDriver();

    const core = window.PromaxGPSCore;
    if (core && typeof core.onFix === 'function') {
      driverUnsubscribe = core.onFix(function (fix) {
        fromCore(fix, opts);
      });
      return true;
    }

    // Fallback legacy
    const runtime = window.PromaxLegacyRuntime;
    if (runtime && typeof runtime.getPosition === 'function') {
      const tick = window.setInterval(function () {
        fromCore(runtime.getPosition(), opts);
      }, 1000);
      driverUnsubscribe = function () { window.clearInterval(tick); };
      return true;
    }
    return false;
  };

  M.stopDriver = function () {
    if (typeof driverUnsubscribe === 'function') {
      try { driverUnsubscribe(); } catch (e) {}
    }
    driverUnsubscribe = null;
  };

  M.watchDriver = function (db, uid, cb) {
    if (!db || !uid) return function () {};
    const ref = db.ref('tai_xe_online/' + uid);
    const fn = function (s) {
      const v = s.val();
      if (v && v.lat && typeof cb === 'function') {
        cb({ lat: v.lat, lng: v.lng, name: v.name, ts: v.timestamp });
      }
    };
    ref.on('value', fn);
    return function () { ref.off('value', fn); };
  };

  M.distanceTo = function (lat, lng) {
    return last ? Math.round(M.haversine(last.lat, last.lng, lat, lng) * 10) / 10 : null;
  };

  M.moGoogleMaps = function (lat, lng) {
    window.open('https://www.google.com/maps/dir/?api=1&destination=' +
      encodeURIComponent(lat + ',' + lng) + '&travelmode=driving', '_blank');
  };

  M.onFix = function (fn) {
    const core = window.PromaxGPSCore;
    return core && typeof core.onFix === 'function' ? core.onFix(fn) : function () {};
  };

  // Expose
  window.ProMaxLocation = M;
  window.ProMaxLocationCore = M;

  console.log('🛰️ ProMaxLocation Core v2.1 ready — read-only adapter, single GPS owner');
})(window);
