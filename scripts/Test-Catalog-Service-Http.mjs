import { randomUUID } from 'node:crypto';

// Synthetic accounts only; loopback QA endpoints. No credentials in logs.
const identity = 'http://127.0.0.1:18080';
const catalog = 'http://127.0.0.1:18082';
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
  const ct = response.headers.get('content-type') ?? '';
  const payload = ct.includes('json') ? await response.json() : null;
  return { response, payload };
}
const suffix = randomUUID().replaceAll('-', '');
const live = await request(catalog + '/health');
const ready = await request(catalog + '/ready');
check('CATALOG_LIVENESS', live.response.status === 200);
check('CATALOG_OWN_DB_READINESS', ready.response.status === 200 &&
  ready.payload?.database === 'LongevityCatalogDb');
const anon = await request(catalog + '/api/v1/foods');
check('CATALOG_JWT_REQUIRED', anon.response.status === 401);
const register = await request(identity + '/api/v1/auth/register', {
  method: 'POST',
  body: {
    email: 'catalog-ci-' + suffix + '@example.test',
    password: 'QaCatalog!_A7_' + suffix,
    displayName: 'Catalog CI synthetic user',
  },
});
const token = register.payload?.accessToken;
check('JWT_REGISTER_VIA_GATEWAY', register.response.status === 201 &&
  typeof token === 'string' && token.length > 0);
const foods = await request(catalog + '/api/v1/foods?page=1&pageSize=20', { token });
check('CATALOG_OWNED_FOOD_SEED', foods.response.status === 200 &&
  foods.payload?.totalItems === 4 && foods.payload.items.length === 4);
const recipes = await request(catalog + '/api/v1/recipes', { token });
check('CATALOG_OWNED_RECIPE_SEED', recipes.response.status === 200 &&
  recipes.payload?.totalItems === 2);
const rules = await request(catalog + '/api/v1/diet-rules', { token });
check('CATALOG_OWNED_RULE_SEED', rules.response.status === 200 &&
  Array.isArray(rules.payload) && rules.payload.length === 2);
const page = await request(catalog + '/api/v1/foods?page=1&pageSize=1&sortBy=calories&sortDirection=desc', { token });
check('CATALOG_SORT_PAGINATION', page.response.status === 200 &&
  page.payload?.totalPages === 4 && page.payload.items.length === 1);
const invalid = await request(catalog + '/api/v1/foods?pageSize=101', { token });
check('CATALOG_INPUT_GUARD', invalid.response.status === 400);
const denied = await request(catalog + '/api/v1/admin/foods', {
  token, method: 'POST',
  body: { name: 'Not permitted', category: 'QA', calories: 1, proteinG: 0, carbohydrateG: 0, fatG: 0, isPlantBased: true },
});
check('CATALOG_ADMIN_ROLE_FORBIDDEN', denied.response.status === 403);
const legacy = await request(identity + '/gateway/ready');
check('LEGACY_GATEWAY_STILL_READY', legacy.response.status === 200);
console.log('TARGET_CATALOG_HTTP_SMOKE=PASS checks=' + passed);
