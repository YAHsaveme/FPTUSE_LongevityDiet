'use strict';
// SQL-grounded official ERD verification (read-only, isolated QA / GitHub Actions).
// Compare every physically created owner table and local FK with the published
// diagrams.net source; includes EF Core implicit RuleSetVersionItems join table.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function run(args,input=''){
 const r=spawnSync('docker',args,{encoding:'utf8',input,timeout:30000});
 if(r.error||r.status!==0)
  throw Error('Docker command failed: '+args.slice(0,3).join(' ')+
    '\n'+String(r.stderr).slice(0,260));
 return r.stdout;
}
const ids=run(['ps','-q','--filter','label=com.docker.compose.service=sqlserver'])
 .trim().split(/\s+/).filter(Boolean);
assert.equal(ids.length,1,'Need ONE QA SQL Server container, not a shared production DB.');
const sqlId=ids[0],details=JSON.parse(run(['inspect',sqlId]))[0];
assert.ok(process.env.GITHUB_ACTIONS==='true' ||
 details.Config.Labels['com.docker.compose.project']==='prn232-acceptance',
 'Refusing to inspect non-QA SQL service');
function query(db,statement){
 const q='USE ['+db+'];\nSET NOCOUNT ON;\n'+statement+'\nGO\n';
 return run(['exec','-i',sqlId,'sh','-lc',
  '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -W -h -1 -b'],q)
  .split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('Changed database context'));
}
const sources={
 'identity':{
 db:'LongevityIdentityDb',
 fks:['RefreshTokens>Users','ReminderPreferences>Users',
  'UserNotifications>Users','UserProfiles>Users'],
 },
 'catalog':{
 db:'LongevityCatalogDb',
 fks:['RecipeAllergens>Allergens','RecipeAllergens>Recipes',
  'RecipeIngredients>Foods','RecipeIngredients>Recipes',
  'RuleAudits>RuleVersions','RuleSetVersionItems>RuleSetVersions',
  'RuleSetVersionItems>RuleVersions','RuleVersions>DietRules']
 },
 'planning':{
 db:'LongevityPlanningDb',
 fks:['ChallengeDayTemplates>ChallengeTemplates',
 'FmdCycleDays>FmdCycles','MealPlanDays>MealPlans',
 'PlannedMeals>MealPlanDays','UserChallengeDays>UserChallenges',
 'UserChallenges>ChallengeTemplates']
 },
 'tracking':{
 db:'LongevityTrackingDb',
 fks:['MealLogItems>MealLogs','ScoreDimensions>AdherenceScores']
 },
 'recommendation':{db:'LongevityRecommendationDb',fks:[]},
 'worker':{db:'LongevityWorkerDb',fks:[]}
};
const xml=fs.readFileSync(path.join(root,'docs','assignment','one-page','Database Diagram.drawio'),'utf8');
const report=[];
for(const [owner,{db,fks}] of Object.entries(sources)){
 const actualTables=query(db,
  "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "+
  "WHERE TABLE_TYPE='BASE TABLE' AND TABLE_NAME <> '__EFMigrationsHistory' "+
  "ORDER BY TABLE_NAME;");
 const rx=new RegExp('id="tbl-'+owner+'-\\d+" value="([^"]+)"','g');
 const drawnTables=[...xml.matchAll(rx)].map(x=>x[1]).sort();
 assert.deepEqual(drawnTables,actualTables,
   owner+': drawing has missing/extra/incorrect physical SQL table names');
 const actualFks=query(db,
  "SELECT CONCAT(OBJECT_NAME(parent_object_id),'>',OBJECT_NAME(referenced_object_id)) "+
  "FROM sys.foreign_keys ORDER BY parent_object_id, referenced_object_id;").sort();
 assert.deepEqual(actualFks,fks.slice().sort(),
   owner+': expected FK list does not match actual physical SQL FKs');
 const rawFkCaption=xml.match(new RegExp('id="fk-'+owner+'" value="([^"]*)"'))?.[1]||'';
 // Every SQL FK pair must be explicitly named in the same owner's ERD panel.
 for(const relation of fks){
  const [child,parent]=relation.split('>');
  assert.ok(rawFkCaption.includes(child+' → '+parent),
    owner+': undocumented physical SQL FK '+relation);
 }
 // Draw.io arrows are authoritative, not a prose-only FK ledger. Check every
 // native source/target against the REAL SQL sys.foreign_keys inventory.
 const cellNames=new Map([...xml.matchAll(/<mxCell id="(tbl-[a-z]+-[0-9]+)" value="([^"]+)"/g)]
  .map(match=>[match[1],match[2]]));
 const nativeFks=[...xml.matchAll(/<mxCell id="edge-fk-([a-z]+)-([0-9]+)"[^>]*source="([^"]+)" target="([^"]+)"/g)]
  .filter(match=>match[1]===owner)
  .map(match=>{
   const child=cellNames.get(match[3]),parent=cellNames.get(match[4]);
   assert.ok(child&&parent,owner+': native FK endpoint not a physical table');
   return child+'>'+parent;
  }).sort();
 assert.deepEqual(nativeFks,actualFks,
  owner+': native child->parent FK arrows mismatch REAL SQL relationships');
 // Unowned intermediate tables (such as many-to-many Catalog join) must be
 // included even if there is no public EF Core DbSet property.
 report.push({owner,db,tables:actualTables.length,fks:actualFks.length});
 console.log('PASS '+db+' physical_tables='+actualTables.length+
   ' actual_local_FKs='+actualFks.length);
}
assert.equal(report.reduce((sum,x)=>sum+x.tables,0),50);
assert.equal(report.reduce((sum,x)=>sum+x.fks,0),20);
console.log('PHYSICAL_ERD_SQL_QA=PASS databases=6 physicalTables=50 sqlFKs=20');
