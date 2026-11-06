# Draw.io Quality Rules — Four Canonical Overall Views

The complete handover is exactly C0, C1, C2 and Database Diagram. Do not add numbered, partial or duplicate drawings.

- Use native, editable Draw.io shapes with attached directed connectors.
- C0 shows Member/Administrator and the system boundary, not internal services.
- C1 shows Docker containers, actual ports, Redis events, gRPC and the three SQL catalogs.
- C2 covers all ten implemented API controllers and their service/persistence paths.
- Database Diagram covers all 32 actual mapped tables and all nine enforced local FK arrows; clearly distinguish logical references.
- Avoid curved or overlapping wires, diagonal crossings, cut labels, falsely connected unrelated tables and narrow truncated text.
- Future nutrition research remains separate from the currently implemented schema.

Regenerate PDF and inspect geometry using scripts/Export-OverallDiagrams.ps1. Run scripts/Validate-OverallDiagrams.js for machine-checked coverage; source and PDF paths are listed in docs/assignment/one-page/README.md.
