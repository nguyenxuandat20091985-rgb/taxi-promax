/**
 * =============================================================================
 * TAXI PROMAX — AI ADMIN CHỈ HUY (MẠNH NHẤT HỆ THỐNG)
 * =============================================================================
 * Vai trò: đứng trên Care / Guard / Executor / Location / Dispatch.
 * - Việc NHỎ (low/medium an toàn): tự thực thi → báo cáo admin
 * - Việc LỚN (high/critical): đề xuất → admin duyệt → tự áp dụng → báo cáo lại
 * - Nhận báo cáo từ AI khác (ingest_report)
 * - Trả lời admin bằng knowledge + (optional) Groq + hành động thật
 *
 * POST /api/admin-ai
 * Auth: bắt buộc verifyAdminSession (trừ OPTIONS)
 *
 * Intents / body:
 *   { question }                    — hỏi + có thể kèm lệnh
 *   { intent: "command", command }  — lệnh trực tiếp
 *   { intent: "inbox" }             — hộp thư từ AI khác + đề xuất chờ duyệt
 *   { intent: "ingest_report", ...} — AI khác gửi việc lên
 *   { intent: "approve", id }       — duyệt việc lớn
 *   { intent: "reject", id }
 *   { intent: "status" }            — tổng quan hệ thống
 *   { intent: "scan" }              — quét nhanh + tự xử lý việc nhỏ
 *
 * Firebase:
 *   admin_ai/inbox/       — việc từ AI khác + đề xuất
 *   admin_ai/actions/     — lịch sử đã làm
 *   admin_ai/state/       — trạng thái chỉ huy
 *   admin_notifications/  — báo cáo về anh
 *
 * Env: FIREBASE_DATABASE_URL, ADMIN_SESSION_SECRET, GROQ_API_KEY (optional)
 * =============================================================================
 */

import crypto from 'node:crypto';
import {
  applyCors,
  rejectInvalidMethod,
  readJsonBody,
  cleanText,
  verifyAdminSession
} from '../lib/api-security.js';

