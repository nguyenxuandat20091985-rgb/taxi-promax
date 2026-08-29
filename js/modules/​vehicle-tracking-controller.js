/*
 * Taxi ProMax — VehicleTrackingController v1
 *
 * GPS core vẫn là owner của watchPosition, Kalman, anti-teleport,
 * compensation và fare. Controller này chỉ nhận accepted position từ core
 * để đồng bộ marker xe, camera follow và trạng thái hiển thị.
 */
;(function (window, document) {
  'use strict';

  const GPS_STATUS = Object.freeze({
    INIT: 'INIT', SEARCHING: 'SEARCHING', READY: 'READY', MOVING: 'MOVING',
    GPS_LOST: 'GPS_LOST', RECOVERING: 'RECOVERING', ERROR: 'ERROR'
  });
  const LOST_AFTER_MS = 12000;
  const FOLLOW_THROTTLE_MS = 650;
  const DEFAULT_ZOOM = 17;

  const state = {
    vehicleGPS: {
      lat: null, lng: null, rawLat: null, rawLng: null, accuracy: null,
      speed: 0, heading: null, timestamp: null, lastValidAt: null,
      status: GPS_STATUS.INIT, isMoving: false, isFollowing: true,
      hasFix: false, gpsLost: false, watchId: null
    },
    lastCameraAt: 0,
    lastAccepted: null,
    userMovedMap: false,
    followButton: null,
    debugPanel: null,
    timer: null,
    bound: false
  };

  function finite(value) {
    return Number.isFinite(Number(value));
  }

  function normalizeFix(input) {
    if (!input) return null;
    const coords = input.coords || input;
    const lat = Number(input.lat != null ? input.lat : coords.latitude);
    const lng = Number(input.lng != null ? input.lng : coords.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const accuracy = Number(input.accuracy != null ? input.accuracy : (coords.accuracy || 999));
    const speedMps = Number(input.speed != null ? input.speed : coords.speed || 0);
    const speedKmh = Number(input.speedKmh != null ? input.speedKmh : speedMps * 3.6);
    return {
      lat, lng,
      rawLat: Number(input.rawLat != null ? input.rawLat : lat),
      rawLng: Number(input.rawLng != null ? input.rawLng : lng),
      accuracy: Number.isFinite(accuracy) ? accuracy : 999,
      speed: Number.isFinite(speedKmh) ? Math.max(0, speedKmh) : 0,
      heading: finite(input.heading != null ? input.heading : coords.heading)
        ? Number(input.heading != null ? input.heading : coords.heading) : null,
      timestamp: Number(input.timestamp || input.ts || Date.now())
    };
  }

  function map() {
    if (window.PromaxMap && typeof window.PromaxMap.ensure === 'function') {
      return window.PromaxMap.ensure();
    }
    return window.map || null;
  }

  function setStatus(status, message) {
    state.vehicleGPS.status = status;
    state.vehicleGPS.gpsLost = status === GPS_STATUS.GPS_LOST || status === GPS_STATUS.ERROR;
    const text = document.getElementById('gpsStatusText');
    const bar = document.getElementById('gpsStatusBar');
    if (text && message) text.textContent = message;
    if (bar) {
      bar.dataset.gpsState = status;
      bar.classList.toggle('gps-lost', state.vehicleGPS.gpsLost);
    }
    updateFollowButton();
    renderDebug();
    document.dispatchEvent(new CustomEvent('vehicle:gps-state', {
      detail: { ...state.vehicleGPS }
    }));
  }

  function updateFollowButton() {
    const button = state.followButton;
    if (!button) return;
    button.textContent = state.vehicleGPS.isFollowing ? '📍 ĐANG THEO XE' : '📍 THEO XE';
    button.dataset.following = state.vehicleGPS.isFollowing ? 'true' : 'false';
    button.setAttribute('aria-pressed', String(state.vehicleGPS.isFollowing));
    button.title = state.vehicleGPS.isFollowing ? 'Đang theo vị trí xe' : 'Bấm để theo xe';
  }

  function ensureFollowButton() {
    const container = document.getElementById('map');
    if (!container || document.getElementById('vehicleFollowButton')) return;
    const button = document.createElement('button');
    button.id = 'vehicleFollowButton';
    button.type = 'button';
    button.className = 'vehicle-follow-button';
    button.addEventListener('click', function () {
      state.vehicleGPS.isFollowing = true;
      state.userMovedMap = false;
      updateFollowButton();
      const fix = state.lastAccepted;
      const currentMap = map();
      if (fix && currentMap) {
        currentMap.panTo([fix.lat, fix.lng], { animate: true, duration: 0.5 });
      }
      setStatus(state.vehicleGPS.status, state.vehicleGPS.status === GPS_STATUS.GPS_LOST
        ? '🔴 GPS MẤT TÍN HIỆU — ĐANG GIỮ DỮ LIỆU' : null);
    });
    container.appendChild(button);
    state.followButton = button;
    updateFollowButton();
  }

  function handleMapDrag() {
    state.userMovedMap = true;
    state.vehicleGPS.isFollowing = false;
    updateFollowButton();
    renderDebug();
  }

  function bindMapGestures() {
    const currentMap = map();
    if (!currentMap || state.bound || typeof currentMap.on !== 'function') return;
    state.bound = true;
    currentMap.on('dragstart', handleMapDrag);
  }

  function updateCamera(fix) {
    const currentMap = map();
    if (!currentMap || !state.vehicleGPS.isFollowing || state.userMovedMap) return;
    const now = Date.now();
    if (now - state.lastCameraAt < FOLLOW_THROTTLE_MS) return;
    state.lastCameraAt = now;
    try {
      const options = {
        animate: true,
        duration: fix.speed > 80 ? 0.35 : fix.speed < 5 ? 0.8 : 0.55
      };
      currentMap.panTo([fix.lat, fix.lng], options);
    } catch (_) {}
  }

  function updateMarker(fix) {
    const owner = window.PromaxMap;
    if (!owner || typeof owner.setVehicleMarker !== 'function') return false;
    return owner.setVehicleMarker(fix.lat, fix.lng, fix.heading, {
      animate: true,
      follow: state.vehicleGPS.isFollowing
    });
  }

  function renderDebug() {
    const panel = state.debugPanel || document.getElementById('gpsDebugPanel');
    if (!panel || !panel.classList.contains('show')) return;
    const g = state.vehicleGPS;
    const set = (id, value) => {
      const el = panel.querySelector(`[data-gps-debug="${id}"]`);
      if (el) el.textContent = value;
    };
    set('status', g.status);
    set('lat', g.lat == null ? '—' : g.lat.toFixed(6));
    set('lng', g.lng == null ? '—' : g.lng.toFixed(6));
    set('accuracy', g.accuracy == null ? '—' : `${Math.round(g.accuracy)}m`);
    set('speed', `${g.speed.toFixed(1)} km/h`);
    set('heading', g.heading == null ? '—' : `${Math.round(g.heading)}°`);
    set('follow', g.isFollowing ? 'ON' : 'OFF');
    set('marker', g.hasFix ? 'SYNC' : 'WAITING');
    set('map', g.isFollowing ? 'FOLLOWING' : 'FREE');
    set('trip', document.documentElement.getAttribute('data-trip-state') || 'IDLE');
    const age = g.lastValidAt ? Math.max(0, (Date.now() - g.lastValidAt) / 1000).toFixed(1) : '—';
    set('last', `${age}s ago`);
  }

  function ensureDebugPanel() {
    if (document.getElementById('gpsDebugPanel')) {
      state.debugPanel = document.getElementById('gpsDebugPanel');
      return;
    }
    const panel = document.createElement('section');
    panel.id = 'gpsDebugPanel';
    panel.className = 'gps-debug-panel';
    panel.setAttribute('aria-label', 'GPS debug');
    panel.innerHTML = '<button type="button" class="gps-debug-close">×</button>' +
      '<strong>GPS DEBUG</strong><div>GPS: <b data-gps-debug="status">INIT</b></div>' +
      '<div>LAT: <b data-gps-debug="lat">—</b></div><div>LNG: <b data-gps-debug="lng">—</b></div>' +
      '<div>Accuracy: <b data-gps-debug="accuracy">—</b></div><div>Speed: <b data-gps-debug="speed">—</b></div>' +
      '<div>Heading: <b data-gps-debug="heading">—</b></div><div>Last GPS: <b data-gps-debug="last">—</b></div>' +
      '<div>Follow: <b data-gps-debug="follow">ON</b></div><div>Marker: <b data-gps-debug="marker">WAITING</b></div>' +
      '<div>Map: <b data-gps-debug="map">FOLLOWING</b></div><div>Trip: <b data-gps-debug="trip">IDLE</b></div>';
    panel.querySelector('.gps-debug-close').addEventListener('click', function () { panel.classList.remove('show'); });
    document.body.appendChild(panel);
    state.debugPanel = panel;
  }

  function acceptPosition(input) {
    const fix = normalizeFix(input);
    if (!fix) return false;
    const wasLost = state.vehicleGPS.gpsLost;
    state.lastAccepted = fix;
    state.vehicleGPS = {
      ...state.vehicleGPS,
      ...fix,
      timestamp: fix.timestamp,
      lastValidAt: Date.now(),
      hasFix: true,
      gpsLost: false,
      isMoving: fix.speed >= 5,
      status: wasLost ? GPS_STATUS.RECOVERING : (fix.speed >= 5 ? GPS_STATUS.MOVING : GPS_STATUS.READY)
    };
    updateMarker(fix);
    updateCamera(fix);
    if (wasLost) {
      setStatus(GPS_STATUS.RECOVERING, '🟡 GPS ĐANG KHÔI PHỤC...');
      window.setTimeout(function () {
        if (!state.vehicleGPS.gpsLost) setStatus(state.vehicleGPS.isMoving ? GPS_STATUS.MOVING : GPS_STATUS.READY, null);
      }, 700);
    } else {
      setStatus(state.vehicleGPS.status, null);
    }
    renderDebug();
    return true;
  }

  function handleGpsError(error) {
    const code = error && error.code;
    const message = code === 1 ? '🔴 GPS BỊ TỪ CHỐI QUYỀN' : '🔴 GPS MẤT TÍN HIỆU — ĐANG GIỮ DỮ LIỆU';
    setStatus(code === 1 ? GPS_STATUS.ERROR : GPS_STATUS.GPS_LOST, message);
  }

  function checkLost() {
    if (!state.vehicleGPS.hasFix) return;
    if (Date.now() - state.vehicleGPS.lastValidAt > LOST_AFTER_MS && !state.vehicleGPS.gpsLost) {
      handleGpsError({ code: 2 });
    }
    renderDebug();
  }

  function toggleDebug() {
    ensureDebugPanel();
    state.debugPanel.classList.toggle('show');
    renderDebug();
  }

  function init() {
    ensureFollowButton();
    ensureDebugPanel();
    bindMapGestures();
    setStatus(GPS_STATUS.SEARCHING, '📡 ĐANG TÌM GPS...');
    state.timer = window.setInterval(checkLost, 3000);
    window.VehicleTrackingController = api;
    document.dispatchEvent(new CustomEvent('vehicle:tracking-ready'));
  }

  const api = {
    GPS_STATUS,
    state,
    getState: function () { return { ...state.vehicleGPS }; },
    onCoreAcceptedPosition: acceptPosition,
    handleGpsError,
    handleMapDrag,
    toggleFollow: function (enabled) {
      state.vehicleGPS.isFollowing = enabled == null ? !state.vehicleGPS.isFollowing : Boolean(enabled);
      if (state.vehicleGPS.isFollowing) state.userMovedMap = false;
      updateFollowButton();
      const fix = state.lastAccepted;
      const currentMap = map();
      if (fix && currentMap && state.vehicleGPS.isFollowing) currentMap.panTo([fix.lat, fix.lng], { animate: true, duration: 0.5 });
      renderDebug();
    },
    toggleDebug,
    destroy: function () { if (state.timer) window.clearInterval(state.timer); }
  };

  window.VehicleTrackingController = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(window, document);

// Expose a safe debug hook without enabling debug UI in production.
window.DEBUG_GPS = Boolean(window.DEBUG_GPS);
if (window.DEBUG_GPS && window.VehicleTrackingController) window.VehicleTrackingController.toggleDebug();
