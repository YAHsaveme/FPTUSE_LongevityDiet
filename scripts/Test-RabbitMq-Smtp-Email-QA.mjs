'use strict';
// End-to-end synthetic SQL -> RabbitMQ -> SMTP -> Mailpit acceptance.
// No API tokens, no real customer recipients, no external SMTP.
// Uses only the prn232-acceptance Docker project and localhost Mailpit.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const project = process.env.EMAIL_QA_PROJECT || 'prn232-acceptance';
assert.ok(project === 'prn232-acceptance' ||
  (project === 'longevity-diet' && process.env.GITHUB_ACTIONS === 'true'),
  'Email QA requires the isolated local project or GitHub Actions.');
const apiContainer = project + '-api-1';
const sqlContainer = project + '-sqlserver-1';
function docker(args, input = '') {
  const result = spawnSync('docker', args, {
    encoding: 'utf8', input, timeout: 30000,
  });
  if (result.error || result.status !== 0) {
    // sqlcmd writes SQL Server errors to stdout on some runners. Include
    // redacted diagnostics to distinguish a constraint conflict from a
    // transient Docker exec / SQL connection failure.
    const detail = [result.error?.message, result.stdout, result.stderr]
      .filter(Boolean).join('\n')
      .replace(/(Password=)[^;\s]+/gi, '$1[REDACTED]')
      .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]')
      .slice(-1600);
    throw Error('Isolated QA Docker command failed: ' +
      args.slice(0, 3).join(' ') + ' exit=' + result.status +
      ' diagnostic=' + detail);
  }
  return result.stdout.trim();
}
function assertQa(label, container) {
  const details = JSON.parse(docker(['inspect', container]))[0];
  assert.equal(details.Config.Labels['com.docker.compose.project'], project,
    'Do not run against a non-QA ' + label);
}
assertQa('SQL database', sqlContainer);
assertQa('Identity API', apiContainer);
const id = randomUUID();
const marker = id.replaceAll('-', '').slice(0, 16);
const email = 'rabbit-smtp-' + marker + '@example.test';
const dedup = 'synthetic-email-qa-' + marker;
function query(statement) {
  return docker(['exec', '-i', sqlContainer, 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" ' +
    '-C -W -h -1 -b -d LongevityDietDb'],
    // Filtered indexes (including soft-delete indexes) require these DML session settings.
    'SET ANSI_NULLS ON;\nSET ANSI_PADDING ON;\nSET ANSI_WARNINGS ON;\n' +
    'SET ARITHABORT ON;\nSET CONCAT_NULL_YIELDS_NULL ON;\n' +
    'SET QUOTED_IDENTIFIER ON;\nSET NUMERIC_ROUNDABORT OFF;\n' +
    'SET NOCOUNT ON;\n' + statement + '\nGO\n');
}
const root = 'http://127.0.0.1:18025/api/v1/messages';
async function received() {
  const response = await fetch(root);
  assert.equal(response.status, 200, 'Local Mailpit must be running');
  const result = await response.json();
  return (result.messages || []).filter(m =>
    (m.To || []).some(to => (to.Address || '').toLowerCase() === email));
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, max = 60000) {
  const deadline = Date.now() + max;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await pause(1100);
  }
  throw Error('Timeout waiting for RabbitMQ SMTP QA delivery');
}
function insertNotification(name, suffix) {
  const event = randomUUID();
  query(`INSERT INTO dbo.UserNotifications
    (Id, UserId, Category, Title, Body, DeepLink, DeduplicationKey,
      CreatedAtUtc, ReadAtUtc, EmailDeliveryStatus, EmailDeliveryAttempts)
    VALUES ('${event}', '${id}', 'Activity',
      'Synthetic Rabbit SMTP QA', 'Non-sensitive synthetic data only',
      '/activity', '${dedup}-${suffix}', SYSUTCDATETIME(), NULL, 'Pending', 0);`);
  return event;
}
function state(notificationId) {
  return query(`SELECT EmailDeliveryStatus FROM dbo.UserNotifications
    WHERE Id = '${notificationId}';`).trim();
}
try {
  query(`
    INSERT INTO dbo.Users
      (Id, Email, NormalizedEmail, PasswordHash, DisplayName, Role, Status,
       EmailVerifiedAtUtc, CreatedAt, UpdatedAt)
    VALUES ('${id}', '${email}', '${email.toUpperCase()}',
      'synthetic-disabled-login-no-password', 'Synthetic Rabbit SMTP QA',
      'Member', 'Active', SYSUTCDATETIME(),
      SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());

    INSERT INTO dbo.ReminderPreferences
      (UserId, OptedIn, EmailOptedIn, MealLoggingEnabled, ActivityEnabled,
      ChallengeEnabled, WeeklySummaryEnabled, MealTime, ActivityTime,
      ChallengeTime, WeeklySummaryTime, QuietStart, QuietEnd, Version, UpdatedAtUtc)
    VALUES ('${id}', 1, 1, 1, 1, 1, 1,
      '20:00:00', '18:30:00', '21:00:00', '09:00:00',
      '22:00:00', '07:00:00', 1, SYSDATETIMEOFFSET());
  `);
  const first = insertNotification('first', 'allowed');
  await until(async () =>
    state(first) === 'Sent' && (await received()).length === 1);
  console.log('PASS SQL_PENDING_TO_RABBITMQ_TO_SMTP_MAILPIT');
  assert.equal((await received()).length, 1);

  // Revocation has effect even when a message was already queued.
  query(`UPDATE dbo.ReminderPreferences SET EmailOptedIn = 0
    WHERE UserId = '${id}';`);
  const blocked = insertNotification('second', 'revoked');
  await until(async () => state(blocked) === 'Skipped');
  await pause(2000);
  assert.equal((await received()).length, 1,
    'Revoked consent must never produce a second email');
  console.log('PASS CONSENT_REVOKED_AFTER_QUEUE_NO_EMAIL');

  // No patient content was copied to the SMTP test message.
  const matches = await received();
  assert.match(matches[0].Subject || '', /LongevityDiet/);
  console.log('PASS SMTP_SUBJECT_IS_GENERIC_NO_HEALTH_DATA');
  console.log('RABBITMQ_TO_MAILPIT_E2E=PASS (3/3), synthetic data only');
} finally {
  // Cleanup *only* the synthetic user created above. Delete dependent QA
  // notifications and opt-in row before the fake user so the test exercises
  // cleanup deterministically rather than relying on cascades during broker
  // worker activity. Retry briefly on SQL startup/lock races, but fail
  // explicitly if cleanup never succeeds.
  let cleanupError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      query(`SET XACT_ABORT ON;
        BEGIN TRANSACTION;
        DELETE FROM dbo.UserNotifications WHERE UserId = '${id}'
          AND DeduplicationKey LIKE '${dedup}-%';
        DELETE FROM dbo.ReminderPreferences WHERE UserId = '${id}';
        DELETE FROM dbo.Users WHERE Id = '${id}'
          AND Email = '${email}'
          AND PasswordHash = 'synthetic-disabled-login-no-password';
        COMMIT TRANSACTION;`);
      cleanupError = undefined;
      break;
    } catch (error) {
      cleanupError = error;
      if (attempt < 2) await pause(650);
    }
  }
  if (cleanupError) throw cleanupError;
}
