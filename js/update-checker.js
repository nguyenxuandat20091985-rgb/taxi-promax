/* Taxi ProMax – in-app update checker (minimal, non-blocking) */
(function () {
  'use strict';
  var VERSION_URL = 'https://taxi-promax.vercel.app/version.json';
  var LOCAL_VERSION = '1.14.0';
  var LOCAL_CODE = 114;
  var CHECK_KEY = 'tpm_update_dismissed';

  function parseVer(s) {
    return String(s || '0').split('.').map(function (n) { return parseInt(n, 10) || 0; });
  }
  function isNewer(remote, local) {
    var a = parseVer(remote), b = parseVer(local);
    for (var i = 0; i < Math.max(a.length, b.length); i++) {
      var x = a[i] || 0, y = b[i] || 0;
      if (x > y) return true;
      if (x < y) return false;
    }
    return false;
  }
  function openUrl(url) {
    try {
      if (window.cordova && cordova.InAppBrowser) {
        cordova.InAppBrowser.open(url, '_system');
        return;
      }
    } catch (e) {}
    window.open(url, '_blank');
  }
  function showBanner(info) {
    if (document.getElementById('tpmUpdateBanner')) return;
    var bar = document.createElement('div');
    bar.id = 'tpmUpdateBanner';
    bar.setAttribute('style',
      'position:fixed;left:12px;right:12px;bottom:72px;z-index:99999;' +
      'background:#0A1628;color:#fff;border:2px solid #FFD100;border-radius:14px;' +
      'padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.35);font-family:sans-serif;');
    var msg = (info && info.message) ? info.message : 'Có bản cập nhật mới';
    bar.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;">' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-weight:800;color:#FFD100;font-size:14px;">Cập nhật Taxi ProMax</div>' +
      '<div style="font-size:12px;opacity:.9;margin-top:3px;">' + msg + ' (v' + (info.version || '') + ')</div>' +
      '</div>' +
      '<button id="tpmUpdateBtn" style="background:#FFD100;color:#0A1628;border:0;border-radius:10px;' +
      'padding:10px 14px;font-weight:800;font-size:13px;white-space:nowrap;">Cập nhật</button>' +
      '<button id="tpmUpdateClose" style="background:transparent;color:#ccc;border:0;font-size:18px;padding:4px 6px;">×</button>' +
      '</div>';
    document.body.appendChild(bar);
    document.getElementById('tpmUpdateBtn').onclick = function () {
      var url = (info && info.apkUrl) ? info.apkUrl : 'https://github.com/nguyenxuandat20091985-rgb/taxi-promax/actions';
      openUrl(url);
    };
    document.getElementById('tpmUpdateClose').onclick = function () {
      try { localStorage.setItem(CHECK_KEY, String(info.versionCode || info.version || '')); } catch (e) {}
      bar.remove();
    };
  }
  function check() {
    fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (info) {
        if (!info) return;
        var newer = false;
        if (typeof info.versionCode === 'number' && info.versionCode > LOCAL_CODE) newer = true;
        else if (info.version && isNewer(info.version, LOCAL_VERSION)) newer = true;
        if (!newer) return;
        try {
          var dismissed = localStorage.getItem(CHECK_KEY);
          if (dismissed && (dismissed === String(info.versionCode) || dismissed === String(info.version))) return;
        } catch (e) {}
        showBanner(info);
      })
      .catch(function () {});
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(check, 2500); });
  } else {
    setTimeout(check, 2500);
  }
})();
