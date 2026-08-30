/**
 * Taxi ProMax — Trip Engine V8.1 (3 luồng riêng biệt)
 * 
 * - Luồng 1: Street Hail (chuyến vẫy) → do StreetHailHandler quản lý, engine chỉ làm cầu nối
 * - Luồng 2: App Booking with Destination (có điểm đến)
 * - Luồng 3: App Booking without Destination (không điểm đến)
 */
;(function(window, document, undefined) {
    'use strict';

    // ==================== CONSTANTS ====================
    const TRIP_STATE = Object.freeze({
        IDLE: 'IDLE',

        // Chung cho cả 3 luồng
        DRIVER_ACCEPT: 'DRIVER_ACCEPT',
        NAVIGATING_TO_PICKUP: 'NAVIGATING_TO_PICKUP',
        ARRIVED_PICKUP: 'ARRIVED_PICKUP',
        PICKUP_CONFIRMED: 'PICKUP_CONFIRMED',
        CUSTOMER_ONBOARD: 'CUSTOMER_ONBOARD',
        TRIP_RUNNING: 'TRIP_RUNNING',
        FARE_CALCULATING: 'FARE_CALCULATING',
        ARRIVED_DESTINATION: 'ARRIVED_DESTINATION',
        COMPLETING: 'COMPLETING',
        COMPLETED: 'COMPLETED',
        CANCELLED: 'CANCELLED',

        // Riêng App
        WAITING_DESTINATION: 'WAITING_DESTINATION',
        DESTINATION_SELECTED: 'DESTINATION_SELECTED'
    });

    const TRIP_TYPE = Object.freeze({
        STREET_HAIL: 'STREET_HAIL',
        APP_DESTINATION: 'APP_DESTINATION',
        APP_NO_DESTINATION: 'APP_NO_DESTINATION'
    });

    // ==================== TRIP ENGINE CLASS ====================
    class TripEngine {
        constructor() {
            this.currentState = TRIP_STATE.IDLE;
            this.currentTrip = null;
            this.tripType = null;
            this.navigationMode = 'idle';
            this.fareStartedAt = null;
            this.odometerKm = 0;
            this.waitTimeMin = 0;
            this.lastGoodPosition = null;
            this.waitTimer = null;
            this._completed = false;
            this._lastPosition = null;

            this.validTransitions = this._buildTransitions();
            this._bindEvents();
        }

        _buildTransitions() {
            const allStates = Object.values(TRIP_STATE);
            const transitions = {};

            allStates.forEach(state => {
                transitions[state] = [];
                if (state !== TRIP_STATE.IDLE && state !== TRIP_STATE.CANCELLED && state !== TRIP_STATE.COMPLETED) {
                    transitions[state].push(TRIP_STATE.CANCELLED);
                }
            });

            // Street Hail (chỉ qua engine khi cần, handler quản lý chính)
            transitions[TRIP_STATE.IDLE].push(TRIP_STATE.STREET_HAIL);
            transitions[TRIP_STATE.STREET_HAIL] = [TRIP_STATE.DRIVER_ACCEPT, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.DRIVER_ACCEPT].push(TRIP_STATE.PICKUP_CONFIRMED);
            transitions[TRIP_STATE.PICKUP_CONFIRMED] = [TRIP_STATE.CUSTOMER_ONBOARD, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.CUSTOMER_ONBOARD] = [TRIP_STATE.TRIP_RUNNING, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.TRIP_RUNNING] = [TRIP_STATE.WAITING_DESTINATION, TRIP_STATE.FARE_CALCULATING, TRIP_STATE.ARRIVED_DESTINATION, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.WAITING_DESTINATION] = [TRIP_STATE.DESTINATION_SELECTED, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.DESTINATION_SELECTED] = [TRIP_STATE.TRIP_RUNNING, TRIP_STATE.FARE_CALCULATING, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.FARE_CALCULATING] = [TRIP_STATE.ARRIVED_DESTINATION, TRIP_STATE.COMPLETING, TRIP_STATE.COMPLETED, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.ARRIVED_DESTINATION] = [TRIP_STATE.COMPLETING, TRIP_STATE.COMPLETED, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.COMPLETING] = [TRIP_STATE.COMPLETED];
            transitions[TRIP_STATE.COMPLETED] = [TRIP_STATE.IDLE];
            transitions[TRIP_STATE.CANCELLED] = [TRIP_STATE.IDLE];

            // App with Destination
            transitions[TRIP_STATE.DRIVER_ACCEPT] = [TRIP_STATE.NAVIGATING_TO_PICKUP, TRIP_STATE.ARRIVED_PICKUP, TRIP_STATE.PICKUP_CONFIRMED, TRIP_STATE.CUSTOMER_ONBOARD, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.NAVIGATING_TO_PICKUP] = [TRIP_STATE.ARRIVED_PICKUP, TRIP_STATE.PICKUP_CONFIRMED, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.ARRIVED_PICKUP] = [TRIP_STATE.PICKUP_CONFIRMED, TRIP_STATE.CUSTOMER_ONBOARD, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.PICKUP_CONFIRMED] = [TRIP_STATE.CUSTOMER_ONBOARD, TRIP_STATE.CANCELLED];
            transitions[TRIP_STATE.CUSTOMER_ONBOARD] = [TRIP_STATE.DESTINATION_SELECTED, TRIP_STATE.WAITING_DESTINATION, TRIP_STATE.TRIP_RUNNING, TRIP_STATE.FARE_CALCULATING, TRIP_STATE.CANCELLED];

            return transitions;
        }

        _bindEvents() {
            document.addEventListener('gps:position', (e) => {
                if (e.detail) this.updateGPS(e.detail);
            });
        }

        getCurrentState() { return this.currentState; }
        getCurrentTrip() { return this.currentTrip; }
        getOdometer() { return this.odometerKm; }
        getWaitTime() { return this.waitTimeMin; }
        getNavigationMode() { return this.navigationMode; }

        // ===== PHƯƠNG THỨC CHÍNH =====
        transition(nextState, payload = {}) {
            const allowed = this.validTransitions[this.currentState] || [];
            if (!allowed.includes(nextState)) {
                console.warn(`[TripEngine] Invalid transition: ${this.currentState} -> ${nextState}`);
                this.emit('error', { code: 'INVALID_TRANSITION', from: this.currentState, to: nextState });
                return false;
            }

            const previousState = this.currentState;
            this.currentState = nextState;
            this._onEnter(nextState, previousState, payload);
            this._publishState();
            this.emit('status', {
                status: nextState,
                previousStatus: previousState,
                state: nextState,
                navigationMode: this.navigationMode,
                trip: this.currentTrip,
                payload
            });
            return true;
        }

        _onEnter(state, previousState, payload) {
            switch (state) {
                case TRIP_STATE.IDLE:
                    this.navigationMode = 'idle';
                    this.stopWaitTimer();
                    break;

                case TRIP_STATE.STREET_HAIL:
                    this.navigationMode = 'idle';
                    break;

                case TRIP_STATE.DRIVER_ACCEPT:
                    if (this.tripType === TRIP_TYPE.STREET_HAIL) {
                        this.navigationMode = 'idle';
                    } else {
                        this.navigationMode = 'pickup';
                    }
                    break;

                case TRIP_STATE.NAVIGATING_TO_PICKUP:
                    this.navigationMode = 'pickup';
                    this._drawRoute('pickup');
                    break;

                case TRIP_STATE.ARRIVED_PICKUP:
                    this.navigationMode = 'pickup';
                    break;

                case TRIP_STATE.PICKUP_CONFIRMED:
                    this.navigationMode = 'pickup';
                    break;

                case TRIP_STATE.CUSTOMER_ONBOARD:
                    this.stopWaitTimer();
                    if (this.currentTrip) {
                        this.currentTrip.pickupConfirmedAt = Date.now();
                    }
                    this.odometerKm = 0;
                    this.fareStartedAt = Date.now();
                    if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.resetDistance === 'function') {
                        window.PromaxLegacyRuntime.resetDistance();
                    }
                    break;

                case TRIP_STATE.WAITING_DESTINATION:
                    this.navigationMode = 'idle';
                    this.startWaitTimer();
                    this.emit('request_destination', { message: 'Vui lòng nhập điểm đến để bắt đầu tính cước.' });
                    break;

                case TRIP_STATE.DESTINATION_SELECTED:
                    this.navigationMode = 'destination';
                    this._drawRoute('destination');
                    this.stopWaitTimer();
                    break;

                case TRIP_STATE.TRIP_RUNNING:
                    break;

                case TRIP_STATE.FARE_CALCULATING:
                    if (!this.fareStartedAt) this.fareStartedAt = Date.now();
                    this.odometerKm = this._getOdometerFromCore();
                    this._updateFare();
                    break;

                case TRIP_STATE.ARRIVED_DESTINATION:
                    this.navigationMode = 'idle';
                    this.emit('arrived_destination', {});
                    break;

                case TRIP_STATE.COMPLETING:
                    this.navigationMode = 'idle';
                    break;

                case TRIP_STATE.COMPLETED:
                    this._completeTrip(payload);
                    break;

                case TRIP_STATE.CANCELLED:
                    this.stopWaitTimer();
                    this._cancelTrip(payload.reason || 'Tài xế hủy chuyến');
                    break;
            }
            this._updateUI();
        }

        _publishState() {
            document.documentElement.setAttribute('data-trip-state', this.currentState);
            document.documentElement.setAttribute('data-navigation-mode', this.navigationMode);
            document.documentElement.setAttribute('data-trip-type', this.tripType || 'none');
            document.documentElement.setAttribute('data-fare-active', this._isFareActive() ? 'true' : 'false');
        }

        // ===== CÁC HÀM KHỞI TẠO CHUYẾN =====

        /**
         * Nhận đơn từ App (có hoặc không có điểm đến)
         */
        beginAppTrip(orderId, orderData) {
            if (this.currentState !== TRIP_STATE.IDLE) {
                console.warn('[TripEngine] Cannot start app trip when state=', this.currentState);
                return false;
            }
            this._completed = false;
            this.currentTrip = this._normalizeAppTrip(orderId, orderData);
            this.tripType = this.currentTrip.type;
            this.odometerKm = 0;
            this.fareStartedAt = null;
            if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.resetDistance === 'function') {
                window.PromaxLegacyRuntime.resetDistance();
            }
            if (!this.transition(TRIP_STATE.DRIVER_ACCEPT, { source: 'app_order', navigationMode: 'pickup' })) return false;
            return this.transition(TRIP_STATE.NAVIGATING_TO_PICKUP, { source: 'app_order' });
        }

        acceptOrder(orderId, orderData) {
            return this.beginAppTrip(orderId, orderData);
        }

        // ===== HÀM HỖ TRỢ =====

        _normalizeAppTrip(orderId, orderData) {
            const hasDestination = Boolean(
                (orderData.dropoffLat != null && orderData.dropoffLng != null) ||
                (orderData.dropoff && typeof orderData.dropoff === 'string' && orderData.dropoff.trim() !== '')
            );
            const type = hasDestination ? TRIP_TYPE.APP_DESTINATION : TRIP_TYPE.APP_NO_DESTINATION;
            return {
                id: orderId || orderData.id || null,
                type: type,
                isStreetHail: false,
                clientName: orderData.clientName || 'Khách',
                phone: orderData.phone || '',
                pickup: orderData.pickup || 'Vị trí hiện tại',
                dropoff: orderData.dropoff || null,
                dropoffLat: orderData.dropoffLat != null ? Number(orderData.dropoffLat) : null,
                dropoffLng: orderData.dropoffLng != null ? Number(orderData.dropoffLng) : null,
                pickupLat: orderData.pickupLat != null ? Number(orderData.pickupLat) : null,
                pickupLng: orderData.pickupLng != null ? Number(orderData.pickupLng) : null,
                estimatePrice: orderData.estimatePrice || 0,
                estimateKm: orderData.estimateKm || 0,
                carType: orderData.carType || '4_seats',
                ...orderData
            };
        }

        _getOdometerFromCore() {
            if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.getTotalKm === 'function') {
                return window.PromaxLegacyRuntime.getTotalKm();
            }
            return this.odometerKm;
        }

        // ===== CÁC HÀNH ĐỘNG =====

        confirmPickup() {
            const state = this.currentState;
            if (state === TRIP_STATE.NAVIGATING_TO_PICKUP) {
                return this.transition(TRIP_STATE.ARRIVED_PICKUP);
            }
            if (state === TRIP_STATE.ARRIVED_PICKUP && this.tripType !== TRIP_TYPE.STREET_HAIL) {
                return this.transition(TRIP_STATE.PICKUP_CONFIRMED);
            }
            return this.transition(TRIP_STATE.PICKUP_CONFIRMED);
        }

        arrivedAtPickup() {
            return this.transition(TRIP_STATE.ARRIVED_PICKUP);
        }

        passengerOnboard() {
            if (this.currentState === TRIP_STATE.NAVIGATING_TO_PICKUP) this.arrivedAtPickup();
            if (![TRIP_STATE.ARRIVED_PICKUP, TRIP_STATE.PICKUP_CONFIRMED, TRIP_STATE.CUSTOMER_ONBOARD].includes(this.currentState)) {
                return false;
            }
            if (this.currentState !== TRIP_STATE.CUSTOMER_ONBOARD) {
                if (!this.transition(TRIP_STATE.CUSTOMER_ONBOARD)) return false;
            }

            if (this.tripType === TRIP_TYPE.APP_DESTINATION) {
                if (!this.transition(TRIP_STATE.DESTINATION_SELECTED, { source: 'has_destination' })) return false;
                if (!this.transition(TRIP_STATE.TRIP_RUNNING, { source: 'has_destination' })) return false;
                return this.transition(TRIP_STATE.FARE_CALCULATING, { source: 'has_destination' });
            } else if (this.tripType === TRIP_TYPE.APP_NO_DESTINATION) {
                if (!this.transition(TRIP_STATE.TRIP_RUNNING, { source: 'no_destination_onboard' })) return false;
                return this.transition(TRIP_STATE.WAITING_DESTINATION, { source: 'no_destination' });
            }
            return false;
        }

        selectDestination(destination) {
            if (this.currentState !== TRIP_STATE.WAITING_DESTINATION) {
                console.warn('[TripEngine] Cannot select destination when state=', this.currentState);
                return false;
            }
            const normalized = this._normalizeDestination(destination);
            if (!normalized) return false;
            if (this.currentTrip) {
                this.currentTrip.dropoff = normalized.address;
                this.currentTrip.dropoffLat = normalized.lat;
                this.currentTrip.dropoffLng = normalized.lng;
                this.currentTrip.destination = normalized;
            }
            if (!this.transition(TRIP_STATE.DESTINATION_SELECTED, { destination: normalized })) return false;
            if (!this.transition(TRIP_STATE.TRIP_RUNNING, { source: 'destination_selected' })) return false;
            return this.transition(TRIP_STATE.FARE_CALCULATING, { source: 'destination_selected' });
        }

        startDestinationRoute(destination) {
            return this.selectDestination(destination);
        }

        _normalizeDestination(value) {
            if (typeof value === 'string') {
                const address = value.trim();
                return address ? { address, lat: null, lng: null } : null;
            }
            if (!value || typeof value.address !== 'string' || value.address.trim() === '') return null;
            return {
                address: value.address.trim(),
                lat: value.lat != null ? Number(value.lat) : null,
                lng: value.lng != null ? Number(value.lng) : null
            };
        }

        startStreetHail() {
            if (window.StreetHailHandler && typeof window.StreetHailHandler.start === 'function') {
                return window.StreetHailHandler.start();
            }
            if (typeof window.startStreetHail === 'function') {
                return window.startStreetHail();
            }
            console.warn('[TripEngine] StreetHailHandler missing');
            return false;
        }

        completeTrip() {
            const st = this.currentState;
            if (![TRIP_STATE.FARE_CALCULATING, TRIP_STATE.ARRIVED_DESTINATION, TRIP_STATE.COMPLETING].includes(st)) {
                console.warn('[TripEngine] completeTrip from invalid state:', st);
                return false;
            }
            return this.transition(TRIP_STATE.COMPLETED, { source: 'driver' });
        }

        arrivedAtDestination() {
            if (this.currentState === TRIP_STATE.TRIP_RUNNING) {
                this.transition(TRIP_STATE.FARE_CALCULATING, { source: 'arrived_dest' });
            }
            if (this.currentState !== TRIP_STATE.FARE_CALCULATING) return false;
            return this.transition(TRIP_STATE.ARRIVED_DESTINATION, { source: 'driver' });
        }

        showCompletionConfirmation() {
            const st = this.currentState;
            if (![TRIP_STATE.FARE_CALCULATING, TRIP_STATE.ARRIVED_DESTINATION].includes(st)) {
                console.warn('[TripEngine] showCompletionConfirmation from invalid state:', st);
                return false;
            }
            this.emit('confirm_complete', {});
            return true;
        }

        cancelTrip(reason = 'Tài xế hủy chuyến') {
            if (!this._isTripActive()) return false;
            return this.transition(TRIP_STATE.CANCELLED, { reason });
        }

        // ===== GPS UPDATE =====
        updateGPS(position) {
            if (!position || position.lat == null || position.lng == null) return;
            this.lastGoodPosition = {
                lat: Number(position.lat),
                lng: Number(position.lng),
                accuracy: Number(position.accuracy) || 999,
                speed: Number(position.speed) || 0,
                heading: Number(position.heading) || 0,
                timestamp: Number(position.timestamp) || Date.now()
            };

            if (this._isFareActive()) {
                this._updateDistance(position);
                this._updateFare();
            }

            this.emit('gps_update', this.lastGoodPosition);
        }

        _updateDistance(position) {
            if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.processLocation === 'function') {
                window.PromaxLegacyRuntime.processLocation({
                    latitude: position.lat,
                    longitude: position.lng,
                    accuracy: position.accuracy || 999,
                    heading: position.heading || 0,
                    speed: position.speed || 0,
                    timestamp: position.timestamp || Date.now()
                });
                this.odometerKm = window.PromaxLegacyRuntime.getTotalKm();
            } else {
                if (this._lastPosition) {
                    const dist = this._haversine(
                        this._lastPosition.lat, this._lastPosition.lng,
                        position.lat, position.lng
                    );
                    if (dist > 0.01 && dist < 0.5) {
                        this.odometerKm += dist;
                    }
                }
                this._lastPosition = { lat: position.lat, lng: position.lng };
            }
        }

        _updateFare() {
            const km = this.odometerKm;
            const rate = window.PromaxLegacyRuntime ? window.PromaxLegacyRuntime.getRate() : 15000;
            const fare = Math.max(20000, Math.round(km * rate));
            this.emit('fare_update', { km: km, fare: fare });
        }

        _haversine(lat1, lng1, lat2, lng2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLng = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        }

        // ===== NAVIGATION =====
        _drawRoute(mode) {
            const target = mode === 'pickup' ? this._pickup() : this._destination();
            if (!target || !target.lat || !target.lng) return;
            const position = this.lastGoodPosition || {};
            if (window.drawRoute && typeof window.drawRoute === 'function') {
                window.drawRoute(position.lat, position.lng, target.lat, target.lng);
            }
        }

        openNavigation(mode) {
            const target = mode === 'pickup' ? this._pickup() : this._destination();
            if (!target) return false;
            const position = this.lastGoodPosition || {};
            const dest = target.lat && target.lng
                ? `${target.lat},${target.lng}`
                : encodeURIComponent(target.address || '');
            window.open(
                `https://www.google.com/maps/dir/?api=1&origin=${position.lat},${position.lng}&destination=${dest}&travelmode=driving`,
                '_blank'
            );
            return true;
        }

        _pickup() {
            if (!this.currentTrip) return null;
            return {
                address: this.currentTrip.pickup || '',
                lat: this.currentTrip.pickupLat || null,
                lng: this.currentTrip.pickupLng || null
            };
        }

        _destination() {
            if (!this.currentTrip) return null;
            return {
                address: this.currentTrip.dropoff || '',
                lat: this.currentTrip.dropoffLat || null,
                lng: this.currentTrip.dropoffLng || null
            };
        }

        // ===== STATE HELPERS =====
        _isFareActive() {
            return [
                TRIP_STATE.TRIP_RUNNING,
                TRIP_STATE.WAITING_DESTINATION,
                TRIP_STATE.DESTINATION_SELECTED,
                TRIP_STATE.FARE_CALCULATING,
                TRIP_STATE.ARRIVED_DESTINATION,
                TRIP_STATE.COMPLETING
            ].includes(this.currentState);
        }

        _isTripActive() {
            return ![TRIP_STATE.IDLE, TRIP_STATE.COMPLETED, TRIP_STATE.CANCELLED].includes(this.currentState);
        }

        // ===== COMPLETE / CANCEL =====
        _completeTrip(payload) {
            if (this._completed) return;
            this._completed = true;
            this.odometerKm = this._getOdometerFromCore();
            this.emit('completed', {
                totalKm: this.odometerKm,
                trip: this.currentTrip,
                payload
            });
            this.currentState = TRIP_STATE.IDLE;
            this.currentTrip = null;
            this.tripType = null;
            this.fareStartedAt = null;
            this._publishState();
            this._updateUI();
        }

        _cancelTrip(reason) {
            this.emit('cancelled', { reason });
            this.currentState = TRIP_STATE.IDLE;
            this.currentTrip = null;
            this.tripType = null;
            this._publishState();
            this._updateUI();
        }

        // ===== TIMER =====
        startWaitTimer() {
            this.stopWaitTimer();
            this.waitTimer = setInterval(() => {
                if (this.currentState === TRIP_STATE.WAITING_DESTINATION) {
                    this.waitTimeMin += 1 / 60;
                }
            }, 1000);
        }

        stopWaitTimer() {
            if (this.waitTimer) {
                clearInterval(this.waitTimer);
                this.waitTimer = null;
            }
        }

        // ===== UI UPDATE =====
        _updateUI() {
            this.emit('ui_update', {
                state: this.currentState,
                trip: this.currentTrip,
                tripType: this.tripType
            });
        }

        // ===== EMIT / EVENT =====
        emit(type, detail = {}) {
            document.dispatchEvent(new CustomEvent(`trip:${type}`, { detail }));
        }

        // ===== DESTROY =====
        destroy() {
            this.stopWaitTimer();
        }
    }

    // ==================== KHỞI TẠO ====================
    const engine = new TripEngine();
    window.tripEngine = engine;
    window.TRIP_STATE = TRIP_STATE;
    window.TRIP_TYPE = TRIP_TYPE;

    if (window.PromaxLegacyRuntime) {
        const origProcess = window.PromaxLegacyRuntime.processLocation;
        window.PromaxLegacyRuntime.processLocation = function(location) {
            if (typeof origProcess === 'function') origProcess(location);
            if (location && location.latitude != null && location.longitude != null) {
                engine.updateGPS({
                    lat: location.latitude,
                    lng: location.longitude,
                    accuracy: location.accuracy,
                    speed: location.speed,
                    heading: location.heading,
                    timestamp: location.timestamp
                });
            }
        };
    }

    console.log('✅ TripEngine V8.1 loaded — App flows (with/without destination)');

})(window, document);