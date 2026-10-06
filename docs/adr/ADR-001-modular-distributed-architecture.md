# ADR-001 — Modular Distributed Architecture
Status: Accepted for Current Runtime; superseded for Target Architecture by ADR-005

## Context
PRN232 requires REST, background processing, message broker, gRPC and Docker, while the current implementation was designed for a 4-person/4-week delivery window.

## Current Runtime decision
Use one primary layered REST API, one independent gRPC Recommendation Service, one Worker Service, one shared SQL Server application database and Redis Streams.

## Consequences
- Meets distributed-system requirements without forcing a runtime migration during the assignment implementation.
- Keeps the current Docker Compose topology stable.
- Domain boundaries remain modules inside the current REST API.

## Target Architecture
ADR-005 defines the approved future/Target C1: YARP API Gateway, four REST domain services, Recommendation gRPC, Worker, database-per-service logical ownership and explicit Redis Streams integration events. The repository must not claim those target services/databases are already implemented until code/runtime migration is complete.
