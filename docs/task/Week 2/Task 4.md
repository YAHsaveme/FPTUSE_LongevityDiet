# Task 4 - App Shell + Design System + Unified UX Quality

**Owner:** Thành viên 4
**Reviewer:** Thành viên 2
**Branch:** `feature/w2-t4-app-ux-integration`
**Status:** Planned

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
