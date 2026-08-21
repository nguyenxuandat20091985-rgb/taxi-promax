import assert from 'node:assert/strict';
import { runDiagnostic } from '../api/system-diagnostic.js';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
process.env.GITHUB_REPOSITORY = 'example/taxi-promax';
process.env.GITHUB_BRANCH = 'main';
process.env.DIAGNOSTIC_FILES = 'api/admin-login.js';
delete process.env.GROQ_API_KEY;

globalThis.fetch = async (url) => {
    const target = String(url);
    if (target.includes('raw.githubusercontent.com')) {
        return { ok: true, status: 200, text: async () => "export default function handler(req,res){ res.setHeader('Access-Control-Allow-Origin','*'); }" };
    }
    if (target.includes('/system_logs.json')) {
        return { ok: true, status: 200, json: async () => ({ a: { level: 'error', message: 'timeout' } }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
};

const report = await runDiagnostic();
assert.equal(report.overallStatus, 'warning');
assert.ok(Array.isArray(report.findings));
assert.ok(Array.isArray(report.repairPlan));
assert.ok(report.logs.some(item => item.node === 'system_logs'));
assert.ok(report.source.filesScanned.includes('api/admin-login.js'));

for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
}
for (const [key, value] of Object.entries(originalEnv)) process.env[key] = value;
globalThis.fetch = originalFetch;
console.log('diagnostic contract test: OK');
