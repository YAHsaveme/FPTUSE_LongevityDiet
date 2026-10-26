# C0/C1 One-Glance Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. For this task the user explicitly requires native ChatGPT execution; do not delegate to Claude or Codex.

**Goal:** Preserve the approved Longevity Diet Companion architecture semantics while rebuilding C0 and C1 so every required element, relationship, protocol and ownership boundary is readable in one normal full-frame view without zooming into individual areas.

**Architecture:** C0 remains a true C4 System Context view: Guest, Member and Administrator around one Longevity Diet Companion software system plus the optional Local AI Runtime. C1 remains the ADR-005 **Target Architecture** and retains Web, YARP Gateway, four REST domain services, Recommendation gRPC, Worker, six owned logical databases, logical Event Streams and optional Local AI. The change is presentation/QA, not a runtime/service-boundary redesign; Current Runtime remains documented separately and `docker-compose.yml` is not changed.

**Tech Stack:** .NET 9 documentation repository, native draw.io XML, Python generator executed through Docker when no host Python is available, draw.io Desktop 31.4.5, PowerShell validation, Structurizr DSL/Docker.

**Spec:** `docs/assignment/02-SYSTEM-ARCHITECTURE-C4.md`, `docs/adr/ADR-005-target-service-owned-data-and-api-gateway.md`, `docs/architecture/DRAWIO-GUIDELINES.md`, `.agents/project-context.md`.

## Global Constraints

- Do not use Claude or Codex; ChatGPT performs the work directly.
- Do not use emoji in project documentation produced by this task.
- Do not change deployable services, ports, database ownership, protocols, REST/gRPC responsibilities, Redis mechanism, auth model, or Docker Compose topology.
- C0 shows people, one in-scope software system, and direct external software systems only; no ports or implementation technologies.
- C1 is explicitly labelled **Target Architecture** and must not be represented as Current Runtime.
- Keep all existing required C1 target containers and exact ports `:443`, `:8080` through `:8086`, `:6379`, `:1433`, and optional `:11434`.
- Web reaches backend only through API Gateway; Planning reaches Recommendation through gRPC/HTTP2; each service reaches only its owned database.
- Event Streams is the logical Redis Streams integration-event container; do not copy RabbitMQ or model the Redis broker/server as a C4 application container.
- Never copy sample-image-only elements: Mobile App, Cloudinary, Brevo, RabbitMQ, Google AI.
- English element names only; boxes contain name, explicit C4 type, technology/port when C1, and one short responsibility.
- Orthogonal connectors only; no line through a box/text/title; no connector overlap/crossing after final QA.
- Do not shrink typography below the project readability floor merely to fit more content; compact geometry and wording instead.
- Canonical editable output remains `.drawio`; exported PNG/SVG are generated artifacts from that source.
- `main` must not receive direct commits; implementation occurs on a feature branch/worktree from `develop` after plan approval.

## Review Focus

1. **Current vs target confusion:** C1 must remain visibly labelled Target Architecture, while Current Runtime docs/Compose stay untouched.
2. **Content loss during compaction:** all required services, six owned databases, Event Streams, Local AI, ports and relationship intents must remain present after layout reduction.
3. **Unreadable fit-to-page output:** full-frame PNG must keep box text and relationship labels legible without local zoom; no font-size workaround is allowed.
4. **Async-flow ambiguity:** producers/consumers must visibly connect to Event Streams without making the stream look like an isolated broker or creating connector spaghetti.
5. **Reference-image contamination:** sample-only technologies/components must remain absent and automated anti-copy checks must stay active.

---

### Task 1: Curate and pin the architecture skill set

**Files:**
- Create: `.agents/skills/diagram-design-architecture-layout/SKILL.md`
- Modify: `.agents/ARCHITECTURE-DIAGRAM-SKILLS.md`
- Modify: `.agents/skills/c4-drawio-assignment-production/SKILL.md`
- Verify only: `.agents/vendor/c4-skill/**`

