/**
 * Taxi ProMax — Trip State Manager v2.0
 * Trạng thái toàn cục: IDLE | STREET_HAIL | APP_TRIP
 */
;(function (window) {
  'use strict';

  var current = 'IDLE';
  var listeners = [];

  function setState(next) {
    next = String(next || 'IDLE').toUpperCase();
    if (next === current) return current;
    var prev = current;
    current = next;
    try {
      document.documentElement.setAttribute('data-trip-state', current);
      if (document.body) document.body.setAttribute('data-trip-state', current);
    } catch (e) {}
    listeners.forEach(function (fn) {
      try { fn(current, prev); } catch (e) {}
    });
    try {
      document.dispatchEvent(new CustomEvent('trip:state', { detail: { state: current, prev: prev } }));
    } catch (e) {}
    return current;
  }

  function getState() { return current; }

  function isBusy() {
    return current === 'STREET_HAIL' || current === 'APP_TRIP';
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  // Sync from handlers
  setInterval(function () {
    var sh = window.StreetHailHandler && window.StreetHailHandler.isActive && window.StreetHailHandler.isActive();
    var ap = window.AppTripHandler && window.AppTripHandler.isRunning && window.AppTripHandler.isRunning();
    if (sh) setState('STREET_HAIL');
    else if (ap) setState('APP_TRIP');
    else if (current !== 'IDLE') setState('IDLE');
  }, 2000);

  window.TripStateManager = {
    setState: setState,
    getState: getState,
    isBusy: isBusy,
    onChange: onChange
  };

  console.log('TripStateManager v2.0 loaded');
})(window);
