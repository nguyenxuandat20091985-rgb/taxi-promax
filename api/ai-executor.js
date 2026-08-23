/**
 * =============================================================================
 * TAXI PROMAX — AI THỰC THI (1 FILE)
 * =============================================================================
 * File duy nhất: học liên tục trong biên an toàn + vận hành hệ thống cẩn thận.
 *
 * Endpoint: POST /api/ai-executor
 * Auth:
 *   - Admin: Authorization Bearer <admin session HMAC>
 *   - Cron:  Authorization Bearer <CRON_SECRET>  hoặc  x-cron-secret
 *
 * Intents:
 *   dispatch_scan   — quét đơn waiting, phân bổ công bằng, optional soft-assign + push
 *   dispatch_one    — phân bổ 1 đơn (orderId)
 *   expire_orders   — hủy đơn waiting đã hết hạn
 *   renewal_nudge   — nhắc tài xế sắp hết gói (push + log)
 *   learn           — học từ kết quả gần đây, cập nhật trọng số (trong biên)
 *   status          — đọc trạng thái học + thống kê ngắn
 *
 * Nguyên tắc an toàn:
 *   - Không tự sửa code / Rules / deploy
 *   - Không tự ghi đè bảng giá ngoài biên
 *   - Soft-assign status=offered; nhận đơn thật vẫn qua transaction client
 *   - Mọi lần chạy ghi executor_logs
 *   - Học liên tục = điều chỉnh trọng số W trong CLAMP, lưu executor_state/learning
 *
 * Env: FIREBASE_DATABASE_URL, CRON_SECRET, ADMIN_SESSION_SECRET, FCM_SERVER_KEY (optional)
 * =============================================================================
 */

