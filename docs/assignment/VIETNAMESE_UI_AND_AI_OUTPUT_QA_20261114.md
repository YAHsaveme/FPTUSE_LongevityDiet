# PRN232 — Kiểm tra tiếng Việt trên giao diện và nội dung thực đơn AI (14/11/2026)

## Phạm vi và kết luận
Đã cập nhật mã nguồn cục bộ trên commit gốc `main 1e2d0f1` và chạy thử trong Docker Desktop. Các mục sau đã được kiểm thử tự động thành công, **không đồng nghĩa đã kiểm chứng 100% mọi dữ liệu lịch sử hoặc mọi màn hình Admin**.

## Thay đổi đã thực hiện
1. **Prompt Gemini:** chỉ chọn `candidateCode` thuộc tập món đã được backend lọc cho đúng ngày/bữa; nhắc kiểm tra độ đa dạng, đạm thực vật, ngũ cốc và giới hạn cá, không bịa món/số liệu y khoa. Phần điều khiển mô hình và lời yêu cầu gửi bằng tiếng Việt. API vẫn nhận JSON theo schema cũ, không thay mã; không gửi dữ liệu sức khỏe cá nhân vào Google.
2. **Giải thích thực đơn từ backend:** thay phần tiếng Anh bằng văn bản tiếng Việt có số ngày, số bữa, chế độ ăn, dị ứng, loại trừ, phiên bản quy tắc, hướng dẫn sử dụng và giới hạn. Mỗi món nêu lý do, khẩu phần, năng lượng, đạm, tinh bột, chất béo, chất xơ, tối đa 5 thành phần được lưu và cách kiểm tra dị ứng.
3. **Báo cáo tuần:** tiếng Việt và chi tiết hơn về tỷ lệ ghi nhận, ngày thử thách, chuỗi duy trì, số ngày quan sát/đạt khung giờ ăn, năng lượng trung bình trên các ngày có dữ liệu. Không suy diễn tình trạng sức khỏe.
4. **Web:** Việt hóa nhãn danh mục, công thức, quản trị thực phẩm/công thức/quy tắc, duyệt xuất bản, báo cáo, tiến độ, trạng thái và một số thông báo lỗi. Có ánh xạ nhãn tiếng Việt cho các danh mục/seed tiếng Anh xác định được, nhưng **không chỉnh dữ liệu gốc, ID, mã dị ứng hoặc giá trị API**.
5. **Tương thích dữ liệu cũ:** bản kế hoạch và báo cáo trước đây được viết bằng mẫu tiếng Anh phổ biến được trình bày lại từ metadata và dữ liệu thật; không tự bịa phần chưa có nguồn.
6. **An toàn khi nhập tiếng Việt:** tên dị ứng thông dụng (đậu phộng/lạc, tôm/cua, đậu nành, mè/vừng...) được ánh xạ về mã backend trước khi lưu; mục lạ bị cảnh báo và khóa thao tác thay vì tự động coi là an toàn. Bài E2E kiểm tra trực tiếp trên giao diện và đọc lại mã chuẩn từ API.

## Kết quả kiểm thử
- .NET unit tests: **100/100 PASS**; thêm bảy kịch bản chế độ ăn và dị ứng, yêu cầu giải thích món đủ thành phần/khẩu phần/số liệu.
- .NET integration tests: **109/109 PASS**; test bảo mật khóa Gemini và ràng buộc mã món vẫn chạy.
- React Vitest: **24/24 PASS** (có thêm chuẩn hóa dị ứng); Web Node tests: **7/7 PASS**.
- Web Oxlint: **0 lỗi, 0 cảnh báo**; Vite production build: **PASS**.
- Playwright Gemini thật qua Docker Desktop: **1/1 PASS**, tạo và lưu **7 ngày / 21 bữa**, xác nhận phần giải thích AI bằng tiếng Việt có đủ các mục nói trên, không chỉ kiểm tra số lượng.
- Playwright hồi quy tích hợp **15/15 PASS** (14/11): Admin CRUD và ba tab quản trị, Gemini thật 7 ngày/21 bữa, hồ sơ đăng ký, hành trình Member, responsive 320/390/1365 px và sàng lọc dị ứng tiếng Việt. Bài QA cuối chờ phục hồi giới hạn 429 hợp lệ, không tắt cơ chế chống spam.
- Tình huống báo cáo tuần trong bài Member E2E xác minh tiếng Việt, số liệu từ Worker, phần khung giờ ăn và lịch sử; không chỉ nhãn “Ngày tạo”.
- Docker Compose Gemini demo: build lại và chạy đủ sáu dịch vụ; SQL/Redis giữ nguyên volume đã tách. Không in API key trong output.

## Lưu ý quan trọng
- **Đây không phải huấn luyện hay fine-tune mô hình Gemini.** Các thay đổi là prompt, quy tắc backend, mẫu giải thích dựa trên dữ liệu có thật, i18n và kiểm thử. Để fine-tune cần tập dữ liệu, quy trình đánh giá và hỗ trợ từ nhà cung cấp.
- Không bảo đảm mô hình không bao giờ đưa kết quả thiếu chính xác. Các mã món bất hợp lệ vẫn phải bị chặn ở backend, có phương án sinh thực đơn bằng quy tắc.
- Các tên riêng (Gemini, FMD, Redis), địa chỉ URL, mã kỹ thuật JSON/API và nội dung tùy ý do quản trị viên/người dùng nhập có thể giữ nguyên ngôn ngữ gốc. Dịch toàn bộ mọi bản ghi cũ cần kiểm kê và xác nhận nguồn dữ liệu.
- Chưa có nguyên văn toàn bộ cuốn *The Longevity Diet* được xác thực từng trang; không khẳng định mỗi món hoặc định lượng là chỉ định chính thức từ sách. Chỉ dựa trên danh mục và nguyên tắc công khai, với lời cảnh báo không thay lời khuyên y tế.
- Admin UI đã kiểm thử thật với tài khoản tổng hợp trên volume SQL riêng `longevity-gemini-demo-sql-data`: mở cả ba tab; thêm/sửa/ngừng sử dụng thực phẩm; không đụng tài khoản hay dữ liệu production. Kiểm duyệt nội dung bởi người có chuyên môn vẫn nằm ngoài phạm vi.
- Nguồn và giới hạn được đối chiếu tại `docs/assignment/PRN232_SOURCE_TRACEABILITY_AND_AI_LIMITS_20261114.md`. Trạng thái commit/PR cần được cập nhật khi đưa code lên GitHub.

## Kiểm tra lại
```powershell
Set-Location D:\PRN232\FPTUSE_LongevityDiet
dotnet test LongevityDiet.sln -c Release --no-restore
npm --prefix src/LongevityDiet.Web test
npm --prefix src/LongevityDiet.Web run lint
npm --prefix src/LongevityDiet.Web run build
# Chạy Docker demo qua scripts/Start-Gemini-Docker-Demo.ps1 (đọc Gemini key từ User Secrets)
# E2E Gemini thật, chủ động bật trước khi gọi dịch vụ bên ngoài:
Set-Location tests/LongevityDiet.E2ETests
$env:GEMINI_LIVE_UI = '1'
npx playwright test --config playwright.docker.config.ts gemini-live-ui.spec.ts
Remove-Item Env:GEMINI_LIVE_UI
```
