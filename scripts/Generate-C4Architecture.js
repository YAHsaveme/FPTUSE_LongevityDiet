'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const out=path.join(root,'docs/assignment/one-page');
const compose=fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8');
const api=fs.readFileSync(path.join(root,'src/LongevityDiet.API/Program.cs'),'utf8');
const web=fs.readFileSync(path.join(root,'src/LongevityDiet.Web/nginx.conf'),'utf8');
const worker=fs.readFileSync(path.join(root,'src/LongevityDiet.Worker/Program.cs'),'utf8');
const grpc=fs.readFileSync(path.join(root,'src/LongevityDiet.Recommendation.Grpc/Program.cs'),'utf8');
const schema=JSON.parse(fs.readFileSync(path.join(root,'scripts/current-physical-schema.json'),'utf8'));
const ports=['5173:80','8080:8080','8081:8081','6379:6379','14330:1433'];
for(const port of ports){const x=port.split(':');if(!compose.includes(x[0]+'}:'+x[1]))throw Error('Compose port mismatch '+port);}
for(const [label,ok] of [['Nginx proxy',web.includes('proxy_pass http://api:8080/api/')],['Two API DB contexts',api.includes('LongevityDietDbContext')&&api.includes('TrackingDbContext')],['Worker catalog',worker.includes('LongevityWorkerDb')],['HTTP2 gRPC',compose.includes('Kestrel__EndpointDefaults__Protocols: Http2')&&grpc.includes('MapGrpcService')]])if(!ok)throw Error('Source drift: '+label);
const cols=Object.fromEntries(Object.entries(schema.groups).map(([k,v])=>[k,Object.keys(v.columns).length]));
if(JSON.stringify(cols)!==JSON.stringify({identity:21,tracking:7,worker:4}))throw Error('Database schema drift');
const lanes=[
 ['AUTH','AuthController','AuthenticationService','UserRepository + RefreshTokenRepository','LongevityDietDb','identity'],
 ['PROFILE','ProfileController','ProfileService','UserRepository / Profile persistence','LongevityDietDb','identity'],
 ['REMINDERS','ReminderNotificationsController','ReminderService / IdentityRedisBridge','Identity outbox + inbox persistence','LongevityDietDb','identity'],
 ['MEAL PLAN','MealPlansController','MealPlanningService','MealPlanRepository','LongevityDietDb','identity'],
 ['MEAL LOG','MealLogsController','MealTrackingService','MealLogRepository','LongevityDietDb','identity'],
 ['EATING WINDOW','EatingWindowController','MealTrackingService','EatingWindowRepository','LongevityDietDb','identity'],
 ['MEAL ADVICE','RecommendationsController','RecommendationService + gRPC client','RecommendationRepository / gRPC adapter','LongevityDietDb','identity'],
 ['FMD','FmdController','FmdService','FmdRepository','LongevityDietDb','identity'],
 ['ACTIVITY','TrackingController','TrackingService','TrackingDbContext','LongevityTrackingDb','tracking'],
 ['ACTIVITY ADVICE','RecommendationController','TrackingService + ActivityCoachClient','TrackingDbContext + gRPC adapter','LongevityTrackingDb','tracking']
];
for(const row of lanes)if(!fs.existsSync(path.join(root,'src/LongevityDiet.API/Controllers',row[1]+'.cs')))throw Error('Missing controller '+row[1]);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const style={
 box:'rounded=1;arcSize=8;html=1;whiteSpace=wrap;strokeColor=#000000;strokeWidth=4;fillColor=#FFFFFF;fontFamily=Arial;fontColor=#000000;align=center;verticalAlign=middle;spacing=10;',
 note:'rounded=1;arcSize=8;html=1;whiteSpace=wrap;strokeColor=#000000;strokeWidth=2;fillColor=#FFFFFF;fontFamily=Arial;fontColor=#000000;align=center;verticalAlign=middle;spacing=12;',
 db:'shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;size=25;strokeColor=#000000;strokeWidth=4;fillColor=#FFFFFF;fontFamily=Arial;fontColor=#000000;align=center;verticalAlign=middle;spacing=10;',
 title:'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontFamily=Arial;fontColor=#000000;align=left;verticalAlign=middle;fontStyle=1;',
 text:'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontFamily=Arial;fontColor=#000000;align=left;verticalAlign=middle;',
 frame:'rounded=0;html=1;whiteSpace=wrap;strokeColor=#000000;strokeWidth=3;fillColor=#FFFFFF;'
};
class Diagram{
 constructor(name,w,h){this.name=name;this.w=w;this.h=h;this.back=[];this.front=[];this.arrows=[];this.nodes=new Map();this.seq=1;this.rels=[]}
 node(key,x,y,w,h,label,opts){
  opts=opts||{};
  const s=style[opts.kind||'box']+'fontSize='+(opts.font||42)+';'+(opts.extra||'');
  const id='n'+(++this.seq);
  const value=esc(label).replace(/\n/g,'&lt;br/&gt;');
  const xml='<mxCell id="'+id+'" value="'+value+'" style="'+esc(s)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>';
  (opts.background?this.back:this.front).push(xml);
  if(key){if(this.nodes.has(key))throw Error('Duplicate node '+key);this.nodes.set(key,{id,x,y,w,h,label})}
 }
 edge(from,to,label,opts){
  opts=opts||{};
  const A=this.nodes.get(from),B=this.nodes.get(to);
  if(!A||!B)throw Error('Cannot connect '+from+' to '+to);
  const exit=opts.exit||[1,.5],entry=opts.entry||[0,.5],via=opts.via||[];
  const s='edgeStyle=segmentEdgeStyle;rounded=0;orthogonal=1;html=1;strokeColor=#000000;strokeWidth='+(opts.width||5)+';'+
   (opts.dashed?'dashed=1;dashPattern=12 8;':'')+
   'startArrow=none;endArrow=block;endFill=1;endSize=22;fontFamily=Arial;fontColor=#000000;fontSize='+(this.name==='C1'?68:35)+';labelBackgroundColor=#FFFFFF;align=center;verticalAlign=middle;spacing=4;'+
   'exitX='+exit[0]+';exitY='+exit[1]+';exitPerimeter=0;entryX='+entry[0]+';entryY='+entry[1]+';entryPerimeter=0;';
  const way=via.length?'<Array as="points">'+via.map(p=>'<mxPoint x="'+p[0]+'" y="'+p[1]+'"/>').join('')+'</Array>':'';
  this.arrows.push('<mxCell id="a'+(++this.seq)+'" value="'+esc(label)+'" style="'+esc(s)+'" edge="1" source="'+A.id+'" target="'+B.id+'" parent="1"><mxGeometry relative="1" as="geometry">'+way+'</mxGeometry></mxCell>');
  this.rels.push({from,to,label});
 }
 save(){
  const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="'+this.name+'" id="c4-'+this.name+'"><mxGraphModel page="1" grid="1" gridSize="10" pageWidth="'+this.w+'" pageHeight="'+this.h+'" pageScale="1" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+this.back.join('')+this.arrows.join('')+this.front.join('')+'</root></mxGraphModel></diagram></mxfile>';
  const colors=[...xml.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(m=>m[0].toUpperCase());
  if(colors.some(c=>c!=='#000000'&&c!=='#FFFFFF'))throw Error('Non-monochrome C4');
  fs.writeFileSync(path.join(out,this.name+'.drawio'),xml,'utf8');
  console.log('C4_DONE',this.name,'nodes',this.nodes.size,'edges',this.arrows.length);
  return {name:this.name,relations:this.rels,nodes:[...this.nodes.keys()]};
 }
}
function header(g,name,scope){
 g.node(null,135,40,g.w-270,135,name,{kind:'title',font:77});
 g.node(null,135,177,g.w-270,92,scope,{kind:'text',font:34});
}
const c0=new Diagram('C0',7700,3440);
header(c0,'C0  |  SYSTEM CONTEXT','Current product boundary  /  people and their interactions with LongevityDiet');
c0.node('member',365,780,2130,600,'PERSON  |  MEMBER\nPlans meals, logs food/activity\nand receives reminders',{font:43});
c0.node('admin',365,1950,2130,550,'PERSON  |  ADMIN\nRole-authorized account tasks',{font:43});
c0.node('system',3310,1140,3860,1070,'SYSTEM  |  LONGEVITYDIET\nMeal planning, meal logging,\nactivity tracking, FMD,\nrecommendations and reminders',{font:53});
c0.edge('member','system','Uses meal plans, tracking and reminders',{exit:[1,.5],entry:[0,.26],via:[[2850,1080],[2850,1418]]});
c0.edge('admin','system','Role-authorized use',{exit:[1,.5],entry:[0,.78],via:[[3000,2225],[3000,1975]]});
c0.node(null,375,2920,6780,260,'C0 shows the WHO and WHAT. Protocols, ports, databases and services are shown at C1/C2, as required by the C4 abstraction levels.',{kind:'note',font:36});
const C0=c0.save();
const c1=new Diagram('C1',17450,6050);
header(c1,'C1  |  CONTAINER ARCHITECTURE','Actual ports, protocol directions, service owners and three SQL catalogs');
c1.node(null,5130,3900,11960,1610,'',{kind:'frame',background:true});
c1.node(null,5300,5215,11550,115,'ONE SQL SERVER  /  sqlserver:1433 TCP  /  host published :14330  /  3 distinct catalogs',{kind:'text',font:45});
c1.node('member',205,790,1670,395,'MEMBER',{font:108});
c1.node('admin',205,1550,1670,395,'ADMIN  /  role',{font:102});
c1.node('web',2350,1140,2430,670,'WEB / NGINX\nReact SPA | HTTP :80\nHost :5173',{font:102});
c1.node('api',5510,1120,2660,690,'REST API  (.NET)\nHTTP :8080\nAuth, meals, FMD, tracking',{font:98});
c1.node('grpc',10200,540,2720,670,'RECOMMENDATION gRPC\nHTTP/2 :8081\nSTATELESS | NO OWN DB',{font:90});
c1.node('redis',10100,2230,2780,640,'REDIS STREAMS\nTCP :6379\nAPI and Worker events',{font:100});
c1.node('worker',14000,2240,2740,620,'REMINDER WORKER\nEvents + schedules\nNo inbound HTTP port',{font:98});
c1.node('identity',5390,4410,3270,630,'LongevityDietDb | 21 tables\nIdentity, meals, FMD\nSQL :1433',{kind:'db',font:96});
c1.node('tracking',9560,4410,3210,630,'LongevityTrackingDb | 7 tables\nActivity + adherence\nSQL :1433',{kind:'db',font:94});
c1.node('workerdb',13720,4410,3130,630,'LongevityWorkerDb | 4 tables\nSchedules + outbox\nSQL :1433',{kind:'db',font:94});
c1.edge('member','web','HTTP :5173',{exit:[1,.5],entry:[0,.29]});
c1.edge('admin','web','Role access',{exit:[1,.5],entry:[0,.78]});
c1.edge('web','api','/api :8080');
c1.edge('api','grpc','HTTP/2 :8081',{exit:[1,.22],entry:[0,.5],via:[[9120,1272],[9120,875]]});
c1.edge('api','redis','XADD :6379',{exit:[1,.73],entry:[0,.27],via:[[8870,1624],[8870,2403]],dashed:true});
c1.edge('redis','api','XREAD :6379',{exit:[0,.73],entry:[1,.94],via:[[8730,2697],[8730,1769]],dashed:true});
c1.edge('redis','worker','XREAD :6379',{exit:[1,.27],entry:[0,.27],dashed:true});
c1.edge('worker','redis','XADD :6379',{exit:[0,.75],entry:[1,.75],dashed:true});
c1.edge('api','identity','SQL :1433',{exit:[.18,1],entry:[.5,0],via:[[5989,3050],[7025,3050]]});
c1.edge('api','tracking','SQL :1433',{exit:[.82,1],entry:[.5,0],via:[[7691,3450],[11165,3450]]});
c1.edge('worker','workerdb','SQL :1433',{exit:[.57,1],entry:[.57,0]});
c1.node(null,270,5540,16600,270,'HOST: Web 5173 → 80  |  API 8080  |  gRPC 8081  |  Redis 6379  |  SQL 14330 → 1433\nSOLID = synchronous call / SQL   |   DASHED = Redis event streams   |   Worker: no HTTP listener',{kind:'note',font:76});
const C1=c1.save();
const c2=new Diagram('C2',16300,8010);
header(c2,'C2  |  API COMPONENTS','Scope: one REST API :8080  /  endpoint → controller → service → persistence → DB reference');
c2.node('web',195,435,1160,260,'WEB / NGINX\nHTTP :80',{font:33});
c2.node('router',185,880,1170,6120,'API ROUTING\nJWT / Role\nRate limiting\n\nREST :8080',{font:37});
c2.edge('web','router','/api HTTP :8080',{exit:[.5,1],entry:[.5,0]});
const y0=970,step=587,H=354;
lanes.forEach((r,i)=>{
 const [domain,ctrl,service,repo,db,kind]=r,y=y0+i*step;
 c2.node('ctrl'+i,1580,y,2520,H,domain+'\n'+ctrl,{font:38});
 c2.node('svc'+i,4500,y,2700,H,service,{font:40});
 c2.node('repo'+i,7600,y,2890,H,repo,{font:39});
 let target='DATABASE REFERENCE  /  SHARED\n'+db+'  SQL :1433';
 if(i===6)target+='\nAlso gRPC engine HTTP/2 :8081';
 if(i===9)target+='\nAlso ActivityCoach gRPC :8081';
 c2.node('db'+i,10900,y,5030,H,target,{font:38});
 c2.edge('router','ctrl'+i,'HTTP route',{exit:[1,+((y+H/2-880)/6120).toFixed(5)],entry:[0,.5],width:4});
 c2.edge('ctrl'+i,'svc'+i,'Calls',{width:4});
 c2.edge('svc'+i,'repo'+i,'Uses',{width:4});
 c2.edge('repo'+i,'db'+i, (i===6||i===9)?'SQL :1433 + gRPC :8081':'SQL TCP :1433',{width:4});
});
c2.node(null,260,7190,15590,520,'DATABASE REFERENCES: Repeated labels point to the SAME actual catalogs, NOT ten separate DB deployments.\nLongevityDietDb (21 tables) + LongevityTrackingDb (7) are accessed by this API; the separate Worker owns LongevityWorkerDb (4). gRPC :8081 performs stateless computation (no separate DB). API ↔ Redis :6379 ↔ Worker ↔ Worker DB appear in C1.',{kind:'note',font:38});
const C2=c2.save();
const result={status:'CURRENT_C4_BLACK_WHITE',ports,dbCounts:cols,controllers:lanes.map(r=>({domain:r[0],controller:r[1],service:r[2],persistence:r[3],database:r[4],owner:r[5]})),diagrams:[C0,C1,C2],facts:['Web Nginx proxy /api -> api:8080','API identity + tracking catalogs; Worker uses its own catalog','Recommendation gRPC stateless, no invented DB','C0 intentionally omits ports per official C4 level']};
fs.writeFileSync(path.join(root,'scripts/c4-architecture-manifest.json'),JSON.stringify(result,null,2)+'\n');
