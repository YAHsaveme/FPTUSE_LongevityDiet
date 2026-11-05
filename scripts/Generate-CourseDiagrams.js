/* PRN232 course-size C4 diagrams; evidence: actual src + docker-compose, not speculative microservices. */
const fs=require('fs'),path=require('path'),dest=path.resolve(__dirname,'../docs/assignment/one-page');
fs.mkdirSync(dest,{recursive:true});
function esc(v){return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function draw(title,sub,w,h){
 const cells=[],edges=[],idx={};let seq=1;
 function id(){return 'n'+(++seq);}
 function node(key,x,y,ww,hh,title,kind,desc='',config={}){
  const z={id:id(),x,y,w:ww,h:hh};idx[key]=z;
  const text='<b>'+esc(title)+'</b><br/><font color="#555555">['+esc(kind)+']'+(desc?'<br/>'+esc(desc):'')+'</font>';
  const style='rounded=0;html=1;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=#333333;strokeWidth=3;fontFamily=Arial;fontSize='+(config.font||28)+';fontColor=#222222;align=center;verticalAlign=middle;spacing=12;shadow=0;';
  cells.push('<mxCell id="'+z.id+'" value="'+esc(text)+'" style="'+esc(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+ww+'" height="'+hh+'" as="geometry"/></mxCell>');
  return key;
 }
 function text(x,y,ww,hh,value,size=27){
  cells.push('<mxCell id="'+id()+'" value="'+esc(value)+'" style="text;html=1;whiteSpace=wrap;fillColor=none;strokeColor=none;fontFamily=Arial;fontSize='+size+';fontColor=#444444;align=left;verticalAlign=middle;spacing=5;" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+ww+'" height="'+hh+'" as="geometry"/></mxCell>');
 }
 function bound(x,y,ww,hh,title){
  cells.unshift('<mxCell id="'+id()+'" value="'+esc(title)+'" style="rounded=0;html=1;fillColor=none;strokeColor=#777777;dashed=1;dashPattern=8 6;strokeWidth=2;fontFamily=Arial;fontSize=27;fontStyle=1;align=left;verticalAlign=top;spacing=17;" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+ww+'" height="'+hh+'" as="geometry"/></mxCell>');
 }
 function link(a,b,label,ex,ent,via=[],dashed=false){
  if(!idx[a]||!idx[b])throw Error('No link endpoint '+a+' -> '+b);
  const points=via.length?'<Array as="points">'+via.map(p=>'<mxPoint x="'+p[0]+'" y="'+p[1]+'"/>').join('')+'</Array>':'';
  const style='edgeStyle=segmentEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;strokeColor=#333333;strokeWidth=2.8;endArrow=block;endFill=1;fontSize=22;fontFamily=Arial;fontColor=#333333;labelBackgroundColor=#FFFFFF;html=1;'+(dashed?'dashed=1;dashPattern=8 6;':'')+'exitX='+ex[0]+';exitY='+ex[1]+';exitPerimeter=0;entryX='+ent[0]+';entryY='+ent[1]+';entryPerimeter=0;';
  edges.push('<mxCell id="'+id()+'" value="'+esc(label)+'" style="'+esc(style)+'" edge="1" parent="1" source="'+idx[a].id+'" target="'+idx[b].id+'"><mxGeometry relative="1" as="geometry">'+points+'</mxGeometry></mxCell>');
 }
 function save(fn){
  const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram id="'+fn+'" name="'+esc(title)+'"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="0" page="1" pageScale="1" pageWidth="'+w+'" pageHeight="'+h+'" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+edges.join('')+cells.join('')+'</root></mxGraphModel></diagram></mxfile>';
  fs.writeFileSync(path.join(dest,fn),xml,'utf8');console.log('DRAWIO',fn,'shapes',cells.length,'links',edges.length);
 }
 text(105,50,w-210,105,'<b>'+title+'</b>',53);
 text(115,158,w-230,90,sub,27);
 return {node,text,bound,link,save};
}
{
 const g=draw('C0 — SYSTEM CONTEXT','LongevityDiet • PRN232 • System-level interactions only',3300,1690);
 g.node('member',180,470,720,290,'Member','Person','Sign in • track activities • view educational scores', {font:34});
 g.node('admin',180,1010,720,290,'Administrator','Person','Manage access and monitor the application',{font:34});
 g.node('system',1470,620,1470,635,'LongevityDiet','Software System','Habit tracking, personal profiles, reminders and progress',{font:43});
 g.link('member','system','Uses',[1,.5],[0,.35],[[1150,615],[1150,842]]);
 g.link('admin','system','Administers',[1,.5],[0,.77],[[1270,1155],[1270,1109]]);
 g.text(175,1480,2970,100,'Legend: Person = human role; Software System = the product being studied. No internal APIs, workers or databases at C0.',27);
 g.save('01-c0-system-context.drawio');
}
{
 const g=draw('C1 — CONTAINER DIAGRAM','Implemented REST + gRPC + event paths; separate boxes = independent runtime processes',4000,2510);
 g.bound(690,280,3170,2010,'LongevityDiet [Software System]');
 g.node('member',90,690,480,250,'Member','Person','Web browser',{font:32});
 g.node('web',875,570,620,275,'Web UI','Container • React/Vite','Pages and API client',{font:31});
 g.node('api',1750,570,635,275,'REST API','Container • ASP.NET Core','JWT • CRUD • Tracking • Reminders',{font:31});
 g.node('grpc',2900,490,630,255,'Recommendation gRPC','Container • ASP.NET Core','ActivityCoach.Recommend over HTTP/2',{font:28});
 g.node('worker',2900,1100,630,260,'Background Worker','Container • .NET','Processes events and schedules reminders',{font:29});
 g.node('redis',2570,1630,630,255,'Redis Streams','Container • Broker','Event publishing and consuming',{font:29});
 g.node('sql',1680,1650,700,260,'SQL Server','Container • Databases','Identity • Tracking • Worker contexts',{font:29});
 g.link('member','web','Uses',[1,.5],[0,.5]);
 g.link('web','api','JSON / HTTPS',[1,.5],[0,.5]);
 g.link('api','sql','EF Core',[.50,1],[.5,0],[[2065,1260],[2030,1260]]);
 g.link('api','redis','Event publish',[1,.83],[0,.28],[[2500,797],[2500,1701]],true);
 g.link('redis','worker','Consume identity events',[.75,0],[.25,1],[[3042,1505],[3057,1505]],true);
 g.link('worker','redis','Publish notification results',[.85,1],[1,.65],[[3650,1430],[3650,1795]],true);
 g.link('redis','api','Consume notification results',[0,.70],[1,.90],[[2430,1808],[2430,820]],true);
 g.link('worker','sql','DB writes',[.5,1],[.75,1],[[3215,2140],[2205,2140]]);
 g.link('api','grpc','gRPC / HTTP2 activity advice',[1,.25],[0,.53],[[2650,639],[2650,625]]);
 g.text(785,2320,3040,95,'Legend: Solid = synchronous REST/gRPC or EF Core access. Dashed = asynchronous Redis Streams: Identity request → Worker → notification result → API inbox.',24);
 g.save('02-c1-container-architecture.drawio');
}
{
 const g=draw('C2 — REST API COMPONENTS',
   'One existing container: authenticated REST endpoints, services, persistence and integration adapters',
   6100,3020);
 g.bound(700,310,4550,2120,'LongevityDiet.API [Container • ASP.NET Core]');
 g.node('web',95,775,485,260,'Web UI','External Container','HTTPS / JWT (example: sign in)',{font:29});
 const cols=[800,1690,2580,3470,4360], width=750;
 const controllers=[
  ['authc','Auth Controller','Register • login • refresh'],
  ['profilec','Profile Controller','Profile operations'],
  ['reminderc','Reminder Notifications Controller','Preferences and inbox'],
  ['trackingc','Tracking Controller','Activities, goals and scores'],
  ['recommendc','Recommendation Controller','User-scoped activity guidance']
 ];
 const services=[
  ['auths','Authentication Service','JWT and refresh token rules'],
  ['profiles','Profile Service','Account and profile validation'],
  ['reminders','Reminder Service','Commit preferences + outbox'],
  ['trackings','Tracking Service','Own weekly activity summary'],
  ['grpcclient','ActivityCoach gRPC Client','Typed protobuf client; 3s deadline']
 ];
 controllers.forEach((a,i)=>g.node(a[0],cols[i],680,width,250,a[1],'Component',a[2],{font:28}));
 services.forEach((a,i)=>g.node(a[0],cols[i],1210,width,250,a[1],'Component',a[2],{font:27}));
 g.node('identitydb',1200,1790,1240,250,'Identity Persistence',
   'Component • EF Core Repository','Users, profile, preferences, sessions, notifications, outbox',{font:27});
 g.node('bridge',2580,1790,750,250,'Identity Redis Bridge',
   'Component • Hosted Service','Poll outbox; consume results into inbox',{font:26});
 g.node('trackingdb',3470,1790,750,250,'Tracking Persistence',
   'Component • EF Core DbContext','Activities, goals and partial LDAS',{font:27});
 g.node('grpc',5380,1090,590,280,'Recommendation gRPC',
   'External Container • HTTP/2','ActivityCoach.Recommend',{font:27});
 g.node('identitysql',1200,2585,1240,215,'Identity SQL Database',
   'External Container • SQL Server','User and notification ownership',{font:27});
 g.node('redis',2580,2585,750,215,'Redis Streams',
   'External Container • Broker','Two-way events with Worker',{font:27});
 g.node('trackingsql',3470,2585,750,215,'Tracking SQL Database',
   'External Container • SQL Server','Activity and scoring ownership',{font:26});
 g.link('web','authc','HTTPS / JWT',[1,.45],[0,.52]);
 for(let i=0;i<5;i++)g.link(controllers[i][0],services[i][0],'Uses',[.5,1],[.5,0]);
 // Top gutter avoids crossing controller boxes and all vertical service arrows.
 g.link('recommendc','trackings','Fetch own weekly summary',[.10,0],[1,.5],
        [[4300,590],[4300,1335]]);
 g.link('grpcclient','grpc','gRPC / HTTP2',[1,.5],[0,.5],
        [[5300,1335],[5300,1230]]);
 g.link('auths','identitydb','Identity / token writes',[.5,1],[.19,0],
        [[1175,1640],[1436,1640]]);
 g.link('profiles','identitydb','Profile reads / writes',[.5,1],[.70,0]);
 g.link('reminders','identitydb','Write preferences + outbox',[.05,1],[.95,0],
        [[2617,1650],[2378,1650]]);
 g.link('bridge','identitydb','',[0,.5],[1,.5]);
 g.link('trackings','trackingdb','Read / write EF Core',[.5,1],[.5,0]);
 g.link('identitydb','identitysql','EF Core',[.5,1],[.5,0]);
 g.link('bridge','redis','Publish / consume',[.5,1],[.5,0],[],true);
 g.link('trackingdb','trackingsql','EF Core',[.5,1],[.5,0]);
 g.text(820,430,4120,90,
   'Cross-cutting: JWT authorization • rate limiting • validation • tracing. Only numeric, member-scoped weekly aggregates reach gRPC.',
   24);
 g.text(740,2860,5270,95,
   'Identity and Tracking are distinct databases on the same SQL Server host. Dashed = asynchronous Redis Streams; other arrows = synchronous calls. External Worker is shown in C1.',
   24);
 g.save('03-c2-api-components.drawio');
}
