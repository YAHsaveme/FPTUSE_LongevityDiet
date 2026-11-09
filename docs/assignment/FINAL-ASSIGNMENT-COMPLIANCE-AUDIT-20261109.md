# PRN232 — Final Assignment Compliance Audit (09/11/2026)

> Source of truth: the original user-provided **PRN232 - Final Assignment.pdf**, 3 pages, sections 2–7.
> Checked against local `D:\PRN232\FPTUSE_LongevityDiet` at feature branch `feature/w3-t4-rule-governance-20261109`, based on `origin/develop` commit `21e72bb`.
> This is a measured evidence matrix, **not a predicted grade or a 100% completion certificate**.

## 1. Official grading criteria — exact weights

| Rubric criterion | Weight | Current checked evidence | Status / missing acceptance proof |
|---|---:|---|---|
| System architecture and design | 20% | Four canonical one-page C0/C1/C2/Database Diagram `.drawio` files + PDFs, ADRs; `Validate-OverallDiagrams.js` reports 32/32 baseline tables connected, 9 SQL FKs, actors/labels/layout PASS. `Validate-ProjectStructure.ps1` PASS. | **PARTIAL**: current working branch adds `catalog.RuleAudits` (33rd table) and FK not yet reflected in the canonical ERD/validator. Visual PDF/manual consistency review and current-runtime vs ADR-005 target legend needed. |
| REST API implementation | 20% | ASP.NET Core .NET 9 `LongevityDiet.API`; /api/v1 resource CRUD, `Services` -> `Repositories`, JWT/role policies, Food/Recipe search/filter/sort/pagination; OpenAPI and HTTP integration tests. | **CODE + AUTOMATED TEST VERIFIED**; live Swagger, CRUD and protected endpoint screenshots from an actual deployed stack still needed. |
| Background Job | 10% | Independent `LongevityDiet.Worker`, reminder scheduling and weekly report processing, retry/idempotency classes and integration tests. | **PARTIAL**: show real scheduled/async job, resulting persisted state and restart behavior in live deployment. |
| Message Broker integration | 15% | Redis Streams producer/consumer in source, Outbox -> XADD, XREADGROUP/group, ACK, stale-pending handling, worker-result flow. 2026-11-05 `RELEASE-RUNBOOK.md` documents real broker recovery evidence. | **PARTIAL / HISTORICAL RUNTIME EVIDENCE**: current branch has not demonstrated producer + consumer + persisted side effect on a running Compose stack, including restart/duplicate. |
| gRPC service | 15% | Independent `LongevityDiet.Recommendation.Grpc`, .proto contracts, REST API typed gRPC integration and HTTP/2 integration-test evidence in repository. | **PARTIAL**: verify live REST -> independent gRPC container -> response -> user-visible UI, including timeout/unavailable handling. |
| Docker/Cloud deployment | 10% | `docker-compose.yml` defines web/api/grpc/worker/sqlserver/redis; Dockerfiles exist. `docker compose --env-file .env.example config --quiet` and static release readiness both PASS. Historical runbook includes previous Compose smoke. | **NOT REVERIFIED ON CURRENT BRANCH**: no project containers running during this audit. Fresh SQL migration, health/readiness, communication matrix and restart E2E remain open. Docker Compose **OR** public cloud is enough under the PDF. |
| Documentation and presentation | 10% | Root README has project description, system architecture, stack, installation, deployment, team roles; source, EF migrations, Dockerfiles, Compose, OpenAPI and 4 diagram PDFs exist. | **PARTIAL**: reconcile stale docs, update 33-table ERD, validate fresh-machine instructions and prepare repeatable **7/7** live demonstration evidence. |
| **Total** | **100%** | **All seven categories have code/document artifacts.** | **Not eligible for a verified 100% claim until open gates pass.** |

### Official functional/technical details (PDF sections 2–5)

- REST: at least one ASP.NET Core API, CRUD of core entities, API -> Services -> Repository layering, JWT, searching, filtering, sorting, pagination. **Code + automated integration evidence exists**.
- Background job: at least one scheduled or asynchronous job. **Worker implementation exists; current live demonstration is pending**.
- Broker: **Apache Kafka OR Redis Pub/Sub/Streams**, at least one real producer and one consumer. **Redis Streams is compliant**; cloud/Kafka is not additionally mandatory.
- gRPC: independent process/service and a real REST API -> gRPC interaction. **Code and integration evidence exists**; independent live deployment needs repeatable proof.
- Deployment: **Docker Desktop with Compose OR public cloud** and successful inter-service communication; **current live verification missing**.
- Technical: .NET 8+, EF Core, relational DB, DI, configuration, logging/exception handling, JWT, REST, gRPC, broker, BackgroundService, containerization. Check all from runtime, not only package references.
- Deliverables: complete source, database scripts/migrations, Dockerfile(s), Compose if used, Swagger/OpenAPI, root README with **six required subjects** (description, architecture, technology, installation, deployment, team responsibilities).
- Final demo: **seven required live demonstrations** (architecture, REST, background job, publish+consume, gRPC, deployment, E2E business workflow).
- **Not mandated in this particular PDF:** API Gateway, six independently deployable domain services, six separate databases, public cloud in addition to Docker, C4 model notation, exact service count, Kafka specifically, ML/AI, or a separate UI. Follow any *additional* teacher instructions separately; do not conflate them with this PDF.

