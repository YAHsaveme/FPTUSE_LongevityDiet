// Validate only the four user-facing OVERALL drawings against current source code.
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),base=path.join(root,'docs/assignment/one-page');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/overall-diagram-manifest.json'),'utf8'));
const names=['C0','C1','C2','Database Diagram'],fail=[];
const check=(ok,msg)=>{if(!ok)fail.push(msg)};
const attr=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
function get(name){
 const xml=fs.readFileSync(path.join(base,name+'.drawio'),'utf8');
 const cells=[...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)].map(m=>({a:attr(m[1]),body:m[2]||''}));
 const vertices=cells.filter(c=>c.a.vertex==='1'),edges=cells.filter(c=>c.a.edge==='1');
 const nodeMap=new Map(vertices.map(x=>[x.a.id,x]));
 const rectangles=vertices.map(v=>{
  const m=v.body.match(/<mxGeometry\b([^>]+)\/>/);
  if(!m)return null;
  const p=attr(m[1]);
  return {id:v.a.id,x:+p.x,y:+p.y,w:+p.width,h:+p.height};
 }).filter(Boolean);
 const contains=(a,b)=>a.x<=b.x+2&&a.y<=b.y+2&&
   a.x+a.w>=b.x+b.w-2&&a.y+a.h>=b.y+b.h-2;
 let unexpectedOverlaps=0;
 for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){
  const a=rectangles[i],b=rectangles[j];
  const iw=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
  const ih=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
  if(iw>8&&ih>8&&!contains(a,b)&&!contains(b,a)){
   unexpectedOverlaps++;
   check(false,name+': overlapping shapes '+a.id+' and '+b.id);
  }
 }
 console.log('OVERALL_LAYOUT',name,'rectangles',rectangles.length,'unexpectedOverlaps',unexpectedOverlaps);

 for(const e of edges)check(nodeMap.has(e.a.source)&&nodeMap.has(e.a.target),name+': unattached native connector '+e.a.id);
 const pdfPath=path.join(base,name+'.pdf');
 check(fs.existsSync(pdfPath),name+': missing PDF');
 if(fs.existsSync(pdfPath)){
  const pdf=fs.readFileSync(pdfPath,'latin1');
  const pages=(pdf.match(/\/Type\s*\/Page\b/g)||[]).length;
  check(pages===1,name+': expected exactly one PDF page, got '+pages);
  check(fs.statSync(pdfPath).size>1000,name+': empty PDF');
 }
 console.log('OVERALL_VIEW',name,'cells',vertices.length,'edges',edges.length);
 return {cells,vertices,edges,nodeMap};
}
const diagrams=Object.fromEntries(names.map(n=>[n,get(n)]));
check(JSON.stringify(manifest.names)===JSON.stringify(names),'Incorrect diagram names; only C0/C1/C2/Database Diagram allowed');
check(manifest.status==='CURRENT_IMPLEMENTED_SOURCE','Cannot mix future target into current architecture');
check(JSON.stringify(manifest.tableGroups)===JSON.stringify({identity:21,tracking:7,worker:4}),'DB catalog counts drift');
check(manifest.mappedTableCount===32&&manifest.sqlForeignKeys===9,'Physical source coverage drift');
const contains=(view,text)=>view.vertices.some(x=>(x.a.value||'').includes(text));
function directed(view,a,b){
 const A=view.vertices.find(v=>(v.a.value||'').includes(a)),B=view.vertices.find(v=>(v.a.value||'').includes(b));
 return A&&B&&view.edges.some(e=>e.a.source===A.a.id&&e.a.target===B.a.id);
}
const c4=JSON.parse(fs.readFileSync(path.join(root,'scripts/c4-architecture-manifest.json'),'utf8'));
check(c4.status==='CURRENT_C4_BLACK_WHITE','Unexpected C4 version');
const C0=diagrams.C0,C1=diagrams.C1,C2=diagrams.C2;
const expected={C0:2,C1:11,C2:41};
for(const [name,need] of Object.entries(expected)){
 const view=diagrams[name],native=fs.readFileSync(path.join(base,name+'.drawio'),'utf8');
 check(view.edges.length===need,name+': expected '+need+' visible native arrows');
 const colors=[...native.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(m=>m[0].toUpperCase());
 check(colors.every(c=>c==='#000000'||c==='#FFFFFF'),name+': colors forbidden');
 for(const edge of view.edges){
  check((edge.a.value||'').trim().length>3,name+': unlabeled arrow '+edge.a.id);
  check((edge.a.style||'').includes('endArrow=block'),name+': arrowhead missing '+edge.a.id);
  check((edge.a.style||'').includes('strokeColor=#000000'),name+': colored connector '+edge.a.id);
 }
}
check(contains(C0,'PERSON')&&contains(C0,'LONGEVITYDIET'),'C0 missing actors/product boundary');
check(!contains(C0,':1433')&&!contains(C0,':8080'),'C0 must remain at context level; ports belong in C1');
const c1Nodes=['WEB / NGINX','REST API','RECOMMENDATION gRPC','REDIS STREAMS','REMINDER WORKER','LongevityDietDb','LongevityTrackingDb','LongevityWorkerDb','NO OWN DB'];
for(const n of c1Nodes)check(contains(C1,n),'C1 missing actual container/DB '+n);
for(const p of ['5173','8080','8081','6379','14330','1433'])check(contains(C1,p),'C1 missing documented port '+p);
for(const [a,b] of [['WEB / NGINX','REST API'],['REST API','RECOMMENDATION gRPC'],['REST API','LongevityDietDb'],['REST API','LongevityTrackingDb'],['REDIS STREAMS','REMINDER WORKER'],['REMINDER WORKER','REDIS STREAMS'],['REMINDER WORKER','LongevityWorkerDb'],['REST API','REDIS STREAMS'],['REDIS STREAMS','REST API']])
 check(directed(C1,a,b),'C1 missing directional connection '+a+' -> '+b);
const compose=fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8');
for(const p of c4.ports){const [host,inside]=p.split(':');check(compose.includes(host+'}:'+inside),'C1 port inconsistent with Docker Compose '+p);}
check(c4.controllers.length===10,'C2 must include 10 real API controllers');
check(C2.edges.length===1+4*c4.controllers.length,'C2 one router+4 arrows per endpoint required');
const cards=C2.vertices;
const card=(part)=>cards.find(v=>(v.a.value||'').includes(part));
function edgeBetween(view,source,dest){if(!source||!dest)return false;return view.edges.some(e=>e.a.source===source.a.id&&e.a.target===dest.a.id)}
const httpRouter=card('API ROUTING');
for(const info of c4.controllers){
 const ctrl=card(info.controller);
 const svc=cards.find(v=>(v.a.value||'').includes(info.service)&&edgeBetween(C2,ctrl,v));
 const repo=cards.find(v=>(v.a.value||'').includes(info.persistence)&&edgeBetween(C2,svc,v));
 check(Boolean(ctrl&&svc&&repo),'C2 missing true Controller/Service/Persistence '+info.controller);
 check(fs.existsSync(path.join(root,'src/LongevityDiet.API/Controllers',info.controller+'.cs')),'C2 controller not in source: '+info.controller);
 check(edgeBetween(C2,httpRouter,ctrl),'C2 router not attached to '+info.controller);
 check(edgeBetween(C2,ctrl,svc),'C2 Controller -> Service not connected '+info.controller);
 check(edgeBetween(C2,svc,repo),'C2 Service -> Persistence not connected '+info.controller);
 if(repo){
  const destinations=cards.filter(x=>(x.a.value||'').includes('DATABASE REFERENCE')&&(x.a.value||'').includes(info.database));
  check(destinations.some(x=>edgeBetween(C2,repo,x)),'C2 service missing DB endpoint '+info.controller);
 }
}
check(contains(C2,'HTTP/2 :8081'),'C2 missing explicit gRPC HTTP/2 dependency');
check(contains(C2,'NO OWN DB')||contains(C2,'no separate DB'),'C2 must not invent gRPC storage');
check(contains(C2,'LongevityWorkerDb'),'C2 must identify Worker-owned database as external dependency');
console.log('C4_ARCHITECTURE_QA: C0 2 labeled arrows; C1 11 protocol/DB arrows; C2 10 complete controller-service-persistence-DB lanes, all monochrome');
const db=diagrams['Database Diagram'];
const unified=JSON.parse(fs.readFileSync(path.join(root,'scripts/unified-erd-manifest.json'),'utf8'));
check(unified.scope==='CURRENT_EF_MAPPED' && unified.noDividers && unified.noPseudoHubs,
 'Unified ERD should contain no artificial column separators or pseudo-relational hubs');
check(unified.tableCount===32 && unified.actualSqlFKs===9 && unified.logicalLinks===16 && unified.eventLinks===6,
 '32 table / 9 SQL FK / 16 logical / 6 event count mismatch');
check(unified.totalRelationships===31 && db.edges.length===31,
 'Unexpected number of actual relationship connectors');
const sqlEdges=db.edges.filter(e=>(e.a.style||'').includes('startArrow=ERmandOne')&&!(e.a.style||'').includes('dashed=1'));
const logicalEdges=db.edges.filter(e=>(e.a.style||'').includes('endArrow=open')&&(e.a.style||'').includes('dashPattern=17 11'));
const eventEdges=db.edges.filter(e=>(e.a.style||'').includes('endArrow=block')&&(e.a.style||'').includes('dashPattern=2 10'));
check(sqlEdges.length===9 && logicalEdges.length===16 && eventEdges.length===6,
 'ERD edge color/type missing or an invented link was added');
const expectedNames=new Set(manifest.databaseCardNames);
const nativeERD=fs.readFileSync(path.join(base,'Database Diagram.drawio'),'utf8');
const colors=[...nativeERD.matchAll(/#[0-9a-fA-F]{6}\b/g)].map(m=>m[0].toUpperCase());
check(colors.every(c=>c==='#000000'||c==='#FFFFFF'),'ERD contains unwanted non-monochrome colors');
check(nativeERD.includes('fillColor=#FFFFFF'),'ERD must use white shapes');
const tableNodes=db.vertices.filter(v=>[...expectedNames].some(t=>(v.a.value||'').startsWith('&lt;b&gt;'+t+'&lt;/b&gt;')));
const cardMap=new Map(tableNodes.map(v=>[(v.a.value||'').split('&lt;b&gt;')[1].split('&lt;/b&gt;')[0],v]));
check(tableNodes.length===32 && cardMap.size===32,'Every actual mapped table must appear exactly once');
for(const table of expectedNames)check(cardMap.has(table),'Missing source table '+table);
// Readability gate: geometry and typography checked together, not only edge counts.
const dbCodes={identity:'I',tracking:'T',worker:'W'};
const ownerByTable=new Map();
const physicalSchema=JSON.parse(fs.readFileSync(path.join(root,'scripts/current-physical-schema.json'),'utf8'));
for(const [owner,model] of Object.entries(physicalSchema.groups))
 for(const n of Object.keys(model.columns))ownerByTable.set(n,owner);
const dbPage=+(nativeERD.match(/pageWidth="([\d.]+)"/)||[])[1];
let minFontRatio=Infinity,maxCapacity=0;
for(const [name,card] of cardMap){
 const geometry=card.body.match(/<mxGeometry\b([^>]*?)\/>/);
 check(Boolean(geometry),'Missing real table bounds '+name);
 if(!geometry)continue;
 const bounds=attr(geometry[1]);
 const width=+bounds.width,height=+bounds.height;
 const font=+(card.a.style.match(/fontSize=([\d.]+)/)||[])[1];
 const owner=ownerByTable.get(name);
 check(owner&&card.a.value.includes('['+dbCodes[owner]+']'),'Short database ID absent from '+name);
 check(card.a.value.startsWith('&lt;b&gt;'+name+'&lt;/b&gt;'),'Table header clipped or renamed '+name);
 const lineText=card.a.value.replace(/&lt;br\s*\/&gt;/g,'\n').replace(/&lt;.*?&gt;/g,'').replace(/&amp;/g,'&');
 const lines=lineText.split('\n');
 const maxChars=Math.max(...lines.map(x=>x.length));
 const estimatedWidth=maxChars*font*0.70;
 const estimatedHeight=lines.length*font*1.35+24;
 check(estimatedWidth<width-10,'Likely text horizontal overflow '+name+' chars='+maxChars);
 check(estimatedHeight<height-10,'Likely text vertical overflow '+name+' lines='+lines.length);
 minFontRatio=Math.min(minFontRatio,font/dbPage);
 maxCapacity=Math.max(maxCapacity,estimatedHeight/height);
}
check(minFontRatio>=0.004,'ERD card font too small relative to page width: '+minFontRatio.toFixed(5));
for(const rel of unified.relationships){
 const A=cardMap.get(rel.from),B=cardMap.get(rel.to);if(!A||!B)continue;
 const edge=db.edges.find(e=>e.a.source===A.a.id&&e.a.target===B.a.id);
 if(rel.kind!=='sql')check(Boolean(edge&&edge.a.value.includes(': '))&&
  !/business key|^EVENT$|^APP:\s*$/.test(edge.a.value),
  'Vague APP/EVENT relationship label: '+rel.from+' -> '+rel.to);
}
console.log('READABILITY_QA: minTableFontToPageWidth='+minFontRatio.toFixed(5)+
 ' maxEstimatedTextHeightUse='+maxCapacity.toFixed(3)+' databaseCodeKeys='+cardMap.size);

const planned=new Set();
for(const rel of unified.relationships){
 const pair=rel.from+'|'+rel.to;
 check(!planned.has(pair),'Duplicate relation in source manifest: '+pair);
 planned.add(pair);
 const A=cardMap.get(rel.from),B=cardMap.get(rel.to);
 check(Boolean(A&&B),'Relation uses a missing table '+pair);
 if(!A||!B)continue;
 const match=db.edges.filter(e=>e.a.source===A.a.id&&e.a.target===B.a.id);
 check(match.length===1,'No directly attached relationship: '+pair);
 if(match.length!==1)continue;
 const style=match[0].a.style||'';
 check(style.includes('strokeColor=#000000'),'All connector strokes must be black: '+pair);
 const semantic=rel.kind==='sql'?'startArrow=ERmandOne':rel.kind==='event'?'dashPattern=2 10':'dashPattern=17 11';
 check(style.includes(semantic),'Monochrome connector pattern does not distinguish its meaning: '+pair);
 if(rel.kind==='logical')check((match[0].a.value||'').startsWith('APP: '),'Logical link missing its field label: '+pair);
 if(rel.kind==='event')check((match[0].a.value||'').startsWith('EVENT'),'Event lineage missing its readable label: '+pair);
 if(rel.kind==='sql'){
  check(manifest.realRelationships.some(f=>f.parent===rel.from&&f.child===rel.to&&f.cardinality===rel.cardinality),
   'Physical Crow Foot relation is not in EF Core: '+pair);
  check(style.includes('startArrow=ERmandOne'),'Parent cardinality missing: '+pair);
  const tip=rel.cardinality==='1:1'?'ERmandOne':'ERmany';
  check(style.includes('endArrow='+tip),'Child cardinality wrong: '+pair);
 } else check(style.includes('dashed=1'),'App/event link drawn deceptively like a SQL FK: '+pair);
}
for(const edge of db.edges){
 check(tableNodes.some(v=>v.a.id===edge.a.source)&&tableNodes.some(v=>v.a.id===edge.a.target),
  'All links must attach to real table cards, not a box, rail or decorative hub');
}
const adj=new Map([...cardMap.values()].map(v=>[v.a.id,new Set()]));
for(const edge of db.edges){adj.get(edge.a.source)?.add(edge.a.target);adj.get(edge.a.target)?.add(edge.a.source);}
const start=cardMap.get('Users')?.a.id;
const reached=new Set(start?[start]:[]),pending=start?[start]:[];
while(pending.length){const current=pending.shift();for(const next of adj.get(current)||[]){
 if(!reached.has(next)){reached.add(next);pending.push(next);}
}}
check(reached.size===32,'Disconnected database tables: '+(32-reached.size));
console.log('UNIFIED_DB_ERD_QA: 32 mapped tables, 9 real SQL FKs, 16 logical, 6 event links, '+reached.size+'/32 reachable, no artificial hubs');
const contexts=[
 ['src/LongevityDiet.Repositories/LongevityDietDbContext.cs',21,8],
 ['src/LongevityDiet.Tracking/TrackingDbContext.cs',7,1],
 ['src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs',4,0]
];
for(const [file,count,fks] of contexts){
 const src=fs.readFileSync(path.join(root,file),'utf8');
 check((src.match(/\.ToTable\("/g)||[]).length===count,'EF mapped table count changed '+file);
 check((src.match(/\.HasForeignKey(?:<[^>]+>)?\s*\(/g)||[]).length===fks,'EF FK count changed '+file);
}
const assets=fs.readdirSync(base).filter(n=>/\.(drawio|pdf)$/i.test(n)).sort();
const expectedAssets=names.flatMap(n=>[n+'.drawio',n+'.pdf']).sort();
check(JSON.stringify(assets)===JSON.stringify(expectedAssets),'More/less than the requested FOUR Draw.io + FOUR PDF outputs: '+assets.join(', '));
if(fail.length){fail.forEach(e=>console.error('OVERALL_QA_FAIL '+e));process.exitCode=1;}
else console.log('OVERALL_FOUR_QA=PASS: C0 C1 C2 Database Diagram; 10 controllers; 32 mapped tables; 9 FK edges; 4 PDFs');
