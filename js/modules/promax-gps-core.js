/*
 * PROMAX GPS CORE v3.3
 * - Xin quyền vị trí chuẩn (hỗ trợ Android "Cho phép mọi lúc")
 * - Hiện vị trí cũ ngay lập tức
 * - Hybrid mạnh: Cache → Network → GPS
 * - Xử lý rõ ràng trạng thái "Đang xin quyền..."
 */
(function (window) {
  'use strict';

  const VERSION = '3.3-permission';
  const CACHE_KEY = 'promax_last_gps_fix';
  const GPS_WEAK_THRESHOLD = 100;
  const TELEPORT_MAX_SPEED = 160;
  const TELEPORT_MIN_TIME = 4;

  let watchId = null;
  let lastFix = null;
  let buffer = [];
  let listeners = [];
  let isRunning = false;
  let permissionStatus = 'unknown'; // unknown | prompting | granted | denied

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
    return { lat: sumLat / totalWeight, lng: sumLng / totalWeight, acc };
  }

  function isTeleport(lat, lng, ts) {
    if (!lastFix) return false;
    const dt = (ts - lastFix.ts) / 1000;
    if (dt < 1) return false;
    const dist = haversine(lastFix.lat, lastFix.lng, lat, lng);
    const speed = (dist / dt) * 3600;
    return (dt < TELEPORT_MIN_TIME && dist > 1.8) || speed > TELEPORT_MAX_SPEED;
  }

  function saveToCache(fix) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        lat: fix.lat,
        lng: fix.lng,
        accuracy: fix.accuracy,
        heading: fix.heading || 0,
        ts: fix.ts,
        source: fix.source
      }));
    } catch (e) {}
  }

  function loadFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return null;
      if (Date.now() - data.ts > 45 * 60 * 1000) return null; // 45 phút
      return data;
    } catch (e) {
      return null;
    }
  }

  function updateStatusUI(text, color = '#3b82f6') {
    const el = document.getElementById('gpsStatusText');
    const dot = document.getElementById('gpsDot');
    if (el) el.textContent = text;
    if (dot) dot.style.background = color;
  }

  function setStatusFromFix(fix) {
    if (!fix) return;
    if (fix.source === 'cache') {
      updateStatusUI(`GPS: Vị trí gần nhất (±${Math.round(fix.accuracy || 50)}m)`, '#3b82f6');
    } else if (fix.accuracy <= 40) {
      updateStatusUI(`GPS tốt (±${Math.round(fix.accuracy)}m)`, '#22c55e');
    } else if (fix.accuracy <= GPS_WEAK_THRESHOLD) {
      updateStatusUI(`GPS trung bình (±${Math.round(fix.accuracy)}m)`, '#eab308');
    } else {
      updateStatusUI(`GPS yếu – dùng sóng mạng (±${Math.round(fix.accuracy)}m)`, '#ef4444');
    }
  }

  // ========== Core ==========
  function emit(fix) {
    listeners.forEach(fn => {
      try { fn(fix); } catch (e) {}
    });
  }

  function processRaw(position, source) {
    if (!position || !position.coords) return;

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const acc = position.coords.accuracy || 999;
    const speed = (position.coords.speed || 0) * 3.6;
    const heading = position.coords.heading || 0;
    const ts = position.timestamp || Date.now();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (isTeleport(lat, lng, ts)) {
      console.warn('🚫 Teleport blocked');
      return;
    }

    const smoothed = smooth(lat, lng, acc);
    const fix = {
      lat: smoothed.lat,
      lng: smoothed.lng,
      accuracy: smoothed.acc,
      acc: smoothed.acc,
      speed,
      speedKmh: speed,
      heading,
      timestamp: ts,
      ts,
      source: source || 'gps',
      raw: position
    };

    lastFix = fix;
    saveToCache(fix);
    emit(fix);
    setStatusFromFix(fix);
  }

  // ========== Xin quyền chuẩn ==========
  async function requestPermission() {
    updateStatusUI('GPS: Đang xin quyền...', '#f59e0b');
    permissionStatus = 'prompting';

    // Thử Permissions API trước (Chrome/Android mới)
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (result.state === 'granted') {
          permissionStatus = 'granted';
          return true;
        }
        if (result.state === 'denied') {
          permissionStatus = 'denied';
          updateStatusUI('GPS: Bị từ chối quyền – Vào Cài đặt cấp quyền', '#ef4444');
          return false;
        }
      } catch (e) {}
    }

    // Fallback: gọi getCurrentPosition để kích hoạt hộp thoại xin quyền
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          permissionStatus = 'granted';
          resolve(true);
        },
        (err) => {
          permissionStatus = 'denied';
          if (err.code === 1) {
            updateStatusUI('GPS: Bị từ chối quyền – Vào Cài đặt cấp quyền', '#ef4444');
          } else {
            updateStatusUI('GPS: Lỗi lấy vị trí', '#ef4444');
          }
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  // ========== Public API ==========
  const Core = {
    version: VERSION,

    async start() {
      if (isRunning) return;
      if (!navigator.geolocation) {
        updateStatusUI('GPS: Thiết bị không hỗ trợ', '#ef4444');
        return;
      }

      isRunning = true;

      // 1. Hiện vị trí cũ ngay
      const cached = loadFromCache();
      if (cached) {
        lastFix = {
          lat: cached.lat,
          lng: cached.lng,
          accuracy: cached.accuracy || 50,
          acc: cached.accuracy || 50,
          heading: cached.heading || 0,
          ts: cached.ts,
          timestamp: cached.ts,
          source: 'cache'
        };
        emit(lastFix);
        setStatusFromFix(lastFix);
      }

      // 2. Xin quyền
      const granted = await requestPermission();
      if (!granted) {
        isRunning = false;
        return;
      }

      // 3. Bắt đầu hybrid watch
      const highOptions = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      };

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (pos.coords.accuracy > GPS_WEAK_THRESHOLD) {
            // GPS yếu → lấy Network
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
          console.warn('Watch error', err);
          // Fallback network
          navigator.geolocation.getCurrentPosition(
            (pos) => processRaw(pos, 'network'),
            () => updateStatusUI('GPS: Mất tín hiệu', '#ef4444'),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
          );
        },
        highOptions
      );

      console.log(`🛰️ PromaxGPSCore ${VERSION} started`);
    },

    stop() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      isRunning = false;
      buffer = [];
    },

    onFix(callback) {
      if (typeof callback !== 'function') return () => {};
      listeners.push(callback);
      if (lastFix) setTimeout(() => callback(lastFix), 0);
      return () => {
        listeners = listeners.filter(fn => fn !== callback);
      };
    },

    getLastFix() {
      return lastFix;
    },

    forceRefresh() {
      this.stop();
      setTimeout(() => this.start(), 400);
    },

    processBackgroundLocation(pos) {
      processRaw(pos, 'background');
    }
  };

  window.PromaxGPSCore = Core;

  // Tự start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Core.start());
  } else {
    Core.start();
  }

  console.log(`🛰️ PromaxGPSCore ${VERSION} loaded`);
})(window);
