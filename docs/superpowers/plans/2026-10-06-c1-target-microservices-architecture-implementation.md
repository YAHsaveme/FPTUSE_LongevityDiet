# C1 Target Microservices Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Assignment C1 with a clearly labelled target architecture using YARP API Gateway, database-per-service ownership, explicit ports, explicit Redis producers/consumers, and aligned C4/Draw.io/docs/validators without pretending the target is already implemented in code.

**Architecture:** Keep the current Docker/runtime and business code unchanged. Model a separate Target C1 inside the same Longevity Diet Companion system: Web -> API Gateway -> four REST domain services, Planning -> Recommendation by gRPC, each business service owning one logical SQL database, Worker owning WorkerDb, and Redis Streams connecting explicit producers/consumers. Preserve C0 and current Local Deployment as current-state views; update the Production Target and Dynamic views to match the target model.

**Tech Stack:** C4 Model, Structurizr DSL, draw.io/diagrams.net, PowerShell validators, Node-based draw.io QA, ASP.NET Core .NET 9 concepts, YARP, SQL Server 2022, Redis 7 Streams, gRPC/HTTP2.

**Spec:** `docs/superpowers/specs/2026-10-06-c1-target-microservices-architecture-design.md`

## Global Constraints
- This phase updates architecture documentation/models/diagrams/validators only; do not split product code or change `docker-compose.yml` runtime services.
- C1 must be labelled `Target Architecture` or `Target MVP` and must not be presented as current runtime.
- Public edge: HTTPS `:443`; Gateway internal listener `:8080`; Identity `:8081`; Catalog `:8082`; Planning `:8083`; Tracking `:8084`; Recommendation gRPC `:8085`; Worker ops/health `:8086`; Redis `:6379`; SQL `:1433`; Local AI optional `:11434`.
- Each business service owns exactly one logical SQL database; no service may directly read another service's database.
- Exact ownership: Identity & Profile -> `LongevityIdentityDb`; Catalog & Rules -> `LongevityCatalogDb`; Planning -> `LongevityPlanningDb`; Tracking & Progress -> `LongevityTrackingDb`; Recommendation -> `LongevityRecommendationDb`; Background Worker -> `LongevityWorkerDb`.
- Event Streams must show explicit producers and consumers; each service publishes its own Outbox events from within its boundary.
- Background Worker never reads another service database and never writes another service's owned domain database.
- Recommendation Service owns `LongevityRecommendationDb` and may receive copied read-model data only via APIs/events.
- C0 remains high-level and must not expose microservice internals.
- C1 uses English names, minimal text, orthogonal connectors, reserved label corridors, and no line/text/box collisions.
- Current Local Deployment remains truthful to the current Compose topology; Production Target is allowed to show the intended target topology.
- Do not run unreviewed third-party setup scripts; vendored skill content is copied only after inspection.

## Review Focus
- Current-vs-target ambiguity: every target-only service/database/gateway must be explicitly marked as target while current local runtime remains unchanged.
- Data sovereignty: no C1/DSL relationship may connect a service directly to another service's database.
- Async correctness: Redis must have both producer and consumer relationships, with no central Worker polling another service's Outbox table.
- Port consistency: all diagram, DSL, docs, and validation references must use the exact agreed port map.
- Visual legibility: labels must not touch connectors, connectors must not cross boxes, and dense service/database rows must remain readable at normal export zoom.

---

## File Map

### Create
- `docs/adr/ADR-005-target-service-owned-data-and-api-gateway.md` — target decision superseding ADR-001 only for target architecture.
- `.agents/skills/drawio-advanced-qa/` — reviewed Sunwood draw.io QA skill vendored at pinned commit.
- `.agents/skills/drawio-advanced-qa/SOURCE.md` — provenance and pin.

