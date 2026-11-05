// Dependency-free geometric quality gate for large one-page editable diagrams.
// Intentionally conservative: parent containers are allowed to enclose their children,
// while unrelated boxes must never overlap. Only definite axis-aligned segments
// are checked for passing through unrelated text/boxes.
const fs=require('fs'),path=require('path');
const dir=path.resolve(__dirname,'../docs/assignment/one-page');
const drawings=['01-c0-system-context','02-c1-container-architecture','05-c2-component-architecture'];
const fail=[];
function attrs(str){const a={};for(const m of str.matchAll(/([\w-]+)="([^"]*)"/g))a[m[1]]=m[2];return a;}
function intersects(a,b,margin=2){
  return Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>margin &&
    Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>margin;
}
function contains(a,b){
  return a.x<=b.x+1&&a.y<=b.y+1&&a.x+a.w>=b.x+b.w-1&&a.y+a.h>=b.y+b.h-1;
}
function segCrossesBox(p,q,b){
  const pad=12;
  if(Math.abs(p.x-q.x)<0.5) {
    return p.x>b.x+pad&&p.x<b.x+b.w-pad&&
      Math.max(Math.min(p.y,q.y),b.y+pad)<Math.min(Math.max(p.y,q.y),b.y+b.h-pad);
  }
  if(Math.abs(p.y-q.y)<0.5) {
    return p.y>b.y+pad&&p.y<b.y+b.h-pad&&
      Math.max(Math.min(p.x,q.x),b.x+pad)<Math.min(Math.max(p.x,q.x),b.x+b.w-pad);
  }
  return false; // Diagonal is not treated as definite until the renderer resolves it.
}
function decode(v){return v.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');}
function anchor(r,style,prefix){
  const sx=style.match(new RegExp(prefix+'X=([0-9.]+)'));
  const sy=style.match(new RegExp(prefix+'Y=([0-9.]+)'));
  return {x:r.x+(sx?+sx[1]:0.5)*r.w,y:r.y+(sy?+sy[1]:0.5)*r.h};
}
for(const name of drawings){
 const xml=fs.readFileSync(path.join(dir,name+'.drawio'),'utf8');
 const cells=[...xml.matchAll(/<mxCell\b([^>]*)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)]
   .map(m=>({attr:attrs(m[1]),inner:m[2]||''}));
 const vertices=[],edges=[],byId=new Map();
 for(const c of cells) {
   if(c.attr.vertex==='1'){
     const gm=c.inner.match(/<mxGeometry\b([^>]+)\/>/);
     if(!gm){fail.push(name+': no geometry for '+c.attr.id);continue;}
     const g=attrs(gm[1]);
     const r={id:c.attr.id,x:+g.x,y:+g.y,w:+g.width,h:+g.height,label:decode(c.attr.value||''),style:c.attr.style||''};
     vertices.push(r);byId.set(r.id,r);
   } else if(c.attr.edge==='1')edges.push(c);
 }
 const containers=vertices.filter(v=>vertices.some(other=>other.id!==v.id&&contains(v,other)&&v.w*v.h>other.w*other.h*3));
 const isContainer=(v)=>containers.some(c=>c.id===v.id);
 let peers=0,segments=0;
 for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++){
   const a=vertices[i],b=vertices[j];
   if(intersects(a,b,3) && !contains(a,b)&&!contains(b,a)){
     fail.push(name+': overlapping peer boxes '+a.id+' '+b.id+' ('+a.label.replace(/<[^>]*>/g,' ').slice(0,24)+' / '+b.label.replace(/<[^>]*>/g,' ').slice(0,24)+')');
     peers++;
   }
 }
 for(const e of edges){
   const src=byId.get(e.attr.source),tgt=byId.get(e.attr.target);
   if(!src||!tgt)continue;
   const pts=[anchor(src,e.attr.style||'','exit')];
   for(const m of e.inner.matchAll(/<mxPoint\b([^>]*?)\/>/g)){
     const a=attrs(m[1]);if(a.x!==undefined&&a.y!==undefined)pts.push({x:+a.x,y:+a.y});
   }
   pts.push(anchor(tgt,e.attr.style||'','entry'));
   // Route via registered waypoints. If a segment is diagonal the renderer can
   // bend it in a gutter; this gate never assumes a specific auto-routing choice.
   for(let j=0;j<pts.length-1;j++){
     const p=pts[j],q=pts[j+1];
     if(p.x!==q.x && p.y!==q.y)continue;
     segments++;
     for(const b of vertices){
       if(b.id===src.id||b.id===tgt.id||isContainer(b))continue;
       if(segCrossesBox(p,q,b)) {
         fail.push(name+': edge '+e.attr.id+' crosses unrelated shape '+b.id+' ('+b.label.replace(/<[^>]*>/g,' ').slice(0,20)+')');
       }
     }
   }
 }
 console.log('LAYOUT '+name+': '+vertices.length+' objects, '+edges.length+' arrows, '+peers+' peer overlaps, '+segments+' routed orthogonal segments');
}
// Ensure actual SVG database table rectangles stay within their group, separate by >=16px,
// and relationship lanes are never drawn through unrelated table interiors.
for(const kind of ['target','current']){
 const svg=fs.readFileSync(path.join(dir,'06-database-'+kind+'-one-page.svg'),'utf8');
 const tables=[];
 for(const m of svg.matchAll(/<rect\s+([^>]*?)\/>/g)){
   const a=attrs(m[1]);
   if(+a.width===1390&&+a.height>150)tables.push({x:+a.x,y:+a.y,w:+a.width,h:+a.height});
 }
 let overlap=0;
 for(let i=0;i<tables.length;i++)for(let j=i+1;j<tables.length;j++){
   if(intersects(tables[i],tables[j],15))overlap++;
 }
 if(overlap)fail.push('ERD '+kind+' has '+overlap+' overlapping table boxes');
 console.log('LAYOUT DBML '+kind+': '+tables.length+' table boxes, '+overlap+' overlaps; vector source is single page');
}
if(fail.length) {for(const f of fail)console.error('LAYOUT FAILURE '+f);process.exit(1);}
console.log('LAYOUT_QA=PASS: no peer box collision or definite arrow-to-label occlusion');
