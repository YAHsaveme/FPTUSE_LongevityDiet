// Optional ADR-005 Identity owner acceptance. Runs ONLY against isolated QA
// Docker Compose; creates synthetic users, never uses shared/production accounts.
import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const identity = 'http://127.0.0.1:18081';
const legacy = 'http://127.0.0.1:18080';
let passed = 0;
function check(label, ok) {
  if (!ok) throw new Error('FAIL ' + label);
  console.log('PASS ' + label);
  passed++;
}
const sqlIds = execFileSync('docker', [
  'ps', '-q', '--filter', 'label=com.docker.compose.service=sqlserver',
], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
if (sqlIds.length !== 1) throw new Error('Expected isolated QA SQL container');
const sqlId = sqlIds[0];
const info = JSON.parse(execFileSync('docker', ['inspect', sqlId], { encoding: 'utf8' }))[0];
const project = info.Config?.Labels?.['com.docker.compose.project'];
if (!project || (process.env.GITHUB_ACTIONS !== 'true' && project !== 'prn232-acceptance'))
  throw new Error('Identity acceptance is restricted to isolated QA Docker project');
check('IDENTITY_ISOLATED_QA_COMPOSE', true);
function sql(statement) {
  const run = spawnSync('docker', [
    'exec', '-i', sqlId, 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W',
  ], { input: statement + '\nGO\n', encoding: 'utf8', timeout: 30000 });
  if (run.error || run.status !== 0)
    throw new Error('QA Identity SQL query failed ' + (run.stderr || ''));
  return run.stdout.trim();
}
async function req(path, { token, cookie, body, method = 'GET' } = {}) {
  const res = await fetch(identity + path, {
    method, headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(12000),
  });
  const text = await res.text();
  return {
    status: res.status,
    data: text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null,
    cookie: (res.headers.get('set-cookie') || '').split(';')[0],
  };
}
let ready = false;
for (let i = 0; i < 30; i++) {
  try {
    if ((await req('/ready')).status === 200) { ready = true; break; }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
check('IDENTITY_OWNED_SQL_READY', ready);
const migrationSql = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM [LongevityIdentityDb].[dbo].[__EFMigrationsHistory];');
check('IDENTITY_EF_MIGRATION_APPLIED', Number(migrationSql.split(/\s+/).find(x => /^\d+$/.test(x))) >= 1);
check('IDENTITY_SERVICE_HEALTH', (await req('/health')).status === 200);
check('IDENTITY_JWT_REQUIRED', (await req('/api/v1/profile')).status === 401);
check('LEGACY_GATEWAY_UNCHANGED', (await fetch(legacy + '/gateway/ready')).status === 200);

const email = 'identity-owner-qa-' + randomUUID().replaceAll('-', '') + '@example.test';
const password = 'QAident1ty!_A_' + randomUUID();
const body = { email, password, displayName: 'Identity QA User' };
check('IDENTITY_REJECTS_INVALID_REGISTRATION', (await req('/api/v1/auth/register',
  { method: 'POST', body: { ...body, email: 'not-email' } })).status === 400);
check('IDENTITY_REJECTS_WEAK_PASSWORD', (await req('/api/v1/auth/register',
  { method: 'POST', body: { ...body, password: 'weak' } })).status === 400);

const created = await req('/api/v1/auth/register', { method: 'POST', body });
const userId = created.data?.user?.id;
const accessToken = created.data?.accessToken;
const cookie1 = created.cookie;
check('IDENTITY_REGISTER_OWNED_SQL_JWT_COOKIE', created.status === 201 &&
  typeof userId === 'string' && typeof accessToken === 'string' &&
  cookie1.startsWith('ldc_refresh=') && created.data?.user?.role === 'Member');
check('IDENTITY_PREVENTS_DUPLICATE_EMAIL', (await req('/api/v1/auth/register',
  { method: 'POST', body })).status === 409);
check('IDENTITY_BAD_LOGIN_401', (await req('/api/v1/auth/login',
  { method: 'POST', body: { email, password: 'nopeQA123!' } })).status === 401);
const login = await req('/api/v1/auth/login', {
  method: 'POST', body: { email, password },
});
check('IDENTITY_LOGIN_VALID_JWT', login.status === 200 &&
  login.data?.user?.id === userId && login.cookie.startsWith('ldc_refresh='));

const original = await req('/api/v1/profile', { token: accessToken });
check('IDENTITY_TAMPERED_JWT_REJECTED', (await req('/api/v1/profile',
  { token: accessToken + 'tampered' })).status === 401);
check('IDENTITY_OWNER_PROFILE_DEFAULTS', original.status === 200 &&
  original.data?.userId === userId &&
  original.data?.timeZone === 'Asia/Ho_Chi_Minh' && original.data?.profileCompleted === false);
const profileBody = {
  displayName: 'Identity QA Updated', birthYear: 2000,
  timeZone: 'Asia/Tokyo', wakeTime: '06:30:00', sleepTime: '22:00:00',
  preferredMealFrequency: 3, foodPreference: 'synthetic QA',
};
check('IDENTITY_PROFILE_REJECTS_INVALID_TZ', (await req('/api/v1/profile', {
  method: 'PUT', token: accessToken, body: { ...profileBody, timeZone: 'Imaginary/Unknown' },
})).status === 400);
const update = await req('/api/v1/profile', {
  method: 'PUT', token: accessToken, body: profileBody,
});
check('IDENTITY_PROFILE_UPDATE_OWNED_SQL', update.status === 200 &&
  update.data?.displayName === profileBody.displayName &&
  update.data?.profileCompleted === true &&
  update.data?.timeZone === 'Asia/Tokyo');
const readBack = await req('/api/v1/profile', { token: accessToken });
check('IDENTITY_PROFILE_PERSISTED_READBACK', readBack.status === 200 &&
  readBack.data?.timeZone === 'Asia/Tokyo' && readBack.data?.birthYear === 2000);
const refreshed = await req('/api/v1/auth/refresh',
  { method: 'POST', cookie: cookie1 });
check('IDENTITY_REFRESH_ROTATES_COOKIE', refreshed.status === 200 &&
  refreshed.cookie.startsWith('ldc_refresh=') && refreshed.cookie !== cookie1);
const replay = await req('/api/v1/auth/refresh',
  { method: 'POST', cookie: cookie1 });
check('IDENTITY_REPLAY_REFRESH_REJECTED', replay.status === 401);
const cookie2 = refreshed.cookie;
const revoke = await req('/api/v1/auth/revoke',
  { method: 'POST', cookie: cookie2 });
check('IDENTITY_REVOKE_204', revoke.status === 204);
check('IDENTITY_REVOKED_REFRESH_REJECTED', (await req('/api/v1/auth/refresh',
  { method: 'POST', cookie: cookie2 })).status === 401);

const strangerEmail = 'identity-owner-qa-' + randomUUID().replaceAll('-', '') + '@example.test';
const stranger = await req('/api/v1/auth/register', {
  method: 'POST', body: { email: strangerEmail, password, displayName: 'Other QA account' },
});
const strangerProfile = await req('/api/v1/profile', { token: stranger.data?.accessToken });
check('IDENTITY_USER_ISOLATION_BY_TOKEN', stranger.status === 201 &&
  strangerProfile.status === 200 && strangerProfile.data?.userId !== userId &&
  strangerProfile.data?.profileCompleted === false);
if (!/^identity-owner-qa-[0-9a-f]{32}@example\.test$/.test(email) ||
    !/^[0-9a-f-]{36}$/i.test(userId)) throw new Error('Synthetic SQL guard failed');
const owned = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM ' +
  "[LongevityIdentityDb].[dbo].[Users] WHERE [Id]='" + userId + "' AND [Email]='" + email + "';");
check('IDENTITY_USER_EXISTS_ONLY_IN_OWNER_DB', owned.split(/\s+/).includes('1'));
const oldDb = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM ' +
  "[LongevityDietDb].[dbo].[Users] WHERE [Email]='" + email + "';");
check('IDENTITY_USER_NOT_SILENTLY_COPIED_TO_LEGACY', oldDb.split(/\s+/).includes('0'));
const profilePersisted = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM ' +
  "[LongevityIdentityDb].[dbo].[UserProfiles] WHERE [UserId]='" + userId +
  "' AND [TimeZone]='Asia/Tokyo' AND [ProfileCompleted]=1;");
