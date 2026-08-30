/**
 * Taxi ProMax — Street Hail Handler v2.0
 * Luồng CHUYẾN VẪY: start → GPS km → end (min 20.000đ)
 * UI chỉ qua TripUIHandler.showStreetHail (nút KẾT THÚC, ẩn ĐÃ ĐÓN/CHỈ ĐƯỜNG)
 */
;(function (window, document) {
  'use strict';

  var state = {
    isActive: false,
    totalKm: 0,
    startTime: null,
    lastLat: null,
    lastLng: null,
    lastTick: 0,
    timer: null,
    minFare: 20000,
    defaultRate: 15000
  };

  function rate() {
    try {
      if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.getRate === 'function') {
        var r = Number(window.PromaxLegacyRuntime.getRate());
        if (r > 0) return r;
      }
    } catch (e) {}
    var slider = document.getElementById('priceSlider');
    if (slider && Number(slider.value) > 0) return Number(slider.value);
    return state.defaultRate;
  }

  function haversine(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function fareLive(km) {
    km = Number(km) || 0;
    if (km <= 0) return 0;
    return Math.round(km * rate());
  }

  function fareFinal(km) {
    var f = Math.round((Number(km) || 0) * rate());
    if (f < state.minFare) f = state.minFare;
    return f;
  }

  function paint() {
    var km = state.totalKm;
    var f = fareLive(km);
    if (window.TripUIHandler && typeof window.TripUIHandler.setFare === 'function') {
      window.TripUIHandler.setFare(km, f);
    } else {
      var kmEl = document.getElementById('km');
      var costEl = document.getElementById('cost');
      var live = document.getElementById('tripKmLive');
      var price = document.getElementById('tripPrice');
      if (kmEl) kmEl.textContent = km.toFixed(2);
      if (costEl) costEl.textContent = f.toLocaleString('vi-VN');
      if (live) live.textContent = km.toFixed(2) + ' KM';
      if (price) price.textContent = f.toLocaleString('vi-VN') + 'đ';
    }
  }

  function assertStreetUI() {
    if (!state.isActive) return;
    if (window.TripUIHandler && typeof window.TripUIHandler.showStreetHail === 'function') {
      window.TripUIHandler.showStreetHail({
        status: 'ĐANG CHẠY CHUYẾN',
        clientName: 'Khách vẫy',
        clientPhone: '---',
        from: 'Vị trí hiện tại',
        to: 'Chưa xác định'
      });
    }
    paint();
  }

  function onGPS(lat, lng) {
    if (!state.isActive || lat == null || lng == null) return;
    lat = Number(lat); lng = Number(lng);
    if (!isFinite(lat) || !isFinite(lng)) return;
    if (state.lastLat != null && state.lastLng != null) {
      var d = haversine(state.lastLat, state.lastLng, lat, lng);
      if (d >= 0.005 && d < 0.45) state.totalKm += d;
    }
    state.lastLat = lat;
    state.lastLng = lng;
    paint();
  }

  function saveHistory(km, cost) {
    if (typeof window.saveHistory === 'function') {
      try {
        window.saveHistory(km, cost.toLocaleString('vi-VN'), cost, 'STREET_HAIL');
        return;
      } catch (e) {}
    }
    try {
      var history = JSON.parse(localStorage.getItem('trip_history') || '[]');
      history.unshift({
        km: km,
        cost: cost,
        costLabel: cost.toLocaleString('vi-VN') + 'đ',
        time: new Date().toLocaleString('vi-VN'),
        timestamp: Date.now(),
        rate: rate(),
        driverId: (window.driverInfo && window.driverInfo.uid) || 'local',
        tripType: 'STREET_HAIL'
      });
      localStorage.setItem('trip_history', JSON.stringify(history.slice(0, 200)));
    } catch (e) {}
  }

  function startStreetHail() {
    if (state.isActive) {
      confirmEnd();
      return true;
    }
    if (window.AppTripHandler && typeof window.AppTripHandler.isRunning === 'function' && window.AppTripHandler.isRunning()) {
      if (typeof window.showToast === 'function') window.showToast('Đang có chuyến app — hãy kết thúc trước');
      return false;
    }

    state.isActive = true;
    state.totalKm = 0;
    state.startTime = Date.now();
    state.lastLat = window.currentLat != null ? Number(window.currentLat) : null;
    state.lastLng = window.currentLng != null ? Number(window.currentLng) : null;

    assertStreetUI();
    paint();

    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(assertStreetUI, 1500);

    var wish = document.getElementById('wishModal');
    if (wish) wish.style.display = 'flex';

    if (typeof window.showToast === 'function') window.showToast('Chuyến vẫy đã bắt đầu');
    if (typeof window.speak === 'function') window.speak('Bắt đầu chuyến vẫy');
    if (window.TripStateManager && window.TripStateManager.setState) {
      try { window.TripStateManager.setState('STREET_HAIL'); } catch (e) {}
    }
    return true;
  }

  function confirmEnd() {
    if (!state.isActive) return;
    var go = function () { endStreetHail(); };
    if (typeof window.showConfirmDialog === 'function') {
      window.showConfirmDialog('Kết thúc chuyến vẫy?', go);
    } else if (window.confirm('Kết thúc chuyến vẫy?')) go();
  }

  function endStreetHail() {
    if (!state.isActive) {
      if (typeof window.showToast === 'function') window.showToast('Không có chuyến vẫy đang chạy');
      return false;
    }
    if (state.timer) { clearInterval(state.timer); state.timer = null; }

    var km = state.totalKm;
    var cost = fareFinal(km);
    saveHistory(km, cost);

    state.isActive = false;
    state.totalKm = 0;
    state.startTime = null;
    state.lastLat = null;
    state.lastLng = null;

    if (window.TripUIHandler && window.TripUIHandler.showEndModal) {
      window.TripUIHandler.showEndModal(km, cost, 'STREET_HAIL');
    }
    if (window.TripUIHandler && window.TripUIHandler.hideTripPanel) {
      window.TripUIHandler.hideTripPanel();
    }

    if (typeof window.showToast === 'function') window.showToast('Đã kết thúc — ' + cost.toLocaleString('vi-VN') + 'đ');
    if (typeof window.speak === 'function') window.speak('Kết thúc chuyến');
    if (window.TripStateManager && window.TripStateManager.setState) {
      try { window.TripStateManager.setState('IDLE'); } catch (e) {}
    }
    return true;
  }

  // GPS bridge
  var prevProcess = window.processBackgroundLocation;
  window.processBackgroundLocation = function (loc) {
    try {
      if (loc && state.isActive) {
        var lat = loc.lat != null ? loc.lat : loc.latitude;
        var lng = loc.lng != null ? loc.lng : loc.longitude;
        onGPS(lat, lng);
      }
    } catch (e) {}
    if (typeof prevProcess === 'function') return prevProcess.apply(this, arguments);
  };
  setInterval(function () {
    if (state.isActive && window.currentLat != null && window.currentLng != null) {
      onGPS(window.currentLat, window.currentLng);
    }
  }, 2500);

  window.StreetHailHandler = {
    start: startStreetHail,
    end: endStreetHail,
    onGPSUpdate: onGPS,
    isActive: function () { return state.isActive; },
    getTotalKm: function () { return state.totalKm; },
    getFare: function () { return state.isActive ? fareLive(state.totalKm) : 0 }
  };
  window.startStreetHail = startStreetHail;
  window.endStreetHail = endStreetHail;

  console.log('StreetHailHandler v2.0 loaded');
})(window, document);
