# PayOS — Khép vòng kích hoạt gói (Gói A)

## Vấn đề
Firebase RTDB đang **Permission denied** khi server ghi:
- `payment_pending`
- `drivers/{uid}` (tp_expiry)

→ Webhook không tự cộng ngày; `pendingOk: false`.

## Cách làm (chọn 1 trong 2)

### Cách 1 — Khuyến nghị: Database Secret (không nới rules)

1. Firebase Console → Project **taxipromax-new**  
   **Project settings** → **Service accounts** → tab **Database secrets** (legacy)  
   → Copy secret (hoặc tạo mới).

2. Vercel → Project **taxi-promax** → **Settings** → **Environment Variables**  
   Thêm:
   ```
   FIREBASE_DATABASE_SECRET = <secret vừa copy>
   ```
   Target: Production + Preview → **Save** → **Redeploy** production.

3. PayOS Dashboard → Webhook URL:
   ```
   https://taxi-promax.vercel.app/api/webhook
   ```

4. Test:
   ```bash
   curl -X POST https://taxi-promax.vercel.app/api/create-payment \
     -H 'Content-Type: application/json' \
     -d '{"amount":5000,"plan":"LẺ","driverUid":"DRV_xxx"}'
   ```
   Kỳ vọng: `"pendingOk": true`, `"hasSecret": true`.

### Cách 2 — Nới rules chỉ 2 node thanh toán

File mẫu: `database.rules.payos.json`  
Trong Firebase Console → Realtime Database → **Rules**:
- Merge 2 block `payment_pending` + `payment_logs` vào rules hiện tại.
- **Publish**.

Vẫn nên có Database Secret để webhook ghi được `drivers/{uid}.tp_expiry`.

## Luồng sau khi cấu hình

1. App → NẠP NGAY → PayOS QR  
2. Thanh toán thành công  
3. Webhook **hoặc** client returnUrl → cập nhật `tp_expiry` + `active_plan`  
4. Ví tiền hiện còn hạn gói  

## Kiểm tra nhanh

| Kiểm tra | OK khi |
|----------|--------|
| `POST /api/create-payment` | `pendingOk: true` |
| `POST /api/webhook` body `{"description":"Confirm Webhook"}` | `hasSecret: true` |
| Sau nạp thật | `drivers/{uid}.tp_expiry` tăng |

## Client fallback

`17-unify.js` khi `?status=success&uid=&plan=` vẫn cố kích hoạt từ trình duyệt (nếu rules cho phép user ghi driver của mình).
