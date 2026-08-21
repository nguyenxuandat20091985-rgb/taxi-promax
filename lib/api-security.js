import crypto from 'node:crypto';

export const DEFAULT_ADMIN_SESSION_SECRET = 'TaxiProMax-admin-session-fallback-2026-change-in-production';

const DEFAULT_ORIGINS = [
    'https://taxi-promax.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
];

function getAllowedOrigins() {
    const configured = String(process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
    return configured.length ? configured : DEFAULT_ORIGINS;
}

export function applyCors(req, res, methods = 'POST, OPTIONS') {
    const origin = req.headers?.origin;
    const allowed = getAllowedOrigins();
    if (origin && allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

export function rejectInvalidMethod(req, res, allowedMethod = 'POST') {
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true;
    }
    if (req.method !== allowedMethod) {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return true;
    }
    return false;
}

export function readJsonBody(req) {
    const body = req.body || {};
    return body && typeof body === 'object' ? body : {};
}

export function cleanText(value, maxLength = 500) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

export function isPositiveAmount(value) {
    return Number.isInteger(value) && value > 0 && value <= 100000000;
}

export function isSafeId(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(value);
}

export function verifyAdminSession(req) {
    const secret = cleanText(process.env.ADMIN_SESSION_SECRET, 256) || DEFAULT_ADMIN_SESSION_SECRET;
    const authorization = req.headers?.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!secret || !token) return false;

    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return false;

    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        return data?.sub === 'admin' && Number(data.exp) > Math.floor(Date.now() / 1000);
    } catch (error) {
        return false;
    }
}
