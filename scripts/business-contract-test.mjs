import assert from 'node:assert/strict';
import { BUSINESS_RULES, createRideContract, subscriptionStatus, canDriverGoOnline, buildSubscriptionRecord } from '../lib/promax-business-rules.js';

assert.equal(BUSINESS_RULES.commissionRate, 0);
assert.equal(BUSINESS_RULES.rideCommission, 0);
assert.equal(BUSINESS_RULES.platformRideFee, 0);
assert.equal(BUSINESS_RULES.revenueSource, 'DRIVER_SUBSCRIPTION');
assert.deepEqual(BUSINESS_RULES.rideSources, ['STREET_HAIL','CUSTOMER_APP_NO_DESTINATION','CUSTOMER_APP_WITH_DESTINATION','CLOSED_SHARED_RIDE']);

const ride = createRideContract({ customerId: 'c1', driverId: 'd1', vehicleId: 'v1', bookingType: 'STREET_HAIL', pickupLocation: { lat: 21, lng: 105 }, destinationLocation: { lat: 21.1, lng: 105.1 } });
assert.equal(ride.booking_type, 'STREET_HAIL');
assert.equal(ride.ride_status, 'REQUESTED');
assert.equal(typeof ride.ride_id, 'string');

const now = Date.now();
const active = buildSubscriptionRecord({ driverId: 'd1', startAt: now - 86400000, durationDays: 30 });
assert.equal(subscriptionStatus(active, now), 'ACTIVE');
assert.equal(canDriverGoOnline(active, now).allowed, true);
assert.equal(subscriptionStatus({ start_at: now - 60_000, expire_at: now - 1, grace_period_until: now + 86400000, status: 'EXPIRED' }, now), 'GRACE_PERIOD');
assert.equal(canDriverGoOnline({ start_at: now - 60_000, expire_at: now - 1, status: 'EXPIRED' }, now).allowed, false);
console.log('business-contract-test: PASS');
