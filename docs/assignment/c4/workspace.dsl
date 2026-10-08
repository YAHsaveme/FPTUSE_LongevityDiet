workspace "Longevity Diet Companion" "PRN232 Assignment and engineering C4 architecture model" {
    !impliedRelationships false

    model {
        guest = person "Guest" "Browses and signs in."
        member = person "Member" "Plans, tracks, and gets recommendations."
        admin = person "Administrator" "Manages system data and operations."

        ldc = softwareSystem "Longevity Diet Companion" "Plan, track, and recommend." {
            web = container "Web Application" "Browser UI." "React 19 + TypeScript + Vite" "Web"

            api = container "REST API" "Application API." "ASP.NET Core .NET 9" "Api" {
                controllers = component "Controllers" "HTTP contracts, authorization boundaries, request validation, status codes, and DTO mapping. Identity/profile controllers are implemented; target feature controllers expand this set." "ASP.NET Core Controllers" "Current"
                applicationServices = component "Application Services" "Business workflows and orchestration. AuthenticationService and ProfileService are implemented; target services add planning, tracking, scoring, and recommendation workflows." "LongevityDiet.Services" "Current"
                persistenceAdapter = component "Persistence Adapter" "Repository interfaces/implementations plus LongevityDietDbContext. Identity persistence is implemented; target catalog, plan, tracking, and progress persistence expands this component." "LongevityDiet.Repositories + EF Core 9" "Current"
                recommendationClient = component "Recommendation gRPC Client" "Target client that maps recommendation contracts and invokes the independent recommendation service." "Grpc.Net.Client" "Planned"
            }

            recommendation = container "Recommendation Service" "Meal ranking." "ASP.NET Core gRPC .NET 9" "Grpc,Planned"
            database = container "SQL Database" "System of record." "SQL Server 2022" "Database"

            worker = container "Background Worker" "Async jobs." ".NET 9 Worker Service" "Worker,Planned" {
                outboxPublisher = component "Outbox Publisher" "Planned component that polls unpublished OutboxMessage rows and publishes application events." ".NET BackgroundService + EF Core + StackExchange.Redis" "Planned"
                eventConsumer = component "Event Consumer / Job Processor" "Planned component that reads consumer-group entries, enforces idempotency, executes background work, retries, and acknowledges or dead-letters events." ".NET BackgroundService + StackExchange.Redis" "Planned"
            }

            eventStreams = container "Event Streams" "Async events." "Redis 7 Streams" "Queue,Planned"
        }

        optionalAi = softwareSystem "Local AI Runtime" "Explanation rewrite only." "External,Optional,Planned"

        guest -> ldc "Browses / signs in"
        member -> ldc "Plans / tracks / recommends"
        admin -> ldc "Manages"
        ldc -> optionalAi "Rewrites explanation" "" "Optional"

        guest -> web "Browses" "HTTPS"
        member -> web "Uses" "HTTPS"
        admin -> web "Administers" "HTTPS"
        web -> api "Calls application API" "REST / HTTPS"
        recommendationDtoResponse = api -> web "Returns recommendation results" "HTTPS + REST/JSON" "Response"
        api -> database "Reads/writes state" "EF Core / TDS"
        api -> recommendation "Ranks meals" "gRPC / HTTP/2"
        rankResponse = recommendation -> api "Returns ranked IDs, scores, and reason codes" "gRPC / HTTP2" "Response"
        api -> optionalAi "Rewrites explanation" "HTTP / JSON" "Optional"
        worker -> database "Processes async state" "EF Core / TDS"
        worker -> eventStreams "Publishes / consumes events" "Redis Streams" "Async"

        web -> controllers "Calls protected REST endpoints" "HTTPS + REST/JSON"
        controllers -> applicationServices "Invokes application workflows"
        applicationServices -> persistenceAdapter "Uses persistence abstractions"
        persistenceAdapter -> database "Persists relational state" "EF Core / TDS"
        applicationServices -> recommendationClient "Orchestrates target recommendation requests" "In-process call" "Planned"
        recommendationClient -> recommendation "Invokes RankMeals" "gRPC / HTTP2" "Planned"

        outboxPublisher -> database "Polls unpublished OutboxMessage rows" "EF Core / TDS" "Planned"
        outboxPublisher -> eventStreams "Publishes application events" "Redis Streams XADD" "Async,Planned"
        eventConsumer -> eventStreams "Reads and acknowledges consumer-group entries" "Redis Streams XREADGROUP / XACK" "Async,Planned"
        eventConsumer -> database "Writes ProcessedEvent and background results" "EF Core / TDS" "Planned"

        localDemo = deploymentEnvironment "Local Demo" {
            workstation = deploymentNode "Developer Workstation" "Windows host used for local development and the final assignment demo." "Windows" {
                browserNode = deploymentNode "User Browser" "Execution environment for the React single-page application." "Web Browser" {
                    containerInstance web
                }
                dockerDesktop = deploymentNode "Docker Desktop" "Local container runtime." "Docker Desktop" {
                    compose = deploymentNode "Docker Compose project: longevity-diet" "Runs the six Compose services on the private ldc-network." "Docker Compose" {
                        infrastructureNode "web service / Nginx" "Serves the built SPA and reverse-proxies /api to the REST API." "Docker / Nginx"
                        apiNode = deploymentNode "api service" "ASP.NET Core REST API process; default host mapping 8080 -> 8080." "Docker / .NET 9" {
                            containerInstance api
                        }
                        grpcNode = deploymentNode "recommendation-grpc service" "ASP.NET Core gRPC process; target business contract is planned; default host mapping 8081 -> 8081." "Docker / .NET 9" {
                            containerInstance recommendation
                        }
                        workerNode = deploymentNode "worker service" ".NET Worker process; target processors are planned; no published application port." "Docker / .NET 9" {
                            containerInstance worker
                        }
                        sqlNode = deploymentNode "sqlserver service" "SQL Server runtime; default host mapping 14330 -> 1433." "Docker / SQL Server 2022" {
                            containerInstance database
                        }
                        redisNode = deploymentNode "redis service" "Redis server hosting the logical Application Event Streams; default host mapping 6379 -> 6379." "Docker / Redis 7 Alpine" {
                            containerInstance eventStreams
                        }
                        infrastructureNode "sql-data volume" "Persists /var/opt/mssql." "Docker named volume"
                        infrastructureNode "redis-data volume" "Persists Redis AOF data under /data." "Docker named volume"
                    }
                }
            }
        }

        productionTarget = deploymentEnvironment "Production Target" {
            browserProd = deploymentNode "User Browser" "Browser execution environment for the Web Application." "Web Browser" {
                containerInstance web
            }
            edgeProd = deploymentNode "Web Edge" "Public TLS endpoint that serves the SPA and reverse-proxies /api." "Nginx / TLS" {
                infrastructureNode "TLS termination / reverse proxy" "Public HTTPS entry point." "Nginx"
            }
            privateProd = deploymentNode "Private Application Network" "Private runtime network; SQL Server and Redis are not publicly exposed." "Private Network" {
                apiProd = deploymentNode "REST API host" "Runs the application API." ".NET 9" { containerInstance api }
                grpcProd = deploymentNode "Recommendation host" "Runs the gRPC recommendation service." ".NET 9 / HTTP2 + TLS" { containerInstance recommendation }
                workerProd = deploymentNode "Worker host" "Runs background jobs and event processing." ".NET 9 Worker" { containerInstance worker }
                sqlProd = deploymentNode "SQL Server host" "Private system-of-record database." "SQL Server 2022" { containerInstance database }
                redisProd = deploymentNode "Redis host" "Private Redis Streams runtime." "Redis 7" { containerInstance eventStreams }
            }
        }
    }

    views {
        systemContext ldc "C0-SystemContext" {
            include guest
            include member
            include admin
            include ldc
            include optionalAi
            autoLayout lr 160 160
            title "C0 - C4 System Context - Longevity Diet Companion"
            description "People, the system, and direct external systems only."
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
            include eventStreams
            include optionalAi
            exclude "relationship.tag==Response"
            autoLayout tb 140 140
            title "C1 - C4 Container - Longevity Diet Companion (Target MVP)"
            description "Applications, data stores, and their communication."
        }

        component api "API-Components" {
            include web
            include controllers
            include applicationServices
            include persistenceAdapter
            include recommendationClient
            include recommendation
            include database
            autoLayout lr 120 120
            title "C4 Component View - LongevityDiet.API"
            description "Implemented identity/profile baseline plus explicitly marked target recommendation integration."
        }

        dynamic ldc "Recommendation-Dynamic" "Target synchronous meal recommendation flow" {
            1: member -> web "Requests meal recommendations"
            2: web -> api "Submits recommendation request" "HTTPS + REST/JSON"
            3: api -> database "Loads constraints, candidates, and recent history" "EF Core / TDS"
            4: api -> recommendation "Requests deterministic ranking and reason codes" "gRPC / HTTP2"
            5: rankResponse "Returns ranked IDs, scores, and reason codes"
            6: api -> optionalAi "Optionally rewrites already-computed explanation text" "Local HTTP/JSON"
            7: recommendationDtoResponse "Returns recommendation DTO"
            autoLayout lr 120 120
            title "C4 Dynamic View - Meal Recommendation (Target)"
        }

        dynamic worker "Outbox-Redis-Dynamic" "Target transactional-outbox and Redis Streams processing flow" {
            1: web -> api "Submits a business action" "HTTPS + REST/JSON"
            2: api -> database "Commits business state and OutboxMessage atomically" "EF Core / TDS"
            3: outboxPublisher -> database "Polls unpublished OutboxMessage rows" "EF Core / TDS"
            4: outboxPublisher -> eventStreams "Publishes the event" "Redis Streams XADD"
            5: eventConsumer -> eventStreams "Reads the next queued event entry for the consumer group" "Redis Streams XREADGROUP"
            6: eventConsumer -> database "Persists idempotency record and background result" "EF Core / TDS"
            7: eventConsumer -> eventStreams "Acknowledges success or writes to dead-letter after retry exhaustion" "Redis Streams XACK / XADD"
            autoLayout lr 120 120
            title "C4 Dynamic View - Transactional Outbox and Redis Streams (Target)"
        }

        deployment ldc localDemo "Local-Demo-Deployment" {
            include *
            autoLayout tb 120 120
            title "C4 Deployment View - Local Docker Compose Demo"
            description "Maps logical C4 container instances to the local browser/Docker Compose deployment environment."
        }

        deployment ldc productionTarget "Production-Secure-Deployment" {
            include *
            autoLayout lr 120 120
            title "C4 Deployment View - Production Target"
            description "Shows the public TLS edge, private application network, and target production container placement."
        }
    }

    configuration {
        scope softwaresystem
    }
}
