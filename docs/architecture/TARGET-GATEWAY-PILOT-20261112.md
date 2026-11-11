# ADR-005 target Gateway owner route pilot — 12 November 2026

## What is implemented

This is an **opt-in YARP Gateway sidecar**, not a production cutover. The existing
`gateway` service and current Web's `API_UPSTREAM=gateway:8080` are unchanged.

- `gateway-target` runs the existing Gateway binary with `ASPNETCORE_ENVIRONMENT=Target`.
  It listens internally on `:8080`, and the QA host port `127.0.0.1:18088`
  only. The configuration is versioned in
  `src/LongevityDiet.Gateway/appsettings.Target.json`.
- Strictly bounded host clusters: Identity `:8081`, Catalog `:8082`,
  Planning `:8083`, Tracking `:8084`, Recommendation REST `:8087`
  (gRPC host remains `:8085`) and Worker Ops `:8086`. The Gateway validates
  each exact configured internal destination at startup and fails closed.
- Explicit owner routes have priority over legacy fallback:
  `/api/v1/auth/**` and `/api/v1/profile/**` → Identity;
  `foods`, `recipes`, `diet-rules` and relevant admin CRUD/governance
  → Catalog; `meal-plans`, `challenges` → Planning;
  `activities`, `meal-logs`, `ldas`, `eating-window` → Tracking;
  `recommendations/feedback` and `recommendations/food-preferences` →
  Recommendation REST; `admin/jobs`, `admin/events`, `admin/dead-letter`
  → Worker Ops. Only implemented owner paths are routed this way.
- `/openapi/**` and other original legacy API paths remain on the current
  API fallback. This is **intentional temporary dual routing**, not a claim
  that every target endpoint is implemented. Where target owners have
  different response shapes from the legacy API, the existing Web cannot be
  silently switched.
- `/gateway/target/ready` verifies six independently running owner REST APIs;
  `/gateway/ready` still checks legacy API readiness. The Gateway is not
  permitted to rewrite Authorization headers or invent trust in JWTs; each
  backend verifies the signed token independently.
- `scripts/Test-Target-Gateway-Http.mjs` runs 27 real QA cases against the
  target YARP sidecar and isolated Docker project: 401 without token,
  JWT-protected Identity register/profile, Catalog, Planning preferences
  write/read and user separation, Tracking activity/meal logs, Recommendation
  feedback/preferences, Worker Admin RBAC and OpenAPI legacy fallback.

## Explicit blockers before real production cutover

1. **Legacy account/data migration and dual-write protocol**: Snapshot, audit
   reconciliation, consent/approval, recoverable migrations and rollback are not
   complete. A token issued by the new Identity service does not make the
   legacy main SQL account available automatically.
2. **Missing target behaviors**: Planning owner cannot yet generate the legacy
   14-day live plan from versioned Catalog rules; some wellness/FMD and weekly
   report routes still run in the legacy API. Worker target reminder runs, but
   event-driven weekly reports and domain read-model consumption are pending.
3. **Cross-service contracts**: Historical event import, reader inbox/replay,
   incident retry policies and complete deduplication semantics must be
   exercised beyond synthetic QA.
4. **Public exposure**: HTTPS 443 requires a user-owned domain/DNS and a valid
   certificate/reverse proxy. No public ingress has been configured.
5. **Human approval**: Production access, backups, monitored cutover window and
   reviewer/lecturer sign-off are not implied by CI or Docker QA.

**Do not merge this PR into `main`, point current Web at `gateway-target`,
or expose port 18088 externally before those blockers are resolved.**
