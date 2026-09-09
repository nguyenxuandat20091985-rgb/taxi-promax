# ProMax — Luồng chuyến và điều phối thông minh

## 1. Ba luồng khách được tách độc lập

### A. Khách vẫy — `STREET_HAIL`
- Tài xế chủ động bắt đầu chuyến từ đường phố.
- Không tạo một request đặt xe app chồng lên chuyến.
- Điểm đón là vị trí hiện tại; điểm đến có thể được nhập sau khi khách lên xe.
- Đồng hồ/cước của chuyến được khởi tạo từ Ride Contract và fare version tại thời điểm bắt đầu.

### B. Khách đặt app nhưng chưa có điểm đến — `APP_BOOKING_NO_DESTINATION`
- Request chỉ có điểm đón.
- Tài xế nhận request → đi đến điểm đón → `ARRIVED` → khách lên xe.
- Điểm đến được bổ sung sau khi tài xế/khách xác nhận trên cùng Ride Contract.
- Không được dùng logic của luồng có điểm đến để tự suy đoán tuyến.

### C. Khách đặt app có điểm đến — `APP_BOOKING_DESTINATION`
- Request bắt buộc có điểm đón + điểm đến.
- Backend tính route/estimate → dispatch → tài xế nhận → đi đón → chạy chuyến.
- Estimate và final fare là hai giá trị khác nhau; final fare chỉ được chốt theo dữ liệu chuyến hợp lệ.

`SHARED_RIDE` tiếp tục là loại dịch vụ riêng, không được trộn vào ba luồng taxi đơn.

## 2. Một tài xế chỉ có một chuyến đang hoạt động

Các trạng thái `OFFERED`, `ACCEPTED`, `DRIVER_EN_ROUTE`, `ARRIVED`, `PASSENGER_ONBOARD`, `IN_PROGRESS` khóa tài xế khỏi mọi chuyến mới.

Điều kiện nhận chuyến phải được kiểm tra **server-side**. UI không có quyền tự mở khóa.

## 3. Bản đồ thông minh

Pipeline mục tiêu:

`RAW GPS → QUALITY CHECK → MAP MATCH → ROAD CLASSIFICATION → KALMAN → ANTI-TELEPORT → VALID POSITION → DISPATCH ELIGIBILITY`

Hệ thống phải nhận biết tối thiểu:
- tài xế đang trên cầu/cấu trúc đường hạn chế;
- tài xế đang đi ngược hướng tuyến;
- tài xế lệch khỏi tuyến quá ngưỡng;
- GPS không đủ chất lượng.

Nếu một trong các điều kiện chính làm tài xế không thể an toàn nhận chuyến mới, dispatch không gửi offer cho tài xế đó. Đây là khóa nghiệp vụ, không phải chỉ là cảnh báo giao diện.

## 4. AI điều phối

AI được dùng để xếp hạng ứng viên, dự báo nhu cầu, phát hiện bất thường và đề xuất tái cân bằng vùng.

AI **không** được làm nguồn sự thật cho tiền, trạng thái chuyến, quyền tài xế hoặc thanh toán. Các invariant server-side luôn thắng điểm AI.

## 5. Điều phối theo vùng

Mỗi vùng có thể có priority động dựa trên:
- tỷ lệ cung/cầu;
- tuổi hàng đợi request;
- khoảng cách đến điểm đón;
- khả năng tiếp cận đường;
- service zone;
- trạng thái thuê bao tài xế.

Mục tiêu là đưa xe rảnh tới vùng thiếu xe mà không phá vỡ khóa một chuyến/tài xế.

## 6. Cách học hỏi nền tảng lớn

ProMax có thể học các nguyên tắc sản phẩm phổ biến của các nền tảng gọi xe lớn như điều phối theo ETA, map matching, heatmap cung/cầu và chống gian lận GPS. Không sao chép mã, dữ liệu riêng tư, thương hiệu hoặc cơ chế độc quyền.

## 7. Điều kiện để gọi là triển khai thực tế

Không chỉ chạy được UI. Trước production phải đạt:
- auth + authorization server-side;
- Firebase rules/DB access đã khóa;
- payment webhook idempotent và có recovery;
- subscription ledger là nguồn sự thật;
- ride state machine + driver lock;
- GPS/offline/reconcile;
- shared-ride atomic seat reservation;
- fare versioning;
- audit + observability;
- kiểm thử thiết bị thật, GPS thật, mạng mất/kết nối lại và thanh toán sandbox/production theo nhà cung cấp;
- rà soát pháp lý/thuế tại địa bàn triển khai.
