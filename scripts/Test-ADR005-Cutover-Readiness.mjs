// Regression for the non-destructive ADR-005 migration gate.
// The preflight MUST remain blocked until historical IDs/permissions and
// production backups are reviewed; a green CI means the guard worked.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let checked = 0;
function expect(label, ok) {
  if (!ok) throw new Error('FAIL ' + label);
  checked++;
  console.log('PASS ' + label);
}
const output = resolve('.local-backups/adr005-cutover-preflight-ci.json');
const runner = spawnSync(process.execPath, [
  resolve('scripts/Audit-ADR005-Cutover-Readiness.mjs'),
  '--strict', '--output=' + output
], { encoding: 'utf8', timeout: 60000 });
if (runner.error) throw runner.error;
expect('CUTOVER_STRICT_FAILS_CLOSED',
  runner.status === 2 && runner.stdout.includes('ADR005_CUTOVER_PREFLIGHT=BLOCKED'));
const report = JSON.parse(readFileSync(output, 'utf8'));
expect('CUTOVER_REVIEW_FLAG_REMAINS_BLOCKED', report.readiness === 'blocked');
expect('CUTOVER_PRIVATE_QA_ONLY', report.usesProductionData === false &&
  report.auditType === 'isolated_qa_read_only');
expect('CUTOVER_ALL_SIX_OWNER_DATABASES_PRESENT',
  ['identity','catalog','planning','tracking','recommendation','worker']
    .every(name => report.data[name]?.exists === true));
expect('CUTOVER_SOURCE_DATABASE_PRESENT', report.data.current?.exists === true);
expect('CUTOVER_SOURCE_DATA_OBSERVED',
  report.data.current?.tables?.Users?.exists === true &&
  report.data.current.tables.Users.count > 0);
expect('CUTOVER_IDENTITY_RECONCILIATION_REQUIRED',
  report.blockers.includes('identity_level_migration_reconciliation_not_performed'));
expect('CUTOVER_BACKUP_ROLLBACK_REQUIRED',
  report.requirements.backupsVerified === false &&
  report.requirements.rollbackRehearsed === false &&
  report.requirements.productionOwnerApproval === false);
expect('CUTOVER_NO_PII_EXPORTED',
  !/emailAddress|passwordHash|refreshTokenSecret|fullName|addressLine/i
    .test(JSON.stringify(report)));
expect('CUTOVER_NO_UNVERIFIED_CUTOVER_RECOMMENDATION',
  report.blockers.length > 0 &&
  !Object.values(report.requirements).some(value => value === true));
console.log('ADR005_CUTOVER_GUARD=PASS checks=' + checked);
