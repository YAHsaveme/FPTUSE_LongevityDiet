// Independent geometry and source-code contract checks for the one-page
// end-to-end Draw.io sequence (not just structural C4 diagrams).
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const base=path.join(root,'docs','assignment','one-page','05-runtime-end-to-end');
const xml=fs.readFileSync(base+'.drawio','utf8');
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const errors=[],lines=[],textboxes=[],actors=[];
const cells=[...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)];
for(const c of cells){
 const a=attrs(c[1]),body=c[2]||'';
 if(a.vertex==='1'){
  const match=body.match(/<mxGeometry\b([^>]*?)\/>/);
  if(!match){errors.push('Missing geometry '+a.id);continue;}
  const g=attrs(match[1]),rect={x:+g.x,y:+g.y,w:+g.width,h:+g.height,id:a.id};
  if(a.style?.startsWith('text;'))textboxes.push({...rect,label:a.value||''});
  if(a.style?.includes('shape=umlActor'))actors.push(rect);
 } else if(a.edge==='1'){
  const p=[...body.matchAll(/<mxPoint\b([^>]*?)\/>/g)].map(m=>attrs(m[1]));
  const a1=p.find(x=>x.as==='sourcePoint'),a2=p.find(x=>x.as==='targetPoint');
  if(!a1||!a2){errors.push('Unanchored native sequence edge '+a.id);continue;}
  lines.push({from:{x:+a1.x,y:+a1.y},to:{x:+a2.x,y:+a2.y},style:a.style||'',id:a.id});
 }
}
const messages=lines.filter(l=>l.from.y===l.to.y&&l.style.includes('endArrow=block'));
const lifelines=lines.filter(l=>l.from.x===l.to.x&&l.style.includes('dashed=1'));
if(actors.length!==2)errors.push('Expected 2 UML Member actors, got '+actors.length);
if(messages.length!==29)errors.push('Expected 10+19 complete request/response arrows, got '+messages.length);
if(lifelines.length!==13)errors.push('Expected 6+7 lifelines, got '+lifelines.length);
for(const l of messages){
 if(l.from.x===l.to.x)errors.push('Sequence message has zero horizontal length '+l.id);
 if(l.from.x<95||l.to.x>7705||l.from.y<650||l.from.y>4680)errors.push('Message outside diagram '+l.id);
 for(const t of textboxes){
  if(t.label && l.from.y>t.y+3 && l.from.y<t.y+t.h-3
    && Math.min(l.from.x,l.to.x)<t.x+t.w-12 && Math.max(l.from.x,l.to.x)>t.x+12){
   errors.push('Arrow '+l.id+' crosses annotation '+t.id+' '+t.label.slice(0,18));
  }
 }
}
const pdf=fs.readFileSync(base+'.pdf','latin1');
if((pdf.match(/\/Type\s*\/Page\b/g)||[]).length!==1)errors.push('Sequence export must have exactly one PDF page');
for(const m of xml.matchAll(/#([0-9a-fA-F]{6})\b/g)){
 const h=m[1].toUpperCase();
 if(h.slice(0,2)!==h.slice(2,4)||h.slice(2,4)!==h.slice(4,6))errors.push('Nonmonochrome style '+h);
}
function evidence(file,checks){
 const body=fs.readFileSync(path.join(root,file),'utf8');
 for(const c of checks)if(!body.includes(c))errors.push('Unproven documented flow: '+file+' lacks '+c);
}
evidence('src/LongevityDiet.API/Controllers/RecommendationController.cs',
 ['[Authorize]','GetWeeklySummaryAsync','RecommendAsync','ServiceUnavailable']);
evidence('src/LongevityDiet.Services/Reminders/ReminderService.cs',
 ['IdentityOutbox.Add','SaveChangesAsync']);
evidence('src/LongevityDiet.API/Reminders/IdentityRedisBridge.cs',
 ['ldc:identity-events','ldc:worker-events','PersistNotificationResultAsync']);
evidence('src/LongevityDiet.Services/Reminders/ReminderService.cs',
 ['PersistNotificationResultAsync','IdentityInbox.Add','Notifications.Add']);
evidence('src/LongevityDiet.Worker/Reminders/ReminderWorkerHostedService.cs',
 ['ldc:identity-events','ldc:worker-events']);
evidence('src/LongevityDiet.Worker/Reminders/ReminderWorkerEngine.cs',
 ['Outbox.Add','Schedules']);
evidence('src/LongevityDiet.Web/src/pages/tracking/ActivityTrackingPage.tsx',
 ['/recommendations/activity']);
if(errors.length){errors.forEach(e=>console.error('E2E_QA_FAIL '+e));process.exit(1);}
console.log('E2E_SEQUENCE_QA=PASS: 29 arrows (10 sync, 19 async), 13 lifelines, 2 actors, 0 label intersections, source checks, 1 vector PDF page');
