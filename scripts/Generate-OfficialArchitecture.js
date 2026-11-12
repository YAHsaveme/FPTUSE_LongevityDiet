'use strict';
/**
 * LongevityDiet: exactly five clean, centered, strictly top-down C4/ERD/flow
 * diagrams. diagrams.net native XML, square monochrome shapes and route edges.
 *
 * Rules: vertical top->bottom overview; every functional shape connected;
 * connector captions are INDEPENDENT text blocks offset off the arrow,
 * never rendered on top of a connector. Redis is the primary async transport;
 * RabbitMQ is opt-in, implemented as a real metadata-only event audit mirror.
 */
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(__dirname,'../docs/assignment/one-page');
fs.mkdirSync(dir,{recursive:true});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
 .replaceAll('>','&gt;').replaceAll('"','&quot;');
const v=s=>esc(s).replace(/\n/g,'&lt;br/&gt;');
class Diagram {
 constructor(name,width,height){this.name=name;this.width=width;this.height=height;
  this.nodes=[];this.links=[];this.ids=new Set();}
 claim(id){if(this.ids.has(id))throw Error('Duplicate ID: '+id);this.ids.add(id);}
 box(id,value,x,y,w,h,opts={}){
  this.claim(id);
  let style=['html=1','whiteSpace=wrap','rounded=0','strokeColor=#000000',
   'strokeWidth='+(opts.line||1.8),'fillColor=#FFFFFF',
   'fontColor=#000000','fontFamily=Arial','fontSize='+(opts.font||27),
   'align=center','verticalAlign=middle','spacing=10'];
  if(opts.bold)style.push('fontStyle=1');
  if(opts.actor)style.push('shape=umlActor','labelPosition=center',
   'verticalLabelPosition=bottom','verticalAlign=top','spacingTop=10');
  if(opts.db)style.push('shape=cylinder3','boundedLbl=1','size=16');
  if(opts.dashed)style.push('dashed=1','dashPattern=7 6');
  if(opts.panel)style.push('strokeWidth=2.1');
  if(opts.note)style.push('text','strokeColor=none','fillColor=none',
    'align='+(opts.align||'left'));
  if(opts.bar)style.push('fillColor=#000000','strokeWidth=0');
  const n={id,value:v(value),x,y,w,h,style:style.join(';')+';',
   background:!!(opts.panel||opts.bar),annotation:!!opts.note};
  this.nodes.push(n);return n;
 }
 note(id,value,x,y,w,h,opts={}){return this.box(id,value,x,y,w,h,{...opts,note:true})}
 actor(id,value,x,y,w=300,h=160){
  // Actor is a compact, proportional human icon. Caption is a separate label
  // ABOVE the figure so its outgoing connector never crosses letterforms.
  this.note('actor-caption-'+id,value,x,y,w,55,{font:27,bold:true,align:'center'});
  return this.box(id,'',x+(w-104)/2,y+100,104,124,{actor:true,font:20,line:2.2});
 }
 edge(id,from,to,opts={}){
  if(!this.ids.has(from)||!this.ids.has(to))throw Error('Unconnected edge '+id);
  this.claim('edge-'+id);
  const a=this.nodes.find(n=>n.id===from), b=this.nodes.find(n=>n.id===to);
  const pFrom=opts.from||[0.5,1],pTo=opts.to||[0.5,0];
  const style=[
   'edgeStyle=segmentEdgeStyle','orthogonal=1','rounded=0',
   'html=1','strokeColor=#000000','strokeWidth='+(opts.line||2.3),
   'startArrow=none','endArrow='+(opts.arrow===false?'none':'block'),
   'endFill=1','endSize=11',
   'exitX='+pFrom[0],'exitY='+pFrom[1],'exitPerimeter=0',
   'entryX='+pTo[0],'entryY='+pTo[1],'entryPerimeter=0'
  ];
  if(opts.dashed)style.push('dashed=1','dashPattern=6 6');
  this.links.push({id:'edge-'+id,from,to,style:style.join(';')+';',points:opts.points||[]});
  // Edge captions are separate WHITE text blocks ABOVE horizontal connectors
  // or BESIDE vertical connectors; labels never sit on actual arrow strokes.
  if(opts.label){
   const ax=a.x+a.w*pFrom[0], ay=a.y+a.h*pFrom[1],
     bx=b.x+b.w*pTo[0], by=b.y+b.h*pTo[1];
   const horizontal=Math.abs(bx-ax)>Math.abs(by-ay)*1.2;
   const lx=opts.labelX??(horizontal?(ax+bx)/2-150:Math.max(ax,bx)+42);
   const ly=opts.labelY??(horizontal?Math.min(ay,by)-55:(ay+by)/2-29);
   this.note('label-'+id,opts.label,lx,ly,opts.labelWidth||300,45,{font:opts.labelFont||21,align:'left'});
  }
 }
 title(code,heading,description){
  this.note('title-code',code,110,55,240,100,{font:62,bold:true});
  this.note('title-heading',heading,370,53,this.width-480,96,{font:54,bold:true});
  this.note('title-description',description,140,176,this.width-280,75,{font:24});
  this.box('title-rule','',140,286,this.width-280,3,{line:0,bar:true});
 }
 footer(value){
  this.box('bottom-rule','',140,this.height-170,this.width-280,3,{line:0,bar:true});
  this.note('footer',value,150,this.height-155,this.width-300,90,{font:21});
 }
 save(){
  const children=['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'];
  const renderNode=n=>'<mxCell id="'+esc(n.id)+'" value="'+n.value+
   '" style="'+esc(n.style)+'" vertex="1" parent="1"><mxGeometry x="'+n.x+
   '" y="'+n.y+'" width="'+n.w+'" height="'+n.h+
   '" as="geometry"/></mxCell>';
  // Panels and rails must be drawn first; they must not cover visible edges.
  children.push(...this.nodes.filter(n=>n.background).map(renderNode));
  for(const e of this.links){
   const waypoints=e.points.length?
    '<Array as="points">'+e.points.map(p=>'<mxPoint x="'+p.x+
     '" y="'+p.y+'"/>').join('')+'</Array>':'';
   children.push('<mxCell id="'+esc(e.id)+'" value="" style="'+
    esc(e.style)+'" edge="1" source="'+esc(e.from)+'" target="'+
    esc(e.to)+'" parent="1"><mxGeometry relative="1" as="geometry">'+
    waypoints+'</mxGeometry></mxCell>');
  }
  children.push(...this.nodes.filter(n=>!n.background).map(renderNode));
  const xml='<?xml version="1.0" encoding="UTF-8"?>\n'+
   '<mxfile host="app.diagrams.net" version="32.6.10">'+
   '<diagram name="'+esc(this.name)+'" id="official-'+
    esc(this.name.replaceAll(' ','-'))+'">'+
   '<mxGraphModel page="1" grid="1" gridSize="10" pageWidth="'+this.width+
   '" pageHeight="'+this.height+'" connect="1" arrows="1" pageScale="1">'+
   '<root>'+children.join('')+'</root></mxGraphModel></diagram></mxfile>\n';
  fs.writeFileSync(path.join(dir,this.name+'.drawio'),xml,'utf8');
  const orphan=this.nodes.filter(n=>!n.annotation&&!n.background &&
   !this.links.some(e=>e.from===n.id||e.to===n.id));
  if(orphan.length)throw Error(this.name+': isolated nodes '+orphan.map(x=>x.id));
  console.log('VERTICAL_DIAGRAM '+this.name+' functional='+
    this.nodes.filter(n=>!n.annotation&&!n.background).length+
    ' edges='+this.links.length+' orphan=0');
 }
}
function bus(d,id,x,y,h){
 return d.box(id,'',x,y,5,h,{line:0,bar:true});
}
const groups=[
 {id:'identity',short:'Identity',name:'IDENTITY',port:'REST :8081',
  api:'Auth / Profile / JWT',logic:'Xác thực, phân quyền\nRefresh Token, hồ sơ',
  db:'LongevityIdentityDb',out:'IdentityOutbox',
  tables:['Users','UserProfiles','RefreshTokens','ReminderPreferences','UserNotifications','IdentityOutbox','IdentityInbox'],
  fks:'UserProfiles → Users\nRefreshTokens → Users\nReminderPreferences → Users\nUserNotifications → Users'},
 {id:'catalog',short:'Catalog',name:'CATALOG',port:'REST :8082',
  api:'Foods / Recipes / Rules',logic:'Quy tắc dinh dưỡng\nDuyệt và lưu phiên bản',
  db:'LongevityCatalogDb',out:'Rule Audits / Events',
  tables:['Recipes','RecipeIngredients','Allergens','RecipeAllergens','DietRules','RuleVersions','Foods','RuleSetVersions','RuleAudits','RuleSetVersionItems'],
  fks:'RecipeIngredients → Recipes\nRecipeIngredients → Foods\nRecipeAllergens → Recipes\nRecipeAllergens → Allergens\nRuleVersions → DietRules\nRuleAudits → RuleVersions\nRuleSetVersionItems → RuleSetVersions\nRuleSetVersionItems → RuleVersions'},
 {id:'planning',short:'Planning',name:'PLANNING',port:'REST :8083',
  api:'Meal Plan / FMD / Challenge',logic:'Điều phối thực đơn\nCổng an toàn FMD',
  db:'LongevityPlanningDb',out:'PlanningOutbox',
  tables:['MealPlans','MealPlanDays','PlannedMeals','UserDietaryPreferences',
    'ChallengeTemplates','ChallengeDayTemplates','UserChallenges','UserChallengeDays',
    'FmdCycles','FmdCycleDays','FmdSafetyAssessments','FmdEducationAcknowledgements','PlanningOutbox'],
  fks:'MealPlanDays → MealPlans\nPlannedMeals → MealPlanDays\nChallengeDayTemplates → ChallengeTemplates\nUserChallenges → ChallengeTemplates\nUserChallengeDays → UserChallenges\nFmdCycleDays → FmdCycles'},
 {id:'tracking',short:'Tracking',name:'TRACKING',port:'REST :8084',
  api:'Meal Logs / Activity / LDAS',logic:'Nhật ký, cửa sổ ăn\nChấm điểm LDAS',
  db:'LongevityTrackingDb',out:'TrackingOutbox',
  tables:['MealLogs','MealLogItems','AdherenceScores','ScoreDimensions',
    'ActivityLogs','ActivityGoals','EatingWindowSnapshots','TrackingScoreSignals',
    'ScoreConfigurationVersions','TrackingOutbox'],
  fks:'MealLogItems → MealLogs\nScoreDimensions → AdherenceScores'},
 {id:'recommendation',short:'Recommendation',name:'RECOMMENDATION',
  port:'REST :8087 / gRPC :8085',api:'Gợi ý món / Phản hồi',
  logic:'Lọc dị ứng (hard constraint)\nXếp hạng theo RuleVersion',
  db:'LongevityRecommendationDb',out:'RecommendationOutbox',
  tables:['RecommendationFeedbacks','UserFoodPreferences','RecommendationOutbox','RecommendationInbox'],
  fks:'Không có FK vật lý trong RecommendationDb\nID tham chiếu liên miền chỉ ở tầng ứng dụng'},
 {id:'worker',short:'Worker Ops',name:'WORKER / OPS',port:'REST :8086 + Worker',
  api:'Job / Event / Dead-letter',logic:'Nhắc lịch / Báo cáo\nConsumer, retry và audit',
  db:'LongevityWorkerDb',out:'WorkerOutbox / Inbox',
  tables:['ReminderSchedules','ReminderDispatchRecords','WorkerProcessedEvents','WorkerOutbox',
    'WorkerReceivedEvents','WorkerEventDeadLetters'],
  fks:'Không có FK vật lý trong WorkerDb\nSource + EventId: khóa chính kép chống trùng'}
];

