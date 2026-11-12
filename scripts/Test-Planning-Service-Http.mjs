// Destructive QA accounts/templates are restricted to isolated Docker project.
import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const identity = 'http://127.0.0.1:18081';
const planning = 'http://127.0.0.1:18083';
let passed = 0;
const check = (label, ok) => {
  if (!ok) throw new Error('FAIL ' + label);
  passed++;
  console.log('PASS ' + label);
};
const ids = execFileSync('docker', ['ps', '-q', '--filter',
  'label=com.docker.compose.service=sqlserver'], { encoding: 'utf8' }).trim()
  .split(/\s+/).filter(Boolean);
if (ids.length !== 1) throw new Error('Only one isolated QA SQL allowed');
const sqlId = ids[0];
const info = JSON.parse(execFileSync('docker', ['inspect', sqlId], {
  encoding: 'utf8',
}))[0];
if (info?.Config?.Labels?.['com.docker.compose.project'] !== 'prn232-acceptance' &&
    process.env.GITHUB_ACTIONS !== 'true')
  throw new Error('Refusing non-isolated QA SQL project');
check('PLANNING_ISOLATED_QA_PROJECT', true);
function sql(statement) {
  const r = spawnSync('docker', ['exec', '-i', sqlId, 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W'],
  { input: statement + '\nGO\n', encoding: 'utf8', timeout: 30000 });
  if (r.error || r.status !== 0) throw new Error('QA SQL failure: ' + r.stderr);
  return r.stdout.trim();
}
async function request(root, path, { token, method = 'GET', body } = {}) {
  const r = await fetch(root + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const txt = await r.text();
  let data;
  try { data = JSON.parse(txt); } catch { data = txt; }
  return { status: r.status, data };
}
let ready = false;
for (let i = 0; i < 30; i++) {
  try { if ((await request(planning, '/ready')).status === 200) { ready = true; break; } }
  catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
check('PLANNING_OWNED_SQL_READY', ready);
check('PLANNING_DB_MIGRATED', Number(sql('SET NOCOUNT ON; SELECT COUNT(*) FROM ' +
  '[LongevityPlanningDb].[dbo].[__EFMigrationsHistory];').split(/\s+/).find(x => /^\d+$/.test(x))) >= 2);
check('PLANNING_ANONYMOUS_401', (await request(planning, '/api/v1/meal-plans')).status === 401);
const id = randomUUID().replaceAll('-', '');
const password = 'QAPlanning!_9_' + id;
async function register(tag) {
  const email = 'planning-qa-' + tag + '-' + randomUUID().replaceAll('-', '') + '@example.test';
  const res = await request(identity, '/api/v1/auth/register', {
    method: 'POST', body: { email, password, displayName: 'Planning synthetic QA' },
  });
  check('REGISTER_' + tag, res.status === 201 && typeof res.data?.accessToken === 'string');
  return { email, accessToken: res.data.accessToken, userId: res.data.user.id };
}
const a = await register('usera');
const b = await register('userb');
const admin = await register('admin');
const root = '/api/v1';
const pref = root + '/meal-plans/preferences';
check('PLANNING_NO_PREF_YET_404', (await request(planning, pref, { token: a.accessToken })).status === 404);
const validPreference = { dietaryPattern: 'PlantForward',
  allergies: ['PEANUT'], excludedFoods: ['SHELLFISH'], preferredCuisine: 'VN' };
check('PLANNING_BAD_PATTERN_400', (await request(planning, pref,
  { token: a.accessToken, method: 'PUT', body: { ...validPreference, dietaryPattern: 'Unknown' } })).status === 400);
check('PLANNING_REJECTS_UNSAFE_TOKENS', (await request(planning, pref,
  { token: a.accessToken, method: 'PUT', body: { ...validPreference, allergies: ['x,y'] } })).status === 400);
const saved = await request(planning, pref, {
  token: a.accessToken, method: 'PUT', body: validPreference,
});
check('PLANNING_PREFERENCE_WRITES_OWNER_SQL', saved.status === 200 &&
  saved.data?.allergies?.includes('PEANUT'));
check('PLANNING_PREFERENCE_PERSISTS', (await request(planning, pref,
  { token: a.accessToken })).data?.excludedFoods?.includes('SHELLFISH'));
check('PLANNING_USER_B_CANNOT_READ_A_PREF', (await request(planning, pref,
  { token: b.accessToken })).status === 404);
check('PLANNING_TOKEN_TAMPERING_REJECTED', (await request(planning, pref,
  { token: a.accessToken + 'invalid' })).status === 401);
check('PLANNING_NO_CURRENT_PLAN_404', (await request(planning,
  root + '/meal-plans/current', { token: a.accessToken })).status === 404);
check('PLANNING_CROSS_USER_PLAN_404', (await request(planning,
  root + '/meal-plans/' + randomUUID(), { token: b.accessToken })).status === 404);
check('PLANNING_BAD_PAGE_400', (await request(planning,
  root + '/meal-plans?page=0', { token: a.accessToken })).status === 400);
if (!/^planning-qa-admin-[0-9a-f]{32}@example\.test$/.test(admin.email))
  throw new Error('Synthetic admin promotion guard refused');
sql("SET NOCOUNT ON; UPDATE [LongevityIdentityDb].[dbo].[Users] SET [Role]='Admin' " +
  "WHERE [Email]='" + admin.email + "' AND [Role]='Member'; " +
  "IF @@ROWCOUNT<>1 THROW 51000, 'QA promotion refused', 1;");
const adminLogin = await request(identity, '/api/v1/auth/login', {
  method: 'POST', body: { email: admin.email, password },
});
check('PLANNING_ADMIN_PROMOTED_ON_ISOLATED_IDENTITY', adminLogin.status === 200 &&
  adminLogin.data?.user?.role === 'Admin');
const template = {
  code: 'QA-PLANNING-' + randomUUID().replaceAll('-', '').slice(0, 12),
  title: 'Synthetic seven-day challenge QA', description: 'Test fixtures only',
  dailyTitles: Array.from({ length: 7 }, (_, i) => 'QA Day ' + (i + 1)),
};
const adminRoute = root + '/admin/challenge-templates';
check('PLANNING_TEMPLATE_MEMBER_FORBIDDEN', (await request(planning, adminRoute,
  { method: 'POST', token: a.accessToken, body: template })).status === 403);
const created = await request(planning, adminRoute, {
  method: 'POST', token: adminLogin.data.accessToken, body: template,
});
check('PLANNING_ADMIN_CREATES_TEMPLATE', created.status === 201 &&
  created.data?.durationDays === 7 && typeof created.data?.id === 'string');
const templateId = created.data.id;
const templates = await request(planning, root + '/challenges/templates', {
  token: b.accessToken,
});
check('PLANNING_MEMBER_READS_APPROVED_TEMPLATE', templates.status === 200 &&
  templates.data?.some?.(x => x.id === templateId));
const futureStart = '9999-12-31'; // Stable across local time zones and CI midnight.
check('PLANNING_REJECTS_FUTURE_START', (await request(planning, root + '/challenges', {
  method: 'POST', token: a.accessToken,
  body: { templateId, startDate: futureStart, timeZone: 'Asia/Ho_Chi_Minh' },
})).status === 400);
const start = await request(planning, root + '/challenges', {
  method: 'POST', token: a.accessToken,
  body: { templateId, timeZone: 'Asia/Ho_Chi_Minh' },
});
check('PLANNING_OWNER_STARTS_CHALLENGE', start.status === 201 &&
  start.data?.days?.length === 7 && start.data?.userId === a.userId);
const challengeId = start.data.id;
check('PLANNING_BLOCKS_SECOND_ACTIVE_CHALLENGE', (await request(planning,
  root + '/challenges', { method: 'POST', token: a.accessToken,
  body: { templateId, timeZone: 'Asia/Ho_Chi_Minh' } })).status === 409);
check('PLANNING_CROSS_USER_CHALLENGE_404', (await request(planning,
  root + '/challenges/' + challengeId, { token: b.accessToken })).status === 404);
const completeRoute = root + '/challenges/' + challengeId + '/days/1/complete';
const done = await request(planning, completeRoute,
  { method: 'POST', token: a.accessToken });
check('PLANNING_DAY1_COMPLETED', done.status === 200 && done.data?.days?.[0]?.isCompleted === true);
check('PLANNING_DAY1_IDEMPOTENT', (await request(planning, completeRoute,
  { method: 'POST', token: a.accessToken })).status === 200);
check('PLANNING_FUTURE_DAY_BLOCKED', (await request(planning,
  root + '/challenges/' + challengeId + '/days/2/complete',
  { method: 'POST', token: a.accessToken })).status === 409);
check('PLANNING_OTHER_USER_CANNOT_COMPLETE', (await request(planning,
  completeRoute, { method: 'POST', token: b.accessToken })).status === 404);
const sqlCount = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM [LongevityPlanningDb].[dbo].[UserChallenges] ' +
  "WHERE [Id]='" + challengeId + "' AND [UserId]='" + a.userId + "';");
check('PLANNING_CHALLENGE_OWNED_SQL', sqlCount.split(/\s+/).includes('1'));
const noUsers = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM [LongevityPlanningDb].sys.tables ' +
  "WHERE [name] IN ('Users','MealLogs','Foods','WorkerJobs');");
check('PLANNING_NO_FOREIGN_DOMAIN_TABLES', noUsers.split(/\s+/).includes('0'));
const outbox = sql('SET NOCOUNT ON; SELECT COUNT(*) FROM [LongevityPlanningDb].[dbo].[PlanningOutbox] ' +
  "WHERE [UserId]='" + a.userId + "' AND [EventType]='ChallengeDayCompleted.v1';");
check('PLANNING_OUTBOX_ATOMIC', outbox.split(/\s+/).includes('1'));
const redisIds = execFileSync('docker', ['ps', '-q', '--filter',
  'label=com.docker.compose.service=redis'], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
check('PLANNING_SINGLE_REDIS_QA', redisIds.length === 1);
let delivered = false;
for (let i = 0; i < 15; i++) {
  const stream = execFileSync('docker', ['exec', redisIds[0], 'redis-cli',
    'XREVRANGE', 'ldc:planning-events', '+', '-', 'COUNT', '300'], { encoding: 'utf8' });
  if (stream.includes(challengeId) && stream.includes('ChallengeDayCompleted.v1')) {
    delivered = true; break;
  }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
check('PLANNING_OUTBOX_PUBLISHED_REDIS', delivered);
console.log('PLANNING_TARGET_HTTP_SQL_REDIS=PASS checks=' + passed);