check('IDENTITY_PROFILE_SQL_PERSISTED', profilePersisted.split(/\s+/).includes('1'));
const outbox = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM ' +
  "[LongevityIdentityDb].[dbo].[IdentityOutbox] WHERE [UserId]='" + userId +
  "' AND [EventType]='UserProfileUpdated.v1';");
check('IDENTITY_VERSIONED_OUTBOX_SAME_DB', outbox.split(/\s+/).includes('1'));
const eventIdRows = sql('SET NOCOUNT ON; SELECT TOP 1 CONVERT(varchar(36),[Id]) FROM ' +
  "[LongevityIdentityDb].[dbo].[IdentityOutbox] WHERE [UserId]='" + userId +
  "' AND [EventType]='UserProfileUpdated.v1' ORDER BY [CreatedAtUtc] DESC;");
const eventId = eventIdRows.split(/\s+/).find(x => /^[0-9a-f-]{36}$/i.test(x));
check('IDENTITY_PROFILE_EVENT_ID_SQL', !!eventId);
const redisIds = execFileSync('docker', [
  'ps', '-q', '--filter', 'label=com.docker.compose.service=redis',
], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
check('IDENTITY_SINGLE_ISOLATED_REDIS_BROKER', redisIds.length === 1);
let delivered = false;
for (let i = 0; i < 20; i++) {
  const sent = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM ' +
    "[LongevityIdentityDb].[dbo].[IdentityOutbox] WHERE [Id]='" +
    eventId + "' AND [PublishedAtUtc] IS NOT NULL;");
  const stream = execFileSync('docker', [
    'exec', redisIds[0], 'redis-cli',
    'XREVRANGE', 'ldc:identity-profile-events', '+', '-', 'COUNT', '200',
  ], { encoding: 'utf8' });
  if (sent.split(/\s+/).includes('1') && stream.toLowerCase().includes(eventId.toLowerCase())) {
    delivered = true;
    break;
  }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
check('IDENTITY_PROFILE_EVENT_PUBLISHED_AND_SQL_ACK', delivered);
const refreshRows = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM ' +
  "[LongevityIdentityDb].[dbo].[RefreshTokens] WHERE [UserId]='" + userId +
  "' AND [RevokedAt] IS NOT NULL;");
check('IDENTITY_REFRESH_REVOKED_SQL', Number(refreshRows.split(/\s+/).find(x => /^\d+$/.test(x))) >= 2);
const catalogAuth = await fetch('http://127.0.0.1:18082/api/v1/foods', {
  headers: { Authorization: 'Bearer ' + accessToken },
  signal: AbortSignal.timeout(12000),
});
check('IDENTITY_JWT_INTEROPERABLE_WITH_CATALOG', catalogAuth.status === 200);
console.log('TARGET_IDENTITY_OWNED_HTTP_SQL=PASS checks=' + passed);
