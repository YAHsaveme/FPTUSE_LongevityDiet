# Task 4 - Frontend State, Performance & Usability Regression

**Owner:** Thành viên 4  
**Reviewer:** Thành viên 2  
**Branch:** `feature/w7-t4-frontend-quality`

## Mục tiêu
Ổn định frontend data-state strategy, giảm request/render thừa và chạy usability regression toàn product.

## State management
- Server state qua React Query.
- Auth/session state tách rõ.
- Local UI state giữ local.
- Không duplicate server data sang global store nếu không cần.
- Query keys convention.
- Invalidation sau mutation chính xác.

## Performance
- Route-level lazy loading/code splitting nếu bundle cần.
- Avoid duplicate fetch.
- Pagination/virtualization chỉ khi thực sự cần.
- Memoization dựa trên profiling, không blanket useMemo.
- Optimize image/font/assets.
- Bundle analysis.

## Usability regression
Checklist theo journey:
- new user;
- returning user;
- incomplete profile;
- empty catalog/plan;
- network slow;
- admin workflow;
- mobile.

## Browser behavior
- reload nested route;
- back/forward;
- query-string state;
- form draft/unsaved behavior;
- session restore.

## Testing
- React component tests cho shared behavior.
- Integration/E2E browser smoke cho critical journeys nếu tooling cho phép.
- Bundle/build regression.
- API request count observation.
- Accessibility regression.

## Definition of Done
Critical journeys không duplicate request bất thường, không mất route state khi reload và frontend production build đạt quality baseline đã đặt.
