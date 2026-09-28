/**
 * Taxi ProMax — Trip State Manager (thin bridge)
 * Keeps trip status helpers available under clean filename.
 */
;(function (window) {
  'use strict';
  if (window.TripStateManager) return;
  window.TripStateManager = {
    getStatus: function () {
      return (window.tripEngine && typeof window.tripEngine.getStatus === 'function')
        ? window.tripEngine.getStatus()
        : (window.navigationMode || 'idle');
    },
    isActive: function () {
      var s = this.getStatus();
      return s && s !== 'idle' && s !== 'IDLE' && s !== 'completed';
    }
  };
  console.log('✅ TripStateManager loaded');
})(window);
