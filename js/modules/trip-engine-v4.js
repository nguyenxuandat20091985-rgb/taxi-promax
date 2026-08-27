/*
 * Taxi ProMax — Driver Trip Flow Engine
 *
 * Một state machine duy nhất cho 4 luồng:
 *
 * 1) IDLE -> STREET_HAIL -> DRIVER_ACCEPT -> PICKUP_CONFIRMED
 *    -> CUSTOMER_ONBOARD -> TRIP_RUNNING -> FARE_CALCULATING -> COMPLETED
 * 2) order -> DRIVER_ACCEPT -> NAVIGATING_TO_PICKUP -> ARRIVED_PICKUP
 *    -> PICKUP_CONFIRMED -> CUSTOMER_ONBOARD -> WAITING_DESTINATION
 *    -> DESTINATION_SELECTED -> TRIP_RUNNING -> FARE_CALCULATING
 * 3) accept order luôn đặt navigationMode = "pickup"
 * 4) có điểm đến: sau CUSTOMER_ONBOARD đặt navigationMode = "destination"
 *    rồi mới chuyển sang TRIP_RUNNING/FARE_CALCULATING.
 *
 * File này không tự cộng kilomet. Legacy GPS runtime là nơi duy nhất cộng
 * totalKm, nhưng chỉ khi isFareActive() trả về true.
 */