**Interfaces:**
- Consumes: accepted project architecture, local diagram guardrails, upstream `cathrynlavery/diagram-design` HEAD `f2f4d49ea8d632f17cf196ba26599277a93f767b` (observed v2.6.115), upstream `bitsmuggler/c4-skill` HEAD `d9dd48987054d6633da031fe3624afc2cb1da4eb`.
- Produces: a small project-local layout skill containing only the high-value architecture rules needed here; corrected project C1 skill contract aligned to ADR-005; provenance pins in the skill index.

- [ ] **Step 1: Write the project-local diagram-design architecture layout skill**

Include only rules materially useful to this project: dominant flow direction, grid/alignment, `faithful` detail preservation, zoning/grouping where useful, orthogonal routing, presentation-size typography, and the rule that splitting/compacting beats shrinking text. Record upstream repo, commit and reviewed version.

- [ ] **Step 2: Correct the stale C1 contract in `c4-drawio-assignment-production`**

Replace its old “current required containers” list with the accepted Target Architecture: Web, YARP Gateway, Identity & Profile, Catalog & Rules, Planning, Tracking & Progress, Recommendation, Background Worker, six owned logical DBs, Event Streams and optional Local AI. Keep the Current Runtime/Target distinction explicit.

- [ ] **Step 3: Record external-source review status**

Update `.agents/ARCHITECTURE-DIAGRAM-SKILLS.md` with the diagram-design pin and the verified current c4-skill HEAD. Record that PRAXIST runtime was reviewed but is intentionally not installed because this task prohibits Claude/Codex takeover and the framework adds no diagram-specific capability needed here. Keep BMAD and ADR Studio as references, not runtime dependencies.

- [ ] **Step 4: Verify no unnecessary upstream bulk was vendored**

Run a directory/status check. Expected: one small new project-local skill, no 287-file diagram-design copy, no PRAXIST runtime/package, and no `.git` metadata added below `.agents/vendor`.

---

### Task 2: Add one-glance readability gates before changing layout

**Files:**
- Modify: `scripts/Validate-AssignmentDiagrams.ps1`
- Modify: `docs/architecture/DRAWIO-GUIDELINES.md`

**Interfaces:**
- Consumes: generated C0/C1 draw.io XML.
- Produces: deterministic validation for compact page geometry and minimum readable typography in addition to existing semantic/collision checks.

- [ ] **Step 1: Add failing compactness/readability assertions for C0/C1**

Add validation that rejects the current oversized C1 page and rejects C0/C1 relationship/body typography below the agreed floor. Target C1 page class is a compact landscape frame near 16:9 rather than the current 5000x2700 canvas. Preserve the existing required-element, port, anti-copy and orthogonal-edge assertions.

- [ ] **Step 2: Run the validator far enough to confirm the new gate fails on the current C1**

Expected: failure caused by the new compactness/readability rule, not by missing architecture semantics.

- [ ] **Step 3: Document the visual contract**

Add explicit guidance: compact landscape frame, normal full-frame readability, actor/header/system-boundary safe areas, minimum box/relationship font sizes, service/database ownership pairing, and reserved connector corridors. State that page expansion is allowed only when splitting into a different supporting view; C1 itself remains one frame.

---

### Task 3: Rebuild C0 and C1 geometry in the canonical generator

**Files:**
- Modify: `scripts/Generate-AssignmentDiagrams.py`
- Generated: `docs/assignment/diagrams/01-c0-system-context.drawio`
- Generated: `docs/assignment/diagrams/02-c1-container-architecture.drawio`
- Generated mirror: `docs/architecture/01-system-context.drawio`
- Generated mirror: `docs/architecture/02-container-architecture.drawio`

**Interfaces:**
- Consumes: the unchanged C0/C1 semantic model and the new readability contract.
- Produces: compact editable draw.io C0/C1 files with exactly the same approved architectural meaning.

- [ ] **Step 1: Compact C0 without changing abstraction**

Use a balanced landscape frame with Guest/Member/Administrator clearly aligned, a smaller in-scope system card, optional Local AI outside the system, short business-intent relationship labels, and a legend outside the main content lane. Remove excess dead whitespace rather than shrinking text.

