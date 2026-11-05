// Strict QA for PROPOSED LonggevityDiet nutrition design only, never runtime safety.
'use strict';
const fs=require('fs'),path=require('path'),base=path.resolve(__dirname,'../docs/assignment/one-page');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'nutrition-target-manifest.json'),'utf8'));
const issues=[];
const insist=(condition,msg)=>{if(!condition)issues.push(msg)};
const att=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const diagram=name=>{
 const source=fs.readFileSync(path.join(base,name+'.drawio'),'utf8');
 const cells=[...source.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)]
   .map(m=>({a:att(m[1]),body:m[2]||''}));
 const V=new Map(cells.filter(c=>c.a.vertex==='1').map(c=>[c.a.id,c]));
 return {vertices:V,edges:cells.filter(c=>c.a.edge==='1'),cells};
};
const dbml=fs.readFileSync(path.join(base,'08-nutrition-target-52-tables.dbml'),'utf8');
const tableRows=[...dbml.matchAll(/^Table nutrition\.(\w+) \{([\s\S]*?)^\}/gm)];
const tableNames=tableRows.map(m=>m[1]);
const fieldMap=new Map(tableRows.map(m=>[m[1],new Set([...m[2].matchAll(/^\s+(\w+)\s+[\w()\,]+/gm)].map(x=>x[1]))]));
const refs=[...dbml.matchAll(/^Ref: nutrition\.(\w+)\.(\w+) > nutrition\.(\w+)\.(\w+)$/gm)]
  .map(m=>({child:m[1],column:m[2],parent:m[3],pk:m[4]}));
const core={PROFILE:14,PLANS:20,FEEDBACK:18},expectedFK=71;
insist(manifest.status==='TARGET_DESIGN_ONLY_NOT_IMPLEMENTED','False implementation status');
insist(manifest.tableCount===52&&tableRows.length===52&&new Set(tableNames).size===52,'52-table coverage/drift');
insist(JSON.stringify(manifest.groupCounts)===JSON.stringify(core),'14+20+18 owner groups changed');
insist(refs.length===expectedFK&&manifest.fkCount===expectedFK,'71-FK count/drift');
for(const ref of refs){
 insist(fieldMap.get(ref.child)?.has(ref.column), 'Missing FK field '+ref.child+'.'+ref.column);
 insist(ref.pk==='Id'&&fieldMap.get(ref.parent)?.has(ref.pk), 'Missing PK '+ref.parent+'.'+ref.pk);
}
const unlinked=tableNames.filter(n=>!refs.some(r=>r.child===n||r.parent===n));
insist(unlinked.length===1&&unlinked[0]==='NutritionOutbox',
 'Unexpected SQL-isolated table(s) '+unlinked.join(', ')+'; only the event outbox may have no enforced FK');
