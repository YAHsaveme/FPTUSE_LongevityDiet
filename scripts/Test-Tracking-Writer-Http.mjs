// Isolated integration acceptance for ADR-005 Tracking writer owner.
// This script creates synthetic accounts and events ONLY in QA Docker SQL.
import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const base = 'http://127.0.0.1:18084';
const identity = 'http://127.0.0.1:18081';
let passed = 0;
const check = (name, condition) => {
  if (!condition) throw new Error('FAIL ' + name);
  passed++;
  console.log('PASS ' + name);
};
const dockerService = (service) =>
  execFileSync('docker', ['ps', '-q', '--filter',
    'label=com.docker.compose.service=' + service], {
    encoding: 'utf8',
  }).trim().split(/\s+/).filter(Boolean);
const sqlIds = dockerService('sqlserver');
if (sqlIds.length !== 1) throw new Error('Exactly one QA SQL container required');
const sqlId = sqlIds[0];
const inspect = JSON.parse(execFileSync('docker', ['inspect', sqlId], {
  encoding: 'utf8',
}))[0];
if (inspect?.Config?.Labels?.['com.docker.compose.project'] !== 'prn232-acceptance' &&
    process.env.GITHUB_ACTIONS !== 'true')
  throw new Error('Refusing non-isolated QA Docker SQL');
