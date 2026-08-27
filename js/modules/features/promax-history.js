(function (window, document) {
  'use strict';
  if (window.PromaxHistory) return;

  function driver() {
    try { return window.driverInfo && window.driverInfo.uid ? window.driverInfo : null; } catch (_) { return null; }
  }

  function ledgerAdd(trip) {
    var d = driver();
    if (!d || !window.db || !trip) return;
    var amount = Number(trip.cost) || 0;
    var date = new Date(Number(trip.timestamp) || Date.now());
    var day = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    var month = date.getFullYear() + '-' + (date.getMonth() + 1);
    var start = new Date(date); start.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    var week = start.getFullYear() + '-' + (start.getMonth() + 1) + '-' + start.getDate();
    [['days', day], ['weeks', week], ['months', month]].forEach(function (entry) {
      var ref = window.db.ref('revenue/' + d.uid + '/' + entry[0] + '/' + entry[1]);
      ref.transaction(function (old) {
        old = old || { total: 0, count: 0 };
        return { total: (Number(old.total) || 0) + amount, count: (Number(old.count) || 0) + 1 };
      }).catch(function () {});
    });
  }

  function cleanup() {
    var d = driver();
    if (!d || !window.db) return;
    var cutoff = Date.now() - 92 * 86400000;
    window.db.ref('revenue/' + d.uid + '/days').once('value').then(function (snap) {
      var remove = {};
      Object.keys(snap.val() || {}).forEach(function (key) {
        var parts = key.split('-');
        if (new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime() < cutoff) remove[key] = null;
      });
      if (Object.keys(remove).length) return window.db.ref('revenue/' + d.uid + '/days').update(remove);
    }).catch(function () {});
  }

  function record(trip) { ledgerAdd(trip); }
  function refresh() { if (typeof window.renderHistory === 'function') window.renderHistory(); }

  window.PromaxHistory = Object.freeze({ record: record, refresh: refresh, cleanup: cleanup });
  document.addEventListener('trip:history-saved', function (event) { record(event.detail); });
  document.addEventListener('DOMContentLoaded', cleanup);
})(window, document);
