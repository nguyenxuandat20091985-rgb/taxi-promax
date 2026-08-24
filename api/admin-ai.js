/**
 * =============================================================================
 * TAXI PROMAX — AI ADMIN CHỈ HUY (api/admin-ai.js) v2
 * =============================================================================
 * Thay bản cũ (chỉ knowledge). Giữ tương thích: { question } → trả lời KB + lệnh.
 *
 * Vai trò: mạnh nhất hệ thống — đứng trên Care / Guard / Executor / Location.
 * - Việc NHỎ: tự thực thi → báo cáo admin
 * - Việc LỚN: đề xuất → admin duyệt → áp dụng → báo cáo lại
 * - Nhận ingest_report từ AI khác
 *
 * POST /api/admin-ai  |  Auth: Admin session HMAC bắt buộc
 *
 * Env: FIREBASE_DATABASE_URL, ADMIN_SESSION_SECRET, GROQ_API_KEY (optional)
 * =============================================================================
 */

import {
  applyCors,
  rejectInvalidMethod,
  readJsonBody,
  cleanText,
  verifyAdminSession
} from '../lib/api-security.js';
import { queryKnowledge, getKnowledgeBaseMeta } from '../lib/knowledge-base.js';
import { buildPlan, dispatchPlan } from '../lib/ai-orchestrator.js';

const FIREBASE_URL = String(
  process.env.FIREBASE_DATABASE_URL ||
    'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app'
).replace(/\/$/, '');

const VERSION = 'admin-ai-command-v2';

const AUTO_ACTIONS = new Set([
  'expire_waiting_orders',
  'run_learn_dispatch',
  'renewal_nudge',
  'care_ack_escalation',
  'clear_stale_signals',
  'gps_hotspot_report',
  'dedupe_notify'
]);

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
    await fbPost('admin_ai/actions', { ...entry, at: Date.now(), version: VERSION });
  } catch (_) {}
}

