# Báo cáo kiểm tra và viết lại Taxi ProMax

## Phạm vi

Repository được kiểm tra tại nhánh `main`, commit ban đầu `7ce42bb`. Em đã rà soát cấu trúc HTML, JavaScript, CSS, API scripts, module GPS, tính cước, state machine, lịch sử, biên lai, cấu hình Vercel và các lệnh kiểm thử hiện có.

## Lỗi đã tái hiện

| Khu vực | Vấn đề | Mức độ |
| --- | --- | --- |
| Build | `npm run build` xóa `public` rồi tạo thư mục cùng tên, trong khi Git đang quản lý `public` như một tệp placeholder; build làm working tree xuất hiện trạng thái xóa ngoài ý muốn. | Cao |
| GPS | `PromaxGPSCore` là core chính nhưng repository còn có `trip-engine-v4`, `gps-bridge`, `location-core`, `gps-boost` và các module legacy với watcher/polling hoặc odometer riêng. | Cao |
| State machine | `trip-engine-v4` được nạp cùng state machine inline trong `index.html`; hai mô hình trạng thái, path Firebase và cách tính kilomet khác nhau. | Cao |
| Lịch sử | `promax-history.js` monkey-patch `saveHistory`, `renderHistory` và `showTab`, tạo pipeline ghi lịch sử/doanh thu chồng lên pipeline chính. | Cao |
| Biên lai | `promax-receipt.js` monkey-patch `completeTrip`, đọc chuyến cuối từ localStorage và có schema Firebase khác pipeline lịch sử chính. | Cao |
| Dữ liệu đầu vào | Lịch sử cũ có thể làm hỏng UI khi JSON không phải mảng hoặc kilomet không phải số. | Trung bình |

## Phần đã viết lại

`package.json` hiện có build idempotent, chỉ kiểm tra cú pháp và không phá tệp `public`. `index.html` tiếp tục làm chủ luồng chuyến hiện tại, phát sự kiện `trip:completed` và `trip:history-saved`, đồng thời chuẩn hóa dữ liệu lịch sử trước khi lưu. `gps-bridge.js` được viết lại thành adapter event-driven từ `PromaxGPSCore`, không còn polling mỗi giây và không còn phụ thuộc vào `tripEngine`/`cockpit`. `promax-history.js` được viết lại để không monkey-patch API toàn cục; nó nhận sự kiện lịch sử và dùng transaction cho sổ doanh thu. `promax-receipt.js` được viết lại để nhận sự kiện hoàn tất chuyến thay vì ghi đè `completeTrip`. Script `trip-engine-v4.js` được bỏ khỏi danh sách nạp của trang tài xế để không tạo state machine/odometer thứ hai.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test` | Đạt: security smoke tests và diagnostic contract test đều OK |
| `npm run build` | Đạt: cú pháp toàn bộ API, lib và module JavaScript hợp lệ |
| `git diff --check` | Đạt, không có lỗi whitespace |
| Git working tree | Sạch sau commit |
| Commit local | `b3c5977 Rewrite runtime integrations and safe build` |

## Trạng thái GitHub

Commit đã được tạo thành công trong bản clone local. Lệnh push lên `origin/main` bị GitHub trả về HTTP 403 dù phiên CLI đã đăng nhập tài khoản repository; vì vậy thay đổi **chưa được đẩy lên GitHub**. Không nên coi bản trên GitHub đã cập nhật cho tới khi quyền ghi của token hoặc quyền repository được cấp lại.

## Tệp bàn giao

Bản clone hoàn chỉnh nằm tại thư mục `/home/ubuntu/taxi-promax`. Commit `b3c5977` chứa năm tệp đã thay đổi có chủ đích: `index.html`, `package.json`, `js/modules/gps-bridge.js`, `js/modules/features/promax-history.js` và `js/modules/features/promax-receipt.js`.

## Kiểm tra bổ sung bốn luồng nghiệp vụ

Sau khi đối chiếu lại đặc tả, bản live đã được bổ sung và kiểm tra hợp đồng cho các luồng sau:

| Luồng | Kết quả kiểm tra mã live |
| --- | --- |
| Chuyến vẫy | Có thể bắt đầu tại `TRIP_RUNNING`, tính km/cước bằng GPS trung tâm, kết thúc và lưu lịch sử. |
| Đặt xe không có điểm đến | Nhận đơn, điều hướng pickup, xác nhận đã đến, chờ khách, xác nhận khách lên xe, mở form nhập điểm đến rồi mới tính cước. |
| Điều hướng điểm đón | Đã tách `pickupNavigation`, `fareCounting = false`, nút `ĐÃ ĐẾN ĐIỂM ĐÓN` và trạng thái chờ khách. |
| Đặt xe có điểm đến | Nhận đơn, điều hướng pickup, xác nhận pickup, chuyển sang destination navigation và tính cước theo GPS. |

Kiểm thử hợp đồng mới là `node scripts/flow-contract-test.mjs`; lệnh `npm test` đã được cập nhật để chạy kiểm thử này cùng các smoke test bảo mật và diagnostic contract test. Kết quả hiện tại: cả ba nhóm kiểm thử đều đạt.

Lưu ý: việc kiểm thử tài khoản Firebase thật, đơn hàng thật, quyền GPS thật và dẫn đường ngoài thiết bị không thể mô phỏng hoàn toàn trong sandbox; vì vậy các kết luận trên là kiểm tra theo mã, state transition và contract test, chưa phải nghiệm thu thực địa trên điện thoại.
