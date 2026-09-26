# Task 1 - Critical Bug Fixing & Security Regression

**Owner:** Thành viên 1  
**Reviewer:** Thành viên 3  
**Branch:** `release/w9-stabilization`

## Mục tiêu
Ổn định RC dưới feature freeze; ưu tiên bug có khả năng phá demo, dữ liệu, auth/safety hoặc distributed flow.

## Triage
Severity:
- Critical: data loss, auth bypass, app không chạy, mandatory PRN232 flow hỏng.
- High: major feature unusable, worker/message loss, severe UX blocker.
- Medium/Low: sửa nếu không gây risk regression.

## Regression focus
- auth/session/ownership;
- admin authorization;
- FMD safety gate;
- recommendation hard constraints;
- SQL migrations;
- gRPC unavailable behavior;
- Redis idempotency/recovery;
- browser reload/routes;
- Docker restart.

## Fix discipline
- Reproduce trước khi fix.
- Add regression test khi hợp lý.
- Small targeted changes.
- Reviewer khác owner.
- Không "clean up lớn" trong cùng bug fix.

## Security regression
- secret scan;
- invalid JWT;
- refresh replay;
- IDOR;
- member/admin boundaries;
- log redaction.

## Definition of Done
Không còn Critical/High issue chưa có mitigation chấp nhận được và regression suite vẫn pass sau mọi fix.
