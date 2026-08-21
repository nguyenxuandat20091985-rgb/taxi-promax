import crypto from 'node:crypto';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function cleanText(value, maxLength = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function applyCors(req, res) {
  const origin = req.headers?.origin || '';
  const allowed = [
    'https://taxi-promax.vercel.app',
    'https://taxi-promax-e54w.vercel.app',
    'http://localhost:3000'
  ];
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function issueSession(phone, secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: 'admin',
    phone,
    iat: now,
    exp: now + 8 * 60 * 60
  })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `\( {payload}. \){signature}`;
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const configuredPhone = cleanText(process.env.ADMIN_PHONE, 40);
  const configuredHash = cleanText(process.env.ADMIN_PASSWORD_HASH, 128).toLowerCase();
  const sessionSecret = cleanText(process.env.ADMIN_SESSION_SECRET, 256);

  if (!configuredPhone || !configuredHash || !sessionSecret) {
    return res.status(503).json({ success: false, error: 'Admin auth is not configured' });
  }

  const body = req.body || {};
  const phone = cleanText(body.phone, 40);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!phone || !password || password.length > 200) {
    return res.status(400).json({ success: false, error: 'Invalid credentials' });
  }

  const validPhone = phone === configuredPhone;
  const validPassword = safeEqual(sha256(password), configuredHash);

  if (!validPhone || !validPassword) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 8 * 60 * 60;
  return res.status(200).json({
    success: true,
    token: issueSession(phone, sessionSecret),
    phone,
    expiresAt
  });
}