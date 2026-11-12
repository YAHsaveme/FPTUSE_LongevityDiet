> HISTORICAL AUDIT (10 November 2026): 32/56-table architecture assertions below were superseded. Only the five current official drawings in docs/assignment/one-page/README.md should be submitted. Dated audit retained as reference, not as another diagram.

# LongevityDiet — báo cáo đối chiếu Final Assignment và lộ trình sức khỏe

Ngày: 10/11/2026 (UTC+7). Nhánh: `feature/w3-t4-rule-governance-20261109`. Phạm vi: thành viên 1 + thành viên 4, dinh dưỡng mỗi ngày, theo dõi trước–trong–sau. **Chưa đủ chứng cứ để kết luận nghiệm thu 100%.**

## 1. Đã triển khai và có kiểm thử

| Hạng mục | Bằng chứng |
|---|---|
| Tài khoản, JWT và thông tin cá nhân | Có trong API, kiểm thử xác thực/phân quyền |
| Xác minh tuổi và dị ứng trước khi lên thực đơn | Sàng lọc theo tài khoản; không đủ 18 tuổi/chưa khai tuổi và nhiều yếu tố rủi ro bị chặn tự lên kế hoạch |
| Nhóm đối tượng | AdultGeneral, OlderAdult, AgeUnverified, Adolescent, ProfessionalReviewRequired, WellbeingReviewRequired. Các nhóm là hướng điều hướng an toàn **không phải chẩn đoán** |
| Thực đơn liên tục | 14 ngày trước mắt; khi người dùng mở Planner sẽ nối tiếp phần kế hoạch sắp hết; không chỉ lên một ngày |
| Không trùng và bảo toàn kế hoạch | Kiểm thử idempotent, giữ các bữa đã lên lịch khi điều kiện không đổi, kiểm tra các ngày liên tiếp |
| Kiểm tra an toàn toàn bộ các lối vào | API `generate`, `regenerate`, `regenerate meal`, `ensure-current`, `current` không được bỏ qua sàng lọc |
| Thay đổi dị ứng | Tên dị ứng phổ biến Việt/Anh được ánh xạ; trường hợp không nhận diện được bị chặn; không sử dụng phiên kế hoạch cũ không còn tương thích |
| Nhật ký sức khỏe | Trước (Baseline), trong (During), sau chu kỳ (FollowUp), mỗi ngày: năng lượng/tinh thần/tiêu hóa/ngủ 1–5, triệu chứng, thay đổi cơ thể, cân nặng và ghi chú |
| Xu hướng và theo dõi hằng ngày | Bảng hỏi trên Planner, tổng hợp đến 365 ngày; lời nhắc ghi bữa ăn opt-in qua Worker hỏi thêm về sức khỏe |
| Bảo vệ an toàn | Triệu chứng cấp cứu và nhiều ngày tự chấm rất kém bị cảnh báo/chặn tự lập chế độ ăn; không xem kết quả tự khai là chẩn đoán |
| Sở hữu dữ liệu | API JWT, cách ly theo tài khoản, không cho xóa nhật ký của người khác |
| Kiểm thử độ dài lộ trình | Unit test mô phỏng từng ngày **400 ngày liên tục xuyên năm**; phải xem kết quả test cuối trong phần Quality Gates |

**Giới hạn chức năng:** Đây là gợi ý món ăn dựa trên recipe và quy tắc, **chưa** phải thực đơn được chuyên gia chứng nhận đủ năng lượng, protein, vitamin, khoáng chất, phù hợp thuốc đang dùng hay loại trừ tất cả nguy cơ dị ứng và tiếp xúc chéo. Không có phương pháp nào đảm bảo tăng tuổi thọ cho từng cá nhân.

## 2. Sơ đồ bốn mức đã đồng bộ với thực trạng

- C0: System Context, actor hình người.
- C1: Web → API, API ↔ Redis, Worker, gRPC, 3 SQL catalogs.
- C2: **22 controller**, bốn nhóm nghiệp vụ, luồng HTTP → Controller → Service → Repository; thông tin Redis/gRPC/Worker và DB.
- ERD: **56 bảng** (45/7/4), **23 SQL FK thực tế** và **32 liên kết logic hiển thị**, phần mô tả đủ **50 liên kết logic** nằm trong `full-schema-manifest.json`.
- Cả bốn sơ đồ là file Draw.io native và PDF một trang. `Export-OverallDiagrams.ps1` đã ghi nhận **PASS**, bao gồm SVG bố cục **0 chữ bị đường cắt, 0 đường nối giao cắt** trên cả bốn sơ đồ.
- Bộ sơ đồ cũ 32 bảng lưu trong `docs/assignment/legacy-diagrams` để đối chiếu, không dùng làm sơ đồ hiện tại.

## 3. Quality Gates

Chạy từ thư mục dự án:

    dotnet build LongevityDiet.sln -c Release --nologo -v:q
    dotnet test LongevityDiet.sln -c Release --nologo -v:q
    npm --prefix src/LongevityDiet.Web run lint
    npm --prefix src/LongevityDiet.Web run build
    npm --prefix src/LongevityDiet.Web test
    node scripts/Validate-OfficialArchitecture.js
    node scripts/Validate-OverallDiagrams.js
    .\scripts\Export-OverallDiagrams.ps1
    docker compose --env-file .env.example config --quiet
    .\scripts\Test-ReleaseReadiness.ps1

