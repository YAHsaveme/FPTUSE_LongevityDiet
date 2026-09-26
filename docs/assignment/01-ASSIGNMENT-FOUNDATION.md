# Longevity Diet Companion - Assignment Foundation

## 1. Context

Many people can understand general longevity-diet principles, but turning them into consistent daily behaviour is difficult. They still need to decide what to eat, when to eat, how to record meals and activity, and how to understand whether they are following the intended principles.

**Longevity Diet Companion (LDC)** is a wellness and adherence application that converts public longevity-diet principles into practical daily workflows.

LDC is **not a medical device**. It does not diagnose disease, prescribe treatment, predict lifespan, or generate therapeutic fasting protocols.

## 2. Problems

### P1 - Knowledge does not automatically become daily behaviour
Users may understand a principle but still lack a repeatable workflow for planning, tracking and reviewing daily habits.

### P2 - Personal constraints make generic plans unsuitable
Allergies, excluded foods, preferences, meal timing and schedule differences mean a single generic plan cannot fit every user.

### P3 - Users need understandable feedback
A score or recommendation is not useful if the user cannot understand why it was produced.

### P4 - Progress is fragmented
Meals, eating window, activity and adherence are often tracked separately, making it hard to see one coherent progress picture.

### P5 - Safety-sensitive fasting content can be misunderstood
FMD-related content must be separated from ordinary meal planning and routed through safety acknowledgement rather than being treated as general self-treatment guidance.

### P6 - The Assignment requires a distributed-system demonstration
The product must also demonstrate REST, JWT, background processing, message broker, gRPC, database persistence and Docker in one coherent business flow.

## 3. Solutions

### S1 - Guided onboarding and profile
Capture the user profile, dietary preferences, exclusions and daily schedule once, then reuse that context throughout the application.

### S2 - Rule-based meal planning
Generate a 7-day or 14-day plan using active rules and hard safety constraints before scoring or ranking candidates.

### S3 - Explainable recommendation
Use an independent gRPC Recommendation Service that returns ranked alternatives together with reason codes instead of opaque AI-only answers.

### S4 - Daily tracking and progress
Combine meal logging, eating-window tracking, activity and adherence score into one progress workflow.

### S5 - Background automation
Commit domain events to a transactional Outbox in SQL, then use the Worker to publish them to Redis Streams and consume them idempotently for reminders, score recalculation, weekly reports, retry and dead-letter handling.

### S6 - Safety-first FMD boundary
Keep FMD education/tracking separate from normal meal planning and require a safety gate before tracking.

## 4. Main Actors

### Guest
- View product introduction and general principles.
- Register and sign in.

### Member
- Manage own profile and preferences.
- Generate and view meal plans.
- Log meals and activity.
- Track eating window.
- View LDAS and progress.
- Request meal replacements/recommendations.
- Join the 14-day adherence challenge.
- Configure reminders and view weekly reports.

### Administrator
- Manage food and recipe catalog.
- Manage and version diet rules.
- Review audit/event/job status.
- Maintain system reference data.

## 5. Main Features

1. Authentication and Profile
2. Food and Recipe Catalog
3. Rule Catalog and Rule Versioning
4. Meal Plan Generation
5. Meal and Eating-Window Tracking
6. Activity Tracking
7. Longevity Diet Adherence Score (LDAS)
8. gRPC Meal Recommendation
9. 14-Day Adherence Challenge
10. Reminder and Weekly Report
11. FMD Education and Safety Gate
12. Admin Catalog, Rule and Audit Management

## 6. Main Business Flow

`Register/Login -> Onboarding -> Resolve Rules -> Generate Plan -> Log Meal/Activity -> Calculate Progress -> Request Recommendation -> Receive Reminder/Weekly Report`

The distributed-system demonstration extends the same flow:

`Web -> REST API -> SQL + Outbox -> Worker Publisher -> Redis Streams -> Worker Consumer`

and:

`REST API -> gRPC Recommendation Service -> Ranked Recommendation`

## 7. Technology

| Layer | Technology | Purpose |
|---|---|---|
| Web | React 19, TypeScript, Vite, Nginx | SPA UI and reverse proxy |
| REST API | ASP.NET Core .NET 9 | HTTP API, auth, business orchestration |
| Application | .NET Services layer | Business workflows and rules |
| Persistence | EF Core 9 | ORM and migrations |
| Database | SQL Server 2022 | System of record |
| Recommendation | ASP.NET Core gRPC .NET 9 | Independent typed ranking service |
| Message Broker | Redis 7 Streams | Durable asynchronous messaging |
| Background | .NET Worker Service | Outbox publisher, consumers and scheduled jobs |
| Security | JWT + rotating refresh token | Authentication and session management |
| API Docs | OpenAPI + Swagger UI | API discovery and demo |
| Deployment | Docker + Docker Compose | Reproducible local distributed environment |
| Testing | xUnit, WebApplicationFactory, Playwright | Unit, integration and browser E2E |
| Optional AI | Local LLM / Ollama-style HTTP API | Explanation rewrite only; never ranking/safety authority |

## 8. Scope Boundary

### In scope
The 12 main features above plus all mandatory PRN232 distributed-system requirements.

### Out of scope
- payment;
- social network;
- wearable integration;
- telemedicine;
- custom ML model training;
- lifespan prediction;
- diagnosis or treatment.

## 9. Assignment Quality Principles

- Keep the product problem visible before technology.
- Keep actors and responsibilities explicit.
- Keep C4 diagrams at one abstraction level per view.
- Every architecture relationship has a direction and a meaningful label.
- Do not show controllers/services/repositories as separate C1 containers.
- Do not show browser access to SQL, Redis or gRPC directly.
- Keep conceptual ERD simpler than the physical schema.