### Modify
- `.agents/skills/architecture-diagrams-as-code/` — refresh to upstream pinned commit.
- `.agents/ARCHITECTURE-DIAGRAM-SKILLS.md` — document refreshed/new skills and precedence.
- `AGENTS.md` — distinguish current runtime freeze from target architecture documentation.
- `docs/adr/ADR-001-modular-distributed-architecture.md` — mark current-runtime scope and supersession relationship.
- `docs/05-SYSTEM-ARCHITECTURE.md` — target service/data/gateway design and current-vs-target distinction.
- `docs/06-DATABASE-DESIGN.md` — add target logical database ownership map without claiming migrations exist.
- `docs/07-API-GRPC-EVENTS.md` — add Gateway route ownership, ports, and per-service event ownership.
- `docs/assignment/02-SYSTEM-ARCHITECTURE-C4.md` — replace old single-API/shared-DB C1 explanation with target C1.
- `docs/assignment/05-C4-COMPLIANCE-CHECKLIST.md` — update C1/queues/data-ownership checks.
- `docs/assignment/c4/workspace.dsl` — model current containers for Local Deployment plus separate target containers/views.
- `scripts/Generate-AssignmentDiagrams.py` — regenerate C1 from target model while leaving C0 unchanged.
- `scripts/Generate-ProductionDeployment.js` — align production target with Gateway + target services + owned databases.
- `scripts/Validate-ArchitectureDiagrams.ps1` — enforce target C1 semantics and production alignment.
- `scripts/Validate-AssignmentDiagrams.ps1` — enforce target C1, ports, database ownership, and DSL structure.
- `docs/architecture/README.md` and `docs/architecture/DRAWIO-GUIDELINES.md` — document target/current conventions and QA rules.
- `docs/architecture/02-container-architecture.drawio` — target C1 mirror.
- `docs/architecture/05-recommendation-dynamic.drawio` — Gateway/Planning/Recommendation target flow.
- `docs/architecture/06-outbox-redis-dynamic.drawio` — per-service Outbox -> Redis -> Worker/consumer flow.
- `docs/architecture/10-production-secure-deployment.drawio` — secure target topology with Gateway/services/databases.
- `docs/assignment/diagrams/02-c1-container-architecture.drawio` — submission C1 source.
- PNG/SVG previews corresponding to the changed diagrams.

---

### Task 1: Refresh the reviewed architecture skill chain

