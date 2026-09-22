/**
 * Firebase RTDB REST helper — dùng DATABASE_SECRET nếu có (server-side).
 * Console: Project Settings → Service accounts → Database secrets (legacy)
 * Vercel env: FIREBASE_DATABASE_SECRET
 */
const FIREBASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app';

function authQuery() {
  const secret = process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_SECRET || '';
  if (!secret) return '';
  return '?auth=' + encodeURIComponent(secret);
}

export function fbUrl(path) {
  const p = path.startsWith('/') ? path : '/' + path;
  const base = FIREBASE_URL.replace(/\.json$/, '').replace(/\/$/, '');
  return base + p + (p.endsWith('.json') ? '' : '.json') + authQuery();
}

export async function fbGet(path) {
  const r = await fetch(fbUrl(path));
  if (!r.ok) return null;
  const t = await r.text();
  if (!t || t === 'null') return null;
  try {
    const j = JSON.parse(t);
    if (j && j.error) return null;
    return j;
  } catch (e) {
    return null;
  }
}

export async function fbPut(path, data) {
  const r = await fetch(fbUrl(path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const t = await r.text();
  if (!r.ok || (t && t.includes('Permission denied'))) {
    return { ok: false, body: t };
  }
  return { ok: true, body: t };
}

export async function fbPatch(path, data) {
  const r = await fetch(fbUrl(path), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const t = await r.text();
  if (!r.ok || (t && t.includes('Permission denied'))) {
    return { ok: false, body: t };
  }
  return { ok: true, body: t };
}

export async function fbDelete(path) {
  const r = await fetch(fbUrl(path), { method: 'DELETE' });
  return r.ok;
}

export function hasFirebaseSecret() {
  return !!(process.env.FIREBASE_DATABASE_SECRET || process.env.FIREBASE_SECRET);
}
