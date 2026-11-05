// Checks for text/connector collisions using explicitly anchored native Draw.io
// orthogonal segments. This supplements direct visual inspection in Draw.io Desktop.
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../docs/assignment/one-page');
const names=['01-c0-system-context','02-c1-container-architecture','03-c2-api-components','04-database-core','06-full-physical-database'];
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const failures=[];
function intercept(p,q,r){
 const pad=8;
 if(Math.abs(p.x-q.x)<.1)return p.x>r.x+pad&&p.x<r.x+r.w-pad&&
   Math.max(Math.min(p.y,q.y),r.y+pad)<Math.min(Math.max(p.y,q.y),r.y+r.h-pad);
 if(Math.abs(p.y-q.y)<.1)return p.y>r.y+pad&&p.y<r.y+r.h-pad&&
   Math.max(Math.min(p.x,q.x),r.x+pad)<Math.min(Math.max(p.x,q.x),r.x+r.w-pad);
 return false;
}
for(const name of names){
 const raw=fs.readFileSync(path.join(root,name+'.drawio'),'utf8');
 const nodes=[...raw.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)]
   .map(m=>({a:attrs(m[1]),body:m[2]||''}));
 const vertices=new Map(),notes=[],edges=[];
 for(const cell of nodes){
  if(cell.a.vertex==='1'){
   const match=cell.body.match(/<mxGeometry\b([^>]+)\/>/);
   if(!match){failures.push(name+': missing geometry '+cell.a.id);continue;}
   const g=attrs(match[1]);
   const v={id:cell.a.id,x:+g.x,y:+g.y,w:+g.width,h:+g.height,style:cell.a.style||''};
   vertices.set(v.id,v);
   if(v.style.startsWith('text;')&&(cell.a.value||''))notes.push(v);
  }else if(cell.a.edge==='1')edges.push(cell);
 }
 let segs=0;
 for(const edge of edges){
  const source=vertices.get(edge.a.source),target=vertices.get(edge.a.target);
  if(!source||!target){failures.push(name+': broken edge '+edge.a.id);continue;}
  const s=edge.a.style||'';
  const num=(k,fallback)=>+(s.match(new RegExp('(?:^|;)'+k+'=([.0-9]+)'))?.[1]||fallback);
  const pts=[{x:source.x+num('exitX',.5)*source.w,y:source.y+num('exitY',.5)*source.h}];
  for(const m of edge.body.matchAll(/<mxPoint\b([^>]*?)\/>/g)){
   const v=attrs(m[1]);if(v.x!==undefined&&v.y!==undefined)pts.push({x:+v.x,y:+v.y});
  }
  pts.push({x:target.x+num('entryX',.5)*target.w,y:target.y+num('entryY',.5)*target.h});
  for(let i=0;i+1<pts.length;i++){
   const a=pts[i],b=pts[i+1];
   if(Math.abs(a.x-b.x)>.1&&Math.abs(a.y-b.y)>.1)continue;
   segs++;
   for(const note of notes){
    if(intercept(a,b,note))failures.push(name+': edge '+edge.a.id+' intersects text '+note.id);
   }
   for(const v of vertices.values()){
    if(v.id===source.id||v.id===target.id||v.style.startsWith('text;')||
       v.style.includes('fillColor=none;')||v.style.includes('shape=umlActor'))continue;
    // Only report true crossings of unrelated entire modules/table exteriors.
    if(intercept(a,b,v))failures.push(name+': edge '+edge.a.id+' crosses module '+v.id);
   }
  }
 }
 if(name==='01-c0-system-context'||name==='02-c1-container-architecture'){
  const actors=[...vertices.values()].filter(v=>v.style.includes('shape=umlActor'));
  if(actors.length!==2)failures.push(name+': expected Member + Administrator UML actors, found '+actors.length);
 }
 const pdf=fs.readFileSync(path.join(root,name+'.pdf'),'latin1');
 if((pdf.match(/\/Type\s*\/Page\b/g)||[]).length!==1)failures.push(name+': PDF not exactly one page');
 console.log('ROUTING_QA '+name+' | '+edges.length+' connectors | '+segs+' explicit orthogonal spans | '+notes.length+' text labels');
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
else console.log('DRAWIO_ROUTING_QA=PASS (explicit connector spans, text clearance, native UML actors, single page)');
