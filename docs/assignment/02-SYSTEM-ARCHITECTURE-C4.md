# LongevityDiet — five official C4, database and business-flow views

The only official native drawings and one-page PDF exports are in
[one-page/README.md](one-page/README.md). Each is black and white, centered
from the top of the page downward, with generous gaps between endpoints.

| View | Editable drawing | One-page PDF | Main question |
|---|---|---|---|
| C0 System Context | [Draw.io](one-page/C0.drawio) | [PDF](one-page/C0.pdf) | Who uses the system? |
| C1 Containers | [Draw.io](one-page/C1.drawio) | [PDF](one-page/C1.pdf) | Which service, database, broker and protocol handles each request? |
| C2 Components | [Draw.io](one-page/C2.drawio) | [PDF](one-page/C2.pdf) | What is the domain processing path inside each service? |
| Database Diagram Overall | [Draw.io](one-page/Database%20Diagram.drawio) | [PDF](one-page/Database%20Diagram.pdf) | Which of the 50 physical tables belongs to which SQL catalog? |
| Business Flow | [Draw.io](one-page/Business%20Flow.drawio) | [PDF](one-page/Business%20Flow.pdf) | How does a member request become a plan, tracking, notification and audit? |

## C0

Member uses LongevityDiet for registration, profiling, meal plans, activity
logs, LDAS and progress. Admin publishes approved rule versions and reviews
operations. Both actors connect explicitly to one system boundary.

## C1

From top to bottom: Member/Admin → React/Nginx → opt-in YARP API Gateway
→ shared route spine → each of six independent target REST service owners
→ its own SQL database. Database/outbox events attach to the right event
spine; existing Redis Streams is the primary business transport and the
optional RabbitMQ durable audit mirror sits beside Redis.

Ports: Identity REST 8081; Catalog REST 8082; Planning REST 8083;
Tracking REST 8084; Recommendation gRPC 8085 and REST 8087; Worker Ops
REST 8086; SQL Server 1433; Redis TCP 6379; RabbitMQ AMQP 5672 (internal).
Public Web and Gateway ports depend on deployment/overlay.

## C2

All service internal paths are drawn from top to bottom:
HTTP Endpoint/Controller → Application/Domain rules → DbContext/
Repository with its own SQL catalog and Outbox/event interfaces.
In the diagram, six bounded-context panels are independent siblings,
not a single chain of cross-domain SQL calls.
RabbitMQ is an actual opt-in event audit integration, described in
[the implementation guide](../architecture/RABBITMQ-INTEGRATION-20261112.md).

## Database Diagram

Six physically distinct target logical databases:
Identity 7, Catalog 10 (9 DbSets + RuleSetVersionItems), Planning 13,
Tracking 10, Recommendation 4 and Worker 6: **50 physical tables** in all,
including the source-confirmed implicit EF Core many-to-many Catalog join.
The Worker count includes two DbContexts sharing one Worker-owned SQL catalog.
Every table connects to a vertical ownership spine, but those short
connectors are **not** physical foreign keys; real within-owner FK
relationships are written at the foot of each panel.
No cross-service database FK is invented.

## Business Flow

Member registers with Identity, completes safety/allergen profile, reads
Catalog's approved RuleVersion, generates a Planning meal plan, records
Tracking/LDAS events, then the transaction/outbox delivers via Redis
to Worker for scheduled reminders/progress. Admin authentication, approval
and publication of rules connects into Catalog. FMD requests branch from
Planning through a separate safety gate with two logically distinct
YES/NO outcomes; the NO branch stops FMD only.

With the RabbitMQ overlay enabled, metadata from the same owner events is
mirrored into a durable RabbitMQ queue and stored as Worker-owned,
deduplicated audit receipts. **RabbitMQ audit receipts are not the
business reminder trigger**; Redis remains the current primary Worker path.

## Scope honesty / limitations

ADR-005 independent service/databases and target YARP Gateway are opt-in
migration slices. The current Web still uses legacy API/SQL for portions
of the application. Code, diagrams, automated tests and broker QA do not
establish full historic data migration, clinical approval, public TLS/443,
or production cutover readiness.

## Commands

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Export-OverallDiagrams.ps1
node scripts/Validate-OfficialArchitecture.js
node scripts/Test-RabbitMq-Domain-Events.mjs
```
