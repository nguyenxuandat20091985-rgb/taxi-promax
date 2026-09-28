/*
 * Taxi ProMax — Driver Operations Menu v2
 * Bố cục gọn cho tài xế: GPS và Online dùng đúng vị trí gốc trên màn hình.
 * Không tạo GPS watcher, không chèn dashboard hoặc gói thuê bao vào khu vực bản đồ.
 */
(function (window, document) {
  'use strict';
  if (window.PromaxDriverDashboard && window.PromaxDriverDashboard.version === '20260828-compact-v2') return;

  var VERSION = '20260828-compact-v2';
  var refreshTimer = null;

  function byId(id) { return document.getElementById(id); }
  function cleanText(id) {
    var el = byId(id);
    return el && el.textContent ? el.textContent.trim() : '';
  }
  function number(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function getAccuracy() {
    try {
      if (window.PromaxGPSCore && typeof window.PromaxGPSCore.getState === 'function') {
        var state = window.PromaxGPSCore.getState();
        if (state && state.lastFix && Number.isFinite(Number(state.lastFix.accuracy))) return Number(state.lastFix.accuracy);
      }
    } catch (_) {}
    var raw = cleanText('gpsStatusText') + ' ' + cleanText('profileAccuracy');
    var match = raw.match(/[±+]?\s*(\d+(?:\.\d+)?)\s*m/i);
    return match ? Number(match[1]) : null;
  }
  function gpsState() {
    var accuracy = getAccuracy();
    var raw = (cleanText('gpsStatusText') + ' ' + cleanText('profileAccuracy')).toLowerCase();
    if (/từ chối|không có quyền|denied|không khả dụng/.test(raw)) return { label: 'Bị từ chối', detail: 'Bật Vị trí chính xác', tone: 'bad' };
    if (/đang tìm|đang lấy|loading/.test(raw) && accuracy == null) return { label: 'Đang lấy GPS', detail: 'Đang chờ vị trí đầu tiên', tone: 'warn' };
    if (accuracy == null) return { label: 'Chưa có fix', detail: 'Bấm thanh GPS phía trên để làm mới', tone: 'warn' };
    if (accuracy <= 300) return { label: 'Đạt yêu cầu', detail: '±' + Math.round(accuracy) + 'm', tone: 'ok' };
    return { label: 'Gần đúng', detail: '±' + Math.round(accuracy) + 'm · không tính cước', tone: 'bad' };
  }
  function onlineState() {
    var toggle = byId('onlineToggleSwitch');
    var online = !!(toggle && toggle.classList.contains('active'));
    if (!navigator.onLine) return { label: 'Mất kết nối', detail: 'Sẽ đồng bộ khi có mạng', tone: 'bad' };
    if (!online) return { label: 'Đang Offline', detail: 'Bật Online ở thanh điều khiển dưới bản đồ', tone: 'warn' };
    return { label: 'Đang Online', detail: 'Sẵn sàng tìm chuyến', tone: 'ok' };
  }
  function subscriptionSummary() {
    var expiry = number(localStorage.getItem('tp_expiry'), 0);
    var plan = cleanText('profilePlan') || 'PROMAX';
    if (!expiry) return { plan: plan, status: 'Chưa đồng bộ', days: '--', date: '--', tone: 'warn' };
    var days = Math.ceil((expiry - Date.now()) / 86400000);
    return { plan: plan, status: days > 0 ? 'Đang hoạt động' : 'Đã hết hạn', days: Math.max(0, days), date: new Date(expiry).toLocaleDateString('vi-VN'), tone: days > 0 ? 'ok' : 'bad' };
  }
  function removeOldHomeCards() {
    var homeCard = byId('pmxHomeDashboard');
    if (homeCard) homeCard.remove();
    var subscriptionCard = byId('pmxSubscriptionCard');
    if (subscriptionCard) subscriptionCard.remove();
  }
  function ensureMenuItem() {
    var menu = byId('sidebarMenu');
    if (!menu || byId('pmxDiagnosticsMenuItem')) return;
    var item = document.createElement('div');
    item.id = 'pmxDiagnosticsMenuItem';
    item.className = 'sidebar-item pmx-menu-item';
    item.setAttribute('role', 'button');
    item.innerHTML = '<i class="fas fa-satellite-dish" aria-hidden="true"></i><span>Kiểm tra GPS & thiết bị</span>';
    item.onclick = function () {
      if (typeof window.closeSidebar === 'function') window.closeSidebar();
      openDiagnostics();
    };
    var locationItem = Array.prototype.find.call(menu.querySelectorAll('.sidebar-item'), function (entry) {
      return /Theo dõi vị trí/i.test(entry.textContent || '');
    });
    if (locationItem) locationItem.insertAdjacentElement('afterend', item);
    else menu.appendChild(item);
  }
  function ensureSubscriptionMenuLabel() {
    var menu = byId('sidebarMenu');
    if (!menu) return;
    Array.prototype.forEach.call(menu.querySelectorAll('.sidebar-item'), function (item) {
      var label = item.querySelector('span');
      if (!label || !/Ví tiền\s*&\s*Gói cước/i.test(label.textContent || '')) return;
      label.innerHTML = 'Gói thuê bao tháng';
      item.setAttribute('title', 'Xem gói thuê bao và gia hạn');
    });
  }
  function diagnosticRow(label, value, tone) {
    return '<div class="pmx-diagnostic-row"><span>' + escapeHtml(label) + '</span><strong class="pmx-diagnostic-status ' + (tone || '') + '">' + escapeHtml(value) + '</strong></div>';
  }
  function openDiagnostics() {
    var old = byId('pmxDiagnostic');
    if (old) old.remove();
    var gps = gpsState();
    var online = onlineState();
    var tiles = document.querySelectorAll('#map .leaflet-tile').length;
    var subscription = subscriptionSummary();
    var wrap = document.createElement('div');
    wrap.id = 'pmxDiagnostic';
    wrap.className = 'pmx-diagnostic-backdrop';
    wrap.innerHTML = '<div class="pmx-diagnostic-sheet" role="dialog" aria-modal="true" aria-label="Kiểm tra ứng dụng"><div class="pmx-diagnostic-head"><h3>Kiểm tra ứng dụng</h3><button class="pmx-diagnostic-close" type="button" aria-label="Đóng">×</button></div><div class="pmx-diagnostic-note">GPS và Online được điều khiển ở vị trí gốc; màn hình này chỉ kiểm tra, không tạo watcher mới.</div><div class="pmx-diagnostic-rows">' +
      diagnosticRow('Kết nối mạng', navigator.onLine ? 'Đang kết nối' : 'Mất mạng', navigator.onLine ? 'ok' : 'bad') +
      diagnosticRow('Trạng thái tài xế', online.label, online.tone) +
      diagnosticRow('GPS', gps.label, gps.tone) +
      diagnosticRow('Độ chính xác', gps.detail, gps.tone) +
      diagnosticRow('Bản đồ', tiles > 0 ? tiles + ' tile đang hiển thị' : 'Chưa tải tile', tiles > 0 ? 'ok' : 'warn') +
      diagnosticRow('Gói thuê bao', subscription.status, subscription.tone) +
      '</div><div class="pmx-diagnostic-actions"><button class="pmx-dash-btn primary" id="pmxRetryGps" type="button">↻ Làm mới GPS</button><button class="pmx-dash-btn" id="pmxOpenPlan" type="button">📅 Xem thuê bao</button></div></div>';
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
  }
  function refresh() {
    removeOldHomeCards();
    ensureMenuItem();
    ensureSubscriptionMenuLabel();
  }
  function boot() {
    refresh();
    refreshTimer = window.setInterval(refresh, 3000);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
  }
  window.PromaxDriverDashboard = { version: VERSION, refresh: refresh, openDiagnostics: openDiagnostics };
  window.openDriverDiagnostics = openDiagnostics;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