**Files:**
- Modify: `.agents/skills/architecture-diagrams-as-code/**`
- Create: `.agents/skills/drawio-advanced-qa/**`
- Modify: `.agents/ARCHITECTURE-DIAGRAM-SKILLS.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: upstream Git repositories at pinned commits.
- Produces: local skills usable by later diagram/QA tasks without executing their setup scripts.

- [ ] **Step 1: Verify upstream pins before copying**

Run:
```powershell
git ls-remote https://github.com/relux-works/skill-architecture-diagrams.git HEAD
git ls-remote https://github.com/Sunwood-ai-labs/draw-io-skill.git HEAD
```
Expected pins:
- `5675017c81d28bf75274cf5bf9de90918d595d9b`
- `131921b2039b02fc8ee16b23bdb951b1fbb59594`

- [ ] **Step 2: Refresh `architecture-diagrams-as-code` from the reviewed upstream tree**

Copy the skill/reference/template contents from `relux-works/skill-architecture-diagrams` at the pinned commit into `.agents/skills/architecture-diagrams-as-code/`, excluding `.git` and without running upstream setup scripts. Update `SOURCE.md` with the pin and sync date.

- [ ] **Step 3: Vendor the advanced draw.io QA skill**

Copy the reviewed `Sunwood-ai-labs/draw-io-skill` skill, lint scripts, references, and package metadata needed by the overlap checker into `.agents/skills/drawio-advanced-qa/`, excluding `.git`; add `SOURCE.md` with pin `131921b...` and note that setup scripts were not executed.

- [ ] **Step 4: Update the project skill index and agent rules**

Add `drawio-advanced-qa` and the refreshed pin to `.agents/ARCHITECTURE-DIAGRAM-SKILLS.md`; add the new skill to the Draw.io rules in `AGENTS.md` while preserving the precedence rule that project/code/spec beats generic examples.

- [ ] **Step 5: Verify the skill files are present and provenance is pinned**

Run:
```powershell
Select-String -Path .agents\skills\architecture-diagrams-as-code\SOURCE.md -Pattern '5675017c81d28bf75274cf5bf9de90918d595d9b'
Select-String -Path .agents\skills\drawio-advanced-qa\SOURCE.md -Pattern '131921b2039b02fc8ee16b23bdb951b1fbb59594'
Test-Path .agents\skills\drawio-advanced-qa\scripts\check-drawio-svg-overlaps.mjs
```
Expected: both pins found and final command returns `True`.

- [ ] **Step 6: Commit**

```powershell
git add .agents AGENTS.md
git commit -m "chore: refresh architecture diagram skills"
```

---

### Task 2: Turn the target architecture contract into failing validators first

**Files:**
- Modify: `scripts/Validate-ArchitectureDiagrams.ps1`
- Modify: `scripts/Validate-AssignmentDiagrams.ps1`

**Interfaces:**
- Consumes: the approved target architecture spec.
- Produces: automated semantic gates that later diagram/DSL work must satisfy.

- [ ] **Step 1: Add target C1 required-element assertions**

Require these exact target elements in C1: `API Gateway`, `Identity & Profile Service`, `Catalog & Rules Service`, `Planning Service`, `Tracking & Progress Service`, `Recommendation Service`, `Background Worker`, `Event Streams`, and all six logical database names.

- [ ] **Step 2: Add exact port/protocol assertions**

Require `:443`, `:8080`, `:8081`, `:8082`, `:8083`, `:8084`, `:8085`, `:8086`, `:6379`, `:1433`, `:11434`, `gRPC / HTTP/2`, `Redis Streams`, and `EF Core / TDS` in the intended target artifacts.

- [ ] **Step 3: Add ownership and anti-regression assertions**

Assert that the target C1 contains the six database ownership pairs and does not contain the old shared `SQL Database`/single `REST API` architecture as the target center. Keep C0 anti-leak checks intact.

- [ ] **Step 4: Add DSL structure assertions**

Require target container identifiers/relationships for Gateway -> four domain services, Planning -> Recommendation, each service -> own DB, service/Worker -> Event Streams, and target production deployment. Also require current local deployment markers to remain present.

- [ ] **Step 5: Run validators and verify they fail against the old C1**

Run:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Validate-ArchitectureDiagrams.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Validate-AssignmentDiagrams.ps1
```
Expected: FAIL specifically because target Gateway/services/databases/ports are not yet present, proving the new gates are active.

- [ ] **Step 6: Commit the red validation contract**

```powershell
git add scripts\Validate-ArchitectureDiagrams.ps1 scripts\Validate-AssignmentDiagrams.ps1
git commit -m "test: define target C1 architecture contract"
```

---

### Task 3: Update ADRs and architecture documentation before drawing

**Files:**
- Create: `docs/adr/ADR-005-target-service-owned-data-and-api-gateway.md`
- Modify: `docs/adr/ADR-001-modular-distributed-architecture.md`
- Modify: `docs/05-SYSTEM-ARCHITECTURE.md`
- Modify: `docs/06-DATABASE-DESIGN.md`
- Modify: `docs/07-API-GRPC-EVENTS.md`
- Modify: `docs/assignment/02-SYSTEM-ARCHITECTURE-C4.md`
- Modify: `docs/assignment/05-C4-COMPLIANCE-CHECKLIST.md`
- Modify: `docs/architecture/README.md`
- Modify: `docs/architecture/DRAWIO-GUIDELINES.md`

**Interfaces:**
- Consumes: the spec's exact service boundaries, port map, ownership rules, Gateway routes, and async rules.
- Produces: one consistent written architecture source for the DSL and Draw.io tasks.

- [ ] **Step 1: Create ADR-005**

Record the accepted target decision: YARP Gateway, four REST domain services, Recommendation gRPC, Worker ops endpoint, database-per-service logical ownership, Redis Streams integration events, and explicit current-vs-target scope.

- [ ] **Step 2: Scope ADR-001 truthfully**

Change ADR-001 status wording to state it remains the accepted **current runtime** architecture and is superseded for **Target Architecture** by ADR-005; do not claim the code has already migrated.

- [ ] **Step 3: Replace shared-DB/single-API target prose**