// C0: one coherent context with two human actors above system.
{
 const d=new Diagram('C0',2600,2080);
 d.title('C0','SYSTEM CONTEXT','LongevityDiet: ranh giới ứng dụng nhìn từ người dùng / quản trị');
 d.actor('member','THÀNH VIÊN\nMember',550,430,430,215);
 d.actor('admin','QUẢN TRỊ VIÊN\nAdmin',1620,430,430,215);
 d.box('system','LONGEVITYDIET\nHệ thống cá nhân hóa chế độ ăn trường thọ\n\nTài khoản và hồ sơ — Quy tắc dinh dưỡng\nThực đơn và FMD — Nhật ký và vận động\nLDAS — Thử thách — Báo cáo và nhắc nhở',
  580,1060,1440,580,{font:41,line:3});
 d.edge('member-system','member','system',{to:[0.3,0],label:'Đăng nhập / theo dõi',labelX:680,labelY:820});
 d.edge('admin-system','admin','system',{to:[0.7,0],label:'Quản trị / kiểm toán',labelX:1630,labelY:820});
 d.footer('C0 chỉ trình bày các tác nhân và ranh giới hệ thống. Sơ đồ C1 thể hiện container, database và message broker.');
 d.save();
}

// C1: all six containers share an explicit routing spine. Each row consists
// of a service and its own SQL catalog; each outbox connects to the event spine.
{
 const d=new Diagram('C1',3200,4920);
 d.title('C1','CONTAINER ARCHITECTURE','ADR-005 TARGET QA (chưa production cutover). Public HTTPS :443 dự kiến; Web :80, YARP :8080 nội bộ.');
 d.actor('member','MEMBER',970,380,350,190);
 d.actor('admin','ADMIN',1870,380,350,190);
 d.box('web','WEB APP\nReact / Nginx  HTTP :80',1180,740,840,170,{font:35});
 d.edge('member-web','member','web',{to:[0.25,0],label:'UI HTTPS :443 (TARGET)',labelX:800,labelY:640,labelWidth:315});
 d.edge('admin-web','admin','web',{to:[0.75,0],label:'UI HTTPS :443 (TARGET)',labelX:2080,labelY:640,labelWidth:315});
 d.box('gateway','YARP API GATEWAY\n/api/v1 — JWT / HTTP :8080',1180,1030,840,170,{font:34});
 d.edge('web-gateway','web','gateway',{label:'REST HTTP / JWT nội bộ',labelX:2060,labelY:945,labelWidth:400});
 d.box('router','SERVICE ROUTING\nTách miền và kiểm tra quyền',1190,1315,820,145,{font:31});
 d.edge('gateway-router','gateway','router',{label:'Route theo API',labelX:2070,labelY:1212});
 bus(d,'route-spine',390,1600,1910);
 d.edge('router-branch','router','route-spine',{from:[0,1],to:[0.5,0],
  points:[{x:395,y:1525}],label:'Fan-out theo đường dẫn',labelX:450,labelY:1480});
 bus(d,'event-spine',2800,1610,1900);
 d.note('heading-routes','HTTP API / gRPC và database thuộc từng service',600,1532,2250,55,{font:27,bold:true});
 for(let i=0;i<groups.length;i++){
  const g=groups[i],y=1650+i*303;
  d.box('svc-'+g.id,g.name+'\n'+g.api+'\n'+g.port,
   650,y,725,190,{font:30,bold:true});
  d.box('db-'+g.id,g.db+'\nSQL :1433 — riêng miền\n'+g.out,
   1700,y,725,190,{font:27,db:true});
  const frac=(y+95-1600)/1910;
  d.edge('route-'+g.id,'route-spine','svc-'+g.id,{
   from:[1,frac],to:[0,0.5],label:g.short,
   labelX:430,labelY:y+26,labelFont:20,labelWidth:200});
  d.edge('sql-'+g.id,'svc-'+g.id,'db-'+g.id,{
   from:[1,0.5],to:[0,0.5],label:'EF Core / SQL',
   labelX:1415,labelY:y+25,labelFont:21});
  d.edge('outbox-'+g.id,'db-'+g.id,'event-spine',{
   from:[1,0.5],to:[0,(y+95-1610)/1900],
   dashed:true});
 }
 d.box('outbox','SQL OUTBOX / DOMAIN EVENTS\nPublish event metadata to Redis Streams',
  1180,3630,840,155,{font:30});
 d.edge('events-outbox','event-spine','outbox',{from:[0.5,1],to:[1,0.5],
  points:[{x:2806,y:3695}],dashed:true,label:'Sự kiện đã commit',
  labelX:2100,labelY:3638});
 d.box('redis','REDIS STREAMS\nACTIVE — TCP 6379\nPrimary business event transport',
  460,3990,900,205,{font:31});
 d.box('rabbit','RABBITMQ — AMQP 5672\nOPTIONAL / QA VERIFIED\nAudit: Planning / Tracking / Catalog / Reco',
  1840,3990,900,205,{font:29,dashed:true});
 d.edge('outbox-redis','outbox','redis',{to:[0.5,0],dashed:true,
  label:'XADD / XREADGROUP',labelX:645,labelY:3850});
 d.edge('redis-rabbit','redis','rabbit',{
  from:[1,0.5],to:[0,0.5],dashed:true,
  label:'Audit mirror / broker confirms',labelX:1390,labelY:4005,labelWidth:410});
 d.box('consumer','WORKER OPS EVENT RECEIVER\nRedis ACK / Rabbit ACK sau SQL commit\nIdempotency — Retry — DLQ',
  1030,4380,1140,235,{font:30});
 d.edge('redis-consumer','redis','consumer',{to:[0.25,0],dashed:true,
  label:'Worker stream',labelX:910,labelY:4267});
 d.edge('rabbit-consumer','rabbit','consumer',{to:[0.75,0],dashed:true,
  label:'Rabbit queue',labelX:2230,labelY:4267});
 d.footer('Nét liền: HTTP/gRPC/SQL. Nét đứt: events. Outbox → Redis → RabbitMQ audit (tùy chọn); Redis là vận chuyển nghiệp vụ mặc định.');
 d.save();
}

