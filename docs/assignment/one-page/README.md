# LongevityDiet — Four overall diagrams

These are the only **four canonical architecture/database diagrams** for the merged develop implementation. No numeric prefixes. Each has an editable Draw.io source and a single-page PDF.

| Diagram | Editable | PDF | Complete scope |
| --- | --- | --- | --- |
| **C0** | [C0.drawio](C0.drawio) | [C0.pdf](C0.pdf) | Member, Administrator and complete product boundary |
| **C1** | [C1.drawio](C1.drawio) | [C1.pdf](C1.pdf) | Web, REST API, stateless gRPC, Redis, Worker, 3 databases and real ports |
| **C2** | [C2.drawio](C2.drawio) | [C2.pdf](C2.pdf) | All 10 current API controllers, services, repositories, owner databases and dependencies |
| **Database Diagram** | [Database Diagram.drawio](Database%20Diagram.drawio) | [Database Diagram.pdf](Database%20Diagram.pdf) | All 32 mapped EF Core tables and all 9 genuine same-database FK arrows |

**Current data:** LongevityDietDb 21 tables; LongevityTrackingDb 7; LongevityWorkerDb 4. All 32 are on the same database diagram, with all nine actual SQL FK arrows connected directly between the relevant table cards. An independent table is not assigned a fake FK. Cross-database UserId references and Redis events are logical, not physical FKs.

**Docker Compose ports:** Web host 5173 -> Nginx container 80; API 8080; gRPC 8081 (HTTP/2); Redis 6379; SQL Server host 14330 -> container 1433. Worker has no inbound HTTP port.

**Current vs future:** Basic meal planning, meal logging, eating-window tracking, Recommendation V2 and FMD exist in code. The additional 52-table longitudinal nutrition/check-in target remains a design, not a deployed schema. Preserve its [research specification](../05-LONGITUDINAL-NUTRITION-TARGET.md) and [candidate DBML](../nutrition-target-52-tables.dbml) separately.

**Regenerate:** PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts/Export-OverallDiagrams.ps1

**Validate:** node scripts/Validate-OverallDiagrams.js; node scripts/Validate-CourseLinks.js

Diagram QA checks actual EF Core mapping, 10 controllers, all 9 FK connectors, Compose ports, PDFs, native arrows, and SVG label/connector clearance. This is not a claim of running live SQL Server or medically validated menus.
