# C4 Architecture — PRN232 student scope

Based on https://c4model.com/diagrams and current source/Docker Compose.

## C0: System Context

Two actors (Member and Administrator) use the LongevityDiet software system.
No framework, database or Redis box belongs at this zoom level.

## C1: Container Architecture

Within the software system:
- Web UI: React/TypeScript/Vite
- REST API: ASP.NET Core (.NET 9), JWT and CRUD
- Recommendation gRPC: independent ASP.NET Core ActivityCoach.Recommend endpoint (real HTTP/2)
- Background Worker: .NET job host and Redis consumer
- SQL Server: EF Core Identity / Tracking / Worker databases
- Redis Streams: broker carrying async events

Solid links correspond to current implemented calls/dependencies.
REST API → gRPC is a **solid synchronous HTTP/2 call**. A real gRPC Kestrel
listener plus JWT-authenticated REST API and SQLite test databases passed
the end-to-end integration test. Docker + live SQL Server remain unverified.

Docker Compose is a separate deployment concern, not a justification for
inventing six REST microservices.

## C2: REST API Components only

Scope is the single LongevityDiet.API container.
Controllers → Authentication/Profile/Tracking/Reminder services → EF Core
repositories/DbContexts. Identity Redis Bridge is a hosted event-integration
component. JWT, rate limiting, error handling and health checks are
cross-cutting. RecommendationController calls TrackingService for the
member's weekly summary, then a generated ActivityCoach gRPC client
for deterministic educational feedback. C2 depicts these real components.

Each arrow has a direction and relationship label. The diagrams use
plain monochrome, standard editable Draw.io shapes and a clean one-page
layout.

Editable source and PDFs: [one-page/README.md](one-page/README.md).
