// Structural and readability checks for the four course-sized one-page diagrams.
const fs=require('fs'),path=require('path');
const dir=path.resolve(__dirname,'../docs/assignment/one-page');
const names=['01-c0-system-context','02-c1-container-architecture','03-c2-api-components','04-database-core','06-full-physical-database'];
let fail=[];
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
function overlap(a,b,epsilon=4){return Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>epsilon&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>epsilon;}
function contains(a,b){return a.x<=b.x&&a.y<=b.y&&a.x+a.w>=b.x+b.w&&a.y+a.h>=b.y+b.h;}
for(const name of names){
 const f=path.join(dir,name+'.drawio');
 const xml=fs.readFileSync(f,'utf8');
 if((xml.match(/<diagram\b/g)||[]).length!==1)fail.push(name+': must have exactly 1 page');
 const cells=[...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)].map(m=>({a:attrs(m[1]),body:m[2]||''}));
 const vert=[],ed=[],ids=new Set(cells.map(c=>c.a.id).filter(Boolean));
 const page=attrs(xml.match(/<mxGraphModel\b([^>]*)>/)[1]);const W=+page.pageWidth,H=+page.pageHeight;
 for(const c of cells){
  if(c.a.vertex==='1'){
   const g=c.body.match(/<mxGeometry\b([^>]*)\/>/);
   if(!g){fail.push(name+' missing geometry '+c.a.id);continue;}
   const a=attrs(g[1]),r={id:c.a.id,x:+a.x,y:+a.y,w:+a.width,h:+a.height,label:c.a.value||''};
   if(r.x<0||r.y<0||r.x+r.w>W||r.y+r.h>H)fail.push(name+' out of page: '+r.id);
   vert.push(r);
   const size=+(c.a.style?.match(/fontSize=(\d+)/)?.[1]||0);
   if(size&&size<22)fail.push(name+' font <22: '+r.id);
  } else if(c.a.edge==='1'){
   ed.push(c);
   if(!ids.has(c.a.source)||!ids.has(c.a.target))fail.push(name+' broken arrow '+c.a.id);
  }
 }
 for(let i=0;i<vert.length;i++)for(let j=i+1;j<vert.length;j++){
  const a=vert[i],b=vert[j];
  if(overlap(a,b)&&!contains(a,b)&&!contains(b,a))fail.push(name+' shapes overlap: '+a.id+' '+b.id);
 }
 if(/#[0-9a-fA-F]{6}\b/.test(xml)){
  for(const m of xml.matchAll(/#([0-9A-Fa-f]{6})\b/g)){
    const x=m[1].toLowerCase();if(x.slice(0,2)!==x.slice(2,4)||x.slice(2,4)!==x.slice(4,6))fail.push(name+' is not black/grey');
  }
 }
 const pdf=fs.readFileSync(path.join(dir,name+'.pdf'),'latin1');
 if((pdf.match(/\/Type\s*\/Page\b/g)||[]).length!==1)fail.push(name+' PDF not 1 page');
 console.log('PASS FILE',name,'objects',vert.length,'relations',ed.length,'pages',1);
}
const s=fs.readFileSync(path.join(dir,'04-database-core.dbml'),'utf8');
const tables=[...s.matchAll(/^Table\s+(\w+)\.(\w+)\s*\{/gm)];
const refs=[...s.matchAll(/^Ref:\s+(\w+)\.(\w+)\.(\w+)\s+[-<>]\s+(\w+)\.(\w+)\.(\w+)/gm)];
if(tables.length!==10||refs.length!==5)fail.push('Core DBML should be 10 tables / 5 local FKs');
for(const r of refs)if(r[1]!==r[4])fail.push('Cross-DB foreign key (disallowed)');
const svg=fs.readFileSync(path.join(dir,'04-database-core.svg'),'utf8');
const pdf=fs.readFileSync(path.join(dir,'04-database-core.pdf'),'latin1');
if((pdf.match(/\/Type\s*\/Page\b/g)||[]).length!==1)fail.push('ERD PDF not 1 page');
const rects=[];
for(const m of svg.matchAll(/<rect\b([^>]*?)\/>/g)){
 const a=attrs(m[1]);const w=+a.width,h=+a.height;
 if(w>=600&&w<=960&&h>=220&&h<=600)rects.push({x:+a.x,y:+a.y,w,h});
}
for(let i=0;i<rects.length;i++)for(let j=i+1;j<rects.length;j++)if(overlap(rects[i],rects[j],12))fail.push('ERD table collision');
if(rects.length!==10)fail.push('Expected 10 actual ERD table rectangles, got '+rects.length);
console.log('PASS ERD',tables.length,'tables',refs.length,'local relations',rects.length,'non-overlapping table boxes');
if(fail.length){console.error(fail.join('\n'));process.exit(1)}
console.log('COURSE_DIAGRAM_QA=PASS');
