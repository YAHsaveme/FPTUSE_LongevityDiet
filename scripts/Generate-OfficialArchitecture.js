'use strict';
// The ONLY source generator for the five official LongevityDiet architecture
// drawings. Editable diagrams.net XML, monochrome, strictly source-grounded.
// RabbitMQ is an explicitly PLANNED alternative; Redis Streams is operational.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'docs','assignment','one-page');
fs.mkdirSync(dir,{recursive:true});
const escap=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const label=s=>String(s).split('\n').map(escap).join('&lt;br/&gt;');
class Drawing{
 constructor(name,w,h){this.name=name;this.w=w;this.h=h;this.nodes=[];this.edges=[];this.ids=new Set();}
 addId(id){if(this.ids.has(id))throw Error(this.name+': duplicate '+id);this.ids.add(id)}
 rect(id,t,x,y,w,h,o={}){this.addId(id);const style=[
  'rounded=0','html=1','whiteSpace=wrap','strokeColor=#000000',
  'strokeWidth='+(o.strokeWidth??1.6),'fillColor=#FFFFFF',
  'fontColor=#000000','fontFamily=Arial','fontSize='+(o.font??22),
  'fontStyle='+(o.bold?1:0),'verticalAlign=middle',
  'align='+(o.align||'center'),'spacing=7',
  ...o.actor?['shape=umlActor','labelPosition=center','verticalLabelPosition=bottom','verticalAlign=top']:[],
  ...o.cylinder?['shape=cylinder3','boundedLbl=1','size=18']:[],
  ...o.dashed?['dashed=1','dashPattern=5 5']:[],
  ...o.text?['text','strokeColor=none','fillColor=none']:[],
  ...(o.other||[])
 ].join(';')+';';
 this.nodes.push({id,value:label(t),x,y,w,h,style});return id}
 text(id,t,x,y,w,h,o={}){return this.rect(id,t,x,y,w,h,{...o,text:true,align:o.align||'left'})}
 edge(id,source,target,t='',o={}){
  if(!this.ids.has(source)||!this.ids.has(target))throw Error(this.name+': dangling '+source+' '+target);
  this.addId(id);const side=o.vertical?['exitX=0.5','exitY=1','entryX=0.5','entryY=0']:
   ['exitX=1','exitY=0.5','entryX=0','entryY=0.5'];
  const st=['edgeStyle=orthogonalEdgeStyle','rounded=0','orthogonalLoop=1','jettySize=auto',
    'html=1','strokeColor=#000000','strokeWidth='+(o.strokeWidth??2),
    'endArrow='+(o.noArrow?'none':'block'),'endFill=1','endSize=10',
    'fontColor=#000000','fontFamily=Arial','fontSize='+(o.font||17),
    'labelBackgroundColor=#FFFFFF','align=center','verticalAlign=middle',
    ...side,...o.dashed?['dashed=1','dashPattern=5 5']:[],
    ...(o.style||[])].join(';')+';';
  this.edges.push({id,source,target,value:label(t),style:st})}
 render(){
  const roots=['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'];
  // Background domain/database panels must be drawn BEFORE edges. Otherwise
  // their white fills hide the actual connector lines in the PDF export.
  const background=this.nodes.filter(n=>n.id.startsWith('panel-')||n.id.startsWith('box-'));
  for(const n of background)
   roots.push('<mxCell id="'+escap(n.id)+'" value="'+n.value+'" style="'+escap(n.style)+
    '" vertex="1" parent="1"><mxGeometry x="'+n.x+'" y="'+n.y+
    '" width="'+n.w+'" height="'+n.h+'" as="geometry"/></mxCell>');
  for(const e of this.edges)
   roots.push('<mxCell id="'+escap(e.id)+'" value="'+e.value+'" style="'+escap(e.style)+
    '" edge="1" source="'+escap(e.source)+'" target="'+escap(e.target)+
    '" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="0" y="-16" as="offset"/></mxGeometry></mxCell>');
  for(const n of this.nodes.filter(n=>!background.includes(n)))
   roots.push('<mxCell id="'+escap(n.id)+'" value="'+n.value+'" style="'+escap(n.style)+
    '" vertex="1" parent="1"><mxGeometry x="'+n.x+'" y="'+n.y+
    '" width="'+n.w+'" height="'+n.h+'" as="geometry"/></mxCell>');
  return '<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" version="32.6.10">'+
    '<diagram name="'+escap(this.name)+'" id="official-'+this.name.replace(/\s+/g,'-')+'">'+
    '<mxGraphModel page="1" pageScale="1" pageWidth="'+this.w+'" pageHeight="'+this.h+
    '" grid="1" gridSize="10" connect="1" arrows="1" tooltips="1" folding="1">'+
    '<root>'+roots.join('')+'</root></mxGraphModel></diagram></mxfile>\n'}
 save(){const output=path.join(dir,this.name+'.drawio');fs.writeFileSync(output,this.render(),'utf8');console.log('GENERATED '+output+' ['+this.nodes.length+' nodes, '+this.edges.length+' edges]')}
}
function header(d,section,title,subtitle){
 d.text('tag',section,60,31,210,70,{font:44,bold:true});
 d.text('title',title,290,32,d.w-370,75,{font:42,bold:true});
 d.text('subtitle',subtitle,70,120,d.w-145,51,{font:22});
 d.rect('rule','',70,187,d.w-140,3,{strokeWidth:0});
}
function info(d,id,t,x,y,w,h){d.rect(id,t,x,y,w,h,{font:23})}
function legend(d,t,y){d.text('footer',t,90,y,d.w-180,72,{font:20})}

