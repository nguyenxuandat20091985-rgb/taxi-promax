import { applyCors, rejectInvalidMethod, readJsonBody, cleanText, verifyAdminSession } from '../lib/api-security.js';

const DEFAULT_FIREBASE_URL = 'https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app';
const DEFAULT_REPOSITORY = 'nguyenxuandat20091985-rgb/taxi-promax';
const DEFAULT_FILES = [
    'api/admin-ai.js', 'api/admin-login.js', 'api/ai-assistant.js', 'api/create-payment.js',
    'api/support-ai.js', 'api/system-diagnostic.js', 'api/webhook.js', 'lib/api-security.js',
    'index.html', 'khachhang.html', 'admin.html', 'vercel.json', 'package.json'
];
const MAX_LOGS = 100;
const MAX_SOURCE_FILES = 14;
const MAX_SOURCE_CHARS = 18000;

function firebaseUrl() {
    return String(process.env.FIREBASE_DATABASE_URL || DEFAULT_FIREBASE_URL).replace(/\/$/, '');
}

function repository() {
    return cleanText(process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY, 180).replace(/[^A-Za-z0-9_.\/-]/g, '');
}

function sourceFiles() {
    const configured = String(process.env.DIAGNOSTIC_FILES || '').split(',').map(v => v.trim()).filter(Boolean);
    return (configured.length ? configured : DEFAULT_FILES).slice(0, MAX_SOURCE_FILES);
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    return response.json();
}

function redact(value) {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return cleanText(String(value), 240).replace(/\b\d{9,16}\b/g, '[REDACTED_ID]');
    if (Array.isArray(value)) return value.slice(-20).map(redact);
    const result = {};
    for (const [key, item] of Object.entries(value)) {
        if (/password|hash|token|secret|api.?key|cccd|cmnd|phone|audio|selfie|license|biometric/i.test(key)) continue;
        result[key] = redact(item);
    }
    return result;
}

function summarizeLogs(raw, node) {
    const entries = raw && typeof raw === 'object' ? Object.entries(raw) : [];
    const recent = entries.slice(-MAX_LOGS).map(([id, value]) => ({
        id: cleanText(id, 120),
        ...((value && typeof value === 'object') ? redact(value) : { value: redact(value) })
    }));
    const errorCount = recent.filter(item => /error|fail|fatal|exception|critical/i.test(JSON.stringify(item))).length;
    return { node, available: entries.length > 0, total: entries.length, errorCount, recent };
}

