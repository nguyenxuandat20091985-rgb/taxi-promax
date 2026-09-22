# Biến môi trường Vercel — Auth / Admin (P0+P1)

## Bắt buộc trước khi dùng admin-login an toàn

| Biến | Mô tả | Ví dụ |
|------|--------|--------|
| `ADMIN_PHONE` | SĐT admin (đúng chuỗi client gửi) | `0388724966` |
| `ADMIN_PASSWORD_HASH` | SHA-256 hex của mật khẩu | chạy `node scripts/hash-admin-password.mjs "..."` |
| `ADMIN_SESSION_SECRET` | Secret ký token session (≥ 32 ký tự) | chuỗi ngẫu nhiên dài |

## Khi bật Custom Claims API

| Biến | Mô tả |
|------|--------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Toàn bộ JSON service account (1 dòng hoặc JSON) |

Và cài package:

```bash
npm install firebase-admin --save
```

## Migration script (local)

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
export FIREBASE_DB_URL=https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app
node scripts/migrate-auth-users.mjs --dry-run
```

## Lưu ý

- Sau khi set `ADMIN_*`, **admin login cũ (hard-code) sẽ không còn fallback**.
- Không commit file service-account.json lên Git.
- Không publish Rules trước khi frontend dùng Firebase Auth.
