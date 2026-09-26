# Task 3 - Unified Validation, Error, Empty & Loading UX

**Owner:** Thành viên 3  
**Reviewer:** Thành viên 1  
**Branch:** `feature/w7-t3-error-validation-ux`

## Mục tiêu
Chuẩn hóa cách backend và frontend biểu diễn lỗi/trạng thái để user không thấy message kỹ thuật hoặc behavior khác nhau giữa page.

## Backend
- Common ProblemDetails strategy.
- Validation problem shape nhất quán.
- Domain/business conflict mapping.
- 401/403/404/409/429/5xx semantics.
- Correlation/trace id trong error response phù hợp.
- Production không leak stack trace.

## Frontend
Tạo shared:
- API error parser;
- field validation mapping;
- page error;
- empty state;
- skeleton/loading;
- retry action;
- access denied;
- not found.

## UX rules
- Validation gần field.
- Global error chỉ khi không map field.
- Optimistic action chỉ khi rollback rõ.
- Không spinner vô thời hạn.
- Retry không double submit.
- 401/session-expired đi qua auth flow thống nhất.

## Coverage
Áp dụng tối thiểu cho:
- auth/profile;
- catalog/admin;
- planner/log;
- activity/challenge;
- recommendation;
- notification/report;
- FMD/admin.

## Testing
- validation mapping;
- 409 conflict;
- 429;
- 500 fallback;
- network timeout;
- retry;
- double submit;
- empty first-time user.

## Definition of Done
Không còn page production nào tự parse lỗi theo cách riêng khi shared contract đã hỗ trợ; user thấy message rõ ràng và có next action phù hợp.