// C2: internal component pipelines are truly TOP -> BOTTOM. Each domain is
// reached from a gateway routing rail, and each persistent outbox is attached
// to an event rail. No functional component stands alone.
{
 const d=new Diagram('C2',3100,6000);
 d.title('C2','COMPONENT ARCHITECTURE','ADR-005 TARGET QA: Endpoint → Service → Repository / SQL Outbox; sáu miền tách biệt. Public TLS :443 chưa cutover.');
 d.actor('member','MEMBER',1000,370,310,165);
 d.actor('admin','ADMIN',1800,370,310,165);
 d.box('web','REACT SPA  /  NGINX',1130,680,840,125,{font:33});
 d.edge('member-web','member','web',{to:[0.26,0]});
 d.edge('admin-web','admin','web',{to:[0.74,0]});
 d.box('gateway','YARP — AUTHENTICATED ROUTES',1130,940,840,130,{font:34});
 d.edge('web-gateway','web','gateway',{label:'HTTP / JWT',
  labelX:2005,labelY:855});
 bus(d,'api-spine',325,1230,3820);
 d.edge('gateway-spine','gateway','api-spine',{from:[0,1],to:[0.5,0],
  points:[{x:330,y:1150}],label:'REST route dispatch',
  labelX:445,labelY:1130});
 bus(d,'event-spine',2800,1250,3790);
 const keys=['id','cat','plan','track','rec','work'];
 for(let i=0;i<groups.length;i++){
  const g=groups[i],key=keys[i],y=1305+i*625;
  d.box('panel-'+key,'',515,y,2035,550,{panel:true});
  d.note('heading-'+key,g.name+' — '+g.port,610,y+18,1845,65,
   {font:30,bold:true});
  d.box('endpoint-'+key,'ENDPOINT / CONTROLLER\n'+g.api,
   1035,y+100,970,100,{font:27});
  d.box('service-'+key,'APPLICATION / DOMAIN\n'+g.logic,
   1035,y+251,970,110,{font:27});
  d.box('repo-'+key,'REPOSITORY / DbContext\n'+g.db+' / '+g.out,
   1035,y+414,970,105,{font:26,db:true});
  const rowFrac=(y+150-1230)/3820;
  d.edge('api-'+key,'api-spine','endpoint-'+key,{
   from:[1,rowFrac],to:[0,0.5],label:'REST',labelX:600,labelY:y+95});
  d.edge('domain-'+key,'endpoint-'+key,'service-'+key,{
   label:'Validate / business rules',labelX:2040,labelY:y+209});
  d.edge('persistence-'+key,'service-'+key,'repo-'+key,{
   label:'SQL / EF Core',labelX:2040,labelY:y+372,labelWidth:205});
  d.edge('emit-'+key,'repo-'+key,'event-spine',{
   from:[1,0.5],to:[0,(y+466-1250)/3790],
   dashed:true,label:g.id==='catalog'?'Domain event':'Outbox',labelX:2270,labelY:y+402,labelWidth:160});
 }
 d.box('queue-dispatch','OUTBOX EVENT DELIVERY\nRedis publish — Replay — Inbox / DLQ',
  990,5200,1110,185,{font:29});
 d.edge('event-dispatch','event-spine','queue-dispatch',{
  from:[0.5,1],to:[1,0.5],points:[{x:2806,y:5280}],
  dashed:true,label:'Events',labelX:2190,labelY:5220});
 d.box('redis','REDIS STREAMS — ACTIVE\nXADD / XREADGROUP / XACK',
  370,5500,1010,190,{font:29});
 d.box('rabbit','RABBITMQ — OPTIONAL QA\nExchange / Durable queue / ACK',
  1720,5500,1010,190,{font:29,dashed:true});
 d.edge('dispatch-redis','queue-dispatch','redis',{to:[0.5,0],
  dashed:true,label:'Primary',labelX:690,labelY:5395});
 d.edge('redis-rabbit','redis','rabbit',{
  from:[1,0.5],to:[0,0.5],dashed:true,
  label:'Audit mirror',labelX:1395,labelY:5517,labelWidth:300});
 d.footer('C2 là mô hình thành phần mục tiêu: Redis hoạt động, RabbitMQ hỗ trợ audit mirror khi bật. Một số API legacy chưa được cutover.');
 d.save();
}

