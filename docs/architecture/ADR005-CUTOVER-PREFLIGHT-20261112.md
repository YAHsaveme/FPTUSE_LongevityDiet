# ADR-005 read-only cutover preflight and release gate (12 November 2026)

## What this is

`scripts/Audit-ADR005-Cutover-Readiness.mjs` produces a **read-only
metadata/count audit** against the isolated `prn232-acceptance` Docker QA
SQL Server. It does NOT read personal row values, write/update any database,
migrate user credentials, copy private data, or open network connections to
production. The script fails closed unless the QA Compose container is
verified; GitHub Actions may use its own ephemeral Compose runner.

The evidence is saved under ignored `.local-backups` (default
`.local-backups/adr005-reconciliation-qa.json`). The evidence includes only
database names, allowlisted physical table names, counts, boolean gates and
blocker codes. It contains **no email, password hashes, refresh tokens,
address fields or real record identifiers**.

Example local QA commands:

```powershell
Set-Location D:\PRN232\FPTUSE_LongevityDiet
node scripts/Audit-ADR005-Cutover-Readiness.mjs --output=.local-backups/adr005-audit.json
node scripts/Audit-ADR005-Cutover-Readiness.mjs --strict
node scripts/Test-ADR005-Cutover-Readiness.mjs
```

`--strict` exits with code 2 while cutover is blocked. The QA test asserts
that a **red release-readiness gate is the correct outcome**, even though
the code test passes. Do not confuse the green CI QA check with migration
readiness.

## Observed isolated QA preflight

On 12 November 2026: seven logical databases present
(`LongevityDietDb` plus six owned targets), **12 cutover blockers**.
The QA source/target Foods, Recipes, Users, MealPlans and MealLogs counts
do not match; historical Identity UUID-level reconciliation is not
performed. These are synthetic QA records, not audited production totals.

Matching row counts alone never prove source and target users or rows
are equivalent. An irreversible user cutover cannot be justified by
count equality, a successful unit test, or by a healthy Gateway.

## Required before any authorized real cutover

1. Freeze legacy writes for an approved interval **or** implement and test
   idempotent change-data-capture with a consistent cutover watermark.
2. Have a database administrator validate encrypted, restorable backups
   of the current database and each target logical database; record checksums,
   retention and tested restore steps **outside** the repository.
3. Write and separately review an Identity migration plan preserving user
   GUIDs, verified password-hash algorithms, account state and privacy
   constraints. Refresh-token invalidation needs a deliberate session policy.
4. Reconcile Catalog/Foods/Recipes/RuleVersions; Planning/MealPlans/FMD/
   Challenges; Tracking/MealLogs/Activities; Recommendation feedback and
   Worker reminders using stable identifiers and validated read models.
   Never copy cross-owner SQL FKs into a service database.
5. Validate Redis consumer offsets, Outbox retries, Inbox deduplication,
   dead-letter replay and compatibility under redeployed instances.
6. Run parallel read-only comparisons for real end-to-end client flows
   before enabling write switches in Gateway/Web. Execute a rollback
   rehearsal that restores account sessions and prevents stale cross-owner
   writes.
7. Configure public HTTPS443 with the owner's real domain, TLS certificates,
   a reverse proxy, monitoring and access rules. Localhost port 18088 is
   QA-only and must never be published as a production endpoint.
8. Obtain user/team approval for data migration, cutover window, potential
   downtime, retention/rollback plan, and independent code review. Any
   lecturer or clinician approval is separate from automated QA.

## Unimplemented product/architecture behavior

The following are explicitly **not fulfilled** by a preflight report:
the current Planning owner cannot yet generate the full 14-day meal plan
from versioned rules and safe catalog recipes; target weekly-report
business aggregation cannot yet consume independent Tracking read models;
historical-user migration and eventual-consistency replay have not been
proven in production. Web currently uses the legacy Gateway safely.

**No data migration or production switch has been executed.**