Update `docs/05-SYSTEM-ARCHITECTURE.md` and Assignment C4 docs so target C1 matches the spec exactly, including Gateway routes and database ownership. Preserve a separate Current Runtime section matching the actual Compose services.

- [ ] **Step 4: Add target database ownership to database design**

Map existing entities/tables into the six logical database owners at a domain level, explicitly stating this is target ownership and not yet separate EF migrations/physical databases in the current code.

- [ ] **Step 5: Add Gateway/ports/event ownership to API/event docs**

Document route prefixes, internal ports, per-service Outbox ownership, `XADD` publishers, `XREADGROUP/XACK` consumers, and the rule that Worker never polls another service's DB.

- [ ] **Step 6: Fix C4 compliance wording**

Remove obsolete claims that split Identity/Progress services are sample-only; add checks for database-per-service, Gateway-only SPA backend access, explicit producers/consumers, and target/current separation.

- [ ] **Step 7: Run a contradiction scan**

Run:
```powershell
Select-String -Path docs\05-SYSTEM-ARCHITECTURE.md,docs\assignment\02-SYSTEM-ARCHITECTURE-C4.md,docs\assignment\05-C4-COMPLIANCE-CHECKLIST.md -Pattern 'One primary SQL database|One primary REST API|microservice sprawl|sample-image-only.*Identity|split Diet/Identity/Progress'
```
Expected: no unqualified target-architecture claims remain; any occurrence is clearly under Current Runtime/history only.

- [ ] **Step 8: Commit**

```powershell
git add docs\adr docs\05-SYSTEM-ARCHITECTURE.md docs\06-DATABASE-DESIGN.md docs\07-API-GRPC-EVENTS.md docs\assignment\02-SYSTEM-ARCHITECTURE-C4.md docs\assignment\05-C4-COMPLIANCE-CHECKLIST.md docs\architecture\README.md docs\architecture\DRAWIO-GUIDELINES.md
git commit -m "docs: define target gateway and service data ownership"
```

---

### Task 4: Model current and target architecture cleanly in Structurizr DSL

**Files:**
- Modify: `docs/assignment/c4/workspace.dsl`

**Interfaces:**
- Consumes: ADR-005 and Task 3 documentation.
- Produces: one DSL with current containers for Local Deployment and separate target containers for Target C1/Production Deployment.

- [ ] **Step 1: Preserve current runtime elements with explicit current tags**

Keep current Web, REST API, Recommendation shell, Worker, shared SQL, and Redis elements needed by `Local-Demo-Deployment`; tag/describe them as Current Runtime so they are not included in Target C1.

- [ ] **Step 2: Add target C1 containers**

Define `targetGateway`, `identityService`, `catalogService`, `planningService`, `trackingService`, `targetRecommendation`, `targetWorker`, `targetEventStreams`, and six target database containers with exact names/technologies/ports from the spec.

- [ ] **Step 3: Add target synchronous relationships**

Model Web -> Gateway, Gateway -> four REST domain services/Worker ops, Planning -> Recommendation, Recommendation -> optional AI, and each business service -> own database. Use concise intent and exact protocol/port strings.

- [ ] **Step 4: Add target asynchronous relationships**

Model domain-service producers -> Event Streams and Worker/Recommendation consumers -> Event Streams in a direction consistent with the chosen C4 notation, with `XADD` and `XREADGROUP/XACK` details reserved for dynamic/supporting views when C1 would become too dense.

- [ ] **Step 5: Build a Target C1 view and retain Current Local Deployment**

Change `C1-Container` to include only target containers plus actors/external AI, title it `C1 - C4 Container - Longevity Diet Companion (Target Architecture)`, and keep Local Demo deployment bound to current elements.

- [ ] **Step 6: Update Production Target deployment nodes**

Place Gateway and target services/databases in the private target topology; only the HTTPS edge is public. Ensure Recommendation uses HTTP/2+TLS internally and DB/Redis ports remain private.

- [ ] **Step 7: Run static DSL checks**

Run:
```powershell
Select-String -Path .\docs\assignment\c4\workspace.dsl -Pattern 'targetGateway','identityService','catalogService','planningService','trackingService','targetRecommendation','targetWorker','C1-Container','Local-Demo-Deployment','Production-Secure-Deployment'
```
Expected: every required target/current marker is present. Full Assignment validation remains intentionally red until Task 5 updates Draw.io C1.

