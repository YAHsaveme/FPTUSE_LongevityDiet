// Course-work architecture completeness QA: verify ports, DB ownership,
// directed edges, every nondecorative container/component node and actual
// EF Core table coverage. A stateless gRPC service correctly has NO SQL DB.
// Run on Windows and Ubuntu CI (no Draw.io binary required).
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),docs=path.join(root,'docs/assignment/one-page');
const A=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const errors=[];
function diagram(n){
 const xml=fs.readFileSync(path.join(docs,n+'.drawio'),'utf8');
 return [...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)]
   .map(m=>({a:A(m[1]),body:m[2]||''}));
}
function get(cells,title){
 const s='&lt;b&gt;'+title+'&lt;/b&gt;';
 const matches=cells.filter(c=>c.a.vertex==='1'&&(c.a.value||'').startsWith(s));
 if(matches.length!==1){errors.push('Expected one '+title+' node, found '+matches.length);return null}
 return matches[0];
}
function audit(title,nodes,links,expected,ports,actors=0){
 const items=diagram(title),E=items.filter(c=>c.a.edge==='1');
 const V=items.filter(c=>c.a.vertex==='1'),actorNodes=V.filter(c=>(c.a.style||'').includes('shape=umlActor'));
 if(actorNodes.length!==actors)errors.push(title+': expected '+actors+' actors, got '+actorNodes.length);
 const resolved=new Map();
 for(const name of nodes){
  const v=get(items,name);if(!v)continue;
  resolved.set(name,v.a.id);
  const degree=E.filter(e=>e.a.source===v.a.id||e.a.target===v.a.id).length;
  if(!degree)errors.push(title+': ISOLATED important module '+name);
 }
 for(const [src,tgt] of links){
  if(!resolved.has(src)||!resolved.has(tgt))continue;
  if(!E.some(e=>e.a.source===resolved.get(src)&&e.a.target===resolved.get(tgt)))
   errors.push(title+': missing directed edge '+src+' -> '+tgt);
 }
 for(const pair of expected){
  const [name,part]=pair;
  const v=get(items,name);if(v&&!(v.a.value||'').includes(part))
   errors.push(title+': incorrect ownership/description '+name+' expected '+part);
 }
 for(const label of ports)if(!items.some(c=>(c.a.value||'').includes(label)))
  errors.push(title+': port label missing '+label);
 if(actors){
  const id=resolved.get('Web Application');
  for(const ac of actorNodes)if(!E.some(e=>e.a.source===ac.a.id&&e.a.target===id))
   errors.push(title+': an actor does not connect to Web Application');
 }
 console.log('TOPOLOGY '+title+': '+resolved.size+' functional nodes, '+E.length+' directed arrows, '+actorNodes.length+' actors, no orphan main modules');
}
audit('02-c1-container-architecture',
 ['Web Application','REST API','Recommendation Service','Redis Streams','Background Worker',
  'Identity Database','Tracking Database','Worker Database'],
 [['Web Application','REST API'],['REST API','Recommendation Service'],
  ['REST API','Identity Database'],['REST API','Tracking Database'],
  ['REST API','Redis Streams'],['Redis Streams','REST API'],
  ['Redis Streams','Background Worker'],['Background Worker','Redis Streams'],
  ['Background Worker','Worker Database']],
 [['Recommendation Service','No database'],['Identity Database','LongevityDietDb'],
  ['Tracking Database','LongevityTrackingDb'],['Worker Database','LongevityWorkerDb'],
  ['Background Worker','no HTTP port']],
 ['5173','8080','8081','6379','14330'],2);
