/*
 * Taxi ProMax — Leaflet map owner v2
 *
 * Map chỉ sở hữu một Leaflet instance và một vehicle marker. GPS core giữ
 * watchPosition/Kalman/anti-teleport/compensation/fare; VehicleTrackingController
 * quyết định follow camera. File này không mở GPS watcher.
 */
;(function (window, document) {
  'use strict';

  const DEFAULT_CENTER = [21.0285, 105.8542];
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_OPTIONS = { attribution: '© OpenStreetMap contributors', maxZoom: 19, crossOrigin: true };
  let mapInstance = null;
  let vehicleMarker = null;
  let customerMarker = null;
  let heading = null;

  function ensureMap() {
    if (mapInstance) return mapInstance;
    if (window.map && window.map._leaflet_id) {
      mapInstance = window.map;
      return mapInstance;
    }
    const container = document.getElementById('map');
    if (!container || !window.L) return null;
    if (container._leaflet_id && window.map) {
      mapInstance = window.map;
      return mapInstance;
    }
    mapInstance = window.L.map(container, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true
    }).setView(DEFAULT_CENTER, 16);
    window.L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(mapInstance);
    window.map = mapInstance;
    return mapInstance;
  }

  function vehicleIcon() {
    const rotation = heading == null ? 0 : Math.round(heading);
    return window.L.divIcon({
      className: 'sm-div-icon vehicle-marker-icon',
      html: `<div class="sm-marker-container"><div class="sm-direction-wrapper" style="transform:rotate(${rotation}deg)"><div class="sm-marker-arrow"></div><div class="sm-marker-circle"></div></div></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  function updateHeading() {
    if (!vehicleMarker) return;
    const element = vehicleMarker.getElement && vehicleMarker.getElement();
    const wrapper = element && element.querySelector('.sm-direction-wrapper');
    if (wrapper && heading != null) wrapper.style.transform = `rotate(${Math.round(heading)}deg)`;
    const compass = document.getElementById('tp-driver-compass') || document.getElementById('compass');
    if (compass && heading != null) compass.style.transform = `rotate(${Math.round(heading)}deg)`;
  }

  function setVehicleMarker(lat, lng, nextHeading) {
    const currentMap = ensureMap();
    lat = Number(lat);
    lng = Number(lng);
    if (!currentMap || !window.L || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (nextHeading != null && Number.isFinite(Number(nextHeading))) heading = Number(nextHeading);
    if (!vehicleMarker) {
      vehicleMarker = window.L.marker([lat, lng], {
        icon: vehicleIcon(),
        zIndexOffset: 1000,
        keyboard: false
      }).addTo(currentMap);
      currentMap.setView([lat, lng], Math.max(currentMap.getZoom(), 16), { animate: false });
    } else {
      // Không tạo marker mới ở mỗi GPS fix: chỉ di chuyển marker hiện hữu.
      vehicleMarker.setLatLng([lat, lng]);
      updateHeading();
    }
    return true;
  }

  function removeVehicleMarker() {
    const currentMap = ensureMap();
    if (currentMap && vehicleMarker) currentMap.removeLayer(vehicleMarker);
    vehicleMarker = null;
  }

  function setupCustomerMarker(lat, lng, clientName) {
    const currentMap = ensureMap();
    lat = Number(lat);
    lng = Number(lng);
    if (!currentMap || !window.L || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (customerMarker) currentMap.removeLayer(customerMarker);
    const icon = window.L.divIcon({
      className: 'cust-div-icon',
      html: '<div class="customer-marker">🧍</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
    customerMarker = window.L.marker([lat, lng], { icon }).addTo(currentMap);
    const safeName = String(clientName || 'Khách vãng lai').replace(/[<>]/g, '');
    customerMarker.bindTooltip(`<b>Khách: ${safeName}</b>`).openTooltip();
    if (vehicleMarker && typeof window.L.featureGroup === 'function') {
      currentMap.fitBounds(window.L.featureGroup([vehicleMarker, customerMarker]).getBounds().pad(0.3));
    }
    return customerMarker;
  }

  function clearCustomerMarker() {
    const currentMap = ensureMap();
    if (currentMap && customerMarker) currentMap.removeLayer(customerMarker);
    customerMarker = null;
  }

  function openDirections(lat, lng) {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return false;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=driving`, '_blank');
    return true;
  }

  function startTracking() {
    // Tương thích API cũ nhưng cố ý không mở watcher phụ.
    return false;
  }

  function updateMarkerRotation(nextHeading) {
    if (nextHeading != null && Number.isFinite(Number(nextHeading))) heading = Number(nextHeading);
    updateHeading();
  }

  window.PromaxMap = {
    instance: ensureMap(),
    ensure: ensureMap,
    setVehicleMarker,
    updateDriverMarker: setVehicleMarker,
    removeVehicleMarker,
    setupCustomerMarker,
    clearCustomerMarker,
    startTracking,
    openDirections,
    getVehicleMarker: function () { return vehicleMarker; }
  };
  window.updateMarkerRotation = updateMarkerRotation;
  window.setupCustomerMarker = setupCustomerMarker;
  window.startTracking = startTracking;
  window.syncDriverLocationToFirebase = window.syncDriverLocationToFirebase || function () {};

  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', function (event) {
      const next = event.webkitCompassHeading != null
        ? event.webkitCompassHeading
        : (event.alpha == null ? null : 360 - event.alpha);
      if (next != null && Number.isFinite(Number(next))) updateMarkerRotation(next);
    }, true);
  }

  window.addEventListener('resize', function () {
    const currentMap = ensureMap();
    if (currentMap && typeof currentMap.invalidateSize === 'function') currentMap.invalidateSize();
  });
})(window, document);
