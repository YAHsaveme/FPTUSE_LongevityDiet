// Native, editable Draw.io diagrams for PRN232 LongevityDiet.
// Single-page C0/C1/C2 and course ERD sourced directly from DBML.
// Every module, actor, table field, connector and label is a diagrams.net mxCell.
'use strict';
const fs=require('fs'),path=require('path'),OUT=path.resolve(__dirname,'../docs/assignment/one-page');
const E=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function Diagram(name,subtitle,W,H){
 const cells=[],edges=[],shapes=new Map();let seq=2;
 function newid(){return 'd'+(++seq)}
 function box(k,x,y,w,h,title,kind,description,options){
  options=options||{};const id=newid(),fill=options.fill||'#FFFFFF';
  const val=options.raw!==undefined?options.raw:'<b>'+E(title)+'</b>'+(kind?'<br/><font color="#555555">['+E(kind)+']</font>':'')+(description?'<br/><font color="#555555">'+E(description)+'</font>':'');
  const style='rounded=0;whiteSpace=wrap;html=1;fillColor='+fill+';strokeColor=#222222;strokeWidth='+(options.sw||3)+';fontColor=#222222;fontSize='+(options.font||30)+';fontFamily=Arial;align=center;verticalAlign=middle;spacing=12;shadow=0;glass=0;';
  cells.push('<mxCell id="'+id+'" value="'+E(val)+'" style="'+E(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
  shapes.set(k,{id,x,y,w,h});return k;
 }
 function text(x,y,w,h,content,size,bold,align){
  size=size||27;align=align||'left';const style='text;html=1;whiteSpace=wrap;fillColor=none;strokeColor=none;fontColor='+ (bold?'#222222':'#555555')+';fontFamily=Arial;fontSize='+size+';fontStyle='+(bold?'1':'0')+';align='+align+';verticalAlign=middle;spacing=1;';
  cells.push('<mxCell id="'+newid()+'" value="'+E(content)+'" style="'+E(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
 }
 function actor(k,x,y,name,desc){
  const id=newid(),w=200,h=240;
  const style='shape=umlActor;html=1;fillColor=#FFFFFF;strokeColor=#222222;strokeWidth=5;whiteSpace=wrap;';
  cells.push('<mxCell id="'+id+'" value="" style="'+style+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
  shapes.set(k,{id,x,y,w,h});
  text(x-80,y+249,360,55,name,36,true,'center');
  if(desc)text(x-160,y+312,510,95,desc,26,false,'center');
 }
 function boundary(x,y,w,h,title){
  const style='rounded=0;html=1;fillColor=none;strokeColor=#999999;dashed=1;dashPattern=9 7;strokeWidth=2;align=left;verticalAlign=top;fontColor=#333333;fontSize=31;fontStyle=1;fontFamily=Arial;spacing=18;';
  cells.unshift('<mxCell id="'+newid()+'" value="'+E(title)+'" style="'+E(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
 }
 function arrow(src,dst,start,end,way,opt){
  opt=opt||{};way=way||[];
  const A=shapes.get(src),B=shapes.get(dst);if(!A||!B)throw Error('Bad link '+src+' -> '+dst);
  const style='edgeStyle=segmentEdgeStyle;rounded=0;html=1;orthogonalLoop=1;jettySize=auto;strokeColor=#444444;strokeWidth=3;'+(opt.dashed?'dashed=1;dashPattern=9 7;':'')+'startArrow='+(opt.startArrow||'none')+';endArrow='+(opt.endArrow||'block')+';endFill=1;exitX='+start[0]+';exitY='+start[1]+';exitPerimeter=0;entryX='+end[0]+';entryY='+end[1]+';entryPerimeter=0;';
  const pts=way.length?'<Array as="points">'+way.map(p=>'<mxPoint x="'+p[0]+'" y="'+p[1]+'"/>').join('')+'</Array>':'';
  edges.push('<mxCell id="'+newid()+'" value="" style="'+E(style)+'" edge="1" parent="1" source="'+A.id+'" target="'+B.id+'"><mxGeometry relative="1" as="geometry">'+pts+'</mxGeometry></mxCell>');
 }
 function save(filename){
  const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram id="'+E(filename)+'" name="'+E(name)+'"><mxGraphModel dx="1300" dy="860" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="0" page="1" pageScale="1" pageWidth="'+W+'" pageHeight="'+H+'" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+edges.join('')+cells.join('')+'</root></mxGraphModel></diagram></mxfile>';
  fs.writeFileSync(path.join(OUT,filename),xml,'utf8');
  console.log(filename+': '+cells.length+' shapes, '+edges.length+' arrows');
 }
 text(115,60,W-230,115,name,55,true);
 text(120,179,W-240,78,subtitle,28);
 return {box,text,actor,boundary,arrow,save};
}
{
 const g=Diagram('C0 - SYSTEM CONTEXT','LongevityDiet | Các vai trò và phần mềm, không mô tả thành phần kỹ thuật bên trong',3400,1850);
 g.actor('member',350,465,'Member','Đăng nhập, hoạt động và xem gợi ý');
 g.actor('admin',350,1090,'Administrator','Quản lý tài khoản và hệ thống');
 g.box('system',1500,690,1390,570,'LongevityDiet','Software System','Hồ sơ, theo dõi hoạt động, nhắc nhở, gợi ý',{font:46});
 g.arrow('member','system',[1,.55],[0,.25],[[1030,597],[1030,832]]);
 g.arrow('admin','system',[1,.50],[0,.74],[[1130,1210],[1130,1112]]);
 g.text(1100,733,330,62,'Sử dụng',30,true,'center');
 g.text(1145,1010,320,68,'Quản trị',30,true,'center');
 g.text(180,1655,2960,75,'C4 Level 1: hình người = tác nhân; khung chữ nhật = hệ thống. Không đưa API/Redis/SQL vào sơ đồ bối cảnh.',26);
 g.save('01-c0-system-context.drawio');
}
{
 const g=Diagram('C1 - CONTAINER ARCHITECTURE','Các tiến trình ứng dụng, database và giao tiếp đồng bộ / bất đồng bộ',5100,2750);
 g.boundary(965,320,3980,2160,'LongevityDiet [Software System]');
 g.actor('member',275,495,'Member','Người dùng');
 g.actor('admin',275,1080,'Administrator','Quản trị');
 g.box('web',1210,700,720,315,'Web Application','React / Vite','Giao diện, API client',{font:37});
 g.box('api',2290,700,830,315,'REST API','ASP.NET Core / JWT','Auth, Tracking, Notifications, gRPC client',{font:35});
 g.box('grpc',3700,700,830,315,'Recommendation Service','gRPC HTTP/2','ActivityCoach.Recommend',{font:35});
 g.box('sql',1210,1600,720,335,'SQL Server','Relational Data Store','Identity DB | Tracking DB | Worker DB',{font:35});
 g.box('redis',2290,1600,830,335,'Redis Streams','Message Broker','Identity events | Worker results',{font:35});
 g.box('worker',3700,1600,830,335,'Background Worker','.NET hosted process','Lịch nhắc, tiêu thụ sự kiện, trả kết quả',{font:35});
 g.arrow('member','web',[1,.50],[0,.27],[[840,615],[840,785]]);
 g.arrow('admin','web',[1,.50],[0,.78],[[920,1200],[920,945]]);
 g.arrow('web','api',[1,.5],[0,.5]);
 g.arrow('api','grpc',[1,.45],[0,.45]);
 g.arrow('api','sql',[0,.80],[1,.54],[[2105,952],[2105,1781]]);
 g.arrow('api','redis',[.33,1],[.33,0],[],{dashed:true});
 g.arrow('redis','api',[.76,0],[.76,1],[],{dashed:true});
 g.arrow('redis','worker',[1,.34],[0,.34],[],{dashed:true});
 g.arrow('worker','redis',[0,.72],[1,.72],[],{dashed:true});
 g.arrow('worker','sql',[.5,1],[.5,1],[[4115,2220],[1570,2220]]);
 g.text(1950,753,310,60,'HTTPS / JSON',27,true,'center');
 g.text(3200,753,405,60,'gRPC / HTTP2',27,true,'center');
 g.text(1935,1320,155,60,'EF Core',27,true,'center');
 g.text(2350,1250,165,60,'Publish',27,true);
 g.text(2940,1250,290,60,'Receive',27,true);
 g.text(3170,1550,440,62,'Consume events',26,true,'center');
 g.text(3170,1870,440,62,'Publish results',26,true,'center');
 g.text(2010,2130,1560,65,'Worker cũng ghi lịch nhắc vào SQL Server',26,true,'center');
 g.text(1050,2510,3770,80,'Solid = request/response HTTP, gRPC and SQL calls. Dashed = two-way Redis events. JWT protects member endpoints; auth endpoints are anonymous.',26);
 g.save('02-c1-container-architecture.drawio');
}
{
 const g=Diagram('C2 - REST API COMPONENTS','One ASP.NET Core API: routing -> controller -> services -> persistence / gRPC / Redis',6700,3480);
 g.boundary(900,325,4640,2435,'LongevityDiet.API [ASP.NET Core REST API]');
 g.box('web',145,480,535,240,'Web UI','External Container','Authenticated requests',{font:34});
 g.box('router',1170,490,4080,145,'Routing + Authorization Policies','ASP.NET Core','Auth endpoints anonymous | Member endpoints JWT | Validation and Rate Limits',{font:34,fill:'#F2F2F2'});
 const lanes=[
  ['auth',1020,'AuthController','AuthenticationService','Sessions / JWT'],
  ['profile',1880,'ProfileController','ProfileService','Profile'],
  ['reminder',2740,'ReminderNotificationsController','ReminderService','Prefs + notifications'],
  ['tracking',3600,'TrackingController','TrackingService','Activities + LDAS'],
  ['recommend',4460,'RecommendationController','ActivityCoach gRPC Client','Weekly advice']
 ];
 lanes.forEach((l,i)=>{
  const key=l[0],x=l[1];
  g.box(key+'ctl',x,930,740,245,l[2],'Controller',l[4],{font:30});
  g.box(key+'svc',x,1510,740,245,l[3],i===4?'gRPC Client':'Application Service',i===4?'Timeout 3s / numeric aggregates':l[4],{font:30});
  g.arrow('router',key+'ctl',[(x+370-1170)/4080,1],[.5,0]);
  g.arrow(key+'ctl',key+'svc',[.5,1],[.5,0]);
 });
 g.box('identity',1390,2090,1250,260,'Identity Persistence','EF Core DbContext','Users | Tokens | Preferences | Notifications | Outbox',{font:29});
 g.box('bridge',2830,2090,740,260,'Identity Redis Bridge','Hosted Service','Poll Outbox / Write Inbox',{font:29});
 g.box('trackingdb',3700,2090,810,260,'Tracking Persistence','EF Core DbContext','ActivityLogs | Goals | AdherenceScores',{font:29});
 g.box('grpc',5735,1450,780,275,'Recommendation gRPC','External Container','ActivityCoach.Recommend',{font:31});
 g.box('sqlIdentity',1390,2850,1250,220,'Identity SQL Database','External Data Store','Owned data and local FKs',{font:31});
 g.box('redis',2830,2850,740,220,'Redis Streams','External Broker','Identity events / Worker results',{font:30});
 g.box('sqlTracking',3700,2850,810,220,'Tracking SQL Database','External Data Store','Activity / scores',{font:31});
 g.arrow('web','router',[1,.5],[0,.5]);
 g.arrow('recommendctl','trackingsvc',[0,.68],[1,.55],[[4400,1096],[4400,1647]]);
 g.arrow('recommendsvc','grpc',[1,.5],[0,.5]);
 g.arrow('authsvc','identity',[.7,1],[.2,0],[[1538,1910],[1640,1910]]);
 g.arrow('profilesvc','identity',[.5,1],[.73,0]);
 g.arrow('remindersvc','identity',[.1,1],[.94,0],[[2814,1910],[2565,1910]]);
 g.arrow('bridge','identity',[0,.55],[1,.55]);
 g.arrow('trackingsvc','trackingdb',[.52,1],[.52,0]);
 g.arrow('identity','sqlIdentity',[.5,1],[.5,0]);
 g.arrow('bridge','redis',[.5,1],[.5,0],[],{dashed:true});
 g.arrow('trackingdb','sqlTracking',[.5,1],[.5,0]);
 g.text(1020,3130,5520,60,'A. RecommendationController -> TrackingService (own summary) -> gRPC Client -> Recommendation Service -> JSON response.',26);
 g.text(1020,3210,5520,60,'B. ReminderService -> Identity DB (preferences + outbox) -> Bridge -> Redis -> Worker -> Redis -> Bridge -> notification inbox.',26);
 g.text(1020,3290,5520,58,'Solid = synchronous calls / EF Core; dashed = Redis events. The Worker is external to C2 and shown in C1.',25);
 g.save('03-c2-api-components.drawio');
}
{
 const source=fs.readFileSync(path.join(OUT,'04-database-core.dbml'),'utf8');
 const tables=new Map();
 for(const m of source.matchAll(/^Table\s+(\w+)\.(\w+)\s*\{([\s\S]*?)^\}/gm)){
  const fields=[];
  m[3].split(/\r?\n/).forEach(row=>{
   const z=row.trim().match(/^(\w+)\s+([a-zA-Z]\w*(?:\([^\)]*\))?)(.*)$/);
   if(z)fields.push({name:z[1],type:z[2],pk:/\bpk\b/.test(z[3]),unique:/\bunique\b/.test(z[3])});
  });
  tables.set(m[1]+'.'+m[2],{db:m[1],name:m[2],fields});
 }
 if(tables.size!==10)throw Error('Expected 10 tables in DBML, got '+tables.size);
 const g=Diagram('CORE DATABASE ERD | EDITABLE DRAW.IO','Nguồn DBML thực tế | 10 bảng tiêu biểu | chỉ FK nội bộ, không nối UserId xuyên cơ sở dữ liệu',5850,3120);
 g.boundary(105,335,2410,2450,'IDENTITY DB - DbContext Identity');
 g.boundary(2655,335,1980,2450,'TRACKING DB - DbContext Tracking');
 g.boundary(4775,335,970,2450,'WORKER DB - DbContext Worker');
 const pos={
  'identity.Users':[920,580,900],
  'identity.UserProfiles':[250,1230,850],
  'identity.RefreshTokens':[1430,1230,850],
  'identity.ReminderPreferences':[250,1910,850],
  'identity.UserNotifications':[1430,1910,850],
  'tracking.ActivityLogs':[2790,635,790],
  'tracking.ActivityGoals':[3720,635,790],
  'tracking.AdherenceScores':[2790,1555,790],
  'tracking.ScoreDimensions':[3720,1555,790],
  'worker.ReminderSchedules':[4870,1170,790]
 };
 for(const [k,t] of tables){
  const p=pos[k];if(!p)throw Error('Missing table geometry: '+k);
  const [x,y,w]=p,rowH=58,h=100+rowH*t.fields.length+22;
  g.box(k,x,y,w,h,'','','',{raw:'',sw:3});
  g.box(k+'_head',x+2,y+2,w-4,90,t.name,'','',{fill:'#EEEEEE',font:36,sw:1});
  t.fields.forEach((f,i)=>{
   const isFk=(k.startsWith('identity.')&&f.name==='UserId'&&t.name!=='Users')||(k==='tracking.ScoreDimensions'&&f.name==='AdherenceScoreId');
   const tag=f.pk?(isFk?'PK/FK':'PK'):(isFk?'FK':f.unique?'UQ':'');
   g.text(x+25,y+102+i*rowH,w-40,rowH,tag+'   '+f.name+' : '+f.type,29,!!f.pk);
  });
 }
 const rel=(from,to,start,end,via,one)=>g.arrow(from,to,start,end,via,{startArrow:'ERone',endArrow:one?'ERone':'ERmany'});
 rel('identity.Users','identity.UserProfiles',[.15,1],[.55,0],[[1055,1120],[718,1120]],true);
 rel('identity.Users','identity.RefreshTokens',[.82,1],[.43,0],[[1658,1110],[1796,1110]],false);
 rel('identity.Users','identity.ReminderPreferences',[0,.42],[0,.55],[[180,770],[180,2130]],true);
 rel('identity.Users','identity.UserNotifications',[1,.48],[1,.55],[[2390,778],[2390,2130]],false);
 rel('tracking.AdherenceScores','tracking.ScoreDimensions',[1,.56],[0,.56],[],false);
 g.text(150,2900,5480,100,'PK = khóa chính | FK = khóa ngoại SQL trong cùng DB | 1:1 hoặc 1:N theo ký hiệu ER. UserId trong Tracking/Worker là tham chiếu logic.',26);
 g.save('04-database-core.drawio');
}