import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Config & constants
// ---------------------------------------------------------------------------
const FIREBASE_URL = String(
  process.env.FIREBASE_DATABASE_URL ||
    'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/$/, '');

const POLICY = Object.freeze({
  version: 'exec-policy-v1.0',
  maxOrdersPerScan: 12,
  maxDistanceKm: 15,
  maxDriversPool: 80,
  offerTtlMs: 45_000,
  maxPushPerRun: 20,
  allowAutoAssign: true,
  allowPriceWrite: false,
  allowAccountBan: false,
  allowCodeChange: false
});

/** Trọng số mặc định — học sẽ chỉnh trong biên CLAMP */
const DEFAULT_WEIGHTS = Object.freeze({
  distance: 0.34,
  quality: 0.24,
  freshness: 0.16,
  fairness: 0.18,
  zone: 0.08
});

const WEIGHT_CLAMP = Object.freeze({
  distance: [0.2, 0.5],
  quality: [0.15, 0.4],
  freshness: [0.08, 0.25],
  fairness: [0.1, 0.35],
  zone: [0.03, 0.15]
});

const LEARNING = Object.freeze({
  minSamples: 8,
  lr: 0.04, // learning rate nhỏ — ổn định
  maxDeltaPerRun: 0.03 // mỗi lần học không lệch quá 3 điểm % mỗi trọng số
});

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}
function finite(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}
function cleanText(v, max = 500) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}
function isSafeId(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(v);
}
function publicError(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function haversineKm(a, b) {
  const lat1 = finite(a?.lat);
  const lon1 = finite(a?.lng ?? a?.lon);
  const lat2 = finite(b?.lat);
  const lon2 = finite(b?.lng ?? b?.lon);
  const R = Math.PI / 180;
  const dLat = (lat2 - lat1) * R;
  const dLon = (lon2 - lon1) * R;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * R) * Math.cos(lat2 * R) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function normalizeWeights(w) {
  const keys = ['distance', 'quality', 'freshness', 'fairness', 'zone'];
  const out = {};
  let sum = 0;
  for (const k of keys) {
    const [lo, hi] = WEIGHT_CLAMP[k];
    out[k] = clamp(finite(w?.[k], DEFAULT_WEIGHTS[k]), lo, hi);
    sum += out[k];
  }
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  for (const k of keys) out[k] = Number((out[k] / sum).toFixed(4));
  return out;
}

// ---------------------------------------------------------------------------
// Security (self-contained; không phụ thuộc file khác)
// ---------------------------------------------------------------------------
function applyCors(req, res) {
  const allowed = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers?.origin;
  if (origin && (allowed.length === 0 || allowed.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Secret, X-Requested-With');
}

function verifyAdminSession(req) {
  const secret =
    cleanText(process.env.ADMIN_SESSION_SECRET, 256) ||
    'TaxiProMax-admin-session-fallback-2026-change-in-production';
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  try {
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data?.sub === 'admin' && Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function verifyCron(req) {
  const secret = cleanText(process.env.CRON_SECRET || process.env.ADMIN_SESSION_SECRET || '', 256);
  if (!secret) {
    // Dev / preview: cho phép; production nên set CRON_SECRET
    return process.env.VERCEL_ENV !== 'production';
  }
  const auth = req.headers?.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const header = req.headers?.['x-cron-secret'] || '';
  const q = req.query?.secret || '';
  return bearer === secret || header === secret || q === secret;
}

function authorize(req, intent) {
  if (verifyAdminSession(req)) return { ok: true, role: 'admin' };
  if (verifyCron(req)) return { ok: true, role: 'cron' };
  // status + dryRun learn read-only có thể mở cho admin only
  return { ok: false, role: null };
}

// ---------------------------------------------------------------------------
// Firebase REST
// ---------------------------------------------------------------------------
async function fb(path, options = {}) {
  const res = await fetch(`${FIREBASE_URL}/${path}.json`, {
    ...options,
    signal: AbortSignal.timeout(options.timeout || 10000),
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  if (!res.ok) throw new Error(`Firebase HTTP ${res.status} @ ${path}`);
  return res.json();
}

async function fbPut(path, data) {
  return fb(path, { method: 'PUT', body: JSON.stringify(data) });
}

async function fbPost(path, data) {
  return fb(path, { method: 'POST', body: JSON.stringify(data) });
}

// ---------------------------------------------------------------------------
// Learning state (học liên tục — bounded)
// ---------------------------------------------------------------------------
async function loadLearningState() {
  try {
    const raw = await fb('executor_state/learning');
    if (!raw || typeof raw !== 'object') {
      return {
        weights: { ...DEFAULT_WEIGHTS },
        stats: { samples: 0, acceptRate: 0, cancelRate: 0, avgEtaMin: 0 },
        updatedAt: 0,
        version: 1
      };
    }
    return {
      weights: normalizeWeights(raw.weights || DEFAULT_WEIGHTS),
      stats: raw.stats || {},
      updatedAt: finite(raw.updatedAt),
      version: finite(raw.version, 1)
    };
  } catch {
    return {
      weights: { ...DEFAULT_WEIGHTS },
      stats: { samples: 0 },
      updatedAt: 0,
      version: 1
    };
  }
}

async function saveLearningState(state) {
  const payload = {
    weights: normalizeWeights(state.weights),
    stats: state.stats || {},
    updatedAt: Date.now(),
    version: finite(state.version, 1) + 1,
    policyVersion: POLICY.version
  };
  await fbPut('executor_state/learning', payload);
  return payload;
}

/**
 * Học từ đơn gần đây:
 * - accepted/driving/completed sau offered → tăng trọng số đã dùng tốt
 * - cancelled / hết hạn offer → giảm nhẹ distance quá ưu tiên nếu xa
 * Cập nhật W bằng gradient rất nhỏ + clamp
 */
async function learnFromRecentOutcomes(state) {
  const all = await fb('datxe');
  if (!all || typeof all !== 'object') {
    return { state, learned: false, reason: 'no_orders' };
  }

  const now = Date.now();
  const recent = Object.entries(all)
    .map(([id, o]) => ({ id, ...o }))
    .filter((o) => o.dispatch && o.dispatch.at && now - Number(o.dispatch.at) < 7 * 86400000)
    .slice(-80);

  if (recent.length < LEARNING.minSamples) {
    return { state, learned: false, reason: 'insufficient_samples', samples: recent.length };
  }

  let accepted = 0;
  let cancelled = 0;
  let offered = 0;
  let distAccept = 0;
  let distCancel = 0;
  let nDistA = 0;
  let nDistC = 0;

  for (const o of recent) {
    const st = o.status;
    const dKm = finite(o.dispatch?.selected?.distanceKm, NaN);
    if (o.offeredDriverId || o.dispatch?.selected) offered++;
    if (st === 'driving' || st === 'completed' || st === 'in_progress') {
      accepted++;
      if (Number.isFinite(dKm)) {
        distAccept += dKm;
        nDistA++;
      }
    }
    if (st === 'cancelled' || (st === 'waiting' && o.dispatch && now > finite(o.offerExpiresAt))) {
      cancelled++;
      if (Number.isFinite(dKm)) {
        distCancel += dKm;
        nDistC++;
      }
    }
  }

  const samples = recent.length;
  const acceptRate = accepted / Math.max(1, offered || samples);
  const cancelRate = cancelled / Math.max(1, samples);
  const avgAcceptDist = nDistA ? distAccept / nDistA : 5;
  const avgCancelDist = nDistC ? distCancel / nDistC : 8;

  // Điều chỉnh có kiểm soát
  const w = { ...state.weights };
  const lr = LEARNING.lr;
  const cap = LEARNING.maxDeltaPerRun;

  // Accept cao → tin quality + fairness hơn
  if (acceptRate > 0.55) {
    w.quality = w.quality + clamp(lr * (acceptRate - 0.5), -cap, cap);
    w.fairness = w.fairness + clamp(lr * 0.5 * (acceptRate - 0.5), -cap, cap);
  }
  // Cancel cao + huỷ thường ở đơn xa → tăng distance weight
  if (cancelRate > 0.35 && avgCancelDist > avgAcceptDist + 1.5) {
    w.distance = w.distance + clamp(lr * (cancelRate - 0.3), -cap, cap);
  }
  // Accept tốt ở khoảng cách vừa → giữ fairness (chống bỏ đói tài xế cũ)
  if (acceptRate > 0.4 && acceptRate < 0.75) {
    w.fairness = w.fairness + clamp(lr * 0.02, 0, cap);
  }

  const next = {
    ...state,
    weights: normalizeWeights(w),
    stats: {
      samples,
      offered,
      accepted,
      cancelled,
      acceptRate: Number(acceptRate.toFixed(3)),
      cancelRate: Number(cancelRate.toFixed(3)),
      avgAcceptDistKm: Number(avgAcceptDist.toFixed(2)),
      avgCancelDistKm: Number(avgCancelDist.toFixed(2)),
      lastLearnAt: Date.now()
    }
  };

  const saved = await saveLearningState(next);
  return { state: { ...next, ...saved }, learned: true, reason: 'updated' };
}

// ---------------------------------------------------------------------------
// Scoring — công bằng + trọng số đã học
// ---------------------------------------------------------------------------
function driverQuality(d) {
  const rating = clamp(finite(d.rating, 5), 1, 5) / 5;
  const completion = clamp(finite(d.completionRate, 0.9), 0, 1);
  const acceptance = clamp(finite(d.acceptanceRate, 0.85), 0, 1);
  const safety = clamp(finite(d.safetyScore, 0.9), 0, 1);
  return 0.35 * rating + 0.25 * completion + 0.2 * acceptance + 0.2 * safety;
}

function fairnessScore(d, now) {
  const last = finite(d.lastTripAt || d.lastAcceptedAt, 0);
  const total = finite(d.totalRides || d.totalTrips, 0);
  const idleMin = last > 0 ? (now - last) / 60000 : 45;
  const idleBoost = clamp(idleMin / 90, 0, 1);
  const newBoost = total < 20 ? clamp((20 - total) / 20, 0, 1) * 0.25 : 0;
  const veteran = total >= 50 && finite(d.rating, 5) >= 4.5 ? 0.08 : 0;
  return clamp(0.55 * idleBoost + newBoost + veteran, 0, 1);
}

function scoreDriver(driver, pickup, weights, hotspotWeight, now, maxDistanceKm) {
  const loc = driver.location || driver;
  const distanceKm = haversineKm(loc, pickup);
  if (!Number.isFinite(distanceKm) || distanceKm > maxDistanceKm) {
    return { eligible: false, score: 0, distanceKm, reason: 'too_far' };
  }
  if (driver.online === false || driver.status === 'busy') {
    return { eligible: false, score: 0, distanceKm, reason: 'unavailable' };
  }
  if (driver.gpsSeverity === 'critical') {
    return { eligible: false, score: 0, distanceKm, reason: 'gps_critical' };
  }

  const freshnessSec = Math.max(0, (now - finite(loc.timestamp || now)) / 1000);
  const freshness = clamp(1 - freshnessSec / 180, 0, 1);
  const distanceScore = clamp(1 - distanceKm / Math.max(maxDistanceKm, 1), 0, 1);
  const quality = driverQuality(driver);
  const fair = fairnessScore(driver, now);
  const zone = clamp(finite(hotspotWeight, 1) / 1.5, 0, 1);

  const score =
    weights.distance * distanceScore +
    weights.quality * quality +
    weights.freshness * freshness +
    weights.fairness * fair +
    weights.zone * zone;

  const etaMinutes = Math.max(1, Math.ceil((distanceKm / 24) * 60));

  return {
    eligible: freshness > 0 && score > 0,
    score: Number(score.toFixed(4)),
    distanceKm: Number(distanceKm.toFixed(3)),
    etaMinutes,
    fairness: Number(fair.toFixed(4)),
    components: {
      distanceScore: Number(distanceScore.toFixed(4)),
      quality: Number(quality.toFixed(4)),
      freshness: Number(freshness.toFixed(4)),
      fairness: Number(fair.toFixed(4)),
      zone: Number(zone.toFixed(4))
    }
  };
}

function rankDrivers({ pickup, drivers, weights, carClass, maxDistanceKm, hotspotWeight }) {
  const now = Date.now();
  const list = drivers
    .slice(0, POLICY.maxDriversPool)
    .map((d) => {
      if (carClass && carClass !== 'both') {
        const dc = d.carClass || d.carType || '4_seats';
        if (dc !== carClass && dc !== 'both') {
          return { id: d.id || d.uid, eligible: false, score: 0, reason: 'car_mismatch' };
        }
      }
      const s = scoreDriver(d, pickup, weights, hotspotWeight, now, maxDistanceKm);
      return {
        id: d.id || d.uid,
        name: d.name || null,
        plate: d.plate || null,
        phone: d.phone || null,
        ...s
      };
    })
    .filter((c) => c.eligible)
    .sort((a, b) => b.score - a.score);

  return { candidates: list, selected: list[0] || null, weights, algorithm: 'fair_learn_v1' };
}

// ---------------------------------------------------------------------------
// Data loaders
// ---------------------------------------------------------------------------
async function loadOnlineDrivers() {
  const [online, profiles] = await Promise.all([fb('tai_xe_online'), fb('drivers')]);
  const onlineMap = online && typeof online === 'object' ? online : {};
  const profileMap = profiles && typeof profiles === 'object' ? profiles : {};
  const list = [];

  for (const [uid, loc] of Object.entries(onlineMap)) {
    if (!loc || typeof loc !== 'object') continue;
    if (loc.online === false) continue;
    if (!Number.isFinite(Number(loc.lat)) || !Number.isFinite(Number(loc.lng))) continue;
    if (loc.gpsSeverity === 'critical') continue;

    const profile = profileMap[uid] || {};
    const docs = profile.documents || {};
    if (docs.status && docs.status !== 'approved' && docs.status !== 'verified') continue;

    const expiry = finite(profile.tp_expiry, 0);
    if (expiry > 0 && expiry < Date.now()) continue;

    list.push({
      id: uid,
      uid,
      name: loc.name || profile.name || profile.profile?.name || null,
      phone: profile.phone || profile.profile?.phone || null,
      plate: loc.plate || profile.plate || null,
      carClass: profile.carClass || profile.carType || '4_seats',
      online: true,
      status: loc.status || 'ready',
      gpsSeverity: loc.gpsSeverity || 'ok',
      rating: finite(profile.rating, 5),
      totalRides: finite(profile.totalRides || profile.totalTrips, 0),
      completionRate: finite(profile.completionRate, 0.9),
      acceptanceRate: finite(profile.acceptanceRate, 0.85),
      safetyScore: finite(profile.safetyScore || (profile.trustScore || 90) / 100, 0.9),
      lastTripAt: finite(profile.lastTripAt || profile.lastAcceptedAt, 0),
      location: {
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        timestamp: finite(loc.lastUpdate || loc.timestamp, Date.now())
      }
    });
  }
  return list;
}

async function loadWaitingOrders(limit) {
  const all = await fb('datxe');
  if (!all || typeof all !== 'object') return [];
  const now = Date.now();
  return Object.entries(all)
    .map(([id, o]) => ({ id, ...o }))
    .filter((o) => o.status === 'waiting')
    .filter((o) => !o.expiresAt || Number(o.expiresAt) > now)
    .filter((o) => Number.isFinite(Number(o.pickupLat)) && Number.isFinite(Number(o.pickupLng)))
    .sort((a, b) => finite(a.createdAt) - finite(b.createdAt))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Actions (thực thi cẩn thận)
// ---------------------------------------------------------------------------
async function writeDispatch(orderId, payload) {
  await fbPut(`datxe/${orderId}/dispatch`, payload);
}

async function softAssign(order, selected, rankMeta) {
  if (!selected || !order?.id) return { assigned: false, reason: 'no_driver' };
  const current = await fb(`datxe/${order.id}`);
  if (!current || current.status !== 'waiting') {
    return { assigned: false, reason: 'not_waiting' };
  }

  const dispatch = {
    algorithm: rankMeta.algorithm,
    weights: rankMeta.weights,
    at: Date.now(),
    source: 'ai_executor',
    selected: {
      driverId: selected.id,
      name: selected.name,
      plate: selected.plate,
      score: selected.score,
      fairness: selected.fairness,
      distanceKm: selected.distanceKm,
      etaMinutes: selected.etaMinutes
    },
    candidates: (rankMeta.candidates || []).slice(0, 5).map((c) => ({
      driverId: c.id,
      score: c.score,
      fairness: c.fairness,
      distanceKm: c.distanceKm,
      etaMinutes: c.etaMinutes
    }))
  };

  const next = {
    ...current,
    status: 'offered',
    offeredDriverId: selected.id,
    offeredDriverName: selected.name || null,
    offeredAt: Date.now(),
    offerExpiresAt: Date.now() + POLICY.offerTtlMs,
    dispatch,
    statusHistory: { ...(current.statusHistory || {}), offered: Date.now() }
  };

  await fbPut(`datxe/${order.id}`, next);
  return { assigned: true, driverId: selected.id, dispatch };
}

async function notifyDriver(driverId, title, body, data = {}) {
  const key = cleanText(process.env.FCM_SERVER_KEY || '', 400);
  if (!key || !driverId) return { sent: 0 };

  try {
    const [a, b] = await Promise.all([
      fb(`drivers/${driverId}/fcmTokens`),
      fb(`fcm_tokens/${driverId}`)
    ]);
    const tokens = [];
    for (const node of [a, b]) {
      if (!node) continue;
      if (typeof node === 'string') tokens.push(node);
      else if (typeof node === 'object') {
        for (const v of Object.values(node)) {
          if (typeof v === 'string' && v.length > 20) tokens.push(v);
          else if (v && typeof v.token === 'string') tokens.push(v.token);
        }
      }
    }
    const unique = [...new Set(tokens)].slice(0, 5);
    let sent = 0;
    for (const token of unique) {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${key}`
        },
        body: JSON.stringify({
          to: token,
          priority: 'high',
          notification: { title, body, sound: 'default' },
          data: Object.fromEntries(
            Object.entries({ ...data, title, body, url: '/' }).map(([k, v]) => [k, String(v ?? '')])
          )
        }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) sent++;
    }
    return { sent };
  } catch {
    return { sent: 0 };
  }
}

async function audit(entry) {
  try {
    await fbPost('executor_logs', {
      ...entry,
      policyVersion: POLICY.version,
      createdAt: Date.now()
    });
  } catch {
    /* best-effort */
  }
}

// ---------------------------------------------------------------------------
// Intent handlers
// ---------------------------------------------------------------------------
async function intentDispatchScan(params, learning, dryRun) {
  const limit = clamp(finite(params.limit, POLICY.maxOrdersPerScan), 1, POLICY.maxOrdersPerScan);
  const maxDistanceKm = clamp(finite(params.maxDistanceKm, POLICY.maxDistanceKm), 3, 30);
  const autoAssign = params.autoAssign === true && POLICY.allowAutoAssign;
  const hotspotWeight = finite(params.hotspotWeight, 1);

  const [drivers, orders] = await Promise.all([
    loadOnlineDrivers(),
    loadWaitingOrders(limit)
  ]);

  const used = new Set();
  const results = [];

  for (const order of orders) {
    const pool = drivers.filter((d) => !used.has(d.id));
    const rank = rankDrivers({
      pickup: { lat: Number(order.pickupLat), lng: Number(order.pickupLng) },
      drivers: pool,
      weights: learning.weights,
      carClass: order.carType || order.carClass || null,
      maxDistanceKm,
      hotspotWeight
    });

    let assign = { assigned: false };
    let push = { sent: 0 };

    if (!dryRun && rank.selected) {
      await writeDispatch(order.id, {
        algorithm: rank.algorithm,
        weights: rank.weights,
        at: Date.now(),
        source: 'ai_executor',
        selected: {
          driverId: rank.selected.id,
          score: rank.selected.score,
          fairness: rank.selected.fairness,
          distanceKm: rank.selected.distanceKm,
          etaMinutes: rank.selected.etaMinutes
        },
        candidates: rank.candidates.slice(0, 5).map((c) => ({
          driverId: c.id,
          score: c.score,
          distanceKm: c.distanceKm
        }))
      });

      if (autoAssign) {
        assign = await softAssign(order, rank.selected, rank);
        if (assign.assigned) {
          used.add(rank.selected.id);
          push = await notifyDriver(
            rank.selected.id,
            '🚕 Có đơn được AI phân bổ',
            `Đơn gần bạn (~${rank.selected.distanceKm} km, ETA ${rank.selected.etaMinutes} phút). Mở app để nhận!`,
            { type: 'dispatch_offer', orderId: order.id }
          );
        }
      }
    }

    results.push({
      orderId: order.id,
      selected: rank.selected
        ? {
            driverId: rank.selected.id,
            score: rank.selected.score,
            fairness: rank.selected.fairness,
            distanceKm: rank.selected.distanceKm,
            etaMinutes: rank.selected.etaMinutes
          }
        : null,
      candidateCount: rank.candidates.length,
      assign,
      push
    });
  }

  return {
    onlineDrivers: drivers.length,
    waitingOrders: orders.length,
    assignedCount: results.filter((r) => r.assign?.assigned).length,
    dryRun: !!dryRun,
    weights: learning.weights,
    results
  };
}

async function intentDispatchOne(params, learning, dryRun) {
  const orderId = cleanText(params.orderId || '', 120);
  if (!orderId || !isSafeId(orderId)) throw publicError('Thiếu orderId hợp lệ');

  let order = params.order && typeof params.order === 'object' ? { ...params.order, id: orderId } : null;
  if (!order) {
    const fetched = await fb(`datxe/${orderId}`);
    if (!fetched) throw publicError('Không tìm thấy đơn', 404);
    order = { id: orderId, ...fetched };
  }
  if (order.status !== 'waiting') throw publicError('Đơn không ở trạng thái waiting');

  const drivers = await loadOnlineDrivers();
  const rank = rankDrivers({
    pickup: { lat: Number(order.pickupLat), lng: Number(order.pickupLng) },
    drivers,
    weights: learning.weights,
    carClass: order.carType || order.carClass || null,
    maxDistanceKm: clamp(finite(params.maxDistanceKm, POLICY.maxDistanceKm), 3, 30),
    hotspotWeight: finite(params.hotspotWeight, 1)
  });

  let assign = { assigned: false };
  let push = { sent: 0 };

  if (!dryRun && rank.selected) {
    await writeDispatch(orderId, {
      algorithm: rank.algorithm,
      weights: rank.weights,
      at: Date.now(),
      source: 'ai_executor',
      selected: {
        driverId: rank.selected.id,
        score: rank.selected.score,
        distanceKm: rank.selected.distanceKm
      }
    });
    if (params.autoAssign === true && POLICY.allowAutoAssign) {
      assign = await softAssign(order, rank.selected, rank);
      if (assign.assigned) {
        push = await notifyDriver(
          rank.selected.id,
          '🚕 Có đơn được AI phân bổ',
          `~${rank.selected.distanceKm} km — mở app để nhận đơn.`,
          { type: 'dispatch_offer', orderId }
        );
      }
    }
  }

  return {
    orderId,
    selected: rank.selected,
    candidates: rank.candidates.slice(0, 8),
    assign,
    push,
    dryRun: !!dryRun,
    weights: learning.weights
  };
}

async function intentExpireOrders(dryRun) {
  const all = await fb('datxe');
  if (!all || typeof all !== 'object') return { expired: 0, items: [] };
  const now = Date.now();
  const items = [];

  for (const [id, o] of Object.entries(all)) {
    if (!o || o.status !== 'waiting') continue;
    if (!o.expiresAt || Number(o.expiresAt) > now) continue;
    items.push(id);
    if (!dryRun) {
      await fbPut(`datxe/${id}`, {
        ...o,
        status: 'cancelled',
        cancelReason: 'expired_by_ai_executor',
        cancelledAt: now,
        statusHistory: { ...(o.statusHistory || {}), cancelled: now }
      });
    }
  }
  return { expired: items.length, items: items.slice(0, 30), dryRun: !!dryRun };
}

async function intentRenewalNudge(dryRun) {
  const drivers = await fb('drivers');
  if (!drivers || typeof drivers !== 'object') return { nudged: 0 };
  const now = Date.now();
  const horizon = 2 * 86400000;
  let nudged = 0;
  const details = [];

  for (const [uid, d] of Object.entries(drivers)) {
    const exp = finite(d.tp_expiry, 0);
    if (exp <= now || exp > now + horizon) continue;
    details.push({ uid, exp });
    if (!dryRun) {
      await notifyDriver(
        uid,
        '⏰ Gói cước sắp hết hạn',
        'Còn dưới 2 ngày. Gia hạn để không lỡ đơn giờ cao điểm.',
        { type: 'renewal_nudge' }
      );
      nudged++;
      if (nudged >= POLICY.maxPushPerRun) break;
    }
  }
  return { nudged: dryRun ? details.length : nudged, sample: details.slice(0, 10), dryRun: !!dryRun };
}


// ---------------------------------------------------------------------------
// AI ĐỀ XUẤT SỬA → ADMIN DUYỆT → TỰ ÁP DỤNG → BÁO CÁO LẠI
// Chỉ sửa cấu hình vận hành trên Firebase (whitelist), KHÔNG sửa source code.
// ---------------------------------------------------------------------------
const REPAIR_CATALOG = Object.freeze({
  boost_fairness: {
    title: 'Tăng trọng số công bằng (fairness)',
    severity: 'medium',
    description: 'Tài xế cũ ít được phân bổ — tăng fairness trong biên an toàn.',
    apply: async (state) => {
      const w = { ...state.weights, fairness: finite(state.weights.fairness, 0.18) + 0.04 };
      const next = { ...state, weights: normalizeWeights(w) };
      await saveLearningState(next);
      return { field: 'weights.fairness', before: state.weights.fairness, after: next.weights.fairness };
    }
  },
  boost_distance: {
    title: 'Ưu tiên khoảng cách hơn (giảm đơn xa)',
    severity: 'medium',
    description: 'Tỷ lệ hủy/offer xa cao — tăng weight distance.',
    apply: async (state) => {
      const w = { ...state.weights, distance: finite(state.weights.distance, 0.34) + 0.04 };
      const next = { ...state, weights: normalizeWeights(w) };
      await saveLearningState(next);
      return { field: 'weights.distance', before: state.weights.distance, after: next.weights.distance };
    }
  },
  widen_radius_temp: {
    title: 'Nới bán kính tìm tài xế tạm thời',
    severity: 'low',
    description: 'Ít tài xế online / nhiều đơn không gán được — tăng maxDistanceKm tạm.',
    apply: async () => {
      const cur = (await fb('executor_state/ops')) || {};
      const before = finite(cur.maxDistanceKm, POLICY.maxDistanceKm);
      const after = clamp(before + 2, 8, 20);
      await fbPut('executor_state/ops', {
        ...cur,
        maxDistanceKm: after,
        widenedAt: Date.now(),
        autoRevertAt: Date.now() + 2 * 3600 * 1000
      });
      return { field: 'ops.maxDistanceKm', before, after, autoRevertHours: 2 };
    }
  },
  shrink_offer_ttl: {
    title: 'Rút ngắn thời gian offer',
    severity: 'low',
    description: 'Nhiều offer bị bỏ / hết hạn — giảm TTL để xoay vòng tài xế nhanh hơn.',
    apply: async () => {
      const cur = (await fb('executor_state/ops')) || {};
      const before = finite(cur.offerTtlMs, POLICY.offerTtlMs);
      const after = clamp(before - 10000, 20000, 60000);
      await fbPut('executor_state/ops', { ...cur, offerTtlMs: after, updatedAt: Date.now() });
      return { field: 'ops.offerTtlMs', before, after };
    }
  },
  pause_auto_assign: {
    title: 'Tạm dừng autoAssign',
    severity: 'high',
    description: 'Tỷ lệ lỗi gán / hủy bất thường — tạm tắt auto assign 1 giờ.',
    apply: async () => {
      const cur = (await fb('executor_state/ops')) || {};
      await fbPut('executor_state/ops', {
        ...cur,
        autoAssignEnabled: false,
        pausedAt: Date.now(),
        autoResumeAt: Date.now() + 3600 * 1000
      });
      return { field: 'ops.autoAssignEnabled', before: cur.autoAssignEnabled !== false, after: false, autoResumeHours: 1 };
    }
  },
  resume_auto_assign: {
    title: 'Bật lại autoAssign',
    severity: 'medium',
    description: 'Hết thời gian tạm dừng hoặc chỉ số đã ổn — bật lại auto assign.',
    apply: async () => {
      const cur = (await fb('executor_state/ops')) || {};
      await fbPut('executor_state/ops', {
        ...cur,
        autoAssignEnabled: true,
        resumedAt: Date.now(),
        autoResumeAt: null
      });
      return { field: 'ops.autoAssignEnabled', before: false, after: true };
    }
  },
  run_expire_orders: {
    title: 'Dọn đơn waiting hết hạn',
    severity: 'low',
    description: 'Phát hiện đơn quá expiresAt vẫn waiting — hủy hàng loạt có kiểm soát.',
    apply: async () => intentExpireOrders(false)
  },
  trigger_learn: {
    title: 'Chạy vòng học trọng số ngay',
    severity: 'low',
    description: 'Đủ mẫu nhưng lâu chưa học — cập nhật weights từ kết quả gần đây.',
    apply: async (state) => {
      const lr = await learnFromRecentOutcomes(state);
      return { learned: lr.learned, reason: lr.reason, stats: lr.state?.stats };
    }
  }
});

async function reportToAdmin(report) {
  const payload = {
    type: 'ai_repair_report',
    ...report,
    createdAt: Date.now(),
    read: false
  };
  try {
    await fbPost('admin_notifications', payload);
  } catch (_) {}
  try {
    await fbPost('executor_reports', payload);
  } catch (_) {}
  return payload;
}

async function scanAndProposeRepairs(learning) {
  const proposals = [];
  const now = Date.now();
  const stats = learning.stats || {};
  const acceptRate = finite(stats.acceptRate, 0.5);
  const cancelRate = finite(stats.cancelRate, 0.2);
  const samples = finite(stats.samples, 0);

  const [ops, orders, online] = await Promise.all([
    fb('executor_state/ops').catch(() => ({})),
    fb('datxe').catch(() => ({})),
    fb('tai_xe_online').catch(() => ({}))
  ]);

  const orderList = orders && typeof orders === 'object' ? Object.values(orders) : [];
  const waiting = orderList.filter((o) => o && o.status === 'waiting').length;
  const expiredWaiting = orderList.filter(
    (o) => o && o.status === 'waiting' && o.expiresAt && Number(o.expiresAt) < now
  ).length;
  const onlineCount = online && typeof online === 'object' ? Object.keys(online).length : 0;

  if (samples >= 8 && acceptRate < 0.4 && finite(learning.weights?.fairness, 0.18) < 0.28) {
    proposals.push({
      repairId: 'boost_fairness',
      ...REPAIR_CATALOG.boost_fairness,
      evidence: { acceptRate, fairness: learning.weights.fairness, samples }
    });
  }
  if (samples >= 8 && cancelRate > 0.35 && finite(stats.avgCancelDistKm, 0) > finite(stats.avgAcceptDistKm, 0) + 1.2) {
    proposals.push({
      repairId: 'boost_distance',
      ...REPAIR_CATALOG.boost_distance,
      evidence: { cancelRate, avgCancelDistKm: stats.avgCancelDistKm, avgAcceptDistKm: stats.avgAcceptDistKm }
    });
  }
  if (waiting >= 5 && onlineCount <= 2) {
    proposals.push({
      repairId: 'widen_radius_temp',
      ...REPAIR_CATALOG.widen_radius_temp,
      evidence: { waiting, onlineCount, maxDistanceKm: ops?.maxDistanceKm }
    });
  }
  if (expiredWaiting >= 1) {
    proposals.push({
      repairId: 'run_expire_orders',
      ...REPAIR_CATALOG.run_expire_orders,
      evidence: { expiredWaiting }
    });
  }
  if (samples >= LEARNING.minSamples && (!stats.lastLearnAt || now - finite(stats.lastLearnAt) > 6 * 3600 * 1000)) {
    proposals.push({
      repairId: 'trigger_learn',
      ...REPAIR_CATALOG.trigger_learn,
      evidence: { samples, lastLearnAt: stats.lastLearnAt || 0 }
    });
  }
  if (cancelRate > 0.5 && samples >= 10) {
    proposals.push({
      repairId: 'pause_auto_assign',
      ...REPAIR_CATALOG.pause_auto_assign,
      evidence: { cancelRate, samples }
    });
  }
  if (ops && ops.autoAssignEnabled === false && ops.autoResumeAt && Number(ops.autoResumeAt) <= now) {
    proposals.push({
      repairId: 'resume_auto_assign',
      ...REPAIR_CATALOG.resume_auto_assign,
      evidence: { autoResumeAt: ops.autoResumeAt }
    });
  }

  // Lưu proposal pending cho admin
  const saved = [];
  for (const p of proposals) {
    const id = `rep_${Date.now()}_${p.repairId}_${Math.random().toString(36).slice(2, 6)}`;
    const record = {
      id,
      repairId: p.repairId,
      title: p.title,
      severity: p.severity,
      description: p.description,
      evidence: p.evidence || {},
      status: 'pending_approval',
      createdAt: now,
      approvedAt: null,
      appliedAt: null,
      report: null
    };
    try {
      await fbPut(`executor_repairs/${id}`, record);
      saved.push(record);
    } catch (_) {
      saved.push(record);
    }
  }

  await reportToAdmin({
    title: proposals.length ? `AI đề xuất ${proposals.length} sửa chữa` : 'AI quét: chưa cần sửa',
    body: proposals.length
      ? proposals.map((p) => `• [${p.severity}] ${p.title}`).join('\n')
      : 'Hệ thống vận hành trong ngưỡng bình thường.',
    phase: 'propose',
    count: proposals.length,
    proposalIds: saved.map((s) => s.id)
  });

  return { proposed: saved.length, proposals: saved };
}

async function listRepairProposals(statusFilter) {
  const all = await fb('executor_repairs');
  if (!all || typeof all !== 'object') return { items: [] };
  let items = Object.values(all).sort((a, b) => finite(b.createdAt) - finite(a.createdAt));
  if (statusFilter) items = items.filter((i) => i.status === statusFilter);
  return { items: items.slice(0, 50) };
}

async function approveAndApplyRepair(proposalId, adminId, learning) {
  if (!proposalId || !isSafeId(proposalId.replace(/[^A-Za-z0-9_-]/g, ''))) {
    // allow rep_ ids
  }
  const safeId = cleanText(proposalId, 120);
  if (!safeId) throw publicError('Thiếu proposalId');

  const proposal = await fb(`executor_repairs/${safeId}`);
  if (!proposal) throw publicError('Không tìm thấy đề xuất', 404);
  if (proposal.status !== 'pending_approval') {
    throw publicError(`Đề xuất không ở trạng thái chờ duyệt (hiện: ${proposal.status})`);
  }

  const repairId = proposal.repairId;
  const catalog = REPAIR_CATALOG[repairId];
  if (!catalog || typeof catalog.apply !== 'function') {
    throw publicError(`repairId không nằm trong whitelist: ${repairId}`);
  }

  // Đánh dấu approved trước khi apply
  const approvedAt = Date.now();
  await fbPut(`executor_repairs/${safeId}`, {
    ...proposal,
    status: 'approved_applying',
    approvedAt,
    approvedBy: adminId || 'admin'
  });

  let applyResult = null;
  let error = null;
  try {
    applyResult = await catalog.apply(learning);
  } catch (e) {
    error = String(e.message || e).slice(0, 300);
  }

  const appliedAt = Date.now();
  const finalStatus = error ? 'apply_failed' : 'applied';
  const report = {
    phase: 'applied',
    proposalId: safeId,
    repairId,
    title: proposal.title,
    status: finalStatus,
    applyResult,
    error,
    approvedAt,
    appliedAt,
    approvedBy: adminId || 'admin'
  };

  await fbPut(`executor_repairs/${safeId}`, {
    ...proposal,
    status: finalStatus,
    approvedAt,
    appliedAt,
    approvedBy: adminId || 'admin',
    applyResult: applyResult || null,
    applyError: error,
    report
  });

  await reportToAdmin({
    title: error
      ? `❌ Sửa chữa thất bại: ${proposal.title}`
      : `✅ Đã tự sửa sau phê duyệt: ${proposal.title}`,
    body: error
      ? `Lỗi: ${error}`
      : `Kết quả: ${cleanText(JSON.stringify(applyResult), 500)}`,
    phase: 'report',
    proposalId: safeId,
    repairId,
    status: finalStatus,
    applyResult,
    error
  });

  await audit({
    intent: 'approve_repair',
    proposalId: safeId,
    repairId,
    success: !error,
    applyResult: applyResult ? cleanText(JSON.stringify(applyResult), 800) : null,
    error
  });

  return report;
}

async function rejectRepair(proposalId, adminId, reason) {
  const safeId = cleanText(proposalId, 120);
  const proposal = await fb(`executor_repairs/${safeId}`);
  if (!proposal) throw publicError('Không tìm thấy đề xuất', 404);
  if (proposal.status !== 'pending_approval') {
    throw publicError('Chỉ từ chối được đề xuất đang chờ duyệt');
  }
  const record = {
    ...proposal,
    status: 'rejected',
    rejectedAt: Date.now(),
    rejectedBy: adminId || 'admin',
    rejectReason: cleanText(reason || '', 300)
  };
  await fbPut(`executor_repairs/${safeId}`, record);
  await reportToAdmin({
    title: `Đã từ chối đề xuất: ${proposal.title}`,
    body: reason || 'Admin từ chối',
    phase: 'rejected',
    proposalId: safeId
  });
  return record;
}


// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const started = Date.now();
  const body = req.method === 'GET' ? (req.query || {}) : req.body || {};
  const intent = cleanText(body.intent || body.operation || 'status', 40);
  const dryRun = body.dryRun === true || body.dryRun === 'true';

  const auth = authorize(req, intent);
  if (!auth.ok) {
    return res.status(401).json({
      success: false,
      executor: true,
      error: 'Unauthorized — cần admin session hoặc CRON_SECRET'
    });
  }

  try {
    let learning = await loadLearningState();
    let result = null;
    let learnMeta = null;

    // Tự học nhẹ trước khi dispatch (không block nếu fail)
    if (intent === 'dispatch_scan' || intent === 'dispatch_one' || intent === 'learn' || intent === 'propose_repairs' || intent === 'health_scan' || intent === 'approve_repair') {
      try {
        const lr = await learnFromRecentOutcomes(learning);
        learning = lr.state || learning;
        learnMeta = { learned: lr.learned, reason: lr.reason, samples: lr.samples };
      } catch (e) {
        learnMeta = { learned: false, reason: String(e.message || e).slice(0, 80) };
      }
    }

    if (intent === 'status') {
      result = {
        policy: POLICY,
        learning: {
          weights: learning.weights,
          stats: learning.stats,
          updatedAt: learning.updatedAt,
          version: learning.version
        }
      };
    } else if (intent === 'learn') {
      result = { learning, learnMeta };
    } else if (intent === 'dispatch_scan') {
      result = await intentDispatchScan(body, learning, dryRun);
      result.learnMeta = learnMeta;
    } else if (intent === 'dispatch_one') {
      result = await intentDispatchOne(body, learning, dryRun);
      result.learnMeta = learnMeta;
    } else if (intent === 'expire_orders') {
      result = await intentExpireOrders(dryRun);
    } else if (intent === 'renewal_nudge') {
      result = await intentRenewalNudge(dryRun);
    } else if (intent === 'propose_repairs' || intent === 'health_scan') {
      result = await scanAndProposeRepairs(learning);
    } else if (intent === 'list_repairs') {
      result = await listRepairProposals(cleanText(body.status || '', 40) || null);
    } else if (intent === 'approve_repair') {
      if (auth.role !== 'admin' && auth.role !== 'cron') {
        throw publicError('Chỉ admin/cron được phê duyệt sửa chữa', 403);
      }
      result = await approveAndApplyRepair(
        cleanText(body.proposalId || body.id || '', 120),
        cleanText(body.adminId || 'admin', 80),
        learning
      );
    } else if (intent === 'reject_repair') {
      if (auth.role !== 'admin') throw publicError('Chỉ admin được từ chối', 403);
      result = await rejectRepair(
        cleanText(body.proposalId || body.id || '', 120),
        cleanText(body.adminId || 'admin', 80),
        body.reason || ''
      );
    } else {
      throw publicError(`intent không hỗ trợ: ${intent}`);
    }

    const auditId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await audit({
      auditId,
      intent,
      role: auth.role,
      dryRun,
      success: true,
      durationMs: Date.now() - started,
      summary: cleanText(JSON.stringify(result).slice(0, 1500), 1500)
    });

    return res.status(200).json({
      success: true,
      executor: true,
      intelligent: true,
      continuousLearning: true,
      intent,
      dryRun,
      policyVersion: POLICY.version,
      auditId,
      durationMs: Date.now() - started,
      result
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    await audit({
      intent,
      role: auth.role,
      dryRun,
      success: false,
      error: String(error?.message || error).slice(0, 240),
      durationMs: Date.now() - started
    });
    return res.status(status).json({
      success: false,
      executor: true,
      error: status >= 500 ? 'AI Executor tạm thời không khả dụng' : error.message
    });
  }
}

export const config = { runtime: 'nodejs' };
