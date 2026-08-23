/**
 * =============================================================================
 * TAXI PROMAX — AI ĐỊNH VỊ CHUYÊN SÂU (1 FILE)
 * =============================================================================
 * Mục tiêu: vị trí tài xế + khách tin cậy hơn → đón đúng, tài xế đỡ vất vả.
 *
 * POST /api/ai-location
 *
 * Intents:
 *   assess          — đánh giá 1 điểm GPS (accuracy, nhảy, severity)
 *   clean_track     — lọc + làm mượt chuỗi điểm tài xế
 *   normalize_pickup — chuẩn hóa điểm đón (lịch sử điểm tốt + optional OSRM)
 *   fuse_pickup     — hợp nhất GPS tài xế + khách lúc đang đón + hướng dẫn last-mile
 *   eta             — ETA / khoảng cách (haversine + optional route)
 *   report_pickup_success — học điểm đón thành công (để lần sau gợi ý)
 *   hotspot_gps     — khu vực hay lỗi GPS (báo admin)
 *   status          — cấu hình + thống kê ngắn
 *
 * Public (app gọi được): assess, clean_track, normalize_pickup, fuse_pickup, eta, report_pickup_success
 * Admin/Cron: hotspot_gps, status (hoặc tất cả)
 *
 * Firebase:
 *   location_intel/good_pickups/{geohash} — điểm đón đã đón thành công
 *   location_intel/gps_issues/           — log lỗi GPS
 *   location_intel/stats
 *   admin_notifications                  — báo admin khi sóng kém hàng loạt
 *
 * Env: FIREBASE_DATABASE_URL, ALLOWED_ORIGINS, OSRM_URL (optional)
 * =============================================================================
 */

const FIREBASE_URL = String(
  process.env.FIREBASE_DATABASE_URL ||
    'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/$/, '');

const OSRM_URL = String(process.env.OSRM_URL || 'https://router.project-osrm.org').replace(/\/$/, '');

const CFG = Object.freeze({
  version: 'ai-location-v1',
  maxJumpKm: 2.2,
  maxSpeedKph: 160,
  warnAccuracyM: 45,
  criticalAccuracyM: 100,
  staleMs: 90_000,
  pickupSnapRadiusKm: 0.12, // ~120m tìm điểm đón tốt đã học
  fuseCloseM: 80,
  fuseFarM: 250,
  goodPickupMinSamples: 1
});

function cleanText(v, max = 500) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}
function finite(v, fb = NaN) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}
function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

