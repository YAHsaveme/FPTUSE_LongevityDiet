// Independent QA for proposed longitudinal nutrition diagrams; does NOT validate clinical accuracy or deployed runtime.
'use strict';
const fs=require('fs'),path=require('path'),base=path.resolve(__dirname,'../docs/assignment/one-page');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'nutrition-target-manifest.json'),'utf8'));
const fail=[],attr=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const cellFile=name=>{
 const xml=fs.readFileSync(path.join(base,name+'.drawio'),'utf8');
 return [...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)].map(m=>({a:attr(m[1]),body:m[2]||''}));
};
function assert(cond,msg){if(!cond)fail.push(msg);}
const doc=fs.readFileSync(path.join(base,'08-nutrition-target-39-tables.dbml'),'utf8');
const tables=[...doc.matchAll(/^Table nutrition\.(\w+) \{([\s\S]*?)^\}/gm)];
const names=new Set(tables.map(m=>m[1])),fields=new Map(tables.map(m=>[m[1],new Set([...m[2].matchAll(/^\s+(\w+)\s+\w/gm)].map(x=>x[1]))]));
const refs=[...doc.matchAll(/^Ref: nutrition\.(\w+)\.(\w+) > nutrition\.(\w+)\.(\w+)/gm)];
assert(tables.length===39&&names.size===39,'39-table coverage mismatch');
assert(refs.length===50,'50 FK coverage mismatch');
assert(manifest.tableCount===39&&manifest.fkCount===50,'Manifest/DBML drift');
for(const x of refs){
 assert(names.has(x[1])&&names.has(x[3]),'Unknown FK table '+x[0]);
 assert(fields.get(x[1])?.has(x[2])&&fields.get(x[3])?.has(x[4]),'Unknown FK column '+x[0]);
}
for(const [table,field] of [
 ['ProgramDays','LocalDate'],['ProgramDays','TimeZoneId'],['ScheduledMeals','ProgramDayId'],
 ['FoodAllergens','AllergenId'],['RecipeIngredients','FoodId'],['CheckinAnswers','NumericValue'],
 ['CheckinAnswers','BooleanValue'],['CheckinAnswers','FreeText'],['HealthObservations','MetricValue'],
 ['HealthObservations','Unit'],['SymptomReports','MealIntakeId'],['CheckinSchedules','QuietStart'],
 ['HealthConsents','RevokedAtUtc'],['PlanChangeHistory','ToVersionId']
])assert(fields.get(table)?.has(field),'Required field missing '+table+'.'+field);
assert(!refs.some(x=>x[0].includes('LongevityDietDb')||x[3]==='Users'),'Cross-catalog SQL FK forbidden');
const specs=[
 ['07-c2-daily-nutrition-target',22,null],
 ['08-erd-nutrition-profile-safety-target',0,10],
 ['09-erd-food-daily-plans-target',0,14],
 ['10-erd-checkins-trends-target',0,15],
 ['11-daily-care-loop-target',9,null],
 ['12-erd-cross-domain-foreign-keys-target',13,null],
 ['13-fk-profile-safety-target',9,null],
 ['14-fk-food-daily-plans-target',14,null],
 ['15-fk-checkins-trends-target',14,null]
];
const groups=[
 ['08-erd-nutrition-profile-safety-target',tables.slice(0,10)],
 ['09-erd-food-daily-plans-target',tables.slice(10,24)],
 ['10-erd-checkins-trends-target',tables.slice(24,39)]
];
for(const [name,expectedEdges,expectedTables] of specs){
 const cs=cellFile(name),nodes=cs.filter(c=>c.a.vertex==='1'),E=cs.filter(c=>c.a.edge==='1');
 assert(E.length===expectedEdges, name+': expected '+expectedEdges+' arrows, got '+E.length);
 const ids=new Set(nodes.map(n=>n.a.id));
 for(const e of E)assert(ids.has(e.a.source)&&ids.has(e.a.target),name+': orphan edge '+e.a.id);
 const pdf=fs.readFileSync(path.join(base,name+'.pdf'),'binary');
 const pages=(pdf.match(/\/Type\s*\/Page\b/g)||[]).length;
 assert(pages===1,name+': expected one PDF page, got '+pages);
 assert(fs.statSync(path.join(base,name+'.pdf')).size>1000,name+': missing PDF');
 if(expectedTables!==null){
  const matching=nodes.filter(n=>names.has((n.a.value||'').split('&lt;br/&gt;')[0]));
  assert(matching.length===expectedTables,name+': table shape coverage '+matching.length+'/'+expectedTables);
 }
 console.log(name+': '+nodes.length+' shapes, '+E.length+' arrows, '+pages+' PDF page');
}
for(const [name,expected] of groups){
 const nodes=cellFile(name).filter(c=>c.a.vertex==='1');
 for(const entry of expected){
  const table=entry[1];
  const found=nodes.filter(n=>(n.a.value||'').startsWith(table+'&lt;br/&gt;'));
  assert(found.length===1,name+': expected one table '+table+', got '+found.length);
 }
}
const c2=cellFile('07-c2-daily-nutrition-target'),C=c2.filter(c=>c.a.edge==='1');
for(const role of ['Profile + Intake API','Safety API','Food Catalog API','Daily Plan API','Meal Diary API','Check-in API','Progress API',
 'Nutrition Intake Service','Risk + Allergen Service','Food + Nutrient Service','Multi-Day Plan Engine',
 'Meal Logging Service','Wellness Questionnaire Service','Trend + Adaptation Service']){
 const cells=c2.filter(c=>c.a.vertex==='1'&&(c.a.value||'').includes(role));
 assert(cells.length===1,'Missing or duplicate C2 component '+role);
 if(cells.length)assert(C.some(e=>e.a.source===cells[0].a.id||e.a.target===cells[0].a.id),'Isolated C2 role '+role);
}
const cross=refs.filter(x=>{
 const section=t=>tables.findIndex(k=>k[1]===t)<10?'PROFILE':tables.findIndex(k=>k[1]===t)<24?'PLANS':'FEEDBACK';
 return section(x[1])!==section(x[3]);
});
assert(cross.length===13,'Cross-sheet FK count expected 13, got '+cross.length);
if(fail.length){for(const m of fail)console.error('NUTRITION_TARGET_QA_FAIL '+m);process.exitCode=1}
else console.log('NUTRITION_TARGET_STRUCTURAL_QA=PASS (39 proposed tables, 50 proposed FKs, 13 documented cross-sheet arrows, complete editable sources)');
