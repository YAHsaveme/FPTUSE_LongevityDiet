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
const full=JSON.parse(fs.readFileSync(path.join(root,'scripts/connected-erd-manifest.json'),'utf8'));
check(full.status==='CURRENT_MODEL_PLUS_DOCUMENTED_CONTEXT_NOT_SQL_FK','ERD must not misstate navigation buses as SQL FKs');
check(full.tables===32&&full.physicalSqlFkCount===9,'32-table/9-FK source summary changed');
const physical=db.edges.filter(e=>e.a.style.includes('strokeColor=#164B78'));
const logical=db.edges.filter(e=>e.a.style.includes('strokeColor=#BA822A'));
const event=db.edges.filter(e=>e.a.style.includes('strokeColor=#7753A8'));
const context=db.edges.filter(e=>e.a.style.includes('strokeColor=#477E96'));
check(physical.length===9,'SQL FK Crow Foot connector count must equal 9');
check(db.edges.length===full.relationships.length,'Native relationship edges missing or duplicated');
check(logical.length===4&&event.length===4&&context.length===20,'Incorrect count/types of documented non-FK connections');
check(full.allTablesHaveLinks&&full.allNodesOneConnectedGraph,'Generator connectivity audit failed');
const tableNames=new Set(manifest.databaseCardNames);
const cardNodes=db.vertices.filter(v=>[...tableNames].some(n=>(v.a.value||'').startsWith('&lt;b&gt;'+n+'&lt;/b&gt;')));
check(cardNodes.length===32,'Exactly 32 real table cards required');
const cards=new Map(cardNodes.map(v=>[(v.a.value||'').split('&lt;b&gt;')[1].split('&lt;/b&gt;')[0],v]));
check(cards.size===32,'Duplicate or missing table cards');
for(const name of tableNames)check(cards.has(name),'Missing source table '+name);
for(const rel of manifest.realRelationships){
 const a=cards.get(rel.parent),b=cards.get(rel.child);
 if(!a||!b){check(false,'Missing FK parent/child '+rel.parent+' -> '+rel.child);continue;}
 const edges=physical.filter(e=>e.a.source===a.a.id&&e.a.target===b.a.id);
 check(edges.length===1,'Expected one real SQL FK edge '+rel.parent+' -> '+rel.child);
 if(edges.length){
  const style=edges[0].a.style;
  check(style.includes('startArrow=ERmandOne'),'Missing parent Crow Foot endpoint '+rel.parent);
  check(style.includes('endArrow='+(rel.cardinality==='1:1'?'ERmandOne':'ERmany')),'Incorrect Crow Foot child cardinality '+rel.child);
 }
}
for(const e of physical){
 check(cardNodes.some(v=>v.a.id===e.a.source)&&cardNodes.some(v=>v.a.id===e.a.target),
  'A physical FK may only join real SQL table cards');
}
// Validate the entire native connection graph, not merely a list of arrows.
const adjacency=new Map();
for(const e of db.edges){
 if(!adjacency.has(e.a.source))adjacency.set(e.a.source,new Set());
 if(!adjacency.has(e.a.target))adjacency.set(e.a.target,new Set());
 adjacency.get(e.a.source).add(e.a.target);
 adjacency.get(e.a.target).add(e.a.source);
}
for(const [table,node] of cards)check(adjacency.has(node.a.id),'Disconnected table card '+table);
const start=cardNodes[0]?.a.id;
const seen=new Set(start?[start]:[]),queue=start?[start]:[];
while(queue.length){for(const next of adjacency.get(queue.shift())||[]){
 if(!seen.has(next)){seen.add(next);queue.push(next);}
}}
for(const [table,node] of cards)check(seen.has(node.a.id),'No path to entire ERD for table '+table);
const realNative=full.relationships.filter(r=>r.type==='physical');
check(realNative.length===9&&full.relationships.length===db.edges.length,'Source-vs-diagram edge mismatch');
console.log('DATABASE_CONNECTIVITY_QA: tables='+cards.size+' SQL_FKs='+physical.length+
 ' logical='+logical.length+' events='+event.length+' navigation='+context.length+
 ' native_edges='+db.edges.length+' reachable_table_count='+[...cards.values()].filter(c=>seen.has(c.a.id)).length);
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
