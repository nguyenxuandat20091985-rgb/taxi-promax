/*
 * ProMax Fare Core
 * The only place that defines fare rules. Other UI code must call this API
 * instead of applying Math.max(MIN_FARE, ...) independently.
 */
(function (window) {
  'use strict';
  if (window.PromaxFare) return;

  var CFG = {
    BASE_RATE: 15000,
    MIN_FARE: 20000,
    MAX_TRIP_KM: 500,
    MAX_FARE: 50000000
  };

  function finite(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeKm(km) {
    return Math.min(CFG.MAX_TRIP_KM, Math.max(0, finite(km, 0)));
  }

  function normalizeRate(rate) {
    return Math.max(0, finite(rate, CFG.BASE_RATE));
  }

  function calculate(km, rate) {
    var distance = normalizeKm(km);
    var unitRate = normalizeRate(rate);
    var raw = Math.round(distance * unitRate);
    return Math.min(CFG.MAX_FARE, Math.max(CFG.MIN_FARE, raw));
  }

  function snapshot() {
    var km = 0;
    var rate = CFG.BASE_RATE;
    var tripType = 'APP_BOOKING';
    try { if (typeof totalKm !== 'undefined') km = totalKm; } catch (e) {}
    try { if (typeof currentRate !== 'undefined') rate = currentRate; } catch (e) {}
    try { if (typeof isStreetHail !== 'undefined' && isStreetHail) tripType = 'STREET_HAIL'; } catch (e) {}
    return { km: normalizeKm(km), rate: normalizeRate(rate), fare: calculate(km, rate), tripType: tripType };
  }

  window.PromaxFare = {
    config: CFG,
    normalizeKm: normalizeKm,
    calculate: calculate,
    snapshot: snapshot,
    live: calculate
  };

  console.log('✅ ProMax Fare Core loaded — one fare rule, one minimum-fare guard');
})(window);