- [ ] **Step 2: Re-layout C1 into deliberate visual bands**

Use: title/scope; actor band; Web Application; API Gateway; domain-service/data-ownership band; Recommendation/Worker async-support lane; Event Streams lane; optional Local AI outside the system boundary. Service/database pairs must be immediately recognizable and the primary reading order must be top-to-bottom.

- [ ] **Step 3: Shorten relationship labels without deleting information**

Use concise protocol labels such as `HTTPS :443`, `REST :8081`, `REST :8082`, `REST :8083`, `REST :8084`, `gRPC :8085`, `Ops :8086`, `TDS :1433`, `Redis :6379`, and optional `HTTP :11434`. Keep responsibility text in boxes to one short phrase.

- [ ] **Step 4: Reserve explicit routing corridors**

Route Gateway fan-out, database ownership, Planning -> Recommendation, Worker operations, optional AI and async Event Streams relationships through separate orthogonal lanes. No connector may pass through a box or text label.

- [ ] **Step 5: Generate only C0/C1 through a reproducible Python runner**

Because host `python`, `py` and `uv` are unavailable but Docker is healthy, use a pinned Python Docker image to run `scripts/Generate-AssignmentDiagrams.py --only c0,c1` unless a verified host interpreter becomes available. Do not install a global Python runtime merely for this task.

---

### Task 4: Render, inspect, iterate and synchronize artifacts

**Files:**
- Generated: `docs/assignment/previews/01-c0-system-context.png`
- Generated: `docs/assignment/previews/02-c1-container-architecture.png`
- Generated: `docs/assignment/vector/01-c0-system-context.svg`
- Generated: `docs/assignment/vector/02-c1-container-architecture.svg`
- Generated mirror previews: `docs/architecture/previews/01-system-context.png`, `docs/architecture/previews/02-container-architecture.png`
- Modify: `docs/assignment/04-DIAGRAM-QA-REPORT.md`
- Modify if needed for explicit one-glance check: `docs/assignment/05-C4-COMPLIANCE-CHECKLIST.md`

**Interfaces:**
- Consumes: generated C0/C1 sources.
- Produces: visually reviewed PNG/SVG plus truthful QA documentation.

- [ ] **Step 1: Export PNG and SVG with draw.io Desktop**

Use the installed `D:\Draw.io\draw.io.exe` and page-sized exports. Do not patch PNG/SVG directly.

- [ ] **Step 2: Run geometry and advanced SVG QA**

Run `scripts/Lint-ArchitectureGeometry.ps1` and `.agents/skills/drawio-advanced-qa/scripts/check-drawio-svg-overlaps.mjs` on the changed SVGs. Expected: zero diagonal segments, text intersections, box intersections, connector crossings/overlaps and SVG label/shape overflow findings.

- [ ] **Step 3: Perform visual inspection at normal full-frame scale**

Inspect both rendered PNGs as complete images. Reject any result where a person must zoom into individual areas to identify service names, databases, ports or relationship directions. Also check balance, alignment, empty-space distribution, ownership pairing, arrow direction, clipping and external-boundary placement.

- [ ] **Step 4: Iterate generator, not exports**

For each visual issue, change `Generate-AssignmentDiagrams.py`, regenerate, re-export and rerun automated QA. Stop only after both C0 and C1 pass visual and automated review.

- [ ] **Step 5: Update the QA report truthfully**

Replace claims that no longer match the actual render with measured final layout/readability facts and list the exact gates executed.

---

### Task 5: Full repository verification and diff audit

**Files:**
- Verify: entire repository diff only.

**Interfaces:**
- Consumes: all changes from Tasks 1-4.
- Produces: evidence that diagram work did not alter application/runtime architecture and did not regress repository quality.

- [ ] **Step 1: Run assignment architecture validation**

Run `scripts/Validate-AssignmentDiagrams.ps1`. If its physical-DB helper still requires Python, add/use a Docker-Python fallback rather than skipping the check. Structurizr live validation must run because Docker daemon is currently available.

