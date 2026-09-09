# TAXI PROMAX — PRODUCTION REBUILD PLAN

## 1. Mục tiêu chốt

ProMax là nền tảng phần mềm kết nối theo mô hình SaaS. Nền tảng không thu tiền cước chuyến, không lấy commission và không giữ tiền cước của hành khách. Nguồn doanh thu của ProMax là thuê bao phần mềm của tài xế.

Business invariants:

- `COMMISSION_RATE = 0`
- `RIDE_COMMISSION = 0`
- `PLATFORM_RIDE_FEE = 0`
- `REVENUE_SOURCE = DRIVER_SUBSCRIPTION`
- Tiền cước chuyến được thanh toán trực tiếp cho tài xế theo phương thức được phép.

## 2. Kiến trúc đích

```text
DRIVER APP ─┐
CUSTOMER APP ├── PROMAX API / REALTIME ── DATABASE
ADMIN APP ───┘             │
                           ├── AUTH
                           ├── RIDE CONTRACT
                           ├── MATCHING
                           ├── GPS / OFFLINE SYNC
                           ├── FARE CONFIG
                           ├── SUBSCRIPTION
                           ├── NOTIFICATION
                           └── AUDIT / ANALYTICS
```

Một `ride_id` duy nhất phải đại diện cho cùng một chuyến trên app khách, app tài xế và admin. Không duy trì hai state machine độc lập.

## 3. Bốn luồng vận hành

### A. Street hail — vẫy xe
`STREET_HAIL → DRIVER_ACCEPTS → ARRIVED → PASSENGER_ONBOARD → IN_PROGRESS → COMPLETED`

GPS là nguồn quãng đường. Offline queue phải bảo toàn event khi mất Internet.

### B. App booking có điểm đến
`CUSTOMER_REQUESTED → MATCHED → ACCEPTED → DRIVER_EN_ROUTE → ARRIVED → PASSENGER_ONBOARD → IN_PROGRESS → COMPLETED`

Khách nhập điểm đến → geocode → route estimate → fare estimate → xác nhận → gửi đơn.

### C. App booking chưa có điểm đến
Tài xế nhận đơn → đến điểm đón → khách lên xe → khách cung cấp điểm đến → bắt đầu tính cước → hoàn thành.

### D. Shared ride — xe ghép
Tài xế đăng chuyến → khách tìm → giữ ghế → xác nhận → theo dõi → hoàn thành. Shared ride phải có `ride_id`, còn booking ghế là bản ghi con, không phải một hệ thống chuyến độc lập.

## 4. Fare architecture

Fare configuration nằm ở server/backend. Frontend chỉ hiển thị và sử dụng cấu hình được cấp. Không thêm `BASE_RATE`, `SURGE_RATE` hoặc mức giá nghiệp vụ mới trực tiếp trong HTML/JS.

Cước dự kiến (`estimate`) và cước cuối (`final`) là hai khái niệm riêng. Cước cuối chỉ được chốt từ dữ liệu chuyến hợp lệ và cấu hình phiên bản tại thời điểm chuyến bắt đầu.

## 5. Subscription

Mỗi thuê bao phải có:

- `plan_id`
- `driver_id`
- `start_at`
- `expire_at`
- `status`
- `auto_renew`
- `grace_period`
- `payment_transaction_id`

Hết hạn: không cho ONLINE và không nhận đơn mới. Không xóa/khóa lịch sử, hóa đơn, thống kê hoặc dữ liệu đã phát sinh.

Gói cần hỗ trợ: ngày, tháng, năm. Các gói hiện tại 1/3/12 tháng được giữ tương thích.

## 6. Thanh toán

Thanh toán thuê bao phải có idempotency: cùng một mã giao dịch/webhook không được gia hạn hai lần. Client không được tự đặt `paid=true`; trạng thái thanh toán chỉ được xác nhận ở backend sau khi xác thực nguồn thanh toán.

Tiền cước chuyến không đi qua ví nền tảng trong mô hình SaaS này.

## 7. GPS / offline

Một pipeline GPS duy nhất:

`RAW → QUALITY → KALMAN → ANTI_TELEPORT → VALID_POSITION → TRACK → FARE`

Khi mất mạng:

`NETWORK_LOST → OFFLINE → LOCAL_EVENT_QUEUE → RECONNECT → ORDERED_SYNC → SERVER_RECONCILE`

Không mở watcher/odometer thứ hai. Không cộng kilomet hai lần.

## 8. AI

AI chỉ là lớp hỗ trợ quyết định, không phải nguồn sự thật tài chính hoặc trạng thái chuyến. AI có thể hỗ trợ:

- matching/ranking tài xế
- dự báo nhu cầu
- hỗ trợ khách hàng
- phát hiện tín hiệu gian lận
- gợi ý vận hành

AI không được tự ý:

- thay đổi giá cước
- xác nhận thanh toán
- thay đổi trạng thái chuyến vượt quyền
- mở/đóng thuê bao
- quyết định vấn đề pháp lý

## 9. Security / data

Firebase rules hiện tại còn các vùng quá rộng (đặc biệt chat, ratings, shared rides/bookings). Phải chuyển sang quyền theo participant/owner/admin và kiểm tra cả `data` + `newData` cho các chuyển trạng thái nhạy cảm.

CCCD, bằng lái, selfie và dữ liệu liên hệ phải được hạn chế quyền truy cập. Không dùng dữ liệu do client tự sửa làm quyền admin/driver/customer.

## 10. Pháp lý / thuế — launch gate

Mã nguồn phải thể hiện rõ vai trò nền tảng phần mềm và tách doanh thu thuê bao khỏi tiền cước vận tải. Tuy nhiên đây không thay thế tư vấn pháp lý/kế toán.

Trước khi mở rộng địa bàn cần xác nhận riêng:

- tư cách pháp lý của đơn vị vận hành nền tảng;
- nghĩa vụ thuế của ProMax đối với doanh thu thuê bao;
- nghĩa vụ thuế/hoá đơn của tài xế hoặc đơn vị vận tải;
- quy định về vận tải, giá cước, hợp đồng điện tử và dữ liệu cá nhân tại địa bàn triển khai;
- nội dung hiển thị trên app để không quảng cáo sai vai trò của nền tảng.

## 11. Launch gates

Không tuyên bố production-ready chỉ vì unit/contract tests pass. Phải đạt cả:

1. Build sạch và CI xanh.
2. Contract tests cho 4 luồng.
3. Payment webhook idempotent.
4. Subscription ngày/tháng/năm được test cả gia hạn, hết hạn, grace và duplicate webhook.
5. GPS offline/reconnect test trên thiết bị thật.
6. RLS/rules security review.
7. Kiểm thử app khách + tài xế đồng bộ cùng `ride_id`.
8. Shared ride concurrency test: không bán quá số ghế.
9. Admin audit log cho thao tác tài chính/quyền.
10. Kiểm tra pháp lý/thuế trước khi mở bán thực tế.

## 12. Thứ tự thực hiện

**P0 — Không được bỏ:** canonical Ride Contract + state machine + server fare config + subscription ledger + payment idempotency + security rules.

**P1:** GPS offline/reconcile + shared ride concurrency + matching/dispatch.

**P2:** FCM/push + AI operational layer + analytics.

**P3:** device field test + CH Play production release + multi-city hardening.
