/*
 * Taxi ProMax — Driver Flow UI Adapter V6.1
 * Nối UI ↔ Trip Engine. Không đổi state trước dialog xác nhận.
 */
;(function (window, document) {
  'use strict';

  function engine() {
    return window.tripEngine || null;
  }

  function legacy() {
    return window.PromaxLegacyRuntime || null;
  }

  function toast(message) {
    if (typeof window.showToast === 'function') window.showToast(message);
  }

  function publishDom(detail) {
    const current = engine();
    const status = (detail && detail.status) || (current && current.getCurrentState && current.getCurrentState()) || 'IDLE';
    const mode = (detail && detail.navigationMode) || (current && current.getNavigationMode && current.getNavigationMode()) || 'idle';
    const trip = current && current.getCurrentTrip && current.getCurrentTrip();
    const tripType = (trip && trip.type) || '';
    try {
      document.documentElement.setAttribute('data-trip-state', status);
      document.documentElement.setAttribute('data-navigation-mode', mode);
      document.documentElement.setAttribute('data-trip-type', tripType || '');
      document.documentElement.setAttribute(
        'data-fare-active',
        current && current.isFareActive && current.isFareActive() ? 'true' : 'false'
      );
      if (document.body) {
        document.body.setAttribute('data-trip-state', status);
        document.body.setAttribute('data-navigation-mode', mode);
        document.body.setAttribute('data-trip-type', tripType || '');
      }
    } catch (_) {}
  }

  function bindLegacyActions() {
    const current = engine();
    if (!current || window.__promaxFlowAdapterBound) return Boolean(current);
    window.__promaxFlowAdapterBound = true;

    window.handleTrip = function () {
      const st = current.getCurrentState();
      if (st === window.TRIP_STATE.FARE_CALCULATING || st === window.TRIP_STATE.ARRIVED_DESTINATION) {
        return current.showCompletionConfirmation();
      }
      if (st !== window.TRIP_STATE.IDLE) {
        toast('⚠️ Đang có chuyến — hãy kết thúc trước');
        return false;
      }
      return current.startStreetHail();
    };

    const legacyAccept = legacy() && legacy().acceptOrder;
    window.acceptOrder = async function () {
      if (typeof legacyAccept !== 'function') {
        toast('⚠️ Chưa sẵn sàng nhận đơn');
        return false;
      }
      const result = await legacyAccept();
      const context = legacy() && typeof legacy().getTripContext === 'function'
        ? legacy().getTripContext()
        : null;
      if (context && context.id && current.getCurrentState() === window.TRIP_STATE.IDLE) {
        current.beginAppTrip(context.id, context.data || {});
      }
      publishDom({});
      return result;
    };

    window.navigateToPickup = function () {
      return current.openNavigation('pickup');
    };

    window.navigateToDestination = function () {
      return current.openNavigation('destination');
    };

    window.confirmPickup = function () {
      const r = current.confirmPickup();
      publishDom({});
      return r;
    };

    window.arrivedAtPickup = function () {
      const r = current.arrivedAtPickup();
      publishDom({});
      return r;
    };

    window.passengerOnboard = function () {
      const r = current.passengerOnboard();
      publishDom({});
      return r;
    };

    window.arrivedAtDestination = function () {
      if (typeof current.arrivedAtDestination === 'function') {
        const r = current.arrivedAtDestination();
        publishDom({});
        return r;
      }
      return false;
    };

    // Dialog xác nhận — KHÔNG đổi state trước khi bấm Đồng ý
    window.showConfirmComplete = function () {
      const st = current.getCurrentState();
      const ok =
        st === window.TRIP_STATE.FARE_CALCULATING ||
        st === window.TRIP_STATE.ARRIVED_DESTINATION;
      if (!ok) {
        toast('⚠️ Chưa đến giai đoạn tính cước');
        return false;
      }
      const dialog = document.getElementById('confirmDialog');
      const message = document.getElementById('confirmMessage');
      const okBtn = document.getElementById('confirmOkBtn');
      if (!dialog || !okBtn) {
        return current.completeTrip();
      }
      if (message) message.textContent = 'Bạn có chắc chắn muốn kết thúc chuyến và chốt cước?';
      okBtn.onclick = function () {
        dialog.style.display = 'none';
        current.completeTrip();
        publishDom({ status: 'COMPLETED' });
      };
      dialog.style.display = 'flex';
      return true;
    };

    return true;
  }

  function bindExtraButtons() {
    const current = engine();
    if (!current) return;

    function once(el, key, fn) {
      if (!el || el.dataset[key]) return;
      el.dataset[key] = '1';
      el.addEventListener('click', fn);
    }

    once(document.getElementById('btn-arrived') || document.querySelector('[data-action="arrived"]'), 'flowBound', function () {
      current.arrivedAtPickup();
      publishDom({});
    });
    once(document.getElementById('btn-start-trip') || document.querySelector('[data-action="start"]'), 'flowBound', function () {
      current.passengerOnboard();
      publishDom({});
    });
    once(document.getElementById('btn-complete') || document.querySelector('[data-action="complete"]'), 'flowBound', function () {
      current.showCompletionConfirmation();
    });
    once(document.getElementById('btn-cancel') || document.querySelector('[data-action="cancel"]'), 'flowBound', function () {
      current.cancelTrip('Tài xế hủy chuyến');
      publishDom({});
    });
    once(document.getElementById('btn-arrived-dest') || document.querySelector('[data-action="arrived-dest"]'), 'flowBound', function () {
      if (typeof current.arrivedAtDestination === 'function') current.arrivedAtDestination();
      publishDom({});
    });
  }

  function syncVisibleState(event) {
    const current = engine();
    if (!current) return;
    const detail = event && event.detail ? event.detail : {};
    const status = detail.status || current.getCurrentState();
    const mode = detail.navigationMode || current.getNavigationMode();
    const statusEl = document.getElementById('tripStatusText');
    if (statusEl && typeof current.statusLabel === 'function') {
      statusEl.textContent = current.statusLabel();
    }
    publishDom({ status: status, navigationMode: mode });
  }

  function init() {
    if (!bindLegacyActions()) {
      setTimeout(init, 200);
      return;
    }
    bindExtraButtons();
    setInterval(bindExtraButtons, 1500);
    document.addEventListener('trip:status', syncVisibleState);
    document.addEventListener('trip:fare_started', syncVisibleState);
    document.addEventListener('trip:completed', function () {
      publishDom({ status: 'IDLE' });
    });
    document.addEventListener('trip:arrived_destination', syncVisibleState);
    syncVisibleState();
    console.log('✅ driver flow adapter V6.1');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
