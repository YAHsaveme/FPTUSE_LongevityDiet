# ADR-005 — Opt-in RabbitMQ domain-event audit mirror (12 November 2026)

## Scope and actual implementation

The existing, working domain business event transport is Redis Streams.
This new transport is a **real, separately enabled RabbitMQ publisher
and consumer**. It is integrated into `LongevityDiet.Worker.Ops`, not a
decorative service drawn on a diagram.

On each authorized domain event (Planning, Tracking, Catalog, Recommendation):

1. The domain owner publishes its regular event to Redis Streams, with a
   stable event ID/type. Existing Worker consumer groups keep operating.
2. `RabbitMqRedisEventMirror` reads from its own Redis consumer group
   `ldc-rabbit-audit-{source}`, validates the event name and GUID, and sends
   a metadata-only JSON envelope to RabbitMQ exchange
   `ldc.domain-events.audit.v1` (topic routing key `event.{source}`).
3. The broker uses the durable queue `ldc.worker-ops.audit.v1`.
   Publisher confirms are enabled and messages use persistent delivery
   mode. Redis is ACKed only after a broker confirmation; on failure,
   Redis PEL preserves the pending message for retry.
4. `RabbitMqOwnedAuditConsumer` reads with manual acknowledgements, inserts
   one receipt into `LongevityWorkerDb.dbo.WorkerReceivedEvents`
   (Source = `rabbit-{source}`, EventId = original GUID). Its composite
   SQL PK prevents duplicate receipts after replay/restart.
5. RabbitMQ is ACKed only after SQL persistence. On an invalid Rabbit envelope,
   only a safe reason (never raw payload) is sent to durable
   `ldc.worker-ops.audit.dlq.v1`.
6. Existing Redis business reminders and weekly-report behavior remain
   unchanged, safe by default. The Rabbit receipt is an **audit observation**,
   not proof of a weekly business action or full migration cutover.

The mirror never forwards user preferences, allergy data or medical payload
from Redis into RabbitMQ: only event GUID, event type, origin and Redis stream ID.

## Running in isolated local Docker QA

```powershell
Set-Location D:\PRN232\FPTUSE_LongevityDiet
docker compose -p prn232-acceptance --env-file .env -f docker-compose.yml -f docker-compose.worker-ops.yml -f docker-compose.rabbitmq.yml up -d --build sqlserver redis rabbitmq worker-ops
node scripts/Test-RabbitMq-Domain-Events.mjs
# Isolated QA only: stop/restart the broker and prove pending Redis replay:
node scripts/Test-RabbitMq-Domain-Events.mjs --outage
```

If the local project requires the existing
`D:\PRN232\DockerRuntime\prn232-acceptance.volumes.yml` volume
isolation overlay, include it as the final `-f` argument.

The `rabbitmq:4.1-alpine` broker is internal-only with a healthcheck
and persistent QA volume. No host AMQP port is published.
The Compose fallback password is a **local QA convenience, not a
production credential**. Configure `RABBITMQ_USER` and
`RABBITMQ_PASSWORD` securely for any authorized non-local environment.

In non-development hosts, Worker Ops refuses to enable RabbitMQ unless
`RabbitMq:UseTls=true`. Never commit RabbitMQ credentials or put them
into a public website. This branch does not set up a production broker,
public ingress or billing account.

## Evidence / limitations

`node scripts/Test-RabbitMq-Domain-Events.mjs` tests a real synthetic
Planning Redis event through the RabbitMQ broker to SQL receipt,
broker durable queue presence, duplicate Redis delivery idempotency,
quarantine of an invalid Redis envelope and metadata-only body safety.

This design is **at-least-once**, not exactly-once across Redis/AMQP/SQL.
The SQL dedupe check handles repeated delivery; no global transaction
spans all three systems. RabbitMQ remains optional because replacing
the business processing transport and historical data migration requires
its own tested cutover/rollback plan.
