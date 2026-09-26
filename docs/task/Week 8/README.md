# Week 8 - Release Candidate & Deployment Readiness

## Mục tiêu tuần
Tạo release candidate có thể dựng từ clean machine/environment, migrate database an toàn, chạy regression và rollback khi cần.

## Phân công
| Task | Owner | Reviewer |
|---|---|---|
| Task 1 - Migration, Seed, Backup & Restore Readiness | Thành viên 1 | Thành viên 3 |
| Task 2 - Docker, Configuration, Secrets & CI Quality Gates | Thành viên 2 | Thành viên 4 |
| Task 3 - Automated Regression & End-to-End Release Test | Thành viên 3 | Thành viên 1 |
| Task 4 - Clean Deployment, Runbook, Rollback & Release Candidate | Thành viên 4 | Thành viên 2 |

## Exit criteria
- Fresh environment dựng được theo README/runbook.
- Migration + seed reproducible.
- CI/build/test gates pass.
- Full E2E release test pass.
- Có rollback/recovery procedure.
- RC version được chốt.
