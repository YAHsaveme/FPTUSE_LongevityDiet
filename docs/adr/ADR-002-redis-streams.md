# ADR-002 — Redis Streams for Message Broker
Status: Accepted

## Context
Assignment permits Apache Kafka or Redis Pub/Sub/Streams.

## Decision
Use Redis Streams with consumer groups, acknowledgements, retry and dead-letter stream.

## Rationale
- Persistent stream semantics and consumer groups.
- Much lower local/demo operational burden than Kafka.
- Fits 9-week scope and Docker Desktop.
- Still demonstrates producer + consumer clearly.

## Consequence
Kafka-scale partitioning/ecosystem is intentionally out of scope.
