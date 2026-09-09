import assert from 'node:assert/strict';
import { createRideContract, RIDE_SOURCES } from '../lib/promax-ride-contract.js';
import {
  BOOKING_TYPES,
  classifyRideFlow,
  validateFlowPayload,
  evaluateDriverEligibility,
  classifyRoadPosition,
  buildDispatchDecision
} from '../lib/promax-dispatch-policy.js';

const now = 1_800_000_000_000;

assert.equal(classifyRideFlow({ booking_type: BOOKING_TYPES.STREET_HAIL }), BOOKING_TYPES.STREET_HAIL);
assert.equal(classifyRideFlow({ has_destination: false }), BOOKING_TYPES.APP_NO_DESTINATION);
assert.equal(classifyRideFlow({ has_destination: true }), BOOKING_TYPES.APP_WITH_DESTINATION);

validateFlowPayload(BOOKING_TYPES.STREET_HAIL, { pickup_location: { lat: 1, lng: 2 } });
validateFlowPayload(BOOKING_TYPES.APP_NO_DESTINATION, { pickup_location: { lat: 1, lng: 2 } });
validateFlowPayload(BOOKING_TYPES.APP_WITH_DESTINATION, { pickup_location: { lat: 1, lng: 2 }, destination_location: { lat: 3, lng: 4 } });

assert.throws(() => createRideContract({ ride_id: 'x', booking_type: RIDE_SOURCES.APP_BOOKING_DESTINATION }), /destination_location/);
assert.throws(() => validateFlowPayload(BOOKING_TYPES.APP_NO_DESTINATION, { pickup_location: {}, destination_location: {} }), /cannot carry destination/);

const busy = evaluateDriverEligibility({ id: 'D1', online: true, tp_expiry: now + 100000, active_ride_id: 'R1' }, { now, gps_valid: true });
assert.equal(busy.eligible, false);
assert.ok(busy.reasons.includes('ACTIVE_RIDE'));

const expired = evaluateDriverEligibility({ id: 'D2', online: true, tp_expiry: now - 1 }, { now, gps_valid: true });
assert.equal(expired.eligible, false);
assert.ok(expired.reasons.includes('SUBSCRIPTION_EXPIRED'));

const bridge = classifyRoadPosition({ on_bridge: true, route_progress: 0.5, expected_progress: 0.5, direction_delta_degrees: 0 });
assert.equal(bridge.blocked_for_dispatch, true);
const reverse = classifyRoadPosition({ on_bridge: false, route_progress: 0.5, expected_progress: 0.5, direction_delta_degrees: 180 });
assert.equal(reverse.wrong_direction, true);
assert.equal(reverse.blocked_for_dispatch, true);

const decision = buildDispatchDecision({
  drivers: [
    { id: 'busy' , online: true, tp_expiry: now + 100000, active_ride_id: 'R' },
    { id: 'bridge', online: true, tp_expiry: now + 100000 },
    { id: 'free', online: true, tp_expiry: now + 100000 }
  ],
  context: {
    busy: { gps_valid: true, match_score: 99 },
    bridge: { gps_valid: true, on_bridge: true, match_score: 98 },
    free: { gps_valid: true, match_score: 80, proximity_score: 10 }
  },
  region: { priority: 5 }
});
assert.equal(decision.driver.id, 'free');

console.log('dispatch-policy-test: PASS');
