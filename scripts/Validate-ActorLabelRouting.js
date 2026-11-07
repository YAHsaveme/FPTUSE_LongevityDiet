'use strict';
// Verify actual editable Draw.io actor silhouettes, edge-label displacement,
// orthogonal routing and alignment of the important C1/C2 service corridors.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const attr=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
function inspect(name){
 const xml=fs.readFileSync(path.join(root,'docs/assignment/one-page',name+'.drawio'),'utf8');
 const cells=[...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)].map(m=>({a:attr(m[1]),content:m[2]||''}));
 const vertices=cells.filter(x=>x.a.vertex==='1').map(v=>({a:v.a,geom:attr((v.content.match(/<mxGeometry\b([^>]*?)\/>/)||[])[1]||'')}));
 const edges=cells.filter(x=>x.a.edge==='1').map(v=>({a:v.a,geom:attr((v.content.match(/<mxGeometry\b([^>]*?)(?:\/>|>)/)||[])[1]||''),content:v.content}));
 const byId=new Map(vertices.map(v=>[v.a.id,v]));
 const one=fragment=>{
  const matches=vertices.filter(v=>(v.a.value||'').includes(fragment));
  if(matches.length!==1)throw Error(name+': expected one '+fragment+', found '+matches.length);
  return matches[0];
 };
 const arrow=(a,b)=>{
  const start=one(a),end=one(b);
  const match=edges.filter(e=>e.a.source===start.a.id&&e.a.target===end.a.id);
  if(match.length!==1)throw Error(name+': missing arrow '+a+' -> '+b+' count '+match.length);
  return {edge:match[0],start,end};
 };
 for(const e of edges){
  const style=e.a.style||'';
  if(!style.includes('orthogonal=1')||!style.includes('rounded=0')||!style.includes('edgeStyle=segmentEdgeStyle'))
   throw Error(name+': unexpected non-orthogonal routing '+e.a.id);
  if((e.a.value||'').trim()){
   const y=+e.geom.y;
   if(!Number.isFinite(y)||y>-(name==='C0'?23:name==='C1'?21:16))
    throw Error(name+': label touches connector, actual y-offset='+e.geom.y+' edge='+e.a.id);
   if(!style.includes('labelBackgroundColor=#FFFFFF')||!style.includes('verticalLabelPosition=top'))
    throw Error(name+': label lacks white separation/above-line style '+e.a.id);
  }
  if(!byId.has(e.a.source)||!byId.has(e.a.target))
   throw Error(name+': edge has no real vertex endpoints '+e.a.id);
 }
 return {vertices,edges,one,arrow};
}
const c0=inspect('C0'),c1=inspect('C1'),c2=inspect('C2'),erd=inspect('Database Diagram');
let actors=0;
for(const [name,view] of [['C0',c0],['C1',c1]]){
 for(const person of ['MEMBER','ADMIN']){
  const node=view.one(person);
  const style=node.a.style||'';
  if(!style.includes('shape=umlActor')||!style.includes('verticalLabelPosition=bottom')||
    style.includes('rounded=1;'))throw Error(name+': '+person+' is not a monochrome UML stick figure');
  actors++;
 }
}
const coord=(n,x)=>{
 const g=n.geom;return +g[x];
};
function checkAxis(view,source,target,axis){
 const {edge,start,end}=view.arrow(source,target),style=edge.a.style;
 const f=+(style.match(new RegExp('exit'+axis.toUpperCase()+'=([0-9.]+)'))||[])[1];
 const t=+(style.match(new RegExp('entry'+axis.toUpperCase()+'=([0-9.]+)'))||[])[1];
 if(!Number.isFinite(f)||!Number.isFinite(t))throw Error(view+': missing anchors '+source+' -> '+target);
 const extent=axis==='x'?'width':'height';
 const pos=Math.abs((coord(start,axis)+coord(start,extent)*f)-(coord(end,axis)+coord(end,extent)*t));
 if(pos>1.01)throw Error('Misaligned '+axis+' axis '+source+' -> '+target+': '+pos);
}
checkAxis(c1,'WEB / NGINX','REST API','y');
checkAxis(c1,'REDIS STREAMS','REMINDER WORKER','y');
checkAxis(c1,'REMINDER WORKER','REDIS STREAMS','y');
checkAxis(c1,'REMINDER WORKER','LongevityWorkerDb','x');
checkAxis(c1,'REST API','LongevityDietDb','x');
const xadd=c1.arrow('REST API','REDIS STREAMS').edge;
const xread=c1.arrow('REDIS STREAMS','REST API').edge;
if(xadd.a.value!=='XADD'||xread.a.value!=='XREAD'||+xadd.geom.x<=0||+xread.geom.x>=0||
   !xadd.content.includes('y="-32" as="offset"'))
 throw Error('API/Redis reverse event labels lost their independently separated positions');
const c2man=JSON.parse(fs.readFileSync(path.join(root,'scripts/c4-architecture-manifest.json'),'utf8'));
for(const info of c2man.controllers){
 const ctrl=c2.one(info.controller);
 const service=c2.edges.map(e=>({e,v:c2.vertices.find(v=>v.a.id===e.a.target)})).find(p=>p.e.a.source===ctrl.a.id&&(p.v?.a.value||'').includes(info.service));
 if(!service)throw Error('C2 missing controller service '+info.controller);
 const repo=c2.edges.map(e=>({e,v:c2.vertices.find(v=>v.a.id===e.a.target)})).find(p=>p.e.a.source===service.v.a.id&&(p.v?.a.value||'').includes(info.persistence));
 if(!repo)throw Error('C2 missing service repository '+info.controller);
 // Straight centerline; boxes are aligned to a 10-lane grid.
 for(const [a,b] of [[ctrl,service.v],[service.v,repo.v]]){
  if(Math.abs((+a.geom.y + +a.geom.height/2)-(+b.geom.y + +b.geom.height/2))>1)
   throw Error('C2 component lane deviates from horizontal center '+info.controller);
 }
}
console.log('ACTOR_LABEL_ROUTING_QA=PASS actors='+actors+
 ' offsetLabelsChecked='+
 [c0,c1,c2,erd].reduce((n,x)=>n+x.edges.filter(e=>(e.a.value||'').trim()).length,0)+
 ' orthogonalEdges='+[c0,c1,c2,erd].reduce((n,x)=>n+x.edges.length,0)+
 ' alignedC1Pipes=5 C2ServiceLanes='+c2man.controllers.length);
