/* Taxi ProMax Map UI v6 — presentation and interaction bridge only.
 * Does not create a GPS watcher and does not calculate/write fares.
 */
(function (window, document) {
  'use strict';
  if (window.PromaxMapUI) return;

  var state = {
    heatmapVisible: false,
    passengerRequest: false,
    passengerTimer: null
  };

  function safeToast(message) {
    try {
      if (typeof window.showToast === 'function') window.showToast(message);
    } catch (_) {}
  }

  function getCurrentPosition() {
    try {
      /* index.html dùng global lexical let; đọc trực tiếp trước, rồi mới fallback window.*. */
      var lat = Number(typeof currentLat !== 'undefined' ? currentLat : window.currentLat);
      var lng = Number(typeof currentLng !== 'undefined' ? currentLng : window.currentLng);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat: lat, lng: lng } : null;
    } catch (_) {
      return null;
    }
  }

  function detectDevice() {
    var ua = navigator.userAgent || '';
    var platform = navigator.platform || '';
    if (/iPad|iPhone|iPod/i.test(ua) || (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)) {
      return { key: 'ios', name: 'iPhone / iPad', browser: /CriOS/i.test(ua) ? 'Chrome' : /FxiOS/i.test(ua) ? 'Firefox' : 'Safari' };
    }
    if (/Android/i.test(ua) && /SamsungBrowser/i.test(ua)) {
      return { key: 'samsung', name: 'Samsung Galaxy', browser: 'Samsung Internet' };
    }
    if (/Android/i.test(ua)) {
      return { key: 'android', name: 'Điện thoại Android', browser: /EdgA/i.test(ua) ? 'Edge' : /Firefox/i.test(ua) ? 'Firefox' : 'Chrome' };
    }
    return { key: 'desktop', name: 'thiết bị máy tính', browser: 'trình duyệt hiện tại' };
  }

  function gpsIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="6"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"></circle></svg>';
  }

  function buildGpsGuide() {
    var existing = document.getElementById('promaxGpsGuide');
    if (existing) return existing;

    var overlay = document.createElement('div');
    overlay.id = 'promaxGpsGuide';
    overlay.className = 'promax-gps-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'promaxGpsTitle');
    overlay.innerHTML =
      '<div class="promax-gps-card">' +
        '<div class="promax-gps-grabber"></div>' +
        '<div class="promax-gps-title-row">' +
          '<div class="promax-gps-symbol">' + gpsIcon() + '</div>' +
          '<div style="flex:1"><div id="promaxGpsTitle" class="promax-gps-title">Hướng dẫn mở GPS</div><div id="promaxGpsSubtitle" class="promax-gps-subtitle"></div></div>' +
          '<button class="promax-gps-close" id="promaxGpsClose" type="button" aria-label="Đóng hướng dẫn GPS">×</button>' +
        '</div>' +
        '<div class="promax-gps-steps" id="promaxGpsSteps"></div>' +
        '<div class="promax-gps-buttons"><button class="promax-gps-open" id="promaxGpsOpen" type="button">Mở cài đặt</button><button class="promax-gps-check" id="promaxGpsCheck" type="button">Kiểm tra lại</button></div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeGpsGuide();
    });
    overlay.querySelector('#promaxGpsClose').addEventListener('click', closeGpsGuide);
    overlay.querySelector('#promaxGpsCheck').addEventListener('click', checkGps);
    overlay.querySelector('#promaxGpsOpen').addEventListener('click', openDeviceSettings);
    return overlay;
  }

  function gpsInstructions(device) {
    if (device.key === 'ios') {
      return '<strong>' + device.name + ' · ' + device.browser + '</strong><br>Vào <b>Cài đặt</b> → <b>Quyền riêng tư & Bảo mật</b> → <b>Dịch vụ định vị</b> → chọn ' + device.browser + ' → <b>Khi dùng ứng dụng</b> và bật <b>Vị trí chính xác</b>.';
    }
    if (device.key === 'samsung') {
      return '<strong>' + device.name + ' · ' + device.browser + '</strong><br>Vào <b>Cài đặt</b> → <b>Ứng dụng</b> → <b>' + device.browser + '</b> → <b>Quyền</b> → <b>Vị trí</b> → <b>Cho phép khi dùng ứng dụng</b>. Bật thêm <b>Vị trí chính xác</b> nếu máy có tùy chọn này.';
    }
    if (device.key === 'android') {
      return '<strong>' + device.name + ' · ' + device.browser + '</strong><br>Vào <b>Cài đặt</b> → <b>Ứng dụng</b> → <b>' + device.browser + '</b> → <b>Quyền</b> → <b>Vị trí</b> → <b>Cho phép khi dùng ứng dụng</b>, sau đó bật <b>Vị trí chính xác</b>.';
    }
    return '<strong>' + device.name + '</strong><br>Bấm biểu tượng khóa/cài đặt cạnh địa chỉ trang web → <b>Vị trí</b> → <b>Cho phép</b>. Khi được hỏi, chọn cho phép truy cập vị trí và kiểm tra thiết bị đang bật GPS.';
  }

  function browserPackage() {
    var ua = navigator.userAgent || '';
    if (/SamsungBrowser/i.test(ua)) return 'com.sec.android.app.sbrowser';
    if (/EdgA/i.test(ua)) return 'com.microsoft.emmx';
    if (/Firefox/i.test(ua)) return 'org.mozilla.firefox';
    if (/OPR|Opera/i.test(ua)) return 'com.opera.browser';
    return 'com.android.chrome';
  }

  function openDeviceSettings() {
    var device = detectDevice();
    var guide = buildGpsGuide();
    if (device.key === 'android' || device.key === 'samsung') {
      try {
        window.location.href = 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:' + browserPackage() + ';end';
        return;
      } catch (_) {}
    }
    if (device.key === 'ios') {
      safeToast('Anh mở Cài đặt iPhone theo các bước đang hiển thị bên dưới.');
    } else {
      safeToast('Anh mở phần quyền Vị trí của trình duyệt theo các bước đang hiển thị bên dưới.');
    }
    guide.querySelector('#promaxGpsSteps').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function checkGps() {
    if (!navigator.geolocation) {
      safeToast('Thiết bị không hỗ trợ GPS trình duyệt.');
      return;
    }
    navigator.geolocation.getCurrentPosition(function (position) {
      var accuracy = Math.round(Number(position.coords.accuracy) || 0);
      if (accuracy > 0 && accuracy <= 100) {
        safeToast('GPS đã chính xác (±' + accuracy + 'm).');
        closeGpsGuide();
      } else {
        safeToast('GPS hiện còn yếu (±' + (accuracy || 9999) + 'm). Hãy bật Vị trí chính xác rồi kiểm tra lại.');
      }
    }, function () {
      safeToast('Chưa cấp quyền GPS. Hãy mở quyền Vị trí rồi kiểm tra lại.');
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
  }

  function openGpsGuide() {
    var device = detectDevice();
    var guide = buildGpsGuide();
    guide.querySelector('#promaxGpsSubtitle').textContent = 'Thiết bị nhận diện: ' + device.name + ' · ' + device.browser;
    guide.querySelector('#promaxGpsSteps').innerHTML = gpsInstructions(device);
    guide.classList.add('is-open');
    try { guide.querySelector('#promaxGpsCheck').focus(); } catch (_) {}
  }

  function closeGpsGuide() {
    var guide = document.getElementById('promaxGpsGuide');
    if (guide) guide.classList.remove('is-open');
  }

  function orderIsPaid(order) {
    if (!order || typeof order !== 'object') return false;
    var status = String(order.paymentStatus || order.payment_state || order.payStatus || '').toLowerCase();
    var payment = order.payment && typeof order.payment === 'object' ? order.payment : {};
    var paymentStatus = String(payment.status || payment.paymentStatus || '').toLowerCase();
    return order.paid === true || order.isPaid === true || order.walletPaid === true ||
      order.hasPaid === true || ['paid', 'success', 'completed', 'confirmed'].indexOf(status) !== -1 ||
      ['paid', 'success', 'completed', 'confirmed'].indexOf(paymentStatus) !== -1 ||
      Boolean(order.transactionId || order.paymentId || payment.transactionId || payment.paymentId);
  }

  function distanceKm(aLat, aLng, bLat, bLng) {
    var toRad = function (value) { return value * Math.PI / 180; };
    var dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
    var aa = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  }

  function getDatabase() {
    try { return typeof db !== 'undefined' ? db : null; } catch (_) { return null; }
  }

  function driverCanSearch() {
    try {
      if (typeof window.isLocked !== 'undefined' && window.isLocked) return false;
      if (typeof isLocked !== 'undefined' && isLocked) return false;
    } catch (_) {}
    return true;
  }

  function showPassengerResult(title, body) {
    var card = document.getElementById('promaxPassengerResult');
    if (!card) {
      card = document.createElement('div');
      card.id = 'promaxPassengerResult';
      card.className = 'promax-passenger-result';
      card.innerHTML = '<button class="promax-passenger-result-close" type="button" aria-label="Đóng">×</button><div class="promax-passenger-result-title"></div><div class="promax-passenger-result-body"></div>';
      card.querySelector('button').addEventListener('click', function () { card.classList.remove('is-open'); });
      document.body.appendChild(card);
    }
    card.querySelector('.promax-passenger-result-title').textContent = title;
    card.querySelector('.promax-passenger-result-body').textContent = body;
    card.classList.add('is-open');
    if (state.passengerTimer) clearTimeout(state.passengerTimer);
    state.passengerTimer = setTimeout(function () { card.classList.remove('is-open'); }, 9000);
  }

  function showOrderInExistingModal(orderId, order) {
    try {
      /* Các biến này được khai báo bằng let trong index.html; gán trực tiếp để
       * acceptOrder()/showTripPanel() dùng đúng cùng một trạng thái, không tạo
       * bản sao window.* tách rời. */
      currentOrderId = orderId;
      currentCustomerData = order;
      isStreetHail = false;
      if (typeof _isModalOpening !== 'undefined') _isModalOpening = true;
      var set = function (id, value) { var node = document.getElementById(id); if (node) node.textContent = value; };
      set('modalPhone', order.phone || '...');
      set('modalFrom', order.pickup || 'Vị trí khách');
      set('modalTo', order.dropoff || 'Chưa xác định');
      set('modalClientName', order.clientName || 'Khách đã thanh toán');
      set('modalCarType', order.carType === '7_seats' ? '7 Chỗ' : '4 Chỗ');
      set('tp-modal-timer-val', '15');
      var modal = document.getElementById('orderModal');
      if (modal) modal.style.display = 'flex';
      try {
        if (typeof countdownInterval !== 'undefined' && countdownInterval) clearInterval(countdownInterval);
        var countdown = 15;
        countdownInterval = setInterval(function () {
          countdown -= 1;
          set('tp-modal-timer-val', String(countdown));
          if (countdown <= 0) {
            clearInterval(countdownInterval);
            if (typeof window.declineOrder === 'function') window.declineOrder();
          }
        }, 1000);
      } catch (_) {}
      showPassengerResult('Đã tìm thấy khách gần nhất', (order.clientName || 'Khách') + ' · cách khoảng ' + Number(order._promaxDistance).toFixed(1) + ' km. Kiểm tra đơn rồi bấm ĐÓN KHÁCH.');
    } catch (_) {
      safeToast('Đã tìm thấy đơn gần nhất. Hãy chờ hộp nhận đơn hiển thị.');
    }
  }

  async function findPassenger() {
    if (state.passengerRequest) return;
    var position = getCurrentPosition();
    var online = true;
    var running = false;
    try { online = typeof isDriverOnline === 'undefined' ? true : Boolean(isDriverOnline); } catch (_) {}
    try { running = typeof isRunning === 'undefined' ? false : Boolean(isRunning); } catch (_) {}
    if (!online) { safeToast('Hãy chuyển sang Online để tìm khách.'); return; }
    if (running) { safeToast('Đang chạy chuyến, chưa thể tìm thêm khách.'); return; }
    if (!driverCanSearch()) { safeToast('Tài khoản đang bị khóa nhận đơn.'); return; }
    if (!position) { safeToast('Chưa có vị trí GPS. Hãy bấm icon GPS để kiểm tra.'); return; }

    var database = getDatabase();
    if (!database) {
      safeToast('Hệ thống dữ liệu chưa sẵn sàng. Vui lòng thử lại.');
      return;
    }

    state.passengerRequest = true;
    safeToast('Đang tìm khách đã thanh toán gần anh...');
    try {
      var snapshot = await database.ref('datxe').orderByChild('status').equalTo('waiting').limitToFirst(50).once('value');
      var orders = snapshot.val() || {};
      var best = null;
      Object.keys(orders).forEach(function (id) {
        var order = orders[id];
        if (!order || !orderIsPaid(order) || !order.pickupLat || !order.pickupLng) return;
        if (order.expiresAt && Number(order.expiresAt) <= Date.now()) return;
        var carClass = '';
        try { carClass = driverInfo && driverInfo.carClass; } catch (_) {}
        if (carClass && order.carType && order.carType !== carClass && order.carType !== 'both') return;
        var km = distanceKm(position.lat, position.lng, Number(order.pickupLat), Number(order.pickupLng));
        if (km > 5 || (best && km >= best.distance)) return;
        best = { id: id, order: order, distance: km };
      });
      if (!best) {
        showPassengerResult('Chưa có khách phù hợp', 'Khu vực hiện chưa có đơn đã thanh toán trong bán kính 5 km. Hệ thống sẽ không phân bổ khách chưa nạp tiền.');
        safeToast('Chưa có khách đã thanh toán gần vị trí hiện tại.');
      } else {
        best.order._promaxDistance = best.distance;
        showOrderInExistingModal(best.id, best.order);
        safeToast('Đã tìm thấy khách đã thanh toán gần nhất.');
      }
    } catch (_) {
      safeToast('Không thể tìm khách lúc này. Vui lòng thử lại sau.');
    } finally {
      state.passengerRequest = false;
    }
  }

  function toggleHeatmap() {
    if (state.heatmapVisible) {
      try {
        if (typeof heatmapLayers !== 'undefined' && Array.isArray(heatmapLayers) && typeof map !== 'undefined' && map) {
          heatmapLayers.forEach(function (layer) { try { map.removeLayer(layer); } catch (_) {} });
          heatmapLayers.length = 0;
        }
      } catch (_) {}
      state.heatmapVisible = false;
      safeToast('Đã ẩn bản đồ nhiệt.');
      return;
    }
    try {
      if (typeof window.openHeatmap === 'function') window.openHeatmap();
      else if (typeof openHeatmap === 'function') openHeatmap();
      state.heatmapVisible = true;
      safeToast('Đã hiển thị các điểm có khả năng đông khách.');
    } catch (_) {
      safeToast('Bản đồ nhiệt chưa sẵn sàng.');
    }
  }

  function openCare() {
    try {
      if (typeof window.openCareAI === 'function') window.openCareAI();
      else {
        var menuItem = document.getElementById('promaxCareMenuItem');
        if (menuItem) menuItem.click();
        else safeToast('Trợ lý AI đang khởi tạo, vui lòng thử lại.');
      }
    } catch (_) { safeToast('Trợ lý AI chưa sẵn sàng.'); }
  }

  function syncRateDisplay() {
    var slider = document.getElementById('priceSlider');
    if (!slider) return;
    var value = Number(slider.value) || 0;
    var formatted = value.toLocaleString('vi-VN') + 'đ/KM';
    var output = document.getElementById('sliderRateOutput');
    var current = document.getElementById('sliderRateValue');
    if (output) output.value = formatted;
    if (output) output.textContent = formatted;
    if (current) current.textContent = formatted;
    var toggle = document.getElementById('onlineToggleSwitch');
    var status = document.getElementById('onlineTextStatus');
    if (toggle && status) toggle.setAttribute('aria-checked', status.textContent.trim().toLowerCase() === 'online' ? 'true' : 'false');
  }

  function bindActions() {
    var slider = document.getElementById('priceSlider');
    if (slider && !slider.dataset.promaxRateBound) {
      slider.dataset.promaxRateBound = '1';
      slider.addEventListener('input', syncRateDisplay);
    }
    syncRateDisplay();
    var actions = document.getElementById('promaxMapActions');
    if (actions && !actions.dataset.bound) {
      actions.dataset.bound = '1';
      var gps = actions.querySelector('[data-action="gps"]');
      var passenger = actions.querySelector('[data-action="passenger"]');
      var heatmap = actions.querySelector('[data-action="heatmap"]');
      if (gps) gps.addEventListener('click', openGpsGuide);
      if (passenger) passenger.addEventListener('click', findPassenger);
      if (heatmap) heatmap.addEventListener('click', toggleHeatmap);
    }
    var care = document.getElementById('promaxCareAction');
    if (care && !care.dataset.bound) { care.dataset.bound = '1'; care.addEventListener('click', openCare); }
    var hail = document.getElementById('promaxHailAction');
    if (hail && !hail.dataset.bound) { hail.dataset.bound = '1'; hail.addEventListener('click', function () { if (typeof window.handleTrip === 'function') window.handleTrip(); }); }
    var order = document.getElementById('promaxOrderAction');
    if (order && !order.dataset.bound) { order.dataset.bound = '1'; order.addEventListener('click', findPassenger); }
  }

  window.PromaxMapUI = {
    openGpsGuide: openGpsGuide,
    findPassenger: findPassenger,
    toggleHeatmap: toggleHeatmap,
    openCare: openCare,
    detectDevice: detectDevice
  };
  window.openPromaxGpsGuide = openGpsGuide;
  window.findPromaxPassenger = findPassenger;
  window.togglePromaxHeatmap = toggleHeatmap;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindActions);
  else bindActions();
  setInterval(bindActions, 1000);
  console.log('✅ ProMax Map UI v6 loaded');
})(window, document);