- [ ] **Step 2: Run project-structure validation**

Run `scripts/Validate-ProjectStructure.ps1`. Expected: PASS and canonical project structure unchanged.

- [ ] **Step 3: Run repository-required build/test gates**

Run `dotnet build .\LongevityDiet.sln -c Debug`, `dotnet test .\LongevityDiet.sln -c Debug --no-build`, then `npm run lint` and `npm run build` in `src/LongevityDiet.Web`.

- [ ] **Step 4: Audit Git diff**

Confirm no source application code, `docker-compose.yml`, ports, runtime boundaries, secrets, sample-only components or unrelated artifacts changed. Confirm generated assignment and engineering C0/C1 copies are synchronized.

- [ ] **Step 5: Final C4 semantic review**

Check the final C0/C1 against the official C4 checklist: title/type/scope/legend, explicit element type, responsibility, technology where applicable, directional intent-labelled relationships, and communication technology for inter-container relationships.

- [ ] **Step 6: Commit only after all evidence is green**

Create focused commits on the feature branch. Do not merge into `develop` or `main` unless the user explicitly asks later.


---

## Approved Scope Amendment — 2026-10-22

The user approved the original plan and then added lecturer-review requirements. These are documentation/architecture-alignment requirements, not authorization to change the deployed runtime topology.

**Execution order amendment:** Tasks 1 → 2 → 3 → 4 → 6 → 7 → 5. Task 5 remains the final repository-wide verification gate.

### Task 6: Add lecturer-facing Docker/Cloud and asynchronous supporting views

**Files:**
- Modify/generate: local Docker Deployment supporting view and its source/generator as needed.
- Create or update: Cloud Docker Deployment Target supporting view.
- Create or update: asynchronous messaging Dynamic view showing Outbox → Redis Streams → Worker processing.
- Modify: `docs/assignment/00-ASSIGNMENT-DOCUMENT.md` and architecture documentation that references these views.

**Rules:**
- C0 and C1 remain the only Assignment architecture levels; Deployment/Dynamic views are supporting evidence.
- Show where SQL/Redis data persists: container mount → Docker named volume; Cloud target also shows persistent VM/cloud disk semantics.
- Show private Docker network/service discovery and distinguish container ports from host/public ports.
- Only HTTPS public edge is internet-facing in production target; SQL, Redis, gRPC and internal services remain private.
- Redis Streams remains the selected broker. Kafka is an Assignment-permitted alternative only, not added to the system.
- Supporting async view must make producer, stream, consumer, acknowledgement, idempotency and persisted result unambiguous with minimal text.
- Current Local Docker Deployment must remain truthful to current `docker-compose.yml`; Cloud/Production Target must be explicitly labelled target.

### Task 7: Align all four-week member tasks to the architecture source of truth

**Files:**
- Audit and modify only when needed: `docs/task/ROADMAP-4-WEEKS.md`, Week 1–4 READMEs, and all 16 `Task 1.md`–`Task 4.md` files.
- Modify architecture/traceability docs if task ownership needs an explicit mapping table.

**Rules:**
- Do not invent already-implemented microservices. Map each task to both Current Runtime implementation area and Target Architecture owner where useful.
- Every task that creates data must name its target owning service/database or state that it remains in the current shared runtime until migration.
- Every cross-boundary flow must identify synchronous REST/gRPC or asynchronous Redis Streams communication rather than direct cross-database access.
- Week 4 deployment/readiness task must explicitly cover Docker network/service discovery, SQL/Redis named-volume persistence, restart persistence, backup/restore, public/private exposure and Cloud persistent-disk considerations.
- Week 4 evidence/demo task must rehearse C0 → C1 Target → Current Docker Deployment → async Dynamic flow and clearly state Current vs Target.
- Week 4 final-doc task must fail documentation review when C0/C1/Deployment/task docs contradict current code, Compose, ADRs or accepted target architecture.
- Preserve the four-week schedule, four members and existing business scope unless a task directly contradicts the architecture.