const normalizedRef=r=>r.child+'.'+r.column+'>'+r.parent+'.'+r.pk;
insist(new Set(refs.map(normalizedRef)).size===refs.length,'Duplicate FK definition');
for(const [table,columns] of Object.entries({
 NutritionProfiles:['UserId','TimeZoneId'],UserAllergies:['Severity','VerifiedAtUtc'],
 UserFoodIntolerances:['FoodId','EvidenceState'],AssessmentRiskFactors:['AssessmentId','FactorId'],
 ClinicalReviewCases:['AssessmentId','Status','ReviewerRef'],FoodDataSources:['Citation','License'],
 FoodSourceLinks:['SourceId','VerifiedAtUtc'],RecipeCrossContactRisks:['RecipeId','AllergenId','RiskState'],
 NutritionTargetRanges:['ProgramVersionId','NutrientId','LowerPerDay','UpperPerDay'],
 DayNutrientEstimates:['ProgramDayId','NutrientId','Completeness'],
 ProgramDays:['ProgramVersionId','LocalDate','PublicationState','SafetyStatus','GeneratedAtUtc'],
 ScheduledMealItems:['PortionUnit','AllergenGate','RecipeId'],
 PlanSelectionDecisions:['ScheduledMealItemId','AssessmentId','Allowed'],
 MealIntakes:['ProgramDayId','EatenAtUtc'],
 CheckinAnswers:['AnswerState','NumericValue','BooleanValue','FreeText'],
 CheckinAnswerSelections:['AnswerId','OptionId'],
 HealthObservations:['MetricValue','Unit','SourceType','MeasuredAtUtc'],
 CheckinSchedules:['QuietStart','QuietEnd','MaxPerDay'],
 CheckinSubmissions:['ResponseStatus','LocalDate'],
 SafetyIncidents:['ActionState'],PlanChangeHistory:['ToVersionId']
})){
 for(const column of columns)insist(fieldMap.get(table)?.has(column),'Required column absent '+table+'.'+column);
}
for(const [table,uniqueCols] of [
 ['NutritionProfiles','UserId'],['ProgramVersions','ProgramId, VersionNumber'],
 ['ProgramDays','ProgramVersionId, LocalDate'],['ScheduledMeals','ProgramDayId, MealType, LocalTime'],
 ['UserAllergies','ProfileId, AllergenId'],['CheckinAnswerSelections','AnswerId, OptionId'],
 ['DayNutrientEstimates','ProgramDayId, NutrientId'],['PromptDeliveries','IdempotencyKey']]){
 const snippet=tableRows.find(t=>t[1]===table)?.[2]||'';
 insist(snippet.includes('('+uniqueCols+') [unique]'),'Missing uniqueness '+table+': '+uniqueCols);
}
insist(!refs.some(r=>r.parent==='Users'||r.child==='Users'),'Do not fabricate FK into Identity DB');
const bounds=[
 {id:'PROFILE',start:0,end:core.PROFILE,ledger:'13-fk-profile-safety-target',catalog:'08-erd-nutrition-profile-safety-target'},
 {id:'PLANS',start:core.PROFILE,end:core.PROFILE+core.PLANS,ledger:'14-fk-food-daily-plans-target',catalog:'09-erd-food-daily-plans-target'},
 {id:'FEEDBACK',start:core.PROFILE+core.PLANS,end:52,ledger:'15-fk-checkins-trends-target',catalog:'10-erd-checkins-trends-target'}
];
const section=name=>{
 const i=tableNames.indexOf(name);
 return bounds.find(b=>i>=b.start&&i<b.end)?.id;
};
const auditMap=new Map(),expectedLedgers=new Map();
for(const r of refs){
 const ledger=section(r.child)===section(r.parent)
  ?bounds.find(b=>b.id===section(r.child)).ledger
  :'12-erd-cross-domain-foreign-keys-target';
 const k=normalizedRef(r), list=expectedLedgers.get(ledger)||[];list.push(k);expectedLedgers.set(ledger,list);
}
const clean=s=>s.replace(/^(PROFILE|PLANS|FEEDBACK) \| /,'');
for(const [ledger,wanted] of expectedLedgers){
 const {vertices,edges}=diagram(ledger),got=[];
 for(const e of edges){
  const from=clean(vertices.get(e.a.source)?.a.value||'');
  const to=clean(vertices.get(e.a.target)?.a.value||'');
  insist(Boolean(from&&to),ledger+': disconnected arrow '+e.a.id);
  got.push(from+'>'+to);
 }
 const w=new Set(wanted),g=new Set(got);
 for(const k of wanted)insist(g.has(k),ledger+': missing drawn FK '+k);
 for(const k of got)insist(w.has(k),ledger+': phantom drawn FK '+k);
 insist(g.size===wanted.length,ledger+': duplicates or missing endpoints');
 auditMap.set(ledger,edges.length);
}
insist([...auditMap.values()].reduce((a,b)=>a+b,0)===71,'All FK native arrow coverage is incomplete');
const catalogueExpected=[...bounds];
for(const b of catalogueExpected){
 const {vertices,edges}=diagram(b.catalog);insist(edges.length===0,b.catalog+': catalog arrows overlap, use 12-15 audit');
 const labels=[...vertices.values()].map(x=>(x.a.value||'').split('&lt;br/&gt;')[0].replace(/&lt;\/?b&gt;/g,''));
 for(const t of tableNames.slice(b.start,b.end))insist(labels.filter(x=>x===t).length===1,b.catalog+': missing/duplicate '+t);
}
const c2=diagram('07-c2-daily-nutrition-target');
insist(c2.edges.length===22,'C2 primary directed graph changed');
const roles=[
 'Profile + Intake API','Safety API','Food Catalog API','Daily Plan API','Meal Diary API','Check-in API','Progress API',
 'Nutrition Intake Service','Risk + Allergen Service','Food + Nutrient Service','Multi-Day Plan Engine',
 'Meal Logging Service','Wellness Questionnaire Service','Trend + Adaptation Service'
];
for(const label of roles){
 const found=[...c2.vertices.values()].filter(v=>(v.a.value||'').includes(label));
 insist(found.length===1,'C2 role missing/duplicate '+label);
 if(found.length===1)insist(c2.edges.some(e=>e.a.source===found[0].a.id||e.a.target===found[0].a.id),'C2 isolated '+label);
}
const dep=diagram('16-c2-service-dependencies-target');
const deps=dep.edges.map(e=>[(dep.vertices.get(e.a.source)?.a.value||''),(dep.vertices.get(e.a.target)?.a.value||'')]);
for(const [from,to] of [
 ['Multi-Day Plan Engine','Risk + Allergen Service'],
 ['Multi-Day Plan Engine','Food + Nutrient Service'],
 ['Risk + Allergen Service','Food + Nutrient Service'],
 ['Risk + Allergen Service','Clinical Review Queue'],
 ['Trend + Adaptation Service','Risk + Allergen Service'],
 ['Trend + Adaptation Service','Multi-Day Plan Engine'],
 ['Wellness Questionnaire Service','Trend + Adaptation Service'],
 ['Meal Logging Service','Trend + Adaptation Service']
]) insist(deps.some(x=>x[0]===from&&x[1]===to),'Missing C2 contract '+from+' -> '+to);
insist(dep.edges.length===13,'C2 contract edges missing/extra');
const care=diagram('11-daily-care-loop-target');
insist(care.edges.length===9,'Missing next-day loop/hold in care diagram');
const requiredStages=['Baseline + consent','Safety classification','Multi-day plan','Every meal',
 'Before / during / after','Trend assessment','Re-plan next day','HOLD / REVIEW'];
