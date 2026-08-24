import { randomUUID } from 'node:crypto';

function firebaseUrl() {
  return String(
    process.env.FIREBASE_DATABASE_URL ||
      'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app'
  ).replace(/\/$/, '');
}

export async function audit(event, data = {}) {
  const id = `audit_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const record = {
    id,
    event,
    source: 'admin-ai-orchestrator',
    createdAt: Date.now(),
    ...data
  };
  try {
    await fetch(`${firebaseUrl()}/admin_ai/audit/${id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(10000)
    });
  } catch (_) {
    // Audit failure must not expose internal Firebase details to callers.
  }
  return record;
}
