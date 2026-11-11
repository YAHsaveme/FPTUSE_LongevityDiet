// ADR-005 Worker-owned Ops API, four Redis streams, SQL inbox and dead letters.
// Never run against anything but the isolated prn232-acceptance QA Compose project
// or GitHub Actions' ephemeral runner. Uses only synthetic @example.test users.
import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const base = 'http://127.0.0.1:18086';
const identity = 'http://127.0.0.1:18081';
let passed = 0;
function check(name, condition) {
  if (!condition) throw new Error('FAIL ' + name);
  console.log('PASS ' + name);
  passed++;
}
function container(service) {
  const ids = execFileSync('docker', [
    'ps', '-q', '--filter', 'label=com.docker.compose.service=' + service
  ], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
  if (ids.length !== 1) throw new Error('Exactly one QA ' + service + ' container required');
  const data = JSON.parse(execFileSync('docker', ['inspect', ids[0]],
    { encoding: 'utf8' }))[0];
  if (process.env.GITHUB_ACTIONS !== 'true' &&
    data?.Config?.Labels?.['com.docker.compose.project'] !== 'prn232-acceptance')
    throw new Error('Refusing non-isolated QA container');
  return ids[0];
}
const sqlId = container('sqlserver');
const redisId = container('redis');
const workerId = container('worker-ops');
check('WORKER_OPS_ISOLATED_QA_CONTAINERS', true);

function sql(command) {
  const r = spawnSync('docker', ['exec', '-i', sqlId, 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W'
  ], { input: command + '\nGO\n', encoding: 'utf8', timeout: 30000 });
  if (r.error || r.status !== 0)
    throw new Error('QA SQL failed: ' + (r.stderr ?? 'unknown'));
  return r.stdout.trim();
}
async function request(path, { token, method = 'GET', body, onIdentity = false } = {}) {
  const r = await fetch((onIdentity ? identity : base) + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000)
  });
  const data = await r.text();
  let value;
  try { value = JSON.parse(data); } catch { value = data; }
  return { status: r.status, value };
}
async function waitForReady() {
  for (let i = 0; i < 45; i++) {
    try {
      if ((await request('/ready')).status === 200) return true;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}
check('WORKER_OPS_SQL_READY', await waitForReady());
check('WORKER_OPS_HEALTH', (await request('/health')).status === 200);
check('WORKER_OPS_REJECT_ANONYMOUS',
  (await request('/api/v1/admin/events')).status === 401);

const stamp = randomUUID().replaceAll('-', '');
const email = 'workerops-qa-' + stamp + '@example.test';
const password = 'WorkerOpsQA@' + stamp;
const register = await request('/api/v1/auth/register', {
  onIdentity: true, method: 'POST',
  body: { email, password, displayName: 'Synthetic Worker Ops QA' },
});
check('WORKER_OPS_IDENTITY_REGISTER', register.status === 201 &&
  typeof register.value?.accessToken === 'string');
const memberToken = register.value.accessToken;
check('WORKER_OPS_MEMBER_FORBIDDEN',
  (await request('/api/v1/admin/events', { token: memberToken })).status === 403);
check('WORKER_OPS_INVALID_TOKEN_REJECTED',
  (await request('/api/v1/admin/events', { token: memberToken + 'invalid' })).status === 401);
if (!/^workerops-qa-[0-9a-f]{32}@example\.test$/.test(email))
  throw new Error('Synthetic account guard failed');
sql("SET NOCOUNT ON; UPDATE [LongevityIdentityDb].[dbo].[Users] SET [Role]='Admin' " +
  "WHERE [Email]='" + email + "' AND [Role]='Member'; " +
  "IF @@ROWCOUNT <> 1 THROW 51000,'Synthetic QA-only Admin promotion failed',1;");
const login = await request('/api/v1/auth/login', { onIdentity: true,
  method: 'POST', body: { email, password } });
check('WORKER_OPS_TEST_ADMIN_AUTH', login.status === 200 &&
  typeof login.value?.accessToken === 'string');
const admin = login.value.accessToken;
const route = '/api/v1/admin';
check('WORKER_OPS_ADMIN_EVENTS_AUTHORIZED',
  (await request(route + '/events', { token: admin })).status === 200);
check('WORKER_OPS_ADMIN_DEADLETTER_AUTHORIZED',
  (await request(route + '/dead-letter', { token: admin })).status === 200);
check('WORKER_OPS_PAGE_VALIDATED',
  (await request(route + '/events?page=0', { token: admin })).status === 400);
check('WORKER_OPS_SOURCE_VALIDATED',
  (await request(route + '/events?source=evil', { token: admin })).status === 400);
check('WORKER_OPS_REAL_DISPATCH_JOBS_API',
  (await request(route + '/jobs', { token: admin })).status === 200 &&
  Array.isArray((await request(route + '/jobs', { token: admin })).value?.items));
check('WORKER_OPS_JOBS_DENIED_FOR_MEMBER',
  (await request(route + '/jobs', { token: memberToken })).status === 403);

function publish(stream, kind, id, payload) {
  const values = ['XADD', 'ldc:' + stream + '-events', '*',
    'eventId', id, 'eventType', kind, 'payload', JSON.stringify(payload)];
  return execFileSync('docker', ['exec', redisId, 'redis-cli', ...values],
    { encoding: 'utf8' }).trim();
}
const sources = [
  ['planning', 'DietaryPreferencesUpdated.v1'],
  ['tracking', 'MealLogChanged.v1'],
  ['recommendation', 'RecommendationFeedbackSubmitted.v1'],
  ['catalog', 'RuleSetPublished.v1'],
];
const ids = [];
for (const [source, eventType] of sources) {
  const id = randomUUID();
  ids.push([source, id]);
  publish(source, eventType, id, { eventId: id, userId: register.value.user.id,
    occurredAtUtc: new Date().toISOString(), schemaVersion: 1 });
}
async function waitForReceipt(source, eventId) {
  const query = "SET NOCOUNT ON; SELECT COUNT(*) FROM " +
    "[LongevityWorkerDb].[dbo].[WorkerReceivedEvents] WHERE [Source]='" +
    source + "' AND [EventId]='" + eventId + "';";
  for (let attempt = 0; attempt < 25; attempt++) {
    if (sql(query).split(/\s+/).includes('1')) return true;
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  return false;
}
for (const [source, id] of ids)
  check('WORKER_OPS_INGEST_' + source.toUpperCase(),
    await waitForReceipt(source, id));
check('WORKER_OPS_ADMIN_EVENTS_VISIBLE',
  (await request(route + '/events?pageSize=100', { token: admin }))
    .value?.items?.some?.(x => x.eventId === ids[0][1]));
check('WORKER_OPS_SOURCE_FILTER',
  (await request(route + '/events?source=planning', { token: admin }))
    .value?.items?.every?.(x => x.source === 'planning'));

// The same eventId in another Redis entry must not create a second SQL receipt.
publish('tracking', 'MealLogChanged.v1', ids[1][1], {
  eventId: ids[1][1], userId: register.value.user.id,
  occurredAtUtc: new Date().toISOString(), schemaVersion: 1
});
await new Promise(resolve => setTimeout(resolve, 2600));
check('WORKER_OPS_DEDUPLICATES_REDELIVERY',
  sql("SET NOCOUNT ON; SELECT COUNT(*) FROM " +
    "[LongevityWorkerDb].[dbo].[WorkerReceivedEvents] WHERE [Source]='tracking' " +
    "AND [EventId]='" + ids[1][1] + "';").split(/\s+/).includes('1'));

const invalidId = randomUUID();
publish('tracking', 'MealLogChanged.v1', invalidId, {
  eventId: randomUUID(), schemaVersion: 1
});
const invalidVersionId = randomUUID();
publish('planning', 'NotVersioned', invalidVersionId, {
  eventId: invalidVersionId
});
async function waitForDeadLetter(source, code) {
  const statement = "SET NOCOUNT ON; SELECT COUNT(*) FROM " +
    "[LongevityWorkerDb].[dbo].[WorkerEventDeadLetters] WHERE [Source]='" +
    source + "' AND [ReasonCode]='" + code + "';";
  for (let attempt = 0; attempt < 25; attempt++) {
    const found = Number(sql(statement).split(/\s+/).find(x => /^\d+$/.test(x)) ?? 0);
    if (found >= 1) return true;
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  return false;
}
check('WORKER_OPS_INVALID_EVENTID_DEADLETTER',
  await waitForDeadLetter('tracking', 'EventIdMismatch'));
check('WORKER_OPS_INVALID_EVENTTYPE_DEADLETTER',
  await waitForDeadLetter('planning', 'InvalidEventType'));
const dead = await request(route + '/dead-letter?resolved=false', { token: admin });
check('WORKER_OPS_DEADLETTER_API_REASON_ONLY',
  dead.status === 200 && dead.value?.items?.some?.(
    x => x.reasonCode === 'EventIdMismatch') &&
  !JSON.stringify(dead.value).includes('payload'));
const dlq = execFileSync('docker', ['exec', redisId, 'redis-cli',
  'XREVRANGE', 'ldc:worker-ops-dead-letter', '+', '-', 'COUNT', '10'],
{ encoding: 'utf8' });
check('WORKER_OPS_REDIS_DLQ_METADATA_ONLY',
  dlq.includes('EventIdMismatch') && !dlq.includes('userId'));
check('WORKER_OPS_ONLY_OWN_DATABASE',
  sql("SET NOCOUNT ON; SELECT COUNT(*) FROM [LongevityWorkerDb].sys.tables " +
    "WHERE [name] IN ('Users','Foods','MealPlans','MealLogs','RecommendationFeedbacks');")
    .split(/\s+/).includes('0'));
check('WORKER_OPS_SQL_NO_EVENT_PAYLOAD_COPIED',
  sql("SET NOCOUNT ON; SELECT COUNT(*) FROM [LongevityWorkerDb].sys.columns " +
    "WHERE [object_id]=OBJECT_ID('LongevityWorkerDb.dbo.WorkerReceivedEvents') " +
    "AND [name] IN ('PayloadJson','Body','Email');")
    .split(/\s+/).includes('0'));
for (const [source] of sources) {
  const raw = execFileSync('docker', ['exec', redisId, 'redis-cli',
    'XPENDING', 'ldc:' + source + '-events', 'ldc-worker-ops-' + source
  ], { encoding: 'utf8' });
  check('WORKER_OPS_NO_UNACKED_' + source.toUpperCase(),
    raw.split(/\r?\n/).includes('0'));
}

console.log('WORKER_OPS_SQL_REDIS_JWT_QA=PASS checks=' + passed);
