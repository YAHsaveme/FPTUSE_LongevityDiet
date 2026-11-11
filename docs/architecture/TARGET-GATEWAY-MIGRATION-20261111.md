# ADR-005 Target Architecture — incremental YARP Gateway migration

Ngày xác minh: 11/11/2026. **Trạng thái: Gateway optional slice đã kiểm thử trên Docker QA, không phải full Target Architecture.**

## Mục đích

Phân tách điểm vào Web/API khỏi REST backend theo đúng lộ trình ADR-005, **không làm gián đoạn Current Runtime đã có CI xanh**. Gateway mới là project độc lập .NET 9 `src/LongevityDiet.Gateway` dùng YARP 2.3.0. Nhiệm vụ này là bước hạ tầng để dịch chuyển dần Identity, Catalog, Planning và Tracking thành service riêng. Không được coi gateway chuyển tiếp một REST monolith là đã hoàn tất bốn domain microservices.

## Khởi động (chỉ từ môi trường phát triển có .env hợp lệ)

- **Mặc định**: `docker compose up -d --build` chạy 6 container như trước. Web Nginx dùng `API_UPSTREAM=api:8080`.
- **Kích hoạt Gateway**: `docker compose -f docker-compose.yml -f docker-compose.gateway.yml up -d --build`; gateway thêm ở cổng **127.0.0.1:18080**, Web Nginx tự đổi `API_UPSTREAM=gateway:8080`.
- **Gateway liveness**: `http://127.0.0.1:18080/gateway/health` trả 200 ngay khi gateway chạy.
- **Gateway readiness**: `http://127.0.0.1:18080/gateway/ready` gọi thực đến **API /ready**, trả 503 khi backend không sẵn sàng. Khởi động Compose không có nghĩa các dependency đã ready.
- **Chỉ cho phép chuyển tiếp** `/api/*` và `/openapi/*` đến địa chỉ backend tin cậy trong cấu hình. Mọi đường khác (kể cả URL tùy ý) trả 404. Backend **vẫn** sở hữu xác thực JWT, RBAC và phân quyền tài nguyên.
- Backend, gateway và Web mặc định chỉ publish port về **127.0.0.1** phục vụ QA; **không phải** public HTTPS :443.

## Cấu hình Nginx có thể chuyển đổi an toàn

Nginx dùng template `src/LongevityDiet.Web/nginx.conf` đưa vào `/etc/nginx/templates/default.conf.template`. Nginx Docker entrypoint chỉ thay thế biến cấu hình `API_UPSTREAM`, giữ nguyên các biến HTTP như `$host`. Dockerfile mặc định đặt `API_UPSTREAM=api:8080`; overlay mới chỉ ghi đè thành `gateway:8080`. Nếu không dùng overlay, đường chạy cũ không thay đổi.

## Nghiệm thu trên QA thật

- Build độc lập `LongevityDiet.Gateway.csproj`: **0 warning/0 error**.
- `docker compose --env-file .env.example -f docker-compose.yml -f docker-compose.gateway.yml config --quiet`: PASS.
- **QA trên máy với volume SQL/Redis riêng**: `scripts/Test-Live-Gateway.ps1 -TestUpstreamOutage` PASS: Gateway health/ready, OpenAPI, 401 khi chưa đăng nhập, 404 tuyến ngoài allowlist, Nginx proxy đúng DNS Gateway, đăng ký và đọc profile bằng JWT qua cả Gateway lẫn Web, 503 khi cố ý tắt API, liveness 200 lúc API tắt, khôi phục API và gateway readiness lại 200. Test outage **chỉ** thực hiện trên Docker project `prn232-acceptance`; script từ chối endpoint không phải localhost.
- **Browser qua gateway**: 10/10 Playwright E2E (identity/onboarding/logout + viewport 320/390/1365 px).
- **Solution**: 91/91 unit + 81/81 integration tests PASS.
- **CI**: workflow PR vào develop chạy Current Runtime Docker E2E, sau đó bật overlay gateway và chạy E2E lần hai. Chỉ được xem là CI PASS khi GitHub workflow đã kết thúc thành công.

## Các gap còn mở (không đánh dấu Done 100%)

1. YARP hiện chuyển tiếp về **một REST API**; Gateway chưa định tuyến tới **bốn REST domain services độc lập** và chưa có contract dịch chuyển dữ liệu.
2. MainDb + TrackingDb + WorkerDb vẫn không phải sáu service-owned DB của ADR-005; thiếu tách catalog, planning, recommendation, identity và cross-domain event/read-model cho các domain tương ứng.
3. Chưa triển khai public HTTPS :443/TLS và Gateway endpoint auth policy dành riêng cho production (không được tự mở cổng QA ra internet).
4. Chưa có nghiệm thu reviewer, chuyên gia dinh dưỡng và demo thực tế trước giảng viên.

**PDF chính thức PRN232 chỉ yêu cầu một REST service có phân lớp, một gRPC service độc lập, một broker, một worker và một môi trường Docker/cloud. Gateway/6 DB/4 REST services là mục tiêu bổ sung của nhóm**.

Tham khảo: [báo cáo nghiệm thu PDF & 16 task](../assignment/FOUR-MEMBER-PDF-100PCT-ACCEPTANCE-AUDIT-20261111.md) và [ADR-005 alignment](../task/ARCHITECTURE-ALIGNMENT-MATRIX.md).
