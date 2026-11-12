# ADR-005: Independent Recommendation owner checkpoint (11 November 2026)

## Optional runtime, verified on isolated QA Docker

- The existing `LongevityDiet.Recommendation.Grpc` process remains unchanged in default Compose. Its deterministic activity coach and Ranking gRPC methods continue to work with no SQL dependency.
- An **opt-in second process** `recommendation-owner` uses the same tested gRPC implementation via internal **HTTP/2 :8085** and an internal REST listener at **:8087**. Both QA host ports bind to `127.0.0.1`; Gateway/Web still use the legacy runtime.
- `LongevityRecommendationDb` is a separate SQL catalog with its own EF migration. Only `RecommendationFeedbacks`, `UserFoodPreferences`, `RecommendationOutbox`, and `RecommendationInbox` are owned here. No SQL Foreign Key to Users, Catalog, Planning, Tracking or Worker and no cross-owner SQL query.
- Owned REST API: authenticated feedback GET/POST with GUID idempotency, explicit preference GET/PUT/DELETE with strict food-token validation, two-account IDOR checks and Identity REST active-user verification using the same JWT (no Identity DB access).
- `Dislike` feedback never automatically becomes an `ExplicitExclusion`; only an explicit preference setting can create an exclusion. Feedback events do not rewrite production ranking weights. The ranking engine remains deterministic and stateless; consuming the newly owned preference snapshot is a **future cutover**.
- Events `RecommendationFeedbackSubmitted.v1` and `UserFoodPreferenceChanged.v1` are persisted in the same SQL transaction as each change, then published at-least-once to `ldc:recommendation-events` Redis stream with eventId deduplication contract. No consumer is claimed as implemented merely because an Inbox table exists.
- The optional runtime requires exact SQL catalog name `LongevityRecommendationDb`, JWT issuer/audience/key, Redis address, and a fixed Identity private API base URL before starting. No fallback to the main/shared DB.
- `scripts/Test-Recommendation-Owner-Http.mjs`: 27-case QA initial run (SQL migration, HTTP/2 real gRPC, JWT, feedback idempotency, disliking vs excluding, IDOR, owner SQL, SQL outbox to Redis) PASS on isolated Docker. Workflow CI reruns the same suite on Linux.

## Safe-release boundary

**NOT FULL ADR-005**: existing Web/Legacy API still uses its main DB for RecommendationFeedback and meal replacement; replacement transaction belongs to Planning, so the new owner does not mutate Plans. No silent historical-data migration has occurred. State sync from preference changes to the ranking engine requires a versioned gRPC/snapshot contract, Inbox/replay and audited cutover. Worker reporting, final service-to-service routes, TLS443 public proxy, failure drills and team reviewer/demo signoff remain outstanding.

The default gRPC process has no SQL connection string and must continue to pass original PRN232 gRPC smoke tests. The new owner is an independent opt-in deploy slice, not a graded/production guarantee.