check('TRACKING_ISOLATED_QA_DOCKER', true);
function sql(query) {
  const r = spawnSync('docker', ['exec', '-i', sqlId, 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W'],
  { input: query + '\nGO\n', encoding: 'utf8', timeout: 30000 });
  if (r.error || r.status !== 0) throw new Error('QA SQL error: ' + r.stderr);
  return r.stdout.trim();
}
async function send(path, { token, method = 'GET', body, toIdentity = false } = {}) {
  const r = await fetch((toIdentity ? identity : base) + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const raw = await r.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = raw; }
  return { status: r.status, data };
}
let ready = false;
for (let i = 0; i < 40; i++) {
  try { if ((await send('/ready')).status === 200) { ready = true; break; } }
  catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
check('TRACKING_SQL_READY', ready);
check('TRACKING_SCHEMA_MIGRATED', Number(sql('SET NOCOUNT ON; SELECT COUNT(*) FROM ' +
  '[LongevityTrackingDb].[dbo].[__EFMigrationsHistory];').split(/\s+/).find(x => /^\d+$/.test(x))) >= 3);
check('TRACKING_ANONYMOUS_401', (await send('/api/v1/activities')).status === 401);
const emailTag = randomUUID().replaceAll('-', '');
const password = 'QA-Tracking#0-' + emailTag;
async function register(tag) {
  const email = 'tracking-qa-' + tag + '-' + randomUUID().replaceAll('-', '') + '@example.test';
  const response = await send('/api/v1/auth/register', {
    toIdentity: true, method: 'POST',
    body: { email, displayName: 'Tracking synthetic QA', password },
  });
  check('TRACKING_IDENTITY_REGISTER_' + tag, response.status === 201 &&
    typeof response.data?.accessToken === 'string');
  return { token: response.data.accessToken, userId: response.data.user.id };
}
const a = await register('a');
const b = await register('b');
const root = '/api/v1';
const activities = root + '/activities';
check('TRACKING_AUTH_USER_EMPTY_ACTIVITIES',
  (await send(activities, { token: a.token })).data?.totalItems === 0);
check('TRACKING_JWT_TAMPER_REJECT',
  (await send(activities, { token: a.token + '.bad' })).status === 401);
check('TRACKING_INVALID_DURATION_REJECT',
  (await send(activities, { token: a.token, method: 'POST',
    body: { kind: 1, startedAt: new Date().toISOString(),
      durationMinutes: -1, note: 'Synthetic QA' } })).status === 400);
check('TRACKING_UNKNOWN_ACTIVITY_KIND_REJECT',
  (await send(activities, { token: a.token, method: 'POST',
    body: { kind: 999, startedAt: new Date().toISOString(),
      durationMinutes: 30, note: 'Synthetic QA' } })).status === 400);
const started = new Date(Date.now() - 3600000).toISOString();
const create = await send(activities, { token: a.token, method: 'POST',
  body: { kind: 1, startedAt: started, durationMinutes: 30, note: 'QA walking' } });
check('TRACKING_ACTIVITY_CREATED', create.status === 201 &&
  create.data?.durationMinutes === 30 && typeof create.data?.id === 'string');
const activityId = create.data.id;
check('TRACKING_USER_A_LIST_HAS_ACTIVITY',
  (await send(activities, { token: a.token })).data?.items?.some?.(
    x => x.id === activityId));
check('TRACKING_USER_B_NO_A_ACTIVITY',
  (await send(activities, { token: b.token })).data?.totalItems === 0);
check('TRACKING_OTHER_USER_CANNOT_UPDATE',
  (await send(activities + '/' + activityId, { method: 'PUT', token: b.token,
    body: { kind: 1, startedAt: started, durationMinutes: 45 } })).status === 404);
check('TRACKING_OTHER_USER_CANNOT_DELETE',
  (await send(activities + '/' + activityId, {
    method: 'DELETE', token: b.token })).status === 404);
const update = await send(activities + '/' + activityId, { token: a.token,
  method: 'PUT', body: { kind: 2, startedAt: started,
    durationMinutes: 45, note: 'Updated by owner' } });
check('TRACKING_OWNER_UPDATES_ACTIVITY', update.status === 200 &&
  update.data?.durationMinutes === 45);
check('TRACKING_BAD_PAGE_REJECT',
  (await send(activities + '?page=0', { token: a.token })).status === 400);
check('TRACKING_DAILY_SUMMARY_OWNER',
  (await send(activities + '/daily', { token: a.token })).status === 200);
check('TRACKING_WEEKLY_SUMMARY_OWNER',
  (await send(activities + '/summary', { token: a.token })).status === 200);
const goal = await send(activities + '/goal', { token: a.token });
check('TRACKING_DEFAULT_GOAL', goal.status === 200 &&
  goal.data?.weeklyMinutesTarget === 150);
check('TRACKING_REJECT_INVALID_GOAL',
  (await send(activities + '/goal', { method: 'PUT', token: a.token,
    body: { weeklyMinutesTarget: 0, weeklyStrengthSessionsTarget: 2 } })).status === 400);
check('TRACKING_SET_GOAL_OWNER',
  (await send(activities + '/goal', { method: 'PUT', token: a.token,
    body: { weeklyMinutesTarget: 210, weeklyStrengthSessionsTarget: 3 } })).data
    ?.weeklyMinutesTarget === 210);
check('TRACKING_GOAL_ISOLATED_FOR_USER_B',
  (await send(activities + '/goal', { token: b.token })).data
    ?.weeklyMinutesTarget === 150);
const score = await send(root + '/ldas/latest', { token: a.token });
check('TRACKING_LDAS_PARTIAL_NO_CROSS_SQL', score.status === 200 &&
  score.data?.isPartial === true && score.data?.missingData?.length > 0);
check('TRACKING_SCORE_HISTORY_OWNER',
  (await send(root + '/ldas/history', { token: a.token })).data?.items?.length >= 1);
check('TRACKING_FUTURE_SCORE_REJECT',
  (await send(root + '/ldas/9999-12-31', { token: a.token })).status === 400);
check('TRACKING_CROSS_DOMAIN_SQL_TABLES_ABSENT',
  sql('SET NOCOUNT ON; SELECT COUNT(*) FROM [LongevityTrackingDb].sys.tables ' +
    "WHERE [name] IN ('Users','Food','Foods','MealPlans','ReminderPreferences');")
    .split(/\s+/).includes('0'));
check('TRACKING_WRITTEN_IN_OWNED_SQL',
  sql('SET NOCOUNT ON; SELECT COUNT(*) FROM [LongevityTrackingDb].[dbo].[ActivityLogs] ' +
    "WHERE [UserId]='" + a.userId + "' AND [Id]='" + activityId + "' AND [DurationMinutes]=45;")
    .split(/\s+/).includes('1'));
check('TRACKING_SQL_OUTBOX_CREATED',
  sql('SET NOCOUNT ON; SELECT COUNT(*) FROM [LongevityTrackingDb].[dbo].[TrackingOutbox] ' +
    "WHERE [UserId]='" + a.userId + "' AND [EventType]='ActivityLogged.v1';")
    .split(/\s+/).includes('2'));
const redisIds = dockerService('redis');
check('TRACKING_ISOLATED_REDIS', redisIds.length === 1);
let published = false;
for (let i = 0; i < 20; i++) {
  const output = execFileSync('docker', ['exec', redisIds[0], 'redis-cli',
    'XREVRANGE', 'ldc:tracking-events', '+', '-', 'COUNT', '300'],
    { encoding: 'utf8' });
  if (output.includes(activityId) && output.includes('ActivityLogged.v1')) {
    published = true; break;
  }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
check('TRACKING_OUTBOX_REDIS_DELIVERY', published);
check('TRACKING_OWNER_SOFT_DELETE',
  (await send(activities + '/' + activityId, {
    method: 'DELETE', token: a.token })).status === 204);
check('TRACKING_DELETE_IDEMPOTENT_NOT_FOUND',
  (await send(activities + '/' + activityId, {
    method: 'DELETE', token: a.token })).status === 404);
check('TRACKING_DELETED_ACTIVITY_NOT_LISTED',
  (await send(activities, { token: a.token })).data?.totalItems === 0);
// Independent Tracking-owned meal logs and eating-window replay.
check('MEALLOG_ANONYMOUS_401',
  (await send(root + '/meal-logs')).status === 401);
check('MEALLOG_OTHER_USER_EMPTY',
  Array.isArray((await send(root + '/meal-logs', { token: b.token })).data));
const locale = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(new Date());
const numberPart = (kind) => locale.find(p => p.type === kind)?.value;
const ymd = [numberPart('year'), numberPart('month'), numberPart('day')].join('-');
const yesterday = new Date(Date.parse(ymd + 'T00:00:00Z') - 86400000)
  .toISOString().slice(0, 10);
const meal = (date, time, calories, name) => ({
  eatenAt: date + 'T' + time + ':00+07:00',
  mealType: 'Lunch', title: 'QA self-reported ' + name,
  notes: 'Unverified educational estimates, synthetic user',
  items: [{
    foodCode: 'QA-SAMPLE-1', foodName: 'QA synthetic rice and vegetables',
    servingAmount: 1, servingUnit: 'serving', caloriesKcal: calories,
    proteinGrams: 8, carbsGrams: 34, fatGrams: 4, fiberGrams: 4,
    isPlantBased: true,
  }],
});
const mealAInput = meal(yesterday, '10:00', 250, 'first');
check('MEALLOG_REJECT_IMPOSSIBLE_CALORIES',
  (await send(root + '/meal-logs', { token: a.token, method: 'POST',
    body: { ...mealAInput, items: [{
      ...mealAInput.items[0], caloriesKcal: 6000,
    }] } })).status === 400);
check('MEALLOG_REJECT_EMPTY_ITEMS',
  (await send(root + '/meal-logs', { token: a.token, method: 'POST',
    body: { ...mealAInput, items: [] } })).status === 400);
const mealA = await send(root + '/meal-logs', {
  token: a.token, method: 'POST', body: mealAInput,
});
check('MEALLOG_CREATED_ON_TRACKING_OWNER', mealA.status === 201 &&
  mealA.data?.totalCaloriesKcal === 250 &&
  mealA.data?.localDate === yesterday && mealA.data?.items?.length === 1);
const mealAId = mealA.data.id;
const mealB = await send(root + '/meal-logs', { token: a.token, method: 'POST',
  body: meal(yesterday, '17:00', 500, 'second') });
check('MEALLOG_SECOND_SAME_DAY', mealB.status === 201 &&
  mealB.data?.localDate === yesterday);
const mealBId = mealB.data.id;
const mealList = await send(root + '/meal-logs?fromDate=' + yesterday +
  '&toDate=' + yesterday, { token: a.token });
check('MEALLOG_OWNED_LIST_TWO', mealList.status === 200 &&
  mealList.data?.length === 2 && mealList.data.every(x => x.userId === a.userId));
check('MEALLOG_OTHER_USER_CANNOT_READ_A',
  (await send(root + '/meal-logs?fromDate=' + yesterday + '&toDate=' +
    yesterday, { token: b.token })).data?.length === 0);
check('MEALLOG_OTHER_USER_CANNOT_EDIT_A',
  (await send(root + '/meal-logs/' + mealAId, { token: b.token,
    method: 'PUT', body: mealAInput })).status === 404);
check('MEALLOG_OTHER_USER_CANNOT_DELETE_A',
  (await send(root + '/meal-logs/' + mealAId, { token: b.token,
    method: 'DELETE' })).status === 404);
const windowRoute = root + '/eating-window/summary?date=';
let window = await send(windowRoute + yesterday, { token: a.token });
check('EATING_WINDOW_RECALCULATES_TWO_MEALS', window.status === 200 &&
  window.data?.caloricMealCount === 2 &&
  window.data?.eatingWindowMinutes === 420 &&
  window.data?.totalCaloriesKcal === 750);
const beforeMove = await send(root + '/ldas/' + yesterday, { token: a.token });
check('LDAS_SCORES_TRACKING_OWNED_MEAL_SIGNALS', beforeMove.status === 200 &&
  beforeMove.data?.breakdown?.some?.(d => d.code === 'meals' && d.rawScore !== null) &&
  beforeMove.data?.breakdown?.some?.(d => d.code === 'eating_window' && d.rawScore !== null));
const moved = await send(root + '/meal-logs/' + mealBId, {
  token: a.token, method: 'PUT', body: meal(ymd, '00:15', 400, 'moved-date'),
});
check('MEALLOG_USER_CAN_MOVE_ACROSS_LOCAL_MIDNIGHT', moved.status === 200 &&
  moved.data?.localDate === ymd && moved.data?.totalCaloriesKcal === 400);
window = await send(windowRoute + yesterday, { token: a.token });
check('EATING_WINDOW_OLD_DAY_RECALCULATED', window.status === 200 &&
  window.data?.caloricMealCount === 1 && window.data?.statusCode === 'SingleMeal');
const newWindow = await send(windowRoute + ymd, { token: a.token });
check('EATING_WINDOW_NEW_LOCAL_DATE', newWindow.status === 200 &&
  newWindow.data?.caloricMealCount === 1 &&
  newWindow.data?.firstMealLocalTime?.startsWith('00:15'));
check('MEALLOG_OWNER_DELETES_FIRST', (await send(root + '/meal-logs/' +
  mealAId, { token: a.token, method: 'DELETE' })).status === 204);
const emptiedOld = await send(windowRoute + yesterday, { token: a.token });
check('EATING_WINDOW_EMPTY_AFTER_DELETE', emptiedOld.status === 200 &&
  emptiedOld.data?.statusCode === 'NoMeals' && emptiedOld.data?.caloricMealCount === 0 &&
  emptiedOld.data?.isWithinTargetWindow === true);
const clearedScore = await send(root + '/ldas/' + yesterday, { token: a.token });
check('LDAS_DELETED_MEALS_RESTORE_MISSINGNESS', clearedScore.status === 200 &&
  clearedScore.data?.missingData?.includes('meals'));
check('MEALLOG_OWNER_DELETES_SECOND', (await send(root + '/meal-logs/' +
  mealBId, { token: a.token, method: 'DELETE' })).status === 204);
check('MEALLOG_OTHER_USER_NO_LEAK_ON_WINDOW',
  (await send(windowRoute + yesterday, { token: b.token })).data?.caloricMealCount === 0);
check('MEALLOG_OWNED_SQL_TABLES_PRESENT', sql('SET NOCOUNT ON; SELECT COUNT(*) ' +
  'FROM [LongevityTrackingDb].sys.tables WHERE [name] IN ' +
  "('MealLogs','MealLogItems','EatingWindowSnapshots');")
  .split(/\s+/).includes('3'));
check('MEALLOG_SQL_TWO_SOFT_DELETED', sql('SET NOCOUNT ON; SELECT COUNT(*) ' +
  'FROM [LongevityTrackingDb].[dbo].[MealLogs] WHERE [UserId]=\'' +
  a.userId + "\' AND [IsDeleted]=1;").split(/\s+/).includes('2'));
check('MEALLOG_TRANSACTIONAL_OUTBOX_FOUR_EVENTS', sql('SET NOCOUNT ON; SELECT COUNT(*) ' +
  'FROM [LongevityTrackingDb].[dbo].[TrackingOutbox] WHERE [UserId]=\'' +
  a.userId + "\' AND [EventType]=\'MealLogChanged.v1\';")
  .split(/\s+/).includes('5'));
let mealPublished = false;
for (let i = 0; i < 15; i++) {
  const stream = execFileSync('docker', ['exec', redisIds[0], 'redis-cli',
    'XREVRANGE', 'ldc:tracking-events', '+', '-', 'COUNT', '300'],
    { encoding: 'utf8' });
  if (stream.includes(mealAId) && stream.includes('MealLogChanged.v1')) {
    mealPublished = true; break;
  }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
check('MEALLOG_CHANGED_V1_PUBLISHED_TO_TRACKING_STREAM', mealPublished);
console.log('TRACKING_OWNER_SQL_IDENTITY_REDIS=PASS checks=' + passed);