// C0: C4 system context — no internal technologies / no spurious external system.
{
 const d=new Drawing('C0',2120,1280);
 header(d,'C0','SYSTEM CONTEXT | LONGEVITYDIET','Ranh giới hệ thống, hai tác nhân và hai quan hệ nghiệp vụ.');
 d.rect('member','NGƯỜI DÙNG\nMember',150,380,250,160,{actor:true,font:29,strokeWidth:2.4});
 d.rect('admin','QUẢN TRỊ\nAdmin',150,780,250,160,{actor:true,font:29,strokeWidth:2.4});
 d.rect('system',
  'LONGEVITYDIET\nNền tảng quản lý chế độ ăn trường thọ\n\nTài khoản - Hồ sơ - Thực đơn - Nhật ký\nVận động - LDAS - FMD - Thử thách\nThông báo - Báo cáo - Quản trị quy tắc',
  735,345,1110,635,{font:40,bold:false,strokeWidth:3});
 d.edge('member-system','member','system','Sử dụng / theo dõi',{font:23});
 d.edge('admin-system','admin','system','Quản trị / kiểm toán',{font:23});
 d.text('note','Phạm vi: góc nhìn người dùng. C1 thể hiện container; C2 thể hiện thành phần nội bộ.',110,1070,1880,105,{font:25});
 legend(d,'KÝ HIỆU: UML actor = người dùng; đường liền = giao tiếp nghiệp vụ. Database và message broker xem tại C1.',1180);
 d.save();
}

