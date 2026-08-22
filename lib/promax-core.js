import { applyCors, rejectInvalidMethod, readJsonBody, cleanText, isSafeId } from '../lib/api-security.js';
import { queryKnowledge, getKnowledgeBaseMeta } from '../lib/knowledge-base.js';
import { smartDispatch, matchReturnTrips } from '../lib/dispatch-engine.js';
import { assessLocation } from '../lib/promax-location.js';

const BRAND = 'Trợ lý ProMax AI';
const MAX_BODY = 50000;

function response(res, status, payload) { return res.status(status).json({ brand: BRAND, ...payload }); }
function bounded(value, max) { return Array.isArray(value) ? value.slice(0, max) : []; }

export default async function handler(req, res) {
    applyCors(req, res, 'POST, OPTIONS');
    if (rejectInvalidMethod(req, res)) return;
    try {
        const body = readJsonBody(req);
        if (JSON.stringify(body).length > MAX_BODY) return response(res, 413, { success: false, error: 'Request quá lớn' });
        const operation = cleanText(body.operation, 40);
        if (operation === 'knowledge_query' || operation === 'assistant_query') {
            const query = cleanText(body.query || body.question || body.message, 1200);
            if (!query) return response(res, 400, { success: false, error: 'Thiếu query' });
            const matches = queryKnowledge(query, { category: cleanText(body.category, 40) || 'all', limit: body.limit || 5 });
            return response(res, 200, { success: true, autonomous: true, operation, result: { knowledgeBase: getKnowledgeBaseMeta(), matches } });
        }
        if (operation === 'smart_dispatch') {
            if (!body.pickup) return response(res, 400, { success: false, error: 'Thiếu pickup' });
            return response(res, 200, { success: true, autonomous: true, operation, result: smartDispatch({ pickup: body.pickup, drivers: bounded(body.drivers, 50), hotspotWeight: body.hotspotWeight, averageSpeedKph: body.averageSpeedKph }) });
        }
        if (operation === 'return_trip_match') {
            return response(res, 200, { success: true, autonomous: true, operation, result: { matches: matchReturnTrips({ completedTrip: body.completedTrip, candidateTrips: bounded(body.candidateTrips, 100), maxDetourKm: body.maxDetourKm, maxWaitMinutes: body.maxWaitMinutes }) } });
        }
        if (operation === 'location_assess') {
            return response(res, 200, { success: true, autonomous: true, operation, result: assessLocation(body) });
        }
        return response(res, 400, { success: false, error: 'operation không được hỗ trợ' });
    } catch (error) {
        return response(res, 500, { success: false, error: 'Promax core temporarily unavailable' });
    }
}
