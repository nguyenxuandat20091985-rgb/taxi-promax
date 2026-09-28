/**
 * Taxi ProMax — Vehicle Tracking Controller v3.0
 * 
 * CHỈ ĐIỀU KHIỂN MARKER VÀ MAP CAMERA.
 * KHÔNG thay đổi logic GPS, Kalman, Anti-teleport, Fare.
 * 
 * GPS → (xử lý cũ) → accepted position → Controller → Marker + Map
 */
;(function (window, document, undefined) {
    'use strict';

    // ==================== STATE ====================
    const state = {
        lat: null,
        lng: null,
        heading: 0,
        speed: 0,
        accuracy: 999,
        timestamp: null,

        status: 'INIT',
        isFollowing: true,
        hasFix: false,
        gpsLost: false,
        lastValidAt: null,

        marker: null,
        map: null,

        followBtn: null,
        statusEl: null,

        followThreshold: 800,
        gpsLostTimeout: 10000,
        _lastPanTime: 0,
        _gpsLostTimer: null,
        _isInitialized: false
    };

    // ==================== DOM HELPERS ====================
    function createFollowButton() {
        const btn = document.createElement('button');
        btn.id = 'vehicleFollowBtn';
        btn.innerHTML = '📍 THEO XE';
        btn.style.cssText = `
            position: fixed;
            bottom: 140px;
            right: 16px;
            z-index: 1001;
            background: #0054a3;
            color: #fff;
            border: none;
            border-radius: 30px;
            padding: 10px 18px;
            font-size: 13px;
            font-weight: 800;
            box-shadow: 0 4px 15px rgba(0,84,163,0.4);
            cursor: pointer;
            transition: all 0.25s ease;
            display: none;
        `;
        btn.onclick = toggleFollow;
        document.body.appendChild(btn);
        return btn;
    }

    function createStatusIndicator() {
        // Single GPS bar only — do not create duplicate badge
        try {
            const existing = document.getElementById('gpsStatusIndicator');
            if (existing) { existing.style.display = 'none'; existing.remove(); }
        } catch (e) {}
        return null;
    }

    // ==================== CORE ====================
    function getMap() {
        if (state.map) return state.map;
        if (window.map) { state.map = window.map; return state.map; }
        if (window.PromaxMap && typeof window.PromaxMap.ensure === 'function') {
            state.map = window.PromaxMap.ensure();
            return state.map;
        }
        return null;
    }

    function getMarker() {
        if (state.marker) return state.marker;
        if (window.driverMarker) {
            state.marker = window.driverMarker;
            return state.marker;
        }
        const map = getMap();
        if (!map) return null;
        const icon = L.divIcon({
            html: `<div class="sm-marker-container"><div class="sm-pulse-ring"></div><div id="compass" class="sm-direction-wrapper" style="transform:rotate(${state.heading}deg)"><div class="sm-marker-arrow"></div><div class="sm-marker-circle"></div></div></div>`,
            className: '',
            iconSize: [48, 48],
            iconAnchor: [24, 24]
        });
        state.marker = L.marker([21.0285, 105.8542], { icon, zIndexOffset: 1000 }).addTo(map);
        window.driverMarker = state.marker;
        return state.marker;
    }

    function updateMarker(lat, lng, heading) {
        const marker = getMarker();
        if (!marker) return;
        marker.setLatLng([lat, lng]);
        if (heading != null && !isNaN(heading)) {
            state.heading = heading;
            const compass = document.getElementById('compass');
            if (compass) compass.style.transform = `rotate(${heading}deg)`;
        }
        if (window.driverMarker) window.driverMarker = marker;
        if (window.currentHeading !== undefined) window.currentHeading = heading || 0;
    }

    function updateMapCamera(lat, lng, force) {
        const map = getMap();
        if (!map || !state.isFollowing) return;

        const now = Date.now();
        if (!force && (now - state._lastPanTime) < state.followThreshold) return;

        const zoom = map.getZoom();
        try {
            map.panTo([lat, lng], { animate: true, duration: 0.6 });
            state._lastPanTime = now;
        } catch (e) {
            map.setView([lat, lng], zoom, { animate: true });
        }
        if (window.__lastMapFollowAt !== undefined) window.__lastMapFollowAt = now;
    }

    function updateStatusUI(status, accuracy) {
        // Hide leftover badge if any (single GPS bar only)
        const el = state.statusEl || document.getElementById('gpsStatusIndicator');
        if (el) {
            el.style.display = 'none';
            state.statusEl = el;
        }

        // Update only the original header GPS bar
        const dot = document.getElementById('gpsDot');
        const text = document.getElementById('gpsStatusText');
        if (dot && text) {
            if (status === 'GPS_LOST' || status === 'ERROR') {
                dot.className = 'gps-dot bad';
                text.innerText = '📡 MẤT KẾT NỐI GPS';
            } else if (status === 'RECOVERING') {
                dot.className = 'gps-dot weak';
                text.innerText = '🔄 ĐANG PHỤC HỒI GPS...';
            } else if (status === 'SEARCHING') {
                dot.className = 'gps-dot weak';
                text.innerText = 'GPS: Đang tìm...';
            } else {
                const cls = accuracy <= 50 ? 'good' : accuracy <= 150 ? 'weak' : 'bad';
                const label = accuracy <= 50 ? 'Tốt' : accuracy <= 150 ? 'Trung bình' : 'Yếu';
                dot.className = `gps-dot ${cls}`;
                text.innerText = `GPS: ${label} (±${Math.round(accuracy)}m)`;
            }
        }
    }

    function updateFollowButton() {
        const btn = state.followBtn || document.getElementById('vehicleFollowBtn');
        if (!btn) return;
        state.followBtn = btn;
        if (state.isFollowing) {
            btn.innerHTML = '📍 ĐANG THEO XE';
            btn.style.background = '#00bfa5';
            btn.style.boxShadow = '0 4px 15px rgba(0,191,165,0.4)';
        } else {
            btn.innerHTML = '📍 THEO XE';
            btn.style.background = '#0054a3';
            btn.style.boxShadow = '0 4px 15px rgba(0,84,163,0.4)';
        }
        btn.style.display = 'block';
    }

    function toggleFollow() {
        state.isFollowing = !state.isFollowing;
        updateFollowButton();
        if (state.isFollowing && state.lat != null && state.lng != null) {
            updateMapCamera(state.lat, state.lng, true);
        }
        if (typeof window.showToast === 'function') {
            window.showToast(state.isFollowing ? '🎯 BẬT THEO DÕI XE' : '🎯 TẮT THEO DÕI XE');
        }
    }

    function updateVehiclePosition(lat, lng, meta) {
        if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return;

        const accuracy = meta && meta.accuracy != null ? meta.accuracy : 999;
        const heading = meta && meta.heading != null ? meta.heading : state.heading;
        const speed = meta && meta.speed != null ? meta.speed : 0;
        const timestamp = meta && meta.timestamp != null ? meta.timestamp : Date.now();

        state.lat = lat;
        state.lng = lng;
        state.heading = heading;
        state.accuracy = accuracy;
        state.speed = speed;
        state.timestamp = timestamp;
        state.lastValidAt = timestamp;
        state.hasFix = true;

        if (speed > 2) {
            state.status = 'MOVING';
        } else {
            state.status = 'READY';
        }

        updateMarker(lat, lng, heading);

        if (state.isFollowing) {
            updateMapCamera(lat, lng);
        }

        updateStatusUI(state.status, accuracy);
        updateFollowButton();

        clearTimeout(state._gpsLostTimer);
        state._gpsLostTimer = setTimeout(() => {
            if (state.status !== 'GPS_LOST') {
                state.status = 'GPS_LOST';
                state.gpsLost = true;
                updateStatusUI('GPS_LOST', state.accuracy);
                if (typeof window.showToast === 'function') {
                    window.showToast('🔴 MẤT TÍN HIỆU GPS! Đang giữ dữ liệu chuyến...');
                }
            }
        }, state.gpsLostTimeout);

        if (state.gpsLost) {
            state.gpsLost = false;
            state.status = 'RECOVERING';
            updateStatusUI('RECOVERING', accuracy);
            setTimeout(() => {
                if (state.hasFix && state.status === 'RECOVERING') {
                    state.status = 'MOVING';
                    updateStatusUI(state.status, state.accuracy);
                }
            }, 500);
        }

        if (window.currentLat !== undefined) window.currentLat = lat;
        if (window.currentLng !== undefined) window.currentLng = lng;
        if (window.currentHeading !== undefined) window.currentHeading = heading;
    }

    function notifyGpsLost() {
        state.status = 'GPS_LOST';
        state.gpsLost = true;
        updateStatusUI('GPS_LOST', state.accuracy);
        clearTimeout(state._gpsLostTimer);
    }

    function init() {
        if (state._isInitialized) return;
        state._isInitialized = true;

        state.followBtn = createFollowButton();
        state.statusEl = createStatusIndicator();

        getMap();
        getMarker();

        updateFollowButton();
        updateStatusUI('SEARCHING', 999);

        const map = getMap();
        if (map) {
            map.on('dragstart', function() {
                if (state.isFollowing) {
                    state.isFollowing = false;
                    updateFollowButton();
                    if (typeof window.showToast === 'function') {
                        window.showToast('⏸ Tạm dừng theo dõi xe');
                    }
                }
            });
        }

        window.VehicleTrackingController = {
            updateVehiclePosition: updateVehiclePosition,
            notifyGpsLost: notifyGpsLost,
            toggleFollow: toggleFollow,
            getState: function() {
                return {
                    lat: state.lat,
                    lng: state.lng,
                    heading: state.heading,
                    speed: state.speed,
                    accuracy: state.accuracy,
                    status: state.status,
                    isFollowing: state.isFollowing,
                    hasFix: state.hasFix,
                    gpsLost: state.gpsLost
                };
            },
            setFollow: function(follow) {
                state.isFollowing = follow;
                updateFollowButton();
                if (follow && state.lat != null && state.lng != null) {
                    updateMapCamera(state.lat, state.lng, true);
                }
            },
            onCoreAcceptedPosition: function(data) {
                updateVehiclePosition(data.lat, data.lng, data);
            }
        };

        console.log('✅ VehicleTrackingController v3.0 initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window, document);
