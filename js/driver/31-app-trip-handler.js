/**
 * Taxi ProMax — App Trip Handler v2.0
 * Luồng CHUYẾN APP:
 *  A) Có điểm đến: accept → đến đón → đón khách → chạy (tính cước) → kết thúc
 *  B) Không điểm đến: accept → đến đón → đón khách → nhập điểm đến → chạy → kết thúc
 */
;(function (window, document) {
  'use strict';

  var state = {
    isRunning: false,
    phase: 'idle', // idle | to_pickup | onboard | wait_dest | running
    orderId: null,
    order: null,
    totalKm: 0,
    fareActive: false,
    lastLat: null,
    lastLng: null,
    minFare: 20000,
    defaultRate: 15000,
    timer: null
  };

  function dbRef() {
    try {
      if (window.db && window.db.ref) return window.db;
      if (window.firebase && firebase.database) return firebase.database();
    } catch (e) {}
    return null;
  }

  function rate() {
    try {
      if (window.PromaxLegacyRuntime && window.PromaxLegacyRuntime.getRate) {
        var r = Number(window.PromaxLegacyRuntime.getRate());
        if (r > 0) return r;
      }
    } catch (e) {}
    var slider = document.getElementById('priceSlider');
    if (slider && Number(slider.value) > 0) return Number(slider.value);
    return state.defaultRate;
  }

  function haversine(a, b, c, d) {
    if (a == null || b == null || c == null || d == null) return 0;
    var R = 6371, dLat = (c - a) * Math.PI / 180, dLon = (d - b) * Math.PI / 180;
    var x = Math.sin(dLat / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  function fareLive(km) {
    km = Number(km) || 0;
    if (!state.fareActive || km <= 0) return 0;
    return Math.round(km * rate());
  }

  function fareFinal(km) {
    var f = Math.round((Number(km) || 0) * rate());
    if (f < state.minFare) f = state.minFare;
    return f;
  }

  function orderData() {
    var o = state.order || {};
    return {
      clientName: o.clientName || o.customerName || 'Khách app',
      clientPhone: o.phone || o.customerPhone || '---',
      from: o.pickup || o.pickupAddress || 'Điểm đón',
      to: o.dropoff || o.dropoffAddress || 'Chưa xác định',
      carType: o.carType === '7_seats' ? '7 Chỗ' : '4 Chỗ'
    };
  }

  function hasDestination(o) {
    o = o || state.order || {};
    var text = o.dropoff || o.dropoffAddress || '';
    var lat = o.dropoffLat;
    return !!(String(text).trim() || (lat != null && Number(lat) !== 0));
  }

  function paint() {
    var km = state.totalKm;
    var f = fareLive(km);
    if (window.TripUIHandler && window.TripUIHandler.setFare) window.TripUIHandler.setFare(km, f);
  }

  function updateFirebase(patch) {
    if (!state.orderId) return;
    var db = dbRef();
    if (!db) return;
    try {
      db.ref('datxe/' + state.orderId).update(patch).catch(function () {});
    } catch (e) {}
  }

  function showOrderModal(orderId, order) {
    state.orderId = orderId;
    state.order = order || {};
    var modal = document.getElementById('orderModal');
    if (!modal) return;
    var set = function (id, val) {
      var el = document.getElementById(id);
      if (el) el.textContent = val != null ? val : '...';
    };
    set('modalPhone', order.phone || order.customerPhone || '...');
    set('modalFrom', order.pickup || '...');
    set('modalTo', order.dropoff || order.dropoffAddress || 'Chưa có');
    set('modalClientName', order.clientName || order.customerName || '...');
    set('modalCarType', order.carType === '7_seats' ? '7 Chỗ' : '4 Chỗ');
    modal.style.display = 'flex';

    // countdown optional
    var tEl = document.getElementById('tp-modal-timer-val');
    if (tEl) {
      var left = 15;
      tEl.textContent = String(left);
      if (state._cd) clearInterval(state._cd);
      state._cd = setInterval(function () {
        left -= 1;
        tEl.textContent = String(left);
        if (left <= 0) {
          clearInterval(state._cd);
          declineOrder();
        }
      }, 1000);
    }
  }

  function closeModal() {
    var modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'none';
    if (state._cd) { clearInterval(state._cd); state._cd = null; }
  }

  function declineOrder() {
    closeModal();
    if (state.orderId) {
      updateFirebase({ status: 'waiting', driverId: null });
    }
    state.orderId = null;
    state.order = null;
    if (typeof window.showToast === 'function') window.showToast('Đã bỏ qua đơn');
  }

  function acceptOrder() {
    if (window.StreetHailHandler && window.StreetHailHandler.isActive && window.StreetHailHandler.isActive()) {
      if (typeof window.showToast === 'function') window.showToast('Đang chuyến vẫy — kết thúc trước');
      return false;
    }
    if (!state.orderId || !state.order) {
      if (typeof window.showToast === 'function') window.showToast('Không có đơn để nhận');
      return false;
    }
    closeModal();
    state.isRunning = true;
    state.phase = 'to_pickup';
    state.totalKm = 0;
    state.fareActive = false;
    state.lastLat = window.currentLat != null ? Number(window.currentLat) : null;
    state.lastLng = window.currentLng != null ? Number(window.currentLng) : null;

    var drv = window.driverInfo || {};
    updateFirebase({
      status: 'driving',
      driverId: drv.uid || null,
      driverName: drv.name || null,
      driverPhone: drv.phone || null,
      acceptedAt: Date.now()
    });

    if (window.PromaxLegacyRuntime && window.PromaxLegacyRuntime.setTripContext) {
      try { window.PromaxLegacyRuntime.setTripContext(state.orderId, state.order); } catch (e) {}
    }

    if (window.TripUIHandler && window.TripUIHandler.showAppPickup) {
      window.TripUIHandler.showAppPickup(Object.assign(orderData(), { status: 'ĐANG ĐẾN ĐIỂM ĐÓN' }), {
        onPickup: function () { passengerOnboard(); },
        onNav: function () { navigateToPickup(); },
        pickupText: 'ĐÃ ĐÓN KHÁCH',
        navText: 'CHỈ ĐƯỜNG ĐÓN'
      });
    }

    // route to pickup if coords
    if (state.order.pickupLat != null && state.order.pickupLng != null && typeof window.drawRoute === 'function') {
      try {
        window.drawRoute(window.currentLat, window.currentLng, state.order.pickupLat, state.order.pickupLng);
      } catch (e) {}
    }

    if (window.TripStateManager && window.TripStateManager.setState) {
      try { window.TripStateManager.setState('APP_TRIP'); } catch (e) {}
    }
    if (typeof window.showToast === 'function') window.showToast('Đã nhận đơn — đến điểm đón');
    return true;
  }

  function navigateToPickup() {
    var o = state.order || {};
    var lat = o.pickupLat;
    var lng = o.pickupLng;
    if (lat != null && lng != null) {
      window.open('https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng, '_blank');
      return;
    }
    var addr = o.pickup || o.pickupAddress;
    if (addr) window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(addr), '_blank');
    else if (typeof window.showToast === 'function') window.showToast('Chưa có toạ độ điểm đón');
  }

  function passengerOnboard() {
    if (!state.isRunning) return;
    state.phase = 'onboard';
    state.totalKm = 0;
    state.lastLat = window.currentLat != null ? Number(window.currentLat) : null;
    state.lastLng = window.currentLng != null ? Number(window.currentLng) : null;
    updateFirebase({ status: 'in_progress', onboardAt: Date.now() });

    if (hasDestination()) {
      startRunning();
    } else {
      state.phase = 'wait_dest';
      state.fareActive = false;
      if (window.TripUIHandler && window.TripUIHandler.showAppWaitDestination) {
        window.TripUIHandler.showAppWaitDestination(orderData(), function (addr) {
          selectDestination(addr);
        });
      }
      if (typeof window.showToast === 'function') window.showToast('Nhập điểm đến để bắt đầu tính cước');
    }
  }

  function selectDestination(address) {
    if (!state.isRunning) return;
    address = String(address || '').trim();
    if (!address) return;
    state.order = state.order || {};
    state.order.dropoff = address;
    state.order.dropoffAddress = address;
    updateFirebase({ dropoff: address, dropoffAddress: address });
    startRunning();
  }

  function startRunning() {
    state.phase = 'running';
    state.fareActive = true;
    state.totalKm = 0;
    state.lastLat = window.currentLat != null ? Number(window.currentLat) : null;
    state.lastLng = window.currentLng != null ? Number(window.currentLng) : null;

    if (window.TripUIHandler && window.TripUIHandler.showAppRunning) {
      window.TripUIHandler.showAppRunning(
        Object.assign(orderData(), { status: 'ĐANG CHẠY CHUYẾN', to: (state.order && (state.order.dropoff || state.order.dropoffAddress)) || 'Điểm đến' }),
        function () { showConfirmComplete(); }
      );
    }
    paint();
    if (typeof window.showToast === 'function') window.showToast('Đã đón khách — bắt đầu tính cước');
  }

  function showConfirmComplete() {
    if (!state.isRunning) return;
    var go = function () { completeTrip(); };
    if (typeof window.showConfirmDialog === 'function') {
      window.showConfirmDialog('Kết thúc chuyến app?', go);
    } else if (window.confirm('Kết thúc chuyến app?')) go();
  }

  function completeTrip() {
    if (!state.isRunning) return false;
    var km = state.totalKm;
    var cost = fareFinal(state.fareActive ? km : 0);

    updateFirebase({
      status: 'completed',
      completedAt: Date.now(),
      finalKm: km,
      finalCost: cost
    });

    if (typeof window.saveHistory === 'function') {
      try { window.saveHistory(km, cost.toLocaleString('vi-VN'), cost, 'APP_BOOKING'); } catch (e) {}
    }

    if (window.TripUIHandler && window.TripUIHandler.showEndModal) {
      window.TripUIHandler.showEndModal(km, cost, 'APP_BOOKING');
    }
    if (window.TripUIHandler && window.TripUIHandler.hideTripPanel) {
      window.TripUIHandler.hideTripPanel();
    }

    state.isRunning = false;
    state.phase = 'idle';
    state.orderId = null;
    state.order = null;
    state.totalKm = 0;
    state.fareActive = false;

    if (window.TripStateManager && window.TripStateManager.setState) {
      try { window.TripStateManager.setState('IDLE'); } catch (e) {}
    }
    if (typeof window.showToast === 'function') window.showToast('Hoàn thành — ' + cost.toLocaleString('vi-VN') + 'đ');
    return true;
  }

  function onGPS(lat, lng) {
    if (!state.isRunning || !state.fareActive) return;
    if (lat == null || lng == null) return;
    lat = Number(lat); lng = Number(lng);
    if (state.lastLat != null && state.lastLng != null) {
      var d = haversine(state.lastLat, state.lastLng, lat, lng);
      if (d >= 0.005 && d < 0.45) state.totalKm += d;
    }
    state.lastLat = lat;
    state.lastLng = lng;
    paint();
  }

  var prev = window.processBackgroundLocation;
  window.processBackgroundLocation = function (loc) {
    try {
      if (loc && state.isRunning) {
        onGPS(loc.lat != null ? loc.lat : loc.latitude, loc.lng != null ? loc.lng : loc.longitude);
      }
    } catch (e) {}
    if (typeof prev === 'function') return prev.apply(this, arguments);
  };
  setInterval(function () {
    if (state.isRunning && state.fareActive && window.currentLat != null) {
      onGPS(window.currentLat, window.currentLng);
    }
  }, 2500);

  // Global bindings for HTML onclick
  window.acceptOrder = function () {
    if (window.AppTripHandler) return window.AppTripHandler.accept();
  };
  window.confirmPickup = function () {
    if (window.AppTripHandler) return window.AppTripHandler.passengerOnboard();
  };
  window.navigateToPickup = function () {
    if (window.AppTripHandler) return window.AppTripHandler.navigateToPickup();
  };
  window.showConfirmComplete = function () {
    if (window.StreetHailHandler && window.StreetHailHandler.isActive && window.StreetHailHandler.isActive()) {
      return window.endStreetHail && window.endStreetHail();
    }
    if (window.AppTripHandler) return window.AppTripHandler.showConfirmComplete();
  };
  window.declineOrder = function () {
    if (window.AppTripHandler) return window.AppTripHandler.decline();
  };

  window.AppTripHandler = {
    showOrderModal: showOrderModal,
    accept: acceptOrder,
    acceptOrder: acceptOrder,
    decline: declineOrder,
    declineOrder: declineOrder,
    arrivedAtPickup: function () { /* optional mid-step */ },
    passengerOnboard: passengerOnboard,
    confirmPickup: passengerOnboard,
    selectDestination: selectDestination,
    navigateToPickup: navigateToPickup,
    completeTrip: completeTrip,
    showConfirmComplete: showConfirmComplete,
    onGPSUpdate: onGPS,
    isRunning: function () { return state.isRunning; },
    getPhase: function () { return state.phase; },
    getTotalKm: function () { return state.totalKm; }
  };

  console.log('AppTripHandler v2.0 loaded');
})(window, document);
