/* Generate canonical, SINGLE-PAGE, editable diagrams.net C0 / C1 / C2.
   Source of truth: docs/assignment/02-SYSTEM-ARCHITECTURE-C4.md, ADR-005,
   docs/assignment/06-C2-AND-DATABASE-MAPPING.md.
   The C2 atlas is a deliberate one-page COMPILATION of proposed container-level components.
   It is not a claim that seven microservices have already shipped.
*/
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const dest=path.join(root,'docs','assignment','one-page');
fs.mkdirSync(dest,{recursive:true});
// Standard diagrams.net monochrome drafting rules: white background,
// squared black outlines, grey secondary labels, and orthogonal relationships.
const C={
  ink:'#171717',muted:'#555555',line:'#333333',bg:'#FFFFFF',
  blue:'#333333',blueBg:'#FFFFFF',purple:'#333333',purpleBg:'#FFFFFF',
  coral:'#333333',coralBg:'#FFFFFF',amber:'#333333',amberBg:'#FFFFFF',
  cyan:'#333333',cyanBg:'#FFFFFF',green:'#333333',greenBg:'#FFFFFF',
  navy:'#333333',navyBg:'#FFFFFF',orange:'#333333',orangeBg:'#FFFFFF'
};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function create(name,w,h){
 let ns=[],es=[],id=1,idx=0;
 const uid=()=> 'c'+(++id);
 function shape(label,x,y,sw,sh,opts={}){
  const key=opts.id||uid();const fill='#FFFFFF',stroke=C.line;
  const fmt=opts.font||30,weight=opts.bold?'1':'0';
  const style=opts.text?'text;strokeColor=none;fillColor=none;':'rounded=0;whiteSpace=wrap;html=1;glass=0;';
  const align=opts.align||'center';
  const common='fontFamily=Arial;fontSize='+fmt+';fontColor='+(opts.color||C.ink)+';fontStyle='+weight+';align='+align+';verticalAlign=middle;spacing=10;whiteSpace=wrap;html=1;';
  const sty=style+common+(opts.text?'':'fillColor='+fill+';strokeColor='+stroke+';strokeWidth='+(opts.strokeWidth||3)+';')+(opts.dashed?'dashed=1;dashPattern=8 6;':'')+(opts.extra||'');
  ns.push('<mxCell id="'+esc(key)+'" value="'+esc(label)+'" style="'+esc(sty)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+sw+'" height="'+sh+'" as="geometry"/></mxCell>');
  return key;
 }
 function edge(a,b,label='',opts={}){
  const key=uid(), color=C.line;
  const style='edgeStyle='+(opts.via?'segmentEdgeStyle':'orthogonalEdgeStyle')+';rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor='+color+';strokeWidth='+(opts.width||4)+';endArrow=block;endFill=1;'+(opts.dashed?'dashed=1;dashPattern=9 7;':'')+(opts.exit?'exitX='+opts.exit[0]+';exitY='+opts.exit[1]+';exitPerimeter=0;':'')+(opts.entry?'entryX='+opts.entry[0]+';entryY='+opts.entry[1]+';entryPerimeter=0;':'');
  const waypoints=opts.via?'<Array as="points">'+opts.via.map(([x,y])=>'<mxPoint x="'+x+'" y="'+y+'"/>').join('')+'</Array>':'';
  es.push('<mxCell id="'+key+'" value="'+esc(label)+'" style="'+esc(style)+'" edge="1" parent="1" source="'+a+'" target="'+b+'"><mxGeometry relative="1" as="geometry">'+waypoints+'</mxGeometry></mxCell>');
 }
 const card=(title,desc,x,y,ww,hh,color=C.blue,bg=C.blueBg,sz=30)=>{
   return shape('<b>'+title+'</b><br/><font color="'+C.muted+'">'+desc+'</font>',x,y,ww,hh,{stroke:color,fill:bg,font:sz});
 };
 function band(label,x,y,ww,hh,bg='#F5F8FF',stroke='#C8D5E6',font=30){
   return shape(label,x,y,ww,hh,{stroke,fill:bg,font,align:'left'});
 }
 function title(subtitle){
   shape(name,100,52,w-200,118,{text:true,bold:true,font:76,align:'left'});
   shape(subtitle,105,173,w-210,74,{text:true,font:31,color:C.muted,align:'left'});
   shape('',100,263,w-200,4,{fill:'#BDD0E8',stroke:'#BDD0E8',strokeWidth:1});
 }
 function save(file){
  const content='<mxfile host="app.diagrams.net" version="32.6.10"><diagram id="'+name.replaceAll(' ','-')+'" name="'+esc(name)+'"><mxGraphModel dx="1600" dy="900" grid="1" gridSize="20" guides="1" tooltips="1" connect="1" arrows="1" fold="0" page="1" pageScale="1" pageWidth="'+w+'" pageHeight="'+h+'" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+es.join('')+ns.join('')+'</root></mxGraphModel></diagram></mxfile>';
  fs.writeFileSync(path.join(dest,file),content,'utf8');
  console.log(file,'page=',w+'x'+h,'nodes=',ns.length,'edges=',es.length);
 }
 return {shape,card,band,edge,title,save};
}
{
 const g=create('C0  |  SYSTEM CONTEXT',3500,2050);g.title('LONGEVITY DIET COMPANION   •   WHO USES THE SYSTEM AND WHY   •   OFFICIAL C4 LEVEL 1');
 g.band('<b>PEOPLE / ROLES</b>',120,320,780,90,C.navyBg,C.navy,33);
 const guest=g.card('GUEST','Register • Sign in<br/>Review public information',150,455,720,290,C.blue,C.blueBg,41);
 const member=g.card('MEMBER','Maintain health profile<br/>Plan meals • Log activity<br/>Track adherence • Reminders',150,800,720,350,C.green,C.greenBg,39);
 const admin=g.card('ADMINISTRATOR','Curate approved rules<br/>Operate and monitor<br/>Manage authorization',150,1210,720,350,C.purple,C.purpleBg,39);
 g.band('<b>SOFTWARE SYSTEM IN SCOPE</b>',1080,320,1290,90,C.navyBg,C.navy,34);
 const main=g.card('LONGEVITY DIET COMPANION','Personalized nutrition and longevity guidance<br/><br/>Identity • Profile • Meal planning • Food catalog<br/>Tracking • Educational LDAS • Notifications<br/><br/>Health-first and rules-first; AI is optional',1080,490,1290,1000,C.blue,C.blueBg,43);
 g.band('<b>EXTERNAL SOFTWARE</b>',2570,320,780,90,C.navyBg,C.navy,33);
 const ai=g.card('OPTIONAL LOCAL AI','Explanation rewriting only<br/>No medical decisions<br/>Never overrides safety rules',2570,805,760,390,C.orange,C.orangeBg,38);
 g.edge(guest,main,'',{exit:[1,.5],entry:[0,.25]});
 g.edge(member,main,'',{exit:[1,.5],entry:[0,.53]});
 g.edge(admin,main,'',{exit:[1,.5],entry:[0,.82]});
 g.edge(main,ai,'',{dashed:true,color:C.orange,exit:[1,.56],entry:[0,.5]});
 g.band('<b>CURRENT RUNTIME:</b> one primary ASP.NET Core API + React Web + gRPC skeleton + Worker + Redis.<br/><b>TARGET:</b> independent service ownership and gateway. Cloudflare/Redis/SQL are infrastructure and intentionally omitted at C0.',140,1690,3180,205,'#F4F7FB','#CAD4E3',33);
 g.save('01-c0-system-context.drawio');
}
{
 const W=5900;const g=create('C1  |  CONTAINER ARCHITECTURE  (TARGET)',W,3220);
 g.title('ONE-PAGE TARGET VIEW   •   BUSINESS SERVICE + OWNED SQL DATABASE   •   NOT THE CURRENT DEPLOYED COMPOSE');
 const browser=g.card('BROWSER','Guest / Member / Admin',150,342,760,218,C.blue,C.blueBg,37);
 const web=g.card('WEB APPLICATION','React + TypeScript<br/>HTTPS :443',1150,342,910,218,C.blue,C.blueBg,36);
 const gateway=g.card('API GATEWAY','YARP + .NET 9<br/>REST :8080 • edge JWT, rate limits',2415,342,1130,218,C.navy,C.navyBg,36);
 const ai=g.card('LOCAL AI [OPTIONAL]','Rewrite explanation only<br/>HTTP :11434 • safety unchanged',4550,342,1120,218,C.orange,C.orangeBg,34);
 g.edge(browser,web,'',{exit:[1,.5],entry:[0,.5]});g.edge(web,gateway,'',{exit:[1,.5],entry:[0,.5]});
 const route=g.band('<b>GATEWAY ROUTING:</b> REST :8081 / :8082 / :8083 / :8084    ·    gRPC internal :8085    ·    Ops :8086 (admin only)',165,640,5565,103,'#F1F5FC','#D2DBE9',32);
 g.edge(gateway,route,'',{exit:[.5,1],entry:[.5,0]});
 const services=[
 ['IDENTITY & PROFILE','REST :8081<br/>Auth • profile • permissions','LongevityIdentityDb',C.purple,C.purpleBg],
 ['CATALOG & RULES','REST :8082<br/>Foods • recipes • rule versions','LongevityCatalogDb',C.coral,C.coralBg],
 ['PLANNING','REST :8083<br/>Meal plans • challenge • FMD gate','LongevityPlanningDb',C.amber,C.amberBg],
 ['TRACKING & PROGRESS','REST :8084<br/>Meal/activity logs • LDAS','LongevityTrackingDb',C.cyan,C.cyanBg],
 ['RECOMMENDATION','gRPC HTTP/2 :8085<br/>Safety filtering • ranking','LongevityRecommendationDb',C.green,C.greenBg],
 ['BACKGROUND WORKER','Ops :8086<br/>Reminders • reports • retries','LongevityWorkerDb',C.navy,C.navyBg]
 ];
 let ids=[],dbids=[];
 services.forEach((s,i)=>{
  const x=130+i*960;
  const sid=g.card(s[0],s[1],x,890,880,330,s[3],s[4],35);ids.push(sid);
  if([0,1,2,3,5].includes(i))g.edge(route,sid,'',{exit:[(x+440-165)/5565,1],entry:[.5,0],color:s[3]});
  const db=g.card(s[2],'SQL Server • logical ownership<br/>EF Core / TDS :1433',x,1465,880,230,s[3],'#FFFFFF',33);dbids.push(db);
  g.edge(sid,db,'',{exit:[.5,1],entry:[.5,0],color:s[3],width:4});
 });
 // Guide lines use a channel outside owned database cards to avoid crossings.
 g.band('<b>SYNC:</b> Gateway → 4 REST services / Worker Ops    ·    Planning → Recommendation gRPC    ·    No cross-service SQL reads or foreign keys',160,1795,5560,116,'#F7FAFE','#CCD8E7',30);
 const pub=g.card('DOMAIN OUTBOX PUBLISHERS','Identity / Catalog / Planning / Tracking',420,1952,2410,174,C.orange,C.orangeBg,34);
 const receiver=g.card('STREAM CONSUMERS + RESULT PUBLISHERS','Worker consumes & acknowledges • Recommendation projects approved snapshots',3150,1952,2410,174,C.orange,C.orangeBg,32);
 const redis=g.card('REDIS 7 STREAMS  •  SHARED EVENT TRANSPORT','Domain services publish transactional outbox events; Worker consumes via consumer group + XACK; result, retry and dead-letter events return to owners.<br/>NOT a relational database. Cross-service communication is via API/gRPC or versioned integration events.',400,2220,5100,390,C.orange,C.orangeBg,38);
 g.edge(pub,redis,'',{exit:[.5,1],entry:[.28,0],color:C.orange,dashed:true});
 g.edge(redis,receiver,'',{exit:[.75,0],entry:[.5,1],color:C.orange,dashed:true});
 g.band('<b>EVENT / DATA OWNERSHIP</b>   Identity, Catalog, Planning, Tracking → Outbox → Redis → Worker / projected read models. Every service reads/writes ONLY its own logical database.',390,2720,5120,200,'#F0F5FB','#CAD7E6',30);
 g.band('<b>LEGEND:</b> Blue: presentation  ·  Navy: gateway/worker  ·  Purple: identity  ·  Coral: catalog  ·  Amber: planning  ·  Cyan: tracking  ·  Green: recommendation.<br/><b>Scope:</b> This is approved ADR-005 TARGET; current runtime still has a shared primary API and partial service separation.',140,3005,5630,165,'#F8FAFD','#DAE3EE',29);
 g.save('02-c1-container-architecture.drawio');
}
{
 const g=create('C2  |  COMPONENT ATLAS  (TARGET)',8050,4640);
 g.title('SINGLE-PAGE OVERALL COMPONENT VIEW   •   6 OWNED SERVICE BOUNDARIES + FRONTEND/GATEWAY   •   TARGET COMPONENTS ARE PROPOSED');
 const web=g.card('WEB FRONTEND  [React / TypeScript]','Authentication + profile views  ·  Catalog / planning UX  ·  Activity / progress UX  ·  Notification center<br/>Typed API client  ·  Cookie / session handling  ·  Strict HTTPS gateway calls',165,340,3670,325,C.blue,C.blueBg,42);
 const gw=g.card('API GATEWAY  [YARP / ASP.NET Core]','Routes + service discovery  ·  JWT edge auth + role policies  ·  Rate limiting  ·  Correlation / forwarding<br/>REST :8080  ·  Owns NO domain DB  ·  Admin-only operations routing',4190,340,3665,325,C.navy,C.navyBg,42);
 g.edge(web,gw,'',{exit:[1,.5],entry:[0,.5],color:C.blue});
 const route=g.band('<b>ROUTING & TRUST BOUNDARY:</b> Browser → Web → Gateway → Service. Each domain service enforces authorization / ownership again. Internal calls use REST or gRPC, never another service’s DB.',165,752,7660,165,'#EEF3FC','#C8D6EA',34);
 g.edge(gw,route,'',{exit:[.5,1],entry:[.75,0]});
 const spec=[
  {name:'IDENTITY & PROFILE',port:':8081',c:C.purple,bg:C.purpleBg,db:'LongevityIdentityDb',units:[
    ['Auth REST','Register • login • refresh • revoke'],
    ['Profile REST','Member profile • allergy restrictions'],
    ['Authentication','Password hash • JWT • claims'],
    ['Session manager','Rotate/revoke hashed refresh tokens'],
    ['Identity repositories','Users • profiles • relations'],
    ['Outbox publisher','ProfileChanged + auth events']
  ],extra:'Cloudflare D1 refresh adapter optional / OFF'},
  {name:'CATALOG & RULES',port:':8082',c:C.coral,bg:C.coralBg,db:'LongevityCatalogDb',units:[
    ['Catalog REST','Foods • recipes • ingredients'],
    ['Rule REST','Rules • versions • published sets'],
    ['Catalog domain','Validation • soft delete • indexes'],
    ['Rule governance','Evidence • sensitive-rule metadata'],
    ['Version publisher','Immutable approved rule snapshots'],
    ['Outbox publisher','CatalogChanged • RulePublished']
  ],extra:'Catalog versions are immutable after publish'},
  {name:'PLANNING',port:':8083',c:C.amber,bg:C.amberBg,db:'LongevityPlanningDb',units:[
    ['Planning REST','Generate / revise meal plans'],
    ['Challenge REST','Daily steps • state transitions'],
    ['FMD safety gate','Contraindication + consent checks'],
    ['Plan orchestrator','Scheduling • revision control'],
    ['Recommendation client','gRPC :8085 → safety ranker'],
    ['Outbox publisher','PlanGenerated • challenge events']
  ],extra:'Never bypass medically sensitive safety gate'},
  {name:'TRACKING & PROGRESS',port:':8084',c:C.cyan,bg:C.cyanBg,db:'LongevityTrackingDb',units:[
    ['Logging REST','Meal / activity / eating windows'],
    ['Progress REST','LDAS + history + summaries'],
    ['Tracking application','Owner scope + log validation'],
    ['LDAS calculator','Versioned deterministic dimensions'],
    ['Report projection','Weekly summaries • event inbox'],
    ['Outbox publisher','ActivityLogged / progress events']
  ],extra:'Incomplete source data → partial/NULL LDAS'},
  {name:'RECOMMENDATION',port:':8085',c:C.green,bg:C.greenBg,db:'LongevityRecommendationDb',units:[
    ['Recommendation gRPC','Input schema + request validation'],
    ['Hard safety filter','Allergy / exclusion / FMD checks'],
    ['Deterministic ranker','Score • reasons • explainability'],
    ['Read-model projector','Catalog + rule snapshot versions'],
    ['Explanation adapter','Optional local AI • no safety override'],
    ['Feedback repository','Record ranker feedback']
  ],extra:'Live code = gRPC skeleton; target ranker pending'},
  {name:'BACKGROUND WORKER',port:':8086',c:C.navy,bg:C.navyBg,db:'LongevityWorkerDb',units:[
    ['Streams consumer','XREADGROUP • XACK • inbox'],
    ['Reminder scheduler','Timezone / quiet hours / DST'],
    ['Background executor','Due reminders • weekly jobs'],
    ['Retry + dead-letter','Bounded attempts • escalation'],
    ['Ops endpoints','Readiness + protected admin ops'],
    ['Result publisher','Worker Outbox → event stream']
  ],extra:'Implemented reminder path is independently tested'}
 ];
 const dbs=[],heads=[],components=[];
 spec.forEach((s,i)=>{
  const x=130+i*1320, ww=1200;
  g.shape('',x,1020,ww,2510,{fill:'#FBFDFF',stroke:s.c,strokeWidth:3});
  const head=g.card(s.name+'  '+s.port,'<b>Proposed microservice boundary</b>',x+32,1070,ww-64,172,s.c,s.bg,36); heads.push(head);
  if([0,1,2,3,5].includes(i))g.edge(route,head,'',{exit:[(x+600-165)/7660,1],entry:[.5,0],color:s.c});
  const localComponents=s.units.map((u,j)=>g.card(u[0],u[1],x+46,1310+j*276,ww-92,224,s.c,'#FFFFFF',34));
  components.push(localComponents);
  g.shape(s.extra,x+42,2994,ww-84,128,{text:true,font:29,color:s.c,align:'center'});
  dbs.push(g.card(s.db,'OWNED SQL SERVER DATABASE<br/>No cross-service FK',x+43,3275,ww-86,210,s.c,s.bg,32));
 });
 const redisBus=g.band('<b>ASYNC EVENT LANE — REDIS STREAMS</b>     Per-domain Outbox → XADD → XREADGROUP + XACK → ProcessedEvent/Inbox → Result Outbox / retry / dead letter',150,3590,7700,180,C.orangeBg,C.orange,34);
 // Dedicated 18 px side rails keep long async arrows OUTSIDE every component and owned-database box.
 for(const i of [0,1,2,3,5]){
  const x=130+i*1320, m=x+600;
  g.edge(components[i][5],redisBus,'',{color:C.orange,dashed:true,width:5,
    exit:[0,.5],entry:[(m-150)/7700,0],
    via:[[x+18,2802],[x+18,3542],[m,3542]]});
 }
 // The Recommendation service consumes approved Catalog/Rule snapshots; Worker consumes scheduled jobs.
 for(const [i,j] of [[4,3],[5,0]]){
  const x=130+i*1320,m=x+600,endY=1310+j*276+112;
  g.edge(redisBus,components[i][j],'',{color:C.green,dashed:true,width:5,
    exit:[(m-150)/7700,0],entry:[1,.5],
    via:[[x+1178,3542],[x+1178,endY]]});
 }
 g.band('<b>KEY SERVICE INTERACTIONS</b>    Gateway → Identity/Catalog/Planning/Tracking [REST]  •  Planning → Recommendation [gRPC]  •  Worker ↔ Redis [consumer + publisher]  •  Recommendation ← versioned Catalog/Rule snapshots',150,3860,7700,170,'#F2F6FD','#D1DCEB',31);
 g.band('<b>IMPLEMENTATION STATUS (2026-11-05)</b>    CURRENT: one REST API + TrackingDb + WorkerDb + Redis reminder E2E, gRPC skeleton. TARGET: YARP + six independent domain services and full catalog/planning/ranking. Do NOT mistake proposals for shipped code.',150,4105,7700,230,'#FFF7EA','#DDB56B',31);
 g.band('<b>COMPONENTS WITHIN SEPARATE CONTAINERS</b>    This one-page atlas intentionally juxtaposes six Level-3 service internals. Official C4 normally gives each container its own C2; this view is a consolidated assignment handout.',150,4440,7700,125,'#F2F5FA','#D9E0EB',28);
 g.save('05-c2-component-architecture.drawio');
}
