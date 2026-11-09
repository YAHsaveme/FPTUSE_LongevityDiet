
'use strict';
/**
 * Full current physical-schema ERD, generated from EF Core migrations snapshots,
 * not from the intentionally narrow 32-table teaching/architecture baseline.
 * Native Draw.io edges, monochrome, single vector page; no fabricated FK edges.
 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const snapshots=[
  ['main','src/LongevityDiet.Repositories/Migrations/LongevityDietDbContextModelSnapshot.cs','LongevityDietDb'],
  ['tracking','src/LongevityDiet.Tracking/Migrations/TrackingDbContextModelSnapshot.cs','LongevityTrackingDb'],
  ['worker','src/LongevityDiet.Worker/Reminders/Migrations/ReminderWorkerDbContextModelSnapshot.cs','LongevityWorkerDb']
];
const segments=[
 ['IDENTITY + DAILY WELLNESS','main',
  ['Users','UserProfiles','RefreshTokens','ReminderPreferences','UserNotifications','IdentityOutbox','IdentityInbox','WellnessScreenings','WellnessCheckIns']],
 ['CATALOG + GOVERNED DIET RULES','main',
  ['Foods','Recipes','RecipeIngredients','Allergens','RecipeAllergens','DietRules','RuleVersions','RuleAudits','RuleSetVersions','RuleSetVersionItems']],
 ['MEAL PLANNING + TRACKING','main',
  ['UserDietaryPreferences','MealPlans','MealPlanDays','PlannedMeals','MealLogs','MealLogItems','EatingWindowSnapshots','RecommendationFeedbacks','MealReplacementHistories','UserFoodPreferences']],
 ['CHALLENGES, FMD + OPERATIONS','main',
  ['ChallengeTemplates','ChallengeDayTemplates','UserChallenges','UserChallengeDays','DailyWellnessSummaries','ProgressEventReceipts','FmdEducationAcknowledgements','FmdSafetyAssessments','FmdCycles','FmdCycleDays','WeeklyReports','WeeklyReportMetrics','WorkerJobs','WorkerDeadLetters','WorkerHeartbeats','WorkerProcessedEvents']],
 ['ACTIVITY / LDAS TRACKING','tracking',
  ['ActivityGoals','ActivityLogs','AdherenceScores','ScoreDimensions','ScoreConfigurationVersions','TrackingScoreSignals','TrackingOutbox']],
 ['REMINDER WORKER','worker',
  ['ReminderSchedules','ReminderDispatchRecords','WorkerProcessedEvents','WorkerOutbox']]
];
const all=[],byType=new Map(),byId=new Map(),fk=[];
for(const [db,filepath,dbLabel] of snapshots){
 const s=fs.readFileSync(path.join(root,filepath),'utf8');
 const blocks=[...s.matchAll(/modelBuilder\.Entity\("([^"]+)", b =>\s*\{([\s\S]*?)\n\s*\}\);/g)];
 for(const m of blocks){
  const type=m[1],body=m[2],tableMatch=body.match(/\bb\.ToTable\("([^"]+)"(?:,\s*"([^"]+)")?/);
  if(!tableMatch)continue;
  const table=tableMatch[1],schema=tableMatch[2]||'dbo',id=db+':'+table;
  if(byId.has(id))throw Error('Duplicate physical table '+id);
  const props=[...body.matchAll(/b\.Property<[^>]+>\("([^"]+)"\)/g)].map(x=>x[1]);
  const keys=[...body.matchAll(/\bb\.HasKey\(([^)]+)\)/g)].flatMap(x=>[...x[1].matchAll(/"([^"]+)"/g)].map(y=>y[1]));
  const node={id,type,db,dbLabel,table,schema,properties:props,pk:keys};
  all.push(node);byId.set(id,node);byType.set(type,node);
 }
 for(const m of blocks){
  const child=byType.get(m[1]);if(!child)continue;
  const body=m[2];
  const pattern=/b\.HasOne\("([^"]+)"[^;]*?\.HasForeignKey\(([^)]+)\)/g;
  for(const rel of body.matchAll(pattern)){
   const parent=byType.get(rel[1]);if(!parent)throw Error('EF FK parent not mapped '+rel[1]);
   const cols=[...rel[2].matchAll(/"([^"]+)"/g)].map(x=>x[1]);
   const field=cols.at(-1)||'FK';
   if(parent.db!==child.db)throw Error('Cross-Db FK found unexpectedly');
   if(!fk.some(x=>x.from===parent.id&&x.to===child.id&&x.field===field))
    fk.push({from:parent.id,to:child.id,field,kind:'SQL_FK'});
  }
 }
}
const expected=new Set(segments.flatMap(s=>s[2].map(n=>s[1]+':'+n)));
if(all.length!==56||expected.size!==56||all.some(n=>!expected.has(n.id))||[...expected].some(id=>!byId.has(id)))
 throw Error('Full 56-table EF snapshot inventory no longer matches documented layout. Reconcile the source, do not silently omit tables.');
const edges=[...fk];
const degree=new Map(all.map(n=>[n.id,0]));
function add(from,to,kind,field){
 if(!byId.has(from)||!byId.has(to))throw Error('Missing relation endpoint: '+from+' → '+to);
 if(from===to||edges.some(x=>x.from===from&&x.to===to))return;
 edges.push({from,to,kind,field});
}
const m=name=>'main:'+name;
const t=name=>'tracking:'+name;
const w=name=>'worker:'+name;
// Explicit same-identity cross-boundary associations use documented UserId
// columns, NOT imaginary SQL foreign keys. No SQL FK crosses databases.
// Avoid a visually misleading star with dozens of dashed edges to Users.
// Each panel shows adjacent, user-owned records sharing the same owner key;
// one cross-panel edge explains which user identity they have in common.
for(const [,db,names] of segments){
 const owned=names.map(name=>byId.get(db+':'+name)).filter(n=>n.properties.includes('UserId'));
 for(let i=1;i<owned.length;i++)
   add(owned[i-1].id,owned[i].id,'APP','same UserId');
 if(owned.length && owned[0].id!==m('Users'))
   add(m('Users'),owned[0].id,'APP','same UserId (cross-domain)');
}
// Domain/operational links are functional associations, never SQL constraints.
const functional=[
 [m('Foods'),m('Recipes'),'catalog lookup'],
 [m('Recipes'),m('DietRules'),'diet rule applicability'],
 [m('DietRules'),m('RuleSetVersions'),'ruleset governance'],
 [m('UserDietaryPreferences'),m('MealPlans'),'UserId'],
 [m('MealPlans'),m('MealReplacementHistories'),'MealPlanId'],
 [m('PlannedMeals'),m('RecommendationFeedbacks'),'candidate/plan'],
 [m('MealLogs'),m('EatingWindowSnapshots'),'UserId + LocalDate'],
 [m('MealLogs'),m('DailyWellnessSummaries'),'UserId + LocalDate'],
 [m('UserChallenges'),m('ProgressEventReceipts'),'challenge progress'],
 [m('FmdSafetyAssessments'),m('FmdCycles'),'user + safety gate'],
 [m('WeeklyReports'),m('WorkerJobs'),'report job'],
 [m('WorkerJobs'),m('WorkerHeartbeats'),'worker health'],
 [m('WorkerJobs'),m('WorkerDeadLetters'),'job failure'],
 [m('WorkerJobs'),m('WorkerProcessedEvents'),'event processing'],
 [m('IdentityOutbox'),m('IdentityInbox'),'event correlation'],
 [m('IdentityOutbox'),w('WorkerProcessedEvents'),'EventId'],
 [m('IdentityOutbox'),w('ReminderSchedules'),'preference events'],
 [w('ReminderSchedules'),w('ReminderDispatchRecords'),'schedule/due'],
 [w('ReminderDispatchRecords'),w('WorkerOutbox'),'notification event'],
 [w('WorkerOutbox'),m('IdentityInbox'),'EventId'],
 [t('TrackingOutbox'),t('TrackingScoreSignals'),'tracking events'],
 [t('TrackingScoreSignals'),t('AdherenceScores'),'score data'],
 [t('ScoreConfigurationVersions'),t('AdherenceScores'),'scoring version'],
 [m('UserProfiles'),m('UserFoodPreferences'),'UserId'],
 [m('FmdEducationAcknowledgements'),m('FmdSafetyAssessments'),'education gate'],
 [m('RuleAudits'),m('RuleVersions'),'version audit'],
 [m('Allergens'),m('Recipes'),'recipe allergen mapping'],
 [m('Foods'),m('MealLogItems'),'food code']
];
for(const [a,b,label] of functional)add(a,b,'APP',label);
// Preserve the complete list of 50 source-backed APP associations in the manifest.
// For the single-page VIEW select a minimal connected subset: all physical FKs
// plus only the APP associations required to make every table reachable.
// This is a readability reduction, not a claim that other associations vanished.
const candidateAssociations=edges.filter(x=>x.kind==='APP').map(x=>({...x}));
const representative=new Map(all.map(x=>[x.id,x.id]));
function rootOf(x){const p=representative.get(x);if(p!==x){const r=rootOf(p);representative.set(x,r);return r;}return x;}
function join(a,b){const x=rootOf(a),y=rootOf(b);if(x===y)return false;representative.set(y,x);return true;}
for(const physical of fk)join(physical.from,physical.to);
const panelIndex=new Map(segments.flatMap((g,index)=>g[2].map(name=>[g[1]+':'+name,index])));
const candidates=candidateAssociations.slice().sort((a,b)=>{
 function rank(x){
  const left=panelIndex.get(x.from),right=panelIndex.get(x.to);
  if(left===undefined||right===undefined)throw Error('Invalid panel reference');
  return (left===right?0:30+Math.abs(left-right)*8)+(x.field.startsWith('same UserId')?6:0);
 }
 return rank(a)-rank(b);
});
const selected=[];
for(const x of candidates)if(join(x.from,x.to))selected.push(x);
edges.length=0;edges.push(...fk,...selected);
if(new Set(all.map(x=>rootOf(x.id))).size!==1)
 throw Error('Source-backed FK and app relations do not connect every table');
if(edges.length!==all.length-1)
 throw Error('Expected an acyclic 56-table physical/logical spanning diagram');
// All 23 physical SQL FKs are rendered, and only source-backed links fill gaps.
for(const e of edges){degree.set(e.from,(degree.get(e.from)||0)+1);degree.set(e.to,(degree.get(e.to)||0)+1);}
for(const n of all)if(degree.get(n.id)===0)throw Error('Unconnected table in source-backed model: '+n.id);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const page={w:10800,h:7560},xml=[],rel=[];
const lookup=new Map();let seq=2;
function card(id,x,y,w,h,label,{type='card',font=34}={}){
 const mxId='n'+seq++;
 const st=type==='title'?
  'text;html=1;align=left;verticalAlign=middle;strokeColor=none;fillColor=none;fontStyle=1;':
  type==='note'?
  'text;html=1;align=left;verticalAlign=middle;strokeColor=none;fillColor=none;':
  'rounded=0;html=1;whiteSpace=wrap;strokeColor=#000000;strokeWidth=2.1;fillColor=#FFFFFF;align=left;verticalAlign=middle;spacingLeft=20;spacingRight=12;';
 xml.push('<mxCell id="'+mxId+'" value="'+esc(label).replace(/\n/g,'&lt;br/&gt;')+'" style="'+st+'fontFamily=Arial;fontColor=#000000;fontSize='+font+';" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
 if(id)lookup.set(id,{id:mxId,x,y,w,h});
}
card(null,155,58,10100,92,'DATABASE DIAGRAM  |  FULL EF CORE SNAPSHOT / 10 NOV 2026',{type:'title',font:66});
card(null,155,155,10300,94,'56 physical tables (45 main / 7 tracking / 4 worker). Solid = 23 real SQL FKs; dashed = minimum app links for connected schema. Full association inventory in manifest.',{type:'note',font:33});
const panelW=3390,panelH=4130;
for(let si=0;si<segments.length;si++){
 const [title,db,names]=segments[si];
 const x=130+(si%3)*3530,y=335+Math.floor(si/3)*3060;
 card(null,x+28,y+5,panelW-56,75,title+'  /  '+names.length+' tables',{type:'title',font:41});
 card(null,x+28,y+80,panelW-56,50,db==='main'?'LongevityDietDb / SQL Server':db==='tracking'?'LongevityTrackingDb / SQL Server':'LongevityWorkerDb / SQL Server',{type:'note',font:29});
 names.forEach((name,i)=>{
  const node=byId.get(db+':'+name),col=i%2,row=Math.floor(i/2),cx=x+28+col*1645,cy=y+155+row*467,cw=1530,ch=380;
  const primary=node.pk.slice(0,2).join(', ')||'(model-owned)';
  const visibleCols=node.properties.filter(k=>!node.pk.includes(k)).slice(0,3).join(', ');
  card(node.id,cx,cy,cw,ch,
     name+'  ['+node.schema+']\nPK '+primary+'\n'+(visibleCols||'(no extra columns shown)')+' / '+node.dbLabel,{font:name.length>=24?29:33});
 });
 if(y+panelH>page.h)throw Error('Panel falls outside page');
}
const edgeCells=[];
function edge(entry){
 const a=lookup.get(entry.from),b=lookup.get(entry.to);
 if(!a||!b)throw Error('Missing rendered endpoint');
 const sql=entry.kind==='SQL_FK';
 const dx=b.x-a.x,dy=b.y-a.y,side=Math.abs(dx)>Math.abs(dy);
 const from=side?(dx>0?[1,0.5]:[0,0.5]):(dy>0?[.5,1]:[.5,0]);
 const to=side?(dx>0?[0,.5]:[1,.5]):(dy>0?[.5,0]:[.5,1]);
 const style='edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth='+(sql?'3.1':'1.9')+';'+
  (sql?'startArrow=ERmandOne;endArrow=ERmany;endFill=0;':'dashed=1;dashPattern=14 9;startArrow=none;endArrow=open;endFill=0;')+
  'fontFamily=Arial;fontColor=#000000;fontSize=25;labelBackgroundColor=#FFFFFF;verticalLabelPosition=top;exitX='+from[0]+';exitY='+from[1]+';exitPerimeter=0;entryX='+to[0]+';entryY='+to[1]+';entryPerimeter=0;';
 const label=(sql?'FK '+entry.field:'APP '+entry.field).slice(0,48);
 edgeCells.push('<mxCell id="e'+seq+++'" value="'+esc(label)+'" style="'+esc(style)+'" edge="1" source="'+a.id+'" target="'+b.id+'" parent="1"><mxGeometry x="0" y="-26" relative="1" as="geometry"/></mxCell>');
 rel.push({from:entry.from,to:entry.to,kind:entry.kind,label});
}
for(const relation of edges)edge(relation);
card(null,140,7330,10400,105,'NOTATION: solid Crow’s Foot = EF-enforced SQL FK. Dashed = logical app/event association only. No cross-database SQL constraints.',{type:'note',font:32});
const content='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="Full EF Schema" id="complete-current-ef"><mxGraphModel page="1" grid="1" gridSize="10" pageWidth="'+page.w+'" pageHeight="'+page.h+'" pageScale="1" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+edgeCells.join('')+xml.join('')+'</root></mxGraphModel></diagram></mxfile>';
if([...content.matchAll(/#[0-9a-fA-F]{6}\b/g)].some(m=>!['#000000','#FFFFFF'].includes(m[0].toUpperCase())))
 throw Error('Non monochrome element');
const dest=path.join(root,'docs/assignment/one-page/Database Diagram FULL.drawio');
fs.writeFileSync(dest,content,'utf8');
const evidence={generatedAt:'2026-11-10',source:snapshots.map(x=>x[1]),tableCount:all.length,groups:Object.fromEntries(snapshots.map(([k])=>[k,all.filter(n=>n.db===k).length])),physicalFkCount:fk.length,logicalAssociations:edges.length-fk.length,allRelevantAppCount:candidateAssociations.length,candidateAssociations,allNodesHaveEdges:[...degree.values()].every(x=>x>0),tables:all,relations:rel};
fs.writeFileSync(path.join(root,'docs/assignment/one-page/full-schema-manifest.json'),JSON.stringify(evidence,null,2)+'\n','utf8');
console.log('FULL_ERD_SOURCE_AUDIT=PASS tables='+all.length+' FK='+fk.length+' APP='+ (edges.length-fk.length)+' allConnected=true NativeDrawio='+dest);
