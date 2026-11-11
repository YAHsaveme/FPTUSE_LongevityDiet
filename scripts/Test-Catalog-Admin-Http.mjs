// Live synthetic-only Admin acceptance for the optional Catalog-owned database.
// Windows: use the isolated prn232-acceptance Compose project.
// GitHub Actions: its isolated ephemeral runner is allowed.
import { randomUUID } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const gateway = 'http://127.0.0.1:18080';
const catalog = 'http://127.0.0.1:18082';
let passed = 0;
function check(name, condition) {
  if (!condition) throw new Error('FAIL ' + name);
  console.log('PASS ' + name);
  passed++;
}
function sqlContainer() {
  const ids = execFileSync('docker', ['ps', '-q',
    '--filter', 'label=com.docker.compose.service=sqlserver'], { encoding: 'utf8' })
    .trim().split(/\s+/).filter(Boolean);
  if (ids.length !== 1) throw new Error('Exactly one isolated QA SQL container required.');
  const info = JSON.parse(execFileSync('docker', ['inspect', ids[0]], { encoding: 'utf8' }))[0];
  const project = info?.Config?.Labels?.['com.docker.compose.project'];
  if (!project || (process.env.GITHUB_ACTIONS !== 'true' && project !== 'prn232-acceptance')) {
    throw new Error('Refusing to promote any account outside isolated QA Compose.');
  }
  check('ISOLATED_QA_SQL_PROJECT', true);
  return ids[0];
}
const sqlId = sqlContainer();
function sql(statement) {
  const r = spawnSync('docker', [
    'exec', '-i', sqlId, 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W',
  ], { input: statement + '\nGO\n', encoding: 'utf8', timeout: 30000 });
  if (r.error || r.status !== 0) throw new Error('Isolated QA SQL statement failed: ' + (r.stderr ?? ''));
  return r.stdout.trim();
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
  return { status: response.status, headers: response.headers,
    data: contentType.includes('json') ? await response.json() : null };
}
async function register() {
  const id = randomUUID().replaceAll('-', '');
  const email = 'catalog-admin-qa-' + id + '@example.test';
  const password = 'QaCatalog!_A7_' + id;
  const result = await request(gateway + '/api/v1/auth/register', {
    method: 'POST', body: { email, password, displayName: 'Catalog synthetic Admin QA' },
  });
  check('SYNTHETIC_MEMBER_REGISTERED', result.status === 201 &&
    typeof result.data?.accessToken === 'string');
  return { email, password, memberToken: result.data.accessToken };
}
check('CATALOG_OWNED_DATABASE_READY', (await request(catalog + '/ready')).status === 200);
const account = await register();
const foodBody = { name: 'QA Catalog ' + randomUUID().slice(0, 8),
  category: 'Synthetic', calories: 72, proteinG: 4, carbohydrateG: 11,
  fatG: 2, isPlantBased: true };
const anonymous = await request(catalog + '/api/v1/admin/foods', {
  method: 'POST', body: foodBody,
});
check('CATALOG_ADMIN_ANONYMOUS_401', anonymous.status === 401);
const forbidden = await request(catalog + '/api/v1/admin/foods', {
  method: 'POST', token: account.memberToken, body: foodBody,
});
check('CATALOG_ADMIN_MEMBER_403', forbidden.status === 403);
if (!/^catalog-admin-qa-[0-9a-f]{32}@example\.test$/.test(account.email)) {
  throw new Error('Synthetic account guard failed');
}
sql("SET NOCOUNT ON;\nUPDATE [LongevityDietDb].[dbo].[Users] SET [Role]='Admin' " +
  "WHERE [Email]='" + account.email + "' AND [Role]='Member';\n" +
  "IF @@ROWCOUNT <> 1 THROW 51000, 'QA-only promotion failed', 1;");
const login = await request(gateway + '/api/v1/auth/login', {
  method: 'POST', body: { email: account.email, password: account.password },
});
check('PROMOTED_ADMIN_AUTHENTICATES', login.status === 200 &&
  typeof login.data?.accessToken === 'string');
const adminToken = login.data.accessToken;
const created = await request(catalog + '/api/v1/admin/foods', {
  method: 'POST', token: adminToken, body: foodBody,
});
const foodId = created.data?.id;
check('CATALOG_OWNER_CREATES_FOOD_201', created.status === 201 &&
  typeof foodId === 'string' && created.headers.get('location')?.endsWith(foodId));
const memberRead = await request(catalog + '/api/v1/foods/' + foodId, {
  token: account.memberToken,
});
check('CATALOG_MEMBER_SEES_ACTIVE_FOOD', memberRead.status === 200 &&
  memberRead.data?.calories === 72);
const updatedName = foodBody.name + ' Updated';
const update = await request(catalog + '/api/v1/admin/foods/' + foodId, {
  method: 'PUT', token: adminToken,
  body: { ...foodBody, name: updatedName, calories: 93 },
});
check('CATALOG_OWNER_UPDATES_FOOD_200', update.status === 200 &&
  update.data?.id === foodId && update.data?.calories === 93);
const updatedRead = await request(catalog + '/api/v1/foods/' + foodId, {
  token: account.memberToken,
});
check('CATALOG_MEMBER_READS_UPDATED_FOOD', updatedRead.status === 200 &&
  updatedRead.data?.name === updatedName && updatedRead.data?.calories === 93);
const invalid = await request(catalog + '/api/v1/admin/foods/' + foodId, {
  method: 'PUT', token: adminToken, body: { ...foodBody, calories: -1 },
});
check('CATALOG_OWNER_REJECTS_INVALID_UPDATE', invalid.status === 400);
const memberUpdate = await request(catalog + '/api/v1/admin/foods/' + foodId, {
  method: 'PUT', token: account.memberToken, body: foodBody,
});
check('CATALOG_MEMBER_UPDATE_FORBIDDEN', memberUpdate.status === 403);
const gone = await request(catalog + '/api/v1/admin/foods/' + foodId, {
  method: 'DELETE', token: adminToken,
});
check('CATALOG_OWNER_SOFT_DELETES_204', gone.status === 204);
const hidden = await request(catalog + '/api/v1/foods/' + foodId, { token: account.memberToken });
check('CATALOG_MEMBER_CANNOT_SEE_INACTIVE', hidden.status === 404);
const deletedAgain = await request(catalog + '/api/v1/admin/foods/' + foodId, {
  method: 'DELETE', token: adminToken,
});
check('CATALOG_DELETE_REPEAT_404', deletedAgain.status === 404);
if (!/^[0-9a-f-]{36}$/i.test(foodId)) throw new Error('QA food identifier invalid');
const persisted = sql("SET NOCOUNT ON; SELECT COUNT(*) AS Verified " +
  "FROM [LongevityCatalogDb].[catalog].[Foods] WHERE [Id]='" + foodId +
  "' AND [Calories]=93 AND [IsActive]=0;");
check('CATALOG_OWNED_DB_PERSISTED_INACTIVE_REVISION', persisted.split(/\s+/).includes('1'));
check('LEGACY_GATEWAY_STILL_READY', (await request(gateway + '/gateway/ready')).status === 200);
console.log('TARGET_CATALOG_ADMIN_CRUD=PASS checks=' + passed);