audit('03-c2-api-components',
 ['Web UI','Routing + Authorization Policies',
  'AuthController','ProfileController','ReminderNotificationsController','TrackingController',
  'RecommendationController','AuthenticationService','ProfileService','ReminderService',
  'TrackingService','ActivityCoach gRPC Client','Identity Persistence','Identity Redis Bridge',
  'Tracking Persistence','Recommendation gRPC','Identity SQL Database','Redis Streams',
  'Tracking SQL Database'],
 [['Web UI','Routing + Authorization Policies'],
  ...[['AuthController','AuthenticationService'],['ProfileController','ProfileService'],
     ['ReminderNotificationsController','ReminderService'],
     ['TrackingController','TrackingService'],
     ['RecommendationController','ActivityCoach gRPC Client']],
  ['RecommendationController','TrackingService'],
  ['AuthenticationService','Identity Persistence'],
  ['ProfileService','Identity Persistence'],
  ['ReminderService','Identity Persistence'],
  ['Identity Redis Bridge','Identity Persistence'],
  ['TrackingService','Tracking Persistence'],
  ['Identity Persistence','Identity SQL Database'],
  ['Identity Redis Bridge','Redis Streams'],['Redis Streams','Identity Redis Bridge'],
  ['Tracking Persistence','Tracking SQL Database'],
  ['ActivityCoach gRPC Client','Recommendation gRPC']],
 [['Recommendation gRPC','no SQL database'],['Identity SQL Database','LongevityDietDb'],
  ['Tracking SQL Database','LongevityTrackingDb']],
 ['8081','6379','1433'],0);
const source=fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8');
for(const t of ['5173}:80','8080}:8080','8081}:8081','6379}:6379','14330}:1433']){
 if(!source.includes(t))errors.push('docker-compose port mapping missing '+t);
}
const realContexts=[
 ['src/LongevityDiet.Repositories/LongevityDietDbContext.cs',21],
 ['src/LongevityDiet.Tracking/TrackingDbContext.cs',7],
 ['src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs',4]
];
const physical=diagram('06-full-physical-database');
const tableNames=[];
for(const [file,count] of realContexts){
 const text=fs.readFileSync(path.join(root,file),'utf8');
 const tables=[...text.matchAll(/\.ToTable\("([^"]+)"\)/g)].map(m=>m[1]);
 if(tables.length!==count)errors.push('Context '+file+' table count changed to '+tables.length);
 tableNames.push(...tables);
}
for(const name of tableNames)if(!physical.some(c=>c.a.vertex==='1'&&c.a.value===name))
 errors.push('Missing real EF Core physical table '+name);
if(tableNames.length!==32||new Set(tableNames).size!==32)errors.push('Expected exactly 32 unique mapped EF tables');
const catalogEdges=physical.filter(c=>c.a.edge==='1');
if(catalogEdges.length)errors.push('Physical catalog must show clean table details; use separate 17 FK ledger');
const fkManifest=JSON.parse(fs.readFileSync(path.join(docs,'physical-model-manifest.json'),'utf8'));
if(fkManifest.scope!=='CURRENT_EF_MAPPED'||fkManifest.tableCount!==32||fkManifest.localFkCount!==9)errors.push('Physical schema manifest drift');
const auditCells=diagram('17-physical-sql-fk-audit');
const auditNodes=new Map(auditCells.filter(c=>c.a.vertex==='1').map(c=>[c.a.id,c]));
const sqlEdges=auditCells.filter(c=>c.a.edge==='1');
if(sqlEdges.length!==9)errors.push('Expected exactly nine real local SQL FK arrows');
const found=[];
for(const e of sqlEdges){
 const parent=auditNodes.get(e.a.source)?.a.value||'',child=auditNodes.get(e.a.target)?.a.value||'';
 if(!parent||!child)errors.push('SQL FK audit has unattached endpoint '+e.a.id);
 found.push(parent+' -> '+child);
}
for(const r of fkManifest.relationships){
 const needle=r.parent+'.'+r.parentKey,child=r.child+'.'+r.childKey;
 if(!found.some(pair=>pair.includes(needle)&&pair.includes(' -> '+child)))errors.push('SQL FK arrow missing '+needle+' -> '+child);
}
if(new Set(found).size!==9)errors.push('Duplicate FK arrows in physical ledger');
console.log('PHYSICAL_DB_COVERAGE: 21 Identity/Planning + 7 Tracking + 4 Worker = '+tableNames.length+' mapped tables, '+sqlEdges.length+' local SQL FK arrows');
if(errors.length){errors.forEach(e=>console.error('TOPOLOGY_FAIL '+e));process.exit(1);}
console.log('TOPOLOGY_AND_SCHEMA_QA=PASS');
