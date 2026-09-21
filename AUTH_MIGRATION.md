# Firebase Authentication Migration — Taxi ProMax

**Cập nhật: 22/09/2026**  
**Mục tiêu:** Chuyển từ custom passwordHash + localStorage sang Firebase Authentication + Custom Claims để có thể áp dụng Security Rules an toàn.

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
| 6 | Chuyển admin sang Auth + claim `admin` | Không còn hard-code ADMIN_PHONE / password trong HTML hoặc API default |
| 7 | Test staging đầy đủ | Login, đặt xe, nhận chuyến, chat, SOS, KYC, thanh toán pass |
| 8 | Backup + áp dụng Rules | Có file rollback + người trực sự cố |

---

## Bước 1 — Bật Firebase Authentication

1. Vào Firebase Console → Authentication → Sign-in method.
2. Bật **Phone** và **Email/Password**.
3. Thêm authorized domains: `taxi-promax.vercel.app`, `localhost`.
4. (Khuyến nghị) Bật App Check sau này.

---

## Bước 2 & 3 — Tạo user + Custom Claims

Custom Claims dùng trong Rules:

```js
auth.token.admin === true
auth.token.driverId === "DRV_XXXX"
auth.token.customerId === "KH_XXXX"
```

### Helper backend (Vercel / Node)

Tạo file `api/set-claims.js` (chỉ admin gọi được) — đã có trong gói này.

**Lưu ý:** Cần set biến môi trường `FIREBASE_SERVICE_ACCOUNT_JSON` (toàn bộ service account JSON) trên Vercel.

---

## Bước 4 — Migration dữ liệu cũ

Dùng script `scripts/migrate-auth-users.mjs` (có chế độ `--dry-run`).

---

## Bước 5 — Frontend chuyển sang Firebase Auth

Dùng module `js/auth-firebase-helper.js` đã cung cấp.

---

## Bước 6 — Admin

- Dùng `api/admin-login.patched.js` (đã loại bỏ hard-code credential).
- Set claim `{ admin: true }` cho user admin.
- Mọi thao tác admin phải ghi `audit_logs`.

---

## Bước 7 — Test staging

Checklist tối thiểu:

- [ ] Đăng ký / đăng nhập tài xế (Phone Auth)
- [ ] Đăng ký / đăng nhập khách
- [ ] Đặt xe → tài xế nhận (transaction chống trùng)
- [ ] Chat 2 chiều
- [ ] SOS (tài xế + khách) + admin xem được
- [ ] KYC upload + admin duyệt
- [ ] Thanh toán gói + admin duyệt
- [ ] Xe ghép đăng chuyến + đặt ghế
- [ ] Rules: user A không đọc được profile / chat / SOS của user B

---

## Bước 8 — Deploy Rules

1. Backup rules hiện tại (export từ Firebase Console).
2. Copy nội dung `database.rules.migration.json` vào Firebase Console → Realtime Database → Rules.
3. Publish.
4. Theo dõi log lỗi 1–2 giờ đầu.
5. Có file rollback sẵn.

---

## Cải tiến so với bản rules cũ

| Hạng mục | Trước | Sau (file mới) |
|----------|-------|----------------|
| Chat | `auth != null` (ai cũng đọc) | Chỉ participant của order/booking |
| SOS / Emergencies | Admin only read, write rộng | Owner + admin |
| passwordHash | Đọc được bởi owner | Chỉ admin đọc |
| Validation | Ít | Thêm hasChildren + type check |
| audit_logs | Không có | Node riêng cho admin |
| trips | Không có | Owner + admin |

---

*Tài liệu này thay thế bản AUTH_MIGRATION.md cũ. Cập nhật lần cuối: 22/09/2026*
