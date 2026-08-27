/*
 * Taxi ProMax — Driver Dashboard v1
 * Mô hình thuê bao tháng: Online, GPS, bản đồ, gói cước và thao tác nhanh.
 * Module không mở GPS watcher mới; chỉ đọc trạng thái từ GPS core/DOM hiện có.
 */
(function (window, document) {
  'use strict';
  if (window.PromaxDriverDashboard) return;

  var VERSION = '20260827-dashboard-v1';
  var timer = null;

  function byId(id) { return document.getElementById(id); }
  function text(id, fallback) {
    var el = byId(id);
    return el && el.textContent ? el.textContent.trim() : (fallback || '');
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function getAccuracy() {
    try {
      if (window.PromaxGPSCore && typeof window.PromaxGPSCore.getState === 'function') {
        var state = window.PromaxGPSCore.getState();
        if (state && state.lastFix && Number.isFinite(Number(state.lastFix.accuracy))) return Number(state.lastFix.accuracy);
      }
    } catch (_) {}
    var raw = text('profileAccuracy', '') + ' ' + text('gpsStatusText', '');
    var match = raw.match(/[±+]?\s*(\d+(?:\.\d+)?)\s*m/i);
    return match ? Number(match[1]) : null;
  }
  function getGpsState() {
    var accuracy = getAccuracy();
    var raw = (text('gpsStatusText', '') + ' ' + text('profileAccuracy', '')).toLowerCase();
    if (/từ chối|không có quyền|denied|không khả dụng/.test(raw)) return { label: 'Cần cấp quyền', tone: 'bad', detail: 'Bật Vị trí chính xác trong quyền Chrome' };
    if (/đang tìm|đang lấy|loading/.test(raw) && accuracy == null) return { label: 'Đang lấy GPS', tone: 'waiting', detail: 'Đang chờ điểm vị trí đầu tiên' };
    if (accuracy == null) return { label: 'Chưa có dữ liệu', tone: 'waiting', detail: 'Bấm kiểm tra GPS' };
    if (accuracy <= 50) return { label: 'GPS tốt', tone: 'ok', detail: '±' + Math.round(accuracy) + 'm' };
    if (accuracy <= 300) return { label: 'GPS chấp nhận', tone: 'ok', detail: '±' + Math.round(accuracy) + 'm' };
    return { label: 'Vị trí gần đúng', tone: 'bad', detail: '±' + Math.round(accuracy) + 'm · không tính cước' };
  }
  function getOnlineState() {
    var toggle = byId('onlineToggleSwitch');
    var online = !!(toggle && toggle.classList.contains('active'));
    if (!navigator.onLine) return { label: 'Mất kết nối', tone: 'bad', detail: 'Dữ liệu sẽ đồng bộ khi có mạng' };
    if (!online) return { label: 'Đang Offline', tone: 'offline', detail: 'Bấm nút Online để nhận chuyến' };
    return { label: 'Đang Online', tone: 'online', detail: 'Sẵn sàng tìm chuyến' };
  }
  function subscription() {
    var expiry = number(localStorage.getItem('tp_expiry'), 0);
    var plan = text('profilePlan', '') || 'PROMAX';
    if (!expiry) return { plan: plan, days: null, date: 'Chưa đồng bộ', tone: 'warning' };
    var days = Math.ceil((expiry - Date.now()) / 86400000);
    var date = new Date(expiry).toLocaleDateString('vi-VN');
    if (days <= 0) return { plan: plan, days: 0, date: date, tone: 'expired' };
    return { plan: plan, days: days, date: date, tone: days <= 3 ? 'warning' : 'ok' };
  }
  function renderSubscriptionCard() {
    var target = byId('tab-vi');
    if (!target) return;
    var sub = subscription();
    var existing = byId('pmxSubscriptionCard');
    if (!existing) {
      existing = document.createElement('section');
      existing.id = 'pmxSubscriptionCard';
      existing.className = 'pmx-subscription-card';
      var header = target.querySelector('.p-header');
      if (header) header.insertAdjacentElement('afterend', existing);
      else target.insertBefore(existing, target.firstChild);
    }
    var badge = sub.days === null ? 'Chưa đồng bộ' : sub.days <= 0 ? 'ĐÃ HẾT HẠN' : 'ĐANG HOẠT ĐỘNG';
    existing.innerHTML = '<div class="pmx-subscription-top"><div><div class="pmx-subscription-title">Gói thuê bao tháng</div><div class="pmx-subscription-caption">Không trừ phần trăm trên từng chuyến</div></div><div class="pmx-subscription-badge ' + sub.tone + '">' + badge + '</div></div>' +
      '<div class="pmx-subscription-grid"><div class="pmx-subscription-stat"><b>' + escapeHtml(sub.plan) + '</b><span>Gói hiện tại</span></div><div class="pmx-subscription-stat"><b>' + (sub.days === null ? '--' : String(sub.days)) + '</b><span>Ngày còn lại</span></div><div class="pmx-subscription-stat"><b>' + escapeHtml(sub.date) + '</b><span>Ngày hết hạn</span></div></div>';
  }
  function renderHomeDashboard() {
    var home = byId('homeControls');
    if (!home) return;
    var panel = byId('pmxHomeDashboard');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'pmxHomeDashboard';
      panel.className = 'pmx-home-dashboard';
      var rate = byId('priceSlider');
      if (rate) rate.insertAdjacentElement('beforebegin', panel);
      else home.insertBefore(panel, home.firstChild);
    }
    var online = getOnlineState();
    var gps = getGpsState();
    panel.innerHTML = '<div class="pmx-dashboard-card"><div class="pmx-dashboard-label"><span class="pmx-status-dot ' + online.tone + '"></span> Trạng thái vận hành</div><div class="pmx-dashboard-value">' + online.label + '</div><div class="pmx-dashboard-sub">' + online.detail + '</div></div>' +
      '<div class="pmx-dashboard-card"><div class="pmx-dashboard-label"><span class="pmx-status-dot ' + gps.tone + '"></span> GPS / vị trí</div><div class="pmx-dashboard-value">' + gps.label + '</div><div class="pmx-dashboard-sub">' + gps.detail + '</div></div>' +
      '<div class="pmx-dashboard-actions"><button class="pmx-dash-btn" type="button" data-pmx-action="gps">📍 Kiểm tra GPS</button><button class="pmx-dash-btn primary" type="button" data-pmx-action="plan">📅 Xem thuê bao</button></div>';
    panel.querySelector('[data-pmx-action="gps"]').onclick = openDiagnostics;
    panel.querySelector('[data-pmx-action="plan"]').onclick = function () {
      var tabs = document.querySelectorAll('.nav-item');
      if (typeof window.showTab === 'function') window.showTab('vi', tabs[1] || null);
    };
  }
  function diagnosticRow(label, value, tone) {
    return '<div class="pmx-diagnostic-row"><span>' + escapeHtml(label) + '</span><strong class="pmx-diagnostic-status ' + (tone || '') + '">' + escapeHtml(value) + '</strong></div>';
  }
  function openDiagnostics() {
    var old = byId('pmxDiagnostic');
    if (old) old.remove();
    var gps = getGpsState();
    var online = getOnlineState();
    var mapTiles = document.querySelectorAll('#map .leaflet-tile').length;
    var wrap = document.createElement('div');
    wrap.id = 'pmxDiagnostic';
    wrap.className = 'pmx-diagnostic-backdrop';
    wrap.innerHTML = '<div class="pmx-diagnostic-sheet" role="dialog" aria-modal="true" aria-label="Kiểm tra ứng dụng"><div class="pmx-diagnostic-head"><h3>Kiểm tra ứng dụng</h3><button class="pmx-diagnostic-close" type="button" aria-label="Đóng">×</button></div><div id="pmxDiagnosticRows">' +
      diagnosticRow('Kết nối mạng', navigator.onLine ? 'Đang kết nối' : 'Mất mạng', navigator.onLine ? 'ok' : 'bad') +
      diagnosticRow('Trạng thái tài xế', online.label, online.tone === 'online' ? 'ok' : 'warn') +
      diagnosticRow('GPS', gps.label, gps.tone) +
      diagnosticRow('Độ chính xác', gps.detail, gps.tone) +
      diagnosticRow('Bản đồ', mapTiles > 0 ? mapTiles + ' tile đang hiển thị' : 'Chưa tải tile', mapTiles > 0 ? 'ok' : 'warn') +
      diagnosticRow('Vị trí chính xác', 'Đang kiểm tra...', 'warn') +
      diagnosticRow('Tiết kiệm pin', 'Đang kiểm tra...', 'warn') +
      '</div><div class="pmx-dashboard-actions"><button class="pmx-dash-btn primary" id="pmxRetryGps" type="button">↻ Kiểm tra lại GPS</button><button class="pmx-dash-btn" id="pmxOpenPlan" type="button">📅 Thuê bao</button></div></div>';
    document.body.appendChild(wrap);
    wrap.querySelector('.pmx-diagnostic-close').onclick = function () { wrap.remove(); };
    wrap.onclick = function (event) { if (event.target === wrap) wrap.remove(); };
    wrap.querySelector('#pmxRetryGps').onclick = function () {
      try { if (typeof window.forceRefreshGPS === 'function') window.forceRefreshGPS(); } catch (_) {}
      setTimeout(openDiagnostics, 700);
    };
    wrap.querySelector('#pmxOpenPlan').onclick = function () {
      wrap.remove();
      var tabs = document.querySelectorAll('.nav-item');
      if (typeof window.showTab === 'function') window.showTab('vi', tabs[1] || null);
    };
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(function (permission) {
        var rows = wrap.querySelectorAll('.pmx-diagnostic-status');
        var el = rows[5];
        if (!el) return;
        el.textContent = permission.state === 'granted' ? 'Đã cấp quyền' : permission.state === 'prompt' ? 'Chưa hỏi quyền' : 'Bị từ chối';
        el.className = 'pmx-diagnostic-status ' + (permission.state === 'granted' ? 'ok' : 'bad');
      }).catch(function () {});
    }
    if (navigator.getBattery) {
      navigator.getBattery().then(function (battery) {
        var rows = wrap.querySelectorAll('.pmx-diagnostic-status');
        var el = rows[6];
        if (!el) return;
        el.textContent = battery.charging ? 'Đang sạc' : Math.round(battery.level * 100) + '% · kiểm tra tối ưu pin';
        el.className = 'pmx-diagnostic-status ' + (battery.charging ? 'ok' : 'warn');
      }).catch(function () {});
    }
  }
  function refresh() {
    renderHomeDashboard();
    renderSubscriptionCard();
  }
  function boot() {
    refresh();
    timer = window.setInterval(refresh, 2500);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
  }
  window.PromaxDriverDashboard = { version: VERSION, refresh: refresh, openDiagnostics: openDiagnostics };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