function applyCors(req, res) {
  const allowed = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers?.origin;
  if (origin && (allowed.length === 0 || allowed.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function fb(path, options = {}) {
  const res = await fetch(`${FIREBASE_URL}/${path}.json`, {
    ...options,
    signal: AbortSignal.timeout(options.timeout || 9000),
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(`Firebase HTTP ${res.status}`);
  return res.json();
}
async function fbPut(path, data) {
  return fb(path, { method: 'PUT', body: JSON.stringify(data) });
}
async function fbPost(path, data) {
  return fb(path, { method: 'POST', body: JSON.stringify(data) });
}

function haversineKm(a, b) {
  const lat1 = finite(a?.lat);
  const lon1 = finite(a?.lng ?? a?.lon);
  const lat2 = finite(b?.lat);
  const lon2 = finite(b?.lng ?? b?.lon);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return NaN;
  const R = Math.PI / 180;
  const dLat = (lat2 - lat1) * R;
  const dLon = (lon2 - lon1) * R;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * R) * Math.cos(lat2 * R) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function bearingDeg(a, b) {
  const lat1 = finite(a.lat) * (Math.PI / 180);
  const lat2 = finite(b.lat) * (Math.PI / 180);
  const dLon = (finite(b.lng ?? b.lon) - finite(a.lng ?? a.lon)) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

function compassLabel(deg) {
  const d = ((deg % 360) + 360) % 360;
  const labels = ['Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'];
  return labels[Math.round(d / 45) % 8];
}

/** Geohash-ish grid ~150m for learning pickups */
function cellKey(lat, lng, precision = 3) {
  const la = finite(lat);
  const ln = finite(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null;
  // ~0.001 deg ~ 111m
  const p = Math.pow(10, precision);
  return `${Math.round(la * p)}_${Math.round(ln * p)}`;
}

// ---------------------------------------------------------------------------
// Assess single point
// ---------------------------------------------------------------------------
function assessPoint(point, previous = null) {
  const lat = finite(point?.lat);
  const lng = finite(point?.lng ?? point?.lon);
  const accuracy = finite(point?.accuracy, 999);
  const ts = finite(point?.timestamp || point?.ts || Date.now(), Date.now());
  const now = Date.now();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      ok: false,
      severity: 'critical',
      reason: 'invalid_coords',
      shouldBroadcast: false,
      lat,
      lng,
      accuracy
    };
  }

  let severity = 'ok';
  const reasons = [];
  let jumpKm = 0;
  let speedKph = 0;

  if (accuracy > CFG.criticalAccuracyM) {
    severity = 'critical';
    reasons.push('accuracy_critical');
  } else if (accuracy > CFG.warnAccuracyM) {
    severity = 'warn';
    reasons.push('accuracy_warn');
  }

  if (now - ts > CFG.staleMs) {
    if (severity === 'ok') severity = 'warn';
    reasons.push('stale');
  }

  if (previous && Number.isFinite(finite(previous.lat)) && Number.isFinite(finite(previous.lng ?? previous.lon))) {
    jumpKm = haversineKm(previous, { lat, lng });
    const dtH = Math.max(1 / 3600, (ts - finite(previous.timestamp || previous.ts, ts)) / 3600000);
    speedKph = jumpKm / dtH;
    if (jumpKm > CFG.maxJumpKm && speedKph > 80) {
      severity = 'critical';
      reasons.push('teleport');
    } else if (speedKph > CFG.maxSpeedKph) {
      severity = 'critical';
      reasons.push('speed_impossible');
    }
  }

  const shouldBroadcast = severity !== 'critical';

  return {
    ok: severity !== 'critical',
    severity,
    reasons,
    shouldBroadcast,
    lat,
    lng,
    accuracy: Number(accuracy.toFixed(1)),
    timestamp: ts,
    jumpKm: Number(jumpKm.toFixed(3)),
    speedKph: Number(speedKph.toFixed(1))
  };
}

// ---------------------------------------------------------------------------
// Clean track (simple EMA + drop outliers)
// ---------------------------------------------------------------------------
function cleanTrack(points = []) {
  const list = (Array.isArray(points) ? points : [])
    .map((p) => ({
      lat: finite(p.lat),
      lng: finite(p.lng ?? p.lon),
      accuracy: finite(p.accuracy, 50),
      timestamp: finite(p.timestamp || p.ts, Date.now())
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-40);

  if (!list.length) return { cleaned: [], dropped: 0 };

  const cleaned = [];
  let dropped = 0;
  let prev = null;
  const alpha = 0.35;

  for (const p of list) {
    const a = assessPoint(p, prev);
    if (!a.shouldBroadcast && cleaned.length > 0) {
      dropped++;
      continue;
    }
    if (!cleaned.length) {
      cleaned.push({ ...p, severity: a.severity, smoothed: false });
      prev = p;
      continue;
    }
    const last = cleaned[cleaned.length - 1];
    const sm = {
      lat: last.lat * (1 - alpha) + p.lat * alpha,
      lng: last.lng * (1 - alpha) + p.lng * alpha,
      accuracy: Math.min(last.accuracy, p.accuracy),
      timestamp: p.timestamp,
      severity: a.severity,
      smoothed: true
    };
    cleaned.push(sm);
    prev = p;
  }

  return {
    cleaned,
    dropped,
    last: cleaned[cleaned.length - 1] || null,
    assess: cleaned.length ? assessPoint(cleaned[cleaned.length - 1]) : null
  };
}

// ---------------------------------------------------------------------------
// Good pickup learning + normalize
// ---------------------------------------------------------------------------
async function findNearbyGoodPickups(lat, lng) {
  const key = cellKey(lat, lng, 3);
  if (!key) return [];
  // Same cell + 8 neighbors
  const [la, ln] = key.split('_').map(Number);
  const keys = [];
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      keys.push(`${la + di}_${ln + dj}`);
    }
  }
  const results = [];
  for (const k of keys) {
    try {
      const node = await fb(`location_intel/good_pickups/${k}`);
      if (!node) continue;
      if (node.lat != null) {
        results.push(node);
      } else if (typeof node === 'object') {
        for (const v of Object.values(node)) {
          if (v && v.lat != null) results.push(v);
        }
      }
    } catch (_) {}
  }
  return results
    .map((p) => ({
      ...p,
      distanceKm: haversineKm({ lat, lng }, p)
    }))
    .filter((p) => Number.isFinite(p.distanceKm) && p.distanceKm <= CFG.pickupSnapRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm || finite(b.count, 1) - finite(a.count, 1));
}

async function optionalOsrmNearest(lat, lng) {
  try {
    const url = `${OSRM_URL}/nearest/v1/driving/${lng},${lat}?number=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    const wp = data?.waypoints?.[0];
    if (!wp || !Array.isArray(wp.location)) return null;
    return {
      lng: wp.location[0],
      lat: wp.location[1],
      name: wp.name || null,
      distanceM: finite(wp.distance, 0),
      source: 'osrm_nearest'
    };
  } catch {
    return null;
  }
}

async function normalizePickup(body) {
  const lat = finite(body.lat ?? body.pickupLat);
  const lng = finite(body.lng ?? body.pickupLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw Object.assign(new Error('Thiếu lat/lng điểm đón'), { status: 400 });
  }

  const raw = { lat, lng, address: cleanText(body.address || '', 200) };
  const learned = await findNearbyGoodPickups(lat, lng);
  const bestLearned = learned[0] || null;

  let snapped = null;
  if (bestLearned && bestLearned.distanceKm < 0.08) {
    snapped = {
      lat: bestLearned.lat,
      lng: bestLearned.lng,
      source: 'learned_good_pickup',
      count: bestLearned.count || 1,
      distanceFromRawM: Math.round(bestLearned.distanceKm * 1000),
      note: bestLearned.note || null
    };
  } else {
    const osrm = await optionalOsrmNearest(lat, lng);
    if (osrm && osrm.distanceM < 80) {
      snapped = {
        lat: osrm.lat,
        lng: osrm.lng,
        source: osrm.source,
        distanceFromRawM: Math.round(osrm.distanceM),
        roadName: osrm.name
      };
    }
  }

  const final = snapped || { lat, lng, source: 'raw', distanceFromRawM: 0 };

  return {
    raw,
    recommended: final,
    alternatives: learned.slice(0, 3).map((p) => ({
      lat: p.lat,
      lng: p.lng,
      distanceM: Math.round(p.distanceKm * 1000),
      count: p.count || 1,
      note: p.note || null
    })),
    guidance:
      snapped && snapped.distanceFromRawM > 15
        ? `Đã chuẩn hóa điểm đón ~${snapped.distanceFromRawM}m so với điểm ghim (dễ đón hơn).`
        : 'Điểm đón giữ nguyên — nằm trong vùng hợp lý.'
  };
}

async function reportPickupSuccess(body) {
  const lat = finite(body.lat ?? body.pickupLat);
  const lng = finite(body.lng ?? body.pickupLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw Object.assign(new Error('Thiếu lat/lng'), { status: 400 });
  }
  const key = cellKey(lat, lng, 3);
  if (!key) throw Object.assign(new Error('invalid'), { status: 400 });

  const path = `location_intel/good_pickups/${key}`;
  let cur = null;
  try {
    cur = await fb(path);
  } catch (_) {}

  // One primary point per cell (average)
  const count = finite(cur?.count, 0) + 1;
  const next = {
    lat: cur?.lat != null ? (finite(cur.lat) * (count - 1) + lat) / count : lat,
    lng: cur?.lng != null ? (finite(cur.lng) * (count - 1) + lng) / count : lng,
    count,
    note: cleanText(body.note || cur?.note || '', 120),
    lastAt: Date.now(),
    lastOrderId: cleanText(body.orderId || '', 80) || null
  };
  await fbPut(path, next);
  return { saved: true, cell: key, point: next };
}

// ---------------------------------------------------------------------------
// Fuse driver + customer for pickup
// ---------------------------------------------------------------------------
async function fusePickup(body) {
  const driver = body.driver || {};
  const customer = body.customer || body.pickup || {};
  const dLat = finite(driver.lat);
  const dLng = finite(driver.lng ?? driver.lon);
  const cLat = finite(customer.lat ?? customer.pickupLat);
  const cLng = finite(customer.lng ?? customer.pickupLng);

  if (![dLat, dLng, cLat, cLng].every(Number.isFinite)) {
    throw Object.assign(new Error('Thiếu tọa độ tài xế hoặc khách'), { status: 400 });
  }

  const dAssess = assessPoint({
    lat: dLat,
    lng: dLng,
    accuracy: driver.accuracy,
    timestamp: driver.timestamp
  });
  const cAssess = assessPoint({
    lat: cLat,
    lng: cLng,
    accuracy: customer.accuracy,
    timestamp: customer.timestamp
  });

  // Prefer normalized pickup for customer side
  let target = { lat: cLat, lng: cLng, source: 'customer_raw' };
  try {
    const norm = await normalizePickup({ lat: cLat, lng: cLng, address: customer.address });
    if (norm.recommended) {
      target = { ...norm.recommended };
    }
  } catch (_) {}

  const distKm = haversineKm({ lat: dLat, lng: dLng }, target);
  const distM = Math.round(distKm * 1000);
  const br = bearingDeg({ lat: dLat, lng: dLng }, target);
  const dir = compassLabel(br);
  const speed = clamp(finite(driver.speedKph, 20), 5, 60);
  const etaMin = Math.max(1, Math.ceil((distKm / speed) * 60));

  let phase = 'en_route';
  let instruction = '';
  let needCallConfirm = false;

  if (dAssess.severity === 'critical' || cAssess.severity === 'critical') {
    needCallConfirm = true;
    instruction =
      'GPS một bên đang kém tin cậy — nên gọi khách xác nhận điểm đón / địa chỉ cụ thể.';
  } else if (distM <= CFG.fuseCloseM) {
    phase = 'arrived_zone';
    instruction = `Đã vào vùng đón (~${distM}m). Nhìn hướng ${dir}, bấm Đã đến và liên hệ khách nếu không thấy.`;
  } else if (distM <= CFG.fuseFarM) {
    phase = 'last_mile';
    instruction = `Còn ~${distM}m hướng ${dir}. Giảm tốc, chú ý số nhà/cổng. ETA ~${etaMin} phút.`;
  } else {
    phase = 'en_route';
    instruction = `Còn ~${(distKm).toFixed(1)} km hướng ${dir}. ETA khoảng ${etaMin} phút.`;
  }

  if (cAssess.severity === 'warn' && !needCallConfirm) {
    instruction += ' (GPS khách hơi yếu — ưu tiên địa chỉ mô tả.)';
  }

  return {
    driver: { lat: dLat, lng: dLng, assess: dAssess },
    customer: { lat: cLat, lng: cLng, assess: cAssess },
    target,
    distanceM: distM,
    distanceKm: Number(distKm.toFixed(3)),
    bearing: Number(br.toFixed(1)),
    direction: dir,
    etaMinutes: etaMin,
    phase,
    instruction,
    needCallConfirm,
    mapHint: {
      driver: [dLat, dLng],
      target: [target.lat, target.lng]
    }
  };
}

async function computeEta(body) {
  const from = {
    lat: finite(body.fromLat ?? body.driverLat ?? body.lat),
    lng: finite(body.fromLng ?? body.driverLng ?? body.lng)
  };
  const to = {
    lat: finite(body.toLat ?? body.pickupLat),
    lng: finite(body.toLng ?? body.pickupLng)
  };
  const straight = haversineKm(from, to);
  if (!Number.isFinite(straight)) {
    throw Object.assign(new Error('Tọa độ không hợp lệ'), { status: 400 });
  }

  let roadKm = straight * 1.35; // heuristic đô thị VN
  let source = 'haversine_factor';

  try {
    const url = `${OSRM_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      const meters = data?.routes?.[0]?.distance;
      if (Number.isFinite(meters)) {
        roadKm = meters / 1000;
        source = 'osrm';
      }
    }
  } catch (_) {}

  const speed = clamp(finite(body.speedKph, 22), 8, 50);
  const etaMinutes = Math.max(1, Math.ceil((roadKm / speed) * 60));

  return {
    straightKm: Number(straight.toFixed(3)),
    roadKm: Number(roadKm.toFixed(3)),
    etaMinutes,
    speedKph: speed,
    source
  };
}

async function hotspotGps() {
  const issues = (await fb('location_intel/gps_issues')) || {};
  const list = Object.values(issues);
  // aggregate by cell
  const cells = {};
  for (const it of list) {
    if (!it || !Number.isFinite(finite(it.lat))) continue;
    const k = cellKey(it.lat, it.lng, 2);
    if (!k) continue;
    cells[k] = cells[k] || { cell: k, count: 0, lat: 0, lng: 0 };
    cells[k].count++;
    cells[k].lat += finite(it.lat);
    cells[k].lng += finite(it.lng);
  }
  const hotspots = Object.values(cells)
    .map((c) => ({
      cell: c.cell,
      count: c.count,
      lat: c.lat / c.count,
      lng: c.lng / c.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  if (hotspots[0] && hotspots[0].count >= 5) {
    try {
      await fbPost('admin_notifications', {
        type: 'gps_hotspot',
        title: '📍 Khu vực hay lỗi GPS',
        body: `Ô ${hotspots[0].cell}: ${hotspots[0].count} sự cố gần đây`,
        read: false,
        createdAt: Date.now(),
        hotspots: hotspots.slice(0, 5)
      });
    } catch (_) {}
  }

  return { hotspots, totalIssues: list.length };
}

async function logGpsIssue(point, assess) {
  if (!assess || assess.severity === 'ok') return;
  try {
    await fbPost('location_intel/gps_issues', {
      lat: point.lat,
      lng: point.lng,
      severity: assess.severity,
      reasons: assess.reasons || [],
      accuracy: assess.accuracy,
      at: Date.now()
    });
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
  const intent = cleanText(body.intent || body.op || 'status', 40);
  const started = Date.now();

  try {
    let result = null;

    if (intent === 'assess') {
      const prev = body.previous || body.prev || null;
      result = assessPoint(body.point || body, prev);
      if (result.severity !== 'ok') await logGpsIssue(body.point || body, result);
    } else if (intent === 'clean_track') {
      result = cleanTrack(body.points || body.track || []);
    } else if (intent === 'normalize_pickup') {
      result = await normalizePickup(body);
    } else if (intent === 'fuse_pickup') {
      result = await fusePickup(body);
    } else if (intent === 'eta') {
      result = await computeEta(body);
    } else if (intent === 'report_pickup_success') {
      result = await reportPickupSuccess(body);
    } else if (intent === 'hotspot_gps') {
      result = await hotspotGps();
    } else if (intent === 'status') {
      result = { version: CFG.version, config: CFG };
    } else {
      return res.status(400).json({ success: false, error: `intent không hỗ trợ: ${intent}` });
    }

    return res.status(200).json({
      success: true,
      locationAI: true,
      intent,
      version: CFG.version,
      durationMs: Date.now() - started,
      result
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    return res.status(status).json({
      success: false,
      locationAI: true,
      error: status >= 500 ? 'AI Định vị tạm thời không khả dụng' : error.message
    });
  }
}

export const config = { runtime: 'nodejs' };
