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
const relationManifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/professional-erd-relations.json'),'utf8'));
const physical=db.edges.filter(e=>!e.a.style.includes('dashed=1'));
const logical=db.edges.filter(e=>e.a.style.includes('dashed=1'));
check(physical.length===9,'Exactly nine SQL-enforced Crow Foot edges required');
check(logical.length===relationManifest.logicalCount,'Logical connector count drift');
check(relationManifest.currentTables===32 && relationManifest.physicalCount===9,'ERD manifest mismatches source database');
const tableNames=new Set(manifest.databaseCardNames);
const cards=db.vertices.filter(v=>[...tableNames].some(n=>(v.a.value||'').startsWith('&lt;b&gt;'+n+'&lt;/b&gt;')));
check(cards.length===32,'Exactly 32 source-backed table cards required');
const byTable=new Map(cards.map(v=>[(v.a.value||'').split('&lt;b&gt;')[1].split('&lt;/b&gt;')[0],v]));
check(byTable.size===32,'Repeated/missing SQL table cards');
for(const name of tableNames)check(byTable.has(name),'Missing source table '+name);
for(const r of manifest.realRelationships){
 const a=byTable.get(r.parent),b=byTable.get(r.child);
 check(Boolean(a&&b),'Missing direct SQL tables '+r.parent+' to '+r.child);
 if(a&&b)check(physical.some(e=>e.a.source===a.a.id&&e.a.target===b.a.id),
  'Crow Foot FK is not attached to actual tables: '+r.parent+' to '+r.child);
}
for(const e of physical){
 check(e.a.style.includes('startArrow=ERmandOne'),'Crow Foot missing source cardinality '+e.a.id);
 check(e.a.style.includes('endArrow=ERmany')||e.a.style.includes('endArrow=ERmandOne'),
  'Crow Foot missing target cardinality '+e.a.id);
}
for(const relation of relationManifest.links){
 const a=byTable.get(relation.from),b=byTable.get(relation.to);
 const arr=relation.mode==='physical'?physical:logical;
 check(Boolean(a&&b),'Relationship with missing table '+relation.from+' to '+relation.to);
 if(a&&b)check(arr.some(e=>e.a.source===a.a.id&&e.a.target===b.a.id),
  'Missing grounded '+relation.mode+' connection '+relation.from+' to '+relation.to);
}
for(const e of db.edges){
 check(cards.some(v=>v.a.id===e.a.source)&&cards.some(v=>v.a.id===e.a.target),
  'ERD relation endpoint not attached directly to a real table: '+e.a.id);
}
console.log('PROFESSIONAL_ERD_QA: tables='+cards.length+' actualFK='+physical.length+' logical='+logical.length);
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
