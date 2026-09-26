# Task 4 - gRPC Recommendation + Transactional Outbox + Redis Streams + Worker E2E

**Owner:** Thành viên 4  
**Reviewer:** Thành viên 2  
**Branch:** `feature/w1-t4-distributed-slice`  
**Status:** Not Started

## Mục tiêu
Hoàn thành sớm vertical slice cho **gRPC + Message Broker + Background Worker**, ba phần bắt buộc có trọng số cao của PRN232.

## gRPC Recommendation
- Tạo `recommendation.proto`.
- Request chứa profile/constraint summary + candidate meals.
- Response chứa ranked IDs, score components, reason codes và rejection reasons.
- Implement `RankMeals`.
- Hard filter trước; deterministic weighted ranking sau.
- Stable tie-break.
- AI không tham gia ranking.

## REST -> gRPC
- Typed gRPC client.
- DTO/domain/protobuf mapping rõ.
- Deadline/timeout và CancellationToken.
- Structured error handling.
- Recommendation endpoint.
- UI thin slice hiển thị recommendation + reason.
- Service-unavailable state.

## Transactional Outbox
Tạo:
- OutboxMessage.
- ProcessedEvent.

Business state + OutboxMessage commit trong cùng SQL transaction. API không dual-write SQL + Redis.

## Redis Streams
Producer:
- Poll pending outbox.
- XADD.
- EventId/CorrelationId.
- Mark published.
- Retry.

Consumer:
- Consumer group + XREADGROUP.
- ProcessedEvent idempotency.
- Persist business side effect.
- XACK khi thành công.
- Retry + dead-letter/recovery path.

Consumer không được chỉ log message. Redis Streams consumer groups dùng pending-entry tracking và explicit XACK, phù hợp cho at-least-once worker processing.

## Observability
- Structured EventId/CorrelationId.
- REST -> gRPC logs.
- Outbox -> Redis -> Consumer logs.
- Health/readiness cơ bản.

## Testing
- Deterministic ranking.
- Hard exclusion.
- REST-gRPC integration.
- Outbox same-transaction behavior.
- Producer/consumer.
- Duplicate event idempotency.
- Retry/recovery.
- Redis unavailable.
- gRPC unavailable.

## Deliverables
- Real proto + gRPC service.
- API gRPC client.
- Recommendation UI thin slice.
- Outbox/ProcessedEvent schema.
- Redis producer/consumer.
- Worker business processor.
- Distributed E2E evidence.

## Definition of Done
Demo lặp lại được:
1. REST -> gRPC -> ranked recommendation -> UI.
2. Business action -> SQL + Outbox -> Redis -> Worker -> persisted result.
