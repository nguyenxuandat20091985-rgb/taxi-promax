/*
 * Taxi ProMax — Driver Flow UI Adapter V6
 *
 * Nối onclick UI (index.html) với Trip Engine V6.
 * Đồng bộ data-trip-state / data-navigation-mode / data-trip-type lên document.
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
      document.documentElement.setAttribute('data-fare-active',
        current && current.isFareActive && current.isFareActive() ? 'true' : 'false');
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
      if (current.getCurrentState() === window.TRIP_STATE.FARE_CALCULATING ||
          current.getCurrentState() === window.TRIP_STATE.ARRIVED_DESTINATION) {
        return current.showCompletionConfirmation();
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
      return current.confirmPickup();
    };

    window.arrivedAtPickup = function () {
      return current.arrivedAtPickup();
    };

    window.passengerOnboard = function () {
      return current.passengerOnboard();
    };

    window.arrivedAtDestination = function () {
      if (typeof current.arrivedAtDestination === 'function') {
        return current.arrivedAtDestination();
      }
      return false;
    };

    window.showConfirmComplete = function () {
      const st = current.getCurrentState();
      const okStates = [
        window.TRIP_STATE.FARE_CALCULATING,
        window.TRIP_STATE.ARRIVED_DESTINATION,
        window.TRIP_STATE.COMPLETING
      ];
      if (okStates.indexOf(st) === -1) {
        toast('⚠️ Chưa đến giai đoạn tính cước');
        return false;
      }
      const dialog = document.getElementById('confirmDialog');
      const message = document.getElementById('confirmMessage');
      const ok = document.getElementById('confirmOkBtn');
      if (!dialog || !ok) return current.completeTrip();
      if (message) message.textContent = 'Bạn có chắc chắn muốn kết thúc chuyến và chốt cước?';
      ok.onclick = function () {
        dialog.style.display = 'none';
        current.completeTrip();
        publishDom({});
      };
      dialog.style.display = 'flex';
      return true;
    };

    return true;
  }

  function bindExtraButtons() {
    const current = engine();
    if (!current) return;

    const arrived = document.getElementById('btn-arrived') || document.querySelector('[data-action="arrived"]');
    if (arrived && !arrived.dataset.flowBound) {
      arrived.dataset.flowBound = '1';
      arrived.addEventListener('click', function () { current.arrivedAtPickup(); publishDom({}); });
    }

    const onboard = document.getElementById('btn-start-trip') || document.querySelector('[data-action="start"]');
    if (onboard && !onboard.dataset.flowBound) {
      onboard.dataset.flowBound = '1';
      onboard.addEventListener('click', function () { current.passengerOnboard(); publishDom({}); });
    }

    const complete = document.getElementById('btn-complete') || document.querySelector('[data-action="complete"]');
    if (complete && !complete.dataset.flowBound) {
      complete.dataset.flowBound = '1';
      complete.addEventListener('click', function () { current.showCompletionConfirmation(); });
    }

    const cancel = document.getElementById('btn-cancel') || document.querySelector('[data-action="cancel"]');
    if (cancel && !cancel.dataset.flowBound) {
      cancel.dataset.flowBound = '1';
      cancel.addEventListener('click', function () { current.cancelTrip('Tài xế hủy chuyến'); publishDom({}); });
    }

    const destArrive = document.getElementById('btn-arrived-dest') || document.querySelector('[data-action="arrived-dest"]');
    if (destArrive && !destArrive.dataset.flowBound) {
      destArrive.dataset.flowBound = '1';
      destArrive.addEventListener('click', function () {
        if (typeof current.arrivedAtDestination === 'function') current.arrivedAtDestination();
        publishDom({});
      });
    }
  }

  function syncVisibleState(event) {
    const current = engine();
    if (!current) return;
    const detail = event && event.detail ? event.detail : {};
    const status = detail.status || current.getCurrentState();
    const mode = detail.navigationMode || current.getNavigationMode();
    const statusEl = document.getElementById('tripStatusText');
    if (statusEl && typeof current.statusLabel === 'function') statusEl.textContent = current.statusLabel();
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
    document.addEventListener('trip:completed', function () { publishDom({ status: 'COMPLETED' }); });
    document.addEventListener('trip:arrived_destination', syncVisibleState);
    syncVisibleState();
    console.log('✅ driver flow adapter V6: UI → Trip Engine');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
