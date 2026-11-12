'use strict';
/** Geometric QA: enforce legible spacing, page margins and detached edge captions. */
const fs=require('node:fs');
const path=require('node:path');
const dir=path.resolve(__dirname,'../docs/assignment/one-page');
const names=['C0','C1','C2','Database Diagram','Business Flow'];
let issueCount=0;
const nodeRx=/<mxCell\b([^>]*\bvertex="1"[^>]*)><mxGeometry\b([^>]*?)\/><\/mxCell>/g;
const attr=(text,name)=>{const match=text.match(new RegExp('\\b'+name+'="([^"]*)"'));return match?.[1]};
const overlaps=(a,b)=>{
 const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
 const h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
 return {w,h,area:Math.max(0,w)*Math.max(0,h)};
};
for(const name of names){
 const xml=fs.readFileSync(path.join(dir,name+'.drawio'),'utf8');
 const w=Number(xml.match(/\bpageWidth="(\d+)"/)?.[1]);
 const h=Number(xml.match(/\bpageHeight="(\d+)"/)?.[1]);
 const all=[...xml.matchAll(nodeRx)].map(m=>{
  const style=attr(m[1],'style')||'',g=m[2];
  return {id:attr(m[1],'id'),x:Number(attr(g,'x')),y:Number(attr(g,'y')),
    w:Number(attr(g,'width')),h:Number(attr(g,'height')),style};
 });
 const bars=all.filter(n=>n.style.includes('fillColor=#000000'));
 const panels=all.filter(n=>n.id.startsWith('panel-'));
 const functional=all.filter(n=>!n.style.includes('strokeColor=none') &&
   !bars.includes(n)&&!panels.includes(n));
 const labels=all.filter(n=>n.id.startsWith('label-'));
 const issues=[];
 const anchorByName={
  'C0':'system','C1':'web','C2':'gateway',
  'Business Flow':'auth'
 };
 if(name==='Database Diagram'){
  const p1=panels.find(x=>x.id==='panel-identity');
  const p2=panels.find(x=>x.id==='panel-catalog');
  if(!p1||!p2||Math.abs((p1.x+p2.x+p2.w)/2-w/2)>15)
    issues.push('Overall ERD panels are not centered on page');
 }else{
  const anchor=all.find(x=>x.id===anchorByName[name]);
  if(!anchor||Math.abs(anchor.x+anchor.w/2-w/2)>15)
   issues.push('Main vertical architecture spine is off-center');
 }
 const ordering={
  C0:['member','system'],
  C1:['web','gateway','router','svc-identity','svc-worker','outbox','redis','consumer'],
  C2:['web','gateway','endpoint-id','endpoint-work','queue-dispatch','redis'],
  'Database Diagram':['panel-identity','panel-planning','panel-recommendation'],
  'Business Flow':['auth','profile','catalog','planning','tracking','score',
    'outbox','redis','worker','report','end']
 };
 const chain=ordering[name];
 for(let i=1;i<chain.length;i++){
  const a=all.find(x=>x.id===chain[i-1]);
  const b=all.find(x=>x.id===chain[i]);
  if(!a||!b||b.y<=a.y)
   issues.push('Top-down order broken: '+chain[i-1]+' -> '+chain[i]);
 }
 for(const n of [...functional,...labels]){
  if(n.x<35||n.y<20||n.x+n.w>w-35||n.y+n.h>h-35)
   issues.push('Out of safe page margins: '+n.id);
 }
 for(let i=0;i<functional.length;i++)for(let j=i+1;j<functional.length;j++){
  const a=functional[i],b=functional[j],gap=overlaps(a,b);
  if(gap.w>8&&gap.h>8)issues.push('Functional node overlap: '+a.id+' / '+b.id);
 }
 for(const l of labels){
  for(const n of functional){
   const o=overlaps(l,n);
   if(o.w>16&&o.h>10)issues.push('Caption touches node: '+l.id+' / '+n.id);
  }
 }
 for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
  const o=overlaps(labels[i],labels[j]);
  if(o.w>20&&o.h>14)issues.push('Caption-collision: '+labels[i].id+' / '+labels[j].id);
 }
 console.log('GEOMETRY '+name+' page='+w+'x'+h+
  ' nodes='+functional.length+' labels='+labels.length+' issues='+issues.length);
 issueCount+=issues.length;
 for(const message of issues.slice(0,38))console.log('  COLLISION '+message);
 if(issues.length>38)console.log('  ... +'+(issues.length-38)+' more');
}
console.log('DIAGRAM_GEOMETRY_AUDIT_ISSUES='+issueCount);
if(process.argv.includes('--strict')&&issueCount)process.exitCode=1;
