# Task 1 - Identity, Authentication, Profile & Onboarding End-to-End

**Owner:** Thành viên 1 (bạn)  
**Reviewer:** Thành viên 3  
**Branch:** `feature/w1-t1-auth-profile`  
**Status:** Done

## Mục tiêu

Hoàn thiện identity foundation để mọi feature sau có current user, ownership, role, session và profile personalization đáng tin cậy.

## Đã hoàn thành - không làm lại

### Domain & persistence
- `User`, `UserProfile`, `RefreshToken`.
- `LongevityDietDbContext` + EF mappings.
- User/RefreshToken repositories.
- IdentityFoundation migration.
- SQL Docker host port design: `14330 -> 1433`.
- Fresh SQL Server database migration đã được nghiệm thu từ zero.
- Development SQL/JWT secrets đã chuyển sang .NET User Secrets.

### Authentication & authorization
- ASP.NET Core password hashing.
- JWT access token.
- Refresh-token rotation.
- SHA-256 refresh-token hash persisted in SQL.
- HttpOnly refresh cookie.
- Register/Login/Refresh/Revoke services and controllers.
- Disabled-account check trong login/refresh.
- Reusable `ICurrentUser` abstraction.
- Member/Admin authorization policy foundation.
- Centralized service-error -> RFC7807 ProblemDetails mapping.
- OpenAPI Bearer security scheme + protected-operation security metadata.
- Raw refresh token không được persist trong DB/localStorage.

### Profile & frontend
- Profile GET/PUT.
- React `AuthProvider`.
- Session bootstrap qua refresh endpoint.
- `ProtectedRoute`.
- Login/Register.
- Onboarding/Profile editor.
- Logout từ Profile.
- Anonymous -> Login redirect.
- Incomplete profile -> Onboarding redirect.
- Completed profile -> App redirect.
- Premium HomePage đã khôi phục và auth-aware.
- Route-level lazy loading/code splitting.
- Main frontend JS chunk giảm từ khoảng 611 kB xuống khoảng 338 kB và không còn Vite >500 kB warning.

### Testing & engineering quality
- `LongevityDiet.UnitTests`: 8/8 pass.
- `LongevityDiet.IntegrationTests`: 7/7 pass.
- `LongevityDiet.E2ETests`: 1/1 Playwright + Chrome browser E2E pass.
- Integration tests dùng `WebApplicationFactory<Program>` + SQLite in-memory.
- Coverage hiện có:
  - protected profile -> 401;
  - duplicate email case-insensitive -> 409 + ProblemDetails;
  - wrong password -> 401;
  - register -> profile -> refresh -> revoke;
  - refresh cookie HttpOnly/Secure/SameSite=Strict/path;
  - OpenAPI Bearer scheme + protected profile security;
  - disabled account login/refresh;
  - refresh rotation/replay;
  - profile completion.
- Full solution build: 0 warnings / 0 errors.
- Repository-wide `.editorconfig` + analyzer/build policy.
- Test-only appsettings không được publish.

### Runtime verification
Đã pass:
- fresh SQL Server migration trên database tạm;
- `/health` HTTPS 200;
- SPA root HTTPS 200 và có React root;
- `/openapi/v1.json` HTTPS 200;
- OpenAPI runtime có Bearer scheme;
- verification database đã được drop sau test;
- Docker Compose static config;
- Docker images `api`, `web`, `worker`, `recommendation-grpc` build;
- full Compose runtime cho Web/API/gRPC/Worker/SQL/Redis;
- API health 200, Web 200, Web -> API proxy 401 đúng với protected profile;
- Redis PONG, gRPC TCP reachable;
- full Compose restart và service availability sau restart.
- browser E2E pass: Register -> Onboarding -> App -> reload/session restore -> Profile update/persistence -> Logout -> protected redirect.

## Acceptance criteria

- Không lưu raw refresh token trong DB hoặc localStorage.
- Password không log/return.
- User chỉ đọc/sửa profile của chính mình.
- Email unique case-insensitive theo normalized value.
- Refresh-token rotation chống replay token cũ.
- Disabled account không tạo session mới.
- Swagger/OpenAPI mô tả Bearer auth đúng.
- Frontend không dùng mock identity data.
- Browser E2E chạy bằng Chrome thật và pass toàn bộ identity/profile flow.

## Definition of Done

**DONE.** Browser E2E, Unit/Integration tests, fresh SQL migration, HTTPS runtime và Docker runtime đều đã nghiệm thu; full solution build 0 warnings/0 errors.
