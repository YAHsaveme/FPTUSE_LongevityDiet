# Task 4 - App Shell + Design System + Unified UX Quality

**Owner:** Thành viên 4
**Reviewer:** Thành viên 2
**Branch:** `feature/w2-t4-app-ux-integration`
**Status:** In Progress (responsive Web, JWT session, YARP Gateway and Playwright E2E verified; full accessibility review/TLS/reviewer pending)

## Architecture alignment (ADR-005)

- **Target owners:** Web Application + API Gateway.
- **Communication:** browser uses HTTPS :443; all backend API calls pass through Gateway; browser never calls internal services, gRPC, SQL or Redis directly.
- **UX rule:** route/service errors are presented consistently without exposing internal service topology to the user.


## Mục tiêu

Tích hợp các page thành một application thống nhất, responsive, accessible và có error/loading/validation behavior nhất quán.

## App integration

- AppShell, header/sidebar/mobile navigation.
- Member/Admin route groups.
- Protected/role-aware navigation.
- Session-expiry và return URL thống nhất.
- Main journeys không có route dead-end.

## Design & shared UI

- Typography/spacing/radius/focus/breakpoint foundations.
- Reuse Button, FormField, Card, Status, Modal, EmptyState, Skeleton, Alert, Pagination khi có giá trị.
- Giữ visual identity hiện có.
- Keyboard navigation, visible focus, labels, heading hierarchy, reduced motion.

## Unified state/error

- Shared ProblemDetails/error parser.
- Field validation mapping.
- 401/403/404/409/429/5xx handling.
- Không spinner vô hạn hoặc retry gây double-submit.
- React Query/server-state convention; invalidate đúng sau mutation.
- Route-level lazy loading và tránh duplicate request.

## Testing bắt buộc

- Anonymous/member/admin navigation.
- Reload nested route/session restore.
- Validation/conflict/network timeout.
- Keyboard/focus.
- Mobile/tablet/desktop critical screens.
- Production frontend build/bundle regression.

## Definition of Done

Critical Member/Admin journeys chạy trong một shell thống nhất; responsive/accessibility/error/loading state đủ tốt để demo và không còn hardcoded/mock production state.


## Verified Current Runtime checkpoint (11/11/2026)

- Web lint/test/build, Playwright 10/10 across mobile+desktop, Edge CDP layout 6/6, Nginx default API + optional YARP Gateway auth 200/401/403 PASS; full keyboard/screen-reader manual review not signed.
- Official PDF source matrix: scripts/Validate-Prn232-Final-PDF.cjs; full technical QA runner: scripts/Test-Prn232-Final-Acceptance.ps1. This checkpoint is not reviewer sign-off or proof the ADR-005 Target Architecture is deployed.
