// Safe ephemeral isolated QA for optional ADR-005 Recommendation owned SQL/gRPC.
// Uses synthetic @example.test accounts in local QA SQL only.
import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import http2 from 'node:http2';

const base = 'http://127.0.0.1:18087';
const identity = 'http://127.0.0.1:18081';
let passes = 0;
const check = (name, ok) => {
  if (!ok) throw new Error('FAIL ' + name);
  console.log('PASS ' + name);
  passes++;
};
const dockerId = service => execFileSync('docker', [
  'ps', '-q', '--filter', 'label=com.docker.compose.service=' + service,
], { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
const sqlIds = dockerId('sqlserver');
if (sqlIds.length !== 1) throw new Error('Expected one QA SQL Server container');
const sqlId = sqlIds[0];
const inspect = JSON.parse(execFileSync('docker', ['inspect', sqlId],
  { encoding: 'utf8' }))[0];
if (inspect?.Config?.Labels?.['com.docker.compose.project'] !== 'prn232-acceptance' &&
    process.env.GITHUB_ACTIONS !== 'true')
  throw new Error('Refusing to run with nonisolated Docker SQL');
check('RECOMMENDATION_SAFE_QA_PROJECT', true);
function sql(statement) {
  const r = spawnSync('docker', ['exec', '-i', sqlId, 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W'],
  { encoding: 'utf8', timeout: 30000, input: statement + '\nGO\n' });
  if (r.error || r.status !== 0)
    throw new Error('QA SQL command failed: ' + r.stderr);
  return r.stdout.trim();
}
async function request(path, { token, method = 'GET', body, useIdentity = false } = {}) {
  const response = await fetch((useIdentity ? identity : base) + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  let value;
  try { value = JSON.parse(raw); } catch { value = raw; }
  return { status: response.status, value };
}
async function grpcCoach() {
  const client = http2.connect('http://127.0.0.1:18085');
  return await new Promise((resolve, reject) => {
    const fail = error => { client.close(); reject(error); };
    client.once('error', fail);
    const req = client.request({
      ':path': '/longevity.recommendation.v1.ActivityCoach/Recommend',
      ':method': 'POST', 'content-type': 'application/grpc', te: 'trailers',
    });
    const pieces = [];
    let trailers = {};
    req.on('data', chunk => pieces.push(chunk));
    req.on('trailers', value => { trailers = value; });
    req.on('error', fail);
    req.on('end', () => {
      const response = Buffer.concat(pieces);
      client.close();
      resolve({ status: trailers['grpc-status'], response });
    });
    const proto = Buffer.from([
      0x08, 0x64,             // completed minutes = 100
      0x10, 0x96, 0x01,       // weekly goal = 150
      0x18, 0x01,             // completed strength = 1
      0x20, 0x02,             // weekly strength goal = 2
    ]);
    const frame = Buffer.alloc(5 + proto.length);
    frame.writeUInt8(0, 0);
    frame.writeUInt32BE(proto.length, 1);
    proto.copy(frame, 5);
    req.end(frame);
  });
}
let ready = false;
for (let i = 0; i < 40; i++) {
  try { if ((await request('/ready')).status === 200) { ready = true; break; } }
  catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
check('RECOMMENDATION_OWNER_SQL_READY', ready);
check('RECOMMENDATION_EF_MIGRATION', Number(sql('SET NOCOUNT ON; SELECT COUNT(*) ' +
  'FROM [LongevityRecommendationDb].[dbo].[__EFMigrationsHistory];')
  .split(/\s+/).find(x => /^\d+$/.test(x))) >= 1);
const rpc = await grpcCoach();
check('RECOMMENDATION_OWNER_GRPC_HTTP2', rpc.status === '0' &&
  rpc.response.length > 8 &&
  rpc.response.includes(Buffer.from('both_remaining', 'utf8')));
check('RECOMMENDATION_ANONYMOUS_FEEDBACK_401',
  (await request('/api/v1/recommendations/feedback')).status === 401);
const password = 'QARec#' + randomUUID().replaceAll('-', '');
async function register(tag) {
  const email = 'recommendation-qa-' + tag + '-' +
    randomUUID().replaceAll('-', '') + '@example.test';
  const result = await request('/api/v1/auth/register', {
    useIdentity: true, method: 'POST',
    body: { displayName: 'Recommendation synthetic QA', email, password },
  });
  check('RECOMMENDATION_IDENTITY_REGISTER_' + tag,
    result.status === 201 && typeof result.value?.accessToken === 'string');
  return { token: result.value.accessToken, userId: result.value.user.id };
}
const a = await register('a');
const b = await register('b');
const root = '/api/v1/recommendations';
const feedback = root + '/feedback';
const prefs = root + '/food-preferences';
const fbId = randomUUID();
const body = {
  requestId: fbId, candidateCode: 'QA-RICE-001',
  candidateTitle: 'Synthetic brown rice with vegetables',
  feedbackType: 'Dislike', reasonCode: 'PREFERENCE_ONLY',
  notes: 'Synthetic QA — not a medical exclusion.',
  ruleSetVersion: 'QA-RULES-1', weightProfileVersion: 'QA-WEIGHTS-1',
};
check('RECOMMENDATION_INVALID_FEEDBACK_400',
  (await request(feedback, { token: a.token, method: 'POST',
    body: { ...body, candidateCode: '' } })).status === 400);
const submitted = await request(feedback, {
  token: a.token, method: 'POST', body,
});
check('RECOMMENDATION_FEEDBACK_WRITTEN_IN_OWNER_SQL',
  submitted.status === 201 && submitted.value?.id === fbId &&
  submitted.value?.feedbackType === 'Dislike');
check('RECOMMENDATION_IDEMPOTENT_FEEDBACK_REQUEST',
  (await request(feedback, { token: a.token, method: 'POST', body })).status === 200);
check('RECOMMENDATION_REJECT_CONFLICTING_REUSE_OF_ID',
  (await request(feedback, { token: b.token, method: 'POST',
    body })).status === 409);
check('RECOMMENDATION_USER_B_HAS_NO_A_FEEDBACK',
  (await request(feedback, { token: b.token })).value?.length === 0);
check('RECOMMENDATION_USER_A_CAN_READ_OWN_FEEDBACK',
  (await request(feedback, { token: a.token })).value?.some?.(x => x.id === fbId));
check('RECOMMENDATION_DISLIKE_DOES_NOT_AUTO_EXCLUDE',
  (await request(prefs, { token: a.token })).value?.length === 0);
const prefPath = prefs + '/QA-RICE-001';
const dislike = await request(prefPath, {
  token: a.token, method: 'PUT',
  body: { displayLabel: 'Brown rice QA', preferenceKind: 'Disliked' },
});
check('RECOMMENDATION_MEMBER_SETS_DISLIKE',
  dislike.status === 200 && dislike.value?.preferenceKind === 'Disliked');
check('RECOMMENDATION_DISLIKED_IS_NOT_EXCLUSION',
  (await request(prefs, { token: a.token })).value?.[0]?.preferenceKind === 'Disliked');
check('RECOMMENDATION_OTHER_USER_PREF_EMPTY',
  (await request(prefs, { token: b.token })).value?.length === 0);
check('RECOMMENDATION_INVALID_FOOD_TOKEN_400',
  (await request(prefs + '/UNSAFE,FOOD', { token: a.token, method: 'PUT',
    body: { displayLabel: 'bad', preferenceKind: 'Preferred' } })).status === 400);
const explicit = await request(prefPath, { token: a.token, method: 'PUT',
  body: { displayLabel: 'Brown rice QA', preferenceKind: 'ExplicitExclusion' } });
check('RECOMMENDATION_EXPLICIT_EXCLUSION_REQUIRES_REQUEST',
  explicit.status === 200 && explicit.value?.preferenceKind === 'ExplicitExclusion');
check('RECOMMENDATION_USER_B_CANNOT_DELETE_A_PREF',
  (await request(prefPath, { token: b.token, method: 'DELETE' })).status === 404);
check('RECOMMENDATION_OWNER_CAN_DELETE_PREF',
  (await request(prefPath, { token: a.token, method: 'DELETE' })).status === 204);
check('RECOMMENDATION_PREF_DELETED',
  (await request(prefs, { token: a.token })).value?.length === 0);
check('RECOMMENDATION_DB_HAS_NO_FOREIGN_DOMAIN_TABLES',
  sql('SET NOCOUNT ON; SELECT COUNT(*) FROM [LongevityRecommendationDb].sys.tables ' +
    "WHERE [name] IN ('Users','MealPlans','MealLogs','Foods','WorkerJobs');")
    .split(/\s+/).includes('0'));
check('RECOMMENDATION_FEEDBACK_SINGLE_ROW_IDEMPOTENT',
  sql('SET NOCOUNT ON; SELECT COUNT(*) FROM ' +
    '[LongevityRecommendationDb].[dbo].[RecommendationFeedbacks] WHERE [Id]=\'' +
    fbId + "';").split(/\s+/).includes('1'));
check('RECOMMENDATION_OUTBOX_VERSIONED_EVENTS',
  sql('SET NOCOUNT ON; SELECT COUNT(*) FROM ' +
    '[LongevityRecommendationDb].[dbo].[RecommendationOutbox] WHERE [UserId]=\'' +
    a.userId + "';").split(/\s+/).includes('4'));
const redisIds = dockerId('redis');
check('RECOMMENDATION_ISOLATED_REDIS', redisIds.length === 1);
let published = false;
for (let i = 0; i < 20; i++) {
  const data = execFileSync('docker', ['exec', redisIds[0],
    'redis-cli', 'XREVRANGE', 'ldc:recommendation-events', '+', '-',
    'COUNT', '300'], { encoding: 'utf8' });
  if (data.includes(fbId) && data.includes('RecommendationFeedbackSubmitted.v1') &&
      data.includes('UserFoodPreferenceChanged.v1')) { published = true; break; }
  await new Promise(resolve => setTimeout(resolve, 1000));
}
check('RECOMMENDATION_SQL_OUTBOX_REDIS_PUBLISHED', published);
console.log('RECOMMENDATION_OWNER_SQL_GRPC_REDIS=PASS checks=' + passes);
