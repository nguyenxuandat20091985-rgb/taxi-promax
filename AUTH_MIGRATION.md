# Firebase Authentication Migration

## Mục tiêu

Taxi ProMax hiện có cơ chế đăng nhập tự xử lý trong frontend và lưu `passwordHash` trong Realtime Database. Cơ chế này không đủ để bảo vệ Firebase Rules. File `database.rules.migration.json` là bản rules mẫu theo hướng deny-by-default; **chưa được tự động áp dụng** vì app cần chuyển sang Firebase Authentication trước.

## Thứ tự bắt buộc

| Bước | Việc thực hiện | Điều kiện hoàn tất |
|---|---|---|
| 1 | Bật Firebase Authentication và chọn Phone/Email provider | Có provider production và giới hạn domain |
| 2 | Tạo user auth cho tài xế/khách hàng | Mỗi user có Firebase Auth UID ổn định |
| 3 | Gắn `driverId`, `customerId` và `admin` custom claims qua backend Admin SDK | Token có claim đúng role |
| 4 | Migration dữ liệu cũ | Profile giữ reference `authUid`; không dùng passwordHash cũ cho login mới |
| 5 | Đổi frontend sang `signInWithPhoneNumber` hoặc email/password Firebase Auth | Không còn đọc toàn bộ `drivers`/`customers` để kiểm tra mật khẩu |
| 6 | Chuyển admin sang Auth + claim `admin` | Không còn `ADMIN_PHONE`, `ADMIN_PASS` trong HTML |
| 7 | Chạy test staging | Đăng nhập, đặt xe, nhận chuyến, chat, SOS, KYC và thanh toán đều pass |
| 8 | Backup rồi áp dụng Rules | Có rollback file rules và người trực xử lý sự cố |

## Cảnh báo

Không deploy `database.rules.migration.json` ngay khi chưa hoàn thành bước 1–6; app hiện tại sẽ mất quyền đọc/ghi vì các frontend chưa có Firebase Auth token. Cũng không nên cấp quyền `auth != null` rộng cho chat, SOS hoặc booking trong production nếu chưa bổ sung kiểm tra participant/owner theo từng node.

## Admin

Admin phải sử dụng Firebase Auth hoặc backend session có role `admin`. Những thao tác duyệt KYC, duyệt thanh toán, thay đổi trạng thái SOS và chỉnh sửa dữ liệu tài xế cần ghi audit log gồm `adminUid`, hành động, node/record, thời gian và kết quả.
