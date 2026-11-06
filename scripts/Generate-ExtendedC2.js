'use strict';
// C2 EXTENDED: actual REST controllers/services/repositories linked directly to
// 32 source-verified EF tables, 9 SQL FKs, 16 app links, 6 event lineages.
// A deliberate hybrid of C4 Component view and Code/ERD detail, not "pure C4 C2".
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/assignment/one-page');
const schema=JSON.parse(fs.readFileSync(path.join(root,'scripts/current-physical-schema.json'),'utf8'));
const erd=JSON.parse(fs.readFileSync(path.join(root,'scripts/unified-erd-manifest.json'),'utf8'));
const layout=JSON.parse(fs.readFileSync(path.join(root,'scripts/unified-erd-layout.json'),'utf8'));
const c4=JSON.parse(fs.readFileSync(path.join(root,'scripts/c4-architecture-manifest.json'),'utf8'));
const tables={};
for(const [db,g] of Object.entries(schema.groups)){
 const source=fs.readFileSync(path.join(root,g.context),'utf8');
 const actual=[...source.matchAll(/\.ToTable\("([^"]+)"\)/g)].map(m=>m[1]);
 if(actual.length!==Object.keys(g.columns).length||Object.keys(g.columns).some(t=>!actual.includes(t)))throw Error('EF mapping drift '+db);
 for(const [t,fields] of Object.entries(g.columns))tables[t]={db,fields};
}
if(Object.keys(tables).length!==32||erd.totalRelationships!==31||erd.actualSqlFKs!==9||c4.controllers.length!==10)throw Error('Source count changed');
const ext=[
 ['AuthController','Users','Identity user/profile'],
 ['ProfileController','UserProfiles','User profile'],
 ['ReminderNotificationsController','ReminderPreferences','Preference/notification'],
 ['MealPlansController','MealPlans','Saved meal plans'],
 ['MealLogsController','MealLogs','Meal logs'],
 ['EatingWindowController','EatingWindowSnapshots','Eating window'],
 ['RecommendationsController','UserFoodPreferences','Food preference selection'],
 ['FmdController','FmdSafetyAssessments','FMD safety assessment'],
 ['TrackingController','ActivityLogs','Activity log'],
 ['RecommendationController','ActivityGoals','Weekly activity goals']
];
const ordered=ext.slice().sort((a,b)=>layout.nodes[a[1]].y-layout.nodes[b[1]].y||layout.nodes[a[1]].x-layout.nodes[b[1]].x);
const ctrlLookup=new Map(ordered.map(([name],i)=>[name,{...c4.controllers.find(c=>c.controller===name),index:i}]));
for(const [name,table] of ext){
 const c=ctrlLookup.get(name);
 if(!c||!tables[table])throw Error('Missing controller/table '+name+' / '+table);
 if((c.owner==='tracking'?'tracking':'identity')!==tables[table].db)throw Error('Wrong DB ownership '+name+' -> '+table);
 const controllerText=fs.readFileSync(path.join(root,'src/LongevityDiet.API/Controllers',name+'.cs'),'utf8');
 if(!controllerText.includes('[ApiController]'))throw Error('Controller no longer API '+name);
}
const ESC=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const W=26600,H=10150,scale=.70,ox=11500,oy=670;
let seq=1;const vertices=[],edges=[],named=new Map(),relations=[];
function node(key,x,y,w,h,label,kind='box',font=55){
 if(key&&named.has(key))throw Error('Duplicate node '+key);
 const id='c2x'+(++seq);
 const css=(kind==='text'?'text;strokeColor=none;fillColor=none;':
  kind==='table'?'rounded=1;arcSize=7;strokeColor=#000000;strokeWidth=3;fillColor=#FFFFFF;':
  kind==='db'?'rounded=1;arcSize=7;strokeColor=#000000;strokeWidth=3;fillColor=#FFFFFF;':
  'rounded=1;arcSize=7;strokeColor=#000000;strokeWidth=4;fillColor=#FFFFFF;')+
  'html=1;whiteSpace=wrap;fontFamily=Arial;fontColor=#000000;fontSize='+font+';align='+(kind==='table'?'left':'center')+
  ';verticalAlign=middle;spacing=15;';
 const xml='<mxCell id="'+id+'" value="'+ESC(label).replace(/\n/g,'&lt;br/&gt;')+'" style="'+ESC(css)+'" vertex="1" parent="1"><mxGeometry x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'" width="'+w.toFixed(2)+'" height="'+h.toFixed(2)+'" as="geometry"/></mxCell>';
 vertices.push(xml);
 if(key)named.set(key,{id,x,y,w,h,label});
 return id;
}
function edge(a,b,opts={}){
 if(!named.has(a)||!named.has(b))throw Error('Missing edge endpoint '+a+' -> '+b);
 const from=opts.exit||[1,.5],to=opts.entry||[0,.5],type=opts.type||'component';
 const solid=type==='sql',event=type==='event',assoc=type==='logical',access=type==='access';
 const arrow=solid?'startArrow=ERmandOne;endArrow='+(opts.card==='1:1'?'ERmandOne':'ERmany')+';startFill=0;endFill=0;startSize=32;endSize=36;':
  'startArrow=none;endArrow='+(assoc?'open':'block')+';endFill=0;endSize=22;';
 const stroke=solid?7:event?5:access?5:4;
 const dash=event?'dashed=1;dashPattern=2 10;':assoc?'dashed=1;dashPattern=14 10;':access?'dashed=1;dashPattern=8 6;':'';
 const css='edgeStyle=segmentEdgeStyle;rounded=0;orthogonal=1;html=1;strokeColor=#000000;strokeWidth='+stroke+';'+dash+arrow+
  'fontFamily=Arial;fontColor=#000000;fontSize=30;labelBackgroundColor=#FFFFFF;align=center;verticalAlign=middle;spacing=4;'+
  'exitX='+from[0].toFixed(4)+';exitY='+from[1].toFixed(4)+';exitPerimeter=0;entryX='+to[0].toFixed(4)+';entryY='+to[1].toFixed(4)+';entryPerimeter=0;';
 const points=opts.via||[];
 const way=points.length?'<Array as="points">'+points.map(([x,y])=>'<mxPoint x="'+x.toFixed(2)+'" y="'+y.toFixed(2)+'"/>').join('')+'</Array>':'';
 const label=opts.label||'';
 const id='c2x'+(++seq);
 edges.push('<mxCell id="'+id+'" value="'+ESC(label)+'" style="'+ESC(css)+'" edge="1" source="'+named.get(a).id+'" target="'+named.get(b).id+'" parent="1"><mxGeometry relative="1" as="geometry">'+way+'</mxGeometry></mxCell>');
 relations.push({from:a,to:b,type,label});
}
node(null,130,50,25900,125,'C2  |  COMPONENTS + ALL 32 CONNECTED DATABASE TABLES','text',85);
node(null,130,175,25900,105,'EXTENDED C2 / API components on left | actual SQL entities + Crow Foot/APP/EVENT relationships on right | source: current EF Core','text',37);
node(null,150,340,10450,210,'REST API :8080   |   gRPC :8081 (HTTP/2)   |   Redis :6379 (TCP)   |   SQL :1433 (TCP)','db',35);
node(null,11500,340,13740,210,'DATABASE KEY: I = LongevityDietDb (21)  |  T = LongevityTrackingDb (7)  |  W = LongevityWorkerDb (4)','db',34);
node('web',85,620,1140,215,'WEB / NGINX :80\nhost :5173','box',33);
node('router',130,920,1030,7420,'API ROUTING\nJWT / Role\nRate limit\n\nHTTP :8080','box',38);
edge('web','router',{type:'component',exit:[.5,1],entry:[.5,0],label:'/api :8080'});
const y0=1000,step=705,cardH=345;
for(const [i,[controllerName]] of ordered.entries()){
 const c=ctrlLookup.get(controllerName);
 const y=y0+i*step;
 const cont='ctrl'+i,service='service'+i,repo='repo'+i;
 node(cont,1360,y,2260,cardH,c.domain+'\n'+c.controller,'box',37);
 node(service,3890,y,2380,cardH,c.service,'box',36);
 node(repo,6530,y,2570,cardH,c.persistence,'box',35);
 const data=ordered[i],entity=data[1],owner=tables[entity].db;
 node('ref'+i,9430,y,1630,cardH,'DATA REFERENCE\n'+entity+' ['+owner[0].toUpperCase()+']\nSQL :1433','db',32);
 const frac=Math.min(.97,Math.max(.03,(y+cardH/2-920)/7420));
 edge('router',cont,{entry:[0,.5],exit:[1,frac],label:'HTTP endpoint'});
 edge(cont,service,{label:'Call'});
 edge(service,repo,{label:'Data access'});
 edge(repo,'ref'+i,{type:'access',label:'TABLE REF'});
}
const normalized=n=>Math.max(0,Math.min(1,n));
for(const [table,geo] of Object.entries(layout.nodes)){
 if(!tables[table])throw Error('Layout has table absent from source '+table);
 const x=ox+geo.x*scale,y=oy+geo.y*scale,w=geo.w*scale,h=geo.h*scale;
 const s=tables[table];
 const cols=s.fields.slice(0,5).map(c=>c.replace(/\s*\[logical[^\]]*\]/g,' (APP REF)'));
 const name=table+'  ['+s.db[0].toUpperCase()+']\n'+cols.join('\n');
 node('table:'+table,x,y,w,h,name,'table',51);
}
const relMap=new Map(erd.relationships.map(r=>[r.from+'|'+r.to,r]));
for(const route of layout.edges){
 const r=relMap.get(route.source+'|'+route.target);
 if(!r)throw Error('Unverified database relationship '+route.source+' -> '+route.target);
 const a=layout.nodes[route.source],b=layout.nodes[route.target],p=route.points[0],q=route.points.at(-1);
 const from=[normalized((p[0]-a.x)/a.w),normalized((p[1]-a.y)/a.h)],to=[normalized((q[0]-b.x)/b.w),normalized((q[1]-b.y)/b.h)];
 const via=route.points.slice(1,-1).map(p=>[ox+p[0]*scale,oy+p[1]*scale]);
 const short=(()=>{const why=r.reason;
  if(r.kind==='sql')return '';
  if(r.kind==='event'){if(/EventId|event idempotency/i.test(why))return 'EVENT: EventId';if(/activity/i.test(why))return 'EVENT: activity';if(/notification/i.test(why))return 'EVENT: notify';return 'EVENT: reminder';}
  if(/UserId/i.test(why)&&/LocalDate/i.test(why))return 'APP: UserId + date';
  if(/UserId/i.test(why)&&/Category/i.test(why))return 'APP: UserId + category';
  if(/PlannedMealId/i.test(why))return 'APP: PlannedMealId';
  if(/Version/i.test(why))return 'APP: Version';
  if(/UserId/i.test(why))return 'APP: UserId';
  return 'APP: same business context';
 })();
 const label=short;
 edge('table:'+r.from,'table:'+r.to,{type:r.kind,card:r.cardinality,exit:from,entry:to,via,label});
}
// Native, source-backed bridges into the same 32-table connected graph.
for(const [ref,table] of [['ref3','Users']]){
 const actual=ordered.find((x,i)=>'ref'+i===ref);
 if(!actual||actual[1]!==table)throw Error('Reference map changed '+ref);
 edge(ref,'table:'+table,{type:'access',label:'REAL TABLE'});
}
node(null,180,8610,10440,680,
 'C2 EXTENDED: 10 Controller → Service → Persistence paths connect to real tables. Table-to-table lines: SOLID CROW FOOT = 9 genuine SQL FKs; LONG DASH APP = 16 application associations; DOTTED EVENT = 6 event paths. Dashed links are NOT SQL FKs. TABLE REF names map to the real 32-table graph on the right. The Worker owns its own DB. gRPC is stateless and does not have a separate DB.','db',36);
