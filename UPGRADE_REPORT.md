# Taxi ProMax — Báo cáo sửa chữa và nâng cấp

**Ngày:** 21/08/2026  
**Phạm vi đợt này:** gia cố API, bảo mật frontend phiên tài xế và chuẩn hóa vòng đời đơn xe.

## Các thay đổi đã thực hiện

| Nhóm | Thay đổi | Kết quả |
|---|---|---|
| API security | Thêm `lib/api-security.js` với CORS allowlist, kiểm tra method, làm sạch input, kiểm tra amount/ID | Không còn CORS wildcard ở các endpoint đã rà soát |
| AI endpoints | Áp dụng helper bảo mật cho `ai-assistant`, `support-ai`, `admin-ai`; giới hạn câu hỏi 1.200 ký tự | Giảm input bất thường và rủi ro lạm dụng cơ bản |
| PayOS | `create-payment` yêu cầu driver UID hợp lệ và số tiền hợp lệ; webhook kiểm tra biến môi trường và driver tồn tại | Giảm ghi pending sai và cập nhật nhầm tài khoản |
| Vercel | Bỏ header CORS wildcard; thêm `Permissions-Policy`, HSTS và security headers | Cấu hình phù hợp hơn với domain production |
| Phiên tài xế | Không lưu `passwordHash`, `documents`, `wallet` vào localStorage | Giảm dữ liệu nhạy cảm nằm trên trình duyệt |
| Nhận chuyến | Dùng Firebase transaction để chỉ một tài xế nhận được đơn | Chống race condition cơ bản khi nhiều tài xế bấm nhận |
| Listener | Chỉ query đơn `status=waiting`, tháo đúng query listener | Giảm tải và tránh listener trùng |
| Vòng đời đơn | Thêm `createdAt`, `expiresAt`, `statusHistory`; ghi mốc driving, in_progress, completed | Có lịch sử trạng thái phục vụ đối soát và hỗ trợ |
| Đơn hết hạn | Khách và tài xế cùng xử lý timeout bằng transaction | Không tự hủy đơn đã được nhận |
| Local development | `npm start`/`npm run dev` dùng `vercel dev`; thêm `npm test` | Chạy local đúng mô hình Vercel |
| Secrets | Thêm `.env.example`, `.gitignore` và smoke test | Giảm nguy cơ commit secret và có kiểm tra hồi quy cơ bản |
| Admin auth | Thêm `/api/admin-login`, session HMAC 8 giờ, bỏ `ADMIN_PASS`/credential khỏi `admin.html` | Không còn mật khẩu admin hard-code trong frontend |
| Rules migration | Thêm `database.rules.migration.json` và `AUTH_MIGRATION.md` | Có mẫu deny-by-default và thứ tự migration; chưa tự động deploy |
| Admin AI | Bắt buộc admin HMAC session; backend tự tổng hợp context, không nhận Firebase raw data từ browser | Giảm nguy cơ gọi AI trái phép và lộ dữ liệu thô |
| KYC/SOS input | Chỉ nhận ảnh JPG/PNG/WebP tối đa 8MB; audio SOS tối đa 3MB | Giảm nguy cơ payload quá lớn khi còn đang dùng Base64 migration |

## Kiểm thử đã chạy

Các kiểm tra đã đạt gồm `npm test`, `node --check` cho toàn bộ API/helper JavaScript, parse JSON cho `package.json`, `vercel.json` và `database.rules.migration.json`, cùng `git diff --check`. Smoke test kiểm tra CORS helper, làm sạch input, số tiền hợp lệ, ID an toàn và phản hồi 503 an toàn khi admin auth chưa được cấu hình.

## Commit local

| Commit | Nội dung |
|---|---|
| `7b517d8` | Gia cố API và chống nhận trùng chuyến |
| `29e73dd` | Gia cố vòng đời đơn và timeout |
| `e8d1395` | Ghi changelog |
| `d1c3e29` | Cập nhật script dev/test |
| `28d078e` | Báo cáo bàn giao đợt đầu |
| `HEAD` | Chuyển admin login sang session server-side và thêm Rules migration |
| `e2a44fd` | Bảo vệ admin AI và giới hạn payload KYC/SOS |

## Việc chưa thể hoàn tất chỉ bằng frontend hiện tại

