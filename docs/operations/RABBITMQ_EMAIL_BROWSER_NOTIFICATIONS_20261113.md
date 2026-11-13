# PRN232 — Thông báo, RabbitMQ, email SMTP/Gmail và trình duyệt

Ngày: 13/11/2026. Phạm vi: **code + QA cô lập**, chưa triển khai production.

## 1. Các kênh thực sự có

| Kênh | Luồng | Trạng thái |
|---|---|---|
| In-app | Redis Streams Worker → Identity Inbox → `UserNotifications` → REST/UI | Đã chạy trên QA |
| Email SMTP | SQL `UserNotifications.Pending` → durable RabbitMQ GUID queue → Identity-owned SMTP consumer → Mailpit | Đã kiểm thử QA 3/3 |
| Gmail thực của khách hàng | SMTP provider với credentials, TLS 587, người dùng đồng ý; thư có thể được chuyển tới địa chỉ @gmail.com | **CHƯA BẬT**, chưa có provider credentials/domain/verification |
| Trình duyệt khi tab mở | REST polling 30 giây + Notification API sau khi người dùng cấp quyền | Có, **không phải push chạy nền** |
| Web Push khi đóng tab (trình duyệt) | Service Worker + VAPID + Redis per-device, opt-in | Code + simulated Service Worker QA PASS; **FCM thực chưa nghiệm thu**, mặc định OFF |

**RabbitMQ không phải SMTP**: broker chỉ chuyển ID của thông báo. Identity API nắm
địa chỉ người nhận, kiểm tra lại quyền nhận và kết nối SMTP. Hàng đợi
`ldc.identity.email-delivery.v1` và dead-letter
`ldc.identity.email-delivery.dlq.v1` bền vững, metadata-only, không
đựng email hay dữ liệu dinh dưỡng/sức khỏe.

## 2. Đồng ý nhận email và quyền riêng tư

- `ReminderPreferences.EmailOptedIn` **mặc định false**, tách biệt
  `OptedIn` của nhắc lịch thông thường.
- Người dùng bật/tắt trong giao diện `/notifications`; thay đổi được
  lưu ở database Identity, gắn Version và UpdatedAtUtc.
- Chỉ **thông báo mới** khi đã bật nhắc lịch, bật email **và email đã
  xác minh OTP** mới có trạng thái `EmailDeliveryStatus=Pending`.
  Các hàng lịch sử hoặc email chưa xác minh mặc định `None`,
  không được gửi hồi tố.
- Khi xử lý, hệ thống **đọc lại** tài khoản Active, `OptedIn`,
  `EmailOptedIn`, `EmailVerifiedAtUtc` và miền email cho phép.
  Thu hồi quyền trong lúc xếp hàng → `Skipped`.
- Cơ chế lease SQL tránh hai worker cùng gửi; Rabbit publisher confirms,
  consumer ACK sau khi SMTP nhận/SQL cập nhật; retry tối đa 5 lần, DLQ.
  SMTP giao hàng theo **at-least-once**, không thể cam kết exactly-once
  nếu SMTP nhận thành công nhưng tiến trình chết trước khi ghi SQL.
- Nội dung gửi email là lời nhắc chung + link HTTPS khi production;
  không đính kèm ghi nhận sức khỏe hay PII trong RabbitMQ.
- Đã có xác minh địa chỉ email bằng OTP 6 chữ số (15 phút, cooldown,
  tối đa 5 lần nhập sai), cùng test SMTP Mailpit thật. Xem
  `docs/operations/EMAIL_VERIFICATION_AND_PUSH_PRIVACY_20261113.md`.
  Vẫn **chưa có** quản lý bounce/complaint và one-click unsubscribe qua
  email; cần bổ sung/đánh giá trước khi mở cho khách hàng thật.

## 3. QA trên máy local, KHÔNG gửi Internet

Dùng file `docker-compose.email-qa.yml` **chỉ cho QA**. Mailpit nhận SMTP
ở Docker port 1025; giao diện và SMTP loopback tại
`http://127.0.0.1:18025`, `127.0.0.1:11025`.

```powershell
# Secret ngẫu nhiên chỉ dùng trong QA; không ghi vào Git.
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$rng.Dispose()
$env:EMAIL_VERIFICATION_QA_HASH_KEY = [Convert]::ToBase64String($bytes)
Set-Location 'D:\PRN232\FPTUSE_LongevityDiet'
docker compose -p prn232-acceptance --env-file .env `
  -f docker-compose.yml -f docker-compose.gateway.yml `
  -f docker-compose.worker-ops.yml -f docker-compose.rabbitmq.yml `
  -f docker-compose.email-qa.yml `
  up -d --build api worker-ops rabbitmq mailpit sqlserver redis
node scripts/Test-Email-Verification-Otp-QA.mjs
node scripts/Test-RabbitMq-Smtp-Email-QA.mjs
```

