/*
 * Taxi ProMax — Map owner
 *
 * Chỉ khởi tạo một Leaflet map và dùng OpenStreetMap, không cần API key.
 * GPS do core runtime/location core quản lý; file này chỉ phụ trách bản đồ,
 * marker khách và deep-link điều hướng.
 */
;(function (window, document) {
  'use strict';

  const DEFAULT_CENTER = [21.0285, 105.8542];
  const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_OPTIONS = {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    crossOrigin: true
  };

  let mapInstance = null;
  let driverMarker = null;
  let customerMarker = null;
  let currentHeading = 0;

  function ensureMap() {
    if (mapInstance) return mapInstance;
    if (window.PromaxMap && window.PromaxMap.instance) {
      mapInstance = window.PromaxMap.instance;
      window.map = mapInstance;
      return mapInstance;
    }

    const container = document.getElementById('map');
    if (!container || !window.L) return null;

    // Leaflet gắn _leaflet_id vào container. Không gọi L.map lần hai.
    if (container._leaflet_id && window.map) {
      mapInstance = window.map;
      window.PromaxMap = { instance: mapInstance, ensure: ensureMap };
      return mapInstance;
    }

    mapInstance = window.L.map(container, {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true
    }).setView(DEFAULT_CENTER, 16);
    window.L.tileLayer(TILE_URL, TILE_OPTIONS).addTo(mapInstance);
    window.map = mapInstance;
    window.PromaxMap = { instance: mapInstance, ensure: ensureMap };
    return mapInstance;
  }

  // Chỉ dùng cho fallback khi app không có legacy GPS runtime.
  // Khi runtime chuẩn tồn tại, core runtime tự vẽ marker tài xế và hàm này
  // tuyệt đối không tạo thêm một L.marker thứ hai.
  function markerIcon() {
    return window.L.divIcon({
      className: 'sm-div-icon',
      html: '<div class="sm-marker-container"><div class="sm-direction-wrapper"><div class="sm-marker-arrow"></div><div class="sm-marker-circle"></div></div></div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  }

  function updateMarkerRotation() {
    const compass = document.getElementById('tp-driver-compass') || document.getElementById('compass');
    if (compass) compass.style.transform = `rotate(${currentHeading}deg)`;
  }

  function updateDriverMarkerOnMap(lat, lng, heading) {
    // 00-core-runtime.js là owner duy nhất của marker vị trí tài xế.
    if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.getPosition === 'function') return false;

    const map = ensureMap();
    if (!map || !window.L || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return false;
    if (heading != null && Number.isFinite(Number(heading))) currentHeading = Math.round(Number(heading));
    if (!driverMarker) {
      driverMarker = window.L.marker([lat, lng], { icon: markerIcon(), zIndexOffset: 1000 }).addTo(map);
      map.setView([lat, lng], Math.max(map.getZoom(), 16));
    } else {
      driverMarker.setLatLng([lat, lng]);
    }
    updateMarkerRotation();
    return true;
  }

  function setupCustomerMarker(lat, lng, clientName) {
    const map = ensureMap();
    if (!map || !window.L) return null;
    if (customerMarker) map.removeLayer(customerMarker);
    const icon = window.L.divIcon({
      className: 'cust-div-icon',
      html: '<div class="customer-marker">🧍</div>',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
    customerMarker = window.L.marker([lat, lng], { icon }).addTo(map);
    customerMarker.bindTooltip(`<b>Khách: ${clientName || 'Khách vãng lai'}</b>`).openTooltip();
    if (driverMarker) {
      map.fitBounds(window.L.featureGroup([driverMarker, customerMarker]).getBounds().pad(0.3));
    } else {
      map.setView([lat, lng], 16);
    }
    return customerMarker;
  }

  function clearCustomerMarker() {
    const map = ensureMap();
    if (map && customerMarker) map.removeLayer(customerMarker);
    customerMarker = null;
  }

  function startTracking() {
    // Core runtime/location core là GPS owner. Không tạo watcher thứ hai.
    if (window.__promaxCoreGpsOwner) return false;
    if (window.ProMaxLocation && !window.__promaxLocationStarted) {
      window.__promaxLocationStarted = true;
      window.ProMaxLocation.startDriver({
        onFix: function (fix) {
          updateDriverMarkerOnMap(fix.lat, fix.lng, fix.heading);
          if (typeof window.processBackgroundLocation === 'function') {
            window.processBackgroundLocation({
              coords: {
                latitude: fix.lat,
                longitude: fix.lng,
                accuracy: fix.accuracy ?? fix.acc ?? 999,
                speed: fix.speedKmh ?? fix.speed ?? 0,
                heading: fix.heading
              },
              timestamp: fix.timestamp ?? fix.ts ?? Date.now()
            });
          }
        }
      });
      return true;
    }
    return false;
  }

  function openDirections(lat, lng) {
    if (lat == null || lng == null) return false;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=driving`, '_blank');
    return true;
  }

  window.PromaxMap = {
    instance: ensureMap(),
    ensure: ensureMap,
    updateDriverMarker: updateDriverMarkerOnMap,
    setupCustomerMarker,
    clearCustomerMarker,
    startTracking,
    openDirections
  };
  window.updateMarkerRotation = updateMarkerRotation;
  window.setupCustomerMarker = setupCustomerMarker;
  window.startTracking = startTracking;
  window.syncDriverLocationToFirebase = window.syncDriverLocationToFirebase || function () {};

  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', function (event) {
      const heading = event.webkitCompassHeading ?? (event.alpha == null ? null : 360 - event.alpha);
      if (heading != null && Number.isFinite(Number(heading))) {
        currentHeading = Math.round(Number(heading));
        updateMarkerRotation();
      }
    }, true);
  }

  window.addEventListener('resize', function () {
    const map = ensureMap();
    if (map) map.invalidateSize();
  });
})(window, document);
