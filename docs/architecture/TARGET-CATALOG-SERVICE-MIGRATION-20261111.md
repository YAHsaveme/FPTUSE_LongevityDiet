# ADR-005 — Independent Catalog & Rules Service migration

Ngày cập nhật: 11/11/2026. **Đây là bước tách Catalog DB và tiến trình riêng, chưa phải full Target ADR-005.**

## Đã triển khai

- Project `src/LongevityDiet.Catalog` chạy ASP.NET Core .NET 9 riêng tại **:8082** trong Docker.
- **Sở hữu riêng** `LongevityCatalogDb` với 9 entity, bao gồm Food, Allergen, Recipe, RecipeIngredient/RecipeAllergen, DietRule, RuleVersion, RuleSetVersion, RuleAudit; mapping 100% lấy từ catalog configuration đã dùng cho hệ thống cũ.
- **EF migrations riêng**, không sử dụng `LongevityDietDbContext` cho service Catalog. Tách config và data seed qua `ICatalogSeedDbContext`, cho phép seed cùng dữ liệu demo ổn định ở catalog DB mà không truy cập DB khác.
- API Member `GET /api/v1/foods`, `GET /api/v1/foods/{id}`, `GET /api/v1/recipes`, `GET /api/v1/recipes/{id}`, `GET /api/v1/diet-rules`; Admin `POST/PUT/DELETE /api/v1/admin/foods[/{id}]` và `POST/PUT/DELETE /api/v1/admin/recipes[/{id}]` cùng `GET /api/v1/admin/recipes[/{id}]`. Food và Recipe có create/update/soft-deactivate trên DB riêng (giữ ID/lịch sử); Recipe kiểm tra Food/Allergen ID thực, từ chối trùng nguyên liệu/dị ứng; không cho xóa Food đang được Recipe active tham chiếu (409). JWT cùng issuer/audience xác thực độc lập tại Catalog process; Member không thể ghi. `/health` và `/ready` tách nhau, readiness kiểm tra DB.
- Opt-in `docker-compose.catalog.yml` dùng SQL Server Compose chung, nhưng **database logic riêng** `LongevityCatalogDb`. Port QA chỉ bind `127.0.0.1:18082`.

## Hạn chế còn lại

- Default `docker-compose.yml` vẫn dùng legacy API + MainDb Catalog để các luồng đang bán chạy đúng; **Gateway chưa routing sản phẩm sang Catalog DB mới** vì người lập kế hoạch còn đọc các recipe từ MainDb và chưa có transaction/outbox hai phía. Chuyển read-only routes mà không chuyển admin writer sẽ tạo dữ liệu lệch; không làm điều này.
- Admin CRUD mới hỗ trợ Food/Recipe Create/Update/SoftDelete trên service độc lập, **chưa chuyển Rule Governance, RuleVersion approval và event ownership**. Catalog có rule tables và seed, nhưng rule approval workflow vẫn ở transitional MainDb. Dữ liệu dinh dưỡng mẫu và khai báo dị ứng không phải xác nhận an toàn lâm sàng.
- Sau bước này vẫn cần chuyển trọn Catalog writer/read-model theo event, rồi tách Identity, Planning, Tracking domain services, Ownership Outbox, TLS443 và reviewer sign-off.
- Các test mới đều chạy trên **Docker project prn232-acceptance**, bằng JWT của user QA tổng hợp, chưa có phê duyệt chuyên gia dinh dưỡng. Seed nutrition values mang tính minh họa.

## Chạy thủ công trong môi trường QA

```powershell
cd D:\PRN232\FPTUSE_LongevityDiet
docker compose -p prn232-acceptance -f docker-compose.yml `
  -f D:\PRN232\DockerRuntime\prn232-acceptance.volumes.yml `
  -f docker-compose.gateway.yml -f docker-compose.catalog.yml `
  --env-file .env up -d --build gateway catalog
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Catalog-Service.ps1
node scripts/Test-Catalog-Admin-Http.mjs
```

**Lưu ý:** Không đưa `.env` lên Git, không tự mở port QA ra internet. Có thể chạy cùng gateway overlay (7+1 container) nhưng không thay đổi đường đi của Web hay API mặc định.

## Bằng chứng và tiêu chuẩn công bố

- EF migration phải được áp dụng thật trên `LongevityCatalogDb`, seed 4 Foods/2 Recipes/2 Rules.
- JWT 401/200 và Member role 403, đọc 3 domain Catalog thật trên DB riêng; `node scripts/Test-Catalog-Admin-Http.mjs` kiểm chứng **35 ca QA**, gồm SQL promotion đúng một Admin tổng hợp, Food/Recipe create/update/deactivate, Member chỉ đọc active, kiểm tra tham chiếu Food/Allergen và trùng nguyên liệu, page overflow, Food đang trong active Recipe không được deactivate, dữ liệu SQL vẫn lưu khi inactive. Bộ test `Test-Catalog-Service-Http.mjs` có 11 ca độc lập; kết quả từng commit cần được chạy lại trên Windows và GitHub Actions.
- Các bộ kiểm thử Legacy .NET/Web/E2E và Gateway QA vẫn PASS.
- Chỉ ghi `Target Catalog Service slice PASS` sau khi Docker QA và GitHub CI đạt. **Không coi toàn bộ ADR-005 hay 16 task đạt 100%.**
