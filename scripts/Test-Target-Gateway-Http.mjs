// Opt-in ADR-005 target YARP sidecar E2E: genuine JWT, REST owner routes and
// legacy OpenAPI fallback. Never run against a publicly reachable service.
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = 'http://127.0.0.1:18088';
const gatewayId = execFileSync('docker', [
  'ps', '-q', '--filter', 'label=com.docker.compose.service=gateway-target'
], { encoding: 'utf8' }).trim();
if (!gatewayId) throw new Error('Target Gateway QA sidecar not running');
const container = JSON.parse(execFileSync('docker', ['inspect', gatewayId],
  { encoding: 'utf8' }))[0];
if (process.env.GITHUB_ACTIONS !== 'true' &&
    container?.Config?.Labels?.['com.docker.compose.project'] !== 'prn232-acceptance')
  throw new Error('Refusing to use a non-isolated QA deployment');
let passed = 0;
function check(name, success) {
  if (!success) throw new Error('FAIL ' + name);
  passed++;
  console.log('PASS ' + name);
}
async function request(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(root + path, {
    method,
    headers: {
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000)
  });
  const payload = await response.text();
  let data;
  try { data = JSON.parse(payload); } catch { data = payload; }
  return { status: response.status, data, headers: response.headers };
}
let healthy = false;
for (let i = 0; i < 60; i++) {
  try { if ((await request('/gateway/target/ready')).status === 200) {
    healthy = true; break;
  } } catch {}
  await new Promise(resolve => setTimeout(resolve, 1000));
}
check('GATEWAY_TARGET_ALL_SIX_OWNERS_READY', healthy);
check('GATEWAY_TARGET_CURRENT_API_READY',
  (await request('/gateway/ready')).status === 200);
check('GATEWAY_TARGET_HEALTH',
  (await request('/gateway/health')).status === 200);
check('GATEWAY_TARGET_NO_OPEN_PROXY',
  (await request('/definitely-not-a-route')).status === 404);
check('GATEWAY_TARGET_UNAUTHORIZED_CATALOG',
  (await request('/api/v1/foods')).status === 401);
check('GATEWAY_TARGET_UNAUTHORIZED_PLANNING',
  (await request('/api/v1/meal-plans')).status === 401);
check('GATEWAY_TARGET_UNAUTHORIZED_TRACKING',
  (await request('/api/v1/meal-logs')).status === 401);
check('GATEWAY_TARGET_UNAUTHORIZED_RECOMMENDATION',
  (await request('/api/v1/recommendations/feedback')).status === 401);
check('GATEWAY_TARGET_UNAUTHORIZED_WORKER',
  (await request('/api/v1/admin/events')).status === 401);
const openapi = await request('/openapi/v1.json');
check('GATEWAY_TARGET_LEGACY_OPENAPI_FALLBACK',
  openapi.status === 200 &&
  typeof openapi.data?.openapi === 'string');

async function register(name) {
  const suffix = randomUUID().replaceAll('-', '');
  const response = await request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      displayName: 'Synthetic Target Gateway QA ' + name,
      email: 'gateway-target-qa-' + suffix + '@example.test',
      password: 'TargetGatewayQA@' + suffix,
    },
  });
  check('GATEWAY_TARGET_IDENTITY_REGISTER_' + name,
    response.status === 201 &&
    typeof response.data?.accessToken === 'string' &&
    typeof response.data?.user?.id === 'string');
  return { token: response.data.accessToken, userId: response.data.user.id };
}
const alice = await register('alice');
const bob = await register('bob');

const profile = await request('/api/v1/profile', { token: alice.token });
check('GATEWAY_TARGET_IDENTITY_PROFILE',
  profile.status === 200 && profile.data?.userId === alice.userId);

const foods = await request('/api/v1/foods', { token: alice.token });
check('GATEWAY_TARGET_CATALOG_FOODS',
  foods.status === 200 && foods.data !== null);
const recipes = await request('/api/v1/recipes', { token: alice.token });
check('GATEWAY_TARGET_CATALOG_RECIPES',
  recipes.status === 200 && recipes.data !== null);
const initialPref = await request('/api/v1/meal-plans/preferences',
  { token: alice.token });
check('GATEWAY_TARGET_PLANNING_PREFERENCES_INITIAL',
  initialPref.status === 404 || initialPref.status === 200);
const restriction = {
  dietaryPattern: 'PlantForward',
  allergies: ['PEANUT'],
  excludedFoods: ['SHELLFISH'],
  preferredCuisine: 'Synthetic QA cuisine',
};
const saved = await request('/api/v1/meal-plans/preferences',
  { token: alice.token, method: 'PUT', body: restriction });
check('GATEWAY_TARGET_PLANNING_PREFERENCES_WRITE',
  saved.status === 200 && saved.data?.dietaryPattern === 'PlantForward');
const readBack = await request('/api/v1/meal-plans/preferences',
  { token: alice.token });
check('GATEWAY_TARGET_PLANNING_PREFERENCES_READ',
  readBack.status === 200 &&
  readBack.data?.allergies?.includes('PEANUT'));
const bobPreference = await request('/api/v1/meal-plans/preferences',
  { token: bob.token });
check('GATEWAY_TARGET_PLANNING_NO_CROSS_USER_LEAK',
  bobPreference.status === 404);

const plans = await request('/api/v1/meal-plans', { token: alice.token });
check('GATEWAY_TARGET_PLANNING_LIST',
  plans.status === 200 && Array.isArray(plans.data?.items));
const activities = await request('/api/v1/activities', { token: alice.token });
check('GATEWAY_TARGET_TRACKING_ACTIVITIES',
  activities.status === 200 && Array.isArray(activities.data?.items));
const meals = await request('/api/v1/meal-logs', { token: alice.token });
check('GATEWAY_TARGET_TRACKING_MEAL_LOGS',
  meals.status === 200 && Array.isArray(meals.data));
const feedback = await request('/api/v1/recommendations/feedback',
  { token: alice.token });
check('GATEWAY_TARGET_RECOMMENDATION_FEEDBACK',
  feedback.status === 200 && Array.isArray(feedback.data));
const foodPreferences = await request('/api/v1/recommendations/food-preferences',
  { token: alice.token });
check('GATEWAY_TARGET_RECOMMENDATION_FOOD_PREFERENCES',
  foodPreferences.status === 200 && Array.isArray(foodPreferences.data));
const worker = await request('/api/v1/admin/events', { token: alice.token });
check('GATEWAY_TARGET_WORKER_ROLE_GUARD', worker.status === 403);
const jobs = await request('/api/v1/admin/jobs', { token: alice.token });
check('GATEWAY_TARGET_WORKER_JOBS_ROLE_GUARD', jobs.status === 403);
const anonymousProfile = await request('/api/v1/profile');
check('GATEWAY_TARGET_IDENTITY_PROFILE_AUTH', anonymousProfile.status === 401);
console.log('ADR005_TARGET_GATEWAY_SIX_SERVICES=PASS checks=' + passed);
