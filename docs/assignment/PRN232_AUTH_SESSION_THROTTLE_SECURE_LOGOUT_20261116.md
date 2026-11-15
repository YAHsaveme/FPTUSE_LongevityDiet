# PRN232 — Bounded session rate limits and server-confirmed logout (2026-11-16)

## Evidence and original defect
- In PR #80 Docker CI run `43743080894`, the final `POST /api/v1/auth/refresh` returned HTTP 429 after many synthetic browser accounts shared one runner IP. Previously, login, register, refresh and revoke were all counted in the same fixed-window 40/min/IP `auth` partition.
- The React `AuthContext.logout` also cleared its local session in `finally` when `POST /auth/revoke` failed. The HttpOnly refresh cookie could remain valid, creating a risk of silently re-entering a supposedly signed-out account on a subsequent browser reload.

## Changes
1. Legacy API: keep the strict `auth` 40/min/IP budget for register/login. Add bounded, distinct `auth-refresh` and `auth-revoke` fixed windows, each 100/min/IP with no queue. Controller action attributes select these policies; no blanket disabling of rate limits.
2. Independent Identity service: retain `identity-auth` 40/min/IP for credential entry; use separate `identity-refresh` and `identity-revoke` 100/min/IP policies on the corresponding endpoints.
3. React: `logout()` clears the access token and user **only after** the server confirms revocation. On a network error, HTTP 429 or 5xx, the profile page stays authenticated and displays a fixed Vietnamese retry message. This works even if the profile GET is loading or failed.
4. Push subscription cleanup is kept best-effort and never prevents a later explicit server revoke attempt. It may unsubscribe the device even when logout fails; a user can opt in to notifications again.

## Independent verification performed locally
- Isolated `IdentityApiTests.LoginThrottle_DoesNotBlockRefreshOrServerConfirmedRevoke`: **PASS**. After 45 malformed login requests trigger the strict limiter, authenticated refresh still returns 200, revoke returns 204 and token replay returns 401.
- The previous `Member1SecurityApiTests.AuthRateLimit_Returns429WithProblemDetailsAndRetryAfter` now exercises the credential endpoint and still verifies 429, JSON ProblemDetails and Retry-After 60.
- Full .NET Release suite: **108 unit + 122 integration = 230 PASS**, zero failures.
- Frontend: **74 Vitest + 10 Node = 84 PASS**, Oxlint zero issues, TypeScript/Vite production build PASS. `ProfileEditorPage.logout.test.tsx` covers success and failure across loading/error/ready states (7 PASS).

## Release constraints and remaining work
- Merge only after GitHub Actions `validate` AND `current-runtime-release-smoke` are successful on the exact PR head. Isolated Docker acceptance still has to prove the independent Identity route composition and high-request flows; local results alone are not that gate.
- Rate limiting remains bounded; a legitimate request may still receive 429 under unusually high traffic. The UI must never claim server-confirmed sign-out if revocation failed.
- No user SQL records, Docker named volumes, Gemini key, original copyrighted PDF, diet rules or production recipe catalog were modified.
- Issue #81 (recipe ingredient/allergen association history) is independent and remains open. This change does not certify complete PRN232 or medical safety.
