import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const html = read('index.html');
const core = read('js/driver/00-core-runtime.js');
const tripEngine = read('js/modules/trip-engine-v4.js');
const initTrip = read('js/init-trip.js');
const runtime = `${core}\n${tripEngine}\n${initTrip}`;

// The page is now a markup shell. All runtime scripts must be external files.
assert.doesNotMatch(html, /<script\b(?![^>]*\bsrc=)[^>]*>/i, 'index.html still contains an inline script');
assert.match(html, /<link rel="stylesheet" href="css\/driver\.css">/);
assert.match(html, /<link rel="stylesheet" href="css\/driver-overrides\.css">/);
assert.equal((html.match(/<script\s+src=["']js\/map\.js["']/g) || []).length, 1, 'map.js must be loaded once');

for (const relativePath of [
  'js/driver/00-core-runtime.js',
  'js/driver/01-clean-fix.js',
  'js/driver/22-cockpit-inline.js',
  'js/driver/27-gps-final.js',
  'js/modules/promax-care-ai.js',
  'js/modules/trip-engine-v4.js',
  'js/init-trip.js'
]) {
  assert.ok(html.includes(`src="${relativePath}"`), `missing script tag ${relativePath}`);
  assert.ok(fs.existsSync(path.join(root, relativePath)), `missing file ${relativePath}`);
}

for (const marker of [
  'function handleTrip',
  'function acceptOrder',
  'function confirmPickup',
  'function completeTrip',
  'let isRunning',
  'let hasPickedUp',
  'TRIP_STATE',
  'window.tripEngine',
  "document.addEventListener('trip:status'"
]) {
  assert.match(runtime, new RegExp(marker.replace(/[.*+?^${}()|[\[\]\\]/g, '\\$&')), `missing runtime marker ${marker}`);
}

for (const state of ['IDLE', 'ASSIGNED', 'ACCEPTED', 'TO_PICKUP', 'ARRIVED', 'WAITING', 'ONBOARD', 'TO_DESTINATION', 'COMPLETED']) {
  assert.match(tripEngine, new RegExp(`\\b${state}:`), `missing Trip Engine state ${state}`);
}

console.log('flow contract tests: OK');
