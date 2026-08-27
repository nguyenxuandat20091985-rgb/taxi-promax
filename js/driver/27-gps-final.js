/*
 * Taxi ProMax — GPS final policy
 *
 * Không tạo watchPosition thứ hai. Core runtime đã có GPS watcher duy nhất,
 * cập nhật vị trí và chỉ cộng totalKm khi Trip Engine ở FARE_CALCULATING.
 */
;(function (window, document) {
  'use strict';

  function engine() {
    return window.tripEngine || null;
  }

  function isFareActive() {
    const current = engine();
    return !current || typeof current.isFareActive !== 'function' || current.isFareActive();
  }

  function updateFlowIndicator() {
    const current = engine();
    const mode = current && typeof current.getNavigationMode === 'function'
      ? current.getNavigationMode()
      : (window.navigationMode || 'idle');
    document.documentElement.setAttribute('data-navigation-mode', mode);
    document.documentElement.setAttribute('data-fare-active', isFareActive() ? 'true' : 'false');
  }

  function onTripStatus(event) {
    const status = event && event.detail ? event.detail.status : '';
    updateFlowIndicator();
    if (status === 'FARE_CALCULATING' && typeof window.showToast === 'function') {
      window.showToast('💰 Đã bắt đầu tính cước');
    }
  }

  window.PromaxGpsFinal = {
    isFareActive,
    updateFlowIndicator
  };
  document.addEventListener('trip:status', onTripStatus);
  updateFlowIndicator();
  console.log('✅ GPS FINAL v5 loaded — single GPS owner, fare-state guarded');
})(window, document);