node(null,11500,9310,14300,490,
 'These are the 32 CURRENT EF Core mapped tables (I=21, T=7, W=4). Every table is connected to another table. Table cards show selected important columns; exact source definitions remain in EF Core. API/database access links are component usage, NOT extra SQL FKs.','db',34);
const all=[...vertices,...edges];
const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="C2" id="c2-extended-tables"><mxGraphModel page="1" grid="1" gridSize="10" pageWidth="'+W+'" pageHeight="'+H+'" pageScale="1" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+edges.join('')+vertices.join('')+'</root></mxGraphModel></diagram></mxfile>';
if([...xml.matchAll(/#[0-9a-fA-F]{6}\b/g)].some(m=>!['#000000','#FFFFFF'].includes(m[0].toUpperCase())))throw Error('Color in C2');
fs.writeFileSync(path.join(out,'C2.drawio'),xml,'utf8');
const m={status:'C2_EXTENDED_SOURCE_BACKED',components:c4.controllers.length,tableCount:32,actualFk:9,logical:16,event:6,componentFlows:31,tableReferences:10,sourceToTableBridge:1,totalConnectors:73,ports:{api:8080,grpc:8081,redis:6379,sql:1433,web:5173},tableAccessLinks:ext,relations};
fs.writeFileSync(path.join(root,'scripts/c2-extended-manifest.json'),JSON.stringify(m,null,2)+'\n','utf8');
const c4path=path.join(root,'scripts/c4-architecture-manifest.json');
c4.diagrams=c4.diagrams.map(d=>d.name==='C2'?{name:'C2',nodes:[...named.keys()],relations}:d);
c4.c2Scope='EXTENDED_C2_WITH_32_EF_TABLES_AND_31_VERIFIED_RELATIONSHIPS';
fs.writeFileSync(c4path,JSON.stringify(c4,null,2)+'\n');
console.log('C2_EXTENDED_GENERATED components=10 tables=32 sqlFK=9 logical=16 events=6 references=10 oneBridge=1 edges='+edges.length);
