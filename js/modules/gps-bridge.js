/* ProMax GPS Bridge: adapter duy nhất từ PromaxGPSCore đến các tính năng phụ. */
(function (window) {
  'use strict';
  if (window.GPSBridge) return;

  var listeners = [];
  var unsubscribe = null;
  function connect() {
    if (unsubscribe || !window.PromaxGPSCore || typeof window.PromaxGPSCore.onFix !== 'function') return;
    unsubscribe = window.PromaxGPSCore.onFix(function (fix) {
      if (!fix || fix.error || !Number.isFinite(Number(fix.lat)) || !Number.isFinite(Number(fix.lng))) return;
      var position = {
        lat: Number(fix.lat), lng: Number(fix.lng), accuracy: Number(fix.accuracy) || 999,
        speed: Number(fix.speedKmh) || 0, heading: Number(fix.heading) || 0,
        timestamp: Number(fix.timestamp) || Date.now()
      };
      listeners.slice().forEach(function (callback) {
        try { callback(position); } catch (_) {}
      });
    });
  }

  window.GPSBridge = Object.freeze({
    getPosition: function () {
      var state = window.PromaxGPSCore && window.PromaxGPSCore.getState ? window.PromaxGPSCore.getState() : null;
      var fix = state && (state.lastGoodFix || state.lastFix);
      return fix ? { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, speed: fix.speedKmh || 0, heading: fix.heading || 0, timestamp: fix.timestamp } : null;
    },
    onPosition: function (callback) {
      if (typeof callback !== 'function') return function () {};
      listeners.push(callback);
      connect();
      return function () { listeners = listeners.filter(function (item) { return item !== callback; }); };
    },
    start: connect,
    stop: function () { if (unsubscribe) unsubscribe(); unsubscribe = null; },
    version: '2.0'
  });
  window.GPSBridge.start();
})(window);
