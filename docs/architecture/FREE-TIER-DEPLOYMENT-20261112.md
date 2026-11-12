# ADR-005 low-cost academic deployment plan — 12 November 2026

## Immediate, zero-fee public UI (no payment card)

**GitHub Pages** publishes a static, non-production preview on
`https://yahsaveme.github.io/FPTUSE_LongevityDiet/`. The public GitHub
repository is eligible for free Pages. The `gh-pages` branch contains only
compiled UI assets, a Vite-generated static document, `.nojekyll` and an
identical `404.html` as a SPA fallback.

This is **not a live full-stack deployment**. Pages cannot run ASP.NET Core,
YARP, SQL Server, background tasks or a real Redis stream. The preview is
built with `VITE_STATIC_PREVIEW=true`, visibly warns about missing backend,
and must never encourage visitors to use real credentials or personal health
information. Changing the browser's API base URL does not magically make
the legacy database or owner APIs publicly available.

Frontend Vite code now supports a non-root deployment path using Vite's
`BASE_URL`. In static preview mode only, it uses `HashRouter` for working
shareable routes like `/#/login` (which respond with HTTP 200 on Pages),
while the normal Docker app uses BrowserRouter and unchanged URLs.
To rebuild the preview:

```powershell
Set-Location D:\PRN232\FPTUSE_LongevityDiet
$env:VITE_STATIC_PREVIEW='true'
npm --prefix src/LongevityDiet.Web run build -- --base=/FPTUSE_LongevityDiet/
Remove-Item Env:VITE_STATIC_PREVIEW
```

Copy only `src/LongevityDiet.Web/dist/*` into a dedicated `gh-pages`
branch; add `.nojekyll` and `404.html` mirroring `index.html`, then
select `gh-pages / (root)` in GitHub Pages settings. No `.env`, connection
string, passwords, JWT signing keys or synthetic QA records may be copied.

## Alternative static hosts (same source)

- **Vercel Hobby**: free for personal/non-commercial educational uses only.
  The Web project root is `src/LongevityDiet.Web`. `vercel.json` supplies
  the build and SPA fallback. Configure `VITE_STATIC_PREVIEW=true` until a
  private backend is operational and medically/privacy reviewed.
- **Cloudflare Pages Free**: connect GitHub repo, set root
  `src/LongevityDiet.Web`, build `npm run build`, output `dist`.
  `public/_redirects` supports React BrowserRouter. The free plan has 500
  builds/month (published September 2026).
- **Railway Free**: not recommended to host current SQL Server. It has
  $1/month of non-rollover usage credits and 0.5 GiB max RAM per service.
  SQL Server containers need roughly 2 GiB RAM minimum. Its 30-day trial
  credit does not constitute long-term free hosting.
- **Render Free**: web instances sleep after 15 minutes idle; free managed
  Postgres expires after 30 days. It cannot preserve the current always-on
  Redis background processing and full SQL Server architecture.

## Most faithful managed-DB path: Azure SQL Database Free

Azure SQL Database's Free offer can host **up to ten free SQL Server-compatible
logical databases per subscription**, each limited to 100,000 vCore-seconds,
32 GiB data and 32 GiB backup storage per month. That allows six independent
`LongevityIdentityDb`, `LongevityCatalogDb`, `LongevityPlanningDb`,
`LongevityTrackingDb`, `LongevityRecommendationDb` and
`LongevityWorkerDb` without rewriting all EF Core SQL Server migrations.

**Mandatory billing guard:** choose `AutoPause` when free usage is exhausted,
never `BillOverUsage`. Free databases can auto-pause after 15 minutes idle
and have no SLA. Verify Azure portal's zero-charge offer and subscription
eligibility before any resource creation.

**Azure Container Apps Consumption** offers an aggregated monthly grant of
180,000 vCPU-seconds, 360,000 GiB-seconds and two million requests per
subscription. These are *allowances, not a hard zero-dollar spending cap*.
Separate always-running six web services and a Redis consumer may exceed the
grant. Do not provision paid services, public ingress, logging, network
egress, container registry or non-AutoPause databases without a measured
bill/usage forecast and an explicit user-approved spending limit.

Redis needs a separate verified no-cost Redis-compatible provider supporting
`XADD`, `XREADGROUP`, `XAUTOCLAIM` and `XACK`, with TLS and secrets kept
outside Git. The current project has not been migrated to external Redis,
and `docker-compose.*.yml` still points to private Docker hostname `redis`.

## Preconditions for any live end-to-end deployment

1. User must create/authorize a cloud workspace and subscription; never paste
   passwords, service tokens or database connection strings into chat.
2. Confirm provider's **free tier**, region, capacity and billing limits.
   Turning on `BillOverUsage` or `Pay As You Go` is not approved.
3. Provision an isolated **synthetic QA** environment, not import real
   health/accounts data. Run EF migrations per owner after database security,
   encrypted connections and secret storage are configured.
4. Deploy private ASP.NET/Gateway/Redis services, configure proper TLS, allow
   only the trusted backend-to-backend paths and avoid public SQL/Redis ports.
5. Re-run signed JWT, six-owner Gateway, IDOR, gRPC HTTP/2, Outbox, Worker,
   browser and cutover preflight acceptance *on those cloud services*.
6. Do not swap the current app or merge `main` until legacy migration and
   rollback are proven and team reviewers have approved.

**This documentation describes a safe path; it is not a claim that Azure,
Vercel, Cloudflare, or any backend service has been provisioned.**
