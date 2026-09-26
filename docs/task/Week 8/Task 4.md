# Task 4 - Clean Deployment, Runbook, Rollback & Release Candidate

**Owner:** Thành viên 4  
**Reviewer:** Thành viên 2  
**Branch:** `feature/w8-t4-release-candidate`

## Mục tiêu
Chứng minh một người không tham gia setup ban đầu vẫn có thể dựng và vận hành RC từ tài liệu.

## Clean deployment test
Trên clean workspace/environment:
- prerequisites;
- clone/copy source;
- configure environment;
- build;
- migrate/seed;
- docker compose;
- health check;
- browser/API verification.

## Runbook
Document:
- start;
- stop;
- restart;
- logs;
- health;
- migration;
- seed;
- backup/restore;
- Redis inspection;
- Worker failure recovery;
- common troubleshooting.

## Rollback
- app image/version rollback.
- database rollback policy phải thực tế; ưu tiên forward-fix khi destructive rollback nguy hiểm.
- config rollback.
- failed deployment recovery.

## RC checklist
- version/tag candidate.
- migration list.
- known issues.
- demo credentials strategy.
- environment assumptions.
- test evidence references.

## Testing
- second-person clean setup.
- restart persistence.
- service crash/recovery.
- bad config fail-fast.
- rollback drill tối thiểu.

## Definition of Done
RC có thể được dựng từ documented steps trên clean environment và có recovery path cho failure phổ biến.
