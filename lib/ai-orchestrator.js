import { getAgent, findAgentForCapability } from './ai-agent-registry.js';
import { canDispatch, classifyRisk, requiresApproval, sanitizeInput } from './ai-policy-engine.js';
import { createTask, enqueueTask, updateTask } from './ai-task-queue.js';
import { audit } from './ai-audit-log.js';
import { verifyResult, resultEnvelope } from './ai-result-verifier.js';

function clean(value, max = 300) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function createPlanId() {
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function buildPlan({ objective, steps = [], createdBy = 'admin-ai' } = {}) {
  const planId = createPlanId();
  const normalized = steps.map((step, index) => {
    const capability = clean(step.capability, 80);
    const candidates = findAgentForCapability(capability);
    const selected = step.agent ? getAgent(step.agent) : candidates[0];
    const input = selected ? sanitizeInput(step.input || {}, selected.allowedData) : {};
    const risk = classifyRisk({ capability, action: clean(step.action, 80), risk: step.risk });
    return {
      index,
      capability,
      action: clean(step.action, 80),
      agent: selected?.id || null,
      input,
      risk,
      requiresApproval: requiresApproval({ capability, action: clean(step.action, 80), risk }),
      availableAgents: candidates.map((agent) => agent.id)
    };
  });
  return {
    planId,
    objective: clean(objective, 500),
    createdBy,
    status: 'planned',
    steps: normalized,
    createdAt: Date.now()
  };
}

export async function dispatchPlan(plan, { dryRun = true } = {}) {
  const tasks = [];
  for (const step of plan.steps) {
    if (!step.agent) {
      tasks.push({ ...step, status: 'failed', error: 'Không tìm thấy agent phù hợp' });
      continue;
    }
    const agent = getAgent(step.agent);
    const policy = canDispatch({ agent, capability: step.capability, input: step.input });
    if (!policy.allowed) {
      tasks.push({ ...step, status: 'rejected', error: policy.reason });
      continue;
    }
    const task = createTask({
      planId: plan.planId,
      agent: agent.id,
      capability: step.capability,
      input: step.input,
      risk: step.risk,
      requiresApproval: step.requiresApproval
    });
    if (!dryRun) await enqueueTask(task);
    tasks.push({ ...task, status: dryRun ? 'preview' : task.status });
    await audit('task_created', {
      planId: plan.planId,
      taskId: task.taskId,
      agent: task.agent,
      capability: task.capability,
      dryRun
    });
  }
  const status = tasks.some((task) => task.status === 'rejected' || task.status === 'failed')
    ? 'needs_review'
    : tasks.some((task) => task.requiresApproval)
      ? 'needs_approval'
      : 'queued';
  await audit('plan_dispatched', { planId: plan.planId, status, taskCount: tasks.length, dryRun });
  return { ...plan, status, tasks };
}

export async function acceptResult(task, result) {
  const checked = verifyResult(result, task);
  const status = checked.valid ? result.status : 'failed';
  await updateTask(task.taskId, { status, result, verification: checked });
  await audit('task_result_received', {
    planId: task.planId,
    taskId: task.taskId,
    agent: task.agent,
    status,
    verification: checked
  });
  return checked.valid
    ? { ...result, verification: checked }
    : resultEnvelope(task, 'failed', { errors: checked.errors, verification: checked });
}