// C1: six service owners, own SQL catalogs and active/future broker distinction.
{
 const d=new Drawing('C1',3900,2110);
 header(d,'C1','CONTAINER ARCHITECTURE | SIX SERVICE OWNERS',
  'Mục tiêu ADR-005 trên hạ tầng Docker. Redis Streams đang chạy; RabbitMQ là phương án dự kiến.');
 d.rect('member','MEMBER',95,396,190,105,{actor:true,font:25});
 d.rect('admin','ADMIN',95,586,190,105,{actor:true,font:25});
 info(d,'web','WEB SPA\nReact / Nginx\nHTTP :80',395,456,275,155);
 info(d,'gateway','YARP API GATEWAY\nREST :8080\nJWT route forwarding',790,447,330,175);
 d.edge('m-web','member','web','HTTP');
 d.edge('a-web','admin','web','HTTP');
 d.edge('web-gateway','web','gateway','/api/v1');
 d.rect('routes','SERVICE-OWNED ROUTES | HTTP REST (JWT)\nNo cross-database query',1260,465,2515,112,{font:26,bold:true});
 d.edge('gw-route','gateway','routes','REST');
 const cols=[
  {id:'identity',x:1285,name:'IDENTITY',port:':8081',desc:'Auth / Profile',db:'LongevityIdentityDb'},
  {id:'catalog',x:1704,name:'CATALOG',port:':8082',desc:'Foods / Rules',db:'LongevityCatalogDb'},
  {id:'planning',x:2123,name:'PLANNING',port:':8083',desc:'Meal Plan / FMD',db:'LongevityPlanningDb'},
  {id:'tracking',x:2542,name:'TRACKING',port:':8084',desc:'Meal Log / LDAS',db:'LongevityTrackingDb'},
  {id:'recommendation',x:2961,name:'RECOMMENDATION',port:':8087 REST\n:8085 gRPC',desc:'Feedback / Rank',db:'LongevityRecommendationDb'},
  {id:'worker',x:3380,name:'WORKER / OPS',port:':8086 OPS',desc:'Reminders / Jobs',db:'LongevityWorkerDb'}
 ];
 for(const c of cols){
  d.rect('svc-'+c.id,c.name+'\n'+c.desc+'\n'+c.port,c.x,710,355,184,{font:23,bold:true});
  d.rect('db-'+c.id,c.db+'\nSQL Server 1433\nOwner only',c.x,1070,355,162,{font:21,cylinder:true});
  const midpoint=c.x+177.5;
  const exitX=((midpoint-1260)/2515).toFixed(5);
  d.edge('route-'+c.id,'routes','svc-'+c.id,'',{vertical:true,style:['exitX='+exitX,'exitY=1','entryX=0.5','entryY=0']});
  d.edge('own-'+c.id,'svc-'+c.id,'db-'+c.id,'EF Core',{vertical:true,font:18});
 }
 d.text('eventhead','ASYNCHRONOUS / EVENT TRANSPORT',1100,1385,2700,62,{font:29,bold:true});
 d.rect('outbox','OWNER OUTBOX\nTransactional SQL',1400,1520,425,125,{font:25});
 d.rect('redis','REDIS STREAMS\nTCP :6379\nACTIVE',1960,1520,410,125,{font:26,bold:true});
 d.rect('consumer','WORKER INBOX\nDedupe / Retry / DLQ',2530,1520,490,125,{font:24});
 d.edge('outbox-redis','outbox','redis','XADD',{dashed:true,font:21});
 d.edge('redis-worker','redis','consumer','XREADGROUP',{dashed:true,font:21});
 d.rect('rabbit','RABBITMQ / AMQP :5672\nPLANNED - NOT DEPLOYED\nFuture queue / fanout',1960,1775,575,145,{font:25,dashed:true});
 d.edge('rabbit-alt','redis','rabbit','Optional transport\n(not active)',{dashed:true,vertical:true,font:19,style:['exitX=0.5','exitY=1','entryX=0.38','entryY=0']});
 legend(d,'BLACK SOLID: REST / gRPC / owned SQL. DASHED: async messaging. RabbitMQ is an architecture option; no RabbitMQ client/consumer exists in the current source.',1995);
 d.save();
}

