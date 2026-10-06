const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ARCH = path.join(ROOT, 'docs', 'architecture');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const BOX='rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#374151;strokeWidth=2;fontFamily=Arial;fontColor=#1F2937;align=center;verticalAlign=middle;';
const DB='shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;fillColor=#FFFFFF;strokeColor=#374151;strokeWidth=2;fontFamily=Arial;fontColor=#1F2937;align=center;verticalAlign=middle;';
const QUEUE=BOX+'shape=process;size=0.08;';
const EXT=BOX+'dashed=1;dashPattern=8 6;strokeColor=#6B7280;';
const EDGE='edgeStyle=orthogonalEdgeStyle;rounded=0;curved=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;endSize=12;strokeColor=#374151;strokeWidth=2;';
const ASYNC=EDGE+'dashed=1;dashPattern=7 5;';
const TEXT='text;html=1;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Arial;fontColor=#1F2937;';
function diagram(name,w,h){let n=2,c=[];const id=(p='c')=>p+(n++); const vertex=(v,x,y,W,H,s,cid)=>{cid=cid||id();c.push(`<mxCell id="${cid}" value="${esc(v)}" style="${esc(s)}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${W}" height="${H}" as="geometry"/></mxCell>`);return cid}; const text=(v,x,y,W,H,size=13,align='left')=>vertex(v,x,y,W,H,TEXT+`fontSize=${size};align=${align};`); const edge=(s,t,{style=EDGE,exit=[.5,.5],entry=[.5,.5],points=[]}={})=>{let st=style+`exitX=${exit[0]};exitY=${exit[1]};exitDx=0;exitDy=0;entryX=${entry[0]};entryY=${entry[1]};entryDx=0;entryDy=0;`;let g='<mxGeometry relative="1" as="geometry">';if(points.length)g+='<Array as="points">'+points.map(([x,y])=>`<mxPoint x="${x}" y="${y}"/>`).join('')+'</Array>';g+='</mxGeometry>';const eid=id('e');c.push(`<mxCell id="${eid}" style="${esc(st)}" edge="1" parent="1" source="${s}" target="${t}">${g}</mxCell>`);return eid}; const save=file=>{const xml=`<?xml version="1.0" encoding="utf-8"?>\n<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="LongevityDiet Target Dynamic Generator" version="31.4.5" type="device"><diagram id="${name}" name="Page-1"><mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${w}" pageHeight="${h}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${c.join('')}</root></mxGraphModel></diagram></mxfile>`;fs.writeFileSync(path.join(ARCH,file),xml,'utf8')};return {vertex,text,edge,save};}
const box=(n,t,tech,r)=>`<b>${n}</b><br><font style='font-size:13px'>[${t}]</font><br><font style='font-size:13px'>${tech}</font><br><font style='font-size:12px'>${r}</font>`;
// Recommendation dynamic - Target Architecture
{
  const d=diagram('Recommendation-Dynamic-Target',3600,1450); const {vertex,text,edge,save}=d;
  text('<b>Meal Recommendation - Dynamic Flow (Target Architecture)</b>',60,35,3300,50,26);
  text('Synchronous target collaboration; response returns on the same path.',60,88,2600,32,13);
  const member=vertex(box('Member','Person','Authenticated member','Requests recommendation'),80,500,260,170,BOX);
  const web=vertex(box('Web Application','Container','React / TypeScript','Recommendation UI'),450,500,350,170,BOX);
  const gateway=vertex(box('API Gateway','Container','YARP / :8080','Routes API request'),950,500,350,170,BOX);
  const planning=vertex(box('Planning Service','Container','REST :8083','Owns planning workflow'),1450,500,360,170,BOX);
  const recommendation=vertex(box('Recommendation Service','Container','gRPC :8085','Safety filter / ranking'),1980,500,380,170,BOX);
  const recdb=vertex(box('LongevityRecommendationDb','Container / Database','SQL Server / :1433','Local ranking read model'),2520,500,390,170,DB);
  const ai=vertex(box('Local AI Runtime','External System / Optional','HTTP :11434','Explanation rewrite only'),1990,900,360,170,EXT);
  edge(member,web,{exit:[1,.5],entry:[0,.5]}); text('1  Request',340,450,105,24,12,'center');
  edge(web,gateway,{exit:[1,.5],entry:[0,.5]}); text('2  HTTPS :443',805,450,140,24,12,'center');
  edge(gateway,planning,{exit:[1,.5],entry:[0,.5]}); text('3  REST :8083',1305,450,140,24,12,'center');
  edge(planning,recommendation,{exit:[1,.5],entry:[0,.5]}); text('4  gRPC / HTTP/2 :8085',1815,440,160,32,12,'center');
  edge(recommendation,recdb,{exit:[1,.5],entry:[0,.5]}); text('5  TDS :1433',2370,450,145,24,12,'center');
  edge(recommendation,ai,{style:ASYNC,exit:[.5,1],entry:[.5,0]}); text('6  HTTP :11434 / Optional',2180,760,210,28,12,'left');
  text('<b>Invariant</b>  Deterministic safety and ranking complete before optional AI rewrite.',850,1130,1900,40,13,'center');
  text('<b>Legend</b>  Solid = synchronous | Dashed = optional',80,1320,900,30,12);
  save('05-recommendation-dynamic.drawio');
}

