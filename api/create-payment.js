import PayOS from '@payos/node';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FIREBASE_URL = 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const plans = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/subscription-plans.json'), 'utf8')).plans;
const PLAN_BY_ID = new Map(plans.map((p) => [p.id, p]));

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        const body = req.body || {};
        const uid = String(body.driverUid || '').trim();
        const planId = String(body.planId || body.plan || '').trim().toUpperCase();
        const plan = PLAN_BY_ID.get(planId);

        if (!uid) return res.status(400).json({ success: false, error: 'driverUid is required' });
        if (!plan) return res.status(400).json({ success: false, error: 'Gói thuê bao không hợp lệ' });

        const driverRes = await fetch(`${FIREBASE_URL}/drivers/${encodeURIComponent(uid)}.json`);
        if (!driverRes.ok || !(await driverRes.json())) {
            return res.status(404).json({ success: false, error: 'Không tìm thấy tài xế' });
        }

        const payos = new PayOS(
            process.env.PAYOS_CLIENT_ID,
            process.env.PAYOS_API_KEY,
            process.env.PAYOS_CHECKSUM_KEY
        );
        const orderCode = Date.now();
        const pending = {
            uid,
            plan: plan.id,
            planName: plan.name,
            amount: plan.amount,
            createdAt: Date.now(),
            status: 'pending'
        };

        const pendingRes = await fetch(`${FIREBASE_URL}/payment_pending/${orderCode}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pending)
        });
        if (!pendingRes.ok) throw new Error('Không tạo được giao dịch chờ');

        const link = await payos.createPaymentLink({
            orderCode,
            amount: plan.amount,
            description: `PROMAX ${uid} ${plan.id}`,
            returnUrl: 'https://taxi-promax.vercel.app/?status=success',
            cancelUrl: 'https://taxi-promax.vercel.app/?status=cancel'
        });

        return res.status(200).json({
            success: true,
            checkoutUrl: link.checkoutUrl,
            orderCode,
            plan: plan.id,
            amount: plan.amount
        });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
}
