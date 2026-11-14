# PRN232 — xóa mềm, đối chiếu Phụ lục A và nghiệm thu kỹ thuật
**Ngày:** 14/11/2026
**Phạm vi thay đổi:** nhánh `feature/prn232-soft-delete-book-extraction-20261114` (chỉ demo Docker Desktop 1 API container)
**Nguồn:** *The Longevity Diet*, Valter Longo, 2018, PDF người dùng cấp (306 trang, ISBN 9780525534075).

## A. Bảo toàn dữ liệu
- Trước khi thử migration trên SQL Server, đã tạo bản sao lưu: `D:\PRN232\.local-backups\PRN232_BeforeSoftDelete_20261114.bak` (22.142.976 byte). Không chứa bản backup trong repo và không gửi credentials.
- Thêm `IsDeleted` và `DeletedAt` vào `PlannedMeals`, `WellnessCheckIns`, `UserFoodPreferences`; các truy vấn thông thường có EF global filter.
- Xóa món trong thực đơn: giữ nguyên record, cập nhật thời điểm xóa, loại khỏi danh sách và tổng năng lượng hiển thị. Không xóa khỏi collection có quan hệ bắt buộc EF Cascade. CRUD cùng user được serialize theo khóa mutation đã có ở main.
- Xóa Wellness check-in: ẩn bản ghi cũ, không tính trong trend/overview; tạo record mới cùng ngày/phase vẫn được nhờ unique filtered index.
- Sở thích thực phẩm: ẩn khi xóa; khi thêm lại cùng `FoodToken`, khôi phục đúng `Id` cũ, trạng thái và thông tin mới, không tạo hàng trùng.
- Migration `20261114233000_SoftDeleteMemberRecords` đã chạy trong SQL Server và có bản ghi trong `__EFMigrationsHistory`. Đã kiểm chứng sáu cột mới và hai filtered unique indexes thực tế trên SQL Server.
- Chặn rollback tự động có thể mất lịch sử (Down ném lỗi); phục hồi cần kế hoạch migration/recovery riêng.

## B. Nguồn sách không đồng nhất với món demo
- Giữ cơ chế tra cứu sách độc lập, không đưa dữ liệu tự trích xuất chưa được kiểm duyệt vào Gemini hoặc thuật toán lập khẩu phần.
- `bookAppendixQuantities.json`: 14 ngày, 56 vị trí bữa, **350 dữ kiện số lượng/đơn vị** được tách tự động từ Phụ lục A, các trang PDF 215–242. Dữ kiện có thể là khối lượng nguyên liệu, giới hạn thành phần (ví dụ đường <8 g) hoặc phần ăn kèm, **không được mặc định là 350 nguyên liệu**.
- **Hai bữa đã kiểm tra từng số liệu với PDF gốc:**
  - Tuần 1, ngày 1, bữa trưa: rau bina, hạt thông, nho khô, dầu ô-liu, bánh cracker spelt; trang PDF 215 — 8 dữ kiện.
  - Tuần 2, ngày 4, bữa tối: gạo đen, bí ngòi, cà chua bi, tôm, Parmesan, saffron, dầu ô-liu, rau ăn kèm, nam việt quất và hạt óc chó; trang PDF 236 — 12 dữ kiện.
- **54 bữa còn lại chưa qua đối chiếu người biên tập; có 44 vị trí chưa có nhãn nguyên liệu xác thực** trong bản trích xuất thô, phải được kiểm tra từ trang PDF trước khi dùng.
- Trang `/book` hiện phân biệt nguồn đã so trang PDF với nguồn chưa xác minh. Không tự suy ra kcal/macros theo tên món, không tự áp dụng định mức 1.700–1.800 kcal cho mọi người, không gọi tác giả là cố vấn hay người phê duyệt ứng dụng.
- Công thức và nguyên liệu trong Admin hiện chưa có bằng chứng đã đối chiếu mọi dòng của toàn bộ 306 trang; **không báo cáo 100% book-exact**.

## C. Nghiệm thu đã có
- `dotnet test LongevityDiet.sln -c Release --no-restore`: **107 unit + 111 integration PASS**, gồm bài kiểm tra soft delete + thêm lại/khôi phục qua API và cơ sở dữ liệu (SQLite test provider).
- Web `vitest` + Node service worker tests, lint (0 warnings), TypeScript/Vite build: PASS.
- Playwright Chrome trên Docker Desktop, thử cả Gemini dùng API thật và Admin tiếng Việt: **19/19 PASS** trên vòng sau khi sửa timeout của Gemini.
- Từng có 18/19 E2E: Gemini request bị frontend timeout 10 giây, backend 499. Đã nâng timeout **riêng** POST tạo thực đơn với `useAi=true` thành 50 giây, giữ nguyên 10 giây các request bình thường. Thử lại Gemini 1/1 PASS rồi cả 19/19 PASS.
- Với hai bản ghi đã biên tập, test tự động kiểm tra số lượng chính xác và provenance. Chờ thêm lượt E2E trang sách sau khi cập nhật nhãn review.
- SQL Server bản chạy: 6 container Compose; Web `/book` HTTP 200 và API `/ready` HTTP 200.

## D. Phạm vi chưa đạt 100% và các việc còn lại
1. **Tài liệu gốc:** duyệt thủ công từng bữa trong 54 bữa, xác minh danh sách nguyên liệu, dinh dưỡng và khẩu phần; xử lý mọi bản ghi thiếu nhãn. Trích xuất Phụ lục B thành bảng gồm food/serving/vitamin/vi chất/%DV và kiểm duyệt theo từng trang; Chương 1–12 phải được phân loại nguyên tắc/yếu tố nguy cơ/nghiên cứu/bối cảnh, không đổi thành phác đồ y khoa.
2. **AI:** tạo provenance cho từng món `BookExact`/ `Adapted`/`Demo`, yêu cầu duyệt dữ liệu theo sách trước khi chọn làm menu exact. Các món demo hiện không thể tự gọi là công thức của tác giả; nội dung số liệu AI cần kiểm định ngoài chat.
3. **CRUD xóa mềm còn lại:** các hàng con `MealLogItems`, recipe ingredients, allergens/join tables và một số quan hệ không có audit/revision; cần thiết kế versioning, migration và các test undo/historical. Ngoại lệ xóa endpoint/subscription bảo vệ quyền riêng tư.
4. **Nghiệm thu UI 100%:** 19 E2E cases không bao phủ mọi màn hình × mọi quyền × CRUD × mạng lỗi × dữ liệu biên; cần audit rộng hơn và một video thao tác liên tục không tua nhanh theo yêu cầu.
5. **Nhiều API replicas:** khóa mutation trong process chỉ đúng demo một container; production cần đảm bảo uniqueness/transaction ở SQL và thử cạnh tranh giữa nhiều instances.

**Kết luận tạm:** phần mềm và migration xóa mềm chính đã chạy/được kiểm thử. Bộ sách 350 dữ kiện chỉ là chứng cứ trích xuất, không chứng minh toàn bộ sách đã cấu trúc hóa hoặc AI đã book-exact. Chưa được phép ghi dự án đạt 100% nghiệm thu cuối.
