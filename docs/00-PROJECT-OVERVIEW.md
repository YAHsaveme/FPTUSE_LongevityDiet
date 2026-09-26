# 00 — Project Overview

## Working title
**Longevity Diet Companion (LDC)** — ứng dụng theo dõi dinh dưỡng và lối sống dựa trên các nguyên tắc công khai của *The Longevity Diet / Chế Độ Ăn Trường Thọ*.

## Problem statement
Người đọc sách có thể hiểu khái niệm nhưng khó chuyển thành hành vi hằng ngày: ăn gì, trong khung giờ nào, mức vận động ra sao, hôm nay tuân thủ tốt đến đâu, và thay đổi nào cần ưu tiên. FMD còn là nội dung nhạy cảm, dễ bị hiểu nhầm thành phương pháp tự điều trị bệnh.

## Product goal
Chuyển nguyên tắc thành workflow số:
`Onboarding → Rule Resolution → Meal Plan → Food/Activity Tracking → LDAS → Recommendation → Progress → Reminder/Report`.

## Actors
### Guest
- Xem giới thiệu và nguyên tắc tổng quát.
- Đăng ký/đăng nhập.

### Member
- Quản lý hồ sơ và dietary constraints.
- Sinh kế hoạch ăn 7/14 ngày.
- Theo dõi bữa ăn, eating window, vận động.
- Xem LDAS và giải thích.
- Nhận gợi ý món ăn thay thế.
- Tham gia 14-day adherence challenge.
- Cấu hình reminder và xem weekly report.

### Admin
- CRUD food, recipe, nutrient metadata.
- Quản lý Rule Catalog và phiên bản rule.
- Xem audit log, event/job status.
- Kích hoạt/vô hiệu rule nhưng không xóa lịch sử.

### System Worker
- Consumer Redis Streams.
- Scheduled reminders.
- Weekly aggregation/report.
- Retry/dead-letter processing.

### Recommendation Service
- Nhận candidates + constraints qua gRPC.
- Hard-filter trước, weighted ranking sau.
- Trả về reason codes để API giải thích cho user.

## MVP scope
- JWT authentication + refresh token + role authorization.
- User profile: age band, height/weight, dietary preference, allergies, excluded foods, activity and sleep/eating schedule.
- Food & recipe catalog.
- Meal-plan generator 7 hoặc 14 ngày.
- Meal/food logging + eating-window tracking.
- Exercise logging.
- Longevity Diet Adherence Score (LDAS) + breakdown.
- gRPC meal recommendation.
- 14-day challenge.
- Reminders + weekly report bằng Worker.
- Redis Streams producer/consumer.
- Admin catalog + rule management.
- Swagger/OpenAPI + health checks + Docker Compose.

## Explicitly out of MVP
- Chẩn đoán hoặc điều trị bệnh.
- Tự kê FMD cho người có bệnh/thuốc.
- Liều thuốc/supplement.
- Prediction “bạn sẽ sống bao nhiêu năm”.
- Sao chép nguyên văn sample meal plan trong sách.
- Payment, social network, wearable integration, telemedicine.
- ML model training riêng.

## Success criteria
- 100% mandatory PRN232 technical requirements demonstrable.
- E2E happy path hoàn thành dưới 5 phút khi demo.
- Critical business rules có unit/integration tests.
- REST read endpoint p95 mục tiêu <= 500 ms trên local demo dataset.
- gRPC, Redis producer/consumer và Worker đều có log chứng minh được.
- Một lệnh Docker Compose chạy toàn bộ backend infrastructure.

## Product positioning
Đây là **wellness adherence companion**, không phải medical device. Giá trị cốt lõi là biến nguyên tắc dinh dưỡng/lối sống thành hành vi có thể theo dõi, giải thích và cải thiện.