for(const s of requiredStages)insist([...care.vertices.values()].some(x=>(x.a.value||'').includes(s)),'Missing care-loop '+s);
const expectedFiles=new Set(manifest.files);
insist(expectedFiles.size===11,'Manifest should declare 11 sources (10 drawio + DBML)');
for(const filename of expectedFiles){
 insist(fs.existsSync(path.join(base,filename)), 'Missing manifest artifact '+filename);
 if(!filename.endsWith('.drawio'))continue;
 const name=filename.slice(0,-7),file=path.join(base,name+'.pdf');
 insist(fs.existsSync(file)&&fs.statSync(file).size>1000,'PDF missing '+name);
 if(!fs.existsSync(file))continue;
 const pdf=fs.readFileSync(file,'binary');
 insist((pdf.match(/\/Type\s*\/Page\b/g)||[]).length===1, name+' is not one PDF page');
 const {vertices,edges}=diagram(name);
 for(const e of edges)insist(vertices.has(e.a.source)&&vertices.has(e.a.target),name+': dangling edge '+e.a.id);
 console.log('DIAGRAM_QA '+name+' nodes='+vertices.size+' edges='+edges.length);
}
if(issues.length){issues.forEach(s=>console.error('NUTRITION_DESIGN_FAIL '+s));process.exitCode=1;}
else console.log('LONGITUDINAL_TARGET_QA=PASS: 52 proposed tables, 71 verified FK arrows, 13 C2 contracts, complete care-loop, PDF coverage');