// Database Diagram: six visually centered domains. Every table is attached
// to a database ownership spine; the spine expresses membership ONLY,
// not a made-up physical foreign key.
{
 const d=new Diagram('Database Diagram',3150,4730);
 d.title('ERD','DATABASE DIAGRAM — 6 SQL DATABASES',
  'ADR-005 TARGET QA: 50 bảng vật lý trong 6 SQL database; đường tới spine là quan hệ sở hữu, không phải FK.');
 for(let i=0;i<groups.length;i++){
  const g=groups[i],col=i%2,row=Math.floor(i/2);
  const x=240+col*1400,y=410+row*1350,w=1270,h=1250;
  const key=g.id;
  d.box('panel-'+key,'',x,y,w,h,{panel:true});
  d.box('db-'+key,g.db+'\nOwner database — SQL :1433',
    x+280,y+68,710,116,{font:31,db:true});
  const spineX=x+630,spineY=y+286,spineH=670;
  bus(d,'spine-'+key,spineX,spineY,spineH);
  d.edge('own-'+key,'db-'+key,'spine-'+key,{to:[0.5,0],
    label:'Owns tables',labelX:x+885,labelY:y+205,labelFont:19});
  // Registry lanes give every physical table an explicit database owner.
  // Pale/dashed ownership strokes must never be mistaken for SQL foreign keys.
  for(let j=0;j<g.tables.length;j++){
   const isLeft=j%2===0,r=Math.floor(j/2),table=g.tables[j];
   const ty=y+332+r*89,id='tbl-'+key+'-'+j;
   const tx=x+(isLeft?35:735);
   d.box(id,table,tx,ty,500,64,{font:table.length>23?23:26});
   const frac=(ty+32-spineY)/spineH;
   if(isLeft)d.edge('table-'+key+'-'+j,'spine-'+key,id,{
    from:[0,frac],to:[1,0.5],arrow:false,line:1.1,dashed:true});
   else d.edge('table-'+key+'-'+j,'spine-'+key,id,{
    from:[1,frac],to:[0,0.5],arrow:false,line:1.1,dashed:true});
  }
  // Actual verified child -> parent foreign keys, as native Draw.io edges.
  // Vertical waypoints stay in the empty gutter: NEVER across table text.
  // Identity/Catalog/Planning/Tracking contribute 4+8+6+2 = 20 physical FKs.
  const fks=g.fks.split(String.fromCharCode(10))
   .map(row=>row.split('→').map(part=>part.trim()))
   .filter(parts=>parts.length===2);
  const expectedFks={identity:4,catalog:8,planning:6,tracking:2,recommendation:0,worker:0};
  if(fks.length!==expectedFks[key])throw Error('Wrong FK count '+key+': '+fks.length);
  for(let ri=0;ri<fks.length;ri++){
   const child=g.tables.indexOf(fks[ri][0]),parent=g.tables.indexOf(fks[ri][1]);
   if(child<0||parent<0)throw Error('Unresolved SQL FK '+key+' '+fks[ri].join(' → '));
   const childLeft=(child%2)===0,parentLeft=(parent%2)===0;
   const cy=y+332+Math.floor(child/2)*89+32;
   const py=y+332+Math.floor(parent/2)*89+32;
   let from,to,points;
   if(childLeft===parentLeft){
    // Same-column relationships bend around the outer margin of the registry.
    const lane=x+(childLeft?14:w-14);
    from=childLeft?[0,0.5]:[1,0.5];
    to=parentLeft?[0,0.5]:[1,0.5];
    points=[{x:lane,y:cy},{x:lane,y:py}];
   }else if(Math.abs(cy-py)<2){
    // Same-row relationships route ABOVE both table cells, not through a label.
    const lane=cy-48;
    from=[0.5,0];to=[0.5,0];
    points=[
     {x:x+(childLeft?285:985),y:lane},
     {x:x+(parentLeft?285:985),y:lane}
    ];
   }else{
    // Opposite-column relationships stay entirely within the center gutter.
    const lane=x+580+(ri%5)*22;
    from=childLeft?[1,0.5]:[0,0.5];
    to=parentLeft?[1,0.5]:[0,0.5];
    points=[{x:lane,y:cy},{x:lane,y:py}];
   }
   d.edge('fk-'+key+'-'+ri,'tbl-'+key+'-'+child,
    'tbl-'+key+'-'+parent,{from,to,points,line:2.5});
  }
  d.note('fk-'+key,
   'FK VẬT LÝ (BẢNG CON → BẢNG CHA): '+fks.length+' đường có mũi tên'+String.fromCharCode(10)+g.fks,
   x+55,y+982,w-110,250,{font:21});
 }
 d.footer('Đường vào bus = quyền sở hữu bảng; bảng liệt kê FK vật lý kiểm chứng bằng SQL bên dưới mỗi database. Không có FK SQL xuyên service.');
 d.save();
}

