# Draw.io quality rules — five official top-down diagrams

Official views: C0 System Context, C1 Container, C2 Components,
Database Diagram Overall, Business Flow Overall.

- Only one native Draw.io and one single-page PDF per view.
- Black ink / white background; legible square-bordered components.
- Human-shaped UML actors; no orphan functional components.
- Reading direction: **top to bottom**, centered on paper, generous whitespace
  between rows and multiple independent lanes.
- Native orthogonal right-angle arrows. Avoid curved or diagonal connectors;
  use routing/broker spines where many components share an upstream owner.
- Labels are separate white text blocks ABOVE horizontal or BESIDE vertical
  arrows, never touching or visually crossing the arrow itself.
- C1: six service owners and their own databases; independent event rail.
- C2: REST endpoint → application service → repository/DbContext per owner;
  no direct cross-domain SQL/foreign-key dependencies.
- Database Diagram: all 50 physical target-owned tables (including Catalog join table); links to database
  ownership spines indicate membership, **not physical FKs**. Record local
  FK relationships separately within the relevant owner group.
- Business Flow: Admin rules connected to Catalog, member happy path,
  guarded FMD YES/NO outcomes, Redis business Worker, optional RabbitMQ
  metadata-only audit consumer and Worker SQL receipt.
- Redis Streams is ACTIVE. RabbitMQ is implemented as an opt-in QA-verified
  audit mirror, not as a replacement for Redis.
- Render and visually inspect C0, C1, C2, ERD and Business Flow; verify
  exactly five printable one-page PDFs.

Regenerate: `scripts/Export-OverallDiagrams.ps1`.
Validate: `node scripts/Validate-OfficialArchitecture.js`.
