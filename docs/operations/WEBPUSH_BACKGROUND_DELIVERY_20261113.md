# PRN232 — Web Push background (Service Worker + VAPID + Redis)

Ngày: 13/11/2026 · Phạm vi: code / test / QA, **không phải production cutover**.

## Các kênh khác nhau

- **Thông báo trong ứng dụng (đã có)**: Worker nhắc lịch → Redis
  `ldc:worker-events` → Identity Inbox → SQL `UserNotifications`
  → REST và giao diện.
- **SMTP Email (PR #43)**: SQL Pending → RabbitMQ queue ID-only
  → Identity-owned SMTP → Mailpit. Provider Gmail thật vẫn cần
  thông tin đăng nhập/địa chỉ sender xác minh và sự đồng ý nhận email.
- **Web Push chạy nền (tính năng này)**: browser xin quyền thực sự
  → Service Worker `/sw.js` → `PushManager.subscribe` bằng VAPID
  → API JWT user-scoped → Redis subscription store
  → riêng consumer group `ldc-webpush-delivery-v1` đọc
  `ldc:worker-events` → kiểm tra thông báo đã được Identity lưu,
  tài khoản còn Active và reminder được phép → WebPushClient
  mã hóa thông điệp → push provider FCM/Mozilla/Apple → Service
  Worker hiển thị notification và mở `/notifications`.
  Đây là **Web Push qua browser**, không phải Android native FCM
  hay iOS app native APNs.

## Thiết kế và chống gửi nhầm

- Server `WebPush:Enabled=false` mặc định. Khi off: endpoint
  cấu hình chỉ trả `enabled=false`, không lộ private key;
  API đăng ký trả 503.
- Chỉ người dùng xác thực được đăng ký/hủy thiết bị của **chính mình**.
  Họ phải bật `OptedIn`, cho phép Notifications của trình duyệt
  và bấm đăng ký bằng một tương tác chủ động.
- Endpoint là capability URL nhạy cảm. Backend **chỉ chấp nhận HTTPS
  của các push provider đã allowlist**, từ chối IP riêng, localhost,
  URL bất kỳ, username/password trong URL và port không phải 443.
  VAPID private key chỉ đọc ở secret store.
- Mỗi user tối đa 5 thiết bị. Redis Hash theo UserId, field là
  SHA-256(endpoint), TTL 90 ngày, không đưa token thiết bị/địa chỉ
  email vào event bus hoặc log. Hủy từ UI xóa endpoint và unsubscribe.
- Worker có consumer group riêng với in-app để không ảnh hưởng luồng
  xử lý ban đầu; chỉ gửi nếu SQL đã có thông báo hợp lệ, tài khoản
  vẫn Active, loại reminder vẫn bật và thiết bị đã subscribe trước
  khi notification được tạo.
- Payload qua provider chỉ có tiêu đề và nội dung chung,
  ID sự kiện, URL cố định nội bộ. Service Worker **bỏ qua title,
  body và URL không tin cậy** từ push payload.
- Redis receipt theo event+device (14 ngày) hạn chế gửi trùng.
  Lỗi 404/410 của provider xóa subscription; lỗi tạm thời thử lại
  tối đa 5 lần, đưa vào dead-letter metadata-only. Mạng không bảo
  đảm exactly-once xuyên suốt mọi lỗi crash.
- Người dùng có thể tắt tùy chọn nhắc lịch hoặc unsubscribe; với
  các request đang in-flight vẫn có thể có một độ trễ ngắn.

## Cấu hình

Không có private VAPID key nào được đưa vào Git.
Đặt vào deployment secret store đã bảo vệ:

```text
WebPush__Enabled=true
WebPush__PublicKey=<VAPID P-256 uncompressed public key base64url>
WebPush__PrivateKey=<VAPID 32-byte private key base64url, secret only>
WebPush__Subject=mailto:<verified-admin-contact>
Redis__ConnectionString=<private authenticated Redis instance>
```

Để sinh cặp VAPID: dùng `WebPush.VapidHelper.GenerateVapidKeys()`
(một cặp cố định cho mỗi môi trường, không sinh lại mỗi lần deploy).
Chỉ public key được trình duyệt đọc.

`docker-compose.webpush-qa.yml` là overlay **cô lập cho QA**.
Nó yêu cầu cặp khóa thông qua `WEBPUSH_VAPID_PUBLIC_KEY`
và `WEBPUSH_VAPID_PRIVATE_KEY` trong **file env bên ngoài Git**.
Compose phải include `--env-file` chứa các giá trị đó và
overlay sau base Compose. Ví dụ:

```powershell
Set-Location 'D:\PRN232\FPTUSE_LongevityDiet'
docker compose -p prn232-acceptance --env-file .env `
  --env-file 'D:\PRN232\_webpush_private_ephemeral.qa.env' `
  -f docker-compose.yml -f docker-compose.gateway.yml `
  -f docker-compose.worker-ops.yml -f docker-compose.rabbitmq.yml `
  -f docker-compose.email-qa.yml -f docker-compose.webpush-qa.yml `
  up -d --build api web
```

**Tuyệt đối không** bật overlay này trên máy chủ công khai; file
VAPID tạm nằm ngoài repo chỉ dùng nghiệm thu.

## Bằng chứng thực tế (không đánh đồng các tầng)

- .NET Release build sạch, IntegrationTests kiểm tra 10 hostname
  và khóa VAPID, 96/96 integration PASS.
- Frontend lint/production build PASS.
- Playwright `webpush-sw.spec.ts` PASS: CDP kích hoạt
  synthetic background push khi trang ứng dụng đã điều hướng
  sang `about:blank`; Service Worker hiển thị notification
  chung và không để title/body/URL nhạy cảm giả lọt vào.
  Đây là test **mô phỏng ở tầng service worker**, không phải
  FCM/Apple thật gửi qua Internet.
- E2E thật với `PushManager.subscribe` bằng Edge và Chrome
  trong Playwright (headless và headed) **CHƯA ĐẠT**:
  trình duyệt trả `Registration failed - permission denied`
  dù Notification.permission và PushManager.permissionState đều
  báo `granted`. Chưa có endpoint thật để test gửi WebPush
  qua provider. Không thể tuyên bố thiết bị thật đã nhận push.
- Script chẩn đoán riêng `tests/LongevityDiet.E2ETests/qa/webpush-live-qa.mjs`
  kiểm tra browser, provider, inbox và hủy subscription.
  Chỉ thực thi trên QA với VAPID tạm/localhost. Không chạy
  mặc định trong CI vì phụ thuộc quyền browser/provider thực.

## Những việc bắt buộc trước khi bật production

1. Triển khai HTTPS domain đã phê duyệt; sinh và cất VAPID
   cố định trong secret manager, validate các endpoint/provider.
2. Nghiệm thu thật trên Android Chrome, Windows Edge/Chrome,
   iOS Safari PWA nếu nằm trong phạm vi, có tab đang đóng;
   kiểm tra cả revoke, thiết bị đổi và lỗi 404/410.
3. Xác minh Redis có authentication, TLS giữa dịch vụ/cluster,
   backup/retention và cách xóa subscription khi xóa tài khoản
   hoặc đăng xuất ở thiết bị dùng chung.
4. Kiểm chứng rate limit theo user/device, quyền riêng tư,
   audit sự đồng ý, monitoring retry/DLQ và cập nhật tài liệu.
5. Nếu cutover ADR-005 sang Identity owner mới, cần chuyển
   worker/đường ghi thông báo qua đúng IdentityDb; **không được**
   giả định mã nguồn có sẵn là đã làm xong dữ liệu cutover.
   Hiện 12 production-cutover blockers riêng vẫn mở.

Nguồn nền tảng:
- https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe
- https://www.nuget.org/packages/WebPush/1.0.13
