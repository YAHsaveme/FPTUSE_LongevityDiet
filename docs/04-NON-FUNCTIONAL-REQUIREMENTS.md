# 04 — Non-Functional Requirements

## Security
- NFR-SEC-01 Passwords are hashed; never stored plaintext.
- NFR-SEC-02 JWT access token is short-lived; refresh token is revocable and stored hashed.
- NFR-SEC-03 Authorization checks ownership in service/domain logic, not only frontend.
- NFR-SEC-04 Validate request DTOs; do not bind EF entities directly.
- NFR-SEC-05 Secrets live in environment variables/user-secrets, never repository.
- NFR-SEC-06 Rate-limit auth and expensive recommendation endpoints.
- NFR-SEC-07 Admin rule/catalog changes create audit records.
- NFR-SEC-08 Logs redact passwords, tokens and unnecessary sensitive profile fields.
- NFR-SEC-09 CORS allowlist per environment.
- NFR-SEC-10 Containers run with least required privileges where practical.

## Reliability
- NFR-REL-01 Event consumer is idempotent using EventId + ProcessedEvent.
- NFR-REL-02 Redis consumer uses retry and dead-letter stream.
- NFR-REL-03 Worker restart does not duplicate weekly reports/reminders.
- NFR-REL-04 EF Core migrations are version-controlled and repeatable.
- NFR-REL-05 Health checks cover API, SQL, Redis and gRPC.
- NFR-REL-06 Graceful degradation: recommendation outage does not break food logging.
- NFR-REL-07 API uses timeouts/cancellation for gRPC calls.

## Performance
- NFR-PERF-01 p95 common GET target <= 500 ms on demo dataset.
- NFR-PERF-02 Collection endpoints paginate; default 20, max 100.
- NFR-PERF-03 gRPC recommendation target <= 300 ms excluding optional explanation rewrite.
- NFR-PERF-04 Index high-frequency user/date/status lookup columns.
- NFR-PERF-05 No N+1 query in main dashboard/plan endpoints.
- NFR-PERF-06 Cache only safe catalog/reference data; user-specific score remains authoritative in DB.

## Maintainability
- NFR-MNT-01 REST API follows API → Services → Repository.
- NFR-MNT-02 Business scoring/rule functions are pure/testable where possible.
- NFR-MNT-03 DTOs separate API contracts from persistence models.
- NFR-MNT-04 ADRs document major architecture choices.
- NFR-MNT-05 Public APIs documented in OpenAPI.
- NFR-MNT-06 Common errors and result patterns standardized.
- NFR-MNT-07 One feature branch/PR per roadmap task when practical.

## Observability
- NFR-OBS-01 Structured logging with trace/correlation ID.
- NFR-OBS-02 Log gRPC latency/status and Redis event processing result.
- NFR-OBS-03 Worker reports retry/dead-letter metrics.
- NFR-OBS-04 Health endpoints expose readiness/liveness semantics.
- NFR-OBS-05 Do not log sensitive request bodies by default.

## UX & Accessibility
- NFR-UX-01 Responsive desktop/mobile web.
- NFR-UX-02 Keyboard-accessible primary workflows.
- NFR-UX-03 Accessible labels, focus states and reasonable contrast.
- NFR-UX-04 Recommendation shows “Why this?” explanation.
- NFR-UX-05 Safety warnings use plain language.
- NFR-UX-06 Loading, empty and error states are designed for core pages.
- NFR-UX-07 Score chart never visually implies clinical certainty.

## Privacy
- NFR-PRI-01 Collect only data required for product logic.
- NFR-PRI-02 Demo uses synthetic users only.
- NFR-PRI-03 Optional AI receives minimum necessary context.
- NFR-PRI-04 User-facing privacy notice explains wellness/not-medical nature.
- NFR-PRI-05 Soft-deleted records are excluded from normal queries.
- NFR-PRI-06 Retention/deletion policy is documented even if account export/delete is post-MVP.

## Deployment
- NFR-DEP-01 Docker Compose starts API, gRPC, Worker, SQL Server, Redis and Web.
- NFR-DEP-02 Configuration is environment-specific.
- NFR-DEP-03 Database migration procedure documented.
- NFR-DEP-04 Seed procedure is deterministic for demo.
- NFR-DEP-05 README contains fresh-machine setup.