// C2: internal processing per bounded context.
{
 const d=new Drawing('C2',3820,2280);
 header(d,'C2','COMPONENT ARCHITECTURE | DOMAIN PIPELINES',
  'Mỗi miền kết nối REST endpoint → application service → persistence/outbox trong database riêng.');
 d.rect('actor','MEMBER / ADMIN',110,244,290,115,{actor:true,font:24});
 info(d,'web','React SPA\nNginx',515,244,260,115);
 info(d,'yarp','YARP Gateway\n/api/v1 (JWT)',900,244,325,115);
 d.edge('a-web','actor','web','HTTP');
 d.edge('web-yarp','web','yarp','REST');
 d.text('routenote','ROUTES: identity / catalog / planning / tracking / recommendation / worker-ops',1320,247,2400,102,{font:27,bold:true});
 const modules=[
  {id:'id',name:'IDENTITY',row:0,col:0,
   endpoint:'Auth / Profile\nREST :8081',
   logic:'JWT / Roles\nRefresh / Profile',
   storage:'IdentityDbContext\nUsers / Tokens\nOutbox / Inbox',
   path:'/auth/**  /profile'},
  {id:'cat',name:'CATALOG',row:0,col:1,
   endpoint:'Food / Recipe\nRules Admin :8082',
   logic:'Rule governance\nVersion / Approval',
   storage:'CatalogDbContext\nFoods / Recipes\nRules / Audit',
   path:'/foods /recipes /diet-rules'},
  {id:'plan',name:'PLANNING',row:0,col:2,
   endpoint:'Meal plans / FMD\nChallenges :8083',
   logic:'Plan orchestration\nAllergy / FMD gate',
   storage:'PlanningDbContext\nPlans / Challenges\nOutbox',
   path:'/meal-plans /challenges'},
  {id:'track',name:'TRACKING',row:1,col:0,
   endpoint:'Meal logs / LDAS\nActivity :8084',
   logic:'Eating window\nAdherence scoring',
   storage:'TrackingDbContext\nLogs / Scores\nOutbox',
   path:'/meal-logs /activities /ldas'},
  {id:'rec',name:'RECOMMENDATION',row:1,col:1,
   endpoint:'gRPC :8085\nREST :8087',
   logic:'Rule-safe ranking\nFeedback / Exclusions',
   storage:'RecommendationDb\nFeedback / Prefs\nOutbox / Inbox',
   path:'/recommendations/**'},
  {id:'work',name:'WORKER / OPS',row:1,col:2,
   endpoint:'Admin Ops :8086\nTimed background worker',
   logic:'Stream consumer\nReminder / DLQ',
   storage:'WorkerDbContext\nSchedules / Inbox\nDispatch / Outbox',
   path:'/admin/jobs /events /dead-letter'}
 ];
 for(const m of modules){
  const x=90+1250*m.col,y=435+670*m.row;
  d.rect('panel-'+m.id,'',x,y,1150,580,{strokeWidth:2});
  d.text('head-'+m.id,m.name,x+30,y+20,1050,58,{font:29,bold:true});
  d.text('path-'+m.id,'OWNED ROUTES: '+m.path,x+30,y+87,1045,65,{font:22});
  const yy=y+218;
  d.rect('ep-'+m.id,m.endpoint,x+32,yy,312,140,{font:22});
  d.rect('logic-'+m.id,m.logic,x+419,yy,312,140,{font:22});
  d.rect('db-'+m.id,m.storage,x+806,yy,312,140,{font:21,cylinder:true});
  d.edge('ep-logic-'+m.id,'ep-'+m.id,'logic-'+m.id,'domain',{font:17});
  d.edge('logic-db-'+m.id,'logic-'+m.id,'db-'+m.id,'EF/SQL',{font:17});
  d.text('foot-'+m.id,'No cross-owner SQL / target service isolated',x+33,y+433,1050,62,{font:20});
 }
 d.text('async-title','EVENT DELIVERY / OWNERSHIP',115,1830,3500,55,{font:30,bold:true});
 d.rect('pipeline-outbox','Domain Outbox\nSQL commit',710,1923,420,116,{font:22});
 d.rect('pipeline-redis','Redis Streams\nACTIVE :6379',1300,1923,440,116,{font:23,bold:true});
 d.rect('pipeline-inbox','Worker Inbox\nIdempotency / DLQ',1910,1923,460,116,{font:22});
 d.rect('pipeline-rabbit','RabbitMQ AMQP\nPLANNED :5672',2660,1923,550,116,{font:24,dashed:true});
 d.edge('p1','pipeline-outbox','pipeline-redis','publish',{dashed:true,font:18});
 d.edge('p2','pipeline-redis','pipeline-inbox','consume',{dashed:true,font:18});
 d.edge('p3','pipeline-inbox','pipeline-rabbit','alternative future broker',{dashed:true,font:16});
 legend(d,'Target architecture (ADR-005); legacy REST API still serves some routes. RabbitMQ is shown for future messaging only, not as an already connected production component.',2130);
 d.save();
}

