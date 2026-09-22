# Báo cáo PayOS — Bước 1→4

**Ngày:** 22/09/2026  
**Branch:** `fix/payos-flow`

---

## Bước 1 — Env Vercel

| Biến | Có trên project `taxi-promax-28br` | Target |
|------|-------------------------------------|--------|
| `PAYOS_CLIENT_ID` | ✅ | production + preview |
| `PAYOS_API_KEY` | ✅ | production + preview |
| `PAYOS_CHECKSUM_KEY` | ✅ | production + preview |

**Kết quả bước 1: PASS** (key đã set; không đọc giá trị secret).

---

## Bước 2 — Luồng create → webhook → tp_expiry

### Trước khi sửa (lỗi)

1. Client gửi `plan` không thống nhất (`plan.name` khi plan là string → `undefined`).
2. `create-payment` default plan `'PRO'` khi thiếu — dễ sai gói.
3. Description PayOS không mang uid/plan; phụ thuộc `payment_pending` (đúng hướng) nhưng plan có thể undefined.
4. Callback `?status=success` không có plan/uid — UI chỉ reload (OK nếu webhook đã chạy).

### Sau khi sửa

1. `api/create-payment.js`: normalize plan key, bắt buộc `driverUid`, validate amount, lưu `payment_pending/{orderCode}`.
2. `api/webhook.js`: alias plan, đọc pending → `drivers/{uid}.tp_expiry` + `active_plan`, idempotent `payment_logs`.
3. Client 11 + 13: luôn gửi `plan` dạng string key (`LẺ` / `PRO` / `PROMAX`).

**Kết quả bước 2: PASS (code)** — cần test live 1 giao dịch thật sau merge.

---

## Bước 3 — Chống trùng + khớp tên gói

| Gói trên UI (`index.html`) | Key | Ngày (webhook) |
|----------------------------|-----|----------------|
| TRẢI NGHIỆM 0đ | `TRIAL 7D` | 7 (không qua PayOS) |
| CHUYẾN LẺ 5.000đ | `LẺ` | 1 |
| GÓI PRO 49.000đ | `PRO` | 30 |
| PRO MAX 129.000đ | `PROMAX` | 90 |

Idempotent: `payment_logs/{orderCode}` — webhook trùng trả 200, không cộng ngày lần 2.

**Kết quả bước 3: PASS**

---

## Bước 4 — Báo cáo tổng

| Bước | Status |
|------|--------|
| 1 Env | ✅ PASS |
| 2 Flow code | ✅ PASS (chờ test live) |
| 3 Plan + idempotent | ✅ PASS |
| 4 Báo cáo | ✅ PASS |

### Việc anh làm sau merge

1. Merge `fix/payos-flow` → `main`.
2. Trong PayOS Dashboard: webhook URL = `https://taxi-promax.vercel.app/api/webhook`.
3. Test 1 lần nạp gói LẺ / PRO nhỏ.
4. Kiểm tra Firebase: `drivers/{uid}.tp_expiry`, `payment_logs/{orderCode}`.

### Không đụng UI

Chỉ sửa logic JS/API — không đổi layout HTML/CSS.
