# TAXI PROMAX ROADMAP

## TẦM NHÌN

Xây dựng nền tảng gọi xe PWA quy mô lớn tương tự mô hình vận hành của Grab Driver và Xanh SM Driver.

Mục tiêu:

- Khách đặt xe nhanh
- Tài xế nhận đơn nhanh
- GPS chính xác
- Thanh toán tự động
- Hệ thống ổn định
- Dễ mở rộng toàn quốc

---

# PHASE 1 - NỀN TẢNG CỐT LÕI

Trạng thái: ĐANG THỰC HIỆN

## Khách hàng

- Đăng nhập
- Đăng ký
- Định vị GPS
- Chọn điểm đón
- Chọn điểm đến
- Tạo chuyến xe

## Tài xế

- Đăng nhập
- Bật online
- Bật offline
- Cập nhật GPS realtime
- Nhận đơn
- Bắt đầu chuyến
- Kết thúc chuyến

## Admin

- Quản lý tài xế
- Quản lý khách hàng
- Quản lý đơn hàng
- Theo dõi GPS

---

# PHASE 2 - TỐI ƯU GHÉP ĐƠN

Trạng thái: CHƯA THỰC HIỆN

## Driver Matching Engine

Mục tiêu:

- Tìm tài xế gần nhất
- Giảm thời gian chờ
- Giảm chi phí Firebase

Tính năng:

- Geo Query
- Driver Priority
- Auto Dispatch
- Auto Reassign

---

# PHASE 3 - THANH TOÁN

Trạng thái: CHƯA THỰC HIỆN

## PayOS

- Tạo thanh toán
- Xử lý callback
- Webhook xác nhận

## Ví tài xế

- Số dư
- Nạp tiền
- Trừ phí chuyến

## Báo cáo doanh thu

- Theo ngày
- Theo tuần
- Theo tháng

---

# PHASE 4 - HỆ THỐNG GPS NÂNG CAO

Trạng thái: CHƯA THỰC HIỆN

## GPS Engine

- GPS Smoothing
- Accuracy Filter
- Fake GPS Detection
- Distance Validation
- Speed Validation

Mục tiêu:

Sai số dưới 5%

---

# PHASE 5 - PUSH NOTIFICATION

Trạng thái: CHƯA THỰC HIỆN

## Firebase Cloud Messaging

Khách hàng:

- Tài xế đã nhận đơn
- Tài xế sắp tới
- Hoàn thành chuyến

Tài xế:

- Có đơn mới
- Đơn bị hủy
- Thanh toán thành công

---

# PHASE 6 - ĐÁNH GIÁ

Trạng thái: CHƯA THỰC HIỆN

## Rating System

- Đánh giá sao
- Bình luận
- Xếp hạng tài xế
- Xếp hạng khách hàng

---

# PHASE 7 - GÓI CƯỚC

Trạng thái: CHƯA THỰC HIỆN

## Subscription

Gói ngày

Gói tuần

Gói tháng

Gói VIP

---

# PHASE 8 - PHÂN TÍCH DỮ LIỆU

Trạng thái: CHƯA THỰC HIỆN

## Analytics

- Số chuyến
- Doanh thu
- Tài xế online
- Khách hàng online
- Tỷ lệ nhận đơn
- Tỷ lệ hủy đơn

---

# PHASE 9 - SCALE TOÀN QUỐC

Trạng thái: TƯƠNG LAI

Mục tiêu:

- 1.000 tài xế online
- 5.000 khách hàng online

Tối ưu:

- Firebase Rules
- Cloud Functions
- Queue Processing
- Cache Layer

---

# KIẾN TRÚC GIAO TIẾP

Khách hàng
↓
Tạo đơn
↓
Firebase Orders
↓
Match Driver Engine
↓
Tài xế phù hợp
↓
Push Notification
↓
Tài xế nhận đơn
↓
Trip Engine
↓
Thanh toán
↓
Đánh giá

---

# NGUYÊN TẮC ROADMAP

Không thay đổi kiến trúc nền tảng.

Không thay đổi Firebase.

Không thay đổi PayOS.

Không thay đổi PWA.

Mọi nâng cấp phải tương thích ngược.

Ưu tiên:

Ổn định
>
Hiệu năng
>
Tính năng mới