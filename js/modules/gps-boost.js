/*
 * Taxi ProMax — GPS boost module
 *
 * Bản đồ và core GPS đã có nguồn định vị chính. Module này chỉ dùng vị trí
 * cache để bản đồ không trống khi chờ fix mới; không tự tạo watcher phụ,
 * không tự cộng kilomet và không ghi đè gpsStatusText.
 */
;(function (window, document) {
  'use strict';

  const CACHE_KEY = 'promax_lastpos';
  let tempMarker = null;

  function readCache() {
    try {
      const value = JSON.parse(window.localStorage.getItem(CACHE_KEY) || 'null');
      if (!value || !Number.isFinite(Number(value.lat)) || !Number.isFinite(Number(value.lng))) return null;
      return value;
    } catch (_) {
      return null;
    }
  }

  function renderCachedMarker() {
    const cached = readCache();
    const map = window.PromaxMap && window.PromaxMap.instance ? window.PromaxMap.instance : window.map;
    if (!cached || !map || !window.L) return false;

    if (window.PromaxMap && typeof window.PromaxMap.updateDriverMarker === 'function') {
      window.PromaxMap.updateDriverMarker(cached.lat, cached.lng, cached.heading);
      return true;
    }

    if (!tempMarker) {
      const icon = window.L.divIcon({
        className: '',
        html: '<div style="width:18px;height:18px;border-radius:50%;background:#2196f3;border:3px solid #fff;box-shadow:0 2px 8px rgba(33,150,243,.6);"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      tempMarker = window.L.marker([cached.lat, cached.lng], { icon }).addTo(map);
    } else {
      tempMarker.setLatLng([cached.lat, cached.lng]);
    }
    return true;
  }

  function waitForMap() {
    let tries = 0;
    const timer = window.setInterval(function () {
      tries += 1;
      if (renderCachedMarker() || tries >= 20) window.clearInterval(timer);
    }, 500);
  }

  window.PromaxGpsBoost = { renderCachedMarker };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForMap);
  else waitForMap();
  console.log('✅ GPS BOOST v3 loaded — cache only, single GPS owner');
})(window, document);
