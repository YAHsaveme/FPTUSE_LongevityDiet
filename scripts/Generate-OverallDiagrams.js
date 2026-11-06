// Generate the FOUR canonical overall, editable Draw.io diagrams.
// Source of truth: deployed Docker Compose ports, mapped EF Core tables, actual controllers.
// There are no synthetic SQL FKs or invented clinical microservices.
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'docs','assignment','one-page');
fs.mkdirSync(out,{recursive:true});
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const {groups,refs}=JSON.parse(fs.readFileSync(path.join(root,'scripts/current-physical-schema.json'),'utf8'));
const counts=Object.fromEntries(Object.entries(groups).map(([key,g])=>[key,Object.keys(g.columns).length]));
if(JSON.stringify(counts)!==JSON.stringify({identity:21,tracking:7,worker:4})||refs.length!==9)throw Error('Physical schema source drift');
let total=0;
for(const [key,meta] of Object.entries(groups)){
 const model=fs.readFileSync(path.join(root,meta.context),'utf8');
 const found=[...model.matchAll(/\.ToTable\("([^"]+)"\)/g)].map(m=>m[1]).sort();
 const expected=Object.keys(meta.columns).sort();
 if(JSON.stringify(found)!==JSON.stringify(expected))throw Error('Mapped tables changed '+key);
 total+=found.length;
 const realFKs=(model.match(/\.HasForeignKey(?:<[^>]+>)?\s*\(/g)||[]).length;
 if(realFKs!==refs.filter(r=>r[0]===key).length)throw Error('Real FK count drift '+key);
}
if(total!==32)throw Error('Missing/extra mapped table');
const controllers=[
 ['Auth','AuthController','AuthenticationService','User + Token repositories','LongevityDietDb'],
 ['Profile','ProfileController','ProfileService','UserProfile repository','LongevityDietDb'],
 ['Reminders','ReminderNotificationsController','ReminderService + IdentityRedisBridge','Identity outbox / inbox','LongevityDietDb + Redis'],
 ['Activity','TrackingController','TrackingService','TrackingDbContext','LongevityTrackingDb'],
 ['Activity advice','RecommendationController','ActivityCoach gRPC client','gRPC adapter (stateless)','Recommendation gRPC'],
 ['Meal plans','MealPlansController','MealPlanningService','MealPlanRepository','LongevityDietDb'],
 ['Meal logs','MealLogsController','MealTrackingService','MealLogRepository','LongevityDietDb'],
 ['Eating window','EatingWindowController','MealTrackingService','EatingWindowRepository','LongevityDietDb'],
 ['Recommendations','RecommendationsController','RecommendationService + gRPC client','RecommendationRepository','LongevityDietDb + gRPC'],
 ['FMD','FmdController','FmdService','FmdRepository','LongevityDietDb']
];
const controllerDir=path.join(root,'src','LongevityDiet.API','Controllers');
for(const c of controllers)if(!fs.existsSync(path.join(controllerDir,c[1]+'.cs')))throw Error('Missing actual controller '+c[1]);
const compose=fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8');
for(const part of ['5173}:80','8080}:8080','8081}:8081','6379}:6379','14330}:1433'])
 if(!compose.includes(part))throw Error('Compose port mapping mismatch '+part);
const style={
 frame:'rounded=1;arcSize=12;html=1;whiteSpace=wrap;strokeColor=#A2ADB8;strokeWidth=3;dashed=1;fillColor=none;fontFamily=Arial;fontColor=#344054;fontSize=34;align=left;verticalAlign=top;spacing=20;',
 card:'rounded=1;arcSize=12;html=1;whiteSpace=wrap;strokeColor=#98A5B3;strokeWidth=2.5;fillColor=#FFFFFF;fontFamily=Arial;fontColor=#132238;fontSize=31;align=center;verticalAlign=middle;spacing=12;',
 sky:'rounded=1;arcSize=12;html=1;whiteSpace=wrap;strokeColor=#4D78AC;strokeWidth=3;fillColor=#E9F2FC;fontFamily=Arial;fontColor=#132238;fontSize=31;align=center;verticalAlign=middle;spacing=12;',
 green:'rounded=1;arcSize=12;html=1;whiteSpace=wrap;strokeColor=#5E9076;strokeWidth=3;fillColor=#E8F4EC;fontFamily=Arial;fontColor=#193A29;fontSize=31;align=center;verticalAlign=middle;spacing=12;',
 amber:'rounded=1;arcSize=12;html=1;whiteSpace=wrap;strokeColor=#AF9059;strokeWidth=3;fillColor=#FFF5E0;fontFamily=Arial;fontColor=#3C2C14;fontSize=29;align=center;verticalAlign=middle;spacing=10;',
 title:'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontFamily=Arial;fontColor=#17212F;fontSize=65;fontStyle=1;align=left;verticalAlign=middle;',
 sub:'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontFamily=Arial;fontColor=#3C495A;fontSize=29;align=left;verticalAlign=middle;',
 caption:'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontFamily=Arial;fontColor=#3C495A;fontSize=25;align=left;verticalAlign=middle;',
 table:'rounded=0;html=1;whiteSpace=wrap;strokeColor=#8393A5;strokeWidth=2;fillColor=#FFFFFF;fontFamily=Arial;fontColor=#152238;fontSize=24;align=left;verticalAlign=top;spacing=18;'
};
class Diagram{
 constructor(name,w,h){this.name=name;this.w=w;this.h=h;this.v=[];this.e=[];this.nodes=new Map();this.seq=0}
 n(key,x,y,w,h,label,kind='card',extra=''){
  const id='o'+(++this.seq);
  if(key&&this.nodes.has(key))throw Error('Duplicate ID '+key);
  let css=style[kind]||style.card;if(extra)css+=extra;
  this.v.push('<mxCell id="'+id+'" value="'+esc(String(label).replace(/\n/g,'<br/>'))+'" style="'+esc(css)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
  if(key)this.nodes.set(key,{id,x,y,w,h,label});
  return id;
 }
 edge(from,to,{fromPoint=[.5,1],toPoint=[.5,0],via=[],dashed=false,color='#46586E',size=3}={}){
  const a=this.nodes.get(from),b=this.nodes.get(to);
  if(!a||!b)throw Error('Unresolved directed edge '+from+' -> '+to);
  const way=via.length?'<Array as="points">'+via.map(([x,y])=>'<mxPoint x="'+x+'" y="'+y+'"/>').join('')+'</Array>':'';
  const css='edgeStyle=segmentEdgeStyle;rounded=0;orthogonal=1;html=1;strokeColor='+color+';strokeWidth='+size+';'+(dashed?'dashed=1;dashPattern=9 6;':'')+'endArrow=block;endFill=1;exitX='+fromPoint[0]+';exitY='+fromPoint[1]+';exitPerimeter=0;entryX='+toPoint[0]+';entryY='+toPoint[1]+';entryPerimeter=0;';
  this.e.push('<mxCell id="o'+(++this.seq)+'" edge="1" source="'+a.id+'" target="'+b.id+'" style="'+esc(css)+'" parent="1"><mxGeometry relative="1" as="geometry">'+way+'</mxGeometry></mxCell>');
 }
 save(){
  const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="'+esc(this.name)+'" id="'+esc(this.name.replace(/\s/g,''))+'"><mxGraphModel page="1" grid="1" gridSize="10" pageWidth="'+this.w+'" pageHeight="'+this.h+'" pageScale="1" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+this.e.join('')+this.v.join('')+'</root></mxGraphModel></diagram></mxfile>';
  fs.writeFileSync(path.join(out,this.name+'.drawio'),xml,'utf8');
  console.log('OVERALL_DIAGRAM',this.name,'named_nodes='+this.nodes.size,'arrows='+this.e.length,'bytes='+xml.length);
 }
}
function title(g,s,description){g.n(null,110,45,g.w-220,115,s,'title');g.n(null,110,165,g.w-220,95,description,'sub');}
{
 const g=new Diagram('C0',7500,3150);
 title(g,'C0','SYSTEM CONTEXT | all real user roles and the complete LongevityDiet product boundary');
 g.n('member',420,780,1430,480,'MEMBER\nRegisters, plans meals, logs food and activity, views advice','sky');
 g.n('admin',420,1820,1430,430,'ADMINISTRATOR\nRole-authorized system user','sky');
 g.n('system',2630,690,4350,1560,'LONGEVITYDIET\n\nWeb experience + REST API + Activity Coaching + Planning + Meal Tracking\nRecommendation V2 + FMD + Reminders + Health Activity Tracking\n\nSingle product boundary, not separate external systems','green',
 'fontSize=46;');
 g.edge('member','system',{fromPoint:[1,.5],toPoint:[0,.27],via:[[2220,1020],[2220,1110]]});
 g.edge('admin','system',{fromPoint:[1,.5],toPoint:[0,.72],via:[[2240,2035],[2240,1810]]});
 g.n(null,360,2530,6550,310,'External provider assumptions: none added. Web, API, gRPC, Redis, SQL and Worker are internal containers shown in C1, not invented third-party systems.','amber');
 g.save();
}
{
 const g=new Diagram('C1',10800,4970);
 title(g,'C1','CONTAINERS | actual Docker Compose ports, data ownership and synchronous / event connections');
 g.n('member',230,740,1200,260,'MEMBER','sky');
 g.n('admin',230,1220,1200,260,'ADMIN','sky');
 g.n('web',1950,925,1620,400,'WEB / NGINX\ncontainer :80\nhost :5173','sky','fontSize=38;');
 g.n('api',4240,880,2200,485,'REST API (.NET)\ncontainer/host :8080\nJWT, Planning, Tracking, FMD','sky','fontSize=37;');
 g.n('grpc',7490,440,2440,425,'RECOMMENDATION gRPC\ncontainer/host :8081\nHTTP/2, stateless, NO DB','card','fontSize=36;');
 g.n('redis',7600,1660,2260,390,'REDIS STREAMS\ncontainer/host :6379\nbi-directional events','amber','fontSize=37;');
 g.n('worker',7660,2490,2160,400,'REMINDER WORKER\nno inbound HTTP port\nschedules + delivery status','card','fontSize=36;');
 g.n('identity',3700,3620,2110,400,'LongevityDietDb\nIdentity / Planning / FMD\nSQL Server container :1433','green','fontSize=35;');
 g.n('tracking',6000,3630,2090,395,'LongevityTrackingDb\nActivity + adherence\nSQL Server container :1433','green','fontSize=35;');
 g.n('workerdb',8220,3630,2170,395,'LongevityWorkerDb\nWorker + notification jobs\nSQL Server container :1433','green','fontSize=35;');
 g.n(null,230,4410,10280,320,'ONE SQL SERVER INSTANCE\nDocker host port :14330 -> container :1433 | Three separate database catalogs | Worker connects to its own Worker DB.\nArrow = request/dependency; dashed arrow = Redis event. Responses use the same request connection.','frame');
 g.edge('member','web',{fromPoint:[1,.55],toPoint:[0,.28]});
 g.edge('admin','web',{fromPoint:[1,.5],toPoint:[0,.76]});
 g.edge('web','api',{fromPoint:[1,.5],toPoint:[0,.5]});
 g.edge('api','grpc',{fromPoint:[1,.25],toPoint:[0,.58],via:[[6880,1001],[6880,688]]});
 g.edge('api','redis',{fromPoint:[1,.74],toPoint:[0,.28],via:[[6920,1239],[6920,1769]],dashed:true});
 g.edge('redis','api',{fromPoint:[0,.69],toPoint:[1,.90],via:[[6760,1929],[6760,1320]],dashed:true});
 g.edge('redis','worker',{fromPoint:[.30,1],toPoint:[.31,0],dashed:true});
 g.edge('worker','redis',{fromPoint:[.78,0],toPoint:[.78,1],dashed:true});
 g.edge('api','identity',{fromPoint:[.24,1],toPoint:[.5,0],via:[[4768,2670]],color:'#4E8C69'});
 g.edge('api','tracking',{fromPoint:[.84,1],toPoint:[.5,0],via:[[6088,2920],[7045,2920]],color:'#4E8C69'});
 g.edge('worker','workerdb',{fromPoint:[.57,1],toPoint:[.51,0],color:'#4E8C69'});
 g.save();
}
{
 const g=new Diagram('C2',11750,7620);
 title(g,'C2','COMPONENTS | 10 implemented REST controllers and their service / persistence paths; one API :8080');
 g.n('web',180,440,1530,260,'WEB / NGINX :80  |  host :5173','sky','fontSize=37;');
 g.n('gateway',145,805,11460,165,'API ROUTING / JWT / AUTHORIZATION / RATE LIMITING / OPENAPI :8080','sky','fontSize=37;');
 g.edge('web','gateway',{fromPoint:[.5,1],toPoint:[.13,0]});
 g.n('routing2',145,3840,11460,170,'API ROUTING CONTINUED (SAME .NET API CONTAINER)','sky','fontSize=37;');
 g.edge('gateway','routing2',{fromPoint:[1,.5],toPoint:[1,.5],via:[[11640,890],[11640,3925]],dashed:true});
 const W=2180,gap=145,x0=110;
 controllers.forEach((m,i)=>{
  const [domain,controller,service,repo,owner]=m;
  const idx=i%5,row=Math.floor(i/5);
  const x=x0+idx*(W+gap),y=row?4250:1160;
  const cid='controller'+i,sid='service'+i,rid='repo'+i,oid='owner'+i;
  g.n(cid,x,y,W,370,domain.toUpperCase()+' / '+controller,'card','fontSize=37;');
  g.n(sid,x,y+650,W,380,service,'sky','fontSize=36;');
  g.n(rid,x,y+1340,W,345,repo,'card','fontSize=34;');
  g.n(oid,x,y+1960,W,272,owner,'green','fontSize=34;');
  if(row===0)g.edge('gateway',cid,{fromPoint:[(x+W/2-145)/11460,1],toPoint:[.5,0]});
  else g.edge('routing2',cid,{fromPoint:[(x+W/2-145)/11460,1],toPoint:[.5,0]});
  g.edge(cid,sid);g.edge(sid,rid);g.edge(rid,oid,{color:'#4E8C69'});
 });
 g.n(null,150,6730,11450,530,'SHARED DEPENDENCIES (not extra API instances): ActivityCoach / Recommendation gRPC :8081 (stateless); Redis Streams :6379 <-> Reminder Worker; SQL: LongevityDietDb, LongevityTrackingDb, LongevityWorkerDb. Future clinical nutrition/check-in target is NOT deployed.','amber','fontSize=34;');
 g.save();
}
require('./Generate-UnifiedERD.js');
const manifest={
 status:'CURRENT_IMPLEMENTED_SOURCE',names:['C0','C1','C2','Database Diagram'],
 controllers:controllers.map(x=>({domain:x[0],controller:x[1],service:x[2],persistence:x[3],owner:x[4]})),
 mappedTableCount:total,tableGroups:counts,sqlForeignKeys:refs.length,
 realRelationships:refs.map(([owner,parent,parentColumn,child,childColumn,cardinality])=>({owner,parent,parentColumn,child,childColumn,cardinality})),
 labels:{C0:'C0',C1:'C1',C2:'C2',database:'Database Diagram'},
 databaseCardNames:Object.values(groups).flatMap(g=>Object.keys(g.columns)),
 ports:['5173:80','8080:8080','8081:8081','6379:6379','14330:1433']
};
fs.writeFileSync(path.join(root,'scripts','overall-diagram-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('OVERALL_FOUR_COMPLETE: 2 actors, 8 containers+3DB, 10 API controller/service lanes, 32 physical tables, 9 real FK arrows');
