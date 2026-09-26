# Task 1 - Authorization, Session Security & Privacy Hardening

**Owner:** Thành viên 1  
**Reviewer:** Thành viên 3  
**Branch:** `feature/w6-t1-security-hardening`

## Mục tiêu
Rà toàn bộ attack surface/auth flow trước release candidate.

## Authorization audit
- Member/Admin policies.
- Ownership checks mọi user-owned resource.
- Không tin UserId từ request body khi có current-user context.
- Admin endpoints có explicit authorization.
- FMD safety/admin audit endpoints protected.
- gRPC internal endpoint không expose unintended public behavior.

## Session security
- Access token lifetime/config.
- Refresh rotation/replay rejection.
- Cookie HttpOnly/Secure/SameSite/Path.
- Revoke/logout.
- Disabled user behavior.
- Secret không nằm trong source production config.

## Input/output security
- DTO validation.
- Over-posting prevention.
- ProblemDetails không leak stack trace production.
- Pagination/max page size.
- File/export input nếu có phải bounded.
- Log redaction.

## Privacy
- Review data minimization.
- Sensitive fields không log.
- Delete/deactivate policy được document.
- Audit và user data tách concern.

## Testing
- IDOR/ownership.
- Member gọi Admin API.
- expired/invalid JWT.
- revoked refresh token.
- disabled account.
- malformed input.
- log/response secret leakage scan.

## Definition of Done
Security regression suite chứng minh user không thể truy cập resource của user khác hoặc Admin surface; secret/token không bị leak qua logs/response.
