# ADR-005 — Independent Identity & Profile owner migration

Updated: 11 November 2026. **Status: opt-in target slice verified in local isolated Docker QA, not default deployment/cutover.**

## Implemented

- `src/LongevityDiet.Identity` runs separately on internal HTTP :8081; its QA-only host port is bound to `127.0.0.1:18081`.
- `LongevityIdentityDb` is created by its own EF migration and `IdentityDbContext`, with exactly the owned entities: Users, UserProfiles, RefreshTokens, ReminderPreferences, UserNotifications, IdentityOutbox, IdentityInbox. It has no other domain DbSets or foreign-database FK.
- `/api/v1/auth/register|login|refresh|revoke` reuses the existing `AuthenticationService`, ASP.NET password hasher, SHA-256 hashed refresh-token storage, refresh-token rotation/revocation, JWT role/issuer/audience scheme, HttpOnly Strict cookie with scoped path, and auth rate limiter.
- `GET/PUT /api/v1/profile` requires a bearer JWT, validates the profile/time zone, and persists `UserProfileUpdated.v1` in **the same IdentityDb transaction** as profile changes. Existing reminder preference versions/outbox entries are updated in that same transaction if a time-zone change affects a saved preference.
- Identity-owned `IdentityOutboxPublisher` publishes `ReminderPreferenceUpdated.v1` to `ldc:identity-events` and `UserProfileUpdated.v1` to the separate `ldc:identity-profile-events` stream; each successful Redis XADD is acknowledged on IdentityDb. This prevents the old reminder Worker from sending unsupported profile messages into its dead-letter stream. Consumers must deduplicate `eventId` because the publisher is at-least-once.
- `/health` (liveness) and `/ready` (owned SQL query) are independent.
- SQL connections fail closed when their InitialCatalog is not `LongevityIdentityDb`; no fallback to `LongevityDietDb`. The standard current API and Gateway remain unchanged.

## Verified locally

```powershell
cd D:\PRN232\FPTUSE_LongevityDiet
docker compose -p prn232-acceptance -f docker-compose.yml `
  -f D:\PRN232\DockerRuntime\prn232-acceptance.volumes.yml `
  -f docker-compose.gateway.yml -f docker-compose.catalog.yml `
  -f docker-compose.identity.yml --env-file .env up -d --build identity
node scripts/Test-Identity-Service-Http.mjs
powershell -ExecutionPolicy Bypass -File scripts/Validate-ProjectStructure.ps1
dotnet test LongevityDiet.sln -c Release
```

The 31-case local HTTP/SQL/Redis acceptance verified registration, duplicate email and weak password, login failure/success, JWT protection, profile updates/invalid time zone, token rotation/replay/revoke, distinct-users isolation, SQL user/profile persistence, outbox and revoked-token storage. It **explicitly verifies the synthetic IdentityDb user was not silently duplicated in the legacy MainDb**.  This is intentionally a cutover blocker, not a migration completion claim.

## Open migration gates (must not call ADR-005 complete)

1. Export/import and reconcile existing users, credential hashes, active sessions and refresh-token lineage into IdentityDb with repeatable zero-downtime verification; redact sensitive logs, ensure rollback.
2. Update Planning, Tracking, Worker and Gateway contracts to consume Identity-owned profile signals, enforce foreign identity ownership without cross-DB SQL, and handle eventual consistency/versioned replay.
3. The Identity-owned Outbox → Redis Streams publisher is implemented and tested. Still missing: Profile signal consumers and copied read models with version/idempotent replay; Identity-owned notification-result inbox/consumer and complete reminder preference API. Retire the transitional MainDb poller only after their cutover.
4. Cut over **all** auth/profile/notification routes and end-user login flows through Gateway only after the other service owners are migrated and full browser E2E stays green.
5. Enforce production TLS443, no public domain ports, service-to-service security, operating/restore playbook, reviewer and lecturer signoff.

**The official 3-page PRN232 Final Assignment is less strict than the group's six-DB ADR-005 target.** A green official-PDF QA gate is not an ADR-005 production readiness proof. No real data migration or public deployment was performed.
