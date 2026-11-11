// Isolated QA: actual reminder background worker runs without legacy MainDb.
// Uses only synthetic user UUIDs and Redis messages in private test Docker.
import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

let checks = 0;
function check(label, condition) {
  if (!condition) throw new Error('FAIL ' + label);
  checks++;
  console.log('PASS ' + label);
}
function findContainer(service, mustExist = true) {
  const ids = execFileSync('docker', ['ps', '-q', '--filter',
    'label=com.docker.compose.service=' + service
  ], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
  if (!mustExist && ids.length === 0) return null;
  if (ids.length !== 1) throw new Error('Unexpected QA container count: ' + service);
  const data = JSON.parse(execFileSync('docker', ['inspect', ids[0]], {
    encoding: 'utf8'
  }))[0];
  if (process.env.GITHUB_ACTIONS !== 'true' &&
      data?.Config?.Labels?.['com.docker.compose.project'] !== 'prn232-acceptance')
    throw new Error('Refusing nonisolated Docker environment');
  return { id: ids[0], env: data.Config.Env };
}
const sqlContainer = findContainer('sqlserver');
const redisContainer = findContainer('redis');
const owned = findContainer('worker-owned');
check('OWNED_REMINDER_QA_ISOLATED', true);
check('OWNED_REMINDER_NO_LEGACY_WORKER_RUNNING', !findContainer('worker', false));
check('OWNED_REMINDER_NO_MAINDB_ENV',
  owned.env.some(x => x === 'Worker__OwnedOnly=true') &&
  !owned.env.some(x => x.startsWith('ConnectionStrings__Default=')));
function sql(query) {
  const r = spawnSync('docker', ['exec', '-i', sqlContainer.id, 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W'
  ], { input: query + '\nGO\n', encoding: 'utf8', timeout: 30000 });
  if (r.error || r.status !== 0)
    throw new Error('Isolated SQL query failed: ' + (r.stderr || 'Unknown'));
  return r.stdout.trim();
}
function redis(...args) {
  return execFileSync('docker', ['exec', redisContainer.id, 'redis-cli', ...args],
    { encoding: 'utf8' }).trim();
}
async function until(condition, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await condition()) return true;
    await new Promise(resolve => setTimeout(resolve, 600));
  }
  return false;
}
const userId = randomUUID();
const eventId = randomUUID();
const preference = {
  eventId, userId, timeZone: 'Asia/Ho_Chi_Minh',
  enabled: true, activeAccount: true,
  mealLoggingEnabled: true, activityEnabled: true,
  challengeEnabled: true, weeklySummaryEnabled: true,
  mealTime: '08:00:00', activityTime: '12:00:00',
  challengeTime: '18:00:00', weeklySummaryTime: '20:00:00',
  quietStart: '23:00:00', quietEnd: '06:00:00',
  version: 1
};
function postPreference() {
  return redis('XADD', 'ldc:identity-events', '*',
    'eventId', eventId,
    'eventType', 'ReminderPreferenceUpdated.v1',
    'payload', JSON.stringify(preference));
}
check('OWNED_REMINDER_TEST_EVENT_PUBLISHED', /^[0-9]+-[0-9]+$/.test(postPreference()));
const received = "SET NOCOUNT ON; SELECT COUNT(*) FROM " +
  "[LongevityWorkerDb].[dbo].[WorkerProcessedEvents] " +
  "WHERE [EventId]='" + eventId + "';";
check('OWNED_REMINDER_IDENTITY_STREAM_WORKERDB_RECEIPT',
  await until(() => sql(received).split(/\s+/).includes('1')));
const scheduleCount = "SET NOCOUNT ON; SELECT COUNT(*) FROM " +
  "[LongevityWorkerDb].[dbo].[ReminderSchedules] " +
  "WHERE [UserId]='" + userId + "' AND [Enabled]=1 AND [PreferenceVersion]=1;";
check('OWNED_REMINDER_FOUR_SCHEDULES_FROM_EVENT',
  sql(scheduleCount).split(/\s+/).includes('4'));
check('OWNED_REMINDER_DUPLICATE_EVENT_REDELIVERED',
  /^[0-9]+-[0-9]+$/.test(postPreference()));
await new Promise(resolve => setTimeout(resolve, 2300));
check('OWNED_REMINDER_COMPOSITE_IDEMPOTENCY',
  sql(received).split(/\s+/).includes('1'));
check('OWNED_REMINDER_ACTIVE_SCHEDULES_NOT_DUPLICATED',
  sql(scheduleCount).split(/\s+/).includes('4'));
// Only synthetic QA rows can be made due; no real-user schedule is touched.
sql("SET NOCOUNT ON; UPDATE [LongevityWorkerDb].[dbo].[ReminderSchedules] " +
  "SET [NextDueUtc]=DATEADD(minute,-2,SYSUTCDATETIME()) " +
  "WHERE [UserId]='" + userId + "' AND [Category]='MealLogging' AND [Enabled]=1; " +
  "IF @@ROWCOUNT <> 1 THROW 51000,'Synthetic QA schedule not unique',1;");
const dispatched = "SET NOCOUNT ON; SELECT COUNT(*) FROM " +
  "[LongevityWorkerDb].[dbo].[ReminderDispatchRecords] " +
  "WHERE [UserId]='" + userId + "' AND [Category]='MealLogging';";
check('OWNED_REMINDER_REAL_SCHEDULED_DISPATCH',
  await until(() => sql(dispatched).split(/\s+/).includes('1'), 30000));
const output = "SET NOCOUNT ON; SELECT COUNT(*) FROM " +
  "[LongevityWorkerDb].[dbo].[WorkerOutbox] " +
  "WHERE [EventType]='NotificationReady.v1' AND [PayloadJson] LIKE '%" +
  userId + "%';";
check('OWNED_REMINDER_NOTIFICATION_OUTBOX',
  sql(output).split(/\s+/).includes('1'));
check('OWNED_REMINDER_OUTBOX_PUBLISHED_TO_REDIS',
  await until(() => redis('XREVRANGE', 'ldc:worker-events', '+', '-', 'COUNT', '300')
    .includes(userId), 30000));
check('OWNED_REMINDER_SQL_EVENT_ACK',
  redis('XPENDING', 'ldc:identity-events', 'ldc-reminder-workers')
    .split(/\r?\n/)[0] === '0');
console.log('WORKER_OWNED_REMINDER_SQL_REDIS=PASS checks=' + checks);
