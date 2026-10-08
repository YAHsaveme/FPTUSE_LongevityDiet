workspace "Longevity Diet Companion" "PRN232 current runtime and approved target architecture" {
    !impliedRelationships false

    model {
        guest = person "Guest" "Browses and signs in."
        member = person "Member" "Plans, tracks, and gets recommendations."
        admin = person "Administrator" "Manages system data and operations."

        ldc = softwareSystem "Longevity Diet Companion" "Plan, track, and recommend." {
            web = container "Web Application" "Browser UI." "React 19 + TypeScript + Vite" "Web"

            apiCurrent = container "REST API (Current Runtime)" "Current layered application API." "ASP.NET Core .NET 9 / :8080" "Current"
            recommendationCurrent = container "Recommendation Service (Current Runtime)" "Current gRPC deployable shell/service." "ASP.NET Core gRPC .NET 9 / :8081" "Current"
            databaseCurrent = container "Application Database (Current Runtime)" "Current shared system of record." "SQL Server 2022 / :1433" "Current,Database"
            workerCurrent = container "Background Worker (Current Runtime)" "Current async worker process." ".NET 9 Worker" "Current"
            eventStreamsCurrent = container "Event Streams (Current Runtime)" "Current Redis Streams runtime." "Redis 7 Streams / :6379" "Current,Queue"

            targetGateway = container "API Gateway" "Public API routing boundary." "YARP + ASP.NET Core .NET 9 / :8080" "Target,Gateway"
            identityService = container "Identity & Profile Service" "Auth and profile." "ASP.NET Core .NET 9 / REST :8081" "Target,Service"
            catalogService = container "Catalog & Rules Service" "Catalog and rules." "ASP.NET Core .NET 9 / REST :8082" "Target,Service"
            planningService = container "Planning Service" "Plans and planning workflows." "ASP.NET Core .NET 9 / REST :8083" "Target,Service"
            trackingService = container "Tracking & Progress Service" "Logs, LDAS, progress." "ASP.NET Core .NET 9 / REST :8084" "Target,Service"
            targetRecommendation = container "Recommendation Service" "Safety filtering and ranking." "ASP.NET Core gRPC .NET 9 / gRPC :8085" "Target,Service"
            targetWorker = container "Background Worker" "Async jobs and operations." ".NET 9 Worker + Ops :8086" "Target,Service"
            targetEventStreams = container "Event Streams" "Integration event transport." "Redis 7 Streams / :6379" "Target,Queue"

            identityDb = container "LongevityIdentityDb" "Identity/profile data." "SQL Server 2022 / TDS :1433" "Target,Database"
            catalogDb = container "LongevityCatalogDb" "Catalog/rule data." "SQL Server 2022 / TDS :1433" "Target,Database"
            planningDb = container "LongevityPlanningDb" "Planning data." "SQL Server 2022 / TDS :1433" "Target,Database"
            trackingDb = container "LongevityTrackingDb" "Tracking/progress data." "SQL Server 2022 / TDS :1433" "Target,Database"
            recommendationDb = container "LongevityRecommendationDb" "Recommendation local read model/state." "SQL Server 2022 / TDS :1433" "Target,Database"
            workerDb = container "LongevityWorkerDb" "Worker job/idempotency state." "SQL Server 2022 / TDS :1433" "Target,Database"
        }

        optionalAi = softwareSystem "Local AI Runtime" "Explanation rewrite only." "External,Optional,Target"

        guest -> ldc "Browses / signs in"
        member -> ldc "Plans / tracks / recommends"
        admin -> ldc "Manages"
        ldc -> optionalAi "Rewrites explanation" "" "Optional"

        guest -> web "Browses" "HTTPS :443"
        member -> web "Uses" "HTTPS :443"
        admin -> web "Administers" "HTTPS :443"

        web -> apiCurrent "Calls current application API" "HTTP/REST :8080" "Current"
        apiCurrent -> databaseCurrent "Reads/writes current state" "EF Core / TDS :1433" "Current"
        apiCurrent -> recommendationCurrent "Ranks meals" "gRPC / HTTP2 :8081" "Current"
        workerCurrent -> databaseCurrent "Processes current async state" "EF Core / TDS :1433" "Current"
        workerCurrent -> eventStreamsCurrent "Publishes/consumes current events" "Redis Streams :6379" "Current,Async"

        web -> targetGateway "Calls target API edge" "HTTPS/REST :443" "Target"
        targetGateway -> identityService "Routes identity/profile" "REST :8081" "Target"
        targetGateway -> catalogService "Routes catalog/rules" "REST :8082" "Target"
        targetGateway -> planningService "Routes planning" "REST :8083" "Target"
        targetGateway -> trackingService "Routes tracking/progress" "REST :8084" "Target"
        targetGateway -> targetWorker "Routes admin operations" "REST :8086" "Target"
        planningService -> targetRecommendation "Ranks meals" "gRPC / HTTP/2 :8085" "Target"
        targetRecommendation -> optionalAi "Rewrites explanation" "HTTP / JSON :11434" "Target,Optional"

        identityService -> identityDb "Owns identity/profile data" "EF Core / TDS :1433" "Target"
        catalogService -> catalogDb "Owns catalog/rule data" "EF Core / TDS :1433" "Target"
        planningService -> planningDb "Owns planning data" "EF Core / TDS :1433" "Target"
        trackingService -> trackingDb "Owns tracking/progress data" "EF Core / TDS :1433" "Target"
        targetRecommendation -> recommendationDb "Owns recommendation state" "EF Core / TDS :1433" "Target"
        targetWorker -> workerDb "Owns worker state" "EF Core / TDS :1433" "Target"

        identityService -> targetEventStreams "Publishes integration events" "Redis Streams :6379" "Target,Async"
        catalogService -> targetEventStreams "Publishes integration events" "Redis Streams :6379" "Target,Async"
        planningService -> targetEventStreams "Publishes integration events" "Redis Streams :6379" "Target,Async"
        trackingService -> targetEventStreams "Publishes integration events" "Redis Streams :6379" "Target,Async"
        targetWorker -> targetEventStreams "Consumes/acks and publishes result events" "Redis Streams :6379" "Target,Async"
        targetRecommendation -> targetEventStreams "Consumes approved snapshot events" "Redis Streams :6379" "Target,Async"

        localDemo = deploymentEnvironment "Local Demo" {
            workstation = deploymentNode "Developer Workstation" "Current local assignment runtime." "Windows" {
                browserNode = deploymentNode "User Browser" "Runs the React SPA." "Web Browser" {
                    containerInstance web
                }
                dockerDesktop = deploymentNode "Docker Desktop" "Current container runtime." "Docker Desktop" {
                    compose = deploymentNode "Docker Compose project: longevity-diet" "Current six-service Compose topology." "Docker Compose" {
                        infrastructureNode "web service / Nginx" "Serves SPA and reverse-proxies /api." "Nginx"
                        apiNode = deploymentNode "api service :8080" "Current REST API." ".NET 9" {
                            containerInstance apiCurrent
                        }
                        grpcNode = deploymentNode "recommendation-grpc :8081" "Current gRPC service." ".NET 9 / h2c" {
                            containerInstance recommendationCurrent
                        }
                        workerNode = deploymentNode "worker service" "Current worker." ".NET 9" {
                            containerInstance workerCurrent
                        }
                        sqlNode = deploymentNode "sqlserver :1433" "Current shared application DB host." "SQL Server 2022" {
                            containerInstance databaseCurrent
                        }
                        redisNode = deploymentNode "redis :6379" "Current Redis Streams host." "Redis 7" {
                            containerInstance eventStreamsCurrent
                        }
                    }
                }
            }
        }

        productionTarget = deploymentEnvironment "Production Target" {
            browserProd = deploymentNode "User Browser" "Target browser runtime." "Web Browser" {
                containerInstance web
            }
            edgeProd = deploymentNode "Public HTTPS Edge :443" "Public TLS endpoint; no database/message ports exposed." "TLS / Reverse Proxy" {
                infrastructureNode "TLS termination" "HTTPS entry point." "Nginx / TLS"
            }
            privateProd = deploymentNode "Private Application Network" "Target private service/data network." "Private Network" {
                gatewayNode = deploymentNode "API Gateway :8080" "YARP gateway." ".NET 9" {
                    containerInstance targetGateway
                }
                identityNode = deploymentNode "Identity :8081" "Identity/Profile service." ".NET 9" {
                    containerInstance identityService
                }
                catalogNode = deploymentNode "Catalog :8082" "Catalog/Rules service." ".NET 9" {
                    containerInstance catalogService
                }
                planningNode = deploymentNode "Planning :8083" "Planning service." ".NET 9" {
                    containerInstance planningService
                }
                trackingNode = deploymentNode "Tracking :8084" "Tracking/Progress service." ".NET 9" {
                    containerInstance trackingService
                }
                recommendationNode = deploymentNode "Recommendation :8085" "Private gRPC HTTP/2 + TLS." ".NET 9 / HTTP2 + TLS" {
                    containerInstance targetRecommendation
                }
                workerNodeTarget = deploymentNode "Worker :8086" "Internal ops/health only." ".NET 9 Worker" {
                    containerInstance targetWorker
                }
                redisTarget = deploymentNode "Redis :6379" "Private event-stream runtime." "Redis 7" {
                    containerInstance targetEventStreams
                }
                sqlTarget = deploymentNode "SQL Server :1433" "Physical host for six logically owned target DBs." "SQL Server 2022" {
                    containerInstance identityDb
                    containerInstance catalogDb
                    containerInstance planningDb
                    containerInstance trackingDb
                    containerInstance recommendationDb
                    containerInstance workerDb
                }
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
            include targetGateway
            include identityService
            include catalogService
            include planningService
            include trackingService
            include targetRecommendation
            include targetWorker
            include targetEventStreams
            include identityDb
            include catalogDb
            include planningDb
            include trackingDb
            include recommendationDb
            include workerDb
            include optionalAi
            autoLayout tb 120 120
            title "C1 - C4 Container - Longevity Diet Companion (Target Architecture)"
            description "Target applications, owned data stores, and communication."
        }

        dynamic ldc "Recommendation-Dynamic" "Target synchronous recommendation flow" {
            1: member -> web "Requests recommendations"
            2: web -> targetGateway "Calls API" "HTTPS/REST :443"
            3: targetGateway -> planningService "Routes request" "REST :8083"
            4: planningService -> planningDb "Loads plan context" "EF Core / TDS :1433"
            5: planningService -> targetRecommendation "Requests ranking" "gRPC / HTTP/2 :8085"
            6: targetRecommendation -> recommendationDb "Loads local read model" "EF Core / TDS :1433"
            7: targetRecommendation -> optionalAi "Optionally rewrites explanation" "HTTP / JSON :11434"
            autoLayout lr 110 110
            title "C4 Dynamic View - Recommendation (Target)"
        }

        dynamic ldc "Outbox-Redis-Dynamic" "Target service-owned Outbox and event processing" {
            1: trackingService -> trackingDb "Commits business state + Outbox" "EF Core / TDS :1433"
            2: trackingService -> targetEventStreams "Publishes event" "Redis Streams :6379"
            3: targetWorker -> targetEventStreams "Reads event" "Redis Streams :6379"
            4: targetWorker -> workerDb "Persists idempotency/job state" "EF Core / TDS :1433"
            5: targetWorker -> targetEventStreams "Acknowledges / publishes result or dead-letter" "Redis Streams :6379"
            autoLayout lr 110 110
            title "C4 Dynamic View - Service Outbox and Redis Streams (Target)"
        }

        deployment ldc localDemo "Local-Demo-Deployment" {
            include *
            autoLayout tb 110 110
            title "C4 Deployment View - Current Local Docker Compose"
            description "Actual current runtime topology."
        }

        deployment ldc productionTarget "Production-Secure-Deployment" {
            include *
            autoLayout lr 100 100
            title "C4 Deployment View - Production Target"
            description "Public HTTPS edge, private target services, six logical databases, Redis and private gRPC."
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
            element "Current" {
                background #F9FAFB
                color #374151
                stroke #9CA3AF
            }
            element "Target" {
                background #FFFFFF
                color #111827
                stroke #374151
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
                fontSize 15
            }
            relationship "Async" {
                style dashed
            }
            relationship "Optional" {
                style dashed
                color #6B7280
            }
            relationship "Current" {
                color #9CA3AF
            }
        }
    }
}
