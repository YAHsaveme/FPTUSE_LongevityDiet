# System Architecture - C4

## 1. Modelling rule

This Assignment uses two architecture levels only:

- **C0 - System Context**
- **C1 - Container Architecture**

Official C4 terminology is **System Context** and **Container**. The Assignment labels C0/C1 are kept in file names and diagram titles so the deliverable matches the course wording.

## 2. C0 - System Context

### Purpose
Show the whole Longevity Diet Companion as **one software system**, the people that interact with it, and any directly connected external software systems.

### Elements

#### Guest
Uses LDC to view product information and register/sign in.

#### Member
Uses LDC to manage profile, meal plan, meal/activity tracking, adherence progress and recommendations.

#### Administrator
Uses LDC to manage catalog/rules and inspect operational/audit information.

#### Longevity Diet Companion
The software system in scope. It converts longevity-diet principles into a safe, explainable wellness-adherence workflow.

#### Optional Local AI Runtime
A direct optional external software dependency used only to rewrite deterministic structured explanations into friendlier natural language. It cannot modify ranking, safety constraints or LDAS.

### Relationships

| Source | Destination | Relationship |
|---|---|---|
| Guest | LDC | Views public information and creates/signs into an account |
| Member | LDC | Uses personalised planning, tracking, progress and recommendation features |
| Administrator | LDC | Manages catalog, rules and operational/audit data |
| LDC | Optional Local AI Runtime | Optionally rewrites deterministic structured explanations |

### What C0 intentionally does not show
- React
- REST API
- SQL Server
- Redis
- gRPC
- Worker
- controllers/services/repositories

Those are lower-level implementation details and belong in C1 or deeper views. The optional Local AI Runtime remains visible because it is a directly connected external software system rather than an internal implementation detail.

## 3. C1 - Container Architecture

### Purpose
Zoom into the LDC system boundary and show the **target deployable applications/data stores** and their communication for the completed Assignment MVP. The product is web-only; there is no Mobile App container.

### Containers

#### Web Application
**Technology:** React 19 + TypeScript + Vite + Nginx

Responsibilities:
- Browser UI.
- Public pages and authentication screens.
- Member/admin UI.
- Nginx serves the SPA and proxies `/api/*` requests to the REST API.

#### REST API
**Technology:** ASP.NET Core .NET 9

Responsibilities:
- REST/JSON endpoints.
- JWT authentication and role authorization.
- Business workflow orchestration.
- EF Core persistence.
- Writes business state and Outbox records in SQL.
- Calls Recommendation Service through gRPC.

Important: API -> Services -> Repository is an **internal component/layer structure**, not separate C1 containers.

#### Recommendation Service
**Technology:** ASP.NET Core gRPC .NET 9

Responsibilities:
- Independent service required by the Assignment.
- Applies hard constraints first.
- Performs deterministic weighted ranking.
- Returns score components and reason codes.
- Does not receive user credentials and does not own the primary database.

#### SQL Server
**Technology:** SQL Server 2022 + EF Core migrations

Responsibilities:
- System of record.
- Identity/profile data.
- Catalog/rules.
- Plans/logs/progress.
- Outbox and idempotency records.
- Audit/background result metadata.

#### Application Event Streams
**Technology:** Redis 7 Streams

Responsibilities:
- Logical queue/topic-style data stores for domain and notification events.
- Durable asynchronous event transport.
- Consumer-group processing and acknowledgements.
- Retry/dead-letter workflow.

C4 note: the logical streams are modelled as containers/data stores; the Redis broker/server itself belongs to deployment topology rather than being treated as a C4 container.

#### Background Worker
**Technology:** .NET 9 Worker Service

Responsibilities:
- Reads pending Outbox messages.
- Publishes events to Application Event Streams implemented with Redis 7 Streams.
- Consumes events with idempotency checks.
- Performs reminders, recalculations and weekly-report work.
- Writes asynchronous results back to SQL Server.

### Direct External Software System

#### Optional Local AI Runtime
**Technology:** Local LLM / Ollama-style HTTP API

Responsibilities:
- Optional rewrite of already-computed structured recommendation/progress reasons.
- Receives only minimized explanation context.
- Cannot change deterministic recommendation ranking, safety filters or LDAS.
- Failure falls back to structured/template explanations.

## 4. C1 Relationships

| Source | Destination | Intent | Technology |
|---|---|---|---|
| Guest | Web Application | Browse/register/sign in | HTTPS |
| Member | Web Application | Use member features | HTTPS |
| Administrator | Web Application | Use admin features | HTTPS |
| Web Application | REST API | Call application API | HTTPS + REST/JSON |
| REST API | SQL Server | Read/write business data and Outbox | EF Core / TDS |
| REST API | Recommendation Service | Request ranked meal alternatives | gRPC / HTTP2 |
| Background Worker | SQL Server | Read Outbox and write async results | EF Core / TDS |
| Background Worker | Application Event Streams | Publish pending events | Redis Streams XADD |
| Application Event Streams | Background Worker | Deliver queued events | Redis Streams XREADGROUP + XACK |
| REST API | Optional Local AI Runtime | Optionally rewrite structured explanation text | Local HTTP/JSON |

## 5. Architecture decisions visible in C1

### One primary REST API, not microservice sprawl
The project is a 9-week, 4-person Assignment. A modular REST API keeps business logic testable while still demonstrating real distributed boundaries through gRPC, Redis and Worker processes.

### One primary SQL database
The current architecture intentionally uses one SQL Server system of record. Splitting identity/catalog/progress into independent databases would add distributed consistency cost without adding assignment value.

### Transactional Outbox
The API does not directly dual-write SQL + Redis. It commits business state + Outbox record in SQL; the Worker publishes pending Outbox records later.

### Browser isolation
The browser never connects directly to SQL Server, Redis Streams or gRPC.

### Recommendation isolation
Recommendation is a cohesive independent gRPC boundary and remains deterministic/safety-first.

## 6. Diagram presentation standard

The draw.io diagrams follow the visual reference supplied by the team:

- white/grid canvas;
- light warm system boundary;
- white element cards;
- black/charcoal text and strokes;
- orthogonal arrows;
- short labels placed in whitespace;
- no decorative icons except C4 Person shape;
- no crossing text/lines;
- no unexplained abbreviations;
- one abstraction level per view;
- legend/key included.

## 7. Current implementation status

Implemented now:
- Web container baseline.
- REST API.
- SQL Server.
- JWT/profile identity foundation.
- Docker Compose.
- gRPC and Worker deployable shells.

Planned under Week 1 Tasks 2-4:
- catalog/rule domain;
- meal planning/logging;
- recommendation contract/implementation;
- transactional outbox;
- Redis Streams producer/consumer;
- Worker business processors.

The C1 diagram represents the **target Assignment MVP architecture**, while this status section prevents the document from falsely claiming every internal feature is already complete.
