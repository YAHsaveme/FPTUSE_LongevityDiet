# PRN232 Final Assignment — Official deployment scope: Docker Compose, no domain

**Decision (13 November 2026):** The team will satisfy the PRN232 deployment
requirement through **Docker Desktop + Docker Compose on localhost**.
A public DNS domain, paid hosting, public TLS certificate, external VPS,
and cloud deployment are **NOT required for the assignment submission**.

## Source requirement and interpretation

Reference: the original three-page `PRN232 - Final Assignment.pdf`.

- Section 3, **Deployment Requirements**, permits **one of two** choices:
  **Docker Desktop with Docker Compose** OR a **public cloud platform**.
  It requires all necessary services to be deployed and their actual
  inter-service communication demonstrated.
- Section 6, **Demonstration**, requires a live demo of **Docker or cloud
  deployment**, along with REST API, worker, broker producer/consumer,
  independent gRPC communication and end-to-end business workflow.
- Section 7, **Assessment Criteria**, assigns **10%** to **Docker/Cloud
  deployment**. No criterion names a public DNS domain or URL.
- Section 5 requires complete source, database migrations/scripts,
  Dockerfiles, Docker Compose configuration (if applicable), OpenAPI
  and README installation/deployment instructions.

## Required demonstration on local Docker

Use the existing Compose stacks and QA scripts to show:

1. Docker Desktop + Docker Compose starting SQL Server, Redis, Web,
   ASP.NET Core API, Worker and independent gRPC Recommendation service.
2. `docker compose ps`, health/readiness endpoints and meaningful logs.
3. JWT-authenticated REST requests and database changes.
4. Redis Streams producer/consumer/ACK and the background job.
5. API communicating with the gRPC service in its own container.
6. One working end-to-end flow on the browser connected to real
   localhost Compose services.
7. Present architecture and database diagrams and explain each service.
   Optional RabbitMQ/SMTP QA may be shown as additional functionality.

Use the seven-step demonstration guide:
`docs/assignment/PRN232-FINAL-DEMO-7-STEPS.md`.

## Explicitly removed from the PRN232 assignment checklist

- Registering or purchasing any public domain.
- Configuring public DNS records and a public HTTPS:443 ingress.
- Deploying the assignment to Azure/AWS/Render/Railway/VPS.
- Switching customer traffic or migrating historical live customer
  data between the current database and ADR-005 target microservices.
- Sending real Gmail to customers or receiving Web Push on a physical
  customer's device; synthetic worker/in-app messaging demonstrates
  the compulsory background-job/broker requirements.

These are **optional future production-go-live activities**, not reasons
to block academic Docker deployment or the final demo.

## Important boundary

Retain existing application URLs, security configuration and local
HTTPS where useful; they are not a commitment to purchase a domain.
Retain the ADR-005 production cutover **fail-closed** gate and its
historical data/backup requirements if the product is later published.
Do not bypass those checks merely because the academic domain
requirement was removed.

Evidence status: the integrated source already passed local Docker QA
and post-merge GitHub Actions on `main` (commit
`5079adb1cd6f1ef1d35c34c50a0c463dbe6a7fda`). This does not
certify a lecturer has watched the live final presentation or awarded
a grade.