// Database Diagram: complete 49 target-owner table names found in 7 DbContext classes.
// FK chains are physically mapped only within an owner catalog. Cross-owner
// UserId and business identifiers are logical references, never SQL FKs.
{
 const d=new Drawing('Database Diagram',3800,2680);
 header(d,'ERD','DATABASE DIAGRAM | SIX OWNED SQL CATALOGS',
  '49 bảng nghiệp vụ trong 6 database mục tiêu (không tính __EFMigrationsHistory); không có FK xuyên database.');
 const domains=[
  {id:'identity',col:0,row:0,name:'LongevityIdentityDb',tables:
   ['Users','UserProfiles','RefreshTokens','ReminderPreferences','UserNotifications','IdentityOutbox','IdentityInbox'],
   relations:'FK: Users 1:1 UserProfiles; Users 1:N RefreshTokens'},
  {id:'catalog',col:1,row:0,name:'LongevityCatalogDb',tables:
   ['Recipes','RecipeIngredients','Allergens','RecipeAllergens','DietRules','RuleVersions','Foods','RuleSetVersions','RuleAudits'],
   relations:'FK: Recipes > RecipeIngredients; Allergens > RecipeAllergens; DietRules > RuleVersions'},
  {id:'planning',col:2,row:0,name:'LongevityPlanningDb',tables:
   ['MealPlans','MealPlanDays','PlannedMeals','UserDietaryPreferences',
    'ChallengeTemplates','ChallengeDayTemplates','UserChallenges','UserChallengeDays',
    'FmdCycles','FmdCycleDays','FmdSafetyAssessments','FmdEducationAcknowledgements','PlanningOutbox'],
   relations:'FK: Plan > Days > Meals; Challenge > Days; FMD Cycle > Days'},
  {id:'tracking',col:0,row:1,name:'LongevityTrackingDb',tables:
   ['MealLogs','MealLogItems','AdherenceScores','ScoreDimensions',
    'ActivityLogs','ActivityGoals','EatingWindowSnapshots','TrackingScoreSignals',
    'ScoreConfigurationVersions','TrackingOutbox'],
   relations:'FK: MealLogs > MealLogItems; AdherenceScores > ScoreDimensions'},
  {id:'recommendation',col:1,row:1,name:'LongevityRecommendationDb',tables:
   ['RecommendationFeedbacks','UserFoodPreferences','RecommendationOutbox','RecommendationInbox'],
   relations:'Owner keys / event IDs only; NO physical cross-service FK'},
  {id:'worker',col:2,row:1,name:'LongevityWorkerDb',tables:
   ['ReminderSchedules','ReminderDispatchRecords','WorkerProcessedEvents','WorkerOutbox',
    'WorkerReceivedEvents','WorkerEventDeadLetters'],
   relations:'Schedule > Dispatch is logical; inbox / DLQ are independent tables'}
 ];
 let allCount=0;
 for(const m of domains){
  const x=85+1255*m.col,y=260+1135*m.row,w=1130,h=1038;
  d.rect('box-'+m.id,'',x,y,w,h,{strokeWidth:2.4});
  d.text('h-'+m.id,m.name,x+35,y+20,w-70,70,{font:33,bold:true});
  d.text('count-'+m.id,m.tables.length+' owner tables  |  SQL :1433',x+35,y+100,w-70,53,{font:23});
  const ids=[];
  for(let i=0;i<m.tables.length;i++){
   const col=i%2,row=Math.floor(i/2);
   const tx=x+32+535*col,ty=y+191+94*row;
   const t='tbl-'+m.id+'-'+i;
   d.rect(t,m.tables[i],tx,ty,508,69,{font:m.tables[i].length>24?19:22});
   ids.push(t);allCount++;
  }
  // Only native adjacent local FK arrows are drawn, never imaginary global FKs.
  const pairs= m.id==='identity'?[[0,1]]:
    m.id==='catalog'?[[0,1],[2,3],[4,5]]:
    m.id==='planning'?[[0,1],[4,5],[6,7],[8,9]]:
    m.id==='tracking'?[[0,1],[2,3]]:[];
  for(let i=0;i<pairs.length;i++)d.edge('fk-'+m.id+'-'+i,ids[pairs[i][0]],ids[pairs[i][1]],'FK',{font:15,strokeWidth:1.6});
  d.text('rel-'+m.id,m.relations,x+35,y+875,w-70,110,{font:20});
 }
 if(allCount!==49)throw Error('Actual schema inventory expected 49 target tables; found '+allCount);
 legend(d,'KÝ HIỆU: mỗi khung là một database; đường FK chỉ nối trong miền. UserId giữa các miền là tham chiếu logic, KHÔNG phải FK SQL.',2525);
 d.save();
}

