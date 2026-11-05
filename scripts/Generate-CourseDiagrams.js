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
 const g=draw('C1 — CONTAINER DIAGRAM','Code and Docker Compose scope; dashed relationship to gRPC is NOT yet implemented in REST API',4000,2510);
 g.bound(690,280,3170,2010,'LongevityDiet [Software System]');
 g.node('member',90,690,480,250,'Member','Person','Web browser',{font:32});
 g.node('web',875,570,620,275,'Web UI','Container • React/Vite','Pages and API client',{font:31});
 g.node('api',1750,570,635,275,'REST API','Container • ASP.NET Core','JWT • CRUD • Tracking • Reminders',{font:31});
 g.node('grpc',2900,490,630,255,'Recommendation gRPC','Container • ASP.NET Core','Independent service skeleton',{font:28});
 g.node('worker',2900,1100,630,260,'Background Worker','Container • .NET','Processes events and schedules reminders',{font:29});
 g.node('redis',2570,1630,630,255,'Redis Streams','Container • Broker','Event publishing and consuming',{font:29});
 g.node('sql',1680,1650,700,260,'SQL Server','Container • Databases','Identity • Tracking • Worker contexts',{font:29});
 g.link('member','web','Uses',[1,.5],[0,.5]);
 g.link('web','api','JSON / HTTPS',[1,.5],[0,.5]);
 g.link('api','sql','EF Core',[.50,1],[.5,0],[[2065,1260],[2030,1260]]);
 g.link('api','redis','Event publish',[1,.83],[0,.28],[[2500,797],[2500,1701]],true);
 g.link('redis','worker','Streams',[1,.3],[0,.8],[[2800,1706],[2800,1308]],true);
 g.link('worker','sql','DB writes',[.5,1],[.75,1],[[3215,2140],[2205,2140]]);
 g.link('api','grpc','Planned gRPC call',[1,.25],[0,.53],[[2650,639],[2650,625]],true);
 g.text(785,2320,3040,95,'Legend: Solid = working calls/data access. Dashed = async events or explicitly planned gRPC invocation. gRPC service exists, but API call wiring is pending.',24);
 g.save('02-c1-container-architecture.drawio');
}
{
 const g=draw('C2 — REST API COMPONENTS','Scope: one container, LongevityDiet.API; API → Service → Repository / EF Core',5000,2540);
 g.bound(670,300,3580,1920,'LongevityDiet.API [Container • ASP.NET Core]');
 g.node('web',100,620,460,250,'Web UI','External Container','Calls REST endpoints',{font:29});
 const x=[800,1670,2540,3410],w=720;
 const ctl=[['authc','Auth Controller','Register • login • refresh'],['profilec','Profile Controller','Profile operations'],['trackingc','Tracking Controller','Activity and scores'],['reminderc','Reminder/Notifications Controller','Preferences and user inbox']];
 const svc=[['auths','Authentication Service','JWT and refresh tokens'],['profiles','Profile Service','Profile validation'],['trackings','Tracking Service','Summaries and LDAS'],['reminders','Reminder Service','Preferences and notifications']];
 ctl.forEach((a,i)=>g.node(a[0],x[i],595,w,225,a[1],'Component',a[2],{font:27}));
 svc.forEach((a,i)=>g.node(a[0],x[i],1070,w,235,a[1],'Component',a[2],{font:28}));
 g.node('identitydb',1170,1570,840,235,'Identity Repository','Component • EF Core DbContext','Users, profiles, tokens, notifications',{font:26});
 g.node('trackingdb',2530,1570,840,235,'Tracking Repository','Component • EF Core DbContext','Activity logs and score snapshots',{font:26});
 g.node('bridge',3420,1570,680,235,'Redis Event Bridge','Component • Hosted Service','Outbox and notification events',{font:26});
 g.node('redis',4420,1370,475,275,'Redis Streams','External Container','Message broker',{font:27});
 g.node('sql',1760,2300,1280,170,'SQL Server','External Container','Two API-owned SQL databases',{font:27});
 g.link('web','authc','HTTPS',[1,.40],[0,.45],[[650,720],[650,696]]);
 for(let i=0;i<4;i++)g.link(ctl[i][0],svc[i][0],'Uses',[.5,1],[.5,0]);
 g.link('auths','identitydb','Persists',[.5,1],[.28,0],[[1160,1480],[1405,1480]]);
 g.link('profiles','identitydb','Persists',[.23,1],[.80,0],[[1835,1470],[1842,1470]]);
 g.link('trackings','trackingdb','Reads/writes',[.5,1],[.5,0]);
 g.link('reminders','bridge','Publishes',[.5,1],[.5,0]);
 g.link('bridge','redis','Redis Streams',[1,.4],[0,.5],[[4340,1664],[4340,1507]],true);
 g.link('identitydb','sql','EF Core',[.45,1],[.27,0],[[1548,2150],[2106,2150]]);
 g.link('trackingdb','sql','EF Core',[.5,1],[.8,0],[[2950,2150],[2784,2150]]);
 g.text(790,423,3220,95,'Cross-cutting: JWT/authorization, validation, rate limits, logging, exceptions and health checks. gRPC client not yet wired.',24);
 g.save('03-c2-api-components.drawio');
}
