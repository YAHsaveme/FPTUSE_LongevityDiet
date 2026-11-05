// PRN232 LongevityDiet: FULL 18-table physical database ERD for Draw.io.
// Source of truth: actual EF Core DbContext.ToTable and HasForeignKey declarations.
// 7 Identity + 7 Tracking + 4 Worker tables; exactly 5 enforced SQL FKs.
// UserId in Tracking or Worker is an application-level user reference, NOT a SQL FK.
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'docs/assignment/one-page/06-full-physical-database.drawio');
const owners={
 identity:{
  code:'src/LongevityDiet.Repositories/LongevityDietDbContext.cs',
  db:'LongevityDietDb',
  tables:{
   Users:['PK Id','Email','PasswordHash','Role','Status'],
   UserProfiles:['PK/FK UserId','TimeZone','FoodPreference','ProfileCompleted'],
   RefreshTokens:['PK Id','FK UserId','TokenHash','ExpiresAt'],
   ReminderPreferences:['PK/FK UserId','OptedIn','ActivityEnabled','QuietStart'],
   UserNotifications:['PK Id','FK UserId','Category','Title'],
   IdentityOutbox:['PK Id','UserId [logical only]','EventType','PublishedAtUtc'],
   IdentityInbox:['PK EventId','ReceivedAtUtc']
  }
 },
 tracking:{
  code:'src/LongevityDiet.Tracking/TrackingDbContext.cs',
  db:'LongevityTrackingDb',
  tables:{
   ActivityLogs:['PK Id','UserId [logical only]','Kind','DurationMinutes'],
   ActivityGoals:['PK UserId [logical only]','WeeklyMinutesTarget','WeeklyStrengthSessionsTarget'],
   AdherenceScores:['PK Id','UserId [logical only]','Version [logical only]','Score'],
   ScoreDimensions:['PK Id','FK AdherenceScoreId','Code','WeightedScore'],
   ScoreConfigurationVersions:['PK Version','ActivityWeight','MealWeight','EatingWindowWeight'],
   TrackingScoreSignals:['PK Id','UserId [logical only]','SourceEventId','DimensionCode'],
   TrackingOutbox:['PK EventId','UserId [logical only]','EventType','PublishedAtUtc']
  }
 },
 worker:{
  code:'src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs',
  db:'LongevityWorkerDb',
  tables:{
   ReminderSchedules:['PK Id','UserId [logical only]','Category','NextDueUtc'],
   ReminderDispatchRecords:['PK Id','UserId [logical only]','DeduplicationKey','DueAtUtc'],
   WorkerProcessedEvents:['PK EventId','ProcessedAtUtc'],
   WorkerOutbox:['PK EventId','EventType','PublishedAtUtc']
  }
 }
};
for(const [owner,data] of Object.entries(owners)){
 const c=fs.readFileSync(path.join(root,data.code),'utf8');
 const real=[...c.matchAll(/\.ToTable\("([^"]+)"\)/g)].map(m=>m[1]);
 const expected=Object.keys(data.tables);
 if(real.length!==expected.length||real.some(t=>!expected.includes(t))||expected.some(t=>!real.includes(t)))
  throw Error('DbContext model drift '+owner+': actual='+real.join(', ')+'; diagram='+expected.join(', '));
}
const all=Object.values(owners).reduce((s,a)=>s+Object.keys(a.tables).length,0);
if(all!==18)throw Error('Expected 18 actual mapped tables; found '+all);
const E=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cells=[],edges=[],placed=new Map();let index=3;
const id=()=>('p'+index++);
function rect(x,y,w,h,value,opt={}){
 const k=id(),style='rounded=0;html=1;whiteSpace=wrap;fillColor='+(opt.fill||'#FFFFFF')+';strokeColor='+(opt.stroke||'#333333')+';strokeWidth='+(opt.width||3)+';fontColor=#222222;fontFamily=Arial;fontSize='+(opt.font||30)+';fontStyle='+(opt.bold===false?'0':'1')+';align='+(opt.align||'center')+';verticalAlign=middle;spacing=8;shadow=0;';
 cells.push('<mxCell id="'+k+'" value="'+E(value)+'" style="'+E(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
 return k;
}
function text(x,y,w,h,value,sz=29,bold=false){
 const k=id(),style='text;html=1;whiteSpace=wrap;fillColor=none;strokeColor=none;fontColor=#333333;fontFamily=Arial;fontSize='+sz+';fontStyle='+(bold?'1':'0')+';align=left;verticalAlign=middle;spacing=2;';
 cells.push('<mxCell id="'+k+'" value="'+E(value)+'" style="'+E(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
}
function frame(x,y,w,h,value){
 const k=id(),style='rounded=0;html=1;whiteSpace=wrap;fillColor=none;strokeColor=#999999;strokeWidth=3;dashed=1;dashPattern=10 8;align=left;verticalAlign=top;spacing=18;fontFamily=Arial;fontSize=35;fontColor=#333333;fontStyle=1;';
 cells.unshift('<mxCell id="'+k+'" value="'+E(value)+'" style="'+E(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
}
function table(owner,name,x,y){
 const rows=owners[owner].tables[name],w=1210,h=472;
 const k=rect(x,y,w,h,'',{bold:false});placed.set(owner+'.'+name,{id:k,x,y,w,h});
 rect(x+3,y+3,w-6,98,name,{fill:'#EDEDED',font:36,width:1});
 rows.forEach((field,i)=>text(x+34,y+117+i*62,w-60,58,field,29,i===0));
}
function relation(a,b,sourcePoint,targetPoint,way=[],one=false){
 const A=placed.get(a),B=placed.get(b);if(!A||!B)throw Error('Unknown SQL relation '+a+' -> '+b);
 const style='edgeStyle=segmentEdgeStyle;rounded=0;html=1;strokeColor=#222222;strokeWidth=4;startArrow=ERone;endArrow='+(one?'ERone':'ERmany')+';endFill=1;exitX='+sourcePoint[0]+';exitY='+sourcePoint[1]+';exitPerimeter=0;entryX='+targetPoint[0]+';entryY='+targetPoint[1]+';entryPerimeter=0;';
 const pts=way.length?'<Array as="points">'+way.map(p=>'<mxPoint x="'+p[0]+'" y="'+p[1]+'"/>').join('')+'</Array>':'';
 edges.push('<mxCell id="'+id()+'" value="" style="'+E(style)+'" edge="1" parent="1" source="'+A.id+'" target="'+B.id+'"><mxGeometry relative="1" as="geometry">'+pts+'</mxGeometry></mxCell>');
}
const W=9350,H=4280;
text(150,48,8900,130,'FULL PHYSICAL ERD | 18 ACTUAL EF CORE TABLES',67,true);
text(165,190,8870,80,'Three SQL Server catalogs, one host. Solid relationship = enforced local SQL foreign key; unconnected means NO SQL FK in current EF Core model.',30);
frame(90,335,2920,3575,'IDENTITY | '+owners.identity.db+' | 7 tables');
frame(3140,335,2920,3575,'TRACKING | '+owners.tracking.db+' | 7 tables');
frame(6190,335,2935,3575,'WORKER | '+owners.worker.db+' | 4 tables');
const coord={
 'identity.Users':[300,650], 'identity.UserProfiles':[1760,650],
 'identity.RefreshTokens':[300,1440],'identity.ReminderPreferences':[1760,1440],
 'identity.UserNotifications':[300,2230],'identity.IdentityOutbox':[1760,2230],
 'identity.IdentityInbox':[1030,3020],
 'tracking.ActivityLogs':[3320,650],'tracking.ActivityGoals':[4800,650],
 'tracking.AdherenceScores':[3320,1440],'tracking.ScoreDimensions':[4800,1440],
 'tracking.ScoreConfigurationVersions':[3320,2230],'tracking.TrackingScoreSignals':[4800,2230],
 'tracking.TrackingOutbox':[4050,3020],
 'worker.ReminderSchedules':[6360,990],'worker.ReminderDispatchRecords':[7840,990],
 'worker.WorkerProcessedEvents':[6360,2020],'worker.WorkerOutbox':[7840,2020]
};
for(const [owner,data] of Object.entries(owners))
 for(const name of Object.keys(data.tables)){
  const p=coord[owner+'.'+name];if(!p)throw Error('Unplaced '+owner+'.'+name);
  table(owner,name,p[0],p[1]);
 }
// Exactly five EF Core foreign keys, and no others.
const identityCode=fs.readFileSync(path.join(root,owners.identity.code),'utf8');
const trackingCode=fs.readFileSync(path.join(root,owners.tracking.code),'utf8');
for(const property of ['HasForeignKey<UserProfile>','HasForeignKey<ReminderPreference>','HasForeignKey(n => n.UserId)','HasForeignKey(x => x.UserId)'])
 if(!identityCode.includes(property))throw Error('SQL FK contract missing '+property);
if(!trackingCode.includes('HasForeignKey(d => d.AdherenceScoreId)'))throw Error('Tracking FK contract missing');
relation('identity.Users','identity.UserProfiles',[1,.35],[0,.35],[],true);
relation('identity.Users','identity.RefreshTokens',[.20,1],[.20,0],[],false);
relation('identity.Users','identity.ReminderPreferences',[.85,1],[.25,0],[[1330,1260],[2060,1260]],true);
relation('identity.Users','identity.UserNotifications',[0,.55],[0,.35],[[205,915],[205,2395]],false);
relation('tracking.AdherenceScores','tracking.ScoreDimensions',[1,.5],[0,.5],[],false);
text(190,4015,8800,74,'PK = primary key | FK = enforced SQL foreign key | UserId [logical only] = application ownership, NOT cross-database FK.',29,true);
text(190,4100,8810,65,'IdentityOutbox/Inbox, TrackingOutbox and WorkerOutbox/ProcessedEvents are event bookkeeping tables. Their relationships run through Redis, not SQL FKs.',27);
const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="All 18 mapped tables" id="18-actual-db-mapping"><mxGraphModel dx="1300" dy="860" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="0" page="1" pageScale="1" pageWidth="'+W+'" pageHeight="'+H+'" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+edges.join('')+cells.join('')+'</root></mxGraphModel></diagram></mxfile>';
fs.writeFileSync(dest,xml,'utf8');
console.log('FULL_DB_DRAWIO_SUCCESS tables='+all+' FK='+edges.length+' native_cells='+cells.length+' file='+dest);