- [ ] **Step 8: Commit**

```powershell
git add docs\assignment\c4\workspace.dsl
git commit -m "docs: model current and target C4 containers"
```

---

### Task 5: Redraw C1 with explicit Gateway, owned databases, ports, and event paths

**Files:**
- Modify: `scripts/Generate-AssignmentDiagrams.py`
- Modify: `docs/assignment/diagrams/02-c1-container-architecture.drawio`
- Modify: `docs/architecture/02-container-architecture.drawio`
- Modify: `docs/assignment/previews/02-c1-container-architecture.png`
- Modify: `docs/assignment/vector/02-c1-container-architecture.svg`
- Modify: `docs/architecture/previews/02-container-architecture.png`

**Interfaces:**
- Consumes: Target C1 elements/relationships from the DSL and spec.
- Produces: editable Draw.io target C1 plus PNG/SVG exports that satisfy the new validators.

- [ ] **Step 1: Replace `build_c1()` with the target banded layout**

Use these visual bands: actors; Web + Gateway; four REST domain services; each service's DB immediately below; Recommendation + RecommendationDb internal lane; Worker + WorkerDb async lane; Event Streams centered for producers/consumers; Local AI outside the system boundary.

- [ ] **Step 2: Keep box copy minimal**

Limit each box to name, C4 type, technology/port, and one short responsibility. Do not put route tables, controller names, repository names, table lists, or implementation-status paragraphs inside C1.

- [ ] **Step 3: Add exact short relationship labels**

Use labels such as `HTTPS :443`, `REST :8081`, `REST :8082`, `REST :8083`, `REST :8084`, `gRPC :8085`, `Ops :8086`, `TDS :1433`, `Redis :6379`, and optional `HTTP :11434` with reserved whitespace corridors.

- [ ] **Step 4: Show Event Streams as connected infrastructure**

Ensure at least the four domain services publish into Event Streams, Worker consumes/acks and may publish result/retry events, and Recommendation has an event-consumer link for approved snapshots. Keep the visual readable; if multiple parallel producer arrows overload the center, route them into a clear event lane rather than merging them into an unlabeled shared arrow.

- [ ] **Step 5: Regenerate C1 and mirror byte-identically**

Run the canonical generator and copy the assignment C1 source to the architecture mirror so only the `modified` timestamp cannot diverge.

- [ ] **Step 6: Run geometry lint and export**