;(function (window, document) {
  'use strict';

  const TRIP_STATE = Object.freeze({
    IDLE: 'IDLE',
    STREET_HAIL: 'STREET_HAIL',
    DRIVER_ACCEPT: 'DRIVER_ACCEPT',
    NAVIGATING_TO_PICKUP: 'NAVIGATING_TO_PICKUP',
    ARRIVED_PICKUP: 'ARRIVED_PICKUP',
    PICKUP_CONFIRMED: 'PICKUP_CONFIRMED',
    CUSTOMER_ONBOARD: 'CUSTOMER_ONBOARD',
    WAITING_DESTINATION: 'WAITING_DESTINATION',
    DESTINATION_SELECTED: 'DESTINATION_SELECTED',
    TRIP_RUNNING: 'TRIP_RUNNING',
    FARE_CALCULATING: 'FARE_CALCULATING',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
  });

  const TRIP_TYPE = Object.freeze({
    STREET_HAIL: 'STREET_HAIL',
    APP_DESTINATION: 'APP_DESTINATION',
    APP_NO_DESTINATION: 'APP_NO_DESTINATION'
  });

  const CONFIG = Object.freeze({
    FARE_BASE: 15000,
    FARE_PER_KM: 12000,
    MIN_FARE: 25000,
    MAX_FARE: 500000,
    MAX_SPEED_KMH: 140,
    FIREBASE_PATH: 'datxe',
    ALERTS_PATH: 'ai/alerts'
  });

  function number(value, fallback = 0) {
    const result = Number(value);
    return Number.isFinite(result) ? result : fallback;
  }

  function hasText(value) {
    return typeof value === 'string' && value.trim() !== '' && value.trim() !== 'Chưa xác định';
  }

  class TripEngine {
    constructor() {
      this.currentState = TRIP_STATE.IDLE;
      this.currentTrip = null;
      this.navigationMode = 'idle';
      this.fareStartedAt = null;
      this.currentOdometerKm = 0;
      this.waitTimeMin = 0;
      this.lastKnownPosition = null;
      this.lastGpsUpdate = null;
      this.gpsWatchId = null;
      this.gpsUnsubscribe = null;
      this.waitTimer = null;
      this._completed = false;

      this.validTransitions = Object.freeze({
        [TRIP_STATE.IDLE]: [TRIP_STATE.STREET_HAIL, TRIP_STATE.DRIVER_ACCEPT],
        [TRIP_STATE.STREET_HAIL]: [TRIP_STATE.DRIVER_ACCEPT, TRIP_STATE.CANCELLED],
        [TRIP_STATE.DRIVER_ACCEPT]: [TRIP_STATE.NAVIGATING_TO_PICKUP, TRIP_STATE.PICKUP_CONFIRMED, TRIP_STATE.CANCELLED],
        [TRIP_STATE.NAVIGATING_TO_PICKUP]: [TRIP_STATE.ARRIVED_PICKUP, TRIP_STATE.CANCELLED],
        [TRIP_STATE.ARRIVED_PICKUP]: [TRIP_STATE.PICKUP_CONFIRMED, TRIP_STATE.CUSTOMER_ONBOARD, TRIP_STATE.CANCELLED],
        [TRIP_STATE.PICKUP_CONFIRMED]: [TRIP_STATE.CUSTOMER_ONBOARD, TRIP_STATE.CANCELLED],
        [TRIP_STATE.CUSTOMER_ONBOARD]: [TRIP_STATE.WAITING_DESTINATION, TRIP_STATE.DESTINATION_SELECTED, TRIP_STATE.TRIP_RUNNING, TRIP_STATE.CANCELLED],
        [TRIP_STATE.WAITING_DESTINATION]: [TRIP_STATE.DESTINATION_SELECTED, TRIP_STATE.CANCELLED],
        [TRIP_STATE.DESTINATION_SELECTED]: [TRIP_STATE.TRIP_RUNNING, TRIP_STATE.CANCELLED],
        [TRIP_STATE.TRIP_RUNNING]: [TRIP_STATE.FARE_CALCULATING, TRIP_STATE.CANCELLED],
        [TRIP_STATE.FARE_CALCULATING]: [TRIP_STATE.COMPLETED, TRIP_STATE.CANCELLED],
        [TRIP_STATE.COMPLETED]: [TRIP_STATE.IDLE],
        [TRIP_STATE.CANCELLED]: [TRIP_STATE.IDLE]
      });

      this.init();
    }

    init() {
      this.publishLegacyState();
      this.startGpsListener();
      this.log('Trip Flow Engine khởi động — IDLE');
    }

    startGpsListener() {
      if (window.PromaxGPSCore && typeof window.PromaxGPSCore.onFix === 'function') {
        this.gpsUnsubscribe = window.PromaxGPSCore.onFix((fix) => {
          if (!fix || fix.error) return;
          this.updateGPS({
            coords: {
              latitude: number(fix.lat),
              longitude: number(fix.lng),
              accuracy: number(fix.accuracy, 999),
              speed: number(fix.speed),
              heading: number(fix.heading)
            },
            timestamp: number(fix.timestamp, Date.now())
          });
        });
        return;
      }

      if (window.cockpit && typeof window.cockpit.onPosition === 'function') {
        window.cockpit.onPosition((position) => this.updateGPS({
          coords: {
            latitude: number(position.lat),
            longitude: number(position.lng),
            accuracy: number(position.accuracy, 999),
            speed: number(position.speed) / 3.6,
            heading: number(position.heading)
          },
          timestamp: number(position.timestamp, Date.now())
        }));
        return;
      }

      // Fallback cuối cùng. Đây không phải nguồn cộng kilomet.
      if (navigator.geolocation) {
        this.gpsWatchId = navigator.geolocation.watchPosition(
          (position) => this.updateGPS(position),
          (error) => this.log('GPS lỗi: ' + error.message, 'warn'),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      }
    }

    updateGPS(position) {
      if (!position || !position.coords) return;
      const coords = position.coords;
      this.lastKnownPosition = {
        lat: number(coords.latitude),
        lng: number(coords.longitude),
        accuracy: number(coords.accuracy, 999),
        speed: number(coords.speed),
        heading: number(coords.heading),
        timestamp: number(position.timestamp, Date.now())
      };
      this.lastGpsUpdate = this.lastKnownPosition;
      this.currentOdometerKm = this.readLegacyKm();
      this.updateFlowUI();
    }

    readLegacyKm() {
      try {
        if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.getTotalKm === 'function') {
          return number(window.PromaxLegacyRuntime.getTotalKm());
        }
      } catch (_) {}
      return number(this.currentOdometerKm);
    }

    isFareActive() {
      return this.currentState === TRIP_STATE.FARE_CALCULATING;
    }

    isTripActive() {
      return ![TRIP_STATE.IDLE, TRIP_STATE.COMPLETED, TRIP_STATE.CANCELLED].includes(this.currentState);
    }

    transition(nextState, payload = {}) {
      const allowed = this.validTransitions[this.currentState] || [];
      if (!allowed.includes(nextState)) {
        this.log(`Chuyển trạng thái không hợp lệ: ${this.currentState} -> ${nextState}`, 'error');
        this.emit('error', { code: 'INVALID_TRANSITION', from: this.currentState, to: nextState });
        return false;
      }

      const previousState = this.currentState;
      this.currentState = nextState;
      this.onEnter(nextState, previousState, payload);
      this.publishLegacyState();
      this.emit('status', {
        status: nextState,
        previousStatus: previousState,
        state: nextState,
        navigationMode: this.navigationMode,
        trip: this.currentTrip,
        payload
      });
      this.syncStateToFirebase(nextState);
      this.log(`${previousState} -> ${nextState}`);
      return true;
    }

    onEnter(state, previousState, payload) {
      switch (state) {
        case TRIP_STATE.IDLE:
          this.navigationMode = 'idle';
          this.stopWaitTimer();
          this.publishLegacyState();
          this.updateFlowUI();
          break;

        case TRIP_STATE.STREET_HAIL:
          this.navigationMode = 'idle';
          this.ensureStreetHailTrip();
          break;

        case TRIP_STATE.DRIVER_ACCEPT:
          this.navigationMode = payload.navigationMode || (this.isStreetHailTrip() ? 'idle' : 'pickup');
          break;

        case TRIP_STATE.NAVIGATING_TO_PICKUP:
          this.navigationMode = 'pickup';
          this.updateNavigationRoute('pickup');
          this.updateFlowUI();
          this.emit('navigation', { navigationMode: 'pickup', destination: this.pickup() });
          break;

        case TRIP_STATE.ARRIVED_PICKUP:
          this.navigationMode = 'pickup';
          this.updateFlowUI();
          break;

        case TRIP_STATE.PICKUP_CONFIRMED:
          this.navigationMode = 'pickup';
          this.updateFlowUI();
          break;

        case TRIP_STATE.CUSTOMER_ONBOARD:
          this.stopWaitTimer();
          this.updateFlowUI();
          break;

        case TRIP_STATE.WAITING_DESTINATION:
          this.navigationMode = 'idle';
          this.startWaitTimer();
          this.updateFlowUI();
          this.emit('request_destination', { message: 'Vui lòng nhập điểm đến để bắt đầu tính cước.' });
          break;

        case TRIP_STATE.DESTINATION_SELECTED:
          this.navigationMode = 'destination';
          this.updateNavigationRoute('destination');
          this.updateFlowUI();
          this.emit('navigation', { navigationMode: 'destination', destination: this.destination() });
          break;

        case TRIP_STATE.TRIP_RUNNING:
          this.updateFlowUI();
          break;

        case TRIP_STATE.FARE_CALCULATING:
          this.navigationMode = this.isStreetHailTrip() ? 'idle' : 'destination';
          if (!this.fareStartedAt) this.fareStartedAt = Date.now();
          this.currentOdometerKm = this.readLegacyKm();
          this.updateFlowUI();
          this.emit('fare_started', { navigationMode: this.navigationMode });
          break;

        case TRIP_STATE.COMPLETED:
          this.completeLegacyTrip(payload);
          break;

        case TRIP_STATE.CANCELLED:
          this.stopWaitTimer();
          this.cancelLegacyTrip(payload.reason || 'Tài xế hủy chuyến');
          break;
      }
    }

    ensureStreetHailTrip() {
      if (this.currentTrip) return;
      this.currentTrip = {
        id: null,
        type: TRIP_TYPE.STREET_HAIL,
        isStreetHail: true,
        clientName: '🚕 Khách vẫy',
        phone: '',
        pickup: 'Vị trí hiện tại',
        dropoff: null,
        estimatePrice: 0,
        estimateKm: 0,
        pickupLat: this.currentPosition()?.lat || null,
        pickupLng: this.currentPosition()?.lng || null
      };
      this.syncLegacyContext();
    }

    isStreetHailTrip() {
      return Boolean(this.currentTrip && (this.currentTrip.type === TRIP_TYPE.STREET_HAIL || this.currentTrip.isStreetHail));
    }

    normalizeTrip(tripId, data = {}) {
      const hasDestination = Boolean(
        (data.dropoffLat != null && data.dropoffLng != null) || hasText(data.dropoff)
      );
      return {
        ...data,
        id: tripId || data.id || null,
        type: hasDestination ? TRIP_TYPE.APP_DESTINATION : TRIP_TYPE.APP_NO_DESTINATION,
        isStreetHail: false,
        destination: hasDestination ? {
          address: data.dropoff || '',
          lat: data.dropoffLat != null ? number(data.dropoffLat) : null,
          lng: data.dropoffLng != null ? number(data.dropoffLng) : null
        } : null
      };
    }

    beginAppTrip(tripId, data) {
      if (this.currentState !== TRIP_STATE.IDLE) {
        this.log('Không thể nhận đơn khi state=' + this.currentState, 'warn');
        return false;
      }
      this.currentTrip = this.normalizeTrip(tripId, data || {});
      this.syncLegacyContext();
      this._completed = false;
      if (!this.transition(TRIP_STATE.DRIVER_ACCEPT, { source: 'app_order', navigationMode: 'pickup' })) return false;
      return this.transition(TRIP_STATE.NAVIGATING_TO_PICKUP, { source: 'app_order' });
    }

    startStreetHail() {
      if (this.currentState !== TRIP_STATE.IDLE) {
        if (this.isFareActive()) return this.showCompletionConfirmation();
        return false;
      }
      this.currentTrip = null;
      if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.resetDistance === 'function') {
        window.PromaxLegacyRuntime.resetDistance();
      }
      if (!this.transition(TRIP_STATE.STREET_HAIL, { source: 'street_hail' })) return false;
      if (!this.transition(TRIP_STATE.DRIVER_ACCEPT, { source: 'street_hail', navigationMode: 'idle' })) return false;
      if (!this.transition(TRIP_STATE.PICKUP_CONFIRMED, { source: 'street_hail' })) return false;
      if (!this.transition(TRIP_STATE.CUSTOMER_ONBOARD, { source: 'street_hail' })) return false;
      if (!this.transition(TRIP_STATE.TRIP_RUNNING, { source: 'street_hail' })) return false;
      return this.transition(TRIP_STATE.FARE_CALCULATING, { source: 'street_hail' });
    }

    arrivedAtPickup() {
      return this.transition(TRIP_STATE.ARRIVED_PICKUP);
    }

    confirmPickup() {
      if (this.currentState === TRIP_STATE.NAVIGATING_TO_PICKUP) {
        return this.arrivedAtPickup();
      }
      if (this.currentState === TRIP_STATE.ARRIVED_PICKUP && !this.isStreetHailTrip()) {
        return this.passengerOnboard();
      }
      return this.transition(TRIP_STATE.PICKUP_CONFIRMED);
    }

    passengerOnboard() {
      if (this.currentState === TRIP_STATE.NAVIGATING_TO_PICKUP) this.arrivedAtPickup();
      if (this.currentState === TRIP_STATE.ARRIVED_PICKUP && this.isStreetHailTrip()) this.transition(TRIP_STATE.PICKUP_CONFIRMED);
      if (![TRIP_STATE.ARRIVED_PICKUP, TRIP_STATE.PICKUP_CONFIRMED].includes(this.currentState)) return false;
      const moved = this.transition(TRIP_STATE.CUSTOMER_ONBOARD);
      if (!moved) return false;
      if (this.hasDestination()) {
        this.transition(TRIP_STATE.DESTINATION_SELECTED, { source: 'destination_already_selected' });
        this.transition(TRIP_STATE.TRIP_RUNNING, { source: 'destination_already_selected' });
        return this.transition(TRIP_STATE.FARE_CALCULATING, { source: 'destination_already_selected' });
      }
      return this.transition(TRIP_STATE.WAITING_DESTINATION, { source: 'destination_required' });
    }

    selectDestination(destination) {
      if (this.currentState !== TRIP_STATE.WAITING_DESTINATION) return false;
      const normalized = this.normalizeDestination(destination);
      if (!normalized) return false;
      this.currentTrip.destination = normalized;
      this.currentTrip.dropoff = normalized.address;
      this.currentTrip.dropoffLat = normalized.lat;
      this.currentTrip.dropoffLng = normalized.lng;
      this.syncLegacyContext();
      if (!this.transition(TRIP_STATE.DESTINATION_SELECTED, { destination: normalized })) return false;
      this.transition(TRIP_STATE.TRIP_RUNNING, { source: 'destination_selected' });
      return this.transition(TRIP_STATE.FARE_CALCULATING, { source: 'destination_selected' });
    }

    startDestinationRoute(destination) {
      return this.selectDestination(destination);
    }

    normalizeDestination(value) {
      if (typeof value === 'string') {
        const address = value.trim();
        return address ? { address, lat: null, lng: null } : null;
      }
      if (!value || !hasText(value.address || value.dropoff)) return null;
      return {
        address: String(value.address || value.dropoff).trim(),
        lat: value.lat != null ? number(value.lat) : (value.dropoffLat != null ? number(value.dropoffLat) : null),
        lng: value.lng != null ? number(value.lng) : (value.dropoffLng != null ? number(value.dropoffLng) : null)
      };
    }

    hasDestination() {
      const destination = this.currentTrip && this.currentTrip.destination;
      return Boolean(destination && (hasText(destination.address) || (destination.lat != null && destination.lng != null)));
    }

    completeTrip() {
      if (this.currentState !== TRIP_STATE.FARE_CALCULATING) return false;
      return this.transition(TRIP_STATE.COMPLETED, { source: 'driver' });
    }

    // Compatibility API for Firebase/UI modules that hand an order to the engine.
    acceptOrder(tripId, tripData) {
      return this.beginAppTrip(tripId, tripData || {});
    }

    assignOrder(tripId, tripData) {
      return this.beginAppTrip(tripId, tripData || {});
    }

    showCompletionConfirmation() {
      if (typeof window.showConfirmComplete === 'function') return window.showConfirmComplete();
      return this.completeTrip();
    }

    cancelTrip(reason = 'Tài xế hủy chuyến') {
      if (!this.isTripActive()) return false;
      return this.transition(TRIP_STATE.CANCELLED, { reason });
    }

    completeLegacyTrip(payload) {
      if (this._completed) return;
      this._completed = true;
      this.currentOdometerKm = this.readLegacyKm();
      const legacyComplete = window.__PromaxLegacyHandlers && window.__PromaxLegacyHandlers.completeTrip;
      if (typeof legacyComplete === 'function') {
        try { legacyComplete.call(window); } catch (error) { this.log('Lỗi hoàn tất legacy: ' + error.message, 'error'); }
      }
      this.emit('completed', {
        totalKm: this.currentOdometerKm,
        trip: this.currentTrip,
        payload
      });
      this.navigationMode = 'idle';
      this.currentState = TRIP_STATE.IDLE;
      this.currentTrip = null;
      this.fareStartedAt = null;
      this.publishLegacyState();
      this.updateFlowUI();
    }

    cancelLegacyTrip(reason) {
      const legacyCancel = window.__PromaxLegacyHandlers && window.__PromaxLegacyHandlers.cancelTrip;
      if (typeof legacyCancel === 'function') {
        try { legacyCancel.call(window); } catch (_) {}
      }
      this.emit('cancelled', { reason });
      this.navigationMode = 'idle';
      this.currentState = TRIP_STATE.IDLE;
      this.currentTrip = null;
      this.publishLegacyState();
      this.updateFlowUI();
    }

    syncLegacyContext() {
      const runtime = window.PromaxLegacyRuntime;
      if (runtime && typeof runtime.setTripContext === 'function') {
        runtime.setTripContext(this.currentTrip?.id || null, this.currentTrip || null);
      }
    }

    publishLegacyState() {
      const fare = this.isFareActive();
      const running = this.isTripActive();
      const onboard = [TRIP_STATE.CUSTOMER_ONBOARD, TRIP_STATE.WAITING_DESTINATION, TRIP_STATE.DESTINATION_SELECTED, TRIP_STATE.TRIP_RUNNING, TRIP_STATE.FARE_CALCULATING].includes(this.currentState);
      if (window.PromaxLegacyRuntime && typeof window.PromaxLegacyRuntime.setFlowState === 'function') {
        window.PromaxLegacyRuntime.setFlowState({
          isRunning: running,
          hasPickedUp: onboard,
          isStreetHail: this.isStreetHailTrip(),
          navigationMode: this.navigationMode,
          fareActive: fare
        });
      } else {
        window.navigationMode = this.navigationMode;
      }
      window.navigationMode = this.navigationMode;
      document.body && document.body.setAttribute('data-navigation-mode', this.navigationMode);
    }

    updateFlowUI() {
      const status = document.getElementById('tripStatusText');
      const panel = document.getElementById('tripInfoPanel');
      const home = document.getElementById('homeControls');
      const stats = document.getElementById('statsUI');
      const actions = document.getElementById('tripActionButtons');
      const pickupBtn = document.getElementById('pickupBtn');
      const navBtn = document.getElementById('navToPickupBtn');
      const endBtn = document.getElementById('endTripBtn');
      const km = document.getElementById('tripKmLive');
      const price = document.getElementById('tripPrice');

      if (this.currentState === TRIP_STATE.IDLE || this.currentState === TRIP_STATE.COMPLETED) {
        if (panel) panel.style.display = 'none';
        if (home) home.style.display = 'block';
        if (stats) stats.classList.remove('show');
        return;
      }

      if (panel) panel.style.display = 'block';
      if (home) home.style.display = 'none';
      if (stats) stats.classList.add('show');
      if (status) status.textContent = this.statusLabel();
      if (km) km.textContent = this.readLegacyKm().toFixed(2) + ' KM';
      if (price) price.textContent = this.currentFare().toLocaleString('vi-VN') + 'đ';

      const pickupPhase = [TRIP_STATE.DRIVER_ACCEPT, TRIP_STATE.NAVIGATING_TO_PICKUP, TRIP_STATE.ARRIVED_PICKUP].includes(this.currentState);
      const pickupConfirmed = this.currentState === TRIP_STATE.PICKUP_CONFIRMED;
      const waitingDestination = this.currentState === TRIP_STATE.WAITING_DESTINATION;
      const farePhase = this.isFareActive();

      if (actions) actions.style.display = pickupPhase || pickupConfirmed || waitingDestination ? 'flex' : 'none';
      if (pickupBtn) {
        pickupBtn.style.display = pickupPhase || pickupConfirmed ? 'block' : 'none';
        pickupBtn.textContent = this.currentState === TRIP_STATE.NAVIGATING_TO_PICKUP ? '✅ ĐÃ ĐẾN ĐIỂM ĐÓN' : '🚗 KHÁCH ĐÃ LÊN XE';
        pickupBtn.onclick = () => this.currentState === TRIP_STATE.PICKUP_CONFIRMED ? this.passengerOnboard() : this.confirmPickup();
      }
      if (navBtn) {
        navBtn.style.display = pickupPhase ? 'block' : 'none';
        navBtn.onclick = () => this.openNavigation('pickup');
      }
      if (endBtn) {
        endBtn.style.display = farePhase ? 'block' : 'none';
        endBtn.onclick = () => this.showCompletionConfirmation();
      }

      this.renderDestinationPicker(waitingDestination);
      this.renderTripDestination();
    }

    renderDestinationPicker(show) {
      const actions = document.getElementById('tripActionButtons');
      if (!actions) return;
      let box = document.getElementById('flowDestinationPicker');
      if (!show) {
        if (box) box.remove();
        return;
      }
      if (!box) {
        box = document.createElement('div');
        box.id = 'flowDestinationPicker';
        box.style.cssText = 'width:100%;display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;';
        box.innerHTML = '<input id="flowDestinationInput" type="text" placeholder="Nhập điểm đến của khách" aria-label="Điểm đến" style="flex:1;min-width:180px;padding:11px;border:1px solid #dbe4ee;border-radius:10px;" /><button id="flowDestinationBtn" type="button" style="padding:11px 14px;border:0;border-radius:10px;background:#0054a3;color:#fff;font-weight:800;">XÁC NHẬN ĐIỂM ĐẾN</button>';
        actions.appendChild(box);
        box.querySelector('#flowDestinationBtn').onclick = () => {
          const input = box.querySelector('#flowDestinationInput');
          const value = input && input.value.trim();
          if (!value) {
            if (typeof window.showToast === 'function') window.showToast('⚠️ Vui lòng nhập điểm đến');
            return;
          }
          this.selectDestination(value);
        };
      }
    }

    renderTripDestination() {
      const to = document.getElementById('tripTo');
      if (to && this.destination()) to.textContent = this.destination().address || 'Đã chọn điểm đến';
    }

    statusLabel() {
      const labels = {
        [TRIP_STATE.STREET_HAIL]: '🚕 CHUYẾN VẪY',
        [TRIP_STATE.DRIVER_ACCEPT]: '✅ ĐÃ NHẬN ĐƠN',
        [TRIP_STATE.NAVIGATING_TO_PICKUP]: '🧭 ĐANG ĐI ĐÓN KHÁCH',
        [TRIP_STATE.ARRIVED_PICKUP]: '📍 ĐÃ ĐẾN ĐIỂM ĐÓN',
        [TRIP_STATE.PICKUP_CONFIRMED]: '⏳ ĐANG CHỜ KHÁCH LÊN XE',
        [TRIP_STATE.CUSTOMER_ONBOARD]: '🚗 KHÁCH ĐÃ LÊN XE',
        [TRIP_STATE.WAITING_DESTINATION]: '🏁 CHỜ NHẬP ĐIỂM ĐẾN',
        [TRIP_STATE.DESTINATION_SELECTED]: '🧭 ĐÃ CHỌN ĐIỂM ĐẾN',
        [TRIP_STATE.TRIP_RUNNING]: '🚕 ĐANG CHẠY CHUYẾN',
        [TRIP_STATE.FARE_CALCULATING]: '💰 ĐANG TÍNH CƯỚC'
      };
      return labels[this.currentState] || this.currentState;
    }

    currentFare() {
      const km = this.readLegacyKm();
      const runtime = window.PromaxLegacyRuntime;
      const rate = runtime && typeof runtime.getRate === 'function'
        ? number(runtime.getRate(), CONFIG.FARE_PER_KM)
        : number(window.currentRate, CONFIG.FARE_PER_KM);
      return Math.max(CONFIG.MIN_FARE, Math.min(CONFIG.MAX_FARE, Math.round(km * rate)));
    }

    currentPosition() {
      if (this.lastKnownPosition) return this.lastKnownPosition;
      const runtime = window.PromaxLegacyRuntime;
      if (runtime && typeof runtime.getPosition === 'function') return runtime.getPosition();
      return null;
    }

    pickup() {
      return this.currentTrip ? {
        address: this.currentTrip.pickup || '',
        lat: this.currentTrip.pickupLat != null ? number(this.currentTrip.pickupLat) : null,
        lng: this.currentTrip.pickupLng != null ? number(this.currentTrip.pickupLng) : null
      } : null;
    }

    destination() {
      return this.currentTrip && this.currentTrip.destination ? this.currentTrip.destination : null;
    }

    updateNavigationRoute(mode) {
      const target = mode === 'pickup' ? this.pickup() : this.destination();
      if (!target) return;
      try {
        if (target.lat != null && target.lng != null && typeof window.drawRoute === 'function') {
          const position = this.currentPosition();
          if (position) window.drawRoute(position.lat, position.lng, target.lat, target.lng);
        }
      } catch (_) {}
    }

    openNavigation(mode) {
      const target = mode === 'pickup' ? this.pickup() : this.destination();
      if (!target) return false;
      const position = this.currentPosition() || {};
      const destination = target.lat != null && target.lng != null
        ? `${target.lat},${target.lng}`
        : encodeURIComponent(target.address || '');
      window.open(`https://www.google.com/maps/dir/?api=1&origin=${number(position.lat)},${number(position.lng)}&destination=${destination}&travelmode=driving`, '_blank');
      return true;
    }

    startWaitTimer() {
      this.stopWaitTimer();
      this.waitTimer = setInterval(() => {
        if (this.currentState === TRIP_STATE.WAITING_DESTINATION) this.waitTimeMin += 1 / 60;
      }, 1000);
    }

    stopWaitTimer() {
      if (this.waitTimer) clearInterval(this.waitTimer);
      this.waitTimer = null;
    }

    syncStateToFirebase(state) {
      if (!window.db || !this.currentTrip || !this.currentTrip.id) return;
      try {
        window.db.ref(`${CONFIG.FIREBASE_PATH}/${this.currentTrip.id}`).update({
          status: state,
          navigationMode: this.navigationMode,
          lastUpdate: Date.now()
        }).catch(() => {});
      } catch (_) {}
    }

    emit(type, detail = {}) {
      document.dispatchEvent(new CustomEvent(`trip:${type}`, { detail }));
    }

    playSound(type) {
      if (type === 'new_order' && typeof window.playOrderSound === 'function') window.playOrderSound();
    }

    log(message, level = 'info') {
      const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      fn.call(console, '[TripFlow]', message);
    }

    getCurrentState() { return this.currentState; }
    getCurrentTrip() { return this.currentTrip; }
    getOdometer() { return this.readLegacyKm(); }
    getWaitTime() { return this.waitTimeMin; }
    getNavigationMode() { return this.navigationMode; }

    destroy() {
      if (this.gpsWatchId && navigator.geolocation) navigator.geolocation.clearWatch(this.gpsWatchId);
      if (typeof this.gpsUnsubscribe === 'function') this.gpsUnsubscribe();
      this.stopWaitTimer();
    }
  }

  const engine = new TripEngine();
  window.tripEngine = engine;
  window.TRIP_STATE = TRIP_STATE;
  window.TRIP_TYPE = TRIP_TYPE;
  window.TRIP_FLOW_CONFIG = CONFIG;
  window.addEventListener('beforeunload', () => engine.destroy());
})(window, document);
