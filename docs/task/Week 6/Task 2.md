# Task 2 - Resilience, Rate Limiting, Health & Readiness

**Owner:** Thành viên 2  
**Reviewer:** Thành viên 4  
**Branch:** `feature/w6-t2-resilience-health`

## Mục tiêu
Làm hệ thống phản ứng có kiểm soát khi dependency chậm/hỏng thay vì treo hoặc cascade failure.

## Resilience
- gRPC deadline/timeout.
- CancellationToken propagation.
- Retry chỉ cho transient/idempotent operation.
- Không retry vô hạn.
- Bounded backoff.
- Redis/SQL transient failure policy phù hợp.

## Rate limiting
Áp policy cho:
- auth endpoints;
- expensive recommendation endpoints;
- admin operations nếu cần.

Response phải rõ và không phá frontend UX.

## Health/readiness
Tách khái niệm:
- liveness: process còn sống;
- readiness: dependency cần thiết để nhận traffic sẵn sàng.

Checks phù hợp:
- SQL;
- Redis;
- gRPC service;
- Worker heartbeat/readiness nếu cần.

## Configuration
- Policy values từ config.
- Environment override.
- Không magic constants.

## Testing
- gRPC timeout;
- cancellation;
- dependency unavailable;
- retry stops đúng limit;
- rate limit threshold;
- health state transition;
- startup khi optional dependency unavailable.

## Definition of Done
Khi SQL/Redis/gRPC bị tắt có chủ đích, API/Worker fail predictably, health phản ánh đúng và không có retry storm.
