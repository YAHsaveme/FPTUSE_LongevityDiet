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
const C0=diagrams.C0;
check(C0.edges.length===2,'C0 must show member/admin access to system boundary');
for(const p of ['MEMBER','ADMINISTRATOR','LONGEVITYDIET'])check(contains(C0,p),'C0 missing '+p);
const C1=diagrams.C1;
check(C1.edges.length===11,'C1 missing or excess directed container links');
for(const name of ['WEB / NGINX','REST API (.NET)','RECOMMENDATION gRPC',
'REDIS STREAMS','REMINDER WORKER','LongevityDietDb','LongevityTrackingDb','LongevityWorkerDb',
'5173','8080','8081','6379','14330','1433','no inbound HTTP port'])
 check(contains(C1,name),'C1 missing actual component/port: '+name);
for(const [a,b] of [['WEB / NGINX','REST API (.NET)'],['REST API (.NET)','RECOMMENDATION gRPC'],
['REST API (.NET)','LongevityDietDb'],['REST API (.NET)','LongevityTrackingDb'],
['REDIS STREAMS','REMINDER WORKER'],['REMINDER WORKER','REDIS STREAMS'],
['REMINDER WORKER','LongevityWorkerDb']])
 check(directed(C1,a,b),'C1 missing actual directed connection '+a+' -> '+b);
for(const port of manifest.ports)check(fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8').includes(port.replace(/^([0-9]+):([0-9]+)$/,'$1}:$2')),'Port declaration not in Compose: '+port);
const C2=diagrams.C2;
check(C2.edges.length===42,'C2 incomplete: expected 40 domain arrows + web/gateway + gateway continuation');
for(const info of manifest.controllers){
 const domain=info.domain.toUpperCase();
 for(const label of [domain,info.controller,info.service,info.persistence,info.owner])
  check(contains(C2,label),'C2 missing implemented module/route '+label);
 check(fs.existsSync(path.join(root,'src/LongevityDiet.API/Controllers',info.controller+'.cs')),
  'C2 controller is not implemented: '+info.controller);
}
for(let i=0;i<10;i++){
 // The generator produces 4 named states per lane; test edges by their parsed geometry.
 const vertices=C2.vertices;const keys=[manifest.controllers[i].controller,manifest.controllers[i].service,
 manifest.controllers[i].persistence,manifest.controllers[i].owner];
 const expectedId=((idx)=>vertices.filter(v=>(v.a.value||'').includes(keys[idx])))(0);
 check(expectedId.length>=1,'C2 module controller missing: '+keys[0]);
}
const db=diagrams['Database Diagram'];
const unified=JSON.parse(fs.readFileSync(path.join(root,'scripts/unified-erd-manifest.json'),'utf8'));
check(unified.scope==='CURRENT_EF_MAPPED' && unified.noDividers && unified.noPseudoHubs,
 'Unified ERD should contain no artificial column separators or pseudo-relational hubs');
check(unified.tableCount===32 && unified.actualSqlFKs===9 && unified.logicalLinks===16 && unified.eventLinks===6,
 '32 table / 9 SQL FK / 16 logical / 6 event count mismatch');
check(unified.totalRelationships===31 && db.edges.length===31,
 'Unexpected number of actual relationship connectors');
const sqlEdges=db.edges.filter(e=>(e.a.style||'').includes('strokeColor=#164B78'));
const logicalEdges=db.edges.filter(e=>(e.a.style||'').includes('strokeColor=#B2862E'));
const eventEdges=db.edges.filter(e=>(e.a.style||'').includes('strokeColor=#805AB1'));
check(sqlEdges.length===9 && logicalEdges.length===16 && eventEdges.length===6,
 'ERD edge color/type missing or an invented link was added');
const expectedNames=new Set(manifest.databaseCardNames);
const tableNodes=db.vertices.filter(v=>[...expectedNames].some(t=>(v.a.value||'').startsWith('&lt;b&gt;'+t+'&lt;/b&gt;')));
const cardMap=new Map(tableNodes.map(v=>[(v.a.value||'').split('&lt;b&gt;')[1].split('&lt;/b&gt;')[0],v]));
check(tableNodes.length===32 && cardMap.size===32,'Every actual mapped table must appear exactly once');
for(const table of expectedNames)check(cardMap.has(table),'Missing source table '+table);
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
 const color=rel.kind==='sql'?'#164B78':rel.kind==='event'?'#805AB1':'#B2862E';
 check(style.includes('strokeColor='+color),'Relationship kind not visibly distinguished: '+pair);
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
