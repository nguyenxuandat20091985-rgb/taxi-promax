const VALID_STATUSES = new Set(['completed', 'failed', 'timeout', 'needs_approval']);

export function verifyResult(result, task) {
  const errors = [];
  if (!result || typeof result !== 'object') errors.push('Kết quả không phải object');
  if (result?.taskId !== task?.taskId) errors.push('taskId không khớp');
  if (!VALID_STATUSES.has(result?.status)) errors.push('status không hợp lệ');
  if (result?.confidence !== undefined) {
    const confidence = Number(result.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      errors.push('confidence phải nằm trong khoảng 0 đến 1');
    }
  }
  if (Array.isArray(result?.sideEffects) && result.sideEffects.length && task?.requiresApproval) {
    errors.push('Kết quả có side effect trước approval');
  }
  return {
    valid: errors.length === 0,
    errors,
    accepted: errors.length === 0 && result?.status === 'completed'
  };
}

export function resultEnvelope(task, status, extra = {}) {
  return {
    taskId: task.taskId,
    planId: task.planId,
    agent: task.agent,
    status,
    confidence: 0,
    findings: [],
    sideEffects: [],
    ...extra
  };
}
