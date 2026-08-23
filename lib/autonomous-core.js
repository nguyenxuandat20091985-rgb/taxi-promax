import { applyCors, rejectInvalidMethod, readJsonBody, cleanText, isSafeId } from '../lib/api-security.js';
import { queryKnowledge, getFarePolicy, getHotspots, getKnowledgeBaseMeta } from '../lib/knowledge-base.js';
import { quoteFare, scoreTripAllocation, detectGpsTeleportation, weightedMovingAverage, optimizePricing } from '../lib/autonomous-engine.js';

const FIREBASE_URL = String(process.env.FIREBASE_DATABASE_URL || 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app').replace(/\/$/, '');
const REQUEST_LIMIT = 50000;

function number(value, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function boundedArray(value, max = 100) { return Array.isArray(value) ? value.slice(0, max) : []; }
function publicError(message, status = 400) { const error = new Error(message); error.status = status; return error; }

async function firebaseJson(path, options = {}) {
    const response = await fetch(`${FIREBASE_URL}/${path}.json`, { ...options, signal: AbortSignal.timeout(5000), headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
    if (!response.ok) throw new Error(`Firebase HTTP ${response.status}`);
    return response.json();
}

async function writeActivity(operation, role, result) {
    try {
        await firebaseJson('autonomous_logs', { method: 'POST', body: JSON.stringify({ operation, role, success: true, result: cleanText(JSON.stringify(result), 1200), createdAt: Date.now() }) });
    } catch (_) {
        // Logging is best-effort; a database outage must not turn a deterministic quote into a failure.
    }
}

function requireRole(role) {
    const allowed = ['customer', 'driver', 'admin', 'system'];
    return allowed.includes(role) ? role : 'customer';
}

function calculateQuote(body) {
    const policy = getFarePolicy(cleanText(body.region, 80), cleanText(body.service, 60) || 'taxi_standard');
    const distanceKm = number(body.distanceKm, -1);
    if (distanceKm < 0 || distanceKm > 500) throw publicError('distanceKm phải nằm trong khoảng 0–500');
    const durationMinutes = number(body.durationMinutes, 0);
    if (durationMinutes < 0 || durationMinutes > 1440) throw publicError('durationMinutes không hợp lệ');
    const quote = quoteFare({ distanceKm, durationMinutes, policy, surge: body.surge, zoneWeight: body.zoneWeight, compensation: body.compensation });
    return { policyId: policy.id, quote };
}

function allocation(body) {
    const pickup = body.pickup;
    if (!pickup || !Number.isFinite(Number(pickup.lat)) || !Number.isFinite(Number(pickup.lng ?? pickup.lon))) throw publicError('pickup GPS không hợp lệ');
    const hotspotWeight = number(body.hotspotWeight, 1);
    const drivers = boundedArray(body.drivers, 50).filter(driver => isSafeId(driver?.id || driver?.uid || ''));
    return drivers.map(driver => ({ id: driver.id || driver.uid, ...scoreTripAllocation({ driver, pickup, hotspotWeight, now: Date.now() }) })).filter(item => item.eligible).sort((a, b) => b.score - a.score).slice(0, 20);
}

function gpsCheck(body) {
    if (!body.previous || !body.current) throw publicError('Cần previous và current GPS');
    const result = detectGpsTeleportation(body.previous, body.current, { maxSpeedKph: number(body.maxSpeedKph, 160), maxJumpKm: number(body.maxJumpKm, 2.5) });
    const history = boundedArray(body.history, 20);
    return { ...result, smoothed: weightedMovingAverage([...history, body.current]) };
}

async function pricingOptimization(body) {
    let trips = boundedArray(body.trips, 200);
    if (!trips.length && body.loadFromFirebase === true) trips = Object.values((await firebaseJson('datxe')) || {}).slice(-200);
    return optimizePricing(trips, { currentSurge: body.currentSurge });
}

export default async function handler(req, res) {
    applyCors(req, res, 'POST, OPTIONS');
    if (rejectInvalidMethod(req, res)) return;
    try {
        const raw = JSON.stringify(req.body || {});
        if (raw.length > REQUEST_LIMIT) throw publicError('Request quá lớn', 413);
        const body = readJsonBody(req);
        const operation = cleanText(body.operation, 40);
        const role = requireRole(cleanText(body.role, 20));
        let result;
        if (operation === 'knowledge_query') {
            const query = cleanText(body.query, 500);
            if (!query) throw publicError('Thiếu query');
            result = { knowledgeBase: getKnowledgeBaseMeta(), matches: queryKnowledge(query, { category: cleanText(body.category, 40) || 'all', limit: body.limit }) };
        } else if (operation === 'fare_quote') {
            result = calculateQuote(body);
        } else if (operation === 'hotspots') {
            result = { hotspots: getHotspots(cleanText(body.region, 80) || undefined) };
        } else if (operation === 'allocation_score') {
            result = { candidates: allocation(body) };
        } else if (operation === 'gps_check') {
            result = gpsCheck(body);
        } else if (operation === 'pricing_optimize') {
            result = { pricing: await pricingOptimization(body) };
        } else {
            throw publicError('operation không được hỗ trợ');
        }
        await writeActivity(operation, role, result);
        return res.status(200).json({ success: true, autonomous: true, operation, result });
    } catch (error) {
        const status = Number(error?.status) || 500;
        return res.status(status).json({ success: false, autonomous: true, error: status >= 500 ? 'Autonomous core temporarily unavailable' : error.message });
    }
}
