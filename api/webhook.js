/**
 * PayOS webhook — subscription only.
 * The platform never settles ride fares here; this endpoint only activates a verified driver subscription.
 */
import PayOS from '@payos/node';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const payos = new PayOS(process.env.PAYOS_CLIENT_ID, process.env.PAYOS_API_KEY, process.env.PAYOS_CHECKSUM_KEY);
const FIREBASE_URL = 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const plans = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/subscription-plans.json'), 'utf8')).plans;
const PLAN_BY_ID = new Map(plans.map((p) => [p.id, p]));

async function claimPayment(orderCode, record) {
    const url = `${FIREBASE_URL}/payment_logs/${encodeURIComponent(orderCode)}.json`;
    const read = await fetch(url, { headers: { 'X-Firebase-ETag': 'true' } });
    if (!read.ok) throw new Error('Không đọc được payment log');
    const etag = read.headers.get('etag');
    const existing = await read.json();
    if (existing) return false;

    const put = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'if-match': etag || 'null' },
        body: JSON.stringify({ ...record, status: 'processing' })
    });
    if (put.status === 412) return false;
    if (!put.ok) throw new Error('Không claim được payment');
    return true;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false });

    try {
        const data = req.body;
        if (!data || data.description === 'Confirm Webhook' || data.desc === 'Confirm Webhook') {
            return res.status(200).json({ success: true, message: 'Webhook OK' });
        }

        const verified = payos.verifyPaymentWebhookData(data);
        if (!verified) return res.status(400).json({ success: false, error: 'Sai chữ ký' });
        if (verified.code !== '00') return res.status(200).json({ success: true, message: 'Giao dịch không thành công' });

        const orderCode = verified.orderCode;
        const pendingRes = await fetch(`${FIREBASE_URL}/payment_pending/${encodeURIComponent(orderCode)}.json`);
        const pending = pendingRes.ok ? await pendingRes.json() : null;
        if (!pending?.uid || !pending?.plan) {
            return res.status(400).json({ success: false, error: 'Không có giao dịch chờ hợp lệ' });
        }

        const plan = PLAN_BY_ID.get(String(pending.plan).toUpperCase());
        if (!plan || Number(verified.amount) !== Number(plan.amount) || Number(pending.amount) !== Number(plan.amount)) {
            return res.status(400).json({ success: false, error: 'Số tiền/gói không khớp cấu hình' });
        }

        const claimed = await claimPayment(orderCode, {
            uid: pending.uid,
            plan: plan.id,
            planName: plan.name,
            amount: plan.amount,
            at: Date.now()
        });
        if (!claimed) return res.status(200).json({ success: true, message: 'Đã xử lý' });

        const now = Date.now();
        const driverRes = await fetch(`${FIREBASE_URL}/drivers/${encodeURIComponent(pending.uid)}.json`);
        const driver = driverRes.ok ? await driverRes.json() : null;
        if (!driver) throw new Error('Tài xế không tồn tại');

        let base = now;
        if (Number(driver.tp_expiry) > now) base = Number(driver.tp_expiry);
        const durationMs = plan.duration_days
            ? plan.duration_days * 24 * 60 * 60 * 1000
            : (plan.duration_months * 30 * 24 * 60 * 60 * 1000);
        const newExpiry = base + durationMs;

        const subscription = {
            driverId: pending.uid,
            planId: plan.id,
            planName: plan.name,
            amount: plan.amount,
            startAt: now,
            previousExpiry: driver.tp_expiry || null,
            expireAt: newExpiry,
            status: 'ACTIVE',
            paymentTransactionId: String(orderCode),
            source: 'PAYOS_WEBHOOK'
        };

        const patch = await fetch(`${FIREBASE_URL}/drivers/${encodeURIComponent(pending.uid)}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tp_expiry: newExpiry,
                active_plan: plan.id,
                last_payment: { orderCode, amount: plan.amount, plan: plan.id, at: now }
            })
        });
        if (!patch.ok) throw new Error('Không cập nhật được thuê bao tài xế');

        const subWrite = await fetch(`${FIREBASE_URL}/subscriptions/${encodeURIComponent(pending.uid)}/${encodeURIComponent(orderCode)}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription)
        });
        if (!subWrite.ok) throw new Error('Không ghi được sổ thuê bao');

        await fetch(`${FIREBASE_URL}/payment_logs/${encodeURIComponent(orderCode)}.json`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'paid', expiry: newExpiry, processedAt: now })
        });
        await fetch(`${FIREBASE_URL}/payment_pending/${encodeURIComponent(orderCode)}.json`, { method: 'DELETE' });

        return res.status(200).json({ success: true });
    } catch (e) {
        console.error('[webhook]', e.message);
        return res.status(500).json({ success: false, error: e.message });
    }
}