// Business Flow: longitudinal path from member onboarding to notification,
// Admin branch merges into Catalog, FMD is a guarded subflow and the durable
// asynchronous path mirrors real Redis-to-Rabbit-to-Worker event observation.
{
 const d=new Diagram('Business Flow',3050,5980);
 d.title('FLOW','BUSINESS FLOW — E2E','Người dùng → xác thực → kế hoạch → ghi nhận → LDAS → sự kiện → Worker → báo cáo.');
 d.actor('member','MEMBER',1200,360,380,185);
 d.actor('admin','ADMIN',2240,360,350,185);
 const main=[
  ['auth','01  IDENTITY\nĐăng ký / đăng nhập (JWT)',650],
  ['profile','02  PROFILE\nDị ứng, mục tiêu, loại trừ',1010],
  ['catalog','03  CATALOG\nRuleVersion đã phê duyệt',1370],
  ['planning','04  PLANNING\nThực đơn 7 / 14 ngày',1730],
  ['tracking','05  TRACKING\nGhi bữa ăn và vận động',2270],
  ['score','06  LDAS\nĐiểm và tiến độ theo ngày',2630],
  ['outbox','07  SQL OUTBOX\nCommit nghiệp vụ + Event',3000],
  ['redis','08  REDIS STREAMS\nXADD — XREADGROUP — XACK',3380],
  ['worker','09  WORKER\nRetry / Idempotency / DLQ',4150],
  ['report','10  BÁO CÁO\nWeekly progress + Reminders',4560],
  ['end','11  MEMBER DASHBOARD\nXem tiến độ và thông báo',4960]
 ];
 const mx=1100,mw=850,mh=162;
 for(const [id,t,y] of main)d.box(id,t,mx,y,mw,mh,{font:30});
 d.edge('member-auth','member','auth',{to:[0.5,0],
  label:'Bắt đầu',labelX:1980,labelY:550});
 for(let i=0;i<main.length-1;i++){
  // Worker follows the event path through broker (separate Rabbit branch).
  if(main[i][0]==='redis')continue;
  d.edge('flow-'+i,main[i][0],main[i+1][0],{
   label:i===5?'Commit + Outbox':undefined,
   labelX:1990,labelY:main[i][2]+220});
 }
 // Admin governance contributes versioned rules to the member's catalog.
 d.box('admin-rbac','ADMIN RBAC\nRole = Admin',2190,780,650,145,{font:28});
 d.box('admin-review','Duyệt Food / Recipe\nXuất bản RuleVersion',2190,1100,650,165,{font:27});
 d.edge('admin-rbac','admin','admin-rbac',{label:'Authorization',
  labelX:2030,labelY:637,labelWidth:155});
 d.edge('admin-publish','admin-rbac','admin-review',{
  label:'Audit thay đổi',labelX:1815,labelY:960});
 d.edge('admin-catalog','admin-review','catalog',{
  from:[0,0.7],to:[1,0.5],label:'Published rules',
  labelX:1920,labelY:1280});
 // FMD branch originates from Planning, and terminates in an explicit
 // business outcome, never silently bypassing a safety gate.
 // Split FMD safety outcomes into aligned parallel branches. A straight
 // YES branch rejoins Tracking; NO remains a terminal outcome for FMD only.
 d.box('fmd-request','FMD: Người dùng yêu cầu\nĐọc cảnh báo + đồng ý',140,1740,800,160,{font:27});
 d.box('fmd-gate','SAFETY GATE\nĐủ điều kiện?',140,2060,800,165,{font:28});
 d.box('fmd-no','NO — KHÔNG ĐỦ ĐIỀU KIỆN\nKhông tạo chu kỳ FMD',100,2375,440,170,{font:24,dashed:true});
 d.box('fmd-yes','YES — ĐỦ ĐIỀU KIỆN\nTheo dõi chu kỳ FMD',565,2375,440,170,{font:24});
 d.edge('planning-fmd','planning','fmd-request',{
  from:[0,0.5],to:[1,0.5],label:'Chọn FMD',
  labelX:945,labelY:1668,labelWidth:185});
 d.edge('fmd-1','fmd-request','fmd-gate',{label:'Safety assessment',
  labelX:980,labelY:1940,labelWidth:235});
 d.edge('fmd-2','fmd-gate','fmd-yes',{
  from:[0.80625,1],to:[0.5,0],label:'YES',
  labelX:805,labelY:2275,labelWidth:100});
 d.edge('fmd-3','fmd-gate','fmd-no',{
  from:[0.225,1],to:[0.5,0],label:'NO',
  labelX:155,labelY:2275,labelWidth:95});
 d.edge('fmd-accepted-to-tracking','fmd-yes','tracking',{
  from:[1,0.35],to:[0,0.95],label:'FMD → Log',
  labelX:960,labelY:2315,labelWidth:125,labelFont:18});
 // RabbitMQ is a real opt-in metadata audit mirror from Redis Streams.
 d.box('rabbit','RABBITMQ — AMQP :5672\nOPTIONAL — durable audit queue\nPublisher confirm / ACK',2150,3410,750,190,{font:27,dashed:true});
 d.edge('redis-rabbit','redis','rabbit',{from:[1,0.5],to:[0,0.5],
  dashed:true,label:'Audit metadata mirror',
  labelX:1910,labelY:3325});
 d.box('rabbit-audit','Worker Ops Rabbit consumer\nSQL receipt, deduplication',2150,3780,750,170,{font:27});
 d.edge('rabbit-worker','rabbit','rabbit-audit',{
  dashed:true,label:'Manual ACK after SQL',
  labelX:1960,labelY:3655});
 d.edge('redis-worker','redis','worker',{
  dashed:true,label:'Primary event flow',
  labelX:1840,labelY:3935,labelWidth:270});
 d.box('audit-receipt','WORKER OWNED SQL\nWorkerReceivedEvents (audit receipt)',
  2150,4170,750,165,{font:25,db:true});
 d.edge('rabbit-audit-sql','rabbit-audit','audit-receipt',{
  dashed:true,label:'Commit rồi ACK',
  labelX:2060,labelY:4010});
 d.footer('Dòng chính từ trên xuống; Admin phê duyệt rule, FMD qua Safety Gate. Redis thực hiện nghiệp vụ, RabbitMQ ghi nhận metadata audit độc lập.');
 d.save();
}
console.log('OFFICIAL_VERTICAL_FIVE_SOURCES_READY');
