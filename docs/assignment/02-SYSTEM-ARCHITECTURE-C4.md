# C4 — Complete Current System Architecture

The canonical, source-verified Draw.io/PDF set has exactly four overall diagrams. See [all four diagrams](one-page/README.md). These reflect the latest merged develop code, not a speculative six-microservice architecture.

## C0
Member and Administrator access one complete LongevityDiet platform. C0 excludes Docker internals; actors are real roles present in the code.

## C1
Actual deployable containers: Web (Nginx/React), REST API (.NET 9), independent stateless Recommendation gRPC, Redis Streams, Reminder Worker, and three distinct SQL catalogs (Identity/Planning/FMD, Tracking, Worker). Host ports: Web 5173 -> 80, API 8080, gRPC 8081 HTTP/2, Redis 6379, SQL 14330 -> 1433. Worker has no inbound HTTP port.

## C2
Full current REST API components, not just one teaching slice: AuthController, ProfileController, ReminderNotificationsController, TrackingController, RecommendationController (activity advice), MealPlansController, MealLogsController, EatingWindowController, RecommendationsController (V2), and FmdController. Each module has a real service, persistence / gRPC adapter, and destination identified in the diagram. JWT/routing, rate limits, OpenAPI and Redis bridge are shared infrastructure; Worker and independent gRPC host remain separate containers in C1.

## Database Diagram
All 32 mapped EF Core tables across LongevityDietDb (21), LongevityTrackingDb (7), LongevityWorkerDb (4); all nine real local SQL FK arrows attached in the SAME overall drawing. Logical cross-database UserId and Redis event correlations are not fake SQL FKs.

Future 52-table personalized wellness/check-in work is a [separate research specification](05-LONGITUDINAL-NUTRITION-TARGET.md), not an implemented database. A green diagram/test result does not assert live Docker SQL Server acceptance or clinical validity.
