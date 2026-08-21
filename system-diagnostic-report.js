import { applyCors, rejectInvalidMethod, readJsonBody, cleanText, verifyAdminSession } from '../lib/api-security.js';
import { runDiagnostic } from './system-diagnostic.js';

function repoName() {
    return cleanText(process.env.GITHUB_REPOSITORY || 'nguyenxuandat20091985-rgb/taxi-promax', 180).replace(/[^A-Za-z0-9_.\/-]/g, '');
}

function toMarkdown(diagnostic) {
    const lines = [
        '# Taxi ProMax — AI System Diagnostic Report', '',
        `Generated at: ${diagnostic.generatedAt || new Date().toISOString()}`, '',
        `## System status: ${(diagnostic.overallStatus || 'warning').toUpperCase()}`, '',
        diagnostic.summary || 'No summary available.', '',
        `**Confidence:** ${diagnostic.confidence || 'deterministic-static-check'}`, '',
        '## Findings', ''
    ];
    for (const item of diagnostic.findings || []) {
        lines.push(`### [${String(item.severity || 'medium').toUpperCase()}] ${item.title || item.id || 'Finding'}`);
        lines.push(`- **ID:** ${item.id || 'n/a'}`);
        lines.push(`- **Evidence:** ${item.evidence || 'n/a'}`);
        lines.push(`- **Files:** ${(item.files || []).join(', ') || 'n/a'}`);
        if (item.impact) lines.push(`- **Impact:** ${item.impact}`);
        lines.push(`- **Recommendation:** ${item.recommendation || 'Review manually.'}`, '');
    }
    lines.push('## Maintenance & Repair Plan', '');
    for (const step of diagnostic.repairPlan || []) {
        lines.push(`${step.step || 0}. **[${String(step.priority || 'medium').toUpperCase()}]** ${step.action || 'Review manually.'}`);
        lines.push(`   - Owner: ${step.owner || 'unassigned'}`);
        lines.push(`   - Files: ${(step.files || []).join(', ') || 'n/a'}`);
        lines.push(`   - Acceptance criteria: ${step.acceptanceCriteria || 'Diagnostic passes after remediation.'}`);
    }
    lines.push('', '## Scan metadata', '', `- Repository: ${diagnostic.source?.repository || 'n/a'}`, `- Branch: ${diagnostic.source?.branch || 'main'}`, `- Files scanned: ${(diagnostic.source?.filesScanned || []).join(', ') || 'n/a'}`);
    lines.push('', '> This report is AI-assisted. It proposes changes only; production changes require human review and approval.');
    return lines.join('\n') + '\n';
}

async function commitReport(markdown) {
    const token = cleanText(process.env.GITHUB_TOKEN, 500);
    const branch = cleanText(process.env.GITHUB_BRANCH || 'main', 80);
    if (!token || process.env.ALLOW_DIAGNOSTIC_COMMIT !== 'true') throw new Error('Diagnostic report commit is disabled or not configured');
    const repo = repoName();
    const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
    const url = `https://api.github.com/repos/${repo}/contents/UPGRADE_REPORT.md?ref=${encodeURIComponent(branch)}`;
    const existing = await fetch(url, { headers, signal: AbortSignal.timeout(7000) });
    if (!existing.ok) throw new Error(`github_read_${existing.status}`);
    const file = await existing.json();
    const update = await fetch(`https://api.github.com/repos/${repo}/contents/UPGRADE_REPORT.md`, {
        method: 'PUT', headers, signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ message: `chore: update AI system diagnostic report`, content: Buffer.from(markdown, 'utf8').toString('base64'), sha: file.sha, branch })
    });
    if (!update.ok) throw new Error(`github_write_${update.status}`);
    const result = await update.json();
    return { committed: true, commitSha: result.commit?.sha || null, branch, repository: repo };
}

export default async function handler(req, res) {
    applyCors(req, res, 'POST, OPTIONS');
    if (rejectInvalidMethod(req, res, 'POST')) return;
    if (!verifyAdminSession(req)) return res.status(401).json({ success: false, error: 'Admin session required' });
    try {
        const body = readJsonBody(req);
        const diagnostic = await runDiagnostic();
        const markdown = toMarkdown(diagnostic);
        if (body.commit === true) {
            const commit = await commitReport(markdown);
            return res.status(200).json({ success: true, markdown, commit });
        }
        return res.status(200).json({ success: true, markdown, commit: { committed: false, reason: 'preview_only' } });
    } catch (error) {
        console.error('[system-diagnostic-report]', error);
        return res.status(500).json({ success: false, error: error.message === 'Diagnostic report commit is disabled or not configured' ? error.message : 'Report service unavailable' });
    }
}
