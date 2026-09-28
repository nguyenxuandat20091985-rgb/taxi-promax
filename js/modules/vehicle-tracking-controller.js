/**
 * Taxi ProMax — Vehicle Tracking Controller (minimal wire-up)
 * Connects GPS fixes from core-runtime to PromaxMap marker + camera.
 * No change to GPS / fare / trip logic.
 */
;(function (window, document) {
  'use strict';

  var state = {
    lat: null,
    lng: null,
    heading: 0,
    isFollowing: true,
    lastPan: 0
  };

  function getMap() {
    if (window.map) return window.map;
    if (window.PromaxMap && typeof window.PromaxMap.ensure === 'function') {
      return window.PromaxMap.ensure();
    }
    return null;
  }

  function updateVehiclePosition(lat, lng, meta) {
    lat = Number(lat);
    lng = Number(lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    state.lat = lat;
    state.lng = lng;
    var heading = meta && meta.heading != null ? Number(meta.heading) : state.heading;
    if (Number.isFinite(heading)) state.heading = heading;

    // Prefer PromaxMap owner
    if (window.PromaxMap && typeof window.PromaxMap.updateDriverMarker === 'function') {
      window.PromaxMap.updateDriverMarker(lat, lng, state.heading);
    } else if (window.driverMarker && typeof window.driverMarker.setLatLng === 'function') {
      window.driverMarker.setLatLng([lat, lng]);
    }

    // Follow camera (throttled)
    var map = getMap();
    if (map && state.isFollowing) {
      var now = Date.now();
      if (now - state.lastPan > 800) {
        state.lastPan = now;
        try {
          map.panTo([lat, lng], { animate: true, duration: 0.5 });
        } catch (e) {
          try { map.setView([lat, lng], map.getZoom()); } catch (e2) {}
        }
      }
    }

    window.currentLat = lat;
    window.currentLng = lng;
    window.currentHeading = state.heading;
  }

  function notifyGpsLost() {
    // no-op UI; core-runtime already updates GPS status text
  }

  function setFollow(follow) {
    state.isFollowing = !!follow;
    if (state.isFollowing && state.lat != null) {
      updateVehiclePosition(state.lat, state.lng, { heading: state.heading });
    }
  }

  window.VehicleTrackingController = {
    updateVehiclePosition: updateVehiclePosition,
    notifyGpsLost: notifyGpsLost,
    setFollow: setFollow,
    toggleFollow: function () { setFollow(!state.isFollowing); },
    getState: function () {
      return {
        lat: state.lat,
        lng: state.lng,
        heading: state.heading,
        isFollowing: state.isFollowing,
        hasFix: state.lat != null
      };
    },
    onCoreAcceptedPosition: function (data) {
      if (data) updateVehiclePosition(data.lat, data.lng, data);
    }
  };

  console.log('✅ VehicleTrackingController minimal wire-up loaded');
})(window, document);
