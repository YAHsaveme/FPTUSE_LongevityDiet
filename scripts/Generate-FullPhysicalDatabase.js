// Physical DB views generated from the CURRENT, MERGED EF Core models.
// Catalog = all real tables and selected fields. Ledger = all enforced local FKs.
// No logical UserId or Redis event correlation is masqueraded as a SQL FK.
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),base=path.join(root,'docs/assignment/one-page');
const groups={
 identity:{
  context:'src/LongevityDiet.Repositories/LongevityDietDbContext.cs',database:'LongevityDietDb',
  columns:{
   Users:['PK Id','Email','Role','Status'],
   UserProfiles:['PK/FK UserId','TimeZone','FoodPreference'],
   RefreshTokens:['PK Id','FK UserId','TokenHash','ExpiresAt'],
   ReminderPreferences:['PK/FK UserId','OptedIn','QuietStart','QuietEnd'],
   UserNotifications:['PK Id','FK UserId','Category','DeduplicationKey'],
   IdentityOutbox:['PK Id','EventType','PublishedAtUtc'],
   IdentityInbox:['PK EventId','ReceivedAtUtc'],
   UserDietaryPreferences:['PK UserId','DietaryPattern','AllergiesCsv'],
   MealPlans:['PK Id','UserId [logical owner]','Status','TimeZone'],
   MealPlanDays:['PK Id','FK MealPlanId','DayNumber','DailyFocusCode'],
   PlannedMeals:['PK Id','FK MealPlanDayId','SlotType','CandidateCode'],
   MealLogs:['PK Id','UserId [logical owner]','LocalDate','EatenAt'],
   MealLogItems:['PK Id','FK MealLogId','FoodCode','ServingAmount'],
   EatingWindowSnapshots:['PK Id','UserId [logical owner]','LocalDate','StatusCode'],
   RecommendationFeedbacks:['PK Id','UserId [logical owner]','FeedbackType','CandidateCode'],
   MealReplacementHistories:['PK Id','MealPlanId [logical]','PlannedMealId [logical]'],
   UserFoodPreferences:['PK Id','UserId [logical owner]','FoodToken'],
   FmdEducationAcknowledgements:['PK Id','UserId [logical owner]','EducationVersion'],
   FmdSafetyAssessments:['PK Id','UserId [logical owner]','ResultStatus'],
   FmdCycles:['PK Id','UserId [logical owner]','Status'],
   FmdCycleDays:['PK Id','FK FmdCycleId','DayNumber','Symptoms']
  }
 },
 tracking:{
  context:'src/LongevityDiet.Tracking/TrackingDbContext.cs',database:'LongevityTrackingDb',
  columns:{
   ActivityLogs:['PK Id','UserId [logical only]','Kind','DurationMinutes'],
   ActivityGoals:['PK UserId [logical only]','WeeklyMinutesTarget'],
   AdherenceScores:['PK Id','UserId [logical only]','Score'],
   ScoreDimensions:['PK Id','FK AdherenceScoreId','WeightedScore'],
   ScoreConfigurationVersions:['PK Version','ActivityWeight','MealWeight'],
   TrackingScoreSignals:['PK Id','UserId [logical only]','DimensionCode'],
   TrackingOutbox:['PK EventId','EventType','PublishedAtUtc']
  }
 },
 worker:{
  context:'src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs',database:'LongevityWorkerDb',
  columns:{
   ReminderSchedules:['PK Id','UserId [logical only]','Category','NextDueUtc'],
   ReminderDispatchRecords:['PK Id','UserId [logical only]','DueAtUtc'],
   WorkerProcessedEvents:['PK EventId','ProcessedAtUtc'],
   WorkerOutbox:['PK EventId','EventType','PublishedAtUtc']
  }
 }
};
const expectedCount={identity:21,tracking:7,worker:4};
let total=0;
for(const [key,model] of Object.entries(groups)){
 const source=fs.readFileSync(path.join(root,model.context),'utf8');
 const actual=[...source.matchAll(/\.ToTable\("([^"]+)"\)/g)].map(m=>m[1]);
 const names=Object.keys(model.columns);
 if(actual.length!==names.length||actual.some(n=>!names.includes(n))||names.some(n=>!actual.includes(n)))
  throw Error('EF Core table mismatch '+key+': actual='+actual.join(',')+' expected='+names.join(','));
 if(actual.length!==expectedCount[key])throw Error('EF Core count mismatch '+key);
 total+=actual.length;
}
if(total!==32)throw Error('Expected 32 mapped tables after team merge, got '+total);
const refs=[
 ['identity','Users','Id','UserProfiles','UserId','1:1'],
 ['identity','Users','Id','RefreshTokens','UserId','1:N'],
 ['identity','Users','Id','ReminderPreferences','UserId','1:1'],
 ['identity','Users','Id','UserNotifications','UserId','1:N'],
 ['identity','MealPlans','Id','MealPlanDays','MealPlanId','1:N'],
 ['identity','MealPlanDays','Id','PlannedMeals','MealPlanDayId','1:N'],
 ['identity','MealLogs','Id','MealLogItems','MealLogId','1:N'],
 ['identity','FmdCycles','Id','FmdCycleDays','FmdCycleId','1:N'],
 ['tracking','AdherenceScores','Id','ScoreDimensions','AdherenceScoreId','1:N']
];
for(const [k,model] of Object.entries(groups)){
 const code=fs.readFileSync(path.join(root,model.context),'utf8');
 const actual=(code.match(/\.HasForeignKey(?:<[^>]+>)?\s*\(/g)||[]).length;
 const expected=refs.filter(r=>r[0]===k).length;
 if(actual!==expected)throw Error('EF Core local FK mismatch '+k+': actual='+actual+' expected='+expected);
}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function create(name,W,H,draw){
 const cells=[],links=[];let seq=2;
 const v=(x,y,w,h,value,style)=>{
  const id='db'+(++seq);
  cells.push('<mxCell id="'+id+'" value="'+esc(value)+'" style="'+esc(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
  return id;
 };
 const line=(a,b)=>{
  const id='db'+(++seq);
  links.push('<mxCell id="'+id+'" edge="1" source="'+a+'" target="'+b+'" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=#222222;strokeWidth=4;endArrow=block;endFill=1;exitX=1;exitY=0.5;exitPerimeter=0;entryX=0;entryY=0.5;entryPerimeter=0" parent="1"><mxGeometry relative="1" as="geometry"/></mxCell>');
 };
 const box=(x,y,w,h,value,opts={})=>v(x,y,w,h,value,'rounded=0;html=1;whiteSpace=wrap;strokeColor=#444444;strokeWidth='+(opts.stroke||2)+';fillColor='+(opts.fill||'#FFFFFF')+';fontFamily=Arial;fontColor=#222222;fontSize='+(opts.size||28)+';fontStyle='+(opts.bold===false?'0':'1')+';align=center;verticalAlign=middle;spacing=9;');
 const text=(x,y,w,h,value,size=30)=>v(x,y,w,h,value,'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontFamily=Arial;fontColor=#222222;fontSize='+size+';fontStyle=1;align=left;verticalAlign=middle;spacing=4;');
 const frame=(x,y,w,h,value)=>v(x,y,w,h,value,'rounded=0;html=1;whiteSpace=wrap;strokeColor=#888888;strokeWidth=3;dashed=1;fillColor=none;fontFamily=Arial;fontColor=#222222;fontSize=32;fontStyle=1;align=left;verticalAlign=top;spacing=18;');
 draw({box,text,frame,line});
 const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="'+esc(name)+'" id="'+esc(name)+'"><mxGraphModel page="1" grid="1" gridSize="10" pageWidth="'+W+'" pageHeight="'+H+'" pageScale="1" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+links.join('')+cells.join('')+'</root></mxGraphModel></diagram></mxfile>';
 const dest=path.join(base,name+'.drawio');fs.writeFileSync(dest,xml,'utf8');
 console.log('FULL_PHYSICAL_VIEW',name,'mappedTables='+total,'localFKs='+refs.length,'edges='+links.length,'file='+dest);
}
create('06-full-physical-database',14800,5360,({box,text,frame})=>{
 text(100,35,14000,110,'CURRENT PHYSICAL TABLE CATALOG | 32 MAPPED EF CORE TABLES',62);
 text(110,155,14100,115,'3 real SQL Server databases. Selected entity columns shown; all 9 enforced SQL FKs are drawn in the separate 17-physical-sql-fk-audit view.',30);
 frame(80,330,7950,4770,'IDENTITY + PLANNING / FMD  |  LongevityDietDb  |  21 tables');
 frame(8150,330,3580,4770,'TRACKING  |  LongevityTrackingDb  |  7 tables');
 frame(11840,330,2860,4770,'WORKER  |  LongevityWorkerDb  |  4 tables');
 for(const [key,m] of Object.entries(groups)){
  const names=Object.keys(m.columns),cols=key==='identity'?3:2;
  const startX=key==='identity'?230:key==='tracking'?8250:11900;
  const deltaX=key==='identity'?2550:key==='tracking'?1740:1390;
  const startY=key==='identity'?595:key==='tracking'?770:900;
  const deltaY=key==='identity'?605:key==='tracking'?1000:1200;
  const width=key==='identity'?2310:key==='tracking'?1640:1320;
  names.forEach((name,i)=>{
   const x=startX+(i%cols)*deltaX,y=startY+Math.floor(i/cols)*deltaY;
   box(x,y,width,492,'', {bold:false});
   box(x+3,y+3,width-6,96,name,{fill:'#EDEDED',size:key==='worker'?30:33});
   m.columns[name].forEach((row,j)=>text(x+24,y+112+j*76,width-48,64,row,26));
  });
 }
 text(130,5190,14300,96,'PK = primary key | FK = actual SQL FK | [logical] = application-level reference only. Independent tables do not receive invented FKs.',28);
});
create('17-physical-sql-fk-audit',7000,500+refs.length*290,({box,text,line})=>{
 text(120,25,6700,105,'CURRENT SQL FK AUDIT | 9 ENFORCED RELATIONSHIPS',54);
 text(120,145,6600,80,'One relationship per row. Left = SQL parent PK; right = child FK. No cross-database or Redis references.',30);
 for(let i=0;i<refs.length;i++){
  const [owner,parent,parentCol,child,childCol,cardinality]=refs[i],y=340+i*290;
  const a=box(190,y,2650,194,groups[owner].database+' | '+parent+'.'+parentCol,{fill:'#EFEFEF',size:30});
  const b=box(4170,y,2640,194,child+'.'+childCol+' | '+cardinality,{size:30});
  line(a,b);
 }
});
const manifest={scope:'CURRENT_EF_MAPPED',tableCount:total,localFkCount:refs.length,groupCounts:expectedCount,relationships:refs.map(([owner,parent,parentKey,child,childKey,cardinality])=>({owner,parent,parentKey,child,childKey,cardinality}))};
fs.writeFileSync(path.join(base,'physical-model-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
