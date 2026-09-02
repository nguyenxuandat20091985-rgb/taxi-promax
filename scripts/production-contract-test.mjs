import assert from 'node:assert/strict';
import { canTransition, createRideContract } from '../lib/promax-ride-contract.js';
import fs from 'node:fs';

const rules = JSON.parse(fs.readFileSync('config/promax-business-rules.json', 'utf8'));
const pricing = JSON.parse(fs.readFileSync('config/pricing.json', 'utf8'));

assert.equal(rules.commission_rate, 0);
assert.equal(rules.ride_commission, 0);
assert.equal(rules.platform_ride_fee, 0);
assert.equal(rules.revenue_source, 'DRIVER_SUBSCRIPTION');
assert.equal(rules.pricing_source, 'SERVER_CONFIG');
assert.equal(rules.gps_policy.single_authoritative_track, true);
assert.equal(rules.gps_policy.offline_event_queue, true);

for (const source of ['STREET_HAIL', 'APP_BOOKING', 'SHARED_RIDE']) assert.ok(rules.ride_sources.includes(source));
assert.ok(canTransition('REQUESTED', 'OFFERED'));
assert.ok(canTransition('IN_PROGRESS', 'COMPLETED'));
assert.equal(canTransition('COMPLETED', 'IN_PROGRESS'), false);
assert.equal(canTransition('CANCELLED', 'IN_PROGRESS'), false);

const ride = createRideContract({ ride_id: 'TEST1', booking_type: 'STREET_HAIL' });
assert.equal(ride.ride_id, 'TEST1');
assert.equal(ride.booking_type, 'STREET_HAIL');
assert.equal(ride.ride_status, 'REQUESTED');

for (const zone of ['URBAN', 'PROVINCE']) {
  for (const vehicle of ['4_SEATS', '7_SEATS']) {
    const cfg = pricing.zones[zone][vehicle];
    assert.ok(cfg.base_distance_km > 0);
    assert.ok(cfg.base_fare > 0);
    assert.ok(cfg.tier1_rate > 0);
    assert.ok(cfg.tier2_rate > 0);
  }
}

console.log('production-contract-test: PASS');
