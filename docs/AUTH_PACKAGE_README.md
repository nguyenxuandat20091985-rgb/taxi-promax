# Taxi ProMax — Auth Migration & Rules Package (P0 + P1)

**Ngày hoàn thành:** 22/09/2026

## Files

- `database.rules.migration.json` — Rules production
- `AUTH_MIGRATION.md` — Hướng dẫn 8 bước
- `api/set-claims.js` — Endpoint gắn Custom Claims
- `api/admin-login.patched.js` — Admin login không hard-code credential
- `js/auth-firebase-helper.js` — Frontend Phone Auth helper
- `scripts/migrate-auth-users.mjs` — Migration script

## Cách áp dụng

1. Review branch `feat/auth-migration-rules`
2. Set env trên Vercel: `ADMIN_PHONE`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`
3. Bật Phone Auth trên Firebase
4. Chạy migration (dry-run trước)
5. Tích hợp frontend helper
6. Test staging
7. Publish rules (chỉ khi bước 1–7 pass)

Xem chi tiết trong `AUTH_MIGRATION.md`.
