/**
 * Placeholder removed from active deploy path.
 * Full implementation: scripts/set-claims.template.js
 * See AUTH_MIGRATION.md
 */
export default async function handler(req, res) {
  res.status(404).json({ success: false, error: 'Not enabled. See AUTH_MIGRATION.md' });
}
