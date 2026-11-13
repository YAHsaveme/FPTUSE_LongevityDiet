# PRN232 — Email verification, RabbitMQ and browser-push privacy hardening

Status: **source/isolated QA; NOT production go-live** · 13 November 2026

## Problem addressed

The previous RabbitMQ → SMTP implementation required explicit reminder email consent
but did not prove ownership of the email address typed during registration.
This could result in transactional reminder messages being sent to third parties.

Users could also log out of a shared browser while a Web Push device
subscription remained active, or turn reminders off while Redis continued
to retain their device capability URLs.

## Verified recipient model

The user has three independent states:

- `OptedIn`: receive in-app reminders (default false).
- `EmailOptedIn`: explicitly request email reminders (default false).
- `EmailVerifiedAtUtc`: user has proved they receive mail at this
  address (default **NULL**, including historical/legacy users).

**An email is queued only when all three checks pass.** The SMTP
consumer rechecks active account, consent and verification immediately
before sending; revocation/inactivation prevents delivery even if a
message is already queued. Historical `EmailDeliveryStatus=None` records
are never sent retroactively. The same User model and additive EF
migrations apply to Current API SQL and independent Identity owner SQL.

### OTP flow

Authenticated endpoints:

- `GET /api/v1/email-verification/status`: enabled/verified/cooldown
- `POST /api/v1/email-verification/request`: send six-digit code only to
  the logged-in account's saved address
- `POST /api/v1/email-verification/confirm` JSON `{"code":"123456"}`:
  compare proof, set verified time, invalidate token

Properties:

- Cryptographically random six-digit code, HMAC-SHA256 with a server-side
  random 256-bit (or stronger) secret. Never store the plaintext OTP.
- Hash is scoped to user ID and normalized address. A code issued for
  one account is unusable for another.
- Expires in **15 minutes**; resend cooldown **2 minutes**, enforced
  atomically in SQL; max **5 invalid attempts** per challenge.
- Correct confirmation clears the saved hash, expiry and attempt count;
  status never returns the code or the secret.
- Wrong or expired codes cannot activate email sending. Previous
  unverified notification rows stay in-app only.
- No user-controlled email-recipient field is accepted in verification
  requests, and no private health data is included in the OTP email.

## Production configuration — secret store only

Both feature flags remain disabled by default. Set after sender
verification, HTTPS/TLS and explicit security review:

```text
EmailNotifications__Enabled=true
EmailVerification__Enabled=true
EmailVerification__HashKeyBase64=<base64-of-32-cryptographically-random-bytes>
EmailNotifications__SmtpHost=<approved-authenticated-smtp-host>
EmailNotifications__SmtpPort=587
EmailNotifications__SmtpTls=true
EmailNotifications__SmtpUser=<approved-sender-account>
EmailNotifications__SmtpPassword=<secret-store-only>
EmailNotifications__FromAddress=<verified-sender-account>
EmailNotifications__PublicBaseUrl=https://<approved-domain>
EmailNotifications__AllowedRecipientDomains=<verified-test-allowlist>
EmailNotifications__AllowAnyRecipientDomain=false
RabbitMq__HostName=<private-broker>
RabbitMq__Port=5671
RabbitMq__UseTls=true
RabbitMq__UserName=<broker-user>
RabbitMq__Password=<broker-secret>
```

The API **refuses to start** an enabled verification service if the
HMAC secret, authenticated delivery configuration or SMTP transport
are absent/invalid. Do not rotate this HMAC secret while active OTPs
are pending; existing OTPs would become invalid. Plan key rotation
with a short expiry and deployment coordination.

### Isolated Mailpit QA (no real Gmail)

`docker-compose.email-qa.yml` enables both email and verification
against in-container Mailpit, restricts recipients to `@example.test`
and accepts a newly generated ephemeral `EMAIL_VERIFICATION_QA_HASH_KEY`
from the *process environment*, never a committed file.

```powershell
# QA project only. Requires QA Docker and isolated synthetic SQL.
# Generate a strong key in the calling PowerShell process:
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$rng.Dispose()
$env:EMAIL_VERIFICATION_QA_HASH_KEY = [Convert]::ToBase64String($bytes)

Set-Location 'D:\PRN232\FPTUSE_LongevityDiet'
docker compose -p prn232-acceptance --env-file .env `
  -f docker-compose.yml -f docker-compose.gateway.yml `
  -f docker-compose.worker-ops.yml -f docker-compose.rabbitmq.yml `
  -f docker-compose.email-qa.yml `
  up -d --build sqlserver redis rabbitmq api worker worker-ops mailpit
node scripts/Test-Email-Verification-Otp-QA.mjs
node scripts/Test-RabbitMq-Smtp-Email-QA.mjs
Remove-Item Env:EMAIL_VERIFICATION_QA_HASH_KEY
```

**Observed QA:** authenticated synthetic user requested OTP, real SMTP
Mailpit captured the code, wrong code rejected, right code accepted,
replay idempotent, resend cooldown enforced. Separate SQL→RabbitMQ→SMTP
delivery/revoke test passed. No real Gmail recipient was contacted.

## Web Push privacy

- Browser logout invokes device-specific backend removal, then
  `PushSubscription.unsubscribe()` locally *before* revoking login.
  If the backend API is unavailable, it still attempts browser-side
  unsubscribe and does not prevent logging out.
- When global reminder consent is disabled, the API erases all that
  user's stored Redis device capability URLs if Web Push is enabled.
  If Redis is unavailable, consent is already disabled in SQL and the
  worker rechecks it before every send.
- There is no claim of real device push provider acceptance;
  external FCM/Apple/Firefox push reception remains unverified.
  CDP simulated Service Worker tests are not equivalent.

## Residual production acceptance

The original assignment's 22 static criteria and CI are *technical*
checks. They do not authorize public HTTPS, real SMTP provider keys,
delivery to real customer Gmail, physical push device acceptance,
external security/clinical sign-off or ADR-005 historical data cutover.

Before a production change, separately verify: legitimate sender DNS
SPF/DKIM/DMARC, mail-provider quota, recipient confirmation on a
controlled Gmail test mailbox, secure TLS, monitoring/suppression for
bounces/complaints, opt-out process, audit retention, live Web Push on
each supported browser/OS, reviewer signoff, backup/restore and all
source-to-owner ID reconciliation with rollback.

**The production cutover remains NO-GO** while the independent ADR-005
preflight reports historical data/backups/identity/TLS blockers.
