export const RIDE_SOURCES = Object.freeze({
  STREET_HAIL: 'STREET_HAIL',
  APP_BOOKING_NO_DESTINATION: 'APP_BOOKING_NO_DESTINATION',
  APP_BOOKING_DESTINATION: 'APP_BOOKING_DESTINATION',
  SHARED_RIDE: 'SHARED_RIDE'
});

export const RIDE_STATES = Object.freeze([
  'REQUESTED', 'OFFERED', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED',
  'PASSENGER_ONBOARD', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
]);

const TRANSITIONS = Object.freeze({
  REQUESTED: ['OFFERED', 'ACCEPTED', 'CANCELLED'],
  OFFERED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['DRIVER_EN_ROUTE', 'CANCELLED'],
  DRIVER_EN_ROUTE: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['PASSENGER_ONBOARD', 'CANCELLED'],
  PASSENGER_ONBOARD: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
});

export function canTransition(from, to) {
  return Array.isArray(TRANSITIONS[from]) && TRANSITIONS[from].includes(to);
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) throw new Error(`Invalid ride transition: ${from} -> ${to}`);
}

export function createRideContract(input = {}) {
  const source = input.booking_type || input.ride_source;
  if (!Object.values(RIDE_SOURCES).includes(source)) {
    throw new Error('booking_type must be STREET_HAIL, APP_BOOKING_NO_DESTINATION, APP_BOOKING_DESTINATION or SHARED_RIDE');
  }
  if (!input.ride_id) throw new Error('ride_id is required');
  if (source === RIDE_SOURCES.APP_BOOKING_DESTINATION && !input.destination_location) {
    throw new Error('APP_BOOKING_DESTINATION requires destination_location');
  }
  if (source === RIDE_SOURCES.APP_BOOKING_NO_DESTINATION && input.destination_location) {
    throw new Error('APP_BOOKING_NO_DESTINATION cannot set destination before acceptance');
  }
  if (source === RIDE_SOURCES.STREET_HAIL && input.destination_location) {
    throw new Error('STREET_HAIL cannot require destination before boarding');
  }
  return {
    ride_id: String(input.ride_id),
    customer_id: input.customer_id ?? null,
    driver_id: input.driver_id ?? null,
    vehicle_id: input.vehicle_id ?? null,
    booking_type: source,
    pickup_location: input.pickup_location ?? null,
    destination_location: input.destination_location ?? null,
    route: input.route ?? null,
    distance: Number.isFinite(Number(input.distance)) ? Number(input.distance) : 0,
    duration: Number.isFinite(Number(input.duration)) ? Number(input.duration) : 0,
    fare_config: input.fare_config ?? null,
    fare_estimate: input.fare_estimate ?? null,
    final_fare: input.final_fare ?? null,
    payment_method: input.payment_method ?? 'CASH',
    ride_status: input.ride_status ?? 'REQUESTED',
    gps_track: Array.isArray(input.gps_track) ? input.gps_track : [],
    gps_quality: input.gps_quality ?? null,
    offline_events: Array.isArray(input.offline_events) ? input.offline_events : [],
    created_at: input.created_at ?? Date.now(),
    updated_at: input.updated_at ?? Date.now()
  };
}