Firebase Rules vẫn cần được chuyển từ quyền mở sang Firebase Authentication và phân quyền theo role. Auth hiện tại của app là logic tự xử lý trong client, vì vậy chưa thể bật rules chặt chẽ mà không thực hiện migration tài khoản. Admin dashboard đã chuyển phần kiểm tra credential sang `/api/admin-login` và session HMAC; admin-ai cũng đã yêu cầu session và tự tổng hợp context ở backend. Tuy vậy, các truy vấn Firebase trực tiếp của dashboard vẫn cần được chuyển sang Auth token hoặc backend proxy trước khi dùng production.

Ngoài ra, dữ liệu CCCD, bằng lái, selfie và audio SOS vẫn cần chuyển sang storage riêng có quyền truy cập và URL hết hạn. Đây là hạng mục tiếp theo, không nên bỏ qua dù giao diện đang hoạt động.

## Cấu hình Vercel cần đặt

Đặt các biến trong `.env.example` vào Vercel Project Settings: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `GROQ_API_KEY`, `ADMIN_PHONE`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` và `ALLOWED_ORIGINS`. Tạo hash bằng SHA-256 cho mật khẩu admin; không đưa giá trị thật vào GitHub.

## Lưu ý bàn giao

Các commit đang nằm ở bản clone local, branch `main`, chưa push lên GitHub và chưa deploy lên Vercel. Cần review diff, cấu hình secrets, backup Firebase và kiểm thử trên staging trước khi đưa lên production.

## Kết quả kiểm thử staging

`npm test`, kiểm tra cú pháp JavaScript và parse JSON đều đạt. Vercel CLI đã được thử nhưng dừng ở bước `Set up ~/taxi-promax?` vì bản clone local chưa liên kết với Vercel project và sandbox không có Vercel token; chưa có kết luận build production thất bại. Cần chạy `vercel link`/`vercel build` trong workspace đã liên kết hoặc deploy staging sau khi cấu hình biến môi trường.

## AI System Auditor & Self-Healing Agent

Đã bổ sung `api/system-diagnostic.js` và `api/system-diagnostic-report.js`. Diagnostic service yêu cầu admin session HMAC, quét có giới hạn các log Firebase (`system_logs`, `error_logs`, `payment_logs`, `sos`), lấy source manifest từ GitHub raw, chạy static checks và có thể dùng Groq để tổng hợp thành JSON gồm `overallStatus`, `summary`, `findings`, `repairPlan`, `confidence`.

Admin Dashboard đã có tab **AI System Health & Diagnostic**, tự chạy sau khi đăng nhập và hiển thị trạng thái, file liên quan, mức độ ưu tiên và tiêu chí nghiệm thu. Nút **Xem report** chỉ tải Markdown; nút **Cập nhật UPGRADE_REPORT** yêu cầu xác nhận admin và chỉ commit khi Vercel có `GITHUB_TOKEN` với quyền Contents Read/Write cùng `ALLOW_DIAGNOSTIC_COMMIT=true`.

Agent không tự ý sửa code, đổi Firebase Rules hoặc deploy production. Mọi thay đổi có tác động phải đi qua human approval, branch/PR và CI. Smoke test hiện gồm security contract và diagnostic contract; cả hai đã đạt.

## Clean URLs và cô lập phân hệ trên Vercel

Đã chuẩn hóa `vercel.json` với `cleanUrls: true`, redirect vĩnh viễn từ `index.html`, `khachhang.html`, `xeghep.html`, `admin.html` về `/`, `/khachhang`, `/xeghep`, `/admin`, và rewrite riêng cho từng phân hệ. Các API vẫn được Vercel tự nhận diện dưới `/api/*`; không dùng rewrite vòng cho API.

Đã cập nhật `manifest.json` để shortcut PWA dùng clean routes. Service Worker tăng cache version lên v5, cache các clean route và chọn fallback offline theo đúng phân hệ thay vì luôn trả app tài xế. Bổ sung navigation nội bộ ở màn hình xác thực: tài xế → `/khachhang`, `/xeghep`; khách hàng → `/`, `/xeghep`; xe ghép → `/`, `/khachhang`.

Route admin vẫn hiển thị màn hình đăng nhập khi chưa có session; nội dung app và API quản trị không được mở trước khi xác thực. Vercel thêm `Cache-Control: no-store` và `X-Robots-Tag: noindex` cho `/admin` và `/admin.html`. Không còn tham chiếu `github.io` hoặc `pages.dev` trong code giao diện/config đã rà soát.
