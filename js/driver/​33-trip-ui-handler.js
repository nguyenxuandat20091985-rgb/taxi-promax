/**
 * Taxi ProMax — Trip UI Handler v2.0
 * UI trung tâm cho 3 luồng: STREET_HAIL | APP_WITH_DEST | APP_NO_DEST
 * Không chứa lý nghiệp vụ — chỉ hiện/ẩn panel & nút.
 */
;(function (window, document) {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function q(sel) { return document.querySelector(sel); }

  function setDisplay(el, value) {
    if (!el) return;
    if (value === 'none') el.style.setProperty('display', 'none', 'important');
    else el.style.setProperty('display', value, 'important');
  }

  function setBodyMode(mode) {
    // mode: '' | 'street-hail' | 'app-trip'
    document.body.classList.toggle('trip-active', !!mode);
    document.body.classList.toggle('trip-street-hail', mode === 'street-hail');
    document.body.classList.toggle('trip-app', mode === 'app-trip');
    document.documentElement.setAttribute('data-trip-mode', mode || '');
  }

  const UI = {
    mainBtn: function () { return $('mainBtn'); },
    homeControls: function () { return $('homeControls'); },
    tripPanel: function () { return $('tripInfoPanel'); },
    statsUI: function () { return $('statsUI'); },
    statusText: function () { return $('tripStatusText'); },
    clientName: function () { return $('tripClientName'); },
    clientPhone: function () { return $('tripClientPhone'); },
    from: function () { return $('tripFrom'); },
    to: function () { return $('tripTo'); },
    price: function () { return $('tripPrice'); },
    kmLive: function () { return $('tripKmLive'); },
    carType: function () { return $('tripCarType'); },
    actionButtons: function () { return $('tripActionButtons'); },
    pickupBtn: function () { return $('pickupBtn'); },
    navBtn: function () { return $('navToPickupBtn'); },
    endBtn: function () { return $('endTripBtn'); },
    navGrid: function () { return q('.nav-grid'); },
    brand: function () { return q('.brand-footer'); },
    km: function () { return $('km'); },
    cost: function () { return $('cost'); },
    destInputWrap: function () { return $('tripDestInputWrap'); }
  };

  function ensureDestInput() {
    var wrap = UI.destInputWrap();
    if (wrap) return wrap;
    var panel = UI.tripPanel();
    if (!panel) return null;
    wrap = document.createElement('div');
    wrap.id = 'tripDestInputWrap';
    wrap.className = 'trip-dest-input-wrap';
    wrap.innerHTML =
      '<label class="trip-dest-label">Nhập điểm đến</label>' +
      '<div class="trip-dest-row">' +
      '<input id="tripDestInput" class="trip-dest-input" type="text" placeholder="Địa chỉ điểm đến..." />' +
      '<button type="button" id="tripDestConfirmBtn" class="trip-dest-btn">Xác nhận</button>' +
      '</div>';
    var endBtn = UI.endBtn();
    if (endBtn && endBtn.parentNode === panel) panel.insertBefore(wrap, endBtn);
    else panel.appendChild(wrap);
    setDisplay(wrap, 'none');
    return wrap;
  }

  function ensureStickyEnd() {
    var sticky = $('streetHailEndSticky');
    if (!sticky) {
      sticky = document.createElement('button');
      sticky.id = 'streetHailEndSticky';
      sticky.type = 'button';
      sticky.className = 'trip-end-sticky';
      sticky.textContent = 'KẾT THÚC CHUYẾN ĐI';
      document.body.appendChild(sticky);
    }
    return sticky;
  }

  function hideChrome() {
    setDisplay(UI.homeControls(), 'none');
    setDisplay(UI.navGrid(), 'none');
    setDisplay(UI.brand(), 'none');
    var panel = UI.tripPanel();
    setDisplay(panel, 'block');
    if (UI.statsUI()) UI.statsUI().classList.add('show');
  }

  function showChrome() {
    setDisplay(UI.homeControls(), 'block');
    setDisplay(UI.tripPanel(), 'none');
    if (UI.statsUI()) UI.statsUI().classList.remove('show');
    var nav = UI.navGrid();
    if (nav) nav.style.setProperty('display', 'flex', 'important');
    var brand = UI.brand();
    if (brand) brand.style.setProperty('display', 'block', 'important');
    setBodyMode('');
    setDisplay(ensureStickyEnd(), 'none');
    var wrap = UI.destInputWrap();
    if (wrap) setDisplay(wrap, 'none');
  }

  function setInfo(data) {
    data = data || {};
    if (UI.statusText() && data.status) UI.statusText().textContent = data.status;
    if (UI.clientName() && data.clientName != null) UI.clientName().textContent = data.clientName;
    if (UI.clientPhone() && data.clientPhone != null) UI.clientPhone().textContent = data.clientPhone;
    if (UI.from() && data.from != null) UI.from().textContent = data.from;
    if (UI.to() && data.to != null) UI.to().textContent = data.to;
    if (UI.carType() && data.carType != null) UI.carType().textContent = data.carType;
  }

  function setFare(km, fare) {
    km = Number(km) || 0;
    fare = Number(fare) || 0;
    if (UI.km()) UI.km().textContent = km.toFixed(2);
    if (UI.cost()) UI.cost().textContent = fare.toLocaleString('vi-VN');
    if (UI.kmLive()) UI.kmLive().textContent = km.toFixed(2) + ' KM';
    if (UI.price()) UI.price().textContent = fare.toLocaleString('vi-VN') + 'đ';
  }

  /** STREET HAIL: chỉ nút kết thúc */
  function showStreetHail(data) {
    setBodyMode('street-hail');
    hideChrome();
    setInfo(Object.assign({
      status: 'ĐANG CHẠY CHUYẾN',
      clientName: 'Khách vẫy',
      clientPhone: '---',
      from: 'Vị trí hiện tại',
      to: 'Chưa xác định'
    }, data || {}));
    setDisplay(UI.actionButtons(), 'none');
    setDisplay(UI.pickupBtn(), 'none');
    setDisplay(UI.navBtn(), 'none');
    var wrap = ensureDestInput();
    if (wrap) setDisplay(wrap, 'none');

    var endHandler = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (typeof window.endStreetHail === 'function') window.endStreetHail();
      else if (window.StreetHailHandler) window.StreetHailHandler.end();
    };

    var endBtn = UI.endBtn();
    if (endBtn) {
      endBtn.textContent = 'KẾT THÚC CHUYẾN ĐI';
      endBtn.onclick = endHandler;
      setDisplay(endBtn, 'block');
    }
    var sticky = ensureStickyEnd();
    sticky.textContent = 'KẾT THÚC CHUYẾN ĐI';
    sticky.onclick = endHandler;
    setDisplay(sticky, 'block');
  }

  /** APP: giai đoạn đến điểm đón — ĐÃ ĐÓN + CHỈ ĐƯỜNG */
  function showAppPickup(data, handlers) {
    handlers = handlers || {};
    setBodyMode('app-trip');
    hideChrome();
    setInfo(Object.assign({ status: 'ĐANG ĐẾN ĐIỂM ĐÓN' }, data || {}));
    setDisplay(UI.actionButtons(), 'flex');
    var pickup = UI.pickupBtn();
    var nav = UI.navBtn();
    if (pickup) {
      pickup.textContent = handlers.pickupText || 'ĐÃ ĐÓN KHÁCH';
      pickup.onclick = handlers.onPickup || null;
      setDisplay(pickup, 'block');
    }
    if (nav) {
      nav.textContent = handlers.navText || 'CHỈ ĐƯỜNG ĐÓN';
      nav.onclick = handlers.onNav || null;
      setDisplay(nav, 'block');
    }
    setDisplay(UI.endBtn(), 'none');
    setDisplay(ensureStickyEnd(), 'none');
    var wrap = ensureDestInput();
    if (wrap) setDisplay(wrap, 'none');
  }

  /** APP: đã đón, có điểm đến — chỉ KẾT THÚC */
  function showAppRunning(data, onEnd) {
    setBodyMode('app-trip');
    hideChrome();
    setInfo(Object.assign({ status: 'ĐANG CHẠY CHUYẾN' }, data || {}));
    setDisplay(UI.actionButtons(), 'none');
    var wrap = ensureDestInput();
    if (wrap) setDisplay(wrap, 'none');
    var endHandler = onEnd || function () {
      if (typeof window.showConfirmComplete === 'function') window.showConfirmComplete();
    };
    var endBtn = UI.endBtn();
    if (endBtn) {
      endBtn.textContent = 'KẾT THÚC CHUYẾN ĐI';
      endBtn.onclick = endHandler;
      setDisplay(endBtn, 'block');
    }
    var sticky = ensureStickyEnd();
    sticky.textContent = 'KẾT THÚC CHUYẾN ĐI';
    sticky.onclick = endHandler;
    setDisplay(sticky, 'block');
  }

  /** APP: đã đón, CHƯA có điểm đến — hiện ô nhập */
  function showAppWaitDestination(data, onConfirmDest) {
    setBodyMode('app-trip');
    hideChrome();
    setInfo(Object.assign({
      status: 'CHỜ NHẬP ĐIỂM ĐẾN',
      to: 'Chưa xác định'
    }, data || {}));
    setDisplay(UI.actionButtons(), 'none');
    setDisplay(UI.endBtn(), 'none');
    setDisplay(ensureStickyEnd(), 'none');
    var wrap = ensureDestInput();
    if (wrap) setDisplay(wrap, 'block');
    var input = $('tripDestInput');
    var btn = $('tripDestConfirmBtn');
    if (btn) {
      btn.onclick = function () {
        var addr = input ? String(input.value || '').trim() : '';
        if (!addr) {
          if (typeof window.showToast === 'function') window.showToast('Vui lòng nhập điểm đến');
          return;
        }
        if (typeof onConfirmDest === 'function') onConfirmDest(addr);
      };
    }
  }

  function showEndModal(km, fare, tripType) {
    var summary = $('endSummary');
    if (summary) {
      var label = tripType === 'STREET_HAIL' ? 'Chuyến vẫy' : 'Chuyến app';
      summary.innerHTML =
        'Quãng đường: <b>' + (Number(km) || 0).toFixed(2) + ' KM</b><br>' +
        'Tổng: <b style="color:var(--primary);font-size:20px;">' +
        (Number(fare) || 0).toLocaleString('vi-VN') + 'đ</b><br>' +
        '<span style="font-size:11px;">' + label + '</span>';
    }
    var modal = $('endModal');
    if (modal) modal.style.display = 'flex';
  }

  function hideEndModal() {
    var modal = $('endModal');
    if (modal) modal.style.display = 'none';
  }

  window.TripUIHandler = {
    showStreetHail: showStreetHail,
    showAppPickup: showAppPickup,
    showAppRunning: showAppRunning,
    showAppWaitDestination: showAppWaitDestination,
    hideTripPanel: showChrome,
    setInfo: setInfo,
    setFare: setFare,
    showEndModal: showEndModal,
    hideEndModal: hideEndModal,
    setBodyMode: setBodyMode,
    // backward compat
    showTripPanel: function (type, data) {
      if (type === 'STREET_HAIL') showStreetHail(data);
      else showAppPickup(data);
    },
    showEndButton: function (cb) {
      var endBtn = UI.endBtn();
      if (endBtn) {
        endBtn.onclick = cb || null;
        setDisplay(endBtn, 'block');
      }
      var sticky = ensureStickyEnd();
      sticky.onclick = cb || null;
      setDisplay(sticky, 'block');
    },
    hideEndButton: function () {
      setDisplay(UI.endBtn(), 'none');
      setDisplay(ensureStickyEnd(), 'none');
    },
    hideActionButtons: function () {
      setDisplay(UI.actionButtons(), 'none');
    },
    showActionButtons: function (cfg) {
      showAppPickup({}, {
        onPickup: cfg && cfg.pickupCallback,
        onNav: cfg && cfg.navCallback,
        pickupText: cfg && cfg.pickupText,
        navText: cfg && cfg.navText
      });
    }
  };

  console.log('TripUIHandler v2.0 loaded');
})(window, document);
