# PRN232 — Source merge vs. production cutover decision (12 November 2026)

## Decision boundaries

The project has TWO different decisions. A source-code integration to `main`
must **not** be represented as a production-domain/data cutover or a 100/100
grade. Current runtime and optional ADR-005 Target QA are different deployments.

### A. Source-only integration to `main`: conditional technical GO

A PR from `develop` to `main` is technically eligible **only after**:

1. All feature/UI pull requests targeting `develop` have been reconciled;
   no feature PR is left open and no uncommitted work remains.
2. Exact HEAD's GitHub `validate` + `current-runtime-release-smoke` have
   completed SUCCESS on the source PR, including Docker SQL/Redis/gRPC,
   RabbitMQ isolated optional QA, YARP and Playwright.
3. The original PRN232 PDF's **22/22 technical static criteria** and final
   isolated QA **18/18 gates** pass on the integrated source.
4. C0, C1, C2, ERD and Business Flow are native Draw.io, each re-exported as
   one-page PDF; **zero geometric collisions**. C0/C1/C2/flow actors must have
   proportional human icons with detached captions.
5. The ERD shows **50 physical tables, exactly 20 true SQL child→parent FK
   arrows**; the SQL audit compares every native directed pair to
   `sys.foreign_keys` from the six isolated QA databases.
6. No credential, personal QA data, `.env`, `.local-backups` or Docker volumes
   are included in Git; current Web/Gateway defaults stay on legacy runtime.
7. Source-only main release is logged explicitly as owner's approval and CI
   acceptance; it must not silently initiate SQL migration, Gateway write
   cutover or production infrastructure changes.

The user's authorization in this conversation covers source integration once
these gates are met. Team independent review and lecturer grading remain
separate evidence, **not claimed as completed**.

### B. Historical data and live-traffic ADR-005 production cutover: NO-GO

The read-only QA preflight reports **12 blockers**. Unmet requirements include
source/target identity GUID and password/refresh-token preservation, verified
backups with restore rehearsal, audited matching of Foods/Recipes/Users/
MealPlans/MealLogs and foreign-user permissions, a consistent write freeze/CDC
watermark, consumer replay/inbox and rollback rehearsals, HTTPS 443/domain
certificate, security/clinical sign-off and owner approval of the actual
cutover window. Database row-count equality alone is insufficient.

**DO NOT enable production migration or switch target Gateway/Web writes.**
This restriction remains even if the source code is merged to `main`.

## Technical audit commands

```powershell
Set-Location D:\PRN232\FPTUSE_LongevityDiet
node scripts/Validate-OfficialArchitecture.js
node scripts/Validate-OfficialDiagram-Geometry.js --strict
node scripts/Test-Physical-ERD-Sql.mjs
node scripts/Test-ADR005-Cutover-Readiness.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Test-Prn232-Final-Acceptance.ps1 -IncludeGatewayOutage -IncludeIndependentRedisSmoke
```

## Scope and evidence integrity

GitHub Actions project-quality is the only workflow in this repository at
this checkpoint; push to `main` triggers CI, not a database migration
script in that workflow. **External platform auto-deploy hooks, if configured
outside GitHub Actions, are not proven absent** and require separate review
before treating a code merge as a live release.

Status of academic evaluation, reviewer signatures and deployment to public
HTTPS is **unverified**, not silently marked PASS.
