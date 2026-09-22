# Gói Auth Migration + Security Rules (P0+P1)

Branch: `feat/auth-migration-rules`  
PR: https://github.com/nguyenxuandat20091985-rgb/taxi-promax/pull/2

## Nội dung

1. **Rules** — `database.rules.migration.json`
2. **Hướng dẫn 8 bước** — `AUTH_MIGRATION.md`
3. **Admin login an toàn** — `api/admin-login.js`
4. **Custom Claims API** — `api/set-claims.js`
5. **Frontend helpers** — `js/auth-firebase-helper.js`, `js/audit-log-helper.js`
6. **Scripts** — migrate users, hash password
7. **Env** — `docs/ENV_CHECKLIST.md`

## Áp dụng nhanh

1. Merge PR khi review xong.
2. Set `ADMIN_PHONE`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`.
3. Làm tuần tự `AUTH_MIGRATION.md`.
4. Chỉ publish Rules ở bước 8.

## Cảnh báo

Publish Rules quá sớm → app mất quyền đọc/ghi.
