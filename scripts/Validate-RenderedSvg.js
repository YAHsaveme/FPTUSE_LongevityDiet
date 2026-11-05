// Actual Draw.io SVG geometry audit. No OCR and no approximated waypoints.
'use strict';
const fs=require('fs'),path=require('path');
const dir=path.resolve(process.argv[2]||path.resolve(__dirname,'../docs/assignment/one-page'));
const names=['01-c0-system-context','02-c1-container-architecture','03-c2-api-components','04-database-core','06-full-physical-database'];
const attr=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
function part(a,b,x,eps=8){return x>Math.min(a,b)+eps&&x<Math.max(a,b)-eps;}
const globalIssues=[];
for(const name of names){
 const native=fs.readFileSync(path.resolve(__dirname,'../docs/assignment/one-page',name+'.drawio'),'utf8');
 const svg=fs.readFileSync(path.join(dir,name+'.svg'),'utf8');
 const vertices=new Map(),edges=new Map(),labels=[];
 for(const m of native.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)){
  const a=attr(m[1]),body=m[2]||'';
  if(a.vertex==='1'){
   const g=body.match(/<mxGeometry\b([^>]*?)\/>/);
   if(!g)continue;
   const v=attr(g[1]);const r={id:a.id,x:+v.x,y:+v.y,w:+v.width,h:+v.height,style:a.style||'',value:a.value||''};
   vertices.set(r.id,r);
   if(r.style.startsWith('text;')&&r.value)labels.push(r);
  }else if(a.edge==='1')edges.set(a.id,{a,body});
 }
 const raw=[];
 for(const m of svg.matchAll(/<g data-cell-id="([^"]+)"><g(?: transform="translate\(0\.5,0\.5\)")?><path d="([^"]+)" fill="none"/g)){
  if(!edges.has(m[1]))continue;
  const points=[...m[2].matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s*(-?\d+(?:\.\d+)?)/g)].map(x=>({x:+x[1],y:+x[2]}));
  if(points.length>=2)raw.push({id:m[1],points});
 }
 if(raw.length!==edges.size)globalIssues.push(name+' svg edge count '+raw.length+' != native '+edges.size);
 const edge1=edges.get(raw[0]?.id),start=vertices.get(edge1?.a.source);
 const st=edge1?.a.style||'';
 const xc=+(st.match(/exitX=([\d.]+)/)||[])[1],yc=+(st.match(/exitY=([\d.]+)/)||[])[1];
 const offset={x:Math.round(start.x+start.w*xc-raw[0].points[0].x),y:Math.round(start.y+start.h*yc-raw[0].points[0].y)};
 const lines=[];
 for(const edge of raw){
  const pts=edge.points.map(p=>({x:p.x+offset.x,y:p.y+offset.y}));
  for(let i=0;i<pts.length-1;i++){
   const a=pts[i],b=pts[i+1],dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);
   if(dx<1&&dy<1)continue;
   if(dx>2&&dy>2)globalIssues.push(name+': non-orthogonal segment '+edge.id+' '+dx.toFixed(1)+','+dy.toFixed(1));
   lines.push({id:edge.id,a,b,h:dy<2,v:dx<2});
  }
 }
 const issues=[];
 for(const L of lines){
  for(const t of labels){
   if(L.h){
    if(L.a.y>=t.y+7&&L.a.y<=t.y+t.h-7&&Math.max(L.a.x,L.b.x)>t.x+8&&Math.min(L.a.x,L.b.x)<t.x+t.w-8)
      issues.push('edge '+L.id+' cuts label '+t.id+' '+t.value.slice(0,26));
   }else if(L.v){
    if(L.a.x>=t.x+8&&L.a.x<=t.x+t.w-8&&Math.max(L.a.y,L.b.y)>t.y+7&&Math.min(L.a.y,L.b.y)<t.y+t.h-7)
      issues.push('edge '+L.id+' cuts label '+t.id+' '+t.value.slice(0,26));
   }
  }
 }
 const edgeCross=[];
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
  const a=lines[i],b=lines[j];if(a.id===b.id)continue;
  if(a.h&&b.v&&part(a.a.x,a.b.x,b.a.x,11)&&part(b.a.y,b.b.y,a.a.y,11))edgeCross.push(a.id+' x '+b.id);
  else if(a.v&&b.h&&part(a.a.y,a.b.y,b.a.y,11)&&part(b.a.x,b.b.x,a.a.x,11))edgeCross.push(a.id+' x '+b.id);
  else if(a.h&&b.h&&Math.abs(a.a.y-b.a.y)<2&&Math.min(Math.max(a.a.x,a.b.x),Math.max(b.a.x,b.b.x))-Math.max(Math.min(a.a.x,a.b.x),Math.min(b.a.x,b.b.x))>20)
    edgeCross.push(a.id+' overlaps '+b.id);
  else if(a.v&&b.v&&Math.abs(a.a.x-b.a.x)<2&&Math.min(Math.max(a.a.y,a.b.y),Math.max(b.a.y,b.b.y))-Math.max(Math.min(a.a.y,a.b.y),Math.min(b.a.y,b.b.y))>20)
    edgeCross.push(a.id+' overlaps '+b.id);
 }
 console.log(name+': SVG edges '+raw.length+' SVG segments '+lines.length+' translation='+offset.x+','+offset.y+' textCuts='+issues.length+' edgeCross='+edgeCross.length);
 issues.slice(0,40).forEach(s=>console.log('  LABEL_COLLISION '+s));
 edgeCross.slice(0,40).forEach(s=>console.log('  CONNECTOR_CROSS '+s));
 if(issues.length||edgeCross.length)globalIssues.push(name+': '+issues.length+' label collisions and '+edgeCross.length+' crossings');
}
if(globalIssues.length){console.log(globalIssues.join('\n'));process.exitCode=1}else console.log('RENDERED_DRAWIO_SVG_QA=PASS');
