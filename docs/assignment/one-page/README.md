# LongevityDiet — Four overall diagrams

These are the only **four canonical architecture/database diagrams** for the merged develop implementation. No numeric prefixes. Each has an editable Draw.io source and a single-page PDF.

| Diagram | Editable | PDF | Complete scope |
| --- | --- | --- | --- |
| **C0** | [C0.drawio](C0.drawio) | [C0.pdf](C0.pdf) | Member, Administrator and complete product boundary |
| **C1** | [C1.drawio](C1.drawio) | [C1.pdf](C1.pdf) | Web, REST API, stateless gRPC, Redis, Worker, 3 databases and real ports |
| **C2** | [C2.drawio](C2.drawio) | [C2.pdf](C2.pdf) | All 10 current API controllers, services, repositories, owner databases and dependencies |
| **Database Diagram** | [Database Diagram.drawio](Database%20Diagram.drawio) | [Database Diagram.pdf](Database%20Diagram.pdf) | All 32 current mapped tables and 31 real-source-backed links in one unpartitioned ERD: 9 SQL FKs, 16 logical associations and 6 event flows |

**Current data:** LongevityDietDb 21 tables; LongevityTrackingDb 7; LongevityWorkerDb 4. The Database Diagram is now **one continuous entity-relationship tree without rigid column dividers or pseudo-hubs**. Every table is visible exactly once and connected to another actual table. **All drawing elements are strictly black and white.** The **nine solid Crow's Foot arrows** are the only SQL-enforced FKs. The **16 long-dashed lines labeled APP** represent shared application/business keys; the **six dotted lines labeled EVENT** show event lineage. The line style and short on-line field/event labels make the connection meaning clear without color. No dashed or dotted line is claimed as a SQL FK. Read the [full relationship explanation and sources](../03-DATA-MODEL.md). The drawing shows selected key fields; complete physical column metadata remain in EF Core.

**Readability:** The compact one-page ERD uses larger table text relative to its drawing width and short database labels **[I]**, **[T]**, **[W]** (21 / 7 / 4 current tables). Every APP and EVENT connector is labeled with an actual key or event type. A CI typography-capacity check guards against future text overflow; no extra diagrams are introduced. For field-level inspection, zoom the PDF or use editable Draw.io.

**Docker Compose ports:** Web host 5173 -> Nginx container 80; API 8080; gRPC 8081 (HTTP/2); Redis 6379; SQL Server host 14330 -> container 1433. Worker has no inbound HTTP port.

**Current vs future:** Basic meal planning, meal logging, eating-window tracking, Recommendation V2 and FMD exist in code. The additional 52-table longitudinal nutrition/check-in target remains a design, not a deployed schema. Preserve its [research specification](../05-LONGITUDINAL-NUTRITION-TARGET.md) and [candidate DBML](../nutrition-target-52-tables.dbml) separately.

**Regenerate:** PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts/Export-OverallDiagrams.ps1

**Validate:** node scripts/Validate-OverallDiagrams.js; node scripts/Validate-CourseLinks.js

Diagram QA checks actual EF Core mapping, 10 controllers, all 9 FK connectors, Compose ports, PDFs, native arrows, and SVG label/connector clearance. This is not a claim of running live SQL Server or medically validated menus.