## 2. Reproducible checks performed on 09/11/2026

| Check | Evidence |
|---|---|
| `git fetch` + `git pull --ff-only origin develop` | Clean `develop` fast-forwarded from `a666e6a` to `21e72bb`; 8 commits and 114 files updated before feature work |
| Solution build | `dotnet build LongevityDiet.sln -c Debug`: **0 errors, 0 warnings** |
| Unit tests | **66/66 PASS** |
| Integration tests | **70/70 PASS**, including 3 new Rule Governance API tests |
| Frontend | **12/12 tests PASS** (6 Vitest + 6 Node); oxlint **0 errors/warnings**; Vite/TypeScript production build PASS |
| Canonical project structure | `Validate-ProjectStructure.ps1` PASS |
| Diagram static QA | `node scripts/Validate-OverallDiagrams.js`: **PASS** for C0/C1/C2/ERD baseline (32 mapped tables, 9 SQL FK, 32/32 reachable); does not include new RuleAudits change |
| Release static check | `Test-ReleaseReadiness.ps1` PASS |
| Docker Compose static | `docker compose --env-file .env.example config --quiet` PASS; Docker Engine reachable |
| EF Core model snapshot | `dotnet-ef migrations has-pending-model-changes`: **no pending model changes** for canonical DbContext |
| `git diff --check` | PASS |
| Full-stack runtime | **NOT RUN** during this audit; containers were not running; C: free space was ~1.66 GB, D: ~108 GB. Do not start large SQL/Docker volumes blindly or prune unrelated user data. |

The test suite uses SQLite for most HTTP integration tests. **Passing these tests is not equivalent to SQL Server fresh-migration or Docker E2E acceptance.**

## 3. Member 1 and Member 4 task-by-task

| Owner / task | Source and progress | Acceptance status |
|---|---|---|
| Member 1 W1-T1 | JWT/register/refresh/profile/onboarding with earlier Chrome E2E acceptance; task itself marked Done. | **DONE in baseline**, still needs final release regression evidence |
| Member 1 W2-T1 | Activity CRUD, timezone summaries, LDAS breakdown/version/missing-data policy. Current integration also contains Member 3 meal/eating-window modules; verify full connected score inputs in live E2E. | **PARTIAL LIVE ACCEPTANCE** |
| Member 1 W3-T1 | Reminder preferences/quiet hours and inbox/notifications; 2026-11-05 evidence includes real Redis + SQLite smoke. | **PARTIAL: SQL Server + Worker restart/duplicate proof** |
| Member 1 W4-T1 | Auth, DI, rate limits, health, error/correlation code. | **PARTIAL: live performance p50/p95, threat/security review, full correlation trace** |
| Member 4 W1-T4 | Independent gRPC and Outbox/Redis/Worker components exist. | **PARTIAL: live independent gRPC + broker recovery evidence** |
| Member 4 W2-T4 | App shell, protected routes, error conventions, keyboard focus, responsive structure. | **PARTIAL: real-browser mobile/tablet/desktop and accessibility E2E** |
| Member 4 W3-T4 | New branch adds Draft/InReview/Published/Retired, admin endpoints, version immutability, safe provenance validation, append-only RuleAudit, admin UI and regression tests. | **PARTIAL: SQL Server migration + runtime test, expanded approval/impact/audit UI, 33-table diagrams, reviewer gate** |
| Member 4 W4-T4 | README, migrations, 4 diagrams, Compose, release runbook, source tree exist. | **PARTIAL: final clean submission, full deployment/rehearsal, reviewer sign-off** |

Scope note: the four-week roadmap and ADR-005 target architecture include work beyond the minimum PDF. Their unimplemented items must not be misrepresented as deployed or accidentally counted as original-PDF mandatory requirements.

## 4. Priority closure actions (do not mark done prematurely)

1. **Highest grade risk:** run an actual clean Docker Compose stack with safe local secrets, fresh SQL migration, real Swagger, REST + gRPC, Redis producer/consumer, Worker side effect and restart/duplicate recovery. Capture timestamps, commands and observable outputs.
2. **Architecture integrity:** reflect `RuleAudits` and its FK in the canonical Database Diagram, C2/table annotations and static diagram validator; export matching PDF(s) and visually inspect arrows/labels. Baseline static QA alone does not verify new model.
3. **Presentation:** complete and record all **7/7** official live demo scenarios. Trace the same user action end to end, rather than stitching unrelated mock screenshots.
4. **Documents:** fix historical stale values in `docs/assignment/00-ASSIGNMENT-DOCUMENT.md`, README/release evidence as needed; document Current Runtime separately from ADR-005 Target.
5. **Feature reviewers:** Member 3 reviews Member 1 changes; Member 2 reviews Member 4 changes. Verify branch CI, actual SQL migration and admin review/audit behavior before merging.
6. **Environment:** Node version 24.14.0 produced EBADENGINE warning for some frontend test dependencies requiring 24.15.0+ (or supported Node 22.22.2+); test/build still passed. Verify clean supported runtime before final submission.

## 5. Conclusion

**Source code and local automated checks are substantially present; a truthful 100% submission-readiness status is NOT established.** The principal missing evidence is **running deployment and end-to-end verification**, followed by **diagram/document consistency with the new audit entity** and final presentation/reviewer acceptance. No fabricated scores, screenshots, cloud deployment, reviewer approvals, or SQL Server verification are claimed.
