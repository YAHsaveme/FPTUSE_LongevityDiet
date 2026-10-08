# Week 4 - Hardening, Release, Demo & Submission

## Mục tiêu tuần

**Feature freeze.** Không mở rộng domain mới. Tập trung làm hệ thống an toàn, ổn định, deploy được, có evidence và demo repeatable.

## Phân công

| Task | Owner | Reviewer |
|---|---|---|
| Task 1 - Security, Resilience, Observability & Performance | Thành viên 1 | Thành viên 3 |
| Task 2 - Database, Docker, Configuration, CI & Deployment Readiness | Thành viên 2 | Thành viên 4 |
| Task 3 - Release Regression, PRN232 Evidence & Demo Rehearsal | Thành viên 3 | Thành viên 1 |
| Task 4 - Critical Fixes, Final Docs & Submission Integrity | Thành viên 4 | Thành viên 2 |

## Feature freeze rules

- Chỉ sửa Critical/High blocker hoặc vấn đề ảnh hưởng grading/demo/reliability/security.
- Không refactor lớn nếu không có evidence về defect/bottleneck.
- Mọi fix phải có regression phù hợp.
- Không đổi architecture sát deadline nếu không bắt buộc.

## Integration order

1. Hardening security/resilience/observability/performance.
2. Fresh DB + Docker/CI/deploy verification.
3. Full regression + PRN232 evidence + demo rehearsal.
4. Fix blocker, final docs, clean tree, package/submission.

## Week exit criteria

- Zero known Critical blocker.
- Fresh environment build/migrate/run được.
- Full regression/E2E pass.
- Mandatory PRN232 evidence đầy đủ.
- Demo chạy repeatable.
- Final source tree sạch, không secret/generated junk/stale task docs.
