/* ProMax GPS Core — one producer, one distance pipeline */
(function (window, document) {
  'use strict';
  if (window.PromaxGPSCore) return;

  var CFG = {
    MAX_ACCURACY_M: 300,
    MIN_STEP_M: 8,
    MAX_STEP_KM: 0.8,
    MAX_SPEED_KMH: 180,
    GAP_MS: 15000,
    INITIAL_TIMEOUT: 10000,
    WATCH_TIMEOUT: 20000,
    MAXIMUM_AGE: 3000
  };
  var state = {
    watchId: null,
    lastFix: null,
    lastGoodFix: null,
    lastError: null,
    firstFixAt: 0,
    tripStartedAt: 0,
    distanceKm: 0,
    unsubscribers: []
  };
  var listeners = [];

  function n(v, fallback) {
    var x = Number(v);
    return Number.isFinite(x) ? x : fallback;
  }

  function running() {
    try { return typeof isRunning !== 'undefined' && isRunning === true; } catch (e) { return false; }
  }

  function normalize(input) {
    if (!input) return null;
    var c = input.coords || input;
    var lat = n(c.latitude, NaN), lng = n(c.longitude, NaN);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      lat: lat,
      lng: lng,
      accuracy: Math.max(0, n(c.accuracy, 999)),
      speed: n(c.speed, null),
      heading: n(c.heading, null),
      timestamp: n(input.timestamp, Date.now())
    };
  }

  function distance(a, b) {
    var R = 6371;
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLng = (b.lng - a.lng) * Math.PI / 180;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function emit(payload) {
    listeners.slice().forEach(function (fn) {
      try { fn(payload); } catch (e) { console.warn('[GPS] listener error', e); }
    });
  }

  function setStatus(fix) {
    try {
      if (typeof updateGpsStatusUI === 'function') updateGpsStatusUI(fix.accuracy, false);
      if (typeof updateDriverMarker === 'function') updateDriverMarker(fix.lat, fix.lng, true);
      var profile = document.getElementById('profileAccuracy');
      if (profile) profile.textContent = '±' + Math.round(fix.accuracy) + 'm';
    } catch (e) {}
  }

  function updateDisplays() {
    var km = 0;
    try { km = Math.max(0, Number(totalKm) || 0); } catch (e) {}
    var rate = 15000;
    try { rate = Number(currentRate) || 15000; } catch (e) {}
    var fare = window.PromaxFare ? window.PromaxFare.calculate(km, rate) : Math.max(20000, Math.round(km * rate));
    try {
      if (typeof window.updateAllDisplays === 'function') window.updateAllDisplays(km, fare);
    } catch (e) {}
    return fare;
  }

  function addDistance(km) {
    if (!running() || !Number.isFinite(km) || km <= 0) return;
    try {
      totalKm = Math.min(500, Math.max(0, (Number(totalKm) || 0) + km));
      state.distanceKm = totalKm;
      updateDisplays();
    } catch (e) {}
  }

  function roadDistance(a, b) {
    if (!a || !b || typeof fetch !== 'function') return Promise.resolve(null);
    var url = 'https://router.project-osrm.org/route/v1/driving/' + a.lng + ',' + a.lat + ';' + b.lng + ',' + b.lat + '?overview=false';
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      return d.routes && d.routes[0] ? Number(d.routes[0].distance) / 1000 : null;
    }).catch(function () { return null; });
  }

  function process(input) {
    var fix = normalize(input);
    if (!fix) return null;
    var previous = state.lastFix;
    var dt = previous ? Math.max(0.001, (fix.timestamp - previous.timestamp) / 1000) : 0;
    var stepKm = previous ? distance(previous, fix) : 0;
    var speedKmh = fix.speed != null && fix.speed >= 0 ? fix.speed * 3.6 : (dt > 0 ? stepKm / dt * 3600 : 0);
    fix.stepKm = stepKm;
    fix.speedKmh = speedKmh;
    fix.accepted = fix.accuracy <= CFG.MAX_ACCURACY_M && stepKm <= CFG.MAX_STEP_KM && (dt <= 0 || speedKmh <= CFG.MAX_SPEED_KMH);
    state.lastFix = fix;
    state.lastError = null;
    if (!state.firstFixAt) state.firstFixAt = Date.now();

    try {
      currentLat = fix.lat;
      currentLng = fix.lng;
      if (fix.heading != null && fix.heading >= 0) currentHeading = Math.round(fix.heading);
      if (typeof saveLocationToHistory === 'function') saveLocationToHistory(fix.lat, fix.lng, fix.accuracy, fix.timestamp);
      setStatus(fix);
    } catch (e) {}

    if (!fix.accepted) {
      emit(fix);
      return fix;
    }

    if (running() && state.lastGoodFix) {
      if (dt >= CFG.GAP_MS) {
        var gapFrom = state.lastGoodFix;
        roadDistance(gapFrom, fix).then(function (roadKm) {
          if (roadKm != null && roadKm > 0 && roadKm <= 12) addDistance(roadKm);
        });
      } else if (stepKm * 1000 >= CFG.MIN_STEP_M && stepKm < CFG.MAX_STEP_KM) {
        addDistance(stepKm);
      }
    }
    state.lastGoodFix = fix;
    if (typeof syncDriverLocation === 'function') {
      try { syncDriverLocation(); } catch (e) {}
    }
    emit(fix);
    return fix;
  }

  function error(error) {
    state.lastError = error || { code: 0, message: 'GPS error' };
    var code = state.lastError.code;
    var msg = code === 1 ? 'GPS: Bị từ chối quyền' : code === 2 ? 'GPS: Không có tín hiệu' : code === 3 ? 'GPS: Timeout – đang thử lại' : 'GPS: Lỗi';
    try { if (typeof updateGpsStatusUI === 'function') updateGpsStatusUI(0, true, msg); } catch (e) {}
    if (code === 1) {
      try { if (typeof showToast === 'function') showToast('⚠️ Hãy cấp quyền Vị trí và bật Vị trí chính xác'); } catch (e) {}
    }
    emit({ error: state.lastError });
  }

  function stop() {
    if (state.watchId != null && navigator.geolocation) {
      try { navigator.geolocation.clearWatch(state.watchId); } catch (e) {}
    }
    state.watchId = null;
    try { gpsWatchId = null; } catch (e) {}
  }

  function start() {
    if (!navigator.geolocation) { error({ code: 0, message: 'Geolocation unsupported' }); return null; }
    stop();
    state.lastError = null;
    try { if (typeof updateGpsStatusUI === 'function') updateGpsStatusUI(0, true, 'GPS: Đang xin quyền...'); } catch (e) {}
    navigator.geolocation.getCurrentPosition(process, error, {
      enableHighAccuracy: true,
      timeout: CFG.INITIAL_TIMEOUT,
      maximumAge: 60000
    });
    state.watchId = navigator.geolocation.watchPosition(process, error, {
      enableHighAccuracy: true,
      timeout: CFG.WATCH_TIMEOUT,
      maximumAge: CFG.MAXIMUM_AGE
    });
    try { gpsWatchId = state.watchId; } catch (e) {}
    return state.watchId;
  }

  function resetTrip() {
    state.lastGoodFix = null;
    state.distanceKm = 0;
    state.tripStartedAt = Date.now();
  }

  function getState() {
    return { watchId: state.watchId, lastFix: state.lastFix, lastGoodFix: state.lastGoodFix, lastError: state.lastError, config: CFG };
  }

  var api = {
    config: CFG,
    start: start,
    stop: stop,
    process: process,
    observe: process,
    observeError: error,
    resetTrip: resetTrip,
    onFix: function (fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
    },
    distanceKm: distance,
    getState: getState
  };
  window.PromaxGPSCore = api;
  window.PromaxGPS = api;

  /* Native BackgroundGeolocation also enters through this public function. */
  window.processBackgroundLocation = function (location) {
    return process(location);
  };

  window.startGPS = start;
  window.stopGPS = stop;
  window.forceRefreshGPS = function () {
    resetTrip();
    try { if (typeof showToast === 'function') showToast('📡 Đang làm mới GPS...'); } catch (e) {}
    return start();
  };

  var oldHandle = window.handleTrip;
  if (typeof oldHandle === 'function') {
    window.handleTrip = function () {
      var wasRunning = running();
      if (!wasRunning) resetTrip();
      return oldHandle.apply(this, arguments);
    };
  }

  console.log('✅ ProMax GPS Core — one browser watcher, one distance processor');
})(window, document);
