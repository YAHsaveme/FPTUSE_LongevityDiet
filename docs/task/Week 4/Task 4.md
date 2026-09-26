# Task 4 - Worker Reliability, Retry, Recovery & Outbox Operations

**Owner:** Thành viên 4  
**Reviewer:** Thành viên 2  
**Branch:** `feature/w4-t4-worker-reliability`

## Mục tiêu
Đưa async pipeline từ demo-level lên mức vận hành đáng tin cậy.

## Reliability
- bounded retries;
- exponential/backoff policy phù hợp;
- dead-letter/recovery stream;
- XACK chỉ sau khi business side effect thành công;
- pending-entry recovery;
- consumer identity rõ;
- graceful shutdown/cancellation.

Redis consumer groups theo dõi pending entries và yêu cầu explicit acknowledgement; stale messages phải có recovery strategy.

## Outbox operations
- batch size/config.
- published timestamp.
- retry metadata.
- cleanup/retention job.
- poison-message visibility.
- index cho unpublished query.

## Idempotency
- ProcessedEvent unique EventId.
- transaction scope rõ.
- replay safe.
- duplicate delivery không double side effect.

## Operational API/Admin
Read-only diagnostics:
- pending outbox count;
- failed message count;
- last successful worker heartbeat;
- optional retry/requeue action chỉ Admin.

## Testing
- worker crash before/after side effect;
- duplicate delivery;
- Redis unavailable;
- SQL unavailable;
- poison message;
- cancellation;
- concurrent consumers;
- recovery of pending entry.

## Definition of Done
Có thể cố ý gây failure, restart Worker và chứng minh message không mất, không double side effect và failure quan sát được.
