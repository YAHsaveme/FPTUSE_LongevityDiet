// Read-only ADR-005 migration readiness report. PRIVATE QA ONLY.
// No production credentials, no source rows/PII and no writes or DDL.
// Approval of a real migration requires a separate audited export/import job.
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const strict = process.argv.includes('--strict');
const reportFlag = process.argv.find(x => x.startsWith('--output='));
const reportPath = resolve(reportFlag?.slice('--output='.length) ??
  '.local-backups/adr005-reconciliation-qa.json');

const ids = execFileSync('docker', ['ps', '-q',
  '--filter', 'label=com.docker.compose.service=sqlserver'],
  { encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
if (ids.length !== 1) throw new Error('Requires one isolated SQL QA container');
const inspect = JSON.parse(execFileSync('docker', ['inspect', ids[0]],
  { encoding: 'utf8' }))[0];
if (process.env.GITHUB_ACTIONS !== 'true' &&
    inspect?.Config?.Labels?.['com.docker.compose.project'] !== 'prn232-acceptance')
  throw new Error('Refusing to audit outside isolated PRN232 QA project');

function sql(command) {
  const result = spawnSync('docker', ['exec', '-i', ids[0], 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -h -1 -W'],
  {
    encoding: 'utf8',
    input: 'SET NOCOUNT ON;\n' + command + '\nGO\n',
    timeout: 30000,
  });
  if (result.error || result.status !== 0)
    throw new Error('Read-only QA SQL query failed: ' + (result.stderr || 'unknown'));
  return result.stdout.trim().split(/\r?\n/).map(x => x.trim())
    .filter(x => x && !x.startsWith('('));
}
const databases = {
  current: 'LongevityDietDb',
  identity: 'LongevityIdentityDb',
  catalog: 'LongevityCatalogDb',
  planning: 'LongevityPlanningDb',
  tracking: 'LongevityTrackingDb',
  recommendation: 'LongevityRecommendationDb',
  worker: 'LongevityWorkerDb',
};
const tableWhitelist = {
  current: ['Users','Foods','Recipes','MealPlans','MealLogs','ActivityLogs',
    'RecommendationFeedbacks','WorkerJobs','WeeklyReports','NotificationPreferences'],
  identity: ['Users','UserProfiles','RefreshTokens'],
  catalog: ['Foods','Recipes','DietRules','DietRuleVersions'],
  planning: ['MealPlans','MealPlanDays','PlannedMeals','UserDietaryPreferences','UserChallenges'],
  tracking: ['MealLogs','MealLogItems','ActivityLogs','Activities','AdherenceScores'],
  recommendation: ['RecommendationFeedbacks','UserFoodPreferences'],
  worker: ['ReminderSchedules','ReminderDispatchRecords','WorkerReceivedEvents',
    'WorkerEventDeadLetters','WorkerOutbox'],
};
const available = new Set(sql(
  'SELECT [name] FROM [master].sys.databases WHERE [name] LIKE N\'Longevity%\';'));
const report = {
  schemaVersion: 1,
  auditType: 'isolated_qa_read_only',
  recordedAtUtc: new Date().toISOString(),
  usesProductionData: false,
  data: {},
  requirements: {
    backupsVerified: false,
    sourceToTargetStableIdentifiersVerified: false,
    passwordAndRefreshTokenMigrationReviewed: false,
    concurrentWritesQuiescedOrCdcValidated: false,
    replayAndCrossServiceReconciliationProved: false,
    rollbackRehearsed: false,
    externalHttps443Certified: false,
    productionOwnerApproval: false,
    reviewerSignoff: false,
  },
  blockers: []
};
for (const [owner, database] of Object.entries(databases)) {
  if (!available.has(database)) {
    report.data[owner] = { database, exists: false, tables: {} };
    report.blockers.push('missing_database:' + owner);
    continue;
  }
  const tableNames = sql(
    'SELECT [TABLE_SCHEMA]+N\'.\'+[TABLE_NAME] FROM [' + database +
    '].INFORMATION_SCHEMA.TABLES WHERE [TABLE_TYPE]=N\'BASE TABLE\';');
  const namesByLower = new Map(tableNames.map(name =>
    [name.split('.').at(-1).toLowerCase(), name]));
  const tables = {};
  for (const table of tableWhitelist[owner]) {
    const physical = namesByLower.get(table.toLowerCase());
    if (!physical) {
      tables[table] = { exists: false, count: null };
      continue;
    }
    // Whitelisted SQL identifiers only, sourced from INFORMATION_SCHEMA.
    if (!/^[A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*$/.test(physical))
      throw new Error('Unexpected physical table name');
    const qualified = '[' + database + '].' + physical.split('.')
      .map(value => '[' + value + ']').join('.');
    const raw = sql('SELECT COUNT_BIG(*) FROM ' + qualified + ';');
    const count = raw.find(x => /^\d+$/.test(x));
    if (count === undefined)
      throw new Error('Could not count a whitelisted table in ' + database);
    tables[table] = { exists: true, count: Number(count) };
  }
  report.data[owner] = { database, exists: true, tables };
}
if (!Object.values(report.data).every(value => value.exists))
  report.blockers.push('owner_db_incomplete');

const source = report.data.current?.tables ?? {};
for (const [domain, pairs] of [
  ['identity', [['Users','Users']]],
  ['catalog', [['Foods','Foods'],['Recipes','Recipes']]],
  ['planning', [['MealPlans','MealPlans']]],
  ['tracking', [['MealLogs','MealLogs'], ['ActivityLogs','ActivityLogs']]],
  ['recommendation', [['RecommendationFeedbacks','RecommendationFeedbacks']]],
]) {
  for (const [legacyName, ownerName] of pairs) {
    const s = source[legacyName];
    const t = report.data[domain]?.tables?.[ownerName];
    if (s?.exists && s.count > 0) {
      report.blockers.push('unreconciled_' + domain + '_' + legacyName);
      if (!t?.exists)
        report.blockers.push('target_table_missing_' + domain + '_' + ownerName);
      else if (t.count !== s.count)
        report.blockers.push('row_count_mismatch_' + domain + '_' + legacyName);
    }
  }
}
// A count match never proves UUID equivalence or absence of lost updates.
report.blockers.push('identity_level_migration_reconciliation_not_performed');
report.blockers.push('no_production_backup_and_cutover_approval');
report.blockers = [...new Set(report.blockers)].sort();
report.readiness = report.blockers.length === 0 ? 'ready' : 'blocked';
report.note = 'Counts are QA-only observations, not proof of record equality. ' +
  'Historical export/import, invariants, credentials and rollback need authorized human review.';
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log('ADR005_CUTOVER_PREFLIGHT=' + report.readiness.toUpperCase());
console.log('qaDatabases=' + Object.values(report.data).filter(x => x.exists).length +
  ' missingDatabases=' + Object.values(report.data).filter(x => !x.exists).length);
console.log('blockers=' + report.blockers.length);
for (const blocker of report.blockers) console.log('BLOCKED ' + blocker);
console.log('evidencePath=' + reportPath);
if (strict && report.readiness !== 'ready') process.exitCode = 2;
