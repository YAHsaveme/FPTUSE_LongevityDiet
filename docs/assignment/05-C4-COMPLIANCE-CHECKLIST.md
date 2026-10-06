# C4 Compliance Checklist - Longevity Diet Companion

## 1. Diagram identity
| Check | C0 | C1 |
|---|---|---|
| Clear title/type/scope | PASS | PASS - Target Architecture |
| English naming | PASS | PASS |
| Legend/notation | PASS | PASS |
| One abstraction level | PASS | PASS |

## 2. C0 checks
- Shows Guest, Member, Administrator, Longevity Diet Companion and direct optional Local AI Runtime.
- Hides Gateway, services, databases, Redis, gRPC, Worker and ports.
- No implementation technology leaks into System Context.

## 3. C1 target checks
- Web Application reaches backend only through API Gateway.
- API Gateway is YARP; internal listener :8080 behind public HTTPS :443.
- Identity & Profile Service :8081 owns LongevityIdentityDb.
- Catalog & Rules Service :8082 owns LongevityCatalogDb.
- Planning Service :8083 owns LongevityPlanningDb.
- Tracking & Progress Service :8084 owns LongevityTrackingDb.
- Recommendation Service gRPC/HTTP2 :8085 owns LongevityRecommendationDb.
- Background Worker ops/health :8086 owns LongevityWorkerDb.
- Each DB link is EF Core/TDS :1433 and no service points at another service DB.
- Event Streams uses Redis 7 Streams :6379 and has explicit producers/consumers.
- Optional Local AI :11434 is external and explanation-only.
- No controller/repository/table/class details appear on C1.

## 4. Messaging
Logical Event Streams are shown as a C4 queue/topic-style data-store container. Domain services publish integration events; Worker and approved Recommendation read-model consumers initiate XREADGROUP/XACK operations. Redis server placement belongs to Deployment. Supporting Dynamic views show XADD, XREADGROUP, XACK and dead-letter order in detail.

## 5. Current/target separation
- C1 = approved Target Architecture from ADR-005.
- Local Deployment = actual current Docker Compose topology.
- Production Target = intended secure target topology.
- Documentation must never imply the target service split/database split is already implemented.

## 6. Automated quality gates
Validators check:
- required target element names and exact ports;
- six database ownership names;
- Gateway and target DSL relationships;
- current Local Deployment preservation;
- C0 abstraction leaks;
- draw.io XML validity and orthogonal routing;
- connector/text, connector/box, connector/connector collisions;
- advanced SVG edge-label/edge-rect/label-rect/text-overflow checks;
- assignment technology/physical DB coverage;
- Structurizr static checks and live validation when available.

## 7. Visual QA
At normal zoom: no label touches a connector; no connector crosses a box; each service/database pair is obvious; Gateway placement is unambiguous; Event Streams is visibly connected; text remains minimal.

## 8. Sources
Official C4 Model, diagrams.net guidance, Microsoft .NET microservices/data-ownership and API Gateway/YARP guidance, Redis Streams documentation, Architecture Decision Studio lecturer guidance, and reviewed project-local architecture skills.
