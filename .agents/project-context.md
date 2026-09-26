# Project Context - Longevity Diet Companion

## Product
Longevity Diet Companion (LDC) is a PRN232 wellness/education/adherence application. It turns longevity-diet/lifestyle principles into explainable planning, tracking, recommendation and progress workflows. It is not a medical device.

## Assignment hard requirements
- ASP.NET Core REST API (.NET 8+; project uses .NET 9)
- RESTful CRUD and query features
- API -> Services -> Repository layering
- JWT authentication
- Background processing service
- Message broker with producer + consumer (project uses Redis Streams)
- Independent gRPC service with REST API interaction
- EF Core + relational database (project uses SQL Server 2022)
- DI, configuration, logging, exception handling
- Docker containerization / Docker Compose
- Swagger/OpenAPI
- Final demo must show architecture, REST, background job, publish/consume, gRPC, Docker and an end-to-end business flow

## Target C4 model
- Assignment C0 = System Context view.
- Assignment C1 = Container view.
- C0 shows people, the LDC software system, and direct external software systems only.
- C1 shows deployable/runtime containers: Web, REST API, Recommendation gRPC, SQL Server, Worker, and logical Application Event Streams implemented with Redis 7 Streams, plus direct people/external software systems.
- Per the official C4 queues/topics guidance, model logical queues/topics/streams as C4 containers (data stores), not the Redis broker/server itself as a container.
- Optional Local AI/Ollama may appear as an optional external dependency for explanation rewrite only.
- Do not model Controller/Service/Repository as C1 containers.
- Do not copy Mobile App, Cloudinary, Brevo, RabbitMQ, or separate microservices from a reference image.

## Runtime invariants
- Browser -> Web -> REST API.
- Browser never connects directly to SQL, Redis or gRPC.
- REST API -> Recommendation Service via gRPC/HTTP2.
- REST API commits business data + Outbox in one SQL transaction.
- Worker publishes pending Outbox events to Redis Streams.
- Worker consumes/acknowledges Redis Streams with idempotency.
- Optional AI cannot change deterministic ranking, safety rules or LDAS.

## Diagram quality
Every final diagram must stand alone with title, scope, legend, explicit element type, short responsibility, technology where applicable, directional labelled relationships, and readable protocol labels.
