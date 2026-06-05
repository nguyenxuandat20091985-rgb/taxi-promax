TAXI PROMAX - PROJECT CONSTITUTION V1.0

=========================
1. MỤC TIÊU DỰ ÁN
=========================

Taxi ProMax là nền tảng gọi xe PWA.

Hệ thống gồm:

1. App Tài Xế
2. App Khách Hàng
3. Admin Dashboard
4. Payment System
5. Firebase Backend
6. Push Notification
7. GPS Tracking

Mục tiêu cuối cùng:

- Hoạt động tương tự Grab Driver
- Hoạt động tương tự Xanh SM Driver
- Không sao chép giao diện hoặc thương hiệu
- Chỉ học theo kiến trúc vận hành

=========================
2. CÔNG NGHỆ BẮT BUỘC
=========================

Frontend:
- HTML
- CSS
- JavaScript ES6+

Map:
- Leaflet

Database:
- Firebase Realtime Database

Authentication:
- Firebase Auth

Notification:
- Firebase Cloud Messaging

Payment:
- PayOS

Deploy:
- Github
- Vercel

PWA:
- Service Worker
- Manifest

=========================
3. CẤU TRÚC THƯ MỤC CHUẨN
=========================

/
│
├── index.html
├── khachhang.html
├── admin.html
│
├── css/
│   ├── main.css
│   ├── mobile.css
│   └── darkmode.css
│
├── js/
│   ├── firebase.js
│   ├── auth.js
│   ├── gps.js
│   ├── booking.js
│   ├── trip.js
│   ├── rating.js
│   ├── payment.js
│   ├── notification.js
│   ├── analytics.js
│   └── ui.js
│
├── assets/
│
├── api/
│   ├── create-payment.js
│   ├── webhook.js
│   ├── match-driver.js
│   ├── complete-trip.js
│   └── cancel-trip.js
│
└── manifest.json

=========================
4. QUY TẮC QUAN TRỌNG
=========================

KHÔNG ĐƯỢC:

- Viết lại toàn bộ dự án
- Xóa tính năng cũ
- Đổi database sang MongoDB
- Đổi database sang MySQL
- Đổi Firebase sang Supabase
- Đổi Leaflet sang Google Maps
- Đổi Vercel sang VPS

PHẢI:

- Giữ nguyên nền tảng hiện tại
- Chỉ nâng cấp
- Chỉ refactor
- Chỉ tối ưu

=========================
5. CHỨC NĂNG BẮT BUỘC GIỮ NGUYÊN
=========================

1. GPS tài xế

2. Tính KM

3. Tính tiền

4. Chuyến vẫy

5. Chuyến online

6. Nhận đơn

7. Hủy đơn

8. Lịch sử chuyến đi

9. Đánh giá sao

10. Gói cước

11. PayOS

12. Firebase

13. PWA

14. Wake Lock

=========================
6. KIẾN TRÚC DATABASE
=========================

drivers/

orders/

trips/

ratings/

payments/

subscriptions/

admin/

analytics/

Mọi dữ liệu mới phải đặt trong cây dữ liệu trên.

Không tạo cấu trúc lộn xộn.

=========================
7. KIẾN TRÚC NHẬN ĐƠN
=========================

KHÔNG:

Tài xế quét toàn bộ orders.

KHÔNG:

setInterval(fetch)

KHÔNG:

Polling liên tục.

PHẢI:

Realtime Listener

onValue()

child_added()

Server Matching

Quy trình:

Khách tạo đơn
↓
Server nhận đơn
↓
Tìm tài xế gần nhất
↓
Gửi tới tài xế phù hợp
↓
Tài xế nhận
↓
Bắt đầu chuyến

=========================
8. GPS
=========================

Bắt buộc có:

- Accuracy Filter
- Fake GPS Detection
- Speed Validation
- Distance Validation
- GPS Smoothing

Không cộng KM khi:

accuracy > 30m

=========================
9. BẢO MẬT
=========================

Không hardcode:

- API KEY
- SECRET KEY
- WEBHOOK SECRET

Sử dụng:

Environment Variables

Không lưu thông tin nhạy cảm trong LocalStorage.

=========================
10. HIỆU NĂNG
=========================

Mục tiêu:

1000 tài xế online

5000 khách hàng online

Không dùng giải pháp gây tải Firebase.

Ưu tiên:

Realtime Event

Cloud Function

Queue Processing

=========================
11. UI/UX
=========================

Phong cách:

- Chuyên nghiệp
- Hiện đại
- Tối giản
- Dễ dùng khi lái xe

Bắt buộc:

- Responsive
- Dark Mode
- Loading State
- Error State
- Empty State

=========================
12. KHI ĐƯỢC YÊU CẦU VIẾT CODE
=========================

BẮT BUỘC THỰC HIỆN:

BƯỚC 1:
Phân tích tác động tới hệ thống.

BƯỚC 2:
Liệt kê file cần sửa.

BƯỚC 3:
Liệt kê file cần tạo.

BƯỚC 4:
Mô tả luồng dữ liệu.

BƯỚC 5:
Viết code.

BƯỚC 6:
Kiểm tra tương thích với code cũ.

KHÔNG ĐƯỢC NHẢY THẲNG VÀO CODE.

=========================
13. KHI ĐƯỢC YÊU CẦU NÂNG CẤP
=========================

Luôn trả về:

1. Mục tiêu

2. Kiến trúc

3. Luồng dữ liệu

4. Danh sách file ảnh hưởng

5. Code

6. Hướng dẫn triển khai

=========================
14. NGUYÊN TẮC CAO NHẤT
=========================

