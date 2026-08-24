import { randomUUID } from 'node:crypto';

function firebaseUrl() {
  return String(
    process.env.FIREBASE_DATABASE_URL ||
      'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app'
  ).replace(/\/$/, '');
}

async function write(path, data, method = 'PUT') {
  const response = await fetch(`${firebaseUrl()}/${path}.json`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Firebase queue HTTP ${response.status}`);
  return response.json().catch(() => null);
}

export function createTask({ planId, agent, capability, input = {}, risk, requiresApproval, createdBy = 'admin-ai' }) {
  const now = Date.now();
  return {
    taskId: `task_${now}_${randomUUID().slice(0, 8)}`,
    planId,
    agent,
    capability,
    input,
    risk,
    requiresApproval: requiresApproval === true,
    status: requiresApproval ? 'needs_approval' : 'pending',
    createdBy,
    createdAt: now,
    deadlineAt: now + 30000
  };
}

export async function enqueueTask(task) {
  await write(`admin_ai/tasks/${task.taskId}`, task);
  return task;
}

export async function updateTask(taskId, patch) {
  const updated = { ...patch, updatedAt: Date.now() };
  await write(`admin_ai/tasks/${taskId}`, updated, 'PATCH');
  return updated;
}

export async function getTask(taskId) {
  const response = await fetch(`${firebaseUrl()}/admin_ai/tasks/${taskId}.json`, {
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Firebase queue HTTP ${response.status}`);
  return response.json();
}
