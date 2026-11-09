'use strict';
/** Verify FOUR canonical current diagrams, not the deprecated 32-table snapshot. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'docs/assignment/one-page');
const schema=JSON.parse(fs.readFileSync(path.join(dir,'full-schema-manifest.json'),'utf8'));
const c2m=JSON.parse(fs.readFileSync(path.join(dir,'c2-current-manifest.json'),'utf8'));
const errors=[];
function check(v,msg){if(!v)errors.push(msg);}
function attributes(s){return Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));}
function parse(name){
 const file=path.join(dir,name+'.drawio'),pdf=path.join(dir,name+'.pdf');
 check(fs.existsSync(file),name+' missing native drawing');check(fs.existsSync(pdf),name+' missing PDF');
 if(!fs.existsSync(file)||!fs.existsSync(pdf))return null;
 const xml=fs.readFileSync(file,'utf8'),bin=fs.readFileSync(pdf,'latin1');
 const cells=[...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)]
  .map(m=>({a:attributes(m[1]),body:m[2]||''}));
 const vertices=cells.filter(x=>x.a.vertex==='1'),edges=cells.filter(x=>x.a.edge==='1');
 const names=new Map(vertices.map(x=>[x.a.id,x]));
 for(const e of edges)
  check(names.has(e.a.source)&&names.has(e.a.target),name+' detached native connector '+e.a.id);
 const pdfPages=(bin.match(/\/Type\s*\/Page\b/g)||[]).length;
 check(pdfPages===1,name+' is not a one-page PDF: '+pdfPages);
 check(fs.statSync(pdf).size>3000,name+' empty PDF');
 const colors=[...xml.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map(x=>x[0].toUpperCase());
 check(colors.every(x=>x==='#FFFFFF'||x==='#000000'),name+' contains non-monochrome colors');
 const arc=(a,b)=>edges.some(x=>x.a.source===a&&x.a.target===b);
 const by=(needle)=>vertices.find(x=>(x.a.value||'').includes(needle));
 const node=(id)=>names.get(id);
 const adjacent=new Map(vertices.map(x=>[x.a.id,new Set()]));
 for(const e of edges){adjacent.get(e.a.source)?.add(e.a.target);adjacent.get(e.a.target)?.add(e.a.source);}
 function allReached(start){
  if(!start)return new Set();
  const q=[start],seen=new Set();
  while(q.length){const current=q.pop();if(seen.has(current))continue;seen.add(current);
   for(const next of adjacent.get(current)||[])if(!seen.has(next))q.push(next);}
  return seen;
 }
 return {name,xml,vertices,edges,arc,by,node,allReached};
}
const names=['C0','C1','C2','Database Diagram'];
const v=Object.fromEntries(names.map(name=>[name,parse(name)]));
const c0=v.C0,c1=v.C1,c2=v.C2,erd=v['Database Diagram'];
if(c0){
 check(c0.edges.length===2,'C0 must display two actor/system relationships');
 check(c0.vertices.filter(x=>(x.a.style||'').includes('shape=umlActor')).length===2,'C0 needs two true human UML actors');
 check(Boolean(c0.by('LONGEVITYDIET')),'C0 system boundary missing');
}
if(c1){
 check(c1.edges.length===11,'C1 must contain 11 runtime interface arrows');
 check(c1.vertices.filter(x=>(x.a.style||'').includes('shape=umlActor')).length>=2,'C1 missing person actors');
 for(const label of ['WEB / NGINX','REST API','RECOMMENDATION gRPC','REDIS STREAMS','REMINDER WORKER','LongevityDietDb','LongevityTrackingDb','LongevityWorkerDb'])
  check(Boolean(c1.by(label)),'C1 missing runtime node '+label);
 const compose=fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8');
 for(const port of ['5173','8080','8081','6379','14330'])
  check(compose.includes(port),'C1 port not documented in Compose '+port);
}
check(c2m.status==='CURRENT_SOURCE_BACKED_C2_56','C2 source coverage status invalid');
check(c2m.controllers.length===22&&schema.tableCount===56,'C2 size drift');
if(c2){
 const rootList=fs.readdirSync(path.join(root,'src/LongevityDiet.API/Controllers'))
  .filter(x=>x.endsWith('Controller.cs')).map(x=>x.slice(0,-3));
 check(rootList.length===22,'Real controller count changed; update C2 from source');
 for(const actual of rootList)check(c2m.controllers.includes(actual),'Missing real API controller '+actual);
 check(c2.edges.length===c2m.c2Edges,'C2 native arrow count mismatch');
 check(c2.vertices.length===c2m.c2Vertices,'C2 native node count mismatch');
 check(c2.vertices.filter(x=>(x.a.style||'').includes('shape=umlActor')).length===2,'C2 member/admin person icons missing');
 const actualRoot=c2.by('REST API ROUTING'),web=c2.by('WEB / NGINX'),grpc=c2.by('RECOMMENDATION gRPC'),redis=c2.by('REDIS STREAMS'),worker=c2.by('REMINDER WORKER');
 check(Boolean(actualRoot&&web&&grpc&&redis&&worker),'C2 infrastructure missing');
 if(actualRoot&&web)check(c2.arc(web.a.id,actualRoot.a.id),'Web to API request missing');
 if(actualRoot&&grpc)check(c2.arc(actualRoot.a.id,grpc.a.id),'REST to gRPC call missing');
 if(actualRoot&&redis)check(c2.arc(actualRoot.a.id,redis.a.id),'REST to Redis outbox missing');
 if(redis&&worker)check(c2.arc(redis.a.id,worker.a.id),'Redis to Worker consumer missing');
 const dispatchRail=c2.vertices.find(x=>actualRoot&&x.a.value===''&&c2.arc(actualRoot.a.id,x.a.id));
 check(Boolean(dispatchRail),'Missing common API HTTP routing bus');
 const actualGroups=c2m.groups;
 for(let groupIndex=0;groupIndex<actualGroups.length;groupIndex++){
  const group=actualGroups[groupIndex],route=c2.by(group.controllers.length+' REAL CONTROLLERS');
  check(Boolean(route),'Missing HTTP route lane '+group.title);
  if(dispatchRail&&route)check(c2.arc(dispatchRail.a.id,route.a.id),'API gateway bus missing group route '+group.title);
  const routeRail=c2.vertices.find(x=>route&&x.a.value===''&&c2.arc(route.a.id,x.a.id));
  check(Boolean(routeRail),'Group ingress connector rail missing '+group.title);
  let repositoryRail=null;
  for(const controller of group.controllers){
   const ctrl=c2.by(controller),srv=c2.vertices.find(x=>ctrl&&c2.arc(ctrl.a.id,x.a.id)),repo=c2.vertices.find(x=>srv&&c2.arc(srv.a.id,x.a.id));
   check(Boolean(ctrl&&srv&&repo),'Missing full Controller->Service->Repo pipeline '+controller);
   if(routeRail&&ctrl)check(c2.arc(routeRail.a.id,ctrl.a.id),'Ingress rail to controller missing '+controller);
   const sink=c2.vertices.find(x=>repo&&x.a.value===''&&c2.arc(repo.a.id,x.a.id));
   check(Boolean(sink),'Repository data connector rail missing '+controller);
   if(repositoryRail&&sink)check(repositoryRail.a.id===sink.a.id,'Split SQL repo rail for '+group.title);
   if(sink)repositoryRail=sink;
  }
  if(repositoryRail)check(c2.edges.some(e=>e.a.source===repositoryRail.a.id&&
      c2.node(e.a.target)?.a.value?.includes('Repository group ownership')),
    'Repository rail not connected to owned SQL data '+group.title);
 }
 const reachable=c2.allReached(web?.a.id);
 for(const controller of c2m.controllers){
  const ctrl=c2.by(controller);
  check(Boolean(ctrl&&reachable.has(ctrl.a.id)),'C2 cannot reach '+controller+' from Web');
 }
 for(const db of ['LongevityDietDb','LongevityTrackingDb','LongevityWorkerDb']){
  const table=c2.by(db+'&#xa;')||c2.by(db+'&lt;br/&gt;')||c2.by(db);
  check(Boolean(table), 'C2 database node missing '+db);
 }
}
if(erd){
 check(erd.edges.length===schema.relations.length,'ERD missing physical or app relationship');
 check(schema.physicalFkCount===23&&schema.logicalAssociations===32&&schema.allRelevantAppCount===50,'EF schema relationship coverage drift');
 check(erd.edges.length===55,'ERD expected 23 physical + 32 necessary app connectors');
 const actual=fs.readFileSync(path.join(dir,'Database Diagram FULL.drawio'),'utf8');
 check(erd.xml===actual,'Canonical ERD is not the current full EF physical diagram');
 for(const table of schema.tables)
  check(erd.vertices.some(x=>x.a.value?.startsWith(table.table+'  ['+table.db+' / '+table.schema+']')),
   'ERD omits physical table '+table.id);
 const referenced=fs.readFileSync(path.join(dir,'full-schema-manifest.json'),'utf8');
 check(Boolean(referenced),'ERD missing physical manifest');
 const start=erd.by('Users  [main / dbo]'),reachable=erd.allReached(start?.a.id);
 check(reachable.size>=56,'ERD contains an unconnected table');
 const srcFiles=[
  'src/LongevityDiet.Repositories/Migrations/LongevityDietDbContextModelSnapshot.cs',
  'src/LongevityDiet.Tracking/Migrations/TrackingDbContextModelSnapshot.cs',
  'src/LongevityDiet.Worker/Reminders/Migrations/ReminderWorkerDbContextModelSnapshot.cs'];
 const current=srcFiles.map(p=>fs.readFileSync(path.join(root,p),'utf8'));
 check(current.reduce((acc,s)=>acc+([...s.matchAll(/b\.ToTable\("([^"]+)"/g)].length),0)===56,
  'Physical EF snapshot count no longer 56');
}
if(errors.length){for(const e of errors)console.error('OVERALL_QA_FAIL',e);process.exitCode=1;}
else console.log('CURRENT_OVERALL_QA=PASS canonical C0/C1/C2/ERD: actors, 22 live controllers, 56 SQL tables, 23 real SQL FK, 32 visible APP connectors (50 documented), Native Draw.io one-page monochrome, route/service/repository and runtime boundaries verified');
