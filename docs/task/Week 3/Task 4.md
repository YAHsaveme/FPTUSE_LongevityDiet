# Task 4 - Rule Governance, Safety Audit & Admin Review

**Owner:** Thành viên 4
**Reviewer:** Thành viên 2
**Branch:** `feature/w3-t4-rule-governance-audit`
**Status:** In Progress (real SQL two-Admin rule lifecycle, audit, immutable publish verified; independent Catalog owner/reviewer pending)

## Architecture alignment (ADR-005)

- **Target owner:** Catalog & Rules Service owns rule lifecycle/provenance in `LongevityCatalogDb`.
- **Audit ownership:** each domain keeps its own domain audit; WorkerDb may keep operational event/job diagnostics.
- **Integration:** cross-domain review evidence travels by API/events; no central component writes foreign service databases.


## Mục tiêu

Đưa rule/safety/admin flow từ CRUD thành lifecycle có provenance, review, version và audit để historical result luôn truy vết được.

## Rule governance

Lifecycle: Draft -> InReview -> Published -> Retired.

- Published version immutable.
- Source/evidence metadata bắt buộc.
- Parameter validation.
- Publish ghi actor/time/change note.
- Retire không xóa lịch sử.
- Không hard-delete version đã dùng trong plan/score/recommendation.
- Authorization rõ cho review/publish/retire.

## Audit & change impact

- Audit safety transitions, eligibility reason codes, rule publish/retire và admin actions.
- Append-oriented audit record.
- Không log token/password/sensitive answer không cần thiết.
- Xác định result nào dùng rule/version cũ.
- Không retroactively rewrite historical result.

## API/UI

- Draft/edit/submit review/approve/reject/publish/retire.
- Compare version + provenance/history.
- Admin audit search/filter/pagination.
- Safety review queue + rule impact view.

## Testing bắt buộc

- Invalid lifecycle transition.
- Publish without provenance.
- Edit published version.
- Concurrent publish.
- Member access Admin API.
- Audit append behavior.
- Sensitive-field redaction.
- Historical version trace.

## Definition of Done

Admin có thể biết ai thay đổi gì, khi nào, version nào được dùng; production rule không thể bị sửa âm thầm và Member không truy cập được Admin audit/governance.


## Verified Current Runtime checkpoint (11/11/2026)

- Two synthetic Admins on live SQL: sensitive review queue, no self-approval, immutable published version, retirement, impact and audit PASS; scripts/Test-Live-Admin-Rule-Governance.ps1.
- Official PDF source matrix: scripts/Validate-Prn232-Final-PDF.cjs; full technical QA runner: scripts/Test-Prn232-Final-Acceptance.ps1. This checkpoint is not reviewer sign-off or proof the ADR-005 Target Architecture is deployed.