Bài test từ SQL synthetic với địa chỉ `@example.test`, tạo notification
Pending → broker → SMTP → Mailpit; kiểm tra opt-out ngăn mail thứ hai,
không có nội dung sức khỏe trong email. Test xóa người dùng synthetic
sau khi kiểm tra. Tự từ chối ngoài QA project hoặc GitHub Actions.
Môi trường CI dùng `EMAIL_QA_PROJECT=longevity-diet` cùng `GITHUB_ACTIONS=true`.
Bằng chứng: **3/3 PASS trên Docker QA**.

Các test `.NET IntegrationTests` còn kiểm tra mặc định tắt, đồng ý
email riêng, không backfill, thu hồi quyền và miền người nhận được
cho phép. Migrations chỉ bổ sung **cột** và chỉ số lên hai bảng Identity
đã có; không tạo thêm bảng/FK làm lệch bộ 50 bảng/20 FK của ADR-005.

## 4. Khai báo provider SMTP/Gmail thật — tuyệt đối KHÔNG commit secret

**Chỉ dành cho môi trường được phê duyệt và có domain HTTPS, sender đã
xác minh, xác thực địa chỉ nhận và các bước chống spam.** Đặt biến
môi trường bí mật trong Secret Manager / deployment secret store:

```text
EmailNotifications__Enabled=true
EmailNotifications__SmtpHost=smtp.gmail.com
EmailNotifications__SmtpPort=587
EmailNotifications__SmtpTls=true
EmailNotifications__SmtpUser=<approved-sender-address>
EmailNotifications__SmtpPassword=<smtp-app-password-from-secret-store>
EmailNotifications__FromAddress=<approved-sender-address>
EmailNotifications__PublicBaseUrl=https://<approved-application-domain>
EmailNotifications__AllowedRecipientDomains=<verified-allowed-domains>
EmailNotifications__AllowAnyRecipientDomain=false
RabbitMq__HostName=<private-rabbit-hostname>
RabbitMq__Port=5671
RabbitMq__UseTls=true
RabbitMq__UserName=<broker-user>
RabbitMq__Password=<broker-secret>
```

Gmail SMTP dùng TLS/STARTTLS cổng 587. Theo hướng dẫn Google, App
Password chỉ khả dụng với tài khoản đủ điều kiện đã bật xác minh
2 bước; một số Workspace/Advanced Protection không có tùy chọn này.
**Không dùng mật khẩu đăng nhập Gmail thông thường.** Nếu tài khoản
không cho SMTP App Password, cần tích hợp provider có OAuth2/API
thay vì giảm bảo mật.

Quy trình triển khai yêu cầu:
1. Xác minh email nhận và consent, không gửi tới địa chỉ tự nhập chưa xác minh.
2. Cấu hình DNS SPF/DKIM/DMARC cho miền gửi; ràng buộc rate-limit,
   chống gửi spam, xử lý bounce, unsubscribe và audit consent.
3. Backup/restore và migration schema đã kiểm thử; không tự chạy
   migration database production chỉ vì push GitHub.
4. Test một địa chỉ Gmail QA được chủ tài khoản cho phép, kiểm tra
   SMTP accepted, hộp thư đến/spam và lỗi 4xx/5xx.
5. Chỉ bật provider production bằng quyết định phát hành riêng.

## 5. Những điều chưa đạt và điều cần tránh

- **Chưa có** bằng chứng email đến Gmail thật, vì chưa kết nối tài khoản
  hoặc SMTP API của khách hàng; không được dùng từ “đã gửi Gmail”.
- **Đã có code** background Web Push cho trình duyệt, nhưng chưa có
  bằng chứng nhận push qua FCM/Apple provider thật vì Chrome/Edge QA
  từ chối `PushManager.subscribe` dù quyền báo `granted`; cần
  nghiệm thu thiết bị thật/HTTPS. Chưa hỗ trợ native Android FCM
  hay iOS native APNs. Xem
  `docs/operations/WEBPUSH_BACKGROUND_DELIVERY_20261113.md`.
- **Chưa có** phê duyệt cutover ADR-005; vẫn 12 blocker dữ liệu/backup.
- **Không** coi SMTP status `Sent` là đã đến hộp thư Gmail:
  `Sent` ở đây là **SMTP server accepted**, không phải delivered/read.
- Không commit file `.env`, app password, OAuth token, private VAPID
  key, danh sách email khách hàng hoặc Mailpit data.

Nguồn hướng dẫn Gmail: https://support.google.com/mail/answer/185833 ,
https://support.google.com/mail/answer/7104828 .
