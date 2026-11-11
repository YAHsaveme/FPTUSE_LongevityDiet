import { randomUUID } from 'node:crypto';

const identity = 'http://127.0.0.1:18080';
const tracking = 'http://127.0.0.1:18084';
let passed = 0;
function check(name, ok) {
  if (!ok) throw new Error('FAIL ' + name);
  console.log('PASS ' + name);
  passed++;
}
async function request(url, { token, method = 'GET', body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('json') ? await response.json() : null;
  return { response, payload };
}
async function register() {
  const id = randomUUID().replaceAll('-', '');
  const r = await request(identity + '/api/v1/auth/register', {
    method: 'POST',
    body: { email: 'tracking-ci-' + id + '@example.test',
      password: 'QaTracking!_A7_' + id, displayName: 'Tracking QA synthetic user' },
  });
  check('QA_MEMBER_REGISTERED', r.response.status === 201 &&
    typeof r.payload?.accessToken === 'string');
  return r.payload.accessToken;
}
const ready = await request(tracking + '/ready');
check('TRACKING_OWNED_SQL_READINESS', ready.response.status === 200 &&
  ready.payload?.database === 'LongevityTrackingDb');
const anon = await request(tracking + '/api/v1/activities');
check('TRACKING_JWT_REQUIRED', anon.response.status === 401);
const a = await register();
const b = await register();
const profile = await request(identity + '/api/v1/profile', {
  method: 'PUT', token: a,
  body: { displayName: 'Tracking synthetic', birthYear: 1996,
    timeZone: 'Asia/Ho_Chi_Minh', wakeTime: '06:30:00', sleepTime: '23:00:00',
    preferredMealFrequency: 3, foodPreference: 'Plant forward' },
});
check('IDENTITY_PROFILE_PREPARED', profile.response.status === 200 &&
  profile.payload?.profileCompleted === true);
const create = await request(identity + '/api/v1/activities', {
  method: 'POST', token: a,
  body: { kind: 1, durationMinutes: 35, startedAt: new Date(Date.now() - 120000).toISOString(),
    note: 'Synthetic tracking read-model QA' },
});
check('LEGACY_ACTIVITY_OWNER_WRITES_TRACKING_DB', create.response.status === 201 &&
  typeof create.payload?.id === 'string');
const activityId = create.payload.id;
const listA = await request(tracking + '/api/v1/activities?page=1&pageSize=20', { token: a });
check('TRACKING_REST_OWNED_DB_READS_LEGACY_DATA', listA.response.status === 200 &&
  listA.payload?.totalItems >= 1 &&
  listA.payload.items.some(item => item.id === activityId));
const detailA = await request(tracking + '/api/v1/activities/' + activityId, { token: a });
check('TRACKING_ACTIVITY_DETAIL_OWNER', detailA.response.status === 200 &&
  detailA.payload?.id === activityId);
const listB = await request(tracking + '/api/v1/activities?page=1&pageSize=20', { token: b });
check('TRACKING_ISOLATED_OTHER_MEMBER', listB.response.status === 200 &&
  listB.payload?.totalItems === 0);
const detailB = await request(tracking + '/api/v1/activities/' + activityId, { token: b });
check('TRACKING_IDOR_BLOCKED', detailB.response.status === 404);
const latest = await request(tracking + '/api/v1/ldas/latest', { token: a });
check('TRACKING_READ_PERSISTED_LDAS_SNAPSHOT', latest.response.status === 200 &&
  typeof latest.payload?.coveragePercent === 'number' &&
  latest.payload?.version === 'ldas-v1');
const noScore = await request(tracking + '/api/v1/ldas/latest', { token: b });
check('TRACKING_NO_FABRICATED_SCORE', noScore.response.status === 404);
const badPage = await request(tracking + '/api/v1/activities?pageSize=101', { token: a });
check('TRACKING_INPUT_VALIDATION', badPage.response.status === 400);
const disabledMutation = await request(tracking + '/api/v1/activities', {
  method: 'POST', token: a, body: { kind: 1, durationMinutes: 5, startedAt: new Date().toISOString() },
});
check('TRACKING_DOES_NOT_BYPASS_OWNER_SCORE_EVENTS', disabledMutation.response.status === 405);
const legacyReady = await request(identity + '/gateway/ready');
check('GATEWAY_STILL_READY', legacyReady.response.status === 200);
console.log('TARGET_TRACKING_READ_HTTP_SMOKE=PASS checks=' + passed);
