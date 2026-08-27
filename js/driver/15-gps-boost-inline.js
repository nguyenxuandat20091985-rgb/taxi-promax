/*
 * Taxi ProMax — GPS boost (inline asset)
 *
 * Chỉ hiển thị vị trí cache trong lúc chờ GPS owner trả fix mới.
 * Không gọi getCurrentPosition/watchPosition lần hai và không ghi đè
 * trạng thái GPS chính.
 */
;(function (window, document) {
  'use strict';

  const CACHE_KEY = 'promax_lastpos';
  let tempMarker = null;

  function loadCachedPosition() {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      const value = raw ? JSON.parse(raw) : null;
      if (!value || !Number.isFinite(Number(value.lat)) || !Number.isFinite(Number(value.lng))) return null;
      return value;
    } catch (_) {
      return null;
    }
  }

  function showCachedPosition() {
    const cached = loadCachedPosition();
    const map = window.PromaxMap && window.PromaxMap.instance ? window.PromaxMap.instance : window.map;
    if (!cached || !map || !window.L) return false;

    const realMarker = window.PromaxMap && typeof window.PromaxMap.updateDriverMarker === 'function';
    if (realMarker) {
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
      if (showCachedPosition() || tries >= 20) window.clearInterval(timer);
    }, 500);
  }

  window.PromaxGpsBoost = { showCachedPosition };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForMap);
  else waitForMap();
  console.log('✅ GPS BOOST v3 loaded — cache only, single GPS owner');
})(window, document);
