# Task 2 - Weekly Report + Worker Reliability & Recovery

**Owner:** Thành viên 2
**Reviewer:** Thành viên 4
**Branch:** `feature/w3-t2-report-worker-reliability`
**Status:** Planned

## Architecture alignment (ADR-005)

- **Target owners:** Tracking & Progress Service owns `WeeklyReport` in `LongevityTrackingDb`; Background Worker owns only job/retry/idempotency state in `LongevityWorkerDb`.
- **Async flow:** Worker computes asynchronously and emits result; Tracking persists the domain result.
- **Guardrail:** Worker never reads/writes TrackingDb directly in the target architecture.


## Mục tiêu

Tạo weekly summary có business value đồng thời đưa async pipeline lên mức có retry, recovery và idempotency đáng tin cậy.

## Weekly report

- `WeeklyReport`, `WeeklyReportMetric`, generation version/status thuộc Tracking & Progress Service / `LongevityTrackingDb`.
- Input: activity summary, LDAS trend, eating window, challenge, logging consistency qua approved event/read-model contract.
- Worker schedule/compute job theo local week boundary bằng state trong `LongevityWorkerDb`, sau đó publish `WeeklyReportGenerated`/result event.
- Tracking & Progress Service consume result event và persist `WeeklyReport` vào `LongevityTrackingDb`.
- Idempotent key: User + Week + ReportVersion.
- Historical report không bị rewrite âm thầm.
- API list/detail/current status + UI report page.
- Worker không query/write `LongevityTrackingDb` trực tiếp.

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