function answerFromKnowledge(question, category, limit) {
  try {
    const matches = queryKnowledge(question, {
      category: cleanText(category, 40) || 'all',
      limit: limit || 5
    });
    const answer = matches.length
      ? matches
          .map((result, index) => {
            const item = result.item || result;
            const title = item.title || item.name || `Mục ${index + 1}`;
            const content =
              item.content ||
              item.text ||
              item.summary ||
              (item.steps ? item.steps.join(' ') : JSON.stringify(item));
            return `${index + 1}. ${title}\n${content}`;
          })
          .join('\n\n')
      : '';
    return { answer, matches, knowledgeBase: getKnowledgeBaseMeta() };
  } catch {
    return { answer: '', matches: [], knowledgeBase: null };
  }
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
              'Bạn là AI Admin chỉ huy Taxi ProMax (mạnh nhất hệ thống). Tiếng Việt, ngắn, rõ quyết định: ' +
              'VIỆC_NHỎ tự làm / VIỆC_LỚN cần duyệt. Không tự deploy code. Ngữ cảnh: ' +
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
      const learning = (await fb('executor_state/learning')) || {};
      await fbPut('executor_state/learning', {
        ...learning,
        adminRequestedLearnAt: now,
        weights: learning.weights || null
      });
      return { queued: true };
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
        await fbPut(`care_escalations/${id}`, { ...e, status: 'ack_admin_ai', ackedAt: now });
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
      return { issueCount: Object.keys(issues).length };
    }
    case 'dedupe_notify':
      return { ok: true };
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
      await fbPut(`security_blocks/ip_${ip.replace(/\./g, '_')}`, {
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
      return { forceScanAt: now };
    }
    case 'mass_flag_gps': {
      const online = (await fb('tai_xe_online')) || {};
      let n = 0;
      for (const [uid, loc] of Object.entries(online)) {
        if (loc?.gpsSeverity === 'critical') {
          await fbPut(`security_flags/${uid}`, { type: 'gps_critical', at: now, source: 'admin_ai' });
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

async function routeWorkItem(item) {
  const action = cleanText(item.action || '', 60);
  const severity = classifySeverity(action, item.severity);
  const id =
    cleanText(item.id || '', 80) || `work_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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
      await reportAdmin(`❌ AI Admin lỗi tự xử lý: ${record.title}`, record.error, {
        workId: id,
        mode: 'auto_failed'
      });
      return { mode: 'auto_failed', record };
    }
  }

  record.status = 'pending_approval';
  await fbPut(`admin_ai/inbox/${id}`, record);
  await reportAdmin(
    `⏳ Cần duyệt: ${record.title}`,
    `${record.detail || ''}\nNguồn: ${record.fromAI}\napprove id=${id}`,
    { workId: id, mode: 'pending_approval', severity }
  );
  return { mode: 'pending_approval', record };
}

async function approveWork(id, adminId) {
  const rec = await fb(`admin_ai/inbox/${id}`);
  if (!rec) throw Object.assign(new Error('Không tìm thấy việc'), { status: 404 });
  if (rec.status !== 'pending_approval') {
    throw Object.assign(new Error(`Không duyệt được status=${rec.status}`), { status: 400 });
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
    policy: { autoActions: [...AUTO_ACTIONS], approvalActions: [...APPROVAL_ACTIONS] }
  };
}

async function commandScan() {
  const results = [];
  const now = Date.now();

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
          fromAI: 'admin_ai_scan',
          severity: 'low'
        })
      );
    }
  } catch (_) {}

  try {
    const esc = (await fb('care_escalations')) || {};
    const open = Object.values(esc).filter((e) => e && e.status === 'open').length;
    if (open >= 3) {
      results.push(
        await routeWorkItem({
          action: 'care_ack_escalation',
          title: `Ack ${open} care escalation`,
          fromAI: 'admin_ai_scan',
          severity: 'low'
        })
      );
    }
  } catch (_) {}

  try {
    const scan = await fb('security_state/last_scan');
    if (scan && finite(scan.riskScore) >= 70) {
      results.push(
        await routeWorkItem({
          action: 'pause_auto_dispatch',
          title: 'Tạm dừng Auto Dispatch (risk cao)',
          detail: `riskScore=${scan.riskScore}`,
          fromAI: 'admin_ai_scan',
          severity: 'high',
          params: { minutes: 45 }
        })
      );
    }
  } catch (_) {}

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

function parseCommand(text) {
  const t = text.toLowerCase();
  if (/dọn đơn|hủy đơn hết hạn|expire/.test(t)) return { action: 'expire_waiting_orders' };
  if (/tạm dừng dispatch|pause dispatch|tắt auto/.test(t))
    return { action: 'pause_auto_dispatch', params: { minutes: 60 } };
  if (/bật dispatch|resume dispatch|mở auto/.test(t)) return { action: 'resume_auto_dispatch' };
  if (/học dispatch|learn weight/.test(t)) return { action: 'run_learn_dispatch' };
  if (/nhắc gia hạn|renewal/.test(t)) return { action: 'renewal_nudge' };
  if (/quét hệ thống|scan hệ thống|^scan$/.test(t)) return { action: '__scan__' };
  if (/hộp thư|inbox|chờ duyệt/.test(t)) return { action: '__inbox__' };
  if (/trạng thái|status|tổng quan/.test(t)) return { action: '__status__' };
  return null;
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');
  if (rejectInvalidMethod(req, res)) return;

  if (!verifyAdminSession(req)) {
    return res.status(401).json({ success: false, adminAI: true, error: 'Admin session required' });
  }

  const body = readJsonBody(req);
  const intent = cleanText(body.intent || body.operation || '', 40);
  const question = cleanText(body.question || body.query || body.command || '', 1200);
  const started = Date.now();

  try {
    if (intent === 'orchestrate') {
      const steps = Array.isArray(body.steps) ? body.steps.slice(0, 12) : [];
      if (!steps.length) {
        return res.status(400).json({
          success: false,
          adminAI: true,
          intent: 'orchestrate',
          error: 'Cần có steps để lập kế hoạch điều phối'
        });
      }
      const plan = buildPlan({
        objective: body.objective || body.question || '',
        steps,
        createdBy: body.adminId || 'admin'
      });
      const result = await dispatchPlan(plan, { dryRun: body.dryRun !== false });
      return res.status(200).json({
        success: true,
        adminAI: true,
        role: 'command',
        intent: 'orchestrate',
        result,
        durationMs: Date.now() - started
      });
    }

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
      const result = await approveWork(cleanText(body.id || body.workId || '', 80), body.adminId || 'admin');
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'approve',
        result,
        durationMs: Date.now() - started
      });
    }

    if (intent === 'reject') {
      const result = await rejectWork(
        cleanText(body.id || body.workId || '', 80),
        body.adminId || 'admin',
        body.reason
      );
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'reject',
        result,
        durationMs: Date.now() - started
      });
    }

    if (intent === 'inbox') {
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'inbox',
        result: await collectInbox(finite(body.limit, 40)),
        durationMs: Date.now() - started
      });
    }

    if (intent === 'status') {
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'status',
        result: await systemStatus(),
        durationMs: Date.now() - started
      });
    }

    if (intent === 'scan') {
      return res.status(200).json({
        success: true,
        adminAI: true,
        intent: 'scan',
        result: await commandScan(),
        durationMs: Date.now() - started
      });
    }

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

    // Tương thích bản cũ: chỉ { question }
    if (!question && !intent) {
      return res.status(400).json({ success: false, error: 'Thiếu question hoặc intent' });
    }

    const parsed = question ? parseCommand(question) : null;
    let actionResult = null;

    if (parsed?.action === '__scan__') actionResult = await commandScan();
    else if (parsed?.action === '__inbox__') actionResult = await collectInbox();
    else if (parsed?.action === '__status__') actionResult = await systemStatus();
    else if (parsed?.action) {
      actionResult = await routeWorkItem({
        action: parsed.action,
        title: parsed.action,
        params: parsed.params || {},
        fromAI: 'admin_chat',
        severity: APPROVAL_ACTIONS.has(parsed.action) ? 'high' : 'low'
      });
    }

    const kb = question ? answerFromKnowledge(question, body.category, body.limit) : { answer: '', matches: [] };
    const statusBrief = await systemStatus().catch(() => ({}));

    let answer =
      kb.answer ||
      (actionResult
        ? 'Đã tiếp nhận lệnh. Xem actionResult / admin_notifications.'
        : 'AI Admin chỉ huy sẵn sàng. Hỏi kiến thức hoặc: trạng thái / quét / hộp thư / duyệt.');

    const groq = question
      ? await groqAdmin(
          question,
          JSON.stringify({
            status: statusBrief,
            kbHit: !!kb.answer,
            actionMode: actionResult?.mode || null
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
      strongerThan: ['care', 'guard', 'executor', 'location', 'support', 'assistant'],
      answer,
      matches: kb.matches || [],
      knowledgeBase: kb.knowledgeBase || getKnowledgeBaseMeta(),
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
