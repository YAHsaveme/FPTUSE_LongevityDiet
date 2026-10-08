# Task 2 - Food, Recipe, Diet Rule Catalog & Query Foundation

**Owner:** Thành viên 2  
**Reviewer:** Thành viên 4  
**Branch:** `feature/w1-t2-catalog-rules`  
**Status:** Not Started

## Mục tiêu

Tạo data foundation thật cho meal planning, recommendation, LDAS và admin; đồng thời chứng minh phần REST CRUD + search/filter/sort/pagination của rubric PRN232 bằng contract rõ và test được.

## Phạm vi

### Domain & Persistence

Tạo `Food`, `Recipe`, `RecipeIngredient`, `Allergen`, `RecipeAllergen`, `DietRule`, `RuleVersion`, `RuleSetVersion`.

Food/Recipe tối thiểu có:
- active/inactive state;
- category, tag, cuisine;
- plant-based, legume, whole-grain, fish indicators;
- nutrition fields cần cho rule/ranking;
- allergen mapping;
- created/updated timestamps.

Diet rule tối thiểu có:
- stable RuleKey;
- title/description;
- source/evidence metadata;
- parameters;
- version/state;
- effective/published timestamp.

### Repository & Service

- EF Core configurations và migration.
- Reusable bounded pagination result.
- Search/filter/sort/active-only query.
- FoodCatalogService.
- RecipeCatalogService.
- RuleCatalogService.
- Active RuleSet resolver.
- Allergen/exclusion helper.
- Published RuleVersion immutable.
- Rule thiếu provenance không được publish.
- Read-only query dùng projection/`AsNoTracking()` phù hợp.
- Index/query design dựa trên query thật, không thêm index vô căn cứ.

### REST API

Member:
- Food list/detail.
- Recipe list/detail.
- Active rule list/detail.

Admin:
- Food create/update/deactivate.
- Recipe create/update/deactivate.
- DietRule/RuleVersion create/update/publish.

Collection API bắt buộc chứng minh:
- search;
- filtering;
- sorting;
- pagination;
- bounded page size;
- deterministic ordering.

### RESTful contract quality gate

- Normal resource route dùng danh từ/resource, không nhét CRUD action verb vào URL.
- GET không tạo side effect.
- POST create dùng success status phù hợp; khi tạo resource định danh được, trả resource/location phù hợp.
- Update/delete dùng status semantics nhất quán.
- Không tìm thấy -> 404.
- Validation -> 400 RFC7807/ProblemDetails.
- Unauthorized -> 401.
- Forbidden -> 403.
- Conflict/version/state conflict -> 409 khi phù hợp.
- `ProducesResponseType`/OpenAPI mô tả các response quan trọng.
- Không expose EF Core entity trực tiếp nếu DTO phù hợp hơn.
- Member endpoint không trả inactive/unpublished data.
- Admin endpoint có explicit authorization.

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
- Loading/empty/error state.

## Testing

- CRUD happy path + invalid input.
- 201/location behavior khi create resource phù hợp.
- 404 missing resource.
- 401/403 authorization.
- 409 state/version conflict khi có.
- Pagination boundaries/max page size.
- Search/filter/sort combinations.
- Deterministic sort order.
- Inactive records không xuất hiện ở member query.
- Allergen mapping.
- Published RuleVersion immutable.
- Missing source/evidence publish bị reject.
- OpenAPI có contract/status quan trọng.

## Deliverables

- Schema + migration.
- Deterministic seed.
- Repository/service/query layer.
- Member/Admin API.
- Member/Admin UI.
- Unit + integration tests.
- Swagger/OpenAPI evidence.
- PRN232 REST evidence cho CRUD + search/filter/sort/pagination.

## Definition of Done

Fresh database migrate + seed thành công; Admin thay đổi catalog/rule và Member thấy đúng active/published state qua UI/API; REST contract/status/OpenAPI đúng; rubric CRUD/query có automated/runtime evidence; build/test pass.
