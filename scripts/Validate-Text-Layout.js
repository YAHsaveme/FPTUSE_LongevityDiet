'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const parse=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const problems=[];
for(const name of ['C1','C2']){
 const xml=fs.readFileSync(path.join(root,'docs/assignment/one-page',name+'.drawio'),'utf8');
 const cells=[...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)];
 let checked=0,risk=0;
 for(const m of cells){
  const a=parse(m[1]);if(a.vertex!=='1'||!a.value)continue;
  const g=m[2].match(/<mxGeometry\b([^>]*?)\/>/);if(!g)continue;
  const geo=parse(g[1]),width=+geo.width,height=+geo.height;
  const font=+((a.style||'').match(/fontSize=(\d+)/)||[])[1]||40;
  const value=a.value.replace(/&lt;br\s*\/?&gt;/gi,'\n').replace(/&#(?:10|x0?a);/gi,'\n').replace(/\r/g,'');
  const lines=value.split('\n').map(s=>s.replace(/&[a-z]+;/g,'').trim()).filter(Boolean);
  if(!lines.length)continue;
  const isTitle=(a.style||'').startsWith('text;'),margin=isTitle?8:28;
  const capacity=Math.max(1,width-margin*2);
  let wrapped=0,maxRatio=0;
  for(const line of lines){
   const ratio=(line.length*font*.61)/capacity;
   maxRatio=Math.max(ratio,maxRatio);
   wrapped+=Math.max(1,Math.ceil(ratio));
  }
  const expectedHeight=wrapped*font*1.28+(isTitle?8:25);
  const hRatio=expectedHeight/height;
  checked++;
  if(maxRatio>1.03||hRatio>1.01){
   risk++;
   problems.push(name+': '+a.id+' widthRatio='+maxRatio.toFixed(2)+' heightRatio='+hRatio.toFixed(2)+' font='+font+' text='+value.slice(0,95).replace(/\n/g,' / '));
  }
 }
 console.log('TEXT_LAYOUT_QA '+name+' checked='+checked+' potentialOverflows='+risk);
}
if(problems.length){for(const issue of problems)console.error('TEXT_OVERFLOW_RISK '+issue);process.exitCode=1;}
else console.log('TEXT_LAYOUT_QA=PASS (bounding boxes and conservative Arial width/height estimates)');
