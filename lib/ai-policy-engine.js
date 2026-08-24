const LOW_RISK = new Set([
  'customer_support',
  'general_support',
  'general_knowledge',
  'explanation',
  'security_scan',
  'risk_analysis',
  'gps_analysis',
  'eta',
  'hotspot',
  'escalation'
]);

const HIGH_RISK = new Set([
  'pause_auto_dispatch',
  'resume_auto_dispatch',
  'block_user',
  'block_ip',
  'unblock_target',
  'widen_dispatch_radius',
  'force_dispatch_scan',
  'mass_flag_gps',
  'approved_action'
]);

export function classifyRisk({ capability = '', action = '', risk = '' } = {}) {
  const explicit = String(risk).toLowerCase();
  if (explicit === 'critical') return 'critical';
  if (explicit === 'high' || HIGH_RISK.has(action) || capability === 'approved_action') return 'high';
  if (explicit === 'low' || LOW_RISK.has(capability)) return 'low';
  return 'medium';
}

export function requiresApproval({ capability = '', action = '', risk = '' } = {}) {
  const level = classifyRisk({ capability, action, risk });
  return level === 'high' || level === 'critical';
}

export function canDispatch({ agent, capability, input = {} } = {}) {
  if (!agent || !agent.capabilities.includes(capability)) {
    return { allowed: false, reason: 'Agent không có capability yêu cầu' };
  }
  const allowed = new Set(agent.allowedData || []);
  const unexpected = Object.keys(input).filter((key) => !allowed.has(key));
  if (unexpected.length) {
    return { allowed: false, reason: `Dữ liệu không được phép: ${unexpected.join(', ')}` };
  }
  return { allowed: true, reason: null };
}

export function sanitizeInput(input = {}, allowedData = []) {
  const source = input && typeof input === 'object' ? input : {};
  const allowed = new Set(allowedData);
  return Object.fromEntries(
    Object.entries(source).filter(([key, value]) => allowed.has(key) && value !== undefined)
  );
}
