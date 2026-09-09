import { RIDE_SOURCES } from './promax-ride-contract.js';

export const BOOKING_TYPES = Object.freeze({
  STREET_HAIL: RIDE_SOURCES.STREET_HAIL,
  APP_NO_DESTINATION: 'APP_BOOKING_NO_DESTINATION',
  APP_WITH_DESTINATION: 'APP_BOOKING_DESTINATION',
  SHARED_RIDE: RIDE_SOURCES.SHARED_RIDE
});

export const DRIVER_BLOCK_REASONS = Object.freeze({
  ACTIVE_RIDE: 'ACTIVE_RIDE',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  OFFLINE: 'OFFLINE',
  GPS_INVALID: 'GPS_INVALID',
  ON_RESTRICTED_ROUTE: 'ON_RESTRICTED_ROUTE',
  WRONG_DIRECTION: 'WRONG_DIRECTION'
});

const ACTIVE_RIDE_STATES = new Set([
  'OFFERED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED',
  'PASSENGER_ONBOARD', 'IN_PROGRESS'
]);

export function classifyRideFlow(input = {}) {
  if (input.booking_type === BOOKING_TYPES.STREET_HAIL || input.ride_source === BOOKING_TYPES.STREET_HAIL) {
    return BOOKING_TYPES.STREET_HAIL;
  }
  if (input.booking_type === BOOKING_TYPES.APP_NO_DESTINATION || input.has_destination === false) {
    return BOOKING_TYPES.APP_NO_DESTINATION;
  }
  if (input.booking_type === BOOKING_TYPES.APP_WITH_DESTINATION || input.has_destination === true) {
    return BOOKING_TYPES.APP_WITH_DESTINATION;
  }
  if (input.booking_type === BOOKING_TYPES.SHARED_RIDE || input.ride_source === BOOKING_TYPES.SHARED_RIDE) {
    return BOOKING_TYPES.SHARED_RIDE;
  }
  throw new Error('Ride flow must be explicitly selected');
}

export function validateFlowPayload(flow, input = {}) {
  if (flow === BOOKING_TYPES.STREET_HAIL) {
    if (!input.pickup_location) throw new Error('Street hail requires pickup_location');
    if (input.destination_location) throw new Error('Street hail must not require a destination before boarding');
    return true;
  }
  if (flow === BOOKING_TYPES.APP_NO_DESTINATION) {
    if (!input.pickup_location) throw new Error('No-destination booking requires pickup_location');
    if (input.destination_location) throw new Error('No-destination flow cannot carry destination at request time');
    return true;
  }
  if (flow === BOOKING_TYPES.APP_WITH_DESTINATION) {
    if (!input.pickup_location || !input.destination_location) {
      throw new Error('Destination booking requires pickup_location and destination_location');
    }
    return true;
  }
  if (flow === BOOKING_TYPES.SHARED_RIDE) {
    if (!input.pickup_location || !input.destination_location) throw new Error('Shared ride requires origin and destination');
    if (!Number.isInteger(Number(input.seats_requested)) || Number(input.seats_requested) < 1) {
      throw new Error('Shared ride requires positive seats_requested');
    }
    return true;
  }
  throw new Error(`Unknown ride flow: ${flow}`);
}

export function isDriverSubscriptionActive(driver = {}, now = Date.now()) {
  const expiry = Number(driver.tp_expiry ?? driver.subscription_expire_at);
  return Number.isFinite(expiry) && expiry > now;
}

export function hasActiveRide(driver = {}) {
  if (driver.active_ride_id || driver.activeRideId) return true;
  return ACTIVE_RIDE_STATES.has(String(driver.ride_status || driver.active_ride_status || '').toUpperCase());
}

export function evaluateDriverEligibility(driver = {}, context = {}) {
  const now = Number(context.now ?? Date.now());
  const result = { eligible: true, reasons: [], score: 0 };
  if (driver.online === false || driver.status === 'OFFLINE') {
    result.eligible = false; result.reasons.push(DRIVER_BLOCK_REASONS.OFFLINE);
  }
  if (!isDriverSubscriptionActive(driver, now)) {
    result.eligible = false; result.reasons.push(DRIVER_BLOCK_REASONS.SUBSCRIPTION_EXPIRED);
  }
  if (hasActiveRide(driver)) {
    result.eligible = false; result.reasons.push(DRIVER_BLOCK_REASONS.ACTIVE_RIDE);
  }
  if (context.gps_valid === false) {
    result.eligible = false; result.reasons.push(DRIVER_BLOCK_REASONS.GPS_INVALID);
  }
  if (context.on_restricted_route === true) {
    result.eligible = false; result.reasons.push(DRIVER_BLOCK_REASONS.ON_RESTRICTED_ROUTE);
  }
  if (context.wrong_direction === true) {
    result.eligible = false; result.reasons.push(DRIVER_BLOCK_REASONS.WRONG_DIRECTION);
  }
  if (result.eligible) result.score = Number(context.match_score ?? 0);
  return result;
}

export function rankEligibleDrivers(drivers = [], context = {}) {
  return drivers
    .map((driver) => ({ driver, eligibility: evaluateDriverEligibility(driver, context[driver.id] || context) }))
    .filter((entry) => entry.eligibility.eligible)
    .sort((a, b) => b.eligibility.score - a.eligibility.score)
    .map((entry) => entry.driver);
}

export function classifyRoadPosition({ on_bridge = false, route_progress = 0, expected_progress = 0, direction_delta_degrees = 0 } = {}) {
  const directionDelta = Math.abs(Number(direction_delta_degrees));
  const progressDelta = Math.abs(Number(route_progress) - Number(expected_progress));
  return {
    on_bridge: Boolean(on_bridge),
    wrong_direction: directionDelta >= 120,
    off_route: progressDelta >= 0.35,
    blocked_for_dispatch: Boolean(on_bridge) || directionDelta >= 120 || progressDelta >= 0.35
  };
}

export function buildDispatchDecision({ drivers = [], context = {}, region = null } = {}) {
  const regionBoost = Number(region?.priority ?? 0);
  const ranked = drivers
    .map((driver) => {
      const driverContext = context[driver.id] || {};
      const road = classifyRoadPosition(driverContext);
      const eligibility = evaluateDriverEligibility(driver, { ...driverContext, ...road });
      const score = eligibility.eligible
        ? Number(driverContext.match_score ?? 0) + regionBoost + Number(driverContext.proximity_score ?? 0)
        : -Infinity;
      return { driver, eligibility, road, score };
    })
    .filter((entry) => entry.eligibility.eligible)
    .sort((a, b) => b.score - a.score);
  return ranked[0] || null;
}
