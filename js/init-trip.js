/*
 * Taxi ProMax — Driver Flow UI Adapter
 *
 * Đây là adapter duy nhất giữa onclick cũ trong index.html và Trip Engine.
 * UI không tự sửa isRunning/hasPickedUp; mọi thay đổi state đi qua engine.
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

  function bindLegacyActions() {
    const current = engine();
    if (!current || window.__promaxFlowAdapterBound) return Boolean(current);
    window.__promaxFlowAdapterBound = true;

    // Main button: start a street-hail flow or ask to complete the active fare.
    window.handleTrip = function () {
      if (current.getCurrentState() === window.TRIP_STATE.FARE_CALCULATING) {
        return current.showCompletionConfirmation();
      }
      return current.startStreetHail();
    };

    // The order modal is still rendered by the legacy UI. The legacy accept
    // handler performs the Firebase transaction; the engine then owns state.
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
      return result;
    };

    window.navigateToPickup = function () {
      return current.openNavigation('pickup');
    };

    window.confirmPickup = function () {
      return current.confirmPickup();
    };

    window.showConfirmComplete = function () {
      if (current.getCurrentState() !== window.TRIP_STATE.FARE_CALCULATING) {
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
      };
      dialog.style.display = 'flex';
      return true;
    };

    window.completeTrip = function () {
      return current.completeTrip();
    };

    window.startDestinationRoute = function (destination) {
      return current.selectDestination(destination);
    };

    window.cancelTrip = function (reason) {
      return current.cancelTrip(reason || 'Tài xế hủy chuyến');
    };

    return true;
  }

  function bindExtraButtons() {
    const current = engine();
    if (!current) return;

    const arrived = document.getElementById('btn-arrived') || document.querySelector('[data-action="arrived"]');
    if (arrived && !arrived.dataset.flowBound) {
      arrived.dataset.flowBound = '1';
      arrived.addEventListener('click', () => current.arrivedAtPickup());
    }

    const onboard = document.getElementById('btn-start-trip') || document.querySelector('[data-action="start"]');
    if (onboard && !onboard.dataset.flowBound) {
      onboard.dataset.flowBound = '1';
      onboard.addEventListener('click', () => current.passengerOnboard());
    }

    const complete = document.getElementById('btn-complete') || document.querySelector('[data-action="complete"]');
    if (complete && !complete.dataset.flowBound) {
      complete.dataset.flowBound = '1';
      complete.addEventListener('click', () => current.showCompletionConfirmation());
    }

    const cancel = document.getElementById('btn-cancel') || document.querySelector('[data-action="cancel"]');
    if (cancel && !cancel.dataset.flowBound) {
      cancel.dataset.flowBound = '1';
      cancel.addEventListener('click', () => current.cancelTrip('Tài xế hủy chuyến'));
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
    document.documentElement.setAttribute('data-trip-state', status);
    document.documentElement.setAttribute('data-navigation-mode', mode);
  }

  function init() {
    if (!bindLegacyActions()) return;
    bindExtraButtons();
    setInterval(bindExtraButtons, 1000);
    document.addEventListener('trip:status', syncVisibleState);
    syncVisibleState();
    console.log('✅ driver flow adapter: UI → Trip Engine');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