Run:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Lint-ArchitectureGeometry.ps1 -ArchitectureDir .\docs\assignment\diagrams
powershell -ExecutionPolicy Bypass -File .\scripts\Validate-AssignmentDiagrams.ps1
```
Expected: no diagonal, text intersection, box intersection, connector crossing, or connector overlap findings for C1.

- [ ] **Step 7: Run advanced draw.io overlap QA**

Export the C1 SVG, then run the vendored checker:
```powershell
node .agents\skills\drawio-advanced-qa\scripts\check-drawio-svg-overlaps.mjs docs\assignment\vector\02-c1-container-architecture.svg
```
Expected: no actionable edge-label, edge-rect, label-rect, edge-edge, or text-overflow findings. Any reduced-coverage warning requires manual image inspection before acceptance.

- [ ] **Step 8: Open/read the final PNG for visual inspection**

Verify at normal zoom that no label touches a connector, every service visually pairs with its owned DB, the Gateway is unambiguous, and Event Streams is not isolated.

- [ ] **Step 9: Commit**

```powershell
git add scripts\Generate-AssignmentDiagrams.py docs\assignment\diagrams\02-c1-container-architecture.drawio docs\architecture\02-container-architecture.drawio docs\assignment\previews\02-c1-container-architecture.png docs\assignment\vector\02-c1-container-architecture.svg docs\architecture\previews\02-container-architecture.png
git commit -m "docs: redraw C1 target service architecture"
```

---

### Task 6: Align supporting Dynamic and Production Deployment views

**Files:**
- Modify: `scripts/Generate-ProductionDeployment.js`
- Modify: `docs/architecture/05-recommendation-dynamic.drawio`
- Modify: `docs/architecture/06-outbox-redis-dynamic.drawio`
- Modify: `docs/architecture/10-production-secure-deployment.drawio`
- Modify: matching `docs/architecture/previews/*.png`

**Interfaces:**
- Consumes: target containers and relationships from Task 4/5.
- Produces: supporting views that no longer contradict Target C1.

- [ ] **Step 1: Update Recommendation Dynamic**

Show `Member -> Web -> Gateway -> Planning Service -> Recommendation Service -> RecommendationDb`, optional Recommendation -> Local AI explanation rewrite, then the response path. Do not show the old central REST API as the target orchestrator.

- [ ] **Step 2: Update Outbox/Redis Dynamic**

Show an owning domain service committing business state + Outbox in its own DB, that service's publisher `XADD`ing to Event Streams, Worker/Recommendation consumer using `XREADGROUP`, consumer idempotency in its own DB, and `XACK`/dead-letter behavior. Never show Worker polling a different service's DB.

- [ ] **Step 3: Update Production Secure Deployment**

Show public Web/TLS edge, Gateway, four REST services, Recommendation, Worker, Redis, and six logical databases. Databases may share one SQL Server host node in production-target documentation only if ownership remains visually separate; no DB/Redis public application port.

- [ ] **Step 4: Export and geometry-lint all changed supporting views**

Run:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Validate-ArchitectureDiagrams.ps1
```
Expected: the new production-security and target relationship checks pass.

- [ ] **Step 5: Run advanced QA on changed SVGs**

Run the vendored overlap checker for the C1 and changed supporting diagrams; fix any actionable collisions before proceeding.

- [ ] **Step 6: Commit**

```powershell
git add scripts\Generate-ProductionDeployment.js docs\architecture\05-recommendation-dynamic.drawio docs\architecture\06-outbox-redis-dynamic.drawio docs\architecture\10-production-secure-deployment.drawio docs\architecture\previews
git commit -m "docs: align target dynamic and deployment views"
```

---

### Task 7: Final consistency, validation, and cleanliness gate

**Files:**
- Modify only if validation reveals inconsistency: docs/validators/diagram source files already listed above.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: a validated architecture documentation set ready for lecturer review.

- [ ] **Step 1: Run both architecture validators fresh**

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Validate-ArchitectureDiagrams.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\Validate-AssignmentDiagrams.ps1
```
Expected: both complete with PASS; a Docker/Structurizr live-validation skip is acceptable only if the scripts explicitly report that static DSL checks passed.

- [ ] **Step 2: Run project-structure validation under PowerShell 7**

```powershell
pwsh .\scripts\Validate-ProjectStructure.ps1
```
Expected: `PROJECT_STRUCTURE_VALIDATION=PASS`. If `pwsh` is only available via the WindowsApps shim, invoke that exact executable path.

- [ ] **Step 3: Verify C0 did not regress**

Confirm C0 still contains only actors, the whole system, and direct external systems; no Gateway/service/database/Redis/gRPC technology leaks into C0.

- [ ] **Step 4: Verify C1 mirror identity and exact ownership strings**

Compare SHA-256 hashes of assignment and architecture C1 `.drawio` files. Confirm all six service/database pairs and the exact port map are present.

- [ ] **Step 5: Check Git whitespace and unintended product-code changes**

Run:
```powershell
git diff --check
git status --short
git diff --name-only -- src tests docker-compose.yml
```
Expected: `git diff --check` clean; no `src/`, `tests/`, or `docker-compose.yml` changes from this architecture-only revision.

- [ ] **Step 6: Visual signoff**

Read/open the final C0, C1, Recommendation Dynamic, Outbox/Redis Dynamic, and Production Target PNGs. Confirm legibility, English naming, minimal text, clear service/database pairing, Gateway placement, explicit Event Streams relationships, and no visible overlaps.

- [ ] **Step 7: Commit any validation-only fixes, then record final status**

If fixes were needed, commit them with a focused message. End with a clean architecture validation summary that distinguishes `Current Runtime` from `Target Architecture` and lists any environment-only validation skips truthfully.
