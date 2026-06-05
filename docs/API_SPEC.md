API_SPEC.md

TAXI PROMAX API SPECIFICATION

Version: 1.0

---

MỤC TIÊU

Tài liệu này mô tả toàn bộ luồng giao tiếp giữa:

- App Khách Hàng
- App Tài Xế
- Firebase
- Admin Dashboard
- Payment System

Mọi chức năng mới phải tuân thủ tài liệu này.

---

1. TẠO ĐƠN XE

APP KHÁCH

Gửi:

pickup
dropoff
pickupLat
pickupLng
dropoffLat
dropoffLng
customerId
customerName
customerPhone
carType

Firebase:

orders/{orderId}

Ví dụ:

orders/
└── ORD001
├── status: waiting
├── customerId
├── pickup
├── dropoff
├── pickupLat
├── pickupLng
├── createdAt

Status:

waiting

---

2. GHÉP TÀI XẾ

KHÔNG:

Driver quét toàn bộ orders.

KHÔNG:

setInterval(fetch)

KHÔNG:

Polling liên tục.

PHẢI:

Server Matching

Luồng:

Khách tạo đơn
↓
Match Service
↓
Tìm tài xế gần nhất
↓
Gửi đơn tới tài xế phù hợp

Firebase:

driver_offers/

Ví dụ:

driver_offers/
└── DRIVER001
└── OFFER001

Status:

offered

---

3. TÀI XẾ NHẬN ĐƠN

Driver App

Nhấn:

Nhận chuyến

Firebase:

orders/{orderId}

Cập nhật:

status = accepted

driverId

acceptedAt

---

4. DI CHUYỂN ĐẾN ĐIỂM ĐÓN

Status:

accepted

App tài xế:

Hiển thị:

- Khoảng cách tới khách
- Thời gian dự kiến
- Điều hướng

Firebase:

driver_locations/

Cập nhật realtime.

---

5. ĐÃ ĐÓN KHÁCH

Tài xế bấm:

Đã đón khách

Status:

picked_up

Firebase:

orders/{orderId}

---

6. ĐANG THỰC HIỆN CHUYẾN

Status:

in_trip

Realtime:

- GPS
- Quãng đường
- Thời gian
- Cước phí

Firebase:

trips/{tripId}

---

7. HOÀN THÀNH CHUYẾN

Status:

completed

Lưu:

trips/

Ví dụ:

trips/
└── TRIP001
├── orderId
├── driverId
├── customerId
├── distanceKm
├── durationMinute
├── fare
├── completedAt

---

8. KHÁCH HỦY CHUYẾN

Status:

cancelled

Nguyên nhân:

customer_cancelled

App tài xế:

- Tắt điều hướng
- Trả về trạng thái sẵn sàng

---

9. TÀI XẾ HỦY CHUYẾN

Status:

cancelled

Nguyên nhân:

driver_cancelled

Ghi log:

analytics/cancel_logs

---

10. ĐÁNH GIÁ SAO

Khách đánh giá tài xế

ratings/

Ví dụ:

ratings/
└── RATE001
├── tripId
├── driverId
├── customerId
├── stars
├── comment

Điểm trung bình:

drivers/{driverId}/rating

---

11. THANH TOÁN

payments/

Ví dụ:

payments/
└── PAY001
├── tripId
├── amount
├── method
├── status

Method:

cash
wallet
bank
payos

---

12. GÓI CƯỚC TÀI XẾ

subscriptions/

Ví dụ:

subscriptions/
└── DRIVER001
├── plan
├── startDate
├── expireDate
├── status

---

13. THÔNG BÁO

notifications/

Loại:

new_order
trip_update
payment_success
subscription_expired
system_alert

---

14. CHAT NỘI BỘ

chat/

Ví dụ:

chat/
└── ROOM001
├── participants
├── messages

Cho phép:

- Khách ↔ Tài xế
- Tài xế ↔ Điều hành
- Điều hành ↔ Khách

---

15. SOS KHẨN CẤP

sos/

Ví dụ:

sos/
└── SOS001
├── driverId
├── lat
├── lng
├── timestamp
├── status

Status:

active
resolved

---

16. PHÂN TÍCH HỆ THỐNG

analytics/

Bao gồm:

- Tổng đơn
- Tổng doanh thu
- Tỷ lệ nhận chuyến
- Tỷ lệ hủy chuyến
- Tỷ lệ hoàn thành
- Điểm đánh giá trung bình

---

QUY TẮC TỐI CAO

Mọi chức năng mới phải:

1. Tương thích ngược
2. Không phá vỡ luồng dữ liệu
3. Không thay Firebase
4. Không dùng polling liên tục
5. Ưu tiên Realtime Listener
6. Ưu tiên khả năng mở rộng
7. Hoạt động ổn định với tối thiểu:

- 1.000 tài xế online
- 5.000 khách hàng online