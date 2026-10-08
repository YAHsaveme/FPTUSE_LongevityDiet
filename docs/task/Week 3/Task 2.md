# Task 2 - Weekly Report + Worker Reliability & Recovery

**Owner:** Thành viên 2
**Reviewer:** Thành viên 4
**Branch:** `feature/w3-t2-report-worker-reliability`
**Status:** Planned

## Mục tiêu

Tạo weekly summary có business value đồng thời đưa async pipeline lên mức có retry, recovery và idempotency đáng tin cậy.

## Weekly report

- WeeklyReport, WeeklyReportMetric, generation version/status.
- Input: activity summary, LDAS trend, eating window, challenge, logging consistency.
- Worker generate theo local week boundary.
- Idempotent key: User + Week + ReportVersion.
- Historical report không bị rewrite âm thầm.
- API list/detail/current status + UI report page.

## Worker reliability

- Bounded retry/backoff.
- Dead-letter/recovery path.
- XACK chỉ sau business side effect thành công.
- Pending-entry recovery.
- ProcessedEvent unique EventId.
- Outbox retry metadata + cleanup/retention.
- Graceful shutdown/cancellation.
- Read-only diagnostics: pending/failed/heartbeat.

## Testing bắt buộc

- Duplicate weekly job.
- Empty/new user.
- Week/timezone boundary.
- Worker crash before/after side effect.
- Duplicate delivery.
- Redis/SQL unavailable.
- Poison message + pending recovery.
- Concurrent consumers.

## Definition of Done

Weekly report được tạo idempotently và Worker có thể restart/retry mà không mất message hoặc double side effect; failure quan sát và phục hồi được.
