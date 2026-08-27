import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const requiredStates = [
  'IDLE', 'ONLINE_WAITING', 'ORDER_RECEIVED', 'ORDER_ACCEPTED',
  'NAVIGATING_TO_PICKUP', 'ARRIVED_PICKUP', 'WAITING_CUSTOMER',
  'CUSTOMER_ONBOARD', 'DESTINATION_PENDING', 'DESTINATION_CONFIRMED',
  'NAVIGATING_TO_DESTINATION', 'TRIP_RUNNING', 'ARRIVED_DESTINATION',
  'COMPLETING_TRIP', 'TRIP_COMPLETED', 'SAVED'
];
for (const state of requiredStates) assert.match(html, new RegExp(`\\b${state}:`), `missing state ${state}`);
for (const marker of [
  'confirmArrivedPickup', 'confirmPickup', 'confirmDestinationFromUI', 'completeTrip',
  'pickupNavigation = true', 'fareCounting = false', 'fareCounting = true',
  'PromaxGPSCore', 'trip:completed', 'trip:history-saved'
]) assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')), `missing flow marker ${marker}`);
assert.match(html, /if \(!isRunning \|\| !hasPickedUp \|\| pickupNavigation \|\| isStreetHail\)/);
assert.match(html, /if \(!currentOrderId \|\| !currentCustomerData \|\| !isRunning \|\| !pickupNavigation\)/);
console.log('flow contract tests: OK');
