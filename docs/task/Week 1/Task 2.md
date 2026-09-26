# Task 2 - Food, Recipe, Diet Rule Catalog & Query Foundation

**Owner:** Thành viên 2  
**Reviewer:** Thành viên 4  
**Branch:** `feature/w1-t2-catalog-rules`  
**Status:** Not Started

## Mục tiêu
Tạo data foundation thật cho meal planning, recommendation, LDAS và admin. Không dùng hardcoded catalog hoặc mock data trong business flow.

## Phạm vi
### Domain & Persistence
Tạo `Food`, `Recipe`, `RecipeIngredient`, `Allergen`, `RecipeAllergen`, `DietRule`, `RuleVersion`, `RuleSetVersion`.

Food/Recipe phải có tối thiểu:
- active/inactive state;
- category, tag, cuisine;
- plant-based, legume, whole-grain, fish indicators;
- nutrition fields cần cho rule/ranking;
- allergen mapping;
- created/updated timestamps.

Diet rule phải có:
- stable RuleKey;
- title/description;
- source/evidence metadata;
- parameters;
- version/state;
- effective/published timestamp.

### Repository & Service
- EF Core configurations và migration.
- Reusable pagination result.
- Search/filter/sort/active-only query.
- FoodCatalogService.
- RecipeCatalogService.
- RuleCatalogService.
- Active RuleSet resolver.
- Allergen/exclusion helper.
- Published RuleVersion immutable.
- Rule thiếu provenance không được publish.

### REST API
Member:
- Food list/detail.
- Recipe list/detail.
- Active rule list/detail.

Admin:
- Food create/update/deactivate.
- Recipe create/update/deactivate.
- DietRule/RuleVersion create/update/publish.

Collection API bắt buộc chứng minh search + filter + sort + pagination.

### Seed Data
- Synthetic/original data, không copy copyrighted meal plan.
- Có plant-forward, legume, whole grain, fish, allergen examples.
- Có variation sugar/saturated-fat.
- Initial rule set có provenance rõ.

### Frontend
- Member catalog.
- Search/filter/sort/pagination.
- Recipe detail.
- Rule/source explanation.
- Admin Food/Recipe CRUD.
- RuleVersion create/publish workflow.

## Testing
- CRUD happy path + invalid input.
- Pagination boundaries.
- Search/filter/sort combinations.
- Inactive records không xuất hiện ở member query.
- Allergen mapping.
- Published RuleVersion immutable.
- Missing source/evidence publish bị reject.

## Deliverables
- Schema + migration.
- Deterministic seed.
- Repository/service/query layer.
- Member/Admin API.
- Member/Admin UI.
- Unit + integration tests.
- Swagger evidence.

## Definition of Done
Fresh database migrate + seed thành công; Admin thay đổi catalog/rule và Member thấy đúng active/published state qua UI/API; build/test pass.
