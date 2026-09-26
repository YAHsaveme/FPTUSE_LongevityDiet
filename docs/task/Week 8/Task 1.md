# Task 1 - Migration, Seed, Backup & Restore Readiness

**Owner:** Thành viên 1  
**Reviewer:** Thành viên 3  
**Branch:** `feature/w8-t1-data-release-readiness`

## Mục tiêu
Bảo đảm database có thể tạo mới, nâng cấp và phục hồi có kiểm soát trước release candidate.

## Migration audit
- Review migration order.
- Không còn migration test/rác.
- Không sửa migration đã dùng chung nếu không có lý do migration strategy rõ.
- Fresh DB update từ zero.
- Existing DB update từ supported baseline.
- EF ModelSnapshot đồng bộ.

## Seed
- Idempotent strategy.
- Chỉ seed reference/demo data cần thiết.
- Không seed secret/password production.
- Synthetic demo data phân biệt với production/reference data.
- Stable keys cho rule/reference records.

## Backup/restore
Cho demo/local deployment:
- document SQL volume/database backup approach;
- verify restore;
- không commit backup binary vào repo.

## Data integrity checks
- FK/index.
- unique constraints.
- published rule references.
- orphan detection.
- required reference data.

## Testing
- fresh migrate.
- migrate twice/no-op.
- seed twice.
- upgrade path.
- restore verification.
- app starts after restore.

## Definition of Done
Một môi trường DB trống có thể migrate + seed bằng documented command; backup/restore được kiểm chứng và repo không chứa database dump không cần thiết.
