// TARGET DESIGN ONLY: not current EF migrations or deployed endpoints.
// Generated, editable Draw.io designs + DBML for longitudinal nutrition.
'use strict';
const fs=require('fs'),path=require('path');
const out=path.resolve(__dirname,'../docs/assignment/one-page');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const groups={
PROFILE:[
 ['NutritionProfiles','Id:uuid|UserId:uuid|TimeZoneId:text|OnboardingState:text|UpdatedAtUtc:datetime',[]],
 ['Allergens','Id:uuid|Code:text|DisplayName:text|SourceVersion:text',[]],
 ['UserAllergies','Id:uuid|ProfileId:uuid|AllergenId:uuid|Status:text|Severity:text|VerifiedAtUtc:datetime',['ProfileId>NutritionProfiles','AllergenId>Allergens']],
 ['HealthConditions','Id:uuid|Code:text|DisplayName:text|SourceVersion:text',[]],
 ['UserConditions','Id:uuid|ProfileId:uuid|ConditionId:uuid|SelfReported:boolean|ReviewedAtUtc:datetime',['ProfileId>NutritionProfiles','ConditionId>HealthConditions']],
 ['MedicationContexts','Id:uuid|ProfileId:uuid|DrugName:text|MealTimingNotes:text|Verified:boolean',['ProfileId>NutritionProfiles']],
 ['DietPreferences','Id:uuid|ProfileId:uuid|DietPattern:text|DislikedFoods:text|BudgetVnd:int',['ProfileId>NutritionProfiles']],
 ['NutritionGoals','Id:uuid|ProfileId:uuid|GoalCode:text|EffectiveFrom:date|Priority:int',['ProfileId>NutritionProfiles']],
 ['RiskAssessments','Id:uuid|ProfileId:uuid|RiskTier:text|PolicyVersion:text|ReviewStatus:text',['ProfileId>NutritionProfiles']],
 ['HealthConsents','Id:uuid|ProfileId:uuid|Purpose:text|GrantedAtUtc:datetime|RevokedAtUtc:datetime',['ProfileId>NutritionProfiles']]
],
PLANS:[
 ['Foods','Id:uuid|LocalName:text|Region:text|SourceVersion:text|Verified:boolean',[]],
 ['Nutrients','Id:uuid|Code:text|Unit:text|SourceVersion:text',[]],
 ['FoodNutrients','Id:uuid|FoodId:uuid|NutrientId:uuid|AmountPer100g:decimal',['FoodId>Foods','NutrientId>Nutrients']],
 ['FoodAllergens','Id:uuid|FoodId:uuid|AllergenId:uuid|Presence:text|SourceConfidence:text',['FoodId>Foods','AllergenId>Allergens']],
 ['Recipes','Id:uuid|LocalName:text|ServingYield:decimal|Verified:boolean',[]],
 ['RecipeIngredients','Id:uuid|RecipeId:uuid|FoodId:uuid|AmountGrams:decimal',['RecipeId>Recipes','FoodId>Foods']],
 ['RecipeAllergens','Id:uuid|RecipeId:uuid|AllergenId:uuid|Presence:text',['RecipeId>Recipes','AllergenId>Allergens']],
 ['DietPrograms','Id:uuid|ProfileId:uuid|StartLocalDate:date|EndLocalDate:date|Status:text',['ProfileId>NutritionProfiles']],
 ['ProgramVersions','Id:uuid|ProgramId:uuid|VersionNumber:int|RulesVersion:text|ApprovalState:text',['ProgramId>DietPrograms']],
 ['ProgramDays','Id:uuid|ProgramVersionId:uuid|LocalDate:date|TimeZoneId:text',['ProgramVersionId>ProgramVersions']],
 ['ScheduledMeals','Id:uuid|ProgramDayId:uuid|MealType:text|LocalTime:time',['ProgramDayId>ProgramDays']],
 ['ScheduledMealItems','Id:uuid|ScheduledMealId:uuid|RecipeId:uuid|ServingQuantity:decimal',['ScheduledMealId>ScheduledMeals','RecipeId>Recipes']],
 ['MealReplacements','Id:uuid|ScheduledMealItemId:uuid|RecipeId:uuid|Reason:text',['ScheduledMealItemId>ScheduledMealItems','RecipeId>Recipes']],
 ['PlanSafetyChecks','Id:uuid|ProgramVersionId:uuid|CheckCode:text|Result:text|PolicyVersion:text',['ProgramVersionId>ProgramVersions']]
],
FEEDBACK:[
 ['MealIntakes','Id:uuid|ProgramDayId:uuid|UserId:uuid|EatenAtUtc:datetime|Status:text',['ProgramDayId>ProgramDays']],
 ['MealIntakeItems','Id:uuid|MealIntakeId:uuid|FoodId:uuid|AmountGrams:decimal',['MealIntakeId>MealIntakes','FoodId>Foods']],
 ['QuestionnaireTemplates','Id:uuid|Name:text|Phase:text|Version:int|Active:boolean',[]],
 ['QuestionnaireQuestions','Id:uuid|TemplateId:uuid|Prompt:text|InputType:text|SortOrder:int',['TemplateId>QuestionnaireTemplates']],
 ['QuestionOptions','Id:uuid|QuestionId:uuid|Code:text|DisplayText:text',['QuestionId>QuestionnaireQuestions']],
 ['CheckinSchedules','Id:uuid|ProfileId:uuid|TemplateId:uuid|LocalTime:time|Enabled:boolean|QuietStart:time|QuietEnd:time|MaxPerDay:int',['ProfileId>NutritionProfiles','TemplateId>QuestionnaireTemplates']],
 ['CheckinSubmissions','Id:uuid|ProfileId:uuid|TemplateId:uuid|LocalDate:date|Phase:text',['ProfileId>NutritionProfiles','TemplateId>QuestionnaireTemplates']],
 ['CheckinAnswers','Id:uuid|SubmissionId:uuid|QuestionId:uuid|OptionId:uuid|NumericValue:decimal|BooleanValue:boolean|FreeText:text',['SubmissionId>CheckinSubmissions','QuestionId>QuestionnaireQuestions','OptionId>QuestionOptions']],
 ['HealthObservations','Id:uuid|ProfileId:uuid|SubmissionId:uuid|MetricCode:text|MetricValue:decimal|Unit:text|MeasuredAtUtc:datetime',['ProfileId>NutritionProfiles','SubmissionId>CheckinSubmissions']],
 ['SymptomReports','Id:uuid|SubmissionId:uuid|MealIntakeId:uuid|SymptomCode:text|Severity:int|OnsetAtUtc:datetime',['SubmissionId>CheckinSubmissions','MealIntakeId>MealIntakes']],
 ['NutritionReviews','Id:uuid|ProfileId:uuid|ProgramVersionId:uuid|ReviewStatus:text|ReviewedAtUtc:datetime',['ProfileId>NutritionProfiles','ProgramVersionId>ProgramVersions']],
 ['PlanChangeHistory','Id:uuid|ReviewId:uuid|FromVersionId:uuid|ToVersionId:uuid|ChangeReason:text',['ReviewId>NutritionReviews','FromVersionId>ProgramVersions','ToVersionId>ProgramVersions']],
 ['PromptDeliveries','Id:uuid|ScheduleId:uuid|SentAtUtc:datetime|Channel:text|DeliveryStatus:text|IdempotencyKey:text',['ScheduleId>CheckinSchedules']],
 ['SafetyIncidents','Id:uuid|ProfileId:uuid|SubmissionId:uuid|Severity:text|EscalatedAtUtc:datetime',['ProfileId>NutritionProfiles','SubmissionId>CheckinSubmissions']],
 ['NutritionOutbox','Id:uuid|AggregateId:uuid|EventType:text|CreatedAtUtc:datetime|PublishedAtUtc:datetime',[]]
]
};
const all=Object.values(groups).flat(),names=new Set(all.map(t=>t[0]));
if(all.length!==39||names.size!==39)throw Error('Expected exactly 39 distinct TARGET tables');
for(const t of all)for(const ref of t[2])if(!names.has(ref.split('>')[1]))throw Error('Unknown FK '+ref);
const dbml=['// TARGET DESIGN, NOT IMPLEMENTED SQL TABLES / MIGRATIONS.','// SQL Server LongevityTrackingDb, proposed schema nutrition.','// UserId refers logically to Users in LongevityDietDb (NO cross-database SQL FK).',
'Project LongevityDiet_Nutrition_Target { database_type: "SQLServer" }'];
for(const [group,ts] of Object.entries(groups))for(const [name,fields] of ts){
 dbml.push('Table nutrition.'+name+' {');
 for(const [i,f] of fields.split('|').entries()){const [key,type]=f.split(':');
  dbml.push('  '+key+' '+({uuid:'uniqueidentifier',text:'nvarchar(300)',int:'int',date:'date',datetime:'datetime2',boolean:'bit',decimal:'decimal(10,3)',time:'time'}[type]||type)+(i===0?' [pk]':''));
 }
 dbml.push('}');
}
for(const t of all)for(const ref of t[2]){const [f,to]=ref.split('>');dbml.push('Ref: nutrition.'+t[0]+'.'+f+' > nutrition.'+to+'.Id');}
const fkCount=all.reduce((sum,t)=>sum+t[2].length,0);
fs.writeFileSync(path.join(out,'08-nutrition-target-39-tables.dbml'),dbml.join('\n')+'\n');
function drawing(title,subtitle,W,H){
 const nodes=[],links=[],lookup=new Map();let seq=1;
 const add=(key,x,y,w,h,label,kind='box',opts={})=>{
  const id='z'+(++seq),color=opts.color||'#FFFFFF';
  let style='rounded='+(kind==='pill'?'1':'0')+';html=1;whiteSpace=wrap;strokeColor=#374151;strokeWidth=3;fillColor='+color+';fontSize='+(opts.font||28)+';fontFamily=Arial;fontColor=#17212D;align=center;verticalAlign=middle;spacing=10;';
  if(kind==='boundary')style='rounded=0;html=1;whiteSpace=wrap;strokeColor=#8A9199;strokeWidth=2;dashed=1;fillColor=none;align=left;verticalAlign=top;fontColor=#374151;fontSize=26;spacing=14;';
  if(kind==='heading')style='text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontSize='+(opts.font||36)+';fontFamily=Arial;fontColor=#17212D;align=left;verticalAlign=middle;fontStyle=1;spacing=2;';
  nodes.push('<mxCell id="'+id+'" value="'+esc(String(label).replace(/\n/g,'<br/>'))+'" style="'+esc(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
  if(key)lookup.set(key,{id,x,y,w,h});return key;
 };
 const line=(from,to,opts={})=>{
  const a=lookup.get(from),b=lookup.get(to);if(!a||!b)throw Error('Unknown edge '+from+' '+to);
  const {exit=[.5,1],entry=[.5,0],way=[],dashed=false}=opts;
  const style='edgeStyle=segmentEdgeStyle;rounded=0;html=1;strokeColor=#475569;strokeWidth=3;'+(dashed?'dashed=1;dashPattern=8 7;':'')+'endArrow=block;endFill=1;exitX='+exit[0]+';exitY='+exit[1]+';exitPerimeter=0;entryX='+entry[0]+';entryY='+entry[1]+';entryPerimeter=0;';
  const pts=way.length?'<Array as="points">'+way.map(p=>'<mxPoint x="'+p[0]+'" y="'+p[1]+'"/>').join('')+'</Array>':'';
  links.push('<mxCell id="z'+(++seq)+'" edge="1" source="'+a.id+'" target="'+b.id+'" value="" style="'+esc(style)+'" parent="1"><mxGeometry relative="1" as="geometry">'+pts+'</mxGeometry></mxCell>');
 };
 const save=(file)=>{
  const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram id="'+esc(file)+'" name="'+esc(title)+'"><mxGraphModel grid="1" gridSize="10" page="1" pageWidth="'+W+'" pageHeight="'+H+'" pageScale="1" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+links.join('')+nodes.join('')+'</root></mxGraphModel></diagram></mxfile>';
  fs.writeFileSync(path.join(out,file),xml);console.log(file+': '+lookup.size+' nodes, '+links.length+' directed connectors');
 };
 add(null,95,20,W-190,110,title,'heading',{font:54});
 add(null,95,145,W-190,78,subtitle,'heading',{font:29});
 return{add,line,save};
}
// C2 target: one existing ASP.NET Core container with seven domain lanes, no imagined deployed microservices.
{
 const w=13250,h=3980,d=drawing('C2 TARGET - DAILY NUTRITION AND LONGITUDINAL WELLNESS',
  'PROPOSED ONLY | API :8080 | per-day meals + allergies + self-reported outcomes | not current deployed behavior',w,h);
 d.add('client',110,480,650,230,'Member Web UI\nMobile-first', 'box',{font:29,color:'#EDF5FF'});
 d.add('route',1040,480,11830,230,'ASP.NET CORE ROUTING / JWT / CONSENT / INPUT VALIDATION / RATE LIMIT', 'box',{font:34,color:'#E6EDF5'});
 d.line('client','route',{exit:[1,.5],entry:[0,.5]});
 const lanes=[
 ['profile',650,'Profile + Intake API','Nutrition Intake Service','nutrition.NutritionProfiles\nUserConditions / Goals'],
 ['safety',2460,'Safety API','Risk + Allergen Service','nutrition.UserAllergies\nRiskAssessments'],
 ['food',4270,'Food Catalog API','Food + Nutrient Service','nutrition.Foods / Recipes\nFoodNutrients'],
 ['plan',6080,'Daily Plan API','Multi-Day Plan Engine','nutrition.DietPrograms\nProgramDays / Meals'],
 ['diary',7890,'Meal Diary API','Meal Logging Service','nutrition.MealIntakes\nMealIntakeItems'],
 ['checkin',9700,'Check-in API','Wellness Questionnaire Service','nutrition.CheckinSubmissions\nHealthObservations'],
 ['review',11510,'Progress API','Trend + Adaptation Service','nutrition.NutritionReviews\nPlanChangeHistory']
 ];
 for(const [key,x,controller,service,db] of lanes){
  d.add(key+'Api',x,1010,1420,250,controller,'box',{font:31});
  d.add(key+'Svc',x,1590,1420,260,service,'box',{font:30,color:key==='safety'?'#FFF3E5':'#FFFFFF'});
  d.add(key+'Db',x,2750,1420,295,db,'box',{font:27,color:'#EAF3EB'});
  d.line('route',key+'Api',{exit:[(x+710-1040)/11830,1],entry:[.5,0]});
  d.line(key+'Api',key+'Svc');
  d.line(key+'Svc',key+'Db');
 }
 d.add(null,320,2600,12580,670,'LongevityTrackingDb / nutrition schema | EF Core planned migration | all seven logical data groups share one physical SQL catalog', 'boundary',{font:25});
 d.add(null,800,3420,11600,260,'Safety/clinical review and reminder events are controlled by the risk, check-in and progress services. External worker details remain in C1; no independent SQL FK to Identity or Worker.', 'pill',{font:30});
 // Separate care-loop view documents cross-service calls and response direction, avoiding false direct SQL FKs.
 d.add(null,420,3750,12510,140,'READING: request -> API -> service -> owned tables; synchronous responses return on same call. See care-loop view for safety, plan, feedback and re-plan paths.', 'pill',{font:27});
 d.save('07-c2-daily-nutrition-target.drawio');
}
// End-to-end care feedback path; loop is explicit and references target C2 components.
{
 const w=11600,h=2520,d=drawing('DAILY CARE LOOP - FROM BASELINE TO EVERY NEXT DAY',
  'PROPOSED behavior | local-date-aware, versioned plans, opt-in check-ins, safe hold and clinical review',w,h);
 const x=[180,1850,3520,5190,6860,8530,10200],y=550;
 const boxes=[
 ['baseline','1. Baseline + consent','Allergies, conditions, goals'],
 ['risk','2. Safety classification','Unknown / high-risk -> review'],
 ['plan','3. Multi-day plan','Day 1 ... Day N + revisions'],
 ['diary','4. Every meal','Record actual intake / swaps'],
 ['checkin','5. Before / during / after','Symptoms, energy, sleep, metrics'],
 ['review','6. Trend assessment','Compare to baseline, missing-data'],
 ['tomorrow','7. Re-plan next day','New revision; old days kept']
 ];
 boxes.forEach((b,i)=>{d.add(b[0],x[i],y,1350,420,b[1]+'\n'+b[2],'box',{font:27,color:i===1?'#FFF3E5':i===6?'#EAF3EB':'#FFFFFF'});if(i)d.line(boxes[i-1][0],b[0],{exit:[1,.5],entry:[0,.5]});});
 d.add('hold',3860,1400,2840,370,'HOLD / REVIEW\nSevere allergy, red-flag symptom, unsafe or unknown ingredients','box',{font:28,color:'#FFF0EF'});
 d.line('tomorrow','plan',{exit:[1,.08],entry:[.5,0],way:[[11570,365],[4195,365]]});
 d.add(null,6600,255,1900,65,'Repeat for next local date', 'heading',{font:26});
 d.line('risk','hold',{exit:[.5,1],entry:[.15,0],dashed:true,way:[[2525,1230],[4286,1230]]});
 d.line('review','hold',{exit:[.5,1],entry:[.85,0],dashed:true,way:[[9205,1280],[6274,1280]]});
 d.add(null,500,2040,10400,250,'Next local day: carry forward only safe approved plan + new check-ins. If data missing, mark unknown, ask again without guessing. Any red flag requires urgent guidance rather than automatic optimization.','pill',{font:28});
 d.save('11-daily-care-loop-target.drawio');
}
// Draw.io table catalog views show fields cleanly; the complete 50 native FK arrows
// are in the dedicated relationship audit sheets 12-15 (plus authoritative DBML).
for(const [group,filename,heading] of [
 ['PROFILE','08-erd-nutrition-profile-safety-target.drawio','HEALTH PROFILE / CLASSIFICATION / CONSENT'],
 ['PLANS','09-erd-food-daily-plans-target.drawio','FOODS, RECIPES AND MULTI-DAY PLANS'],
 ['FEEDBACK','10-erd-checkins-trends-target.drawio','DAILY LOGS, CHECK-INS AND PROGRESS']
]){
 const tables=groups[group],cols=group==='PROFILE'?2:3;
 const ww=cols===2?4250:6250,rw=530,rows=Math.ceil(tables.length/cols),hh=rows*rw+580;
 const d=drawing('TARGET TABLE CATALOG - '+heading,
  'NOT MIGRATED | nutrition.* in LongevityTrackingDb | full uncluttered column details here; all FK arrows are in diagrams 12-15',ww,hh);
 const map=new Map(),xs=cols===2?[240,2260]:[160,2250,4340];
 tables.forEach((t,i)=>{
  const x=xs[i%cols],y=400+Math.floor(i/cols)*rw;
  const props=t[1].split('|').slice(0,7).map(f=>f.replace(':',' : ')).join('\n');
  const cross=t[2].filter(ref=>!tables.some(z=>z[0]===ref.split('>')[1])).map(ref=>'FK '+ref.replace('>',' -> '));
  d.add(t[0],x,y,cols===2?1730:1680,365,t[0]+'\n'+props+(cross.length?'\n'+cross.join(', '):''),'box',{font:24,color:'#FFFFFF'});
  map.set(t[0],{x,y});
 });
 // Use a dedicated full FK audit to avoid connector crossings in a 39-table overview.
 // FK counts remain computable from DBML, and every FK is actually drawn in diagrams 12-15.
 const links=tables.reduce((n,t)=>n+t[2].filter(ref=>tables.some(v=>v[0]===ref.split('>')[1])).length,0);
 d.add(null,160,hh-145,ww-320,96,'Complete native FK arrows: diagrams 12-15 (50 total). This sheet shows all table fields without wires crossing the boxes. No actual migrations changed.','pill',{font:22});
 d.save(filename);
 console.log('SHEET '+group+' tables='+tables.length+' auditedLocalFKs='+links);
}
// One auditable arrow for every FK crossing the three ERD sheets (all are inside LongevityTrackingDb).
const ownerByTable=new Map();
for(const [group,tables] of Object.entries(groups))for(const t of tables)ownerByTable.set(t[0],group);
const crossRefs=[];
for(const [group,tables] of Object.entries(groups))for(const t of tables)for(const ref of t[2]){
 const [column,parent]=ref.split('>');
 if(ownerByTable.get(parent)!==group)crossRefs.push({child:t[0],column,parent,from:group,to:ownerByTable.get(parent)});
}
{
 const w=6800,h=440+crossRefs.length*235;
 const d=drawing('TARGET ERD - ALL CROSS-SHEET FOREIGN KEYS',
  'These are SQL FKs inside LongevityTrackingDb, despite appearing on different legibility sheets. Identity Users reference is logical only.',w,h);
 for(let i=0;i<crossRefs.length;i++){
  const r=crossRefs[i],y=340+i*235;
  d.add('src'+i,220,y,2850,165,r.from+' | '+r.child+'.'+r.column,'box',{font:29,color:'#EDF5FF'});
  d.add('dst'+i,3680,y,2880,165,r.to+' | '+r.parent+'.Id','box',{font:29,color:'#EAF3EB'});
  d.line('src'+i,'dst'+i,{exit:[1,.5],entry:[0,.5]});
 }
 d.save('12-erd-cross-domain-foreign-keys-target.drawio');
}
console.log('CROSS_SHEET_TARGET_FKS='+crossRefs.length);
// Zero-crossing FK ledgers: one explicitly attached arrow for every intra-sheet relation.
for(const [group,file] of [
 ['PROFILE','13-fk-profile-safety-target.drawio'],
 ['PLANS','14-fk-food-daily-plans-target.drawio'],
 ['FEEDBACK','15-fk-checkins-trends-target.drawio']
]){
 const rows=[];
 for(const t of groups[group])for(const ref of t[2]){
  const [column,parent]=ref.split('>');
  if(ownerByTable.get(parent)===group)rows.push({child:t[0],column,parent});
 }
 const w=6800,h=440+rows.length*235,d=drawing('TARGET FK AUDIT - '+group,
  'One row = one native Draw.io connector. All arrows point child.FK -> parent.Id; each endpoint is explicit.',w,h);
 rows.forEach((r,i)=>{
  const y=340+i*235;
  d.add('fk'+i,220,y,2850,165,r.child+'.'+r.column,'box',{font:29,color:'#EDF5FF'});
  d.add('pk'+i,3680,y,2880,165,r.parent+'.Id','box',{font:29,color:'#EAF3EB'});
  d.line('fk'+i,'pk'+i,{exit:[1,.5],entry:[0,.5]});
 });
 d.save(file);
 console.log('AUDITED_LOCAL_FKS '+group+'='+rows.length);
}
const manifest={
 status:'TARGET_DESIGN_ONLY_NOT_IMPLEMENTED',database:'LongevityTrackingDb',schema:'nutrition',
 tableCount:all.length,fkCount,groupCounts:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length])),
 files:['07-c2-daily-nutrition-target.drawio','08-nutrition-target-39-tables.dbml','08-erd-nutrition-profile-safety-target.drawio','09-erd-food-daily-plans-target.drawio','10-erd-checkins-trends-target.drawio','11-daily-care-loop-target.drawio','12-erd-cross-domain-foreign-keys-target.drawio','13-fk-profile-safety-target.drawio','14-fk-food-daily-plans-target.drawio','15-fk-checkins-trends-target.drawio']
};
fs.writeFileSync(path.join(out,'nutrition-target-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('NUTRITION_TARGET_MODEL_COMPLETE: '+all.length+' tables / '+fkCount+' candidate SQL FK definitions');