**Kết quả mới nhất 10/11/2026:** 91/91 unit + 80/80 integration = **171/171 test .NET PASS**; tình huống lộ trình 400 ngày PASS; 12/12 Web tests PASS, Web lint 0 cảnh báo và production build PASS. Tất cả bốn bản PDF/Draw.io đã xuất thành công, SVG 0 giao cắt/0 đường cắt nhãn, kiểm tra sơ đồ tổng thể PASS, structure PASS và ReleaseReadiness static PASS. Snapshot EF `WellnessLongitudinalJourney` không còn thay đổi EF chưa được tạo migration. **Migration mới chưa được áp dụng và kiểm thử trên SQL Server thực tế.**

## 4. Đối chiếu rubric PRN232 Final Assignment

| Nội dung | Tỷ trọng | Trạng thái |
|---|---:|---|
| Kiến trúc hệ thống | 20% | C0, C1, C2 và ERD 56 bảng đã kiểm tra, có file bàn giao |
| REST API | 20% | Code và integration test đã có; chưa demo trực tiếp trên stack Docker |
| Background Job | 10% | Code Worker/reminder có; **chưa chứng minh lịch chạy và retry thực tế** |
| Message Broker | 15% | Redis Streams được phép thay Kafka; **chưa live demo publish–consume–ACK** |
| gRPC | 15% | Service gRPC riêng và API adapter có; **chưa chứng minh live REST → gRPC → phản hồi** |
| Triển khai Docker/cloud | 10% | Compose/Dockerfile có; **chưa triển khai stack production-equivalent và kiểm tra migration SQL** |
| Tài liệu/trình bày | 10% | Code, migrations, sơ đồ, báo cáo có; cần bản demo 7 mục thực tế |

Rubric gốc cho phép **Kafka hoặc Redis**, và **Docker Compose hoặc Cloud**. Không bắt buộc làm cả hai ở mỗi cặp.

**Rào cản tài nguyên:** tại 02:00 ngày 10/11/2026, ổ C: khoảng **0,36 GB trống**, ổ D: khoảng 108 GB trống. Khởi động SQL Server/Docker/ghi ảnh trên ổ C có nguy cơ cạn hệ thống; **không chạy container và không xóa hoặc dọn dữ liệu cá nhân ngoài dự án**. Phần thử nghiệm live còn mở.

## 5. Demo đầu-cuối 7 mục cần nghiệm thu

1. Giải thích C0/C1/C2/ERD, FK vật lý so với APP liên kết.
2. Swagger có JWT, profile, sàng lọc, 14 ngày, nhập/xem/sửa nhật ký trước–trong–sau.
3. Worker thực sự kích hoạt lời nhắc ngày, lưu dấu và chống gửi trùng.
4. Redis Streams publish/consume/ACK và xử lý lặp.
5. API → gRPC riêng biệt, cả thành công và lỗi.
6. Fresh Docker Compose + SQL migrations, health check, restart.
7. Kịch bản nhiều ngày: đăng ký → xác minh tuổi/dị ứng → thực đơn luân phiên → ghi nhận ăn → check-in → thay dị ứng/triệu chứng → khóa và nối tiếp hợp lệ.

## 6. Nguồn tham khảo chuyên môn

- WHO — Healthy diet, 26/01/2026: https://www.who.int/news-room/fact-sheets/detail/healthy-diet — nguyên tắc adequacy/balance/moderation/diversity, nhu cầu tùy người.
- US National Institute on Aging — Healthy Meal Planning: https://www.nia.nih.gov/health/healthy-eating-nutrition-and-diet/healthy-meal-planning-tips-older-adults — người cao tuổi cần đa dạng thực phẩm, protein, dinh dưỡng đặc thù.
- FARE — Prevent Cross-Contact: https://www.foodallergy.org/sites/default/files/2023-05/FARE_CrossContactPoster-042623.pdf — dị nguyên có thể bị lẫn trong chế biến ngay cả khi nhãn món không có.

Các nguồn này chỉ xác nhận nguyên tắc khoa học, **không phải xác nhận thực đơn trong database đã được kiểm định**.

## 7. Điều kiện nghiệm thu 100% còn thiếu

Cần dữ liệu recipe/định lượng/micronutrient đã kiểm tra với chuyên gia dinh dưỡng, kiểm tra dị ứng và cross-contact, quy tắc cá nhân hóa chuyên sâu đúng đối tượng; chạy migration trên SQL thật và demo runtime đầy đủ REST, Worker, Redis, gRPC và Docker; kiểm tra privacy/retention cho nhật ký y tế. Chỉ sau khi có bằng chứng mới nên đề nghị merge vào `develop` hoặc `main`. Các thay đổi đã kiểm chứng cần được commit ngay để không mất dữ liệu. Không đưa `.env`, credentials, dữ liệu sức khỏe người dùng hoặc bản sao DB lên Git.
## Cập nhật Rule Governance / task thành viên 4

Chi tiết nghiệm thu cả tám task xem tại [MEMBER1-MEMBER4-COMPLETION-CHECKLIST-20261110.md](MEMBER1-MEMBER4-COMPLETION-CHECKLIST-20261110.md). Admin Rule Governance có hàng đợi InReview phân trang/lọc medical sensitivity, phân tích tác động version -> rule sets -> MealPlans và kiểm soát hai Admin riêng biệt khi công bố. Tính năng đã được kiểm thử trên SQLite integration, **chưa** đủ chứng cứ concurrency/SQL Server triển khai thật hay reviewer ngoài nhóm.
