# Task 1 - Application Shell, Navigation & Role-Aware Integration

**Owner:** Thành viên 1  
**Reviewer:** Thành viên 3  
**Branch:** `feature/w7-t1-app-shell-integration`

## Mục tiêu
Biến các page rời rạc thành application shell thống nhất cho Member/Admin và các lifecycle auth/profile.

## Scope
- Main app layout.
- Header/sidebar/navigation.
- Member routes.
- Admin routes.
- ProtectedRoute/policy-aware route.
- Breadcrumb/context title khi cần.
- Notification/profile entry.
- Logout/session-expiry behavior.

## User journeys cần kiểm tra
1. Register -> Onboarding -> Dashboard.
2. Dashboard -> Plan -> Replace -> Log.
3. Activity -> LDAS -> Challenge -> Progress.
4. Notification -> deep link.
5. Profile/preferences.
6. FMD education/safety flow.
7. Admin catalog/rules/audit.

## Integration rules
- Route không duplicate page shell.
- Không hardcode role check ở nhiều nơi nếu có shared policy helper.
- Navigation item ẩn/hiện theo permission nhưng backend vẫn là authority.
- Preserve return URL hợp lý sau login.
- Session expiration xử lý thống nhất.

## Frontend
- AppShell component.
- Route groups.
- Mobile navigation.
- Active route state.
- Accessible landmark/nav semantics.
- Unsaved-change warning nếu form quan trọng cần.

## Testing
- anonymous/protected route;
- incomplete profile;
- member/admin navigation;
- deep link;
- refresh on nested route;
- expired session;
- responsive nav.

## Definition of Done
Các feature từ Week 1-6 truy cập qua một shell thống nhất, không có route dead-end hoặc role leak.
