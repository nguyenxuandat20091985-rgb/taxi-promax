import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const sw = read('sw.js');
const map = read('js/map.js');
const premium = read('js/driver/03-premium-ui.js');
const core = read('js/driver/00-core-runtime.js');
const cockpit = read('js/modules/cockpit.js');
const cockpitInline = read('js/driver/22-cockpit-inline.js');
const gpsBoost = read('js/modules/gps-boost.js');
const gpsBoostInline = read('js/driver/15-gps-boost-inline.js');
const dashboard = read('js/modules/driver-dashboard.js');
const dashboardCss = read('css/driver-dashboard.css');

assert.match(html, /<script src="js\/map\.js\?v=20260827-ui3"><\/script>/);
assert.match(html, /<script src="js\/driver\/03-premium-ui\.js\?v=20260827-ui3"><\/script>/);
assert.match(html, /<script src="js\/driver\/00-core-runtime\.js\?v=20260827-ui3"><\/script>/);
assert.match(html, /driver-dashboard\.css\?v=20260828-dashboard2/);
assert.match(html, /driver-dashboard\.js\?v=20260828-dashboard2/);
assert.doesNotMatch(map, /basemaps\.cartocdn\.com|cartodb/i);
assert.doesNotMatch(cockpit, /basemaps\.cartocdn\.com|cartodb/i);
assert.doesNotMatch(cockpitInline, /basemaps\.cartocdn\.com|cartodb/i);
assert.match(map, /tile\.openstreetmap\.org/);
assert.match(map, /OpenStreetMap contributors/);
assert.equal((map.match(/\.map\(/g) || []).length, 1, 'map.js must have one Leaflet map owner');

// Premium nav phải hỗ trợ cả nhãn tiếng Việt và tiếng Anh.
assert.match(premium, /<svg viewBox=/);
assert.match(premium, /trang chu/);
assert.match(premium, /history/);
assert.match(premium, /nav-ico svg/);
assert.doesNotMatch(premium, /return key \? ICONS\[key\] : .*fa-circle/);

// Chỉ GPS core được phép chạy watcher chính.
assert.doesNotMatch(gpsBoost, /watchPosition\s*\(/);
assert.doesNotMatch(gpsBoostInline, /watchPosition\s*\(/);
assert.doesNotMatch(cockpit, /if\s*\(navigator\.geolocation\)\s*\{\s*navigator\.geolocation\.watchPosition/);
assert.doesNotMatch(cockpitInline, /if\s*\(navigator\.geolocation\)\s*\{\s*navigator\.geolocation\.watchPosition/);
assert.match(core, /enableHighAccuracy:\s*true/);
assert.match(core, /maximumAge:\s*0/);
assert.match(core, /accuracy > ACCURACY_MAX/);
assert.match(core, /Gần đúng/);

// Service worker phải xóa cache cũ và không precache Carto/API key cũ.
assert.match(sw, /taxi-promax-v8-20260827-ui3/);

// Bố cục compact: GPS/Online giữ ở vị trí gốc, thuê bao và chẩn đoán nằm trong menu.
assert.match(dashboard, /removeOldHomeCards/);
assert.doesNotMatch(dashboard, /className\s*=\s*['"]pmx-home-dashboard/);
assert.doesNotMatch(dashboard, /className\s*=\s*['"]pmx-subscription-card/);
assert.match(dashboard, /pmxDiagnosticsMenuItem/);
assert.match(dashboard, /Gói thuê bao tháng/);
assert.match(dashboardCss, /pmx-diagnostic-sheet/);
assert.doesNotMatch(sw, /basemaps\.cartocdn\.com|CARTODB TILES/i);

console.log('ui regression tests: OK');
