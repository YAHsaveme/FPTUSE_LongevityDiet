'use strict';
/**
 * Editorial C4 + extended-C2 + ERD drawing system (current implemented schema).
 * One graphical language, four editable one-page Draw.io documents.
 * Strict black/white; source-backed entities, never fabricated DB FKs.
 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/assignment/one-page');
const c4=require('./c4-architecture-manifest.json');
const c2m=require('./c2-extended-manifest.json');
const schema=require('./current-physical-schema.json');
const relations=require('./unified-erd-manifest.json');
const layout=require('./unified-erd-layout.json');
const tableMap=new Map(),tableCode={identity:'I',tracking:'T',worker:'W'};
for(const [db,g] of Object.entries(schema.groups)){
 const code=fs.readFileSync(path.join(root,g.context),'utf8');
 const physical=[...code.matchAll(/\.ToTable\("([^"]+)"\)/g)].map(m=>m[1]);
 const declared=Object.keys(g.columns);
 if(physical.length!==declared.length||declared.some(t=>!physical.includes(t)))throw Error('Physical EF model changed '+db);
 const fk=(code.match(/\.HasForeignKey(?:<[^>]+>)?\s*\(/g)||[]).length;
 if(fk!==schema.refs.filter(r=>r[0]===db).length)throw Error('Foreign key mapping changed '+db);
 for(const [name,fields] of Object.entries(g.columns))tableMap.set(name,{db,fields,code:tableCode[db]});
}
if(tableMap.size!==32||schema.refs.length!==9||relations.relationships.length!==31||
 c4.controllers.length!==10||c2m.tableAccessLinks.length!==10||
 layout.edges.length!==31||Object.keys(layout.nodes).length!==32)
 throw Error('Verified source inventory changed');
for(const c of c4.controllers){
 if(!fs.existsSync(path.join(root,'src/LongevityDiet.API/Controllers',c.controller+'.cs')))throw Error('Controller missing: '+c.controller);
}
const docker=fs.readFileSync(path.join(root,'docker-compose.yml'),'utf8');
for(const p of c4.ports){const [host,port]=p.split(':');if(!docker.includes(host+'}:'+port))throw Error('Docker port drift '+p);}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const BG='#FFFFFF',INK='#000000';
const modelRows=new Map(relations.relationships.map(r=>[r.from+'|'+r.to,r]));
function clamp(x){return Math.max(0,Math.min(1,x));}
function legibleFont(label,w,h,max=44,min=25,lines=3){
 const segments=label.split('\n').filter(Boolean);
 const m=Math.max(...segments.map(s=>s.length),1);
 return Math.min(max,Math.max(min,Math.floor(Math.min((w-30)/(m*.67),(h-22)/(Math.max(segments.length,lines)*1.24)))));
}
class Board{
 constructor(name,w,h){this.name=name;this.w=w;this.h=h;this.nodes=[];this.edges=[];this.ref=new Map();this.seq=2;this.rels=[];}
 put(key,x,y,w,h,value,type='card',size=24,opt={}){
  const id='n'+this.seq++;
  if(key&&this.ref.has(key))throw Error(this.name+' duplicate node '+key);
  const style=(type==='title'?'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontStyle=1;':
               type==='text'?'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;':
               type==='db'?'shape=cylinder3;html=1;whiteSpace=wrap;boundedLbl=1;size=17;strokeColor=#000000;strokeWidth=2;fillColor=#FFFFFF;align=center;verticalAlign=middle;spacing=8;':
               type==='bar'?'rounded=0;html=1;whiteSpace=wrap;strokeColor=#000000;strokeWidth=0.5;fillColor=#000000;':
               type==='outline'?'rounded=0;html=1;whiteSpace=wrap;strokeColor=#000000;strokeWidth=1.6;fillColor=#FFFFFF;align=left;verticalAlign=middle;spacingLeft=12;':
               type==='table'?'rounded=1;arcSize=5;html=1;whiteSpace=wrap;strokeColor=#000000;strokeWidth=1.6;fillColor=#FFFFFF;align=left;verticalAlign=middle;spacingLeft=12;spacingRight=7;spacingTop=7;':
               'rounded=1;arcSize=5;html=1;whiteSpace=wrap;strokeColor=#000000;strokeWidth=1.9;fillColor=#FFFFFF;align=center;verticalAlign=middle;spacing=8;')+
              'fontFamily=Arial;fontColor=#000000;fontSize='+size+';'+(opt.extra||'');
  const val=opt.html?esc(value):esc(value).replace(/\n/g,'&lt;br/&gt;');
  this.nodes.push('<mxCell id="'+id+'" value="'+val+'" style="'+esc(style)+'" vertex="1" parent="1"><mxGeometry x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'" width="'+w.toFixed(2)+'" height="'+h.toFixed(2)+'" as="geometry"/></mxCell>');
  if(key)this.ref.set(key,{id,x,y,w,h,label:value});
  return id;
 }
 edge(from,to,label,type='call',fromPt=[1,.5],toPt=[0,.5],way=[],card='1:N'){
  const a=this.ref.get(from),b=this.ref.get(to);
  if(!a||!b)throw Error(this.name+' missing route '+from+' -> '+to);
  let style='edgeStyle=segmentEdgeStyle;rounded=0;orthogonal=1;html=1;strokeColor=#000000;strokeWidth='+(type==='sql'?3.1:2)+';';
  if(type==='sql')style+='startArrow=ERmandOne;endArrow='+(card==='1:1'?'ERmandOne':'ERmany')+';startFill=0;endFill=0;startSize=15;endSize=18;';
  else if(type==='logical')style+='dashed=1;dashPattern='+(this.name==='Database Diagram'?'17 11':'14 10')+';startArrow=none;endArrow=open;endFill=0;endSize=12;';
  else if(type==='event')style+='dashed=1;dashPattern=2 10;startArrow=none;endArrow=block;endFill=0;endSize=13;';
  else if(type==='access')style+='dashed=1;dashPattern=8 6;startArrow=none;endArrow=block;endFill=0;endSize=13;';
  else style+='startArrow=none;endArrow=block;endFill=1;endSize=12;';
  style+='fontFamily=Arial;fontColor=#000000;fontSize='+(this.name==='C1'?18:this.name==='C0'?19:17)+';labelBackgroundColor=#FFFFFF;align=center;verticalAlign=middle;spacing=3;';
  style+='exitX='+fromPt[0].toFixed(5)+';exitY='+fromPt[1].toFixed(5)+';exitPerimeter=0;entryX='+toPt[0].toFixed(5)+';entryY='+toPt[1].toFixed(5)+';entryPerimeter=0;';
  const points=way.length?'<Array as="points">'+way.map(p=>'<mxPoint x="'+p[0].toFixed(2)+'" y="'+p[1].toFixed(2)+'"/>').join('')+'</Array>':'';
  this.edges.push('<mxCell id="e'+this.seq+++'" value="'+esc(label)+'" style="'+esc(style)+'" edge="1" source="'+a.id+'" target="'+b.id+'" parent="1"><mxGeometry relative="1" as="geometry">'+points+'</mxGeometry></mxCell>');
  this.rels.push({from,to,label,type});
 }
 header(title,subtitle,tag){
  if(tag)this.put(null,66,31,130,68,tag,'title',44);
  this.put(null,tag?192:67,25,this.w-(tag?260:132),78,title,'title',this.name==='C2'?47:50);
  this.put(null,67,110,this.w-130,52,subtitle,'text',this.name==='C2'?29:24);
  this.put(null,66,173,this.w-132,2,'','bar',1);
 }
 save(){
  const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="'+esc(this.name)+'" id="editorial-'+esc(this.name)+'"><mxGraphModel page="1" grid="1" gridSize="10" pageWidth="'+this.w+'" pageHeight="'+this.h+'" pageScale="1" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+this.edges.join('')+this.nodes.join('')+'</root></mxGraphModel></diagram></mxfile>';
  if([...xml.matchAll(/#[0-9a-fA-F]{6}\b/g)].some(m=>m[0].toUpperCase()!=='#000000'&&m[0].toUpperCase()!=='#FFFFFF'))throw Error(this.name+' nonmonochrome source');
  fs.writeFileSync(path.join(out,this.name+'.drawio'),xml,'utf8');
  console.log('EDITORIAL_DRAWIO '+this.name+' nodes='+this.nodes.length+' native_edges='+this.edges.length+' page='+this.w+'x'+this.h);
 }
}
function c0(){
 const b=new Board('C0',1600,880);
 b.header('SYSTEM CONTEXT','WHO INTERACTS WITH LONGEVITYDIET  /  CURRENT IMPLEMENTED SCOPE','C0');
 b.put(null,88,237,560,31,'PEOPLE  /  SYSTEM USERS','text',20);
 b.put(null,892,237,560,31,'SOFTWARE SYSTEM','text',20);
 b.put('member',100,306,465,158,'PERSON  |  MEMBER\nMeal planning, logs and reminders','card',27);
 b.put('admin',100,558,465,150,'PERSON  |  ADMIN\nRole-authorized functions','card',27);
 b.put('system',880,367,610,257,'LONGEVITYDIET\nMeal planning  ·  Food logging\nActivity tracking  ·  FMD\nRecommendations  ·  Reminders','card',33);
 b.edge('member','system','Meal plans / tracking','call',[1,.49],[0,.28],[[706,383],[706,438]]);
 b.edge('admin','system','Role-authorized use','call',[1,.46],[0,.77],[[739,627],[739,565]]);
 b.put(null,90,792,1400,45,'C0 shows people and the system boundary; internal ports, containers and storage belong to C1/C2.','text',20);
 b.save();
}
function c1(){
 const b=new Board('C1',2500,1530);
 b.header('CONTAINER ARCHITECTURE','DEPLOYED SERVICES, COMMUNICATION PROTOCOLS AND PHYSICAL DATA STORES','C1');
 b.put(null,88,245,650,36,'CLIENT ACCESS','text',19);
 b.put(null,1555,245,750,36,'ASYNC & COMPUTATION','text',19);
 b.put('member',92,337,302,125,'MEMBER','card',30);
 b.put('admin',92,568,302,125,'ADMIN  /  role','card',28);
 b.put('web',525,465,345,190,'WEB / NGINX\nReact SPA\nHTTP :80\nHost :5173','card',27);
 b.put('api',1020,465,400,190,'REST API  (.NET)\nHTTP :8080\nAuth · Meals\nFMD · Activity','card',27);
 b.put('grpc',1570,299,425,160,'RECOMMENDATION gRPC\nHTTP/2 :8081\nSTATELESS  ·  NO OWN DB','card',26);
 b.put('redis',1570,555,425,170,'REDIS STREAMS\nTCP :6379\nPreference events\n+ result events','card',27);
 b.put('worker',2100,555,320,170,'REMINDER WORKER\nEvent consumer\nEvent producer\nNo HTTP listener','card',25);
 b.put(null,91,995,785,49,'PERSISTENCE  /  ONE SQL SERVER','title',27);
 b.put(null,92,1048,775,43,'TCP :1433  ·  Published host :14330','text',22);
 b.put('identity',1003,1083,415,172,'LongevityDietDb\n21 tables\nIdentity · Meals · FMD\nSQL :1433','db',25);
 b.put('tracking',1505,1083,417,172,'LongevityTrackingDb\n7 tables\nActivity · Adherence\nSQL :1433','db',24);
 b.put('workerdb',2050,1083,370,172,'LongevityWorkerDb\n4 tables\nSchedules · Outbox\nSQL :1433','db',24);
 b.edge('member','web','HTTP :5173','call',[1,.5],[0,.30],[[461,399],[461,522]]);
 b.edge('admin','web','Role access','call',[1,.5],[0,.78],[[480,630],[480,613]]);
 b.edge('web','api','/api :8080');
 b.edge('api','grpc','gRPC :8081','call',[1,.22],[0,.54],[[1480,507],[1480,385]]);
 b.edge('api','redis','XADD :6379','event',[1,.62],[0,.33],[[1460,583],[1460,611]]);
 b.edge('redis','api','XREAD :6379','event',[0,.77],[1,.87],[[1510,686],[1510,630]]);
 b.edge('redis','worker','XREAD','event',[1,.31],[0,.31],[]);
 b.edge('worker','redis','XADD','event',[0,.73],[1,.73],[]);
 b.edge('api','identity','SQL :1433','call',[.23,1],[.5,0],[[1112,925],[1211,925]]);
 b.edge('api','tracking','SQL :1433','call',[.84,1],[.5,0],[[1356,968],[1714,968]]);
 b.edge('worker','workerdb','SQL :1433','call',[.58,1],[.58,0],[]);
 b.put(null,92,1385,2320,2,'','bar',1);
 b.put(null,92,1410,920,42,'SOLID  /  HTTP · gRPC · SQL','text',21);
 b.put(null,1120,1410,1270,42,'DOTTED  /  Redis event streams    ·    Worker has no inbound HTTP port','text',21);
 b.save();
}
function dbRows(name){
 const v=tableMap.get(name);
 const extra={
  RecommendationFeedbacks:'PlannedMealId? (APP)',
  TrackingOutbox:'UserId (APP)',
  TrackingScoreSignals:'SourceEventId (APP)',
  AdherenceScores:'Version (APP)',
  ReminderDispatchRecords:'Category (APP)',
  IdentityOutbox:'UserId (APP)'
 };
 const fields=v.fields.map(x=>x.replace(/\s*\[logical[^\]]*\]/g,' (APP)').trim());
 if(extra[name]&&!fields.some(x=>x.startsWith(extra[name].split(' ')[0])))fields.push(extra[name]);
 return fields;
}
function allTableNodes(b,ox,oy,s,kind){
 const coords={};const src=layout.nodes;
 for(const [name,g] of Object.entries(src)){
  const ent=tableMap.get(name);
  if(!ent)throw Error('Unknown mapped table '+name);
  const x=ox+g.x*s,y=oy+g.y*s,w=g.w*s,h=g.h*s;
  let label,font;
  if(kind==='full'){
   const rows=dbRows(name).slice(0,4);
   label='<b>'+esc(name)+'</b> ['+ent.code+']'+rows.map(r=>'<br/>'+esc(r)).join('');
   const clean=name+' ['+ent.code+']\n'+rows.join('\n');
   const longest=Math.max(...clean.split('\n').map(line=>line.length));
   font=Math.max(26,Math.floor(Math.min(43,(w-44)/(longest*.76),(h-46)/((rows.length+1)*1.40))));
   b.put('table:'+name,x,y,w,h,label,'table',font,{html:true});
  }else{
   const fields=dbRows(name);
   const primary=fields.find(x=>x.startsWith('PK'))||fields[0];
   const secondary=fields.find(x=>x.startsWith('FK')||x.includes('APP'))||'';
   const tag=c2m.referenceTags[name];
   label=name+'  ['+ent.code+']\n'+primary+(secondary&&secondary!==primary?'\n'+secondary:'')+(tag?'\n  |  '+tag:'');
   font=Math.min(legibleFont(label,w,h,52,27,tag?4:3),Math.floor((h-38)/(label.split('\n').length*1.32)));
   b.put('table:'+name,x,y,w,h,label,'table',font);
  }
  coords[name]={x,y,w,h};
 }
 return coords;
}
function joinTableRelations(b,ox,oy,s){
 for(const r of layout.edges){
  const semantic=modelRows.get(r.source+'|'+r.target);
  if(!semantic)throw Error('Unverified table relation '+r.source+' -> '+r.target);
  const a=layout.nodes[r.source],t=layout.nodes[r.target],p=r.points[0],q=r.points.at(-1);
  const from=[clamp((p[0]-a.x)/a.w),clamp((p[1]-a.y)/a.h)];
  const to=[clamp((q[0]-t.x)/t.w),clamp((q[1]-t.y)/t.h)];
  const way=r.points.slice(1,-1).map(v=>[ox+v[0]*s,oy+v[1]*s]);
  const tag=semantic.kind==='sql'?'':semantic.kind==='event'?'EVENT: '+eventLabel(semantic):'APP: '+logicalLabel(semantic);
  b.edge('table:'+r.source,'table:'+r.target,tag,semantic.kind,from,to,way,semantic.cardinality);
 }
}
function logicalLabel(r){
 const text=r.reason||'';
 if(text.includes('PlannedMealId'))return 'PlannedMealId';
 if(text.includes('UserId')&&text.includes('LocalDate'))return 'UserId + date';
 if(text.includes('UserId')&&text.includes('Category'))return 'UserId + type';
 if(text.includes('UserId'))return 'UserId';
 if(text.includes('Version'))return 'Version';
 return 'business key';
}
function eventLabel(r){
 const text=r.reason||'';
 if(text.includes('EventId'))return 'EventId';
 if(/activity/i.test(text))return 'activity';
 if(/notification/i.test(text))return 'notification';
 return 'reminder';
}
function c2(){
 const b=new Board('C2',11400,5050);
 b.header('COMPONENTS & DATA MAP','EXTENDED C2  /  VERIFIED API PATHS + ALL 32 CURRENT SQL TABLES  /  SEPARATE RELATION TYPES','C2');
 b.put(null,94,259,4110,51,'APPLICATION  /  REST API :8080','title',33);
 b.put(null,4435,259,6570,51,'DATA MODEL  /  32 EF CORE TABLES','title',33);
 b.put(null,96,338,4100,43,'Controller  →  Service  →  Persistence  →  Table reference','text',26);
 b.put(null,4438,338,6450,43,'9 SQL FK    /    16 APP associations    /    6 EVENT flows','text',26);
 b.put('web',103,432,310,96,'WEB / NGINX\nHost :5173','card',25);
 b.put('router',103,596,310,3308,'API ROUTING\nHTTP :8080\nJWT + Role','card',29);
 b.edge('web','router','/api :8080','call',[.5,1],[.5,0]);
 const accessIndex=new Map(c2m.tableAccessLinks.map(([controller,table])=>[controller,table]));
 const ordered=c2m.tableAccessLinks.slice().sort((a,c)=>layout.nodes[a[1]].y-layout.nodes[c[1]].y||
  layout.nodes[a[1]].x-layout.nodes[c[1]].x);
 const refNodes=new Map();
 ordered.forEach(([controller,table],i)=>{
  const info=c4.controllers.find(x=>x.controller===controller);
  if(!info)throw Error('Missing controller '+controller);
  const y=567+334*i,H=224;
  const cName=info.domain+'\n'+controller;
  const svc=info.service;
  const pers=info.persistence;
  const ref='DATA REFERENCE '+c2m.referenceTags[table]+'\n'+table+'\nSQL :1433';
  b.put('ctrl:'+controller,470,y,832,H,cName,'card',legibleFont(cName,832,H,47,30,2));
  b.put('svc:'+controller,1402,y,850,H,svc,'card',legibleFont(svc,850,H,46,28,2));
  b.put('repo:'+controller,2350,y,858,H,pers,'card',legibleFont(pers,858,H,46,27,2));
  b.put('ref:'+controller,3305,y,858,H,ref,'card',legibleFont(ref,858,H,43,28,3));
  const yFraction=clamp((y+H/2-596)/3308);
  b.edge('router','ctrl:'+controller,'HTTP','call',[1,yFraction],[0,.5]);
  b.edge('ctrl:'+controller,'svc:'+controller,'Call');
  b.edge('svc:'+controller,'repo:'+controller,'Data');
  b.edge('repo:'+controller,'ref:'+controller,'Ref','access');
  refNodes.set(table,'ref:'+controller);
 });
 const dbX=4435,dbY=445,scale=.34;
 const coords=allTableNodes(b,dbX,dbY,scale,'brief');
 joinTableRelations(b,dbX,dbY,scale);
 const source=refNodes.get('Users');
 if(!source)throw Error('Missing Users reference for C2 native connection');
 const A=b.ref.get(source),T=b.ref.get('table:Users');
 b.edge(source,'table:Users','same table','access',[1,.51],[0,.50],[[4290,A.y+A.h*.51],[4290,T.y+T.h*.50]]);
 b.put(null,92,4322,4100,2,'','bar',1);
 b.put(null,94,4355,4020,335,'READING KEY\nA01–A10: match the code on a reference to the real table.\nSQL FK: solid Crow’s Foot.  APP: long dashed.  EVENT: dotted.\nTable references are NOT new tables or SQL foreign keys.','text',34);
 b.put(null,4435,4590,6500,123,'Current schema: Identity 21 / Tracking 7 / Worker 4. Exact column definitions remain in EF Core and Database Diagram.','text',30);
 b.save();
}
function erd(){
 const b=new Board('Database Diagram',6500,4540);
 b.header('DATABASE DIAGRAM','PHYSICAL + LOGICAL  /  32 CURRENT TABLES IN 3 SQL CATALOGS','');
 b.put(null,120,252,1990,98,'SOLID  CROW’S FOOT\n9 enforced SQL foreign keys','outline',26);
 b.put(null,2255,252,1950,98,'LONG DASH  ·  APP\n16 non-enforced associations','outline',26);
 b.put(null,4350,252,2010,98,'DOTTED  ·  EVENT\n6 asynchronous message links','outline',26);
 const sx=.31,ox=170,oy=465;
 allTableNodes(b,ox,oy,sx,'full');
 joinTableRelations(b,ox,oy,sx);
 b.put(null,118,4260,6250,2,'','bar',1);
 b.put(null,122,4290,6260,100,'I = LongevityDietDb (21)   /   T = LongevityTrackingDb (7)   /   W = LongevityWorkerDb (4)\nOnly solid Crow’s Foot lines are SQL-enforced.  APP and EVENT lines are documented, not foreign keys.','text',31);
 b.save();
}
c0();c1();c2();erd();
