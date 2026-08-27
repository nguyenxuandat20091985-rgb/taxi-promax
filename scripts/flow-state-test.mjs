import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'js/modules/trip-engine-v4.js'), 'utf8');

function createEngine() {
  const events = [];
  const legacyState = { km: 0, navigationMode: 'idle', fareActive: false, context: null };
  const elements = new Map();
  const body = { setAttribute() {} };
  const document = {
    body,
    addEventListener() {},
    dispatchEvent(event) { events.push(event); return true; },
    getElementById(id) { return elements.get(id) || null; },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {}, addEventListener() {} }; }
  };
  const window = {
    addEventListener() {},
    open() {},
    PromaxLegacyRuntime: {
      getTotalKm: () => legacyState.km,
      getRate: () => 15000,
      getPosition: () => ({ lat: 21.0285, lng: 105.8542 }),
      setTripContext: (id, data) => { legacyState.context = { id, data }; },
      setFlowState: (next) => Object.assign(legacyState, next)
    },
    __PromaxLegacyHandlers: {
      completeTrip() { return true; },
      cancelTrip() { return true; }
    },
    showToast() {},
    drawRoute() {}
  };
  const context = {
    window,
    document,
    navigator: {},
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    setInterval() { return 1; },
    clearInterval() {},
    console: { log() {}, warn() {}, error() {} }
  };
  vm.runInNewContext(source, context, { filename: 'trip-engine-v4.js' });
  return { engine: window.tripEngine, events, legacyState };
}

function statuses(events) {
  return events.filter((event) => event.type === 'trip:status').map((event) => event.detail.status);
}

// Flow 1: street hail starts only after the complete pickup/onboard sequence.
{
  const { engine, events } = createEngine();
  assert.equal(engine.startStreetHail(), true);
  assert.deepEqual(statuses(events), [
    'STREET_HAIL', 'DRIVER_ACCEPT', 'PICKUP_CONFIRMED', 'CUSTOMER_ONBOARD',
    'TRIP_RUNNING', 'FARE_CALCULATING'
  ]);
  assert.equal(engine.getNavigationMode(), 'idle');
  assert.equal(engine.isFareActive(), true);
  assert.equal(engine.completeTrip(), true);
  assert.equal(engine.getCurrentState(), 'IDLE');
}

// Flow 2: an order without destination must wait for destination selection.
{
  const { engine, events } = createEngine();
  assert.equal(engine.beginAppTrip('no-destination', { pickup: 'A', pickupLat: 21, pickupLng: 105 }), true);
  assert.equal(engine.getNavigationMode(), 'pickup');
  assert.equal(engine.arrivedAtPickup(), true);
  assert.equal(engine.passengerOnboard(), true);
  assert.equal(engine.getCurrentState(), 'WAITING_DESTINATION');
  assert.equal(engine.isFareActive(), false);
  assert.equal(engine.selectDestination({ address: 'B', lat: 21.1, lng: 105.1 }), true);
  assert.equal(engine.getNavigationMode(), 'destination');
  assert.equal(engine.isFareActive(), true);
  assert.deepEqual(statuses(events), [
    'DRIVER_ACCEPT', 'NAVIGATING_TO_PICKUP', 'ARRIVED_PICKUP', 'CUSTOMER_ONBOARD',
    'WAITING_DESTINATION', 'DESTINATION_SELECTED', 'TRIP_RUNNING', 'FARE_CALCULATING'
  ]);
}

// Flow 3: pickup navigation is active immediately after accepting an order.
{
  const { engine } = createEngine();
  assert.equal(engine.beginAppTrip('pickup-only', { pickup: 'A', pickupLat: 21, pickupLng: 105 }), true);
  assert.equal(engine.getCurrentState(), 'NAVIGATING_TO_PICKUP');
  assert.equal(engine.getNavigationMode(), 'pickup');
}

// Flow 4: an order with destination switches to destination navigation only
// after the customer is onboard and starts fare calculation afterwards.
{
  const { engine, events } = createEngine();
  assert.equal(engine.beginAppTrip('with-destination', {
    pickup: 'A', pickupLat: 21, pickupLng: 105,
    dropoff: 'B', dropoffLat: 21.1, dropoffLng: 105.1
  }), true);
  assert.equal(engine.arrivedAtPickup(), true);
  assert.equal(engine.passengerOnboard(), true);
  assert.equal(engine.getCurrentState(), 'FARE_CALCULATING');
  assert.equal(engine.getNavigationMode(), 'destination');
  assert.deepEqual(statuses(events), [
    'DRIVER_ACCEPT', 'NAVIGATING_TO_PICKUP', 'ARRIVED_PICKUP', 'CUSTOMER_ONBOARD',
    'DESTINATION_SELECTED', 'TRIP_RUNNING', 'FARE_CALCULATING'
  ]);
}

console.log('flow state tests: OK');
