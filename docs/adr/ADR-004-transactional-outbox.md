# ADR-004 — Transactional Outbox
Status: Accepted

## Context
Writing SQL data and publishing directly to Redis can create a dual-write failure: DB commit succeeds but event publish fails.

## Decision
Save business data and OutboxMessage in the same SQL transaction.
Worker/outbox publisher later publishes to Redis Streams and marks the row published.

## Consequences
- Reduces lost-event risk.
- Requires idempotent consumers because delivery is at-least-once.
- Adds a small amount of persistence and cleanup logic.
