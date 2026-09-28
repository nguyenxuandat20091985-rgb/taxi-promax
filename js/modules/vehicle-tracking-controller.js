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

    if (window.VehicleTrackingController) return;

    const state = {
        map: null,
        marker: null,
        isFollowing: true,
        lastPos: null,
        lastUpdate: 0,
        status: 'SEARCHING',
        accuracy: 999,
        followBtn: null,
        statusEl: null,
        started: false
    };

    function createFollowButton() {
        if (document.getElementById('vehicleFollowBtn')) {
            return document.getElementById('vehicleFollowBtn');
        }
        const btn = document.createElement('button');
        btn.id = 'vehicleFollowBtn';
        btn.innerHTML = '📍 THEO XE';
        btn.style.cssText = `
            position: fixed;
            bottom: 180px;
            right: 16px;
            z-index: 1000;
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
        // Chỉ dùng thanh GPS gốc (#gpsStatusBar) — không tạo badge thứ 2
        const existing = document.getElementById('gpsStatusIndicator');
        if (existing) existing.style.display = 'none';
        return null;
    }

    function getMap() {
        if (state.map) return state.map;
        if (window.map) { state.map = window.map; return state.map; }
        if (window.PromaxMap && typeof window.PromaxMap.ensure === 'function') {
            state.map = window.PromaxMap.ensure();
            return state.map;
        }
        return null;
    }

    function ensureMarker(lat, lng) {
        const map = getMap();
        if (!map || typeof L === 'undefined') return null;
        if (state.marker) return state.marker;
        try {
            state.marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'vehicle-marker',
                    html: '<div style="width:18px;height:18px;background:#00bfa5;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35);"></div>',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                })
            }).addTo(map);
        } catch (e) {
            console.warn('VehicleTracking marker error', e);
        }
        return state.marker;
    }

    function updateMarker(lat, lng, heading) {
        const marker = ensureMarker(lat, lng);
        if (!marker) return;
        try {
            marker.setLatLng([lat, lng]);
        } catch (e) {}
    }

    function followCamera(lat, lng) {
        if (!state.isFollowing) return;
        const map = getMap();
        if (!map) return;
        const now = Date.now();
        if (window.__lastMapFollowAt && now - window.__lastMapFollowAt < 800) return;
        try {
            const zoom = map.getZoom ? map.getZoom() : 16;
            map.setView([lat, lng], zoom, { animate: true });
        } catch (e) {}
        if (window.__lastMapFollowAt !== undefined) window.__lastMapFollowAt = now;
        else window.__lastMapFollowAt = now;
    }

    function updateStatusUI(status, accuracy) {
        // Ẩn badge trùng nếu còn sót từ bản cũ
        const el = state.statusEl || document.getElementById('gpsStatusIndicator');
        if (el) {
            el.style.display = 'none';
            state.statusEl = el;
        }

        // Chỉ cập nhật thanh GPS gốc trên màn hình
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
        if (state.isFollowing && state.lastPos) {
            followCamera(state.lastPos.lat, state.lastPos.lng);
        }
    }

    function onPosition(lat, lng, data) {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const accuracy = (data && Number.isFinite(data.accuracy)) ? data.accuracy : state.accuracy;
        state.accuracy = accuracy;
        state.lastPos = { lat: lat, lng: lng };
        state.lastUpdate = Date.now();
        state.status = accuracy > 300 ? 'WEAK' : 'OK';

        updateMarker(lat, lng, data && data.heading);
        followCamera(lat, lng);
        updateStatusUI(state.status, accuracy);
        updateFollowButton();
    }

    function start() {
        if (state.started) return;
        state.started = true;
        state.followBtn = createFollowButton();
        state.statusEl = createStatusIndicator();
        updateStatusUI('SEARCHING', 999);

        // Hook into existing GPS pipelines without replacing them
        window.addEventListener('promax:gps', function (ev) {
            try {
                const d = ev && ev.detail ? ev.detail : null;
                if (!d) return;
                const lat = Number(d.lat != null ? d.lat : d.latitude);
                const lng = Number(d.lng != null ? d.lng : d.longitude);
                onPosition(lat, lng, d);
            } catch (e) {}
        });

        // Fallback: poll last known from PromaxGPSCore / global
        setInterval(function () {
            try {
                if (window.PromaxGPSCore && typeof window.PromaxGPSCore.getState === 'function') {
                    const st = window.PromaxGPSCore.getState();
                    if (st && st.lastFix) {
                        const f = st.lastFix;
                        onPosition(f.lat || f.latitude, f.lng || f.longitude, f);
                    }
                }
            } catch (e) {}
        }, 3000);
    }

    function init() {
        start();
        console.log('✅ VehicleTrackingController v3.0 initialized');
    }

    window.VehicleTrackingController = {
        version: '3.0-single-gps-bar',
        start: start,
        toggleFollow: toggleFollow,
        onPosition: onPosition,
        getState: function () { return state; }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window, document);
