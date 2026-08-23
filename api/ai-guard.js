/**
 * =============================================================================
 * TAXI PROMAX — AI GUARD (BẢO VỆ HỆ THỐNG)
 * =============================================================================
 * 1 file: chống tấn công từ ngoài + gian lận trong app taxi.
 * Không quét packet/malware endpoint — phù hợp PWA + Firebase + Vercel.
 *
 * POST /api/ai-guard
 * Auth: Admin Bearer session  hoặc  CRON_SECRET / x-cron-secret
 *
 * Intents:
 *   ingest        — ghi tín hiệu (login_fail, api_burst, gps_fraud, care_spam, order_spam…)
 *   scan          — quét tổng hợp Firebase + chấm điểm rủi ro + alert đã lọc
 *   status        — trạng thái guard + blocks đang hiệu lực
 *   list_alerts   — danh sách cảnh báo
 *   list_blocks   — IP/user đang chặn
 *   propose       — đề xuất hành động mạnh (khóa user…) → chờ duyệt
 *   approve_action — admin duyệt → tự áp dụng + báo cáo lại
 *   reject_action
 *   unblock       — gỡ block IP/user
 *
 * Tự động (nhẹ, không cần duyệt):
 *   - Rate signal → temporary IP throttle flag
 *   - Ghi security_alerts (đã lọc nhiễu)
 *   - Báo admin_notifications khi severity >= medium
 *
 * Mạnh (cần duyệt):
 *   - block_user, block_ip dài hạn, pause_dispatch, force_gps_flag
 *
 * Env: FIREBASE_DATABASE_URL, CRON_SECRET, ADMIN_SESSION_SECRET, ALLOWED_ORIGINS
 * =============================================================================
 */

import crypto from 'node:crypto';

const FIREBASE_URL = String(
  process.env.FIREBASE_DATABASE_URL ||
    'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/$/, '');

const GUARD = Object.freeze({
  version: 'ai-guard-v1',
  signalTtlMs: 15 * 60 * 1000,
  maxSignalsKeep: 200,
  // Ngưỡng lọc nhiễu
  thresholds: {
    loginFailIp: 8, // /15 phút
    loginFailUser: 6,
    careSpamUser: 20,
    orderSpamUser: 12,
    apiBurstIp: 80,
    gpsCriticalDrivers: 3,
    cancelBurst: 10
  },
  autoBlockIpMinutes: 30,
  autoThrottleScore: 70
});

const ACTION_CATALOG = Object.freeze({
  block_user: {
    title: 'Tạm khóa tài khoản user/tài xế',
    severity: 'high',
    apply: async ({ targetId, minutes = 60, reason }) => {
      const until = Date.now() + Math.max(15, Number(minutes) || 60) * 60 * 1000;
      await fbPut(`security_blocks/user_${targetId}`, {
        type: 'user',
        targetId,
        until,
        reason: cleanText(reason || 'admin_approved', 200),
        createdAt: Date.now(),
        source: 'ai_guard'
      });
      return { type: 'user', targetId, until };
    }
  },
  block_ip: {
    title: 'Chặn IP',
    severity: 'high',
    apply: async ({ targetId, minutes = 60, reason }) => {
      const until = Date.now() + Math.max(15, Number(minutes) || 60) * 60 * 1000;
      const key = String(targetId).replace(/\./g, '_');
      await fbPut(`security_blocks/ip_${key}`, {
        type: 'ip',
        targetId,
        until,
        reason: cleanText(reason || 'admin_approved', 200),
        createdAt: Date.now(),
        source: 'ai_guard'
      });
      return { type: 'ip', targetId, until };
    }
  },
  pause_auto_dispatch: {
    title: 'Tạm dừng Auto Dispatch',
    severity: 'medium',
    apply: async ({ minutes = 60 }) => {
      const until = Date.now() + Math.max(15, Number(minutes) || 60) * 60 * 1000;
      const cur = (await fb('executor_state/ops')) || {};
      await fbPut('executor_state/ops', {
        ...cur,
        autoAssignEnabled: false,
        pausedAt: Date.now(),
        autoResumeAt: until,
        pauseReason: 'ai_guard'
      });
      return { autoAssignEnabled: false, until };
    }
  },
  flag_gps_review: {
    title: 'Gắn cờ GPS review hàng loạt tài xế critical',
    severity: 'medium',
    apply: async () => {
      const online = (await fb('tai_xe_online')) || {};
      let n = 0;
      for (const [uid, loc] of Object.entries(online)) {
        if (loc && loc.gpsSeverity === 'critical') {
          await fbPut(`security_flags/${uid}`, {
            type: 'gps_critical',
            at: Date.now(),
            source: 'ai_guard'
          });
          n++;
        }
      }
      return { flagged: n };
    }
  }
});

function cleanText(v, max = 500) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}
function finite(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}
function isSafeId(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(v);
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
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Secret');
}

