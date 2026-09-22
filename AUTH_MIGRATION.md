# Firebase Authentication Migration — Taxi ProMax

**Cập nhật: 22/09/2026**  
**Mục tiêu:** Chuyển từ custom passwordHash + localStorage sang Firebase Authentication + Custom Claims để áp dụng Security Rules an toàn.

---

## CẢNH BÁO QUAN TRỌNG

**KHÔNG** deploy `database.rules.migration.json` khi chưa hoàn thành bước 1–6.  
Nếu deploy sớm, toàn bộ app sẽ mất quyền đọc/ghi vì frontend hiện tại không có Firebase Auth token.

Luôn backup rules hiện tại trước khi áp dụng rules mới.

---

## Thứ tự bắt buộc (8 bước)

| Bước | Việc | Điều kiện hoàn tất |
|------|------|--------------------|
| 1 | Bật Firebase Authentication (Phone + Email/Password) | Provider production, authorized domains |
| 2 | Tạo user Auth cho tài xế / khách hàng | Mỗi user có `auth.uid` ổn định |
| 3 | Gắn Custom Claims (`driverId`, `customerId`, `admin`) qua Admin SDK | Token chứa claim đúng role |
| 4 | Migration dữ liệu cũ | Profile giữ `authUid`, ngừng dùng passwordHash để login |
| 5 | Đổi frontend sang Firebase Auth | Không còn quét toàn bộ `drivers`/`customers` để check mật khẩu |
| 6 | Chuyển admin sang Auth + claim `admin` / session an toàn | Env `ADMIN_*` đã set; không hard-code credential |
| 7 | Test staging đầy đủ | Login, đặt xe, nhận chuyến, chat, SOS, KYC, thanh toán pass |
| 8 | Backup + áp dụng Rules | Có file rollback + người trực sự cố |

---

## Bước 1 — Bật Firebase Authentication

1. Firebase Console → Authentication → Sign-in method.
2. Bật **Phone** và **Email/Password**.
3. Authorized domains: `taxi-promax.vercel.app`, `localhost`.
4. (Khuyến nghị) App Check sau.

---

## Bước 2 & 3 — User + Custom Claims

Claims dùng trong Rules:

```js
auth.token.admin === true
auth.token.driverId === "DRV_XXXX"
auth.token.customerId === "KH_XXXX"
```

- API: `api/set-claims.js` (cần admin session + `FIREBASE_SERVICE_ACCOUNT_JSON`).
- Khi live: `npm install firebase-admin --save`.
- Hoặc chạy migration script (bước 4).

---

## Bước 4 — Migration dữ liệu cũ

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
export FIREBASE_DB_URL=https://taxipromax-new-default-rtdb.asia-southeast1.firebasedatabase.app
node scripts/migrate-auth-users.mjs --dry-run
node scripts/migrate-auth-users.mjs
```

---

## Bước 5 — Frontend Firebase Auth

1. Load Firebase Auth SDK (compat hoặc modular).
2. Dùng `js/auth-firebase-helper.js` → `window.PromaxAuth`.
3. Thay logic login hiện tại bằng `loginWithPhone` + `confirmOtp`.
4. Sau login: `getIdToken(true)` và gắn Authorization header nếu gọi API cần.

---

## Bước 6 — Admin an toàn

1. `api/admin-login.js` **đã không hard-code** credential.
2. Set env theo `docs/ENV_CHECKLIST.md`.
3. Tạo hash: `node scripts/hash-admin-password.mjs "matkhau"`.
4. Gắn claim `{ admin: true }` cho user admin (set-claims hoặc Console).
5. Ghi audit: `js/audit-log-helper.js` → `PromaxAudit.write(...)`.

---

## Bước 7 — Test staging (checklist)

- [ ] Đăng ký / đăng nhập tài xế (Phone Auth)
- [ ] Đăng ký / đăng nhập khách
- [ ] Đặt xe → tài xế nhận
- [ ] Chat 2 chiều
- [ ] SOS + admin xem được
- [ ] KYC + admin duyệt
- [ ] Thanh toán gói
- [ ] Xe ghép
- [ ] Rules: user A không đọc profile/chat/SOS của user B

---

## Bước 8 — Deploy Rules

1. Backup rules hiện tại.
2. Publish nội dung `database.rules.migration.json`.
3. Theo dõi lỗi 1–2 giờ.
4. Giữ file rollback.

---

## Cải tiến Rules

| Hạng mục | Trước | Sau |
|----------|-------|-----|
| Chat | Mở rộng | Chỉ participant + admin |
| SOS / Emergencies | Rộng | Owner + admin |
| passwordHash | Owner đọc được | Chỉ admin đọc |
| audit_logs | Không | Có (admin only) |
| Default | Mở | Deny-by-default |

---

*Cập nhật lần cuối: 22/09/2026 — gói P0+P1 hoàn tất trên branch feat/auth-migration-rules*
