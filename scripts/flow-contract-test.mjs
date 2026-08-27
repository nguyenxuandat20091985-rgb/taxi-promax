import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const html = read('index.html');
const core = read('js/driver/00-core-runtime.js');
const flow = read('js/modules/trip-engine-v4.js');
const adapter = read('js/init-trip.js');
const cockpit = read('js/modules/cockpit.js');
const gpsDual = read('js/driver/25-gps-dual.js');
const gpsFinal = read('js/driver/27-gps-final.js');

assert.doesNotMatch(html, /<script\b(?![^>]*\bsrc=)[^>]*>/i, 'index.html still contains an inline script');
assert.match(html, /<link rel="stylesheet" href="css\/driver\.css">/);
assert.match(html, /<link rel="stylesheet" href="css\/driver-overrides\.css">/);
for (const relativePath of ['css/driver.css', 'css/driver-overrides.css']) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `missing stylesheet ${relativePath}`);
}
assert.ok(!fs.readdirSync(path.join(root, 'css')).some((name) => /[\u200B-\u200D\uFEFF]/.test(name)), 'css filename contains a hidden character');
assert.equal((html.match(/<script\s+src=["']js\/map\.js["']/g) || []).length, 1, 'map.js must be loaded once');

for (const relativePath of [
  'js/driver/00-core-runtime.js',
  'js/driver/25-gps-dual.js',
  'js/driver/27-gps-final.js',
  'js/modules/trip-engine-v4.js',
  'js/modules/ai-copilot-v4.js',
  'js/init-trip.js'
]) {
  assert.ok(html.includes(`src="${relativePath}"`), `missing script tag ${relativePath}`);
  assert.ok(fs.existsSync(path.join(root, relativePath)), `missing file ${relativePath}`);
}

for (const state of [
  'IDLE', 'STREET_HAIL', 'DRIVER_ACCEPT', 'NAVIGATING_TO_PICKUP',
  'ARRIVED_PICKUP', 'PICKUP_CONFIRMED', 'CUSTOMER_ONBOARD',
  'WAITING_DESTINATION', 'DESTINATION_SELECTED', 'TRIP_RUNNING',
  'FARE_CALCULATING', 'COMPLETED'
]) {
  assert.match(flow, new RegExp(`\\b${state}:`), `missing flow state ${state}`);
}

for (const marker of [
  'navigationMode', 'isFareActive', 'startStreetHail', 'beginAppTrip',
  'selectDestination', 'setFlowState', 'setTripContext', 'processLocation',
  'function handleTrip', 'function acceptOrder', 'function confirmPickup',
  'function completeTrip'
]) {
  const source = ['setFlowState', 'setTripContext', 'processLocation', 'function handleTrip', 'function acceptOrder', 'function confirmPickup', 'function completeTrip'].includes(marker)
    ? core
    : `${flow}\n${adapter}`;
  assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\[\]\\]/g, '\\$&')), `missing flow marker ${marker}`);
}

// No secondary GPS patch may add fare distance outside the core state gate.
assert.doesNotMatch(gpsDual, /totalKm\s*\+=/);
assert.doesNotMatch(gpsFinal, /totalKm\s*\+=/);
assert.match(core, /fareActive\s*=\s*!window\.tripEngine/);
assert.match(core, /processLocation:\s*function/);
assert.match(cockpit, /isFareActive\(\)/);

console.log('flow contract tests: OK');