function verifyAdmin(req) {
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
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data?.sub === 'admin' && Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function verifyCron(req) {
  const secret = cleanText(process.env.CRON_SECRET || process.env.ADMIN_SESSION_SECRET || '', 256);
  if (!secret) return process.env.VERCEL_ENV !== 'production';
  const auth = req.headers?.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const header = req.headers?.['x-cron-secret'] || '';
  const q = req.query?.secret || '';
  return bearer === secret || header === secret || q === secret;
}

function authorize(req) {
  if (verifyAdmin(req)) return { ok: true, role: 'admin' };
  if (verifyCron(req)) return { ok: true, role: 'cron' };
  return { ok: false, role: null };
}

async function fb(path, options = {}) {
  const res = await fetch(`${FIREBASE_URL}/${path}.json`, {
    ...options,
    signal: AbortSignal.timeout(options.timeout || 10000),
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

async function notifyAdmin(payload) {
  const row = { type: 'security_alert', read: false, createdAt: Date.now(), ...payload };
  try {
    await fbPost('admin_notifications', row);
  } catch (_) {}
  try {
    await fbPost('security_reports', row);
  } catch (_) {}
}

function clientIp(req) {
  const xf = req.headers?.['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim().slice(0, 64);
  return cleanText(req.headers?.['x-real-ip'] || '', 64) || 'unknown';
}

// ---------------------------------------------------------------------------
// Ingest signals
// ---------------------------------------------------------------------------
async function ingestSignal(body, req) {
  const kind = cleanText(body.kind || body.type || '', 40);
  if (!kind) throw Object.assign(new Error('Thiếu kind'), { status: 400 });

  const ip = cleanText(body.ip || clientIp(req), 64) || 'unknown';
  const userId = cleanText(body.userId || body.uid || '', 120);
  const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};
  const now = Date.now();
  const id = `sig_${now}_${Math.random().toString(36).slice(2, 8)}`;

  const signal = {
    id,
    kind,
    ip,
    userId: userId || null,
    meta,
    at: now
  };

  await fbPut(`security_signals/${id}`, signal);

  // Auto lightweight response
  const auto = await maybeAutoRespond(signal);
  return { signal, auto };
}

async function maybeAutoRespond(signal) {
  const now = Date.now();
  const since = now - GUARD.signalTtlMs;
  const all = (await fb('security_signals')) || {};
  const recent = Object.values(all).filter((s) => s && finite(s.at) >= since);

  const actions = [];

  if (signal.kind === 'login_fail' && signal.ip) {
    const fails = recent.filter((s) => s.kind === 'login_fail' && s.ip === signal.ip).length;
    if (fails >= GUARD.thresholds.loginFailIp) {
      const until = now + GUARD.autoBlockIpMinutes * 60 * 1000;
      const key = signal.ip.replace(/\./g, '_');
      await fbPut(`security_blocks/ip_${key}`, {
        type: 'ip',
        targetId: signal.ip,
        until,
        reason: `auto: login_fail x${fails}`,
        createdAt: now,
        source: 'ai_guard_auto'
      });
      actions.push({ action: 'auto_block_ip', ip: signal.ip, until, fails });
      await raiseAlert({
        severity: 'high',
        code: 'brute_force_ip',
        title: 'Brute-force login theo IP',
        detail: `IP ${signal.ip} fail ${fails} lần / 15 phút — đã tự chặn ${GUARD.autoBlockIpMinutes} phút`,
        ip: signal.ip
      });
    }
  }

  if (signal.kind === 'care_spam' && signal.userId) {
    const n = recent.filter((s) => s.kind === 'care_spam' && s.userId === signal.userId).length;
    if (n >= GUARD.thresholds.careSpamUser) {
      await fbPut(`security_blocks/user_${signal.userId}`, {
        type: 'user',
        targetId: signal.userId,
        until: now + 30 * 60 * 1000,
        reason: `auto: care_spam x${n}`,
        scope: 'care',
        createdAt: now,
        source: 'ai_guard_auto'
      });
      actions.push({ action: 'auto_throttle_care', userId: signal.userId, n });
      await raiseAlert({
        severity: 'medium',
        code: 'care_spam',
        title: 'Spam Care AI',
        detail: `user ${signal.userId} spam care x${n}`,
        userId: signal.userId
      });
    }
  }

  if (signal.kind === 'gps_fraud' && signal.userId) {
    await fbPut(`security_flags/${signal.userId}`, {
      type: 'gps_fraud',
      at: now,
      meta: signal.meta || {},
      source: 'ai_guard'
    });
    actions.push({ action: 'flag_gps', userId: signal.userId });
    await raiseAlert({
      severity: 'high',
      code: 'gps_fraud',
      title: 'Nghi GPS giả / teleport',
      detail: `Tài xế ${signal.userId}`,
      userId: signal.userId,
      meta: signal.meta
    });
  }

  return actions;
}

async function raiseAlert(alert) {
  // Dedup: cùng code+target trong 10 phút không spam admin
  const code = alert.code || 'generic';
  const dedupKey = `${code}_${alert.ip || ''}_${alert.userId || ''}`.replace(/\./g, '_');
  const existing = (await fb(`security_alert_dedup/${dedupKey}`)) || null;
  const now = Date.now();
  if (existing && now - finite(existing.at) < 10 * 60 * 1000) {
    return { deduped: true };
  }
  await fbPut(`security_alert_dedup/${dedupKey}`, { at: now });

  const id = `al_${now}_${Math.random().toString(36).slice(2, 6)}`;
  const row = {
    id,
    ...alert,
    severity: alert.severity || 'medium',
    createdAt: now,
    read: false,
    source: 'ai_guard'
  };
  await fbPut(`security_alerts/${id}`, row);

  if (row.severity === 'high' || row.severity === 'critical') {
    await notifyAdmin({
      title: `🛡️ ${row.title}`,
      body: row.detail || '',
      severity: row.severity,
      alertId: id,
      code: row.code
    });
  } else if (row.severity === 'medium') {
    await notifyAdmin({
      title: `🛡️ ${row.title}`,
      body: row.detail || '',
      severity: row.severity,
      alertId: id,
      code: row.code
    });
  }
  return { deduped: false, id };
}

// ---------------------------------------------------------------------------
// Full scan
// ---------------------------------------------------------------------------
async function scanSystem() {
  const now = Date.now();
  const since = now - GUARD.signalTtlMs;
  const findings = [];
  let riskScore = 0;

  const [signals, blocks, online, orders, escalations] = await Promise.all([
    fb('security_signals').catch(() => ({})),
    fb('security_blocks').catch(() => ({})),
    fb('tai_xe_online').catch(() => ({})),
    fb('datxe').catch(() => ({})),
    fb('care_escalations').catch(() => ({}))
  ]);

  const recent = Object.values(signals || {}).filter((s) => s && finite(s.at) >= since);
  const loginFails = recent.filter((s) => s.kind === 'login_fail');
  const byIp = {};
  for (const s of loginFails) {
    byIp[s.ip] = (byIp[s.ip] || 0) + 1;
  }
  for (const [ip, n] of Object.entries(byIp)) {
    if (n >= GUARD.thresholds.loginFailIp) {
      findings.push({ code: 'brute_force_ip', severity: 'high', ip, count: n });
      riskScore += 25;
    }
  }

  let gpsCritical = 0;
  for (const loc of Object.values(online || {})) {
    if (loc && loc.gpsSeverity === 'critical') gpsCritical++;
  }
  if (gpsCritical >= GUARD.thresholds.gpsCriticalDrivers) {
    findings.push({ code: 'gps_critical_wave', severity: 'high', count: gpsCritical });
    riskScore += 20;
  }

  const orderList = Object.values(orders || {});
  const recentCancels = orderList.filter(
    (o) => o && o.status === 'cancelled' && now - finite(o.cancelledAt || o.updatedAt) < GUARD.signalTtlMs
  ).length;
  if (recentCancels >= GUARD.thresholds.cancelBurst) {
    findings.push({ code: 'cancel_burst', severity: 'medium', count: recentCancels });
    riskScore += 15;
  }

  const openEsc = Object.values(escalations || {}).filter((e) => e && e.status === 'open').length;
  if (openEsc >= 5) {
    findings.push({ code: 'care_escalation_pile', severity: 'medium', count: openEsc });
    riskScore += 10;
  }

  // Active blocks count
  const activeBlocks = Object.values(blocks || {}).filter((b) => b && finite(b.until) > now).length;

  riskScore = Math.min(100, riskScore);
  const level = riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'elevated' : riskScore >= 20 ? 'watch' : 'ok';

  for (const f of findings) {
    await raiseAlert({
      severity: f.severity,
      code: f.code,
      title: `Scan: ${f.code}`,
      detail: JSON.stringify(f).slice(0, 300),
      ip: f.ip,
      meta: f
    });
  }

  // Propose strong actions if critical
  const proposals = [];
  if (riskScore >= 70) {
    proposals.push({
      actionId: 'pause_auto_dispatch',
      reason: 'riskScore cao — tạm dừng dispatch',
      params: { minutes: 60 }
    });
  }
  if (gpsCritical >= GUARD.thresholds.gpsCriticalDrivers) {
    proposals.push({
      actionId: 'flag_gps_review',
      reason: 'Nhiều tài xế GPS critical',
      params: {}
    });
  }

  const savedProposals = [];
  for (const p of proposals) {
    const id = `gact_${now}_${p.actionId}_${Math.random().toString(36).slice(2, 5)}`;
    const rec = {
      id,
      ...p,
      status: 'pending_approval',
      createdAt: now,
      title: ACTION_CATALOG[p.actionId]?.title || p.actionId
    };
    try {
      await fbPut(`security_actions/${id}`, rec);
      savedProposals.push(rec);
    } catch (_) {
      savedProposals.push(rec);
    }
  }

  if (savedProposals.length) {
    await notifyAdmin({
      title: `🛡️ AI Guard đề xuất ${savedProposals.length} hành động`,
      body: savedProposals.map((p) => `• ${p.title || p.actionId}`).join('\n'),
      phase: 'propose',
      riskScore,
      level
    });
  }

  await fbPut('security_state/last_scan', {
    at: now,
    riskScore,
    level,
    findings,
    activeBlocks,
    signalCount: recent.length,
    version: GUARD.version
  });

  return {
    riskScore,
    level,
    findings,
    activeBlocks,
    signalCount: recent.length,
    proposals: savedProposals,
    version: GUARD.version
  };
}

async function listAlerts(limit = 30) {
  const all = (await fb('security_alerts')) || {};
  const items = Object.values(all)
    .sort((a, b) => finite(b.createdAt) - finite(a.createdAt))
    .slice(0, limit);
  return { items };
}

async function listBlocks() {
  const all = (await fb('security_blocks')) || {};
  const now = Date.now();
  const items = Object.entries(all)
    .map(([id, b]) => ({ id, ...b, active: finite(b.until) > now }))
    .filter((b) => b.active)
    .sort((a, b) => finite(b.createdAt) - finite(a.createdAt));
  return { items };
}

async function approveAction(actionRecordId, adminId) {
  const id = cleanText(actionRecordId, 120);
  const rec = await fb(`security_actions/${id}`);
  if (!rec) throw Object.assign(new Error('Không tìm thấy đề xuất'), { status: 404 });
  if (rec.status !== 'pending_approval') {
    throw Object.assign(new Error(`Trạng thái không hợp lệ: ${rec.status}`), { status: 400 });
  }
  const catalog = ACTION_CATALOG[rec.actionId];
  if (!catalog) throw Object.assign(new Error('action không whitelist'), { status: 400 });

  await fbPut(`security_actions/${id}`, {
    ...rec,
    status: 'applying',
    approvedAt: Date.now(),
    approvedBy: adminId || 'admin'
  });

  let result = null;
  let error = null;
  try {
    result = await catalog.apply({ ...(rec.params || {}), reason: rec.reason });
  } catch (e) {
    error = String(e.message || e).slice(0, 300);
  }

  const status = error ? 'apply_failed' : 'applied';
  const report = {
    phase: 'applied',
    actionId: rec.actionId,
    status,
    result,
    error,
    at: Date.now()
  };

  await fbPut(`security_actions/${id}`, {
    ...rec,
    status,
    approvedAt: Date.now(),
    appliedAt: Date.now(),
    approvedBy: adminId || 'admin',
    result,
    error,
    report
  });

  await notifyAdmin({
    title: error ? `❌ Guard áp dụng thất bại: ${rec.title}` : `✅ Guard đã áp dụng: ${rec.title}`,
    body: error || JSON.stringify(result).slice(0, 400),
    phase: 'report',
    actionRecordId: id,
    status
  });

  return report;
}

async function rejectAction(actionRecordId, adminId, reason) {
  const id = cleanText(actionRecordId, 120);
  const rec = await fb(`security_actions/${id}`);
  if (!rec) throw Object.assign(new Error('Không tìm thấy'), { status: 404 });
  const next = {
    ...rec,
    status: 'rejected',
    rejectedAt: Date.now(),
    rejectedBy: adminId || 'admin',
    rejectReason: cleanText(reason || '', 300)
  };
  await fbPut(`security_actions/${id}`, next);
  await notifyAdmin({
    title: `Đã từ chối hành động Guard: ${rec.title || rec.actionId}`,
    body: reason || '',
    phase: 'rejected',
    actionRecordId: id
  });
  return next;
}

async function unblock(targetType, targetId) {
  const t = cleanText(targetType, 20);
  const id = cleanText(targetId, 128);
  if (!t || !id) throw Object.assign(new Error('Thiếu targetType/targetId'), { status: 400 });
  const key = t === 'ip' ? `ip_${id.replace(/\./g, '_')}` : `user_${id}`;
  await fbPut(`security_blocks/${key}`, null);
  await notifyAdmin({
    title: `Đã gỡ block ${t}: ${id}`,
    body: '',
    phase: 'unblock'
  });
  return { unblocked: key };
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
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const body = req.method === 'GET' ? req.query || {} : req.body || {};
  const intent = cleanText(body.intent || body.operation || 'status', 40);

  // ingest có thể gọi từ app (signal) — vẫn nên có secret nhẹ hoặc public hạn chế
  const auth = authorize(req);
  const publicIngest = intent === 'ingest' && cleanText(body.publicKey || '', 80) === cleanText(process.env.GUARD_INGEST_KEY || '', 80) && process.env.GUARD_INGEST_KEY;

  if (!auth.ok && !publicIngest) {
    // Cho ingest từ server-side khác nếu có ADMIN/CRON; client nên qua admin proxy
    if (intent === 'ingest' && process.env.VERCEL_ENV !== 'production') {
      // dev ok
    } else if (intent !== 'ingest') {
      return res.status(401).json({ success: false, guard: true, error: 'Unauthorized' });
    } else if (!publicIngest && !auth.ok) {
      // Production ingest: require auth unless GUARD_INGEST_KEY matches
      return res.status(401).json({ success: false, guard: true, error: 'Unauthorized ingest' });
    }
  }

  const started = Date.now();
  try {
    let result = null;

    if (intent === 'ingest') {
      result = await ingestSignal(body, req);
    } else if (intent === 'scan') {
      result = await scanSystem();
    } else if (intent === 'status') {
      const last = (await fb('security_state/last_scan')) || null;
      const blocks = await listBlocks();
      result = { lastScan: last, activeBlocks: blocks.items, version: GUARD.version };
    } else if (intent === 'list_alerts') {
      result = await listAlerts(finite(body.limit, 30));
    } else if (intent === 'list_blocks') {
      result = await listBlocks();
    } else if (intent === 'propose') {
      // force scan + proposals
      result = await scanSystem();
    } else if (intent === 'approve_action') {
      if (auth.role !== 'admin' && auth.role !== 'cron') {
        return res.status(403).json({ success: false, error: 'Chỉ admin/cron' });
      }
      result = await approveAction(body.actionId || body.id, body.adminId || 'admin');
    } else if (intent === 'reject_action') {
      if (auth.role !== 'admin') return res.status(403).json({ success: false, error: 'Chỉ admin' });
      result = await rejectAction(body.actionId || body.id, body.adminId || 'admin', body.reason);
    } else if (intent === 'unblock') {
      if (auth.role !== 'admin') return res.status(403).json({ success: false, error: 'Chỉ admin' });
      result = await unblock(body.targetType, body.targetId);
    } else {
      return res.status(400).json({ success: false, error: `intent không hỗ trợ: ${intent}` });
    }

    return res.status(200).json({
      success: true,
      guard: true,
      intent,
      durationMs: Date.now() - started,
      version: GUARD.version,
      result
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    return res.status(status).json({
      success: false,
      guard: true,
      error: status >= 500 ? 'AI Guard tạm thời không khả dụng' : error.message
    });
  }
}

export const config = { runtime: 'nodejs' };
