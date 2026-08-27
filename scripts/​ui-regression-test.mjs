import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const map = read('js/map.js');
const premium = read('js/driver/03-premium-ui.js');
const core = read('js/driver/00-core-runtime.js');
const cockpit = read('js/modules/cockpit.js');
const cockpitInline = read('js/driver/22-cockpit-inline.js');
const gpsBoost = read('js/modules/gps-boost.js');
const gpsBoostInline = read('js/driver/15-gps-boost-inline.js');

assert.match(html, /<script src="js\/map\.js"><\/script>/);
assert.match(html, /<script src="js\/driver\/03-premium-ui\.js"><\/script>/);
assert.doesNotMatch(map, /basemaps\.cartocdn\.com|cartodb/i);
assert.doesNotMatch(cockpit, /basemaps\.cartocdn\.com|cartodb/i);
assert.doesNotMatch(cockpitInline, /basemaps\.cartocdn\.com|cartodb/i);
assert.match(map, /tile\.openstreetmap\.org/);
assert.match(map, /OpenStreetMap contributors/);
assert.equal((map.match(/\.map\(/g) || []).length, 1, 'map.js must have one Leaflet map owner');

// Bottom navigation must render without Font Awesome being available.
assert.match(premium, /<svg viewBox=/);
assert.match(premium, /Trang chủ/);
assert.match(premium, /Lịch sử/);
assert.match(premium, /nav-ico svg/);

// Only the core GPS path may run the normal watch. Boost/cockpit helpers must
// not open low-accuracy duplicate watchers or overwrite the GPS pill.
assert.doesNotMatch(gpsBoost, /watchPosition\s*\(/);
assert.doesNotMatch(gpsBoostInline, /watchPosition\s*\(/);
assert.doesNotMatch(cockpit, /if\s*\(navigator\.geolocation\)\s*\{\s*navigator\.geolocation\.watchPosition/);
assert.doesNotMatch(cockpitInline, /if\s*\(navigator\.geolocation\)\s*\{\s*navigator\.geolocation\.watchPosition/);
assert.match(core, /enableHighAccuracy:\s*true/);
assert.match(core, /maximumAge:\s*0/);
assert.match(core, /accuracy > ACCURACY_MAX/);
assert.match(core, /Gần đúng/);

console.log('ui regression tests: OK');