function staticFindings(sourceMap) {
    const findings = [];
    const add = (id, severity, title, evidence, files, recommendation) => findings.push({ id, severity, title, evidence, files, recommendation });
    for (const [file, content] of Object.entries(sourceMap)) {
        if (/Access-Control-Allow-Origin['"]?\s*,?\s*['"]\*['"]/.test(content)) {
            add('SEC-CORS-WILDCARD', 'high', 'CORS wildcard detected', 'Access-Control-Allow-Origin is set to *', [file], 'Use an allowlist from ALLOWED_ORIGINS and keep credentials disabled for wildcard origins.');
        }
        if (/innerHTML\s*=|insertAdjacentHTML/.test(content) && /chat|message|question|phone|pickup|dropoff|audio|image/i.test(content)) {
            add('UI-UNSAFE-DOM', 'medium', 'Potential unsafe HTML sink', 'Dynamic data is rendered through innerHTML/insertAdjacentHTML', [file], 'Prefer textContent or an escaping/sanitizing renderer for Firebase and user-provided values.');
        }
        if (/passwordHash|hashPassword/.test(content) && /localStorage|Firebase|localStorage/i.test(content)) {
            add('AUTH-CLIENT-HASH', 'high', 'Client-managed password hash detected', 'Password hash/auth state appears in browser or client database code', [file], 'Migrate to Firebase Authentication or a server-side identity provider and revoke legacy sessions.');
        }
        if (/fetch\([^)]*firebase|firebase.*\.json|FIREBASE_URL/.test(content) && /\.set\(|\.update\(|\.remove\(|PATCH|PUT|DELETE/.test(content)) {
            add('DATA-DIRECT-WRITE', 'high', 'Client or API performs direct database writes', 'Firebase writes are performed without visible server authorization in the scanned file', [file], 'Enforce Firebase Auth custom claims/Rules and move privileged mutations behind authorized APIs.');
        }
    }
    if (!sourceMap['api/admin-login.js']) add('ADMIN-ENDPOINT-MISSING', 'critical', 'Admin login endpoint is missing from source manifest', 'admin.html expects /api/admin-login but the endpoint was not fetched', ['admin.html', 'api/admin-login.js'], 'Restore the endpoint and add an HTTP smoke test for 401/200/expired session paths.');
    return findings.slice(0, 40);
}

async function loadSources() {
    const repo = repository();
    const branch = cleanText(process.env.GITHUB_BRANCH || 'main', 80);
    const entries = await Promise.all(sourceFiles().map(async file => {
        const safe = file.replace(/^\/+/, '').replace(/\.\.+/g, '');
        const url = `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/${safe.split('/').map(encodeURIComponent).join('/')}`;
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
            if (!response.ok) return [safe, ''];
            return [safe, (await response.text()).slice(0, MAX_SOURCE_CHARS)];
        } catch (_) { return [safe, '']; }
    }));
    return Object.fromEntries(entries.filter(([, content]) => content));
}

async function loadLogs() {
    const nodes = ['system_logs', 'error_logs', 'payment_logs', 'sos'];
    const results = await Promise.all(nodes.map(async node => {
        try {
            const raw = await fetchJson(`${firebaseUrl()}/${node}.json?limitToLast=${MAX_LOGS}`);
            return summarizeLogs(raw, node);
        } catch (error) {
            return { node, available: false, total: 0, errorCount: 0, recent: [], error: error.message };
        }
    }));
    return results;
}

function fallbackReport(findings, logs) {
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const logErrors = logs.reduce((sum, item) => sum + item.errorCount, 0);
    return {
        overallStatus: critical || high || logErrors ? 'warning' : 'healthy',
        summary: critical ? 'Phát hiện vấn đề nghiêm trọng cần xử lý ngay.' : (high || logErrors ? 'Hệ thống có cảnh báo cần theo dõi.' : 'Chưa phát hiện cảnh báo từ phạm vi quét hiện tại.'),
        findings,
        repairPlan: findings.slice(0, 12).map((item, index) => ({
            step: index + 1, priority: item.severity, owner: item.id.startsWith('UI-') ? 'frontend' : 'backend/security',
            files: item.files, action: item.recommendation, acceptanceCriteria: `Không còn bằng chứng ${item.id} trong lần quét kế tiếp.`
        })),
        confidence: 'deterministic-static-check',
        generatedAt: new Date().toISOString()
    };
}

function parseAiJson(text, fallback) {
    try {
        const match = String(text || '').match(/\{[\s\S]*\}/);
        if (!match) return fallback;
        const parsed = JSON.parse(match[0]);
        return {
            overallStatus: parsed.overallStatus === 'healthy' ? 'healthy' : 'warning',
            summary: cleanText(parsed.summary, 800) || fallback.summary,
            findings: Array.isArray(parsed.findings) ? parsed.findings.slice(0, 40).map(item => ({
                id: cleanText(item.id, 80), severity: ['critical', 'high', 'medium', 'low'].includes(item.severity) ? item.severity : 'medium',
                title: cleanText(item.title, 180), evidence: cleanText(item.evidence, 500), files: Array.isArray(item.files) ? item.files.slice(0, 8).map(v => cleanText(v, 160)) : [],
                impact: cleanText(item.impact, 500), recommendation: cleanText(item.recommendation, 800)
            })) : fallback.findings,
            repairPlan: Array.isArray(parsed.repairPlan) ? parsed.repairPlan.slice(0, 20).map((item, i) => ({
                step: Number(item.step) || i + 1, priority: ['critical', 'high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
                owner: cleanText(item.owner, 80), files: Array.isArray(item.files) ? item.files.slice(0, 8).map(v => cleanText(v, 160)) : [],
                action: cleanText(item.action, 800), acceptanceCriteria: cleanText(item.acceptanceCriteria, 500)
            })) : fallback.repairPlan,
            confidence: cleanText(parsed.confidence, 80) || 'ai-assisted-static-check', generatedAt: new Date().toISOString()
        };
    } catch (_) { return fallback; }
}

async function runAiAnalysis(findings, logs) {
    const fallback = fallbackReport(findings, logs);
    const key = cleanText(process.env.GROQ_API_KEY, 300);
    if (!key) return fallback;
    const prompt = {
        role: 'system-auditor',
        rules: ['Return JSON only.', 'Do not invent file evidence.', 'Never propose autonomous production changes.', 'Prioritize security, payments, GPS, API reliability and data privacy.'],
        deterministicFindings: findings,
        logSummary: logs
    };
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST', signal: AbortSignal.timeout(12000),
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify({ model: process.env.DIAGNOSTIC_MODEL || 'llama-3.3-70b-versatile', temperature: 0.1, max_tokens: 2400,
                messages: [{ role: 'system', content: 'Bạn là Senior Full-stack Code Reviewer. Hãy trả Maintenance & Repair Plan dạng JSON đúng schema: {overallStatus,summary,findings:[{id,severity,title,evidence,files,impact,recommendation}],repairPlan:[{step,priority,owner,files,action,acceptanceCriteria}],confidence}. Chỉ dùng bằng chứng được cung cấp.' }, { role: 'user', content: JSON.stringify(prompt) }] })
        });
        if (!response.ok) return fallback;
        const data = await response.json();
        return parseAiJson(data?.choices?.[0]?.message?.content, fallback);
    } catch (_) { return fallback; }
}

export async function runDiagnostic() {
    const [sourceMap, logs] = await Promise.all([loadSources(), loadLogs()]);
    const findings = staticFindings(sourceMap);
    const report = await runAiAnalysis(findings, logs);
    return { ...report, source: { repository: repository(), branch: cleanText(process.env.GITHUB_BRANCH || 'main', 80), filesScanned: Object.keys(sourceMap), scanLimit: MAX_SOURCE_CHARS }, logs: logs.map(({ recent, ...item }) => item), generatedAt: new Date().toISOString() };
}

export default async function handler(req, res) {
    applyCors(req, res, 'GET, POST, OPTIONS');
    if (rejectInvalidMethod(req, res, 'GET')) return;
    if (!verifyAdminSession(req)) return res.status(401).json({ success: false, error: 'Admin session required' });
    try {
        const diagnostic = await runDiagnostic();
        return res.status(200).json({ success: true, diagnostic });
    } catch (error) {
        console.error('[system-diagnostic]', error);
        return res.status(500).json({ success: false, error: 'Diagnostic service unavailable' });
    }
}