// Transactional Outbox + Redis Streams dynamic - Target Architecture
{
  const d=diagram('Outbox-Redis-Dynamic-Target',3500,1450); const {vertex,text,edge,save}=d;
  text('<b>Transactional Outbox + Redis Streams - Dynamic Flow (Target Architecture)</b>',60,35,3300,50,26);
  text('Example owner: Tracking & Progress Service. Each service publishes its own Outbox.',60,88,3000,32,13);
  const trackingDb=vertex(box('LongevityTrackingDb','Container / Database','SQL Server / :1433','Business state + Outbox'),100,520,420,190,DB);
  const tracking=vertex(box('Tracking & Progress Service','Container','REST :8084','Owns event + publisher'),700,520,470,190,BOX);
  const events=vertex(box('Event Streams','Container - Queue','Redis Streams / :6379','Integration events'),1400,520,500,190,QUEUE);
  const worker=vertex(box('Background Worker','Container','Ops :8086','Consumer / async jobs'),2150,520,470,190,BOX);
  const workerDb=vertex(box('LongevityWorkerDb','Container / Database','SQL Server / :1433','Idempotency / job state'),2850,520,420,190,DB);
  edge(tracking,trackingDb,{exit:[0,.35],entry:[1,.35]}); text('1  Commit + Outbox<br>TDS :1433',525,435,170,58,12,'center');
  edge(tracking,events,{style:ASYNC,exit:[1,.35],entry:[0,.35]}); text('2  XADD :6379',1180,455,210,28,12,'center');
  edge(worker,events,{style:ASYNC,exit:[0,.35],entry:[1,.35]}); text('3  XREADGROUP :6379',1910,455,230,28,12,'center');
  edge(worker,workerDb,{exit:[1,.35],entry:[0,.35]}); text('4  Idempotency  |  TDS :1433',2630,445,210,52,12,'center');
  edge(worker,events,{style:ASYNC,exit:[0,.78],entry:[1,.78]}); text('5  XACK  /  XADD dead-letter',1905,735,235,32,12,'center');
  text('<b>Ownership rule</b>  Worker never reads LongevityTrackingDb. Result events return through Event Streams; the owning service persists its own domain data.',610,940,2300,70,13,'center');
  text('<b>Delivery</b>  At-least-once | consumer idempotent by EventId | retry before dead-letter.',850,1080,1800,42,13,'center');
  text('<b>Legend</b>  Solid = SQL/local ownership | Dashed = Redis Streams async command',80,1310,1200,30,12);
  save('06-outbox-redis-dynamic.drawio');
}
console.log('WROTE target dynamic views');
