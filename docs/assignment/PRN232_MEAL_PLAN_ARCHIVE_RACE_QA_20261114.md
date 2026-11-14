# PRN232 — Ngăn tạo trùng kế hoạch và sửa lỗi lưu trữ (14/11/2026)

## Bằng chứng lỗi
- Sau khi merge PR #64, GitHub Actions run **43577966362** trên `main` (commit `622cac7`) thất bại tại `meal-plan-crud.spec.ts`: người dùng nhấn “Lưu trữ thực đơn”, UI nhận thông báo đã lưu trữ nhưng `GET /api/v1/meal-plans/current` trả **200** thay vì **404**.
- Trang Planner gắn `WellnessJourneyPanel` gọi `POST /meal-plans/ensure-current` để duy trì thực đơn 14 ngày. Người dùng đồng thời có thể tạo kế hoạch 7 ngày bằng `POST /meal-plans/generate`.
- Ở bản trước, hai request thuộc hai service scopes không có đồng bộ theo cùng `userId`. Cả hai có thể đọc chưa có/đang có kế hoạch Active và cùng lưu hàng mới. Repository chọn kế hoạch Active có revision/timestamp mới nhất, còn lưu trữ một bản không làm bản Active còn sót biến mất.

## Sửa đổi
1. `MealPlanMutationGate` tuần tự hóa các thao tác gây đổi phiên bản kế hoạch theo `userId` trong **cùng một tiến trình API**: đảm bảo 14 ngày, tạo thủ công, làm mới, lưu trữ.
2. Gate áp dụng từ lúc đọc trạng thái đến khi `SaveChangesAsync` hoàn tất, tránh đồng thời tạo các bản Active; tự giải phóng semaphore khi không còn request giữ/chờ, kể cả cancellation.
3. Khi người dùng chủ động lưu trữ, backend chuyển **mọi kế hoạch Active còn sót của chính user đó** sang Archived trong một lần lưu, không xóa lịch sử của bất cứ kế hoạch nào và không động vào tài khoản khác.
4. `ensure-current` vẫn từ chối tự tạo lại sau lệnh lưu trữ. Chỉ lệnh tạo thực đơn thủ công mới bắt đầu lại.
5. Thêm phép kiểm tra trạng thái lịch sử sau lưu trữ vào Playwright và bài thử concurrent HTTP vào Integration; hai unit tests kiểm tra tạo đồng thời và dữ liệu Active trùng từ build cũ.

## Nghiệm thu kỹ thuật
- **107/107 unit tests**, **110/110 integration tests** PASS trên .NET 9 Release; kiểm tra cả lệnh tạo lại theo yêu cầu sau khi lưu trữ.
- **19/19 Playwright E2E PASS** trên Docker Desktop/Chrome, trong đó có Gemini thật, Admin CRUD, thực đơn thủ công và lưu trữ, cảnh báo dị ứng, 14 ngày và giao diện responsive. API Docker được rebuild bằng `scripts/Start-Gemini-Docker-Demo.ps1` mà không hiển thị hoặc commit API key.
- SQL server/demo volume và danh mục món không bị xóa hoặc ghi đè để thử nghiệm. Không đổi schema, không đưa secret vào Git.

## Giới hạn phải công bố
- Khóa theo user này là **in-process**. Phù hợp demo một API container trên Docker Desktop. Khi chạy nhiều replica API có thể ghi chung SQL Server, cần khóa giao dịch phân tán hoặc ràng buộc duy nhất Active theo user trong DB và kịch bản khôi phục dữ liệu trước khi được gọi là production-ready.
- Không sửa các số liệu dinh dưỡng/luật trong sách Valter Longo. Chức năng liên quan sức khỏe vẫn là tham khảo, không phải đơn điều trị.
- Không khẳng định CI xanh nếu nhánh `main` sau merge chưa có GitHub Actions thành công; cần xác minh run mới nhất và video nghiệm thu thao tác thật riêng.
