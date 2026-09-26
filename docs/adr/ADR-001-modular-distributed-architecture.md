# ADR-001 — Modular Distributed Architecture
Status: Accepted

## Context
PRN232 requires REST, background processing, message broker, gRPC and Docker, but the team has 4 Full-Stack members and 9 weeks.

## Decision
Use one primary layered REST API, one independent gRPC Recommendation Service, one Worker Service, SQL Server and Redis Streams.

## Consequences
- Meets distributed-system requirements without microservice sprawl.
- Clear ownership and demo paths.
- Some domains remain modules inside the API; split later only if justified.
