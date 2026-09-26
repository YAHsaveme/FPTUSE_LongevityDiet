# Task 3 - Demo Data, Demo Script & Failure-Recovery Rehearsal

**Owner:** Thành viên 3  
**Reviewer:** Thành viên 1  
**Branch:** `demo/w9-rehearsal`

## Mục tiêu
Chuẩn bị demo repeatable, ngắn gọn nhưng chứng minh được architecture và business flow quan trọng.

## Demo data
- Synthetic accounts/data.
- Stable seed.
- Không dùng personal/sensitive real data.
- Có data đủ cho catalog, plan, activity, score, challenge, notification/report.
- Có Admin demo state.

## Main demo flow
1. Login/profile.
2. Catalog/plan/log.
3. Recommendation REST -> gRPC.
4. Business action tạo Outbox.
5. Redis/Worker side effect.
6. Dashboard/LDAS/challenge.
7. Admin rule/audit.
8. Docker/service evidence.

## Failure demo
Chuẩn bị ít nhất một controlled case:
- stop gRPC hoặc Redis;
- show graceful behavior/health;
- restore service;
- show recovery/idempotency.

Không thử failure nguy hiểm có thể phá submission data mà không backup.

## Rehearsal
- Time-box từng segment.
- Người nói/điều khiển rõ.
- Command copy/paste verified.
- Browser tabs/log views chuẩn bị trước.
- Có fallback nếu network/UI issue.

## Definition of Done
Team chạy full demo từ đầu đến cuối ít nhất hai lần liên tiếp mà không cần sửa data thủ công giữa chừng.