// Business Flow: two connected business lanes with real asynchronous path.
{
 const d=new Drawing('Business Flow',3830,2430);
 header(d,'FLOW','BUSINESS FLOW | LONGEVITYDIET END TO END',
  'Luồng thành viên và quản trị, cổng an toàn FMD, chấm điểm LDAS và sự kiện bất đồng bộ.');
 d.text('memberlane','LUỒNG THÀNH VIÊN (MEMBER)',95,275,3400,70,{font:31,bold:true});
 const main=[
  ['account','01  ĐĂNG KÝ\nIdentity / JWT'],
  ['profile','02  HỒ SƠ\nDị ứng / Loại trừ'],
  ['rules','03  QUY TẮC\nCatalog / Version'],
  ['plan','04  THỰC ĐƠN\nPlanning 7/14 ngay'],
  ['tracking','05  NHẬT KÝ\nĂn uống / Vận động'],
  ['score','06  TIẾN ĐỘ\nLDAS / Weekly']
 ];
 main.forEach(([id,title],i)=>d.rect(id,title,90+i*618,400,525,155,{font:26}));
 for(let i=0;i<main.length-1;i++)d.edge('main-'+i,main[i][0],main[i+1][0],'',{font:15});
 d.text('fmdlane','NHÁNH ĐIỀU KIỆN AN TOÀN - KHÔNG TỰ ĐỘNG TƯ VẤN Y TẾ',95,700,3600,70,{font:29,bold:true});
 const gate=[
  ['fmd-request','Yêu cầu FMD\nEducation + acknowledgement'],
  ['fmd-gate','SAFETY GATE\nĐã qua kiểm tra an toàn?'],
  ['fmd-yes','Đủ điều kiện\nGhi nhận chu kỳ'],
  ['fmd-no','KHÔNG đủ điều kiện\nDừng FMD / thông báo']
 ];
 const gatePos=[
  [240,790,640,160],
  [1180,790,640,160],
  [2170,760,660,160],
  [2170,950,660,160]
 ];
 gate.forEach(([id,t],i)=>d.rect(id,t,...gatePos[i],{font:24,dashed:id==='fmd-no'}));
 d.edge('fmd-1','fmd-request','fmd-gate','');
 d.edge('fmd-2','fmd-gate','fmd-yes','YES');
 d.edge('fmd-3','fmd-gate','fmd-no','NO',{style:['exitX=0.5','exitY=1','entryX=0','entryY=0.5']});
 d.text('asynclane','GIAO DỊCH VÀ XỬ LÝ BẤT ĐỒNG BỘ',95,1190,3500,65,{font:30,bold:true});
 const ev=[
  ['commit','SQL Transaction\nDomain + Outbox'],
  ['stream','Redis Streams\nACTIVE / XADD'],
  ['worker','Worker consumer\nRetry / Dedupe'],
  ['notify','Reminder / Weekly\nReport / Notify']
 ];
 ev.forEach(([id,t],i)=>d.rect(id,t,250+i*876,1300,630,155,{font:25}));
 for(let i=0;i<ev.length-1;i++)d.edge('ev-'+i,ev[i][0],ev[i+1][0],'',{dashed:true,font:17});
 d.rect('rabbit','RabbitMQ / AMQP\nPLANNED - NOT DEPLOYED\nFuture queue / fanout',1120,1555,750,150,{font:25,dashed:true});
 d.edge('future','stream','rabbit','Future transport option',{dashed:true,vertical:true,font:18});
 d.text('adminlane','LUỒNG QUẢN TRỊ (ADMIN)',95,1835,3500,60,{font:30,bold:true});
 const ad=[
  ['admin-auth','Admin JWT / RBAC'],
  ['admin-review','Review food / Rule'],
  ['admin-publish','Publish RuleVersion'],
  ['admin-audit','Audit / Job / DLQ']
 ];
 ad.forEach(([id,t],i)=>d.rect(id,t,235+i*890,1970,640,130,{font:24}));
 for(let i=0;i<ad.length-1;i++)d.edge('admin-'+i,ad[i][0],ad[i+1][0],'',{font:17});
 legend(d,'SOLID: user request and decisions. DASHED: async. RabbitMQ is a planned broker, not currently wired into .NET code. Food allergy constraints always precede recommendation ranking.',2270);
 d.save();
}
console.log('OFFICIAL_ARCHITECTURE_FIVE_DRAWIO=PASS');
