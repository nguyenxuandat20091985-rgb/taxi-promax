import crypto from 'node:crypto';
import { applyCors, rejectInvalidMethod, readJsonBody, cleanText, DEFAULT_ADMIN_SESSION_SECRET } from '../lib/api-security.js';

function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function safeEqual(left, right) {
    const a = Buffer.from(String(left));
    const b = Buffer.from(String(right));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const DEFAULT_ADMIN_PHONE = '0388724966';
const DEFAULT_ADMIN_PASSWORD = 'ducanh@123';

function issueSession(phone, sessionSecret) {
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
        sub: 'admin',
        phone,
        iat: now,
        exp: now + 8 * 60 * 60
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

export default async function handler(req, res) {
    applyCors(req, res);
    if (rejectInvalidMethod(req, res)) return;

    const configuredPhone = cleanText(process.env.ADMIN_PHONE, 40) || DEFAULT_ADMIN_PHONE;
    const configuredHash = cleanText(process.env.ADMIN_PASSWORD_HASH, 128).toLowerCase() || sha256(DEFAULT_ADMIN_PASSWORD);
    const sessionSecret = cleanText(process.env.ADMIN_SESSION_SECRET, 256) || DEFAULT_ADMIN_SESSION_SECRET;

    const body = readJsonBody(req);
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
