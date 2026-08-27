/*
 * Taxi ProMax — GPS fallback dual source
 *
 * Fallback này chỉ bổ sung vị trí khi GPS chính báo timeout/từ chối.
 * Nó tuyệt đối không tự cộng totalKm; core runtime là nơi duy nhất cộng km
 * và core chỉ cộng khi Trip Engine đang ở FARE_CALCULATING.
 */
;(function (window, document) {
  'use strict';

  let fallbackWatchId = null;
  let started = false;

  function isFareActive() {
    return !window.tripEngine || typeof window.tripEngine.isFareActive !== 'function' || window.tripEngine.isFareActive();
  }

  function forward(position) {
    if (!position || !position.coords) return;
    const runtime = window.PromaxLegacyRuntime;
    if (runtime && typeof runtime.processLocation === 'function') {
      runtime.processLocation(position);
    } else if (typeof window.processBackgroundLocation === 'function') {
      window.processBackgroundLocation(position);
    }
  }

  function start() {
    if (started || !navigator.geolocation) return;
    started = true;
    fallbackWatchId = navigator.geolocation.watchPosition(
      function (position) {
        const status = document.getElementById('gpsStatusText');
        const statusText = status ? status.innerText || '' : '';
        const gpsUnavailable = /Timeout|từ chối|thử lại|lỗi/i.test(statusText);
        if (!gpsUnavailable) return;

        const accuracy = Number(position.coords.accuracy) || 999;
        if (accuracy > 280) return;
        if (!isFareActive()) {
          // Vẫn cập nhật vị trí/marker, nhưng không được tính cước ở pickup,
          // waiting destination hoặc các state trước FARE_CALCULATING.
          forward(position);
          return;
        }
        forward(position);
      },
      function () {},
      { enableHighAccuracy: false, maximumAge: 15000, timeout: 20000 }
    );
  }

  function stop() {
    if (fallbackWatchId != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(fallbackWatchId);
    }
    fallbackWatchId = null;
    started = false;
  }

  window.PromaxGpsFallback = { start, stop, isFareActive };
  window.addEventListener('beforeunload', stop);
  start();
  console.log('✅ GPS DUAL v2 loaded — no direct fare accumulation');
})(window, document);
