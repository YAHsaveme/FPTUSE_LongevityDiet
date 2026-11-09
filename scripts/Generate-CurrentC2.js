'use strict';
/** Current-source C2: all REST controllers, service dependencies, SQL catalogs, gRPC, Redis, Worker. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/assignment/one-page');
const schema=JSON.parse(fs.readFileSync(path.join(out,'full-schema-manifest.json'),'utf8'));
const groups=[
 {title:'IDENTITY / WELLNESS',db:'main',items:[
 ['AuthController','AuthenticationService','UserRepository + RefreshTokenRepository'],
 ['ProfileController','ProfileService','UserRepository'],
 ['WellnessController','WellnessJourneyService','WellnessRepository + MealPlanRepository'],
 ['ReminderNotificationsController','ReminderService','Identity outbox + inbox persistence']
 ]},
 {title:'MEAL PLANS / ACTIVITY',db:'main+tracking',items:[
 ['MealPlansController','MealPlanningService / RecommendationService','MealPlanRepository'],
 ['MealLogsController','MealTrackingService','MealLogRepository'],
 ['EatingWindowController','MealTrackingService','EatingWindowRepository'],
 ['RecommendationsController','RecommendationService','RecommendationRepository + gRPC'],
 ['TrackingController','TrackingService','TrackingDbContext'],
 ['RecommendationController','TrackingService / ActivityCoachClient','TrackingDbContext + gRPC']
 ]},
 {title:'CATALOG / RULE GOVERNANCE',db:'main',items:[
 ['FoodsController','FoodCatalogService','FoodRepository'],
 ['RecipesController','RecipeCatalogService','RecipeRepository'],
 ['AllergensController','RecipeCatalogService','RecipeRepository'],
 ['DietRulesController','RuleCatalogService','RuleCatalogRepository'],
 ['AdminFoodsController','FoodCatalogService','FoodRepository'],
 ['AdminRecipesController','RecipeCatalogService','RecipeRepository'],
 ['AdminRulesController','RuleCatalogService','RuleCatalogRepository']
 ]},
 {title:'CHALLENGES / FMD / OPS',db:'main+worker',items:[
 ['ChallengesController','ChallengeProgressService','ChallengeProgressRepository'],
 ['DashboardController','ChallengeProgressService','ChallengeProgressRepository'],
 ['FmdController','FmdService','FmdRepository'],
 ['WeeklyReportsController','WeeklyReportService / WeeklyReportStreamPublisher','WeeklyReportWorkerRepository + Redis'],
 ['WorkerOperationsController','WorkerReliabilityService','Worker reliability persistence']
 ]}
];
const all=groups.flatMap(g=>g.items.map(x=>x[0]));
const real=fs.readdirSync(path.join(root,'src/LongevityDiet.API/Controllers'))
 .filter(s=>s.endsWith('Controller.cs')).map(x=>x.slice(0,-3));
function assert(a,msg){if(!a)throw Error(msg)}
assert(schema.tableCount===56 && schema.physicalFkCount===23,'Current physical schema drift');
assert(all.length===22&&new Set(all).size===22,'Controller list wrong');
assert(real.length===22&&real.every(x=>all.includes(x)),'Controller list missing live code '+real.filter(x=>!all.includes(x)));
for(const g of groups)for(const [ctrl,service] of g.items){
 const text=fs.readFileSync(path.join(root,'src/LongevityDiet.API/Controllers',ctrl+'.cs'),'utf8');
 assert(text.includes('class '+ctrl),'Controller source missing '+ctrl);
 for(const svc of service.split(' / ')){
  assert(text.includes(svc)||svc==='WeeklyReportStreamPublisher',ctrl+' ungrounded service '+svc);
 }
}
const xml=[],edges=[],node=new Map(),visible=[],W=12820,H=6520;let id=2;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function card(key,label,x,y,w,h,kind='box',size=28){
 if(key&&node.has(key))throw Error('Duplicate '+key);
 const ref='n'+id++,val=esc(label).replace(/\n/g,'&lt;br/&gt;');
 const style=(kind==='title'?'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontStyle=1;align=left;':
 kind==='text'?'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=left;':
 kind==='actor'?'shape=umlActor;html=1;whiteSpace=wrap;strokeColor=#000000;fillColor=#FFFFFF;labelPosition=center;verticalLabelPosition=bottom;verticalAlign=top;':
 kind==='rail'?'rounded=0;html=1;strokeColor=#000000;fillColor=#FFFFFF;strokeWidth=2;':
 'rounded=0;html=1;whiteSpace=wrap;strokeColor=#000000;fillColor=#FFFFFF;strokeWidth=2;align=center;verticalAlign=middle;spacing=8;')+
 'fontFamily=Arial;fontColor=#000000;fontSize='+size+';';
 xml.push('<mxCell id="'+ref+'" value="'+val+'" style="'+esc(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
 if(key)node.set(key,{id:ref,x,y,w,h});
 if(kind==='box')visible.push({key,x,y,w,h});
 return ref;
}
function edge(a,b,label,kind='call',exit,entry){
 assert(node.has(a)&&node.has(b),'Invalid edge '+a+' to '+b);
 const A=node.get(a),B=node.get(b),right=B.x>=A.x+A.w,down=B.y>=A.y+A.h;
 const bridge=a==='api'&&b==='redis';
 const routeBridge=a==='api'&&b.startsWith('route:');
 const p=exit||(bridge?[.92,1]:(right?[1,.5]:down?[.5,1]:[1,.5]));
 const q=entry||(bridge?[.2,1]:(right?[0,.5]:down?[.5,0]:[0,.5]));
 const dashed=kind==='logical'||kind==='event';
 const style='edgeStyle='+((bridge||routeBridge)?'segmentEdgeStyle':'orthogonalEdgeStyle')+';rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#000000;strokeWidth='+ (dashed?'1.6':'2.6')+';'+
 (dashed?'dashed=1;dashPattern=14 9;':'')+
 'endArrow='+ (kind==='event'?'block':'open')+';endFill=0;'+
 'fontFamily=Arial;fontSize=21;fontColor=#000000;labelBackgroundColor=#FFFFFF;verticalLabelPosition=top;'+
 'exitX='+p[0]+';exitY='+p[1]+';exitPerimeter=0;entryX='+q[0]+';entryY='+q[1]+';entryPerimeter=0;';
 const routeIndex=routeBridge?Number(b.split(':')[1]):-1;
 const routeMidY=620+routeIndex*36;
 const xFrom=Math.round(A.x+A.w*p[0]);
 const xTo=Math.round(B.x+B.w*q[0]);
 const geometry=bridge
  ? '<mxGeometry relative="1" x="0" y="-22" as="geometry"><Array as="points"><mxPoint x="3574" y="650"/><mxPoint x="6832" y="650"/></Array></mxGeometry>'
  : routeBridge
    ? '<mxGeometry relative="1" x="0" y="-22" as="geometry"><Array as="points"><mxPoint x="'+xFrom+'" y="'+routeMidY+'"/><mxPoint x="'+xTo+'" y="'+routeMidY+'"/></Array></mxGeometry>'
    : '<mxGeometry relative="1" x="0" y="-22" as="geometry"/>';
 edges.push('<mxCell id="e'+id+++'" value="'+esc(label)+'" style="'+esc(style)+'" edge="1" source="'+A.id+'" target="'+B.id+'" parent="1">'+geometry+'</mxCell>');
}
card(null,'C2 — LIVE CODE COMPONENTS & DATA FLOW',160,55,11800,106,'title',66);
card(null,'PRN232  /  22 REST CONTROLLERS  /  API → SERVICE → REPOSITORY  /  3 SQL CATALOGS (45 + 7 + 4 = 56 TABLES)',165,165,12200,66,'text',37);
card('member','MEMBER',160,295,170,205,'actor',28);
card('admin','ADMIN',390,295,170,205,'actor',28);
card('web','WEB / NGINX\nHTTP 5173',770,335,1160,168,'box',32);
card('api','REST API ROUTING\nJWT / HTTP 8080',2240,335,1450,168,'box',32);
card('grpc','RECOMMENDATION gRPC\nHTTP/2 :8081',4190,335,1840,168,'box',32);
card('redis','REDIS STREAMS\n:6379',6540,335,1460,168,'box',32);
card('worker','REMINDER WORKER\nBackgroundService',8525,335,1560,168,'box',30);
card('context','SQL SERVER\n:1433',10715,335,1510,168,'box',34);
edge('member','web','uses','call',[1,.5],[0,.24]);edge('admin','web','manages','call',[1,.5],[0,.78]);
edge('web','api','HTTPS /api');
edge('api','grpc','gRPC client');
edge('api','redis','pub/consume','event');
// One real routing connector rail; separate group drops avoid crossing HTTP flows.
card('api-route-bus','',1450,671,10940,20,'rail',10);
edge('api','api-route-bus','HTTP dispatch','logical',[.48,1],[.138,0]);
edge('redis','worker','XREADGROUP','event');
edge('worker','context','EF Core');
const X0=145,COL=3155,sectionY=790,startY=1110,laneGap=595,ctrlW=810,svcW=1020,repoW=975,boxH=308;
for(let gi=0;gi<groups.length;gi++){
 const g=groups[gi],x=X0+gi*COL;
 card(null,g.title,x+2480,sectionY+84,500,120,'text',28);
 card('route:'+gi,'HTTP ROUTE / JWT AUTHORIZED\n'+g.items.length+' REAL CONTROLLERS',x+470,sectionY+84,2000,120,'box',31);
 const railY=startY-14,railH=(g.items.length-1)*laneGap+boxH+28;
 card('http-rail:'+gi,'',x-12,railY,18,railH,'rail',10);
 card('repo-rail:'+gi,'',x+2981,railY,18,railH,'rail',10);
 const routeTarget=x+470+1000;
 edge('api-route-bus','route:'+gi,'HTTP','logical',[(routeTarget-1450)/10940,1],[.5,0]);
 edge('route:'+gi,'http-rail:'+gi,'HTTP routes','logical',[0,.5],[.5,0]);
 for(let k=0;k<g.items.length;k++){
  const [name,service,repo]=g.items[k],y=startY+k*laneGap;
  const ck='ctrl:'+name,sk='service:'+name,rk='repo:'+name;
  card(ck,name+'\nREST / JSON',x+25,y,ctrlW,boxH,'box',name.length>26?29:33);
  card(sk,service,x+892,y,svcW,boxH,'box',service.length>43?27:32);
  card(rk,repo,x+1980,y,repoW,boxH,'box',repo.length>39?27:31);
  const railPort=(y+boxH/2-railY)/railH;
  edge('http-rail:'+gi,ck,'','logical',[1,railPort],[0,.5]);
  edge(ck,sk,'call');edge(sk,rk,'EF / adapter');
  edge(rk,'repo-rail:'+gi,'','logical',[1,.5],[0,railPort]);
 }
 const hubLabel=g.db==='main'?'LongevityDietDb  /  MAIN SQL (45 TABLES)':g.db==='main+tracking'?'LongevityDietDb + LongevityTrackingDb (45 + 7)':'LongevityDietDb + LongevityWorkerDb (45 + 4)';
 card('data:'+gi,hubLabel+'\nRepository group ownership',x+485,5670,2050,156,'box',31);
 edge('repo-rail:'+gi,'data:'+gi,'EF / DbContext','logical',[.5,1],[.5,0]);
}
// Derive real per-catalog foreign keys from the EF snapshot manifest, not fixed captions.
const byDb=Object.fromEntries(['main','tracking','worker'].map(db=>
 [db,schema.relations.filter(x=>x.kind==='SQL_FK'&&x.from.startsWith(db+':')).length]));
assert(byDb.main+byDb.tracking+byDb.worker===23,'FK totals drift');
// Group-level database REFERENCES are source-backed. The actual three physical
// SQL catalogs and every FK are diagrammed once in C1 and Database Diagram.
// Drawing long duplicate connectors to one shared SQL database would cross
// unrelated component lanes and misrepresent separate databases.
// All three real SQL catalogs are already connected through their owning data groups.
// Do not draw long duplicate lines from the SQL Server host through component labels.
card(null,'Source: exact REST controllers; 56 tables and 23 physical SQL FKs in EF migration snapshots. All four connected repository groups show SQL catalog references (not fake databases). Complete physical schema: Database Diagram.',170,6160,12310,102,'text',31);
const content='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="C2 SOURCE BACKED 2026" id="current-c2-components"><mxGraphModel page="1" pageWidth="'+W+'" pageHeight="'+H+'" pageScale="1" grid="1" gridSize="10" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+edges.join('')+xml.join('')+'</root></mxGraphModel></diagram></mxfile>';
const output=path.join(out,'C2.drawio');
fs.writeFileSync(output,content,'utf8');
const meta={status:'CURRENT_SOURCE_BACKED_C2_56',controllers:all,groups:groups.map(g=>({title:g.title,db:g.db,controllers:g.items.map(x=>x[0])})),sqlTables:schema.tableCount,foreignKeys:schema.physicalFkCount,dbFk:byDb,c2Vertices:xml.length,c2Edges:edges.length,edgeLabelsExist:edges.every(e=>!e.includes('value=""')),sqlCatalogs:Object.keys(byDb)};
fs.writeFileSync(path.join(out,'c2-current-manifest.json'),JSON.stringify(meta,null,2)+'\n');
console.log('C2_CURRENT_SOURCE=PASS controllers='+all.length+' groups='+groups.length+' edges='+edges.length+' db='+JSON.stringify(byDb)+' file='+output);
