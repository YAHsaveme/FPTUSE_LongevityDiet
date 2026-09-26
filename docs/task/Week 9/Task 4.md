# Task 4 - Final Documentation, Architecture Defense & Submission Integrity

**Owner:** Thành viên 4  
**Reviewer:** Thành viên 2  
**Branch:** `docs/w9-final-submission`

## Mục tiêu
Đóng gói submission rõ ràng, clean và defend được các trade-off kiến trúc.

## Documentation final
- README.
- Architecture index.
- 9 draw.io diagrams + canonical previews.
- ADRs.
- API/gRPC/events.
- DB design.
- test/deploy/demo guide.
- task/team responsibility docs.
- PRN232 traceability.

## Architecture defense
Chuẩn bị rationale:
- vì sao modular distributed app thay vì microservice sprawl;
- vì sao Redis Streams;
- vì sao Transactional Outbox;
- vì sao gRPC cho recommendation;
- vì sao rules-first recommendation;
- consistency trade-offs;
- security/safety boundaries.

## Submission cleanup
Loại:
- bin/obj;
- node_modules/dist/wwwroot generated;
- .vs;
- temp logs;
- backup files;
- stale docs;
- duplicate task files;
- secrets;
- database dumps không yêu cầu.

Giữ:
- source;
- migrations;
- lock file;
- Dockerfiles/Compose;
- docs/diagrams;
- scripts có giá trị;
- .env.example.

## Integrity verification
- fresh build.
- tests.
- npm build.
- compose config.
- file links.
- diagram export.
- ZIP/package nếu assignment yêu cầu.

## Definition of Done
Submission từ clean tree build/run được và không chứa secret, generated junk hoặc tài liệu mâu thuẫn với implementation.
