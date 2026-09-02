/**
 * Taxi ProMax — immutable business contract.
 * Keep revenue rules and ride/subscription semantics out of UI code.
 */
export const BUSINESS_RULES = Object.freeze({
  commissionRate: 0,
  rideCommission: 0,
  platformRideFee: 0,
  revenueSource: 'DRIVER_SUBSCRIPTION',
  currency: 'VND',
  rideSources: Object.freeze(['STREET_HAIL', 'CUSTOMER_APP_NO_DESTINATION', 'CUSTOMER_APP_WITH_DESTINATION', 'CLOSED_SHARED_RIDE']),
  rideStates: Object.freeze(['REQUESTED','SEARCHING_DRIVER','DRIVER_ASSIGNED','DRIVER_EN_ROUTE','DRIVER_ARRIVED','PASSENGER_ONBOARD','TRIP_RUNNING','ARRIVED_DESTINATION','FARE_CALCULATING','COMPLETED','CANCELLED','EXPIRED']),
  subscriptionStates: Object.freeze(['TRIAL','ACTIVE','PAST_DUE','GRACE_PERIOD','EXPIRED','SUSPENDED'])
});

export function assertBusinessRules() {
  if (BUSINESS_RULES.commissionRate !== 0 || BUSINESS_RULES.rideCommission !== 0 || BUSINESS_RULES.platformRideFee !== 0) throw new Error('PRO_MAX_FINANCIAL_CONTRACT_VIOLATION');
  if (BUSINESS_RULES.revenueSource !== 'DRIVER_SUBSCRIPTION') throw new Error('PRO_MAX_REVENUE_SOURCE_VIOLATION');
  return true;
}

export function createRideContract(input = {}) {
  const now = Date.now();
  const rideId = String(input.rideId || `ride_${now}_${Math.random().toString(36).slice(2, 8)}`);
  const source = String(input.bookingType || input.rideSource || 'CUSTOMER_APP_WITH_DESTINATION');
  if (!BUSINESS_RULES.rideSources.includes(source)) throw new Error('INVALID_RIDE_SOURCE');
  return { ride_id: rideId, customer_id: input.customerId || null, driver_id: input.driverId || null, vehicle_id: input.vehicleId || null, booking_type: source, pickup_location: input.pickupLocation || null, destination_location: input.destinationLocation || null, route: input.route || null, distance: Number(input.distanceKm || 0), duration: Number(input.durationMinutes || 0), fare_config: input.fareConfig || null, fare_estimate: Number(input.fareEstimate || 0), final_fare: input.finalFare == null ? null : Number(input.finalFare), payment_method: input.paymentMethod || 'cash', ride_status: input.rideStatus || 'REQUESTED', gps_track: input.gpsTrack || [], gps_quality: input.gpsQuality || null, offline_events: input.offlineEvents || [], created_at: Number(input.createdAt || now), updated_at: now };
}

export function subscriptionStatus(subscription = {}, now = Date.now()) {
  const expiresAt = Number(subscription.expire_at ?? subscription.expireAt ?? 0);
  const startAt = Number(subscription.start_at ?? subscription.startAt ?? 0);
  const explicit = String(subscription.status || '').toUpperCase();
  if (explicit === 'SUSPENDED') return 'SUSPENDED';
  if (expiresAt > now) return explicit === 'TRIAL' ? 'TRIAL' : 'ACTIVE';
  const graceUntil = Number(subscription.grace_period_until ?? subscription.gracePeriodUntil ?? 0);
  if (graceUntil > now && startAt > 0) return 'GRACE_PERIOD';
  return 'EXPIRED';
}

export function canDriverGoOnline(subscription, now = Date.now()) {
  const status = subscriptionStatus(subscription, now);
  return { allowed: status === 'ACTIVE' || status === 'TRIAL' || status === 'GRACE_PERIOD', status };
}

export function canAcceptNewRide(subscription, now = Date.now()) {
  const result = canDriverGoOnline(subscription, now);
  return { allowed: result.allowed, status: result.status, reason: result.allowed ? null : 'SUBSCRIPTION_EXPIRED' };
}

export function buildSubscriptionRecord({ driverId, planId = 'driver-monthly', startAt = Date.now(), durationDays = 30, autoRenew = false, graceDays = 3 } = {}) {
  const start = Number(startAt);
  const expire = start + Number(durationDays) * 86400000;
  return { plan_id: String(planId), driver_id: String(driverId || ''), start_at: start, expire_at: expire, status: 'ACTIVE', auto_renew: Boolean(autoRenew), grace_period_until: expire + Number(graceDays) * 86400000, updated_at: Date.now() };
}

assertBusinessRules();
