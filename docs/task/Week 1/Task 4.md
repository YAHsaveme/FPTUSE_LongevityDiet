# Task 4 - gRPC Recommendation + Transactional Outbox + Redis Streams + Worker E2E

**Owner:** Thành viên 4  
**Reviewer:** Thành viên 2  
**Branch:** `feature/w1-t4-distributed-slice`  
**Status:** Not Started

## Architecture alignment (ADR-005)

- **Target owners:** API Gateway, Recommendation Service (`gRPC/HTTP2 :8085`), Background Worker (`Ops :8086`) and Event Streams (`Redis :6379`).
- **Owned data:** `LongevityRecommendationDb` and `LongevityWorkerDb`; each domain service keeps its own Outbox in its own database.
- **Critical rule:** the Outbox publisher belongs to the same service boundary as the Outbox it reads. Background Worker must not poll another service database.
- **Flow:** owning service commits state + Outbox -> `XADD` -> Worker `XREADGROUP` -> WorkerDb idempotency/job state -> `XACK` / result event.


## Mục tiêu

Hoàn thành sớm vertical slice thật cho **gRPC + Message Broker + Background Worker**, ba phần bắt buộc có trọng số cao của PRN232.

## gRPC Recommendation

- Tạo `recommendation.proto`.
- Request chứa profile/constraint summary + candidate meals.
- Response chứa ranked IDs, score components, reason codes và rejection reasons.
- Implement `RankMeals`.
- Hard filter trước; deterministic weighted ranking sau.
- Stable tie-break.
- AI không tham gia ranking.
- gRPC chạy như independent host/process, không nhúng vào REST controller.

## REST -> gRPC

- Typed gRPC client đăng ký qua DI/client factory.
- DTO/domain/protobuf mapping rõ.
- Service address lấy từ configuration.
- Deadline/timeout rõ.
- Propagate `CancellationToken`.
- Structured error handling.
- Recommendation endpoint.
- UI thin slice hiển thị recommendation + reason.
- Service-unavailable state.
- Không tạo channel/client thủ công theo từng request.

## Transactional Outbox

Tạo:
- `OutboxMessage`.
- `ProcessedEvent`.

Rules:
- Business state + OutboxMessage commit trong cùng SQL transaction.
- API không dual-write SQL + Redis.
- Event envelope có EventId/CorrelationId/schema version.
- Query pending outbox có bounded batch + index phù hợp.

## Redis Streams producer

- Publisher chạy **bên trong service boundary sở hữu Outbox** (ví dụ hosted background publisher của Tracking/Planning/Catalog/Identity), không phải central Worker đọc database của service khác.
- Chỉ poll pending Outbox của **chính service/database đang sở hữu publisher**.
- `XADD` lên Redis Streams :6379.
- EventId/CorrelationId/schema version.
- Mark published sau khi broker operation thành công.
- Bounded retry/backoff.
- Failure không làm mất Outbox row.
- Background Worker tuyệt đối không poll `LongevityIdentityDb`, `LongevityCatalogDb`, `LongevityPlanningDb` hoặc `LongevityTrackingDb` để lấy Outbox.

## Redis Streams consumer

- Consumer group + `XREADGROUP`.
- `ProcessedEvent` idempotency trong `LongevityWorkerDb` cho Worker-owned processing state.
- Worker chỉ persist job/retry/idempotency/operational side effect thuộc `LongevityWorkerDb`.
- Nếu kết quả business thuộc domain khác, Worker publish **result event**; service sở hữu domain consume event và persist vào database của chính nó.
- `XACK` chỉ sau successful processing/persistence hoặc sau khi result event đã được phát hành theo contract đáng tin cậy.
- Pending-entry visibility.
- Retry + dead-letter/recovery path.
- Stale pending entry có recovery strategy (`XPENDING` + claim/auto-claim hoặc tương đương).

Consumer không được chỉ log message. Phải tạo business side effect có thể kiểm chứng.

## Worker/DI quality

- Worker dùng Generic Host/BackgroundService.
- Không giữ scoped DbContext/service trong singleton lifetime.
- Tạo scope cho mỗi batch/unit-of-work khi cần.
- Loop bounded, hỗ trợ graceful shutdown/cancellation.
- Configuration được bind/validate tập trung.
- Không hardcode Redis/gRPC/SQL endpoint trong business code.

## Observability & health

- Structured EventId/CorrelationId.
- REST -> gRPC logs.
- Outbox -> Redis -> Consumer logs.
- Basic liveness/readiness.
- Failure state phân biệt gRPC unavailable, Redis unavailable và SQL unavailable.

## Testing

- Deterministic ranking.
- Hard exclusion.
- REST-gRPC integration.
- Deadline/cancellation.
- gRPC unavailable.
- Outbox same-transaction behavior.
- Producer/consumer.
- Duplicate event idempotency.
- XACK chỉ sau success.
- Pending recovery.
- Retry/dead-letter.
- Redis unavailable.
- Worker restart.
- No duplicate side effect after replay.

## Deliverables

- Real proto + independent gRPC service.
- API typed gRPC client.
- Recommendation UI thin slice.
- Service-owned Outbox schema/publisher + Worker-owned `ProcessedEvent`/job state.
- Redis producer/consumer group.
- Worker business processor + result-event contract cho domain-owned result.
- Health/log evidence.
- Distributed E2E evidence.

## Definition of Done

Demo lặp lại được:
1. Web -> API Gateway -> Planning -> gRPC/HTTP2 :8085 -> Recommendation -> ranked result -> UI.
2. Owning service business action -> own SQL + Outbox -> `XADD` Redis -> Worker `XREADGROUP`/idempotency -> `XACK`/result event -> owning service persists domain result.
3. Controlled failure/restart không làm mất event hoặc double side effect.

Rubric evidence phải đủ để giảng viên nhìn thấy riêng: gRPC interaction, producer, consumer và BackgroundService.
