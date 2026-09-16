/*
 * PROMAX GPS CORE v3.1 - Hybrid GPS + Network
 * Single owner duy nhất của toàn bộ định vị.
 * Ưu tiên GPS vệ tinh, tự chuyển sang sóng mạng (cell/WiFi) khi GPS yếu.
 * Tương thích location-core.js và các module khác.
 */
(function (window) {
  'use strict';

  const VERSION = '3.1-hybrid';
  const MAX_ACCURACY_ACCEPT = 180;       // chỉ chấp nhận fix tốt hơn mức này để cộng km
  const GPS_WEAK_THRESHOLD = 100;        // > 100m coi là GPS yếu → thử network
  const TELEPORT_MAX_SPEED = 160;        // km/h
  const TELEPORT_MIN_TIME = 4;           // giây

  let watchId = null;
  let lastFix = null;
  let buffer = [];
  let listeners = [];
  let isRunning = false;
  let currentMode = 'gps'; // 'gps' | 'network' | 'hybrid'

  // ========== Utility ==========
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function smooth(lat, lng, acc) {
    buffer.push({ lat, lng, acc });
    if (buffer.length > 6) buffer.shift();
    if (buffer.length < 3) return { lat, lng, acc };

    let totalWeight = 0, sumLat = 0, sumLng = 0;
    buffer.forEach(p => {
      const w = 1 / Math.max(p.acc, 5);
      sumLat += p.lat * w;
      sumLng += p.lng * w;
      totalWeight += w;
    });
    return {
      lat: sumLat / totalWeight,
      lng: sumLng / totalWeight,
      acc
    };
  }

  function isTeleport(lat, lng, ts) {
    if (!lastFix) return false;
    const dt = (ts - lastFix.ts) / 1000;
    if (dt < 1) return false;
    const dist = haversine(lastFix.lat, lastFix.lng, lat, lng);
    const speed = (dist / dt) * 3600;
    return (dt < TELEPORT_MIN_TIME && dist > 1.8) || speed > TELEPORT_MAX_SPEED;
  }

  // ========== Core logic ==========
  function emit(fix) {
    listeners.forEach(fn => {
      try { fn(fix); } catch (e) { console.warn('PromaxGPSCore listener error', e); }
    });
  }

  function processRaw(position, source) {
    if (!position || !position.coords) return;

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const acc = position.coords.accuracy || 999;
    const speed = (position.coords.speed || 0) * 3.6; // m/s → km/h
    const heading = position.coords.heading || 0;
    const ts = position.timestamp || Date.now();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (isTeleport(lat, lng, ts)) {
      console.warn('🚫 Teleport blocked', { lat, lng, acc, source });
      return;
    }

    const smoothed = smooth(lat, lng, acc);

    const fix = {
      lat: smoothed.lat,
      lng: smoothed.lng,
      accuracy: smoothed.acc,
      acc: smoothed.acc,
      speed: speed,
      speedKmh: speed,
      heading: heading,
      timestamp: ts,
      ts: ts,
      source: source || currentMode,
      raw: position
    };

    lastFix = fix;
    emit(fix);

    // Cập nhật status bar nếu có
    updateStatusUI(fix);
  }

  function updateStatusUI(fix) {
    const el = document.getElementById('gpsStatusText');
    const dot = document.getElementById('gpsDot');
    if (!el) return;

    let text = '';
    let color = '#22c55e';

    if (fix.accuracy <= 40) {
      text = `GPS tốt (±${Math.round(fix.accuracy)}m)`;
      color = '#22c55e';
    } else if (fix.accuracy <= GPS_WEAK_THRESHOLD) {
      text = `GPS trung bình (±${Math.round(fix.accuracy)}m)`;
      color = '#eab308';
    } else {
      text = `GPS yếu – dùng sóng mạng (±${Math.round(fix.accuracy)}m)`;
      color = '#ef4444';
    }

    el.textContent = text;
    if (dot) dot.style.background = color;
  }

  // ========== Public API ==========
  const Core = {
    version: VERSION,

    start() {
      if (isRunning) return;
      if (!navigator.geolocation) {
        console.error('Geolocation not supported');
        return;
      }

      isRunning = true;
      currentMode = 'hybrid';

      // Ưu tiên GPS trước
      const highOptions = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      };

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (pos.coords.accuracy > GPS_WEAK_THRESHOLD) {
            // GPS yếu → lấy thêm network ngay
            navigator.geolocation.getCurrentPosition(
              (netPos) => {
                const best = (netPos.coords.accuracy < pos.coords.accuracy) ? netPos : pos;
                processRaw(best, best === netPos ? 'network' : 'gps');
              },
              () => processRaw(pos, 'gps'),
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 15000 }
            );
          } else {
            processRaw(pos, 'gps');
          }
        },
        (err) => {
          console.warn('GPS error', err);
          // Fallback network khi GPS hoàn toàn fail
          navigator.geolocation.getCurrentPosition(
            (pos) => processRaw(pos, 'network'),
            () => {},
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
          );
        },
        highOptions
      );

      console.log('🛰️ PromaxGPSCore v3.1 started (Hybrid)');
    },

    stop() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      isRunning = false;
      buffer = [];
      console.log('🛰️ PromaxGPSCore stopped');
    },

    onFix(callback) {
      if (typeof callback !== 'function') return () => {};
      listeners.push(callback);
      // Gửi lastFix ngay nếu có
      if (lastFix) {
        setTimeout(() => callback(lastFix), 0);
      }
      return () => {
        listeners = listeners.filter(fn => fn !== callback);
      };
    },

    getLastFix() {
      return lastFix;
    },

    forceRefresh() {
      this.stop();
      setTimeout(() => this.start(), 300);
    },

    // Cho background geolocation gọi vào
    processBackgroundLocation(pos) {
      processRaw(pos, 'background');
    }
  };

  // Expose
  window.PromaxGPSCore = Core;

  // Tự start khi DOM sẵn sàng (có thể comment nếu muốn control từ bên ngoài)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Core.start());
  } else {
    Core.start();
  }

  console.log(`🛰️ PromaxGPSCore ${VERSION} loaded`);
})(window);
