# Architecture Diagrams

This folder contains engineering C4/supporting views for Longevity Diet Companion.

## Architecture states
- **Current Runtime:** actual code/Docker Compose. Local Deployment must match it.
- **Target Architecture:** ADR-005. Target C1 and Production Target may show future Gateway/service/database boundaries, but must be labelled Target.

## Final diagram set
1. `01-system-context.drawio` - C4 System Context; actors + system + optional Local AI only.
2. `02-container-architecture.drawio` - C4 Container **Target Architecture**; Web, YARP Gateway, four REST domain services, Recommendation, Worker, six owned logical DBs, Event Streams and optional AI.
3. `03-docker-deployment.drawio` - Current Local Docker Compose deployment.
4. `04-api-component.drawio` - current API Component view; retained as current-runtime engineering detail until service split implementation.
5. `05-recommendation-dynamic.drawio` - Target recommendation collaboration.
6. `06-outbox-redis-dynamic.drawio` - Target per-service Outbox/Redis collaboration.
7-9. PRN232 coverage/demo support views.
10. `10-production-secure-deployment.drawio` - Production Target placement/security view.

## Target C1 rules
- Public HTTPS :443 -> Web/API Gateway edge.
- Gateway internal :8080; Identity :8081; Catalog :8082; Planning :8083; Tracking :8084; Recommendation gRPC :8085; Worker ops :8086.
- Redis :6379; SQL/TDS :1433; optional Local AI :11434.
- Every business service owns exactly one logical DB.
- No service connects directly to another service DB.
- Event Streams always has visible producers and consumers.
- C1 box copy stays minimal; route tables/event command details belong in docs/Dynamic views.

## Export/QA
Canonical editable source is draw.io XML. Export PNG/SVG after generation. Run project geometry lint plus vendored advanced draw.io QA, then inspect rendered PNG manually. A passing linter does not replace visual review.
