# Task 4 - Safety Audit, Change Impact & Admin Review

**Owner:** Thành viên 4  
**Reviewer:** Thành viên 2  
**Branch:** `feature/w5-t4-safety-audit`

## Mục tiêu
Tạo audit/read model để Admin kiểm tra safety workflow và tác động của rule changes mà không đọc trực tiếp raw DB.

## Audit scope
- safety assessment transitions;
- FMD eligibility decision reason codes;
- rule publish/retire actions;
- recommendation/rule version references;
- admin actions;
- critical configuration changes.

## Privacy
- Chỉ lưu data cần cho audit.
- Không log password/token.
- Hạn chế hiển thị sensitive answer detail nếu không cần.
- Admin authorization bắt buộc.
- Audit record append-oriented; không sửa/xóa tùy tiện.

## Change impact
Khi rule/version thay đổi:
- xác định plan/score/recommendation nào dùng version cũ;
- không retroactively rewrite historical result;
- hiển thị effective date/version.

## API/UI
- Admin audit search/filter/pagination.
- Rule version impact view.
- Safety review queue/count.
- Detail với reason code/time/actor.
- Không expose admin audit cho member.

## Testing
- authorization;
- audit append behavior;
- filtering/pagination;
- historical version trace;
- sensitive-field redaction;
- concurrent admin actions.

## Definition of Done
Admin truy vết được "ai thay đổi gì, khi nào, version nào bị ảnh hưởng" mà không làm thay đổi historical result.
