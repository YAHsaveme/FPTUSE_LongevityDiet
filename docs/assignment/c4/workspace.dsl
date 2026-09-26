workspace "Longevity Diet Companion" "PRN232 Assignment architecture model" {
    model {
        guest = person "Guest" "Browses public longevity-diet education, registers, and signs in."
        member = person "Member" "Uses personalised planning, tracking, recommendation, adherence, challenge, reminder, and report features."
        admin = person "Administrator" "Manages catalog, versioned diet rules, audit data, and background/event operations."

        ldc = softwareSystem "Longevity Diet Companion" "Wellness/education/adherence software system that turns longevity-diet principles into safe, explainable daily workflows." {
            web = container "Web Application" "Single-page web UI for Guest, Member, and Administrator. Nginx serves the production build and reverse-proxies API requests." "React 19 + TypeScript + Vite + Nginx" "Web"
            api = container "REST API" "Public application boundary for JWT authentication/authorization, RESTful CRUD/query endpoints, business orchestration, persistence, and gRPC client calls." "ASP.NET Core .NET 9 + EF Core 9" "Api"
            recommendation = container "Recommendation Service" "Independent deterministic meal-ranking service. Applies hard safety constraints before weighted ranking and returns reason codes." "ASP.NET Core gRPC .NET 9" "Grpc"
            database = container "SQL Server" "Primary system of record for identity, profile, catalog, rules, plans, logs, adherence, engagement, safety, audit, Outbox, and idempotency records." "SQL Server 2022" "Database"
            worker = container "Background Worker" "Publishes transactional Outbox messages, consumes Redis Streams idempotently, and runs reminders, reports, recalculation, retry, and dead-letter workflows." ".NET 9 Worker Service" "Worker"
            redis = container "Application Event Streams" "Logical Redis streams for domain/notification events, consumer-group processing, acknowledgement, retry, and dead-letter handling." "Redis 7 Streams" "Queue"
        }

        optionalAi = softwareSystem "Optional Local AI Runtime" "Optional local LLM/Ollama-style runtime that rewrites structured reason codes into friendly explanations. It never changes ranking, safety constraints, or LDAS." "External,Optional"

        guest -> ldc "Browses public information, registers, and signs in"
        member -> ldc "Uses personalised planning, tracking, recommendation, adherence, and progress workflows"
        admin -> ldc "Administers catalog, rules, audit, event, and job operations"
        ldc -> optionalAi "Optionally rewrites deterministic structured explanations" "Local HTTP/JSON" "Optional"

        guest -> web "Browses public content and authenticates" "HTTPS"
        member -> web "Uses member planning, tracking, recommendation, and progress UI" "HTTPS"
        admin -> web "Uses protected administration UI" "HTTPS"

        web -> api "Calls RESTful application endpoints" "HTTPS + REST/JSON"
        api -> database "Reads/writes business state and commits Outbox records" "EF Core / TDS"
        api -> recommendation "Requests ranked meal alternatives and reason codes" "gRPC / HTTP2"
        api -> optionalAi "Optionally rewrites structured explanation text" "Local HTTP/JSON" "Optional"

        worker -> database "Reads pending Outbox records and writes asynchronous results/idempotency state" "EF Core / TDS"
        worker -> redis "Publishes pending domain/notification events" "Redis Streams XADD" "Async"
        redis -> worker "Delivers events for idempotent processing and acknowledgement" "Redis Streams XREADGROUP + XACK" "Async"
    }

    views {
        systemContext ldc "C0-SystemContext" {
            include guest
            include member
            include admin
            include ldc
            include optionalAi
            autoLayout lr 160 160
            title "C0 - System Context - Longevity Diet Companion"
            description "Assignment C0: whole-system business context, direct people, and direct external software dependencies."
        }

        container ldc "C1-Container" {
            include guest
            include member
            include admin
            include web
            include api
            include recommendation
            include database
            include worker
            include redis
            include optionalAi
            autoLayout tb 140 140
            title "C1 - Container Architecture - Longevity Diet Companion"
            description "Assignment C1: deployable/runtime applications and data stores with explicit responsibilities, technologies, and communication protocols."
        }

        styles {
            element "Person" {
                shape Person
                background #FFFFFF
                color #111827
                stroke #374151
                strokeWidth 2
                fontSize 20
            }
            element "Software System" {
                shape RoundedBox
                background #FCE8D5
                color #111827
                stroke #C58B42
                strokeWidth 2
                fontSize 20
            }
            element "Container" {
                shape Box
                background #FFFFFF
                color #111827
                stroke #374151
                strokeWidth 2
                fontSize 18
            }
            element "Database" {
                shape Cylinder
            }
            element "Queue" {
                shape Pipe
            }
            element "External" {
                background #FFFFFF
                color #111827
                stroke #6B7280
                border dashed
            }
            element "Optional" {
                border dashed
            }
            relationship "Relationship" {
                color #374151
                thickness 2
                routing Orthogonal
                fontSize 16
            }
            relationship "Async" {
                style dashed
            }
            relationship "Optional" {
                style dashed
                color #6B7280
            }
        }
    }
}
