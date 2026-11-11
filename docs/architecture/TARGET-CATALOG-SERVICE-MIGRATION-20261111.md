# ADR-005 — Independent Catalog & Rules Service migration

Ngày cập nhật: 11/11/2026. **Đây là bước tách Catalog DB và tiến trình riêng, chưa phải full Target ADR-005.**

## Đã triển khai

- Project `src/LongevityDiet.Catalog` chạy ASP.NET Core .NET 9 riêng tại **:8082** trong Docker.
- **Sở hữu riêng** `LongevityCatalogDb` với 9 entity, bao gồm Food, Allergen, Recipe, RecipeIngredient/RecipeAllergen, DietRule, RuleVersion, RuleSetVersion, RuleAudit; mapping 100% lấy từ catalog configuration đã dùng cho hệ thống cũ.
- **EF migrations riêng**, không sử dụng `LongevityDietDbContext` cho service Catalog. Tách config và data seed qua `ICatalogSeedDbContext`, cho phép seed cùng dữ liệu demo ổn định ở catalog DB mà không truy cập DB khác.
- API `GET /api/v1/foods`, `GET /api/v1/foods/{id}`, `GET /api/v1/recipes`, `GET /api/v1/diet-rules`, `POST /api/v1/admin/foods`, `DELETE /api/v1/admin/foods/{id}`. JWT cùng issuer/audience nhưng được xác thực độc lập trên Catalog process; Admin role mới ghi dữ liệu. `/health` và `/ready` tách nhau, readiness kiểm tra DB.
- Opt-in `docker-compose.catalog.yml` dùng SQL Server Compose chung, nhưng **database logic riêng** `LongevityCatalogDb`. Port QA chỉ bind `127.0.0.1:18082`.

## Hạn chế còn lại

- Default `docker-compose.yml` vẫn dùng legacy API + MainDb Catalog để các luồng đang bán chạy đúng; **Gateway chưa routing sản phẩm sang Catalog DB mới** vì người lập kế hoạch còn đọc các recipe từ MainDb và chưa có transaction/outbox hai phía. Chuyển read-only routes mà không chuyển admin writer sẽ tạo dữ liệu lệch; không làm điều này.
- Admin CRUD mới hỗ trợ Food Create/SoftDelete, **chưa hỗ trợ toàn bộ Update/Recipe/Rule Governance**. Catalog chứa rule tables và seed, nhưng rule approval workflow vẫn ở transitional MainDb.
- Sau bước này vẫn cần chuyển trọn Catalog writer/read-model theo event, rồi tách Identity, Planning, Tracking domain services, Ownership Outbox, TLS443 và reviewer sign-off.
- Các test mới đều chạy trên **Docker project prn232-acceptance**, bằng JWT của user QA tổng hợp, chưa có phê duyệt chuyên gia dinh dưỡng. Seed nutrition values mang tính minh họa.

## Chạy thủ công trong môi trường QA

```powershell
cd D:\PRN232\FPTUSE_LongevityDiet
docker compose -p prn232-acceptance -f docker-compose.yml \
  -f D:\PRN232\DockerRuntime\prn232-acceptance.volumes.yml \
  -f docker-compose.catalog.yml --env-file .env up -d --build catalog
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Live-Catalog-Service.ps1
```

**Lưu ý:** Không đưa `.env` lên Git, không tự mở port QA ra internet. Có thể chạy cùng gateway overlay (7+1 container) nhưng không thay đổi đường đi của Web hay API mặc định.

## Bằng chứng và tiêu chuẩn công bố

- EF migration phải được áp dụng thật trên `LongevityCatalogDb`, seed 4 Foods/2 Recipes/2 Rules.
- JWT 401/200 và role 403, đọc 3 domain catalog thật trên DB riêng; Admin ghi/deactivate một sample QA.
- Các bộ kiểm thử Legacy .NET/Web/E2E và Gateway QA vẫn PASS.
- Chỉ ghi `Target Catalog Service slice PASS` sau khi Docker QA và GitHub CI đạt. **Không coi toàn bộ ADR-005 hay 16 task đạt 100%.**
