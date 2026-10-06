# ADR-005 — Target Service-Owned Data and API Gateway
Status: Accepted for Target Architecture
Date: 2026-10-06

## Context
The lecturer requires C1 to show clear internal services, how they communicate, explicit ports, a gateway for the web path, connected message infrastructure, and one database owned by each business service. The current repository remains a smaller modular distributed runtime and must not be misrepresented as already migrated.

## Decision
Adopt the following **Target Architecture** while preserving the current runtime until implementation occurs:

- Web Application uses one public HTTPS origin on port 443.
- YARP API Gateway is the public API boundary; internal listener port 8080.
- Identity & Profile Service: REST 8081, owns LongevityIdentityDb.
- Catalog & Rules Service: REST 8082, owns LongevityCatalogDb.
- Planning Service: REST 8083, owns LongevityPlanningDb.
- Tracking & Progress Service: REST 8084, owns LongevityTrackingDb.
- Recommendation Service: gRPC/HTTP2 8085, owns LongevityRecommendationDb.
- Background Worker: internal operations/health 8086, owns LongevityWorkerDb.
- Redis Streams uses internal port 6379 for integration events.
- SQL Server uses internal TDS port 1433; logical databases may share one SQL Server instance locally.
- Optional Local AI Runtime uses HTTP 11434 for explanation rewriting only.

## Data ownership
Each business service can read/write only its owned logical database. No cross-service SQL joins or foreign keys are allowed. Cross-service data moves through REST/gRPC contracts or versioned integration events. Copied read models are eventually consistent.

## Messaging
Each domain service writes its own Outbox record atomically with business state and publishes its own events using XADD. Background Worker and Recommendation consumers use XREADGROUP/XACK and persist idempotency in their own databases. Worker never polls or writes another service's database.

## Gateway routing
- /api/v1/auth/**, /api/v1/me/** -> Identity & Profile Service :8081
- /api/v1/foods/**, /api/v1/recipes/**, catalog/rule admin routes -> Catalog & Rules Service :8082
- /api/v1/meal-plans/**, /api/v1/challenges/**, /api/v1/fmd/**, /api/v1/recommendations/** -> Planning Service :8083
- /api/v1/meal-logs/**, /api/v1/activity-logs/**, /api/v1/eating-windows/**, /api/v1/adherence/**, /api/v1/progress/**, /api/v1/weekly-reports/** -> Tracking & Progress Service :8084
- /api/v1/admin/jobs/**, /api/v1/admin/events/**, /api/v1/admin/dead-letter/** -> Worker operations endpoint :8086

## Consequences
- Service/data ownership is explicit and independently evolvable.
- The SPA is insulated from internal service addresses.
- Redis Streams has explicit producers/consumers rather than appearing as isolated infrastructure.
- Cross-service workflows become eventually consistent and require versioned events/idempotency.
- Target complexity is higher than the current runtime, so implementation is intentionally separate from this documentation revision.

## Scope
ADR-001 remains the accepted description of **Current Runtime**. This ADR supersedes ADR-001 only for the **Target Architecture** shown in Target C1 and Production Target views.
