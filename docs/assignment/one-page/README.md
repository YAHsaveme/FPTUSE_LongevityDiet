# LongevityDiet — One-page Draw.io & DBML diagrams

**Canonical submission: four main pages (C0, C1, C2, Target ERD).** Current physical ERD is supplemental evidence. Each PDF is exactly one page, with vector text for large-format zoom or printing.

**Visual standard (2026-11-05):** traditional technical diagrams, strictly **monochrome** — white background, black/grey text and borders, square-cornered Draw.io shapes, orthogonal connections, dashed asynchronous lines; no colorful role or database backgrounds. The DBML ERD uses standard rectangular table blocks with dark neutral headers and clear PK/FK labels. All exports must pass the automatic monochrome validator; colors must not be reintroduced by regenerating.

| View | Editable source | One-page export | Scope |
| --- | --- | --- | --- |
| C0 · System Context | [Draw.io](01-c0-system-context.drawio) | [PDF](01-c0-system-context.pdf) · [PNG](01-c0-system-context.png) | C4 Level 1 |
| C1 · Container Architecture | [Draw.io](02-c1-container-architecture.drawio) | [PDF](02-c1-container-architecture.pdf) · [PNG](02-c1-container-architecture.png) | **Target** service/container ownership |
| C2 · Consolidated Component Atlas | [Draw.io](05-c2-component-architecture.drawio) | [PDF](05-c2-component-architecture.pdf) · [PNG](05-c2-component-architecture.png) | **Target** components, six bounded services on one page |
| Database ERD · Target | [DBML](06-database-target.dbml) | [SVG](06-database-target-one-page.svg) · [PDF](06-database-target-one-page.pdf) | 33 logical entity types across 6 target-owned databases |
| Database ERD · Current (reference) | [DBML](06-database-current.dbml) | [SVG](06-database-current-one-page.svg) · [PDF](06-database-current-one-page.pdf) | 18 EF Core mapped tables across 3 DbContexts |

## Scope and honesty

- C0 contains only actors, the software system and optional external AI. Internal details are reserved for lower-level views.
- C1 follows ADR-005 **target** microservices (Web, YARP Gateway, Identity, Catalog, Planning, Tracking, Recommendation gRPC, Worker, Redis and six service-owned SQL databases). **It is not a screenshot of the current deployed Docker Compose.**
- C2 is an intentional **one-page component atlas**. The formal C4 component diagram normally covers just **one container**; this atlas explicitly labels six independent target service boundaries so the consolidated assignment handout cannot be confused with one shared container. Official guidance: https://c4model.com/diagrams/component
- Target DBML is an **editable source model**, not a bitmap imitation. The six target_* namespaces visually distinguish **separate logical SQL Server databases**; they are not a proposal to move all six owners into one SQL schema. No foreign keys span the ownership boundaries.
- Current DBML is extracted from the entity classes and three actual EF Core DbContexts (Identity, Tracking, Worker), with field-type/index corrections from their mapping configurations. It does **not** claim that production SQL Server migrations have been executed.
- The optional Cloudflare D1 refresh-session implementation is not provisioned and remains disabled. It is not part of the six target SQL databases.
- Existing Auth/Profile, Activity Tracking, versioned LDAS and Reminder/Notification code does not imply independent Gateway/Catalog/Planning/Recommendation domain services have been implemented in production.

## Editing and high-resolution inspection

Open editable Draw.io sources with Draw.io Desktop or https://app.diagrams.net (File > Open From > Device). Open DBML in https://dbdiagram.io to modify tables/relations and use the DBML source to regenerate vector exports.

**Windows/VS Code DBML viewer installed:** official `dbdiagram.dbdiagram-vscode` extension (v0.5.4, 2026-11-05). Open `06-database-target.dbml` in VS Code, then press `Ctrl+Shift+P` and choose **DBML: Open Preview to the Side** to view the interactive ERD. This keeps the schema local; importing it into the dbdiagram.io website is optional.

All three Draw.io files have one large canvas. All five PDF files have **exactly one page**; zoom or print on a large landscape format (for example A0). A4 print will necessarily shrink a detailed ERD/C2, so use a digital viewer at high zoom instead.

Regenerate **all editable source files and all PDF/PNG/SVG exports**, then validate them, from the project root:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Export-OnePageDiagrams.ps1

To validate without regenerating:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Validate-OnePageDiagrams.ps1

Draw.io Desktop 32.6.10 (verified official portable binary), @dbml/core (official DBML parser), and DBML reference renderer were used; no GitHub skills were blindly executed. The current vector PDF is the portable large-format submission format; the Draw.io XML / DBML are the editable source of truth.

**Checked:** single Draw.io page per file, valid edge IDs and geometry, minimum typography, 33 target and 18 current modeled tables, no cross-database FKs, parser acceptance, vector exports, visual previews, and exactly one PDF page per deliverable.

Historical multipage C2/ERD and older assignment images are retired from the canonical folder. The engineering Dynamic/Deployment diagrams in docs/architecture are preserved because they contain distinct technical information.
