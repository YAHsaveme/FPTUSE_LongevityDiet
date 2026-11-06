'use strict';
// ONE unified physical/operational ERD. No fake database foreign keys, invented
// node hubs, artificial domain columns or separate connector-only ledger.
// Graphviz-computed orthogonal waypoints are saved as editable Draw.io edges.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const schema=JSON.parse(fs.readFileSync(path.join(root,'scripts/current-physical-schema.json'),'utf8'));
const layout=JSON.parse(fs.readFileSync(path.join(root,'scripts/unified-erd-layout.json'),'utf8'));
const groups=schema.groups, refs=schema.refs, source={};
for(const [database,info] of Object.entries(groups)){
 const text=fs.readFileSync(path.join(root,info.context),'utf8');
 const mappings=[...text.matchAll(/\.ToTable\("([^"]+)"\)/g)].map(m=>m[1]);
 const expected=Object.keys(info.columns);
 if(expected.length!==mappings.length||expected.some(n=>!mappings.includes(n)))
  throw Error('EF mapped tables changed in '+database);
 const count=(text.match(/\.HasForeignKey(?:<[^>]+>)?\s*\(/g)||[]).length;
 if(count!==refs.filter(r=>r[0]===database).length)throw Error('Physical SQL FK drift in '+database);
 for(const [name,columns] of Object.entries(info.columns)){
  if(source[name])throw Error('Duplicate EF table '+name);
  source[name]={database,columns};
 }
}
const relationshipDefs=[
 ['Users','UserProfiles','sql','1:1','Users.Id = UserProfiles.UserId'],
 ['Users','RefreshTokens','sql','1:N','Users.Id = RefreshTokens.UserId'],
 ['Users','ReminderPreferences','sql','1:1','Users.Id = ReminderPreferences.UserId'],
 ['Users','UserNotifications','sql','1:N','Users.Id = UserNotifications.UserId'],
 ['UserProfiles','UserFoodPreferences','logical','','same UserId; no SQL FK'],
 ['UserProfiles','UserDietaryPreferences','logical','','same UserId; no SQL FK'],
 ['UserDietaryPreferences','MealPlans','logical','','same UserId; no SQL FK'],
 ['MealPlans','MealPlanDays','sql','1:N','MealPlans.Id = MealPlanDays.MealPlanId'],
 ['MealPlanDays','PlannedMeals','sql','1:N','MealPlanDays.Id = PlannedMeals.MealPlanDayId'],
 ['PlannedMeals','MealReplacementHistories','logical','','MealReplacementHistory.PlannedMealId; not SQL FK'],
 ['PlannedMeals','RecommendationFeedbacks','logical','','optional RecommendationFeedback.PlannedMealId'],
 ['Users','MealLogs','logical','','Users.Id = MealLogs.UserId; not SQL FK'],
 ['MealLogs','MealLogItems','sql','1:N','MealLogs.Id = MealLogItems.MealLogId'],
 ['MealLogs','EatingWindowSnapshots','logical','','same UserId and LocalDate; not SQL FK'],
 ['Users','FmdSafetyAssessments','logical','','same UserId; not SQL FK'],
 ['FmdSafetyAssessments','FmdCycles','logical','','same UserId; safety eligibility context'],
 ['FmdCycles','FmdCycleDays','sql','1:N','FmdCycles.Id = FmdCycleDays.FmdCycleId'],
 ['FmdSafetyAssessments','FmdEducationAcknowledgements','logical','','same UserId; not SQL FK'],
 ['Users','ActivityGoals','logical','','Users.Id = ActivityGoals.UserId across databases'],
 ['ActivityGoals','ActivityLogs','logical','','same UserId; not SQL FK'],
 ['ActivityLogs','TrackingOutbox','event','','activity change event produced by TrackingService'],
 ['TrackingOutbox','TrackingScoreSignals','event','','TrackingOutbox.EventId = TrackingScoreSignal.SourceEventId'],
 ['TrackingScoreSignals','AdherenceScores','logical','','same UserId and LocalDate; score input context'],
 ['AdherenceScores','ScoreDimensions','sql','1:N','AdherenceScores.Id = ScoreDimensions.AdherenceScoreId'],
 ['AdherenceScores','ScoreConfigurationVersions','logical','','AdherenceScores.Version uses ScoreConfigurationVersions.Version'],
 ['Users','IdentityOutbox','logical','','Users.Id = IdentityOutbox.UserId; not SQL FK'],
 ['IdentityOutbox','ReminderSchedules','event','','identity reminder change event -> Worker schedule'],
 ['ReminderSchedules','ReminderDispatchRecords','logical','','same UserId, Category and due-time context'],
 ['ReminderDispatchRecords','WorkerOutbox','event','','Worker emits notification-ready event'],
 ['WorkerOutbox','IdentityInbox','event','','event idempotency correlation through EventId'],
 ['IdentityOutbox','WorkerProcessedEvents','event','','Worker processed identity event by EventId']
];
const tableNames=Object.keys(source);
if(tableNames.length!==32||refs.length!==9||Object.keys(layout.nodes).length!==32)
 throw Error('Physical source/model/layout coverage drift');
const catalog=new Map(),counts={sql:0,logical:0,event:0};
for(const [a,b,type,cardinality,reason] of relationshipDefs){
 if(!source[a]||!source[b]||!layout.nodes[a]||!layout.nodes[b])throw Error('Phantom relationship '+a+' -> '+b);
 if(catalog.has(a+'|'+b))throw Error('Repeated relationship '+a+' -> '+b);
 if(!(type in counts))throw Error('Unsupported relation type '+type);
 if(type==='sql'&&!refs.some(r=>r[1]===a&&r[3]===b&&r[5]===cardinality))
  throw Error('False physical FK '+a+' -> '+b);
 counts[type]++;
 catalog.set(a+'|'+b,{a,b,type,cardinality,reason});
}
if(counts.sql!==9||counts.logical!==16||counts.event!==6||layout.edges.length!==31)
 throw Error('Unexpected SQL/logical/event relationship totals');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const vertices=[],edges=[],keyToId=new Map();let counter=1;
function vertex(key,x,y,w,h,value,style){
 const id='erd'+(++counter);
 vertices.push('<mxCell id="'+id+'" value="'+esc(value)+'" style="'+esc(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
 if(key)keyToId.set(key,id);
 return id;
}
const w=layout.width,h=layout.height;
const plain='text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontFamily=Arial;fontColor=#233951;align=left;verticalAlign=middle;';
vertex(null,180,65,w-360,155,'Database Diagram  |  FULL CURRENT ERD',plain+'fontSize=96;fontStyle=1;');
vertex(null,180,225,w-360,105,
 'One connected relationship tree  |  32 real EF Core tables  |  3 SQL databases  |  9 enforced foreign keys',
 plain+'fontSize=48;');
const legend=[
 {text:'SQL FK  /  Crow\'s Foot  /  1:1 or 1:N  /  9',fill:'#EAF2FC',border:'#164B78'},
 {text:'Shared key or business association  /  NOT FK  /  16',fill:'#FFF6E5',border:'#B2862E'},
 {text:'Event / Outbox / Inbox lineage  /  NOT FK  /  6',fill:'#F5EDFA',border:'#805AB1'}
];
const lw=Math.floor((w-460)/3);
legend.forEach((v,i)=>vertex(null,180+i*(lw+40),340,lw,175,v.text,
 'rounded=1;arcSize=9;html=1;whiteSpace=wrap;strokeColor='+v.border+';strokeWidth=4;fillColor='+v.fill+';fontFamily=Arial;fontColor=#243952;fontSize=49;align=left;verticalAlign=middle;spacingLeft=36;'));
const dbColors={
 identity:{fill:'#E9F5EC',border:'#61947C',text:'LongevityDietDb  /  Identity, Planning, FMD'},
 tracking:{fill:'#E9F2FB',border:'#678BBA',text:'LongevityTrackingDb  /  Activity & Adherence'},
 worker:{fill:'#F2EDF9',border:'#9B7AB6',text:'LongevityWorkerDb  /  Background Worker'}
};
// Show the actual key that explains each important logical/event link;
// these are real C# properties, but NOT additional SQL foreign keys.
const relevantFields={
 RecommendationFeedbacks:[
  ['src/LongevityDiet.Domain/Entities/RecommendationAndReplacement.cs','public Guid? PlannedMealId','PlannedMealId? [logical]']],
 TrackingOutbox:[
  ['src/LongevityDiet.Tracking/TrackingOutboxEvent.cs','public Guid UserId','UserId [logical]']],
 TrackingScoreSignals:[
  ['src/LongevityDiet.Tracking/TrackingModels.cs','public Guid SourceEventId','SourceEventId [logical]'],
  ['src/LongevityDiet.Tracking/TrackingModels.cs','public DateOnly LocalDate','LocalDate']],
 AdherenceScores:[
  ['src/LongevityDiet.Tracking/TrackingModels.cs','public string Version','Version [logical]'],
  ['src/LongevityDiet.Tracking/TrackingModels.cs','public DateOnly LocalDate','LocalDate']],
 ReminderDispatchRecords:[
  ['src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs','public ReminderCategory Category','Category [logical]']],
 IdentityOutbox:[
  ['src/LongevityDiet.Domain/Entities/ReminderNotifications.cs','public Guid UserId','UserId [logical]']]
};
for(const [name,box] of Object.entries(layout.nodes)){
 const d=source[name];const color=dbColors[d.database];
 const supplementary=(relevantFields[name]||[]).map(([file,needle,display])=>{
  if(!fs.readFileSync(path.join(root,file),'utf8').includes(needle))
   throw Error('EF source property missing for '+name+': '+needle);
  return display;
 });
 const lines=d.columns.concat(supplementary).map(field=>{
  const linked=field.includes('[logical');
  let label=field.replace(/\s*\[logical[^\]]*\]/g,'');
  if(linked)label+='  (APP REF)';
  return field.startsWith('PK')||field.startsWith('FK')
    ?'<font color="#18704A"><b>'+label+'</b></font>'
    : linked?'<font color="#A26D24">'+label+'</font>':label;
 });
 const html='<b>'+name+'</b><br/><font color="#52718A">'+color.text+'</font><br/><font color="#ABB7C5">___________________________________</font><br/>'+lines.join('<br/>');
 const style='rounded=1;arcSize=10;html=1;whiteSpace=wrap;strokeColor='+color.border+';strokeWidth=3.5;fillColor='+color.fill+';fontFamily=Arial;fontColor=#1D3349;fontSize=56;align=left;verticalAlign=top;spacingLeft=30;spacingTop=28;spacingRight=20;';
 vertex(name,box.x,box.y,box.w,box.h,html,style);
}
function clamp(v){return Math.max(0,Math.min(1,v));}
for(const route of layout.edges){
 const r=catalog.get(route.source+'|'+route.target);
 if(!r)throw Error('Layout has unverified edge '+route.source+' -> '+route.target);
 const A=layout.nodes[route.source],B=layout.nodes[route.target];
 const p=route.points[0],q=route.points[route.points.length-1];
 const ex=clamp((p[0]-A.x)/A.w),ey=clamp((p[1]-A.y)/A.h);
 const tx=clamp((q[0]-B.x)/B.w),ty=clamp((q[1]-B.y)/B.h);
 const physical=r.type==='sql',event=r.type==='event';
 const color=physical?'#164B78':event?'#805AB1':'#B2862E';
 const marker=physical?'startArrow=ERmandOne;endArrow='+(r.cardinality==='1:1'?'ERmandOne':'ERmany')+';startFill=0;endFill=0;startSize=39;endSize=45;'
  :event?'startArrow=none;endArrow=block;endFill=0;endSize=27;'
  :'startArrow=none;endArrow=open;endFill=0;endSize=25;';
 const shortKey=()=>{const r0=r.reason;if(r0.includes('UserId')&&r0.includes('Category'))return 'UserId + Category';if(r0.includes('UserId')&&r0.includes('LocalDate'))return 'UserId + date';if(r0.includes('PlannedMealId'))return 'PlannedMealId';if(r0.includes('UserId'))return 'UserId';if(r0.includes('Version'))return 'Version';if(r0.includes('LocalDate'))return 'LocalDate';if(r0.includes('Due'))return 'due-time';return 'business key';};
 const edgeLabel=physical?'':event?(r.reason.includes('EventId')?'EVENT: EventId':'EVENT'):'APP: '+shortKey();
 const style='edgeStyle=segmentEdgeStyle;rounded=0;orthogonal=1;html=1;strokeColor='+color+';strokeWidth='+(physical?9:event?7:6)+';'+(physical?'':event?'dashed=1;dashPattern=2 10;':'dashed=1;dashPattern=17 11;')+marker+
 'fontColor=#000000;fontSize=39;fontStyle=1;labelBackgroundColor=#FFFFFF;align=center;verticalAlign=middle;spacing=5;exitX='+ex.toFixed(4)+';exitY='+ey.toFixed(4)+';exitPerimeter=0;entryX='+tx.toFixed(4)+';entryY='+ty.toFixed(4)+';entryPerimeter=0;';
 const points=[];
 for(const xy of route.points.slice(1,-1))if(!points.length||points.at(-1)[0]!==xy[0]||points.at(-1)[1]!==xy[1])points.push(xy);
 const way=points.length?'<Array as="points">'+points.map(xy=>'<mxPoint x="'+xy[0]+'" y="'+xy[1]+'"/>').join('')+'</Array>':'';
 const id='rel'+(++counter);
 edges.push('<mxCell id="'+id+'" value="'+esc(edgeLabel)+'" edge="1" source="'+keyToId.get(route.source)+'" target="'+keyToId.get(route.target)+'" style="'+esc(style)+'" parent="1"><mxGeometry relative="1" as="geometry">'+way+'</mxGeometry></mxCell>');
}
vertex(null,180,h-490,w-360,330,
 '<b>HOW TO READ:</b> Follow relationships from Users into profile, meal planning, meal logs, FMD, activity and reminder events. PK = primary key, FK = SQL-enforced foreign key, APP REF = key present in the app but not SQL-enforced.<br/>'+
 '<b>ACCURACY:</b> All 32 mapped tables are shown with selected key fields; full column definitions are in the EF Core models. No decorative domain dividers, invented SQL links or pseudo-hubs.',
 'rounded=1;html=1;whiteSpace=wrap;strokeColor=#A9BCCE;strokeWidth=3;fillColor=#F4F8FC;fontFamily=Arial;fontColor=#3C5065;fontSize=43;align=left;verticalAlign=middle;spacing=34;');
const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="Database Diagram" id="unified-current-erd"><mxGraphModel page="1" grid="1" gridSize="10" pageWidth="'+w+'" pageHeight="'+h+'" pageScale="1" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+edges.join('')+vertices.join('')+'</root></mxGraphModel></diagram></mxfile>';
const blackWhite=xml.replace(/fillColor=#[0-9a-fA-F]{6}/g,'fillColor=#FFFFFF').replace(/#[0-9a-fA-F]{6}/g,c=>c.toUpperCase()==='#FFFFFF'?'#FFFFFF':'#000000');
if(/#(?!000000\b|FFFFFF\b)[0-9a-fA-F]{6}/.test(blackWhite))throw Error('Color remained in ERD');
fs.writeFileSync(path.join(root,'docs/assignment/one-page/Database Diagram.drawio'),blackWhite,'utf8');
const summary={scope:'CURRENT_EF_MAPPED',tableCount:32,databaseCounts:{identity:21,tracking:7,worker:4},actualSqlFKs:9,logicalLinks:16,eventLinks:6,totalRelationships:31,noDividers:true,noPseudoHubs:true,relationships:relationshipDefs.map(([from,to,kind,cardinality,reason])=>({from,to,kind,cardinality,reason}))};
fs.writeFileSync(path.join(root,'scripts/unified-erd-manifest.json'),JSON.stringify(summary,null,2)+'\n','utf8');
console.log('UNIFIED_ERD_GENERATED',Object.keys(layout.nodes).length,'tables',edges.length,'native relationships');
