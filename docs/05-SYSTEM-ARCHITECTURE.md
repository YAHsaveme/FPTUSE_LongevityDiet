# 05 — System Architecture

## 1. Architecture style
**Modular distributed application**: one primary layered REST API plus one independent gRPC recommendation service, one background Worker, relational DB and Redis Streams.

This intentionally avoids over-engineered microservices. The assignment requires distributed concepts, but a 9-week student team needs service boundaries that remain testable and operable.

## 2. Logical components
### React Web
- Authentication UI.
- Onboarding/profile.
- Meal plan/logging.
- Activity/eating window.
- LDAS dashboard.
- Challenge/reminder.
- Admin screens.

### ASP.NET Core REST API
Controller responsibilities:
- HTTP contract/status/validation boundary.
- Authentication/authorization boundary.
- Calls Application/Service layer.
- Records domain events in the transactional Outbox as part of the successful business transaction.

Service responsibilities:
- Business workflows.
- Ownership and rule checks.
- Plan/scoring orchestration.
- gRPC client orchestration.
- Mapping between entities/DTOs.

Repository responsibilities:
- EF Core queries.
- Pagination/filter/sort query construction.
- Persistence abstraction.

### SQL Server
System of record for users, catalog, rules, plans, logs, scores, events/audit metadata.

### Redis Streams
Asynchronous messaging.
Suggested streams:
- `ldc.domain-events`
- `ldc.notifications`
- `ldc.dead-letter`

### Worker Service
- Consumer group: `ldc-workers`.
- Score recalculation requests.
- Reminder processing.
- Weekly report generation.
- Retry/dead-letter management.

### Recommendation gRPC Service
Independent process/service.
- Receives candidate feature vectors + user constraints.
- Hard filters allergens/exclusions.
- Computes weighted rule-based ranking.
- Returns reason codes/components.
- Does not access credentials.
- May read reference config supplied in request or through controlled config, not the primary user database in MVP.

## 3. Main synchronous flow
`React → HTTPS/REST → API → Service → Repository → SQL Server`.

Recommendation flow:
`React → REST API → Service → gRPC Client → Recommendation Service → ranked result → API DTO → React`.

## 4. Main asynchronous flow
1. API commits business state and an `OutboxMessage` in one SQL transaction.
2. Worker Outbox publisher reads pending rows and publishes the event envelope to Redis Streams.
3. Worker consumer group receives the stream entry.
4. Worker checks `ProcessedEvent` idempotency.
5. Worker executes the background job.
6. Success → persist result if needed and acknowledge.
7. Transient failure → retry with capped attempts.
8. Retry exhausted → add to dead-letter stream and acknowledge the original entry.

## 5. Event envelope
```json
{
  "eventId": "uuid",
  "eventType": "MealLogged.v1",
  "occurredAtUtc": "2026-09-23T00:00:00Z",
  "correlationId": "uuid",
  "actorUserId": "uuid",
  "schemaVersion": 1,
  "payload": {}
}
```

## 6. Consistency strategy
For 9-week MVP:
- Core user transaction is authoritative in SQL.
- Event publication uses a simple `OutboxMessage` table.
- Background publisher sends pending outbox rows to Redis.
- This prevents “DB committed but event lost”.
- Worker idempotency prevents duplicate processing.

**Why Outbox?** It provides a strong architecture story for the final presentation and is realistic without introducing Kafka-scale complexity.

## 7. Recommendation algorithm boundary
Hard filters:
1. Active recipe.
2. Allergy exclusion.
3. User excluded ingredients.
4. Dietary pattern constraint.
5. Safety flags.

Then ranking signals:
- Plant-forward fit.
- Vegetable/legume/whole-grain features.
- Healthy-fat features.
- Refined-sugar/saturated-fat penalty.
- Variety/recent-history penalty.
- User preference.
- Plan macro/energy compatibility when data available.

No AI model is required for ranking. An optional local LLM can only transform structured reasons into natural-language explanation.

## 8. Security boundaries
- Browser never calls gRPC service directly.
- Redis and SQL are internal network services.
- JWT is validated at REST API.
- Worker uses internal configuration, no end-user JWT.
- gRPC accepts only internal network traffic in Docker Compose.
- Admin endpoints are role-protected and audited.

## 9. Failure behavior
- SQL unavailable → write/read requests fail with controlled ProblemDetails; readiness unhealthy.
- Redis unavailable → core transaction can commit to Outbox; publisher retries later.
- gRPC unavailable → recommendation endpoint returns service-unavailable/fallback list; logging still works.
- Worker unavailable → events stay pending; synchronous API still runs.
- Optional AI unavailable → structured reason codes are shown directly.

## 10. Deployment topology
Docker Compose services:
- `web`
- `api`
- `recommendation-grpc`
- `worker`
- `sqlserver`
- `redis`

Internal Docker network:
- Web exposes frontend port.
- API exposes REST/Swagger.
- gRPC/SQL/Redis are not intended for public exposure in production.
- Health checks and `depends_on` conditions coordinate startup for demo.

## 11. Why Redis Streams instead of Kafka
- Assignment explicitly permits Redis Pub/Sub or Streams.
- Streams support persistence, consumer groups and acknowledgements.
- Lower local resource/ops burden than Kafka.
- Easier Docker demo for 4-person/9-week scope.
- Still demonstrates producer, consumer, retry and DLQ.
Trade-off: Kafka would scale/partition ecosystems further, but that is not needed for this assignment.

## 12. Why gRPC for Recommendation
The assignment explicitly requires an independent gRPC service and lists recommendation as a typical use case. This boundary is cohesive: recommendation has a compact typed contract, can evolve independently, and creates a clear synchronous inter-service demo.

## 13. Architecture principles
- Keep services independently runnable.
- Keep API business rules out of controllers.
- Make safety constraints deterministic and testable.
- Prefer source-backed rules over generative output.
- Make event handling idempotent.
- Make architecture observable in logs.
- Design for demo reliability before cloud complexity.
