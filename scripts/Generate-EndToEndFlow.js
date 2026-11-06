// One-page editable Draw.io sequence view to complement—not replace—C0/C1/C2.
// A: synchronous HTTP → tracking DB → gRPC → HTTP response.
// B: asynchronous preference/outbox → Redis → Worker → inbox → HTTP response.
'use strict';
const fs=require('fs'),path=require('path');
const outfile=path.resolve(__dirname,'../docs/assignment/one-page/05-runtime-end-to-end.drawio');
const cells=[],edges=[];let seq=2;
const id=()=>('s'+(++seq));
const E=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function box(x,y,w,h,title,options={}){
 const style='rounded=0;html=1;whiteSpace=wrap;fillColor=#FFFFFF;strokeColor=#333333;strokeWidth=3;align=center;verticalAlign=middle;fontFamily=Arial;fontSize='+(options.font||31)+';fontStyle=1;spacing=10;';
 cells.push('<mxCell id="'+id()+'" value="'+E(title)+'" style="'+E(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
}
function txt(x,y,w,h,label,options={}){
 const style='text;html=1;whiteSpace=wrap;fillColor=none;strokeColor=none;align='+(options.align||'left')+';verticalAlign=middle;fontFamily=Arial;fontColor=#333333;fontSize='+(options.font||27)+';fontStyle='+(options.bold?1:0)+';';
 cells.push('<mxCell id="'+id()+'" value="'+E(label)+'" style="'+E(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
}
function actor(x,y,name){
 const style='shape=umlActor;html=1;whiteSpace=wrap;strokeColor=#333333;strokeWidth=4;fillColor=#FFFFFF;';
 cells.push('<mxCell id="'+id()+'" value="" style="'+E(style)+'" vertex="1" parent="1"><mxGeometry x="'+(x-80)+'" y="'+y+'" width="160" height="148" as="geometry"/></mxCell>');
 txt(x-200,y+147,400,64,name,{font:32,bold:true,align:'center'});
}
function line(a,b,c,d,options={}){
 const style='edgeStyle=none;rounded=0;html=1;strokeColor='+(options.color||'#444444')+';strokeWidth='+(options.width||3)+';startArrow=none;endArrow='+(options.arrow||'none')+';endFill=1;'+(options.dash?'dashed=1;dashPattern=8 7;':'');
 edges.push('<mxCell id="'+id()+'" value="" style="'+E(style)+'" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="'+a+'" y="'+b+'" as="sourcePoint"/><mxPoint x="'+c+'" y="'+d+'" as="targetPoint"/></mxGeometry></mxCell>');
}
function boundary(x,y,w,h,title){
 const style='rounded=0;html=1;whiteSpace=wrap;fillColor=none;strokeColor=#999999;strokeWidth=3;dashed=1;dashPattern=10 7;fontFamily=Arial;fontSize=33;fontStyle=1;align=left;verticalAlign=top;spacing=15;';
 cells.unshift('<mxCell id="'+id()+'" value="'+E(title)+'" style="'+E(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
}
function lifelines(parts,headY,firstY,lastY){
 parts.forEach(p=>{
  if(p.actor)actor(p.x,headY,p.name);
  else box(p.x-360,headY,720,165,p.name,{font:30});
  line(p.x,firstY,p.x,lastY,{width:2,color:'#999999',dash:true});
 });
}
function msg(parts,from,to,y,label,async){
 const x1=parts[from].x,x2=parts[to].x;
 line(x1,y,x2,y,{width:3,arrow:'block',dash:async});
 txt(Math.min(x1,x2)+20,y-59,Math.abs(x2-x1)-40,52,label,{font:26,align:'center'});
}
txt(170,50,7460,105,'LongevityDiet — END-TO-END RUNTIME FLOWS',{font:57,bold:true});
txt(170,167,7440,77,'C4 explains structure. This separate sequence sheet shows the complete request, return and event paths.',{font:28});
boundary(95,315,7610,1800,'A. Synchronous activity recommendation — JWT / Tracking / gRPC');
const A=[
 {x:470,name:'Member',actor:true},{x:1650,name:'Web UI'},
 {x:2840,name:'REST API'},{x:4080,name:'TrackingService'},
 {x:5360,name:'Tracking DB'},{x:6860,name:'Recommendation gRPC'}
];
lifelines(A,475,688,1925);
const sync=[
 [0,1,'01  Request activity advice'],
 [1,2,'02  GET /recommendations/activity  (JWT)'],
 [2,3,'03  GetWeeklySummaryAsync(member UserId)'],
 [3,4,'04  Query own activity logs and goals'],
 [4,3,'05  Return persisted rows'],
 [3,2,'06  Return member-scoped weekly aggregate'],
 [2,5,'07  ActivityCoach.Recommend  (HTTP/2, 3s deadline)'],
 [5,2,'08  Return guidance + remaining goals'],
 [2,1,'09  JSON 200; error 503 when gRPC is down'],
 [1,0,'10  Display advice (or explicit error)']
];
sync.forEach((m,i)=>msg(A,m[0],m[1],716+119*i,m[2],false));
txt(235,1962,7350,80,'Outcome: The same authenticated member receives the result. gRPC failure is visible, never replaced with invented advice.',{font:27,bold:true});
boundary(95,2240,7610,2580,'B. Asynchronous reminders — IdentityOutbox / Redis / Worker / IdentityInbox');
const B=[
 {x:450,name:'Member',actor:true},{x:1500,name:'Web UI'},
 {x:2520,name:'REST API + IdentityBridge'},{x:3640,name:'Identity SQL'},
 {x:4720,name:'Redis Streams'},{x:5820,name:'Background Worker'},
 {x:6960,name:'Worker SQL'}
];
lifelines(B,2365,2580,4580);
const asyncFlow=[
 [0,1,'01  Set reminders',false],
 [1,2,'02  PUT /reminders/preferences  (JWT)',false],
 [2,3,'03  Commit preferences + IdentityOutbox',false],
 [3,2,'04  Confirm atomic SQL transaction',false],
 [2,1,'05  HTTP 200: saved reminder preferences',false],
 [1,0,'06  Display save confirmation (not delivery yet)',false],
 [2,4,'07  Bridge publishes identity-events',true],
 [4,5,'08  Worker consumes identity-events',true],
 [5,6,'09  Persist reminder schedules',false],
 [5,6,'10  Periodically query due schedules',false],
 [6,5,'11  Return due reminders',false],
 [5,6,'12  Commit notification to WorkerOutbox',false],
 [5,4,'13  Publish worker-events from outbox',true],
 [4,2,'14  Bridge consumes worker-events',true],
 [2,3,'15  Write IdentityInbox + UserNotification',false],
 [0,1,'16  Open notifications page (later)',false],
 [1,2,'17  GET /notifications  (JWT)',false],
 [2,1,'18  Return member-scoped notification list',false],
 [1,0,'19  Display notification inbox',false]
];
asyncFlow.forEach((m,i)=>msg(B,m[0],m[1],2680+99*i,m[2],m[3]));
txt(150,4880,7500,66,'Solid arrow: HTTP/SQL/gRPC request or return. Dashed arrow: Redis Streams event. Web fetches notifications; no WebSocket push.',{font:27,bold:true});
txt(150,4970,7500,78,'Evidence: real gRPC HTTP/2 integration tests, Redis smoke tests with SQLite. Full Docker Compose + SQL Server E2E not yet verified.',{font:25});
const W=7800,H=5200;
const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram id="runtime-flows" name="End-to-End Runtime Sequences"><mxGraphModel dx="1400" dy="880" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="0" page="1" pageScale="1" pageWidth="'+W+'" pageHeight="'+H+'" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+edges.join('')+cells.join('')+'</root></mxGraphModel></diagram></mxfile>';
fs.writeFileSync(outfile,xml,'utf8');
console.log('NATIVE_SEQUENCE='+path.basename(outfile)+' elements='+cells.length+' arrows='+edges.length+' sync_steps='+sync.length+' async_steps='+asyncFlow.length);
