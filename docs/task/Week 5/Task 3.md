# Task 3 - Rule Governance, Approval & Version Lifecycle

**Owner:** Thành viên 3  
**Reviewer:** Thành viên 1  
**Branch:** `feature/w5-t3-rule-governance`

## Mục tiêu
Đưa DietRule/RuleVersion từ CRUD thành governed lifecycle có draft/review/publish/retire và audit đầy đủ.

## Lifecycle
Ví dụ:
- Draft
- InReview
- Published
- Retired

Transition phải explicit, có authorization.

## Governance rules
- Published version immutable.
- Source/evidence metadata bắt buộc.
- Parameter schema validation.
- Một effective version/rule set theo policy.
- Publish phải ghi actor/time/change note.
- Retire không xóa lịch sử.
- Không hard delete version đã từng được dùng trong score/plan.

## Data
Bổ sung:
- RuleApproval/Review record;
- RuleChangeLog;
- publishedBy/publishedAt;
- change summary;
- previous version link.

## API/Admin UI
- Draft/edit.
- Submit review.
- Approve/reject.
- Publish.
- Retire.
- Compare versions.
- View provenance/change history.

## Testing
- invalid transition;
- publish without source;
- edit published version;
- concurrent publish;
- retire active version;
- authorization by role;
- historical references remain valid.

## Definition of Done
Mỗi rule production có provenance/version/change history; không thể sửa âm thầm một rule đã dùng để generate score/plan.