const FIREBASE_URL = String(
  process.env.FIREBASE_DATABASE_URL ||
    'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/$/, '');

const VERSION = 'admin-ai-command-v2';

/** Việc nhỏ: tự làm rồi báo */
const AUTO_ACTIONS = new Set([
  'expire_waiting_orders',
  'run_learn_dispatch',
  'renewal_nudge',
  'care_ack_escalation',
  'clear_stale_signals',
  'gps_hotspot_report',
  'dedupe_notify'
]);

/** Việc lớn: phải duyệt */
const APPROVAL_ACTIONS = new Set([
  'pause_auto_dispatch',
  'resume_auto_dispatch',
  'block_user',
  'block_ip',
  'unblock_target',
  'widen_dispatch_radius',
  'force_dispatch_scan',
  'mass_flag_gps'
]);

function finite(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
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

async function reportAdmin(title, body, extra = {}) {
  const row = {
    type: 'admin_ai_report',
    title,
    body: cleanText(String(body || ''), 1500),
    read: false,
    createdAt: Date.now(),
    source: 'admin_ai',
    version: VERSION,
    ...extra
  };
  try {
    await fbPost('admin_notifications', row);
  } catch (_) {}
  try {
    await fbPost('admin_ai/reports', row);
  } catch (_) {}
  return row;
}

async function logAction(entry) {
  try {
    await fbPost('admin_ai/actions', {
      ...entry,
      at: Date.now(),
      version: VERSION
    });
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Knowledge nhanh (không phụ thuộc file KB nếu import lỗi)
// ---------------------------------------------------------------------------
function localAdminKnowledge(q) {
  const m = q.toLowerCase();
  if (/dispatch|phân bổ|phan bo|auto/.test(m)) {
    return 'Auto Dispatch công bằng: fair weights + soft-assign offered. Cron/scan qua executor. Việc nhỏ: học trọng số. Việc lớn: pause dispatch cần duyệt.';
  }
  if (/gps|định vị|dinh vi/.test(m)) {
    return 'AI Định vị: assess / fuse_pickup / normalize_pickup. GPS critical không broadcast. Hotspot báo admin.';
  }
  if (/care|chăm sóc|cham soc/.test(m)) {
    return 'Care 3 app → care_chats + admin_notifications. Escalate → care_escalations.';
  }
  if (/guard|bảo vệ|bao ve|hack|gian lận/.test(m)) {
    return 'AI Guard: signal, scan riskScore, auto chặn brute-force IP, việc mạnh (khóa user) cần duyệt.';
  }
  if (/duyệt|duyet|approve/.test(m)) {
    return 'Dùng intent approve + id việc trong admin_ai/inbox. Việc lớn mới cần duyệt; việc nhỏ AI Admin tự làm và báo cáo.';
  }
  return null;
}

async function groqAdmin(question, contextBrief) {
  const key = cleanText(process.env.GROQ_API_KEY || '', 300);
  if (!key) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: process.env.ADMIN_AI_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'Bạn là AI Admin chỉ huy Taxi ProMax (mạnh nhất hệ thống). Tiếng Việt, ngắn, ra quyết định rõ: ' +
              'VIỆC_NHỎ tự làm / VIỆC_LỚN cần duyệt. Không tự deploy code. ' +
              'Ngữ cảnh: ' +
              cleanText(contextBrief || '', 800)
          },
          { role: 'user', content: question }
        ],
        max_tokens: 350,
        temperature: 0.25
      }),
      signal: AbortSignal.timeout(15000)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Thực thi hành động (whitelist)
// ---------------------------------------------------------------------------
async function executeAction(action, params = {}) {
  const now = Date.now();

  switch (action) {
    case 'expire_waiting_orders': {
      const all = (await fb('datxe')) || {};
      let n = 0;
      for (const [id, o] of Object.entries(all)) {
        if (!o || o.status !== 'waiting') continue;
        if (!o.expiresAt || Number(o.expiresAt) > now) continue;
        await fbPut(`datxe/${id}`, {
          ...o,
          status: 'cancelled',
          cancelReason: 'expired_by_admin_ai',
          cancelledAt: now,
          statusHistory: { ...(o.statusHistory || {}), cancelled: now }
        });
        n++;
        if (n >= 40) break;
      }
      return { expired: n };
    }

    case 'run_learn_dispatch': {
      // Ghi cờ yêu cầu học — executor sẽ học khi scan; đồng thời touch learning timestamp
      const learning = (await fb('executor_state/learning')) || {};
      await fbPut('executor_state/learning', {
        ...learning,
        adminRequestedLearnAt: now,
        weights: learning.weights || null
      });
      return { queued: true, note: 'Đã đánh dấu yêu cầu học trọng số dispatch' };
    }

    case 'renewal_nudge': {
      const drivers = (await fb('drivers')) || {};
      let nudged = 0;
      const horizon = 2 * 86400000;
      for (const [uid, d] of Object.entries(drivers)) {
        const exp = finite(d?.tp_expiry, 0);
        if (exp <= now || exp > now + horizon) continue;
        await fbPost('admin_notifications', {
          type: 'renewal_nudge_ticket',
          title: `Nhắc gia hạn: ${d?.name || uid}`,
          body: `Hết hạn ${new Date(exp).toLocaleString('vi-VN')}`,
          userId: uid,
          read: false,
          createdAt: now
        });
        nudged++;
        if (nudged >= 15) break;
      }
      return { nudged };
    }

    case 'care_ack_escalation': {
      const esc = (await fb('care_escalations')) || {};
      let n = 0;
      for (const [id, e] of Object.entries(esc)) {
        if (!e || e.status !== 'open') continue;
        await fbPut(`care_escalations/${id}`, {
          ...e,
          status: 'ack_admin_ai',
          ackedAt: now
        });
        n++;
        if (n >= 20) break;
      }
      return { acked: n };
    }

    case 'clear_stale_signals': {
      const sig = (await fb('security_signals')) || {};
      const cutoff = now - 24 * 3600 * 1000;
      let n = 0;
      for (const [id, s] of Object.entries(sig)) {
        if (s && finite(s.at) < cutoff) {
          await fbPut(`security_signals/${id}`, null);
          n++;
          if (n >= 100) break;
        }
      }
      return { cleared: n };
    }

    case 'gps_hotspot_report': {
      const issues = (await fb('location_intel/gps_issues')) || {};
      const count = Object.keys(issues).length;
      return { issueCount: count, note: 'Xem location_intel/gps_issues và AI location hotspot_gps' };
    }

    case 'dedupe_notify': {
      return { ok: true, note: 'Dedup handled at write-time by Guard' };
    }

    case 'pause_auto_dispatch': {
      const cur = (await fb('executor_state/ops')) || {};
      const until = now + finite(params.minutes, 60) * 60 * 1000;
      await fbPut('executor_state/ops', {
        ...cur,
        autoAssignEnabled: false,
        pausedAt: now,
        autoResumeAt: until,
        pauseReason: 'admin_ai'
      });
      return { autoAssignEnabled: false, until };
    }

    case 'resume_auto_dispatch': {
      const cur = (await fb('executor_state/ops')) || {};
      await fbPut('executor_state/ops', {
        ...cur,
        autoAssignEnabled: true,
        resumedAt: now,
        autoResumeAt: null
      });
      return { autoAssignEnabled: true };
    }

    case 'block_user': {
      const uid = cleanText(params.targetId || params.userId || '', 120);
      if (!uid) throw new Error('Thiếu targetId');
      const until = now + finite(params.minutes, 120) * 60 * 1000;
      await fbPut(`security_blocks/user_${uid}`, {
        type: 'user',
        targetId: uid,
        until,
        reason: cleanText(params.reason || 'admin_ai', 200),
        createdAt: now,
        source: 'admin_ai'
      });
      return { blocked: uid, until };
    }

    case 'block_ip': {
      const ip = cleanText(params.targetId || params.ip || '', 64);
      if (!ip) throw new Error('Thiếu IP');
      const until = now + finite(params.minutes, 60) * 60 * 1000;
      const key = ip.replace(/\./g, '_');
      await fbPut(`security_blocks/ip_${key}`, {
        type: 'ip',
        targetId: ip,
        until,
        reason: cleanText(params.reason || 'admin_ai', 200),
        createdAt: now,
        source: 'admin_ai'
      });
      return { blocked: ip, until };
    }

    case 'unblock_target': {
      const t = cleanText(params.targetType || 'user', 20);
      const id = cleanText(params.targetId || '', 128);
      if (!id) throw new Error('Thiếu targetId');
      const key = t === 'ip' ? `ip_${id.replace(/\./g, '_')}` : `user_${id}`;
      await fbPut(`security_blocks/${key}`, null);
      return { unblocked: key };
    }

    case 'widen_dispatch_radius': {
      const cur = (await fb('executor_state/ops')) || {};
      const before = finite(cur.maxDistanceKm, 12);
      const after = Math.min(20, before + finite(params.deltaKm, 2));
      await fbPut('executor_state/ops', {
        ...cur,
        maxDistanceKm: after,
        widenedAt: now,
        autoRevertAt: now + 2 * 3600 * 1000
      });
      return { before, after };
    }

    case 'force_dispatch_scan': {
      await fbPut('executor_state/ops/forceScanAt', now);
      return { forceScanAt: now, note: 'Cron/executor sẽ ưu tiên scan' };
    }

    case 'mass_flag_gps': {
      const online = (await fb('tai_xe_online')) || {};
      let n = 0;
      for (const [uid, loc] of Object.entries(online)) {
        if (loc?.gpsSeverity === 'critical') {
          await fbPut(`security_flags/${uid}`, {
            type: 'gps_critical',
            at: now,
            source: 'admin_ai'
          });
          n++;
        }
      }
      return { flagged: n };
    }

    default:
      throw new Error(`Action không hỗ trợ: ${action}`);
  }
}

function classifySeverity(action, sourceSeverity) {
  if (sourceSeverity === 'critical' || sourceSeverity === 'high') return 'high';
  if (APPROVAL_ACTIONS.has(action)) return 'high';
  if (AUTO_ACTIONS.has(action)) return 'low';
  return 'medium';
}

/**
 * Nhận việc từ AI khác hoặc từ scan nội bộ → auto hoặc pending
 */
async function routeWorkItem(item) {
  const action = cleanText(item.action || '', 60);
  const severity = classifySeverity(action, item.severity);
  const id = cleanText(item.id || '', 80) || `work_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const record = {
    id,
    action,
    severity,
    title: cleanText(item.title || action, 160),
    detail: cleanText(item.detail || '', 800),
    params: item.params && typeof item.params === 'object' ? item.params : {},
    fromAI: cleanText(item.fromAI || 'admin_ai', 40),
    status: 'pending',
    createdAt: Date.now()
  };

  // Việc nhỏ → tự làm
  if (severity === 'low' || (severity === 'medium' && AUTO_ACTIONS.has(action))) {
    try {
      const result = await executeAction(action, record.params);
      record.status = 'auto_done';
      record.result = result;
      record.finishedAt = Date.now();
      await fbPut(`admin_ai/inbox/${id}`, record);
      await logAction({ id, action, mode: 'auto', result });
      await reportAdmin(
        `✅ AI Admin tự xử lý: ${record.title}`,
        `Nguồn: ${record.fromAI}\nKết quả: ${JSON.stringify(result).slice(0, 400)}`,
        { workId: id, mode: 'auto', severity }
      );
      return { mode: 'auto', record };
    } catch (e) {
      record.status = 'auto_failed';
      record.error = String(e.message || e).slice(0, 240);
      await fbPut(`admin_ai/inbox/${id}`, record);
      await reportAdmin(`❌ AI Admin lỗi khi tự xử lý: ${record.title}`, record.error, {
        workId: id,
        mode: 'auto_failed'
      });
      return { mode: 'auto_failed', record };
    }
  }

  // Việc lớn → chờ duyệt
  record.status = 'pending_approval';
  await fbPut(`admin_ai/inbox/${id}`, record);
  await reportAdmin(
    `⏳ Cần duyệt: ${record.title}`,
    `${record.detail || ''}\nNguồn AI: ${record.fromAI}\nGửi approve id=${id}`,
    { workId: id, mode: 'pending_approval', severity }
  );
  return { mode: 'pending_approval', record };
}

async function approveWork(id, adminId) {
  const rec = await fb(`admin_ai/inbox/${id}`);
  if (!rec) throw Object.assign(new Error('Không tìm thấy việc'), { status: 404 });
  if (rec.status !== 'pending_approval') {
    throw Object.assign(new Error(`Không thể duyệt status=${rec.status}`), { status: 400 });
  }

  await fbPut(`admin_ai/inbox/${id}`, {
    ...rec,
    status: 'approved_applying',
    approvedAt: Date.now(),
    approvedBy: adminId || 'admin'
  });

  let result = null;
  let error = null;
  try {
    result = await executeAction(rec.action, rec.params || {});
  } catch (e) {
    error = String(e.message || e).slice(0, 300);
  }

  const status = error ? 'apply_failed' : 'applied';
  const final = {
    ...rec,
    status,
    approvedAt: Date.now(),
    appliedAt: Date.now(),
    approvedBy: adminId || 'admin',
    result,
    error
  };
  await fbPut(`admin_ai/inbox/${id}`, final);
  await logAction({ id, action: rec.action, mode: 'approved', result, error });
  await reportAdmin(
    error ? `❌ Áp dụng thất bại: ${rec.title}` : `✅ Đã áp dụng sau duyệt: ${rec.title}`,
    error || JSON.stringify(result).slice(0, 500),
    { workId: id, mode: 'report', status }
  );
  return final;
}

async function rejectWork(id, adminId, reason) {
  const rec = await fb(`admin_ai/inbox/${id}`);
  if (!rec) throw Object.assign(new Error('Không tìm thấy việc'), { status: 404 });
  const final = {
    ...rec,
    status: 'rejected',
    rejectedAt: Date.now(),
    rejectedBy: adminId || 'admin',
    rejectReason: cleanText(reason || '', 300)
  };
  await fbPut(`admin_ai/inbox/${id}`, final);
  await reportAdmin(`Đã từ chối: ${rec.title}`, reason || '', { workId: id, mode: 'rejected' });
  return final;
}

async function collectInbox(limit = 30) {
  const box = (await fb('admin_ai/inbox')) || {};
  const items = Object.values(box)
    .sort((a, b) => finite(b.createdAt) - finite(a.createdAt))
    .slice(0, limit);
  const pending = items.filter((i) => i.status === 'pending_approval');
  return { items, pendingCount: pending.length, pending };
}

async function systemStatus() {
  const [ops, learning, lastScan, online, esc] = await Promise.all([
    fb('executor_state/ops').catch(() => null),
    fb('executor_state/learning').catch(() => null),
    fb('security_state/last_scan').catch(() => null),
    fb('tai_xe_online').catch(() => ({})),
    fb('care_escalations').catch(() => ({}))
  ]);
  const onlineCount = online && typeof online === 'object' ? Object.keys(online).length : 0;
  const openEsc = Object.values(esc || {}).filter((e) => e && e.status === 'open').length;
  const inbox = await collectInbox(10);
  return {
    version: VERSION,
    role: 'command_ai',
    onlineDrivers: onlineCount,
    careEscalationsOpen: openEsc,
    autoAssignEnabled: ops?.autoAssignEnabled !== false,
    maxDistanceKm: ops?.maxDistanceKm ?? null,
    learningWeights: learning?.weights || null,
    securityRisk: lastScan?.riskScore ?? null,
    securityLevel: lastScan?.level ?? null,
    pendingApprovals: inbox.pendingCount,
    policy: {
      autoActions: [...AUTO_ACTIONS],
      approvalActions: [...APPROVAL_ACTIONS]
    }
  };
}

/**
 * Quét nhanh → tạo việc nhỏ/lớn
 */
async function commandScan() {
  const results = [];
  const now = Date.now();

  // Đơn hết hạn
  try {
    const all = (await fb('datxe')) || {};
    const expired = Object.values(all).filter(
      (o) => o && o.status === 'waiting' && o.expiresAt && Number(o.expiresAt) < now
    ).length;
    if (expired > 0) {
      results.push(
        await routeWorkItem({
          action: 'expire_waiting_orders',
          title: `Dọn ${expired} đơn waiting hết hạn`,
          detail: 'Tự động hủy đơn quá expiresAt',
          fromAI: 'admin_ai_scan',
          severity: 'low'
        })
      );
    }
  } catch (_) {}

  // Care escalation tồn đọng
  try {
    const esc = (await fb('care_escalations')) || {};
    const open = Object.values(esc).filter((e) => e && e.status === 'open').length;
    if (open >= 3) {
      results.push(
        await routeWorkItem({
          action: 'care_ack_escalation',
          title: `Ack ${open} care escalation`,
          detail: 'Đánh dấu đã tiếp nhận (admin vẫn xử lý nội dung)',
          fromAI: 'admin_ai_scan',
          severity: 'low'
        })
      );
    }
  } catch (_) {}

  // Security risk cao → đề xuất pause (cần duyệt)
  try {
    const scan = await fb('security_state/last_scan');
    if (scan && finite(scan.riskScore) >= 70) {
      results.push(
        await routeWorkItem({
          action: 'pause_auto_dispatch',
          title: 'Tạm dừng Auto Dispatch (risk cao)',
          detail: `riskScore=${scan.riskScore} level=${scan.level}`,
          fromAI: 'admin_ai_scan',
          severity: 'high',
          params: { minutes: 45 }
        })
      );
    }
  } catch (_) {}

  // GPS critical nhiều
  try {
    const online = (await fb('tai_xe_online')) || {};
    let crit = 0;
    for (const loc of Object.values(online)) {
      if (loc?.gpsSeverity === 'critical') crit++;
    }
    if (crit >= 3) {
      results.push(
        await routeWorkItem({
          action: 'mass_flag_gps',
          title: `Flag ${crit} tài xế GPS critical`,
          fromAI: 'admin_ai_scan',
          severity: 'high'
        })
      );
    }
  } catch (_) {}

  await fbPut('admin_ai/state/last_scan', { at: Date.now(), results: results.length });
  return { processed: results.length, results };
}

/** Parse lệnh tiếng Việt đơn giản từ câu admin */
function parseCommand(text) {
  const t = text.toLowerCase();
  if (/dọn đơn|hủy đơn hết hạn|expire/.test(t)) return { action: 'expire_waiting_orders' };
  if (/tạm dừng dispatch|pause dispatch|tắt auto/.test(t))
    return { action: 'pause_auto_dispatch', params: { minutes: 60 } };
  if (/bật dispatch|resume dispatch|mở auto/.test(t)) return { action: 'resume_auto_dispatch' };
  if (/học dispatch|learn/.test(t)) return { action: 'run_learn_dispatch' };
  if (/nhắc gia hạn|renewal/.test(t)) return { action: 'renewal_nudge' };
  if (/quét|scan hệ thống|scan/.test(t)) return { action: '__scan__' };
  if (/hộp thư|inbox|chờ duyệt/.test(t)) return { action: '__inbox__' };
  if (/trạng thái|status|tổng quan/.test(t)) return { action: '__status__' };
  return null;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');
  if (rejectInvalidMethod(req, res)) return;

  if (!verifyAdminSession(req)) {
    return res.status(401).json({
      success: false,
      adminAI: true,
      error: 'Admin session required'
    });
  }

  const body = readJsonBody(req);
  const intent = cleanText(body.intent || body.operation || '', 40);
  const question = cleanText(body.question || body.query || body.command || '', 1200);
  const started = Date.now();

  try {
    // --- ingest từ AI khác ---
    if (intent === 'ingest_report') {
      const routed = await routeWorkItem({
        action: cleanText(body.action || '', 60),
        title: body.title || body.action,
        detail: body.detail || body.message || '',
        params: body.params || {},
        fromAI: body.fromAI || body.source || 'external_ai',
        severity: body.severity || 'medium',
        id: body.id
      });
      return res.status(200).json({
        success: true,
        adminAI: true,
        role: 'command',
        intent: 'ingest_report',
        result: routed,
        durationMs: Date.now() - started
      });
    }

    if (intent === 'approve') {
      const id = cleanText(body.id || body.workId || '', 80);
      const result = await approveWork(id, body.adminId || 'admin');
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'approve',
        result,
        durationMs: Date.now() - started
      });
    }

    if (intent === 'reject') {
      const id = cleanText(body.id || body.workId || '', 80);
      const result = await rejectWork(id, body.adminId || 'admin', body.reason);
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'reject',
        result,
        durationMs: Date.now() - started
      });
    }

    if (intent === 'inbox') {
      const result = await collectInbox(finite(body.limit, 40));
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'inbox',
        result,
        durationMs: Date.now() - started
      });
    }

    if (intent === 'status') {
      const result = await systemStatus();
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'status',
        result,
        durationMs: Date.now() - started
      });
    }

    if (intent === 'scan') {
      const result = await commandScan();
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'scan',
        result,
        durationMs: Date.now() - started
      });
    }

    // --- command tường minh ---
    if (intent === 'command' && body.action) {
      const routed = await routeWorkItem({
        action: cleanText(body.action, 60),
        title: body.title || body.action,
        detail: body.detail || '',
        params: body.params || {},
        fromAI: 'admin_command',
        severity: body.severity
      });
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'command',
        result: routed,
        durationMs: Date.now() - started
      });
    }

    // --- Chat / câu hỏi admin (mặc định) ---
    if (!question && !intent) {
      return res.status(400).json({ success: false, error: 'Thiếu question hoặc intent' });
    }

    const parsed = question ? parseCommand(question) : null;
    let actionResult = null;

    if (parsed?.action === '__scan__') {
      actionResult = await commandScan();
    } else if (parsed?.action === '__inbox__') {
      actionResult = await collectInbox();
    } else if (parsed?.action === '__status__') {
      actionResult = await systemStatus();
    } else if (parsed?.action) {
      actionResult = await routeWorkItem({
        action: parsed.action,
        title: parsed.action,
        params: parsed.params || {},
        fromAI: 'admin_chat',
        severity: APPROVAL_ACTIONS.has(parsed.action) ? 'high' : 'low'
      });
    }

    const statusBrief = await systemStatus().catch(() => ({}));
    const kb = question ? localAdminKnowledge(question) : null;
    let answer =
      kb ||
      (actionResult
        ? `Đã xử lý lệnh. Chi tiết trong result.`
        : 'AI Admin chỉ huy sẵn sàng. Hỏi trạng thái / quét / hộp thư / duyệt việc.');

    const groq = question
      ? await groqAdmin(
          question,
          JSON.stringify({
            status: statusBrief,
            actionResult: actionResult ? { mode: actionResult.mode || 'ok' } : null
          }).slice(0, 900)
        )
      : null;
    if (groq) answer = groq;

    return res.status(200).json({
      success: true,
      adminAI: true,
      role: 'command',
      version: VERSION,
      autonomous: true,
      strongerThan: ['care', 'guard', 'executor', 'location', 'support'],
      answer,
      actionResult,
      system: statusBrief,
      durationMs: Date.now() - started
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    return res.status(status).json({
      success: false,
      adminAI: true,
      error: status >= 500 ? 'AI Admin tạm thời không khả dụng' : error.message
    });
  }
}

export const config = { runtime: 'nodejs' };