Đây là dự án đang chạy thực tế.

Ưu tiên:

Tính ổn định
>
Khả năng mở rộng
>
Tính năng mới

Không được làm hỏng chức năng hiện có.

Mọi thay đổi phải tương thích ngược.
========================= 15. ROUTING & APPLICATION STRUCTURE
App Tài Xế:
/ hoặc
/index.html
App Khách Hàng:
/khachhang.html
Admin:
/admin.html
KHÔNG ĐƯỢC:
• Tự ý đổi URL
• Tự ý đổi tên file
• Tự ý thay đổi cấu trúc route
• Tự ý đổi entry point của ứng dụng
Mọi thay đổi phải tương thích ngược.
========================= 16. FIREBASE DATABASE RULES
Không được:
• Xóa dữ liệu đang hoạt động
• Đổi tên node hiện có
• Thay đổi schema gây mất dữ liệu
Mọi nâng cấp database phải:
Backward Compatible
Các node chuẩn:
drivers/ customers/ orders/ trips/ ratings/ payments/ subscriptions/ admin/ analytics/
Không tạo node trùng chức năng.
========================= 17. DRIVER RATING SYSTEM
Bắt buộc hỗ trợ:
• Đánh giá 1 đến 5 sao
• Điểm trung bình tài xế
• Tổng số lượt đánh giá
• Lịch sử đánh giá
• Phân loại tài xế
Lưu trữ:
ratings/
Không được lưu đánh giá chỉ trong localStorage.
========================= 18. ANTI FRAUD SYSTEM
Bắt buộc hỗ trợ:
• Fake GPS Detection
• Speed Abuse Detection
• Distance Abuse Detection
• GPS Drift Detection
• Multi Device Login Detection
• Driver Account Ban
• Device Fingerprint
• Duplicate Account Detection
Không cộng KM bất thường.
Không cho phép thao túng doanh thu.
Không cho phép sửa dữ liệu chuyến đi từ client.
========================= 19. SECURITY REQUIREMENTS
Bắt buộc:
• Firebase Rules
• HTTPS Only
• JWT Authentication
• Input Validation
• Rate Limiting
• Webhook Signature Verification
Không hardcode:
• API KEY
• SECRET KEY
• WEBHOOK SECRET
• PAYMENT SECRET
Sử dụng:
Environment Variables
Không lưu dữ liệu nhạy cảm trong LocalStorage.
========================= 20. AI ASSISTANT SYSTEM
Hệ thống phải hỗ trợ:
AI Dispatcher
AI Driver Assistant
AI Customer Support
AI Analytics
AI Revenue Forecast
AI chỉ là thành phần mở rộng.
Không được làm ảnh hưởng hệ thống gọi xe cốt lõi.
========================= 21. PUSH NOTIFICATION
Bắt buộc sử dụng:
Firebase Cloud Messaging
Thông báo:
• Đơn mới
• Khách hủy chuyến
• Tài xế nhận chuyến
• Hoàn thành chuyến
• Thanh toán thành công
• Hết hạn gói
• Thông báo hệ thống
Không sử dụng polling thay thế push notification.
========================= 22. ADMIN DASHBOARD
Admin phải có:
• Tổng tài xế online
• Tổng khách hàng online
• Tổng đơn hôm nay
• Tổng doanh thu
• Đơn đang chạy
• Đơn hoàn thành
• Đơn hủy
• Tỷ lệ nhận chuyến
• Tỷ lệ bỏ qua chuyến
• Top tài xế
Admin có quyền:
• Khóa tài khoản
• Mở khóa tài khoản
• Kiểm tra lịch sử chuyến đi
• Kiểm tra doanh thu
========================= 23. LOGGING & MONITORING
Bắt buộc:
• Error Logging
• Performance Logging
• Security Logging
• Payment Logging
Mọi lỗi nghiêm trọng phải được ghi nhận.
Không được bỏ qua exception.
========================= 24. DEPLOYMENT RULES
Production:
Github + Vercel + Firebase
Không được thay đổi hạ tầng nếu chưa được phê duyệt.
Mọi thay đổi phải có hướng dẫn deploy.
========================= 25. CODE QUALITY RULES
Sử dụng:
• ES6+
• Async/Await
• Modular Architecture
• Reusable Components
Không sử dụng:
• Callback Hell
• Duplicate Code
• Global Variable không cần thiết
Bắt buộc:
• try/catch
• Error Handling
• Comment giải thích chức năng
========================= 26. PROJECT ROADMAP TARGET
Giai đoạn 1:
• GPS
• Chuyến vẫy
• Chuyến online
Giai đoạn 2:
• Matching Engine
• Push Notification
• Driver Rating
Giai đoạn 3:
• Anti Fraud
• AI Dispatcher
• Analytics
Giai đoạn 4:
• Scale 1000+ tài xế
• Scale 5000+ khách hàng
========================= FINAL RULE
Đây là dự án đang vận hành thực tế.
Trước khi sửa code:
• Đọc toàn bộ PROJECT_CONSTITUTION.md
• Phân tích ảnh hưởng hệ thống
• Liệt kê file bị ảnh hưởng
• Không được viết lại toàn bộ dự án
• Không được phá chức năng hiện có
• Không được thay đổi kiến trúc khi chưa được yêu cầu
• Mọi thay đổi phải tương thích ngược
• Nếu không chắc chắn phải hỏi lại trước khi sửa
Ưu tiên:
Tính ổn định
Bảo mật
Hiệu năng
Tính năng mới
Mọi quyết định kỹ thuật phải tuân thủ nguyên tắc trên.
