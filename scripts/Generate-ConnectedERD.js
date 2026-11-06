'use strict';
// Source-verified, single-sheet overview integrating physical ERD, logical owner keys,
// and event/data-lineage context. Structural buses are NOT SQL tables or foreign keys.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const {groups,refs}=JSON.parse(fs.readFileSync(path.join(root,'scripts/current-physical-schema.json'),'utf8'));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'"&quot;"'.slice(1,-1));
const names=Object.values(groups).flatMap(g=>Object.keys(g.columns));
if(names.length!==32||new Set(names).size!==32||refs.length!==9)throw Error('Current schema 32 tables / 9 FKs changed');
const evidence=[
 ['IdentityOutbox','src/LongevityDiet.Services/Reminders/ReminderService.cs','IdentityOutbox.Add'],
 ['WorkerProcessedEvents','src/LongevityDiet.Worker/Reminders/ReminderWorkerEngine.cs','ProcessedEvents.Add'],
 ['WorkerOutbox','src/LongevityDiet.Worker/Reminders/ReminderWorkerEngine.cs','db.Outbox.Add'],
 ['TrackingOutbox','src/LongevityDiet.Tracking/TrackingService.cs','db.Outbox.Add'],
 ['IdentityInbox','src/LongevityDiet.Services/Reminders/ReminderService.cs','IdentityInbox.Add']
];
for(const [table,p,needle] of evidence){
 const content=fs.readFileSync(path.join(root,p),'utf8');
 if(!content.includes(needle))throw Error('Unverified event relationship '+table+' in '+p);
}
const domains=[
 {id:'Identity',x:90,w:3440,h:7350,label:'IDENTITY / PROFILE',color:'#EAF2FC',data:[
  'Users','UserProfiles','RefreshTokens','ReminderPreferences','UserNotifications',
  'UserDietaryPreferences','UserFoodPreferences','EatingWindowSnapshots','IdentityOutbox','IdentityInbox'
 ],step:650,cardH:480,busKinds:{IdentityInbox:'event',IdentityOutbox:'logical'}},
 {id:'Planning',x:3660,w:3480,h:7350,label:'MEAL PLAN / MEAL LOG',color:'#EAF6EA',data:[
  'MealPlans','MealPlanDays','PlannedMeals','MealReplacementHistories','RecommendationFeedbacks','MealLogs','MealLogItems'
 ],step:870,cardH:560,busKinds:{}},
 {id:'FMD',x:7270,w:2740,h:7350,label:'FMD / SAFETY',color:'#FFF2E0',data:[
  'FmdSafetyAssessments','FmdCycles','FmdCycleDays','FmdEducationAcknowledgements'
 ],step:1500,cardH:570,busKinds:{}},
 {id:'Tracking',x:10140,w:3440,h:7350,label:'ACTIVITY / ADHERENCE',color:'#EAF2FC',data:[
  'ActivityGoals','ActivityLogs','TrackingOutbox','ScoreConfigurationVersions','AdherenceScores','ScoreDimensions','TrackingScoreSignals'
 ],step:870,cardH:560,busKinds:{TrackingOutbox:'event'}},
 {id:'Worker',x:13710,w:3480,h:7350,label:'REMINDER WORKER',color:'#F2EDFA',data:[
  'ReminderSchedules','ReminderDispatchRecords','WorkerOutbox','WorkerProcessedEvents'
 ],step:1500,cardH:570,busKinds:{WorkerProcessedEvents:'event'}}
];
const width=17330,height=8750, v=[],backgrounds=[],e=[],nodes=new Map(),edges=[];let idCounter=1;
const style={
 heading:'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontFamily=Arial;fontColor=#17354D;fontSize=74;fontStyle=1;align=left;verticalAlign=middle;',
 sub:'text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;fontFamily=Arial;fontColor=#375065;fontSize=37;align=left;verticalAlign=middle;',
 frame:'rounded=1;arcSize=8;html=1;whiteSpace=wrap;strokeColor=#BCC9D5;strokeWidth=2;fillColor=#FBFCFE;',
 table:'rounded=1;arcSize=7;html=1;whiteSpace=wrap;strokeColor=#6D8194;strokeWidth=2.5;fillColor=#FFFFFF;fontFamily=Arial;fontColor=#142B3E;fontSize=50;align=left;verticalAlign=middle;spacingLeft=22;spacingTop=8;spacingBottom=8;',
 context:'rounded=1;arcSize=10;html=1;whiteSpace=wrap;strokeColor=#7B8FA0;strokeWidth=2;fillColor=#EEF3F7;fontFamily=Arial;fontColor=#243E57;fontSize=42;align=left;verticalAlign=middle;spacing=19;'
};
function vertex(key,x,y,w,h,value,kind='table',extra=''){
 const id='v'+(++idCounter);
 if(key&&nodes.has(key))throw Error('Duplicate ERD element '+key);
 (kind==='frame'?backgrounds:v).push('<mxCell id="'+id+'" value="'+esc(value)+'" style="'+esc(style[kind]+extra)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
 if(key)nodes.set(key,{id,x,y,w,h});
 return id;
}
function connect(a,b,type,from=[1,.5],to=[0,.5],via=[],reason=''){
 const A=nodes.get(a),B=nodes.get(b);
 if(!A||!B)throw Error('Orphan endpoint '+a+' -> '+b);
 const physical=type==='physical',event=type==='event',context=type==='context';
 const color=physical?'#164B78':event?'#7753A8':context?'#477E96':'#BA822A';
 let css='edgeStyle=segmentEdgeStyle;rounded=0;orthogonal=1;html=1;strokeColor='+color+
 ';strokeWidth='+(physical?9:event?8:context?9:8)+';'+
 (physical?'startArrow=ERmandOne;endArrow='+(reason.includes('1:1')?'ERmandOne':'ERmany')+';startFill=0;endFill=0;startSize=30;endSize=39;':
 'startArrow=none;endArrow='+(context?'none':'open')+';'+(context?'':'dashed=1;dashPattern=16 9;'))+
 'exitX='+from[0]+';exitY='+from[1]+';exitPerimeter=0;entryX='+to[0]+';entryY='+to[1]+';entryPerimeter=0;';
 const geo=via.length?'<Array as="points">'+via.map(([x,y])=>'<mxPoint x="'+x+'" y="'+y+'"/>').join('')+'</Array>':'';
 const id='e'+(++idCounter);
 e.push('<mxCell id="'+id+'" value="" style="'+esc(css)+'" edge="1" source="'+A.id+'" target="'+B.id+'" parent="1"><mxGeometry relative="1" as="geometry">'+geo+'</mxGeometry></mxCell>');
 edges.push({from:a,to:b,type,reason});
}
vertex(null,110,45,width-220,125,'Database Diagram','heading');
vertex(null,110,181,width-220,80,
 'MÔ HÌNH DỮ LIỆU TỔNG THỂ | 32 bảng • 3 database • 9 FK SQL • liên kết logic & luồng sự kiện','sub');
vertex(null,110,282,width-220,180,
 '<b>XANH ĐẬM — CROW’S FOOT</b> = FK SQL thật 1:1 / 1:N    |    '+
 '<font color="#BA822A"><b>VÀNG NÉT ĐỨT</b></font> = khóa/liên hệ nghiệp vụ    |    '+
 '<font color="#7753A8"><b>TÍM NÉT ĐỨT</b></font> = dòng sự kiện    |    '+
 '<font color="#477E96"><b>XANH LAM</b></font> = trục liên hệ theo miền, <b>KHÔNG PHẢI FK</b>','context');
vertex('global',100,527,width-200,102,
 '<b>TRỤC DỮ LIỆU NGƯỜI DÙNG & SỰ KIỆN</b>  — sơ đồ định hướng liên hệ toàn hệ thống; không phải bảng SQL và không phải phép JOIN','context','strokeColor=#9BB2C6;fillColor=#E8F0F6;');
const cardNodes=new Map(),spokes=[],hubs=[];
const yStart=1200, panelY=755;
for(const [index,domain] of domains.entries()){
 const panelH=7250;
 vertex(null,domain.x,panelY,domain.w,panelH,'','frame');
 vertex(null,domain.x+15,panelY+23,domain.w-30,115,
  '<b>'+domain.label+'</b>   |   '+domain.data.length+' bảng',
  'context','fillColor='+domain.color+';strokeColor=none;fontSize=46;');
 const railX=domain.x+160,railY=1060,railW=35,railH=6600;
 const rail='rail:'+domain.id;
 vertex(rail,railX,railY,railW,railH,'','frame','strokeColor=#477E96;strokeWidth=2.5;fillColor=#7FA8BB;');
 hubs.push(rail);
 const bus=nodes.get('global');
 connect('global',rail,'context',[(railX+railW/2-bus.x)/bus.w,1],[.5,0],[],'navigation bus (not SQL FK)');
 for(const [j,name] of domain.data.entries()){
  const meta=Object.entries(groups).find(([,g])=>g.columns[name])?.[1];
  if(!meta)throw Error('Missing table '+name);
  const x=domain.x+355,y=yStart+j*domain.step,w=domain.w-630,h=domain.cardH;
  const fieldLines=meta.columns[name].map(f=>{
   if(/^PK|^FK/.test(f))return '<font color="#18704A"><b>'+esc(f)+'</b></font>';
   if(f.includes('[logical'))return '<font color="#A76B25"><b>LNK '+esc(f.replace(/\s*\[logical[^\]]*\]/g,''))+'</b></font>';
   return esc(f);
  });
  vertex('tbl:'+name,x,y,w,h,'<b>'+esc(name)+'</b><br/><font color="#B3C3D1">──────────────────</font><br/>'+fieldLines.join('<br/>'),'table','');
  cardNodes.set(name,'tbl:'+name);
 }
}
const phys=[
 ['Users','UserProfiles','1:1'],
 ['Users','RefreshTokens','1:N'],
 ['Users','ReminderPreferences','1:1'],
 ['Users','UserNotifications','1:N'],
 ['MealPlans','MealPlanDays','1:N'],
 ['MealPlanDays','PlannedMeals','1:N'],
 ['MealLogs','MealLogItems','1:N'],
 ['FmdCycles','FmdCycleDays','1:N'],
 ['AdherenceScores','ScoreDimensions','1:N']
];
for(const [from,to,card] of phys){
 if(!refs.some(r=>r[1]===from&&r[3]===to&&r[5]===card))throw Error('Unsupported SQL relationship '+from+' -> '+to);
 if(from==='Users'){
  const idx=['UserProfiles','RefreshTokens','ReminderPreferences','UserNotifications'].indexOf(to);
  const table=nodes.get('tbl:Users');
  const gutter=table.x+table.w+75+idx*66;
  const srcY=.84-idx*.19;
  const src=table.y+table.h*srcY;
  const dest=nodes.get('tbl:'+to),endY=dest.y+dest.h*.5;
  connect('tbl:Users','tbl:'+to,'physical',[1,srcY],[1,.5],[[gutter,src],[gutter,endY]],'EF Core FK '+card);
 } else connect('tbl:'+from,'tbl:'+to,'physical',[.56,1],[.56,0],[],'EF Core FK '+card);
}
// For all non-physical children, connect to their domain rail via real owner
// keys or operational event context. This is a conceptual connectivity
// relationship, explicitly NOT a SQL FK or implicit database JOIN.
const parentOf=new Map(phys.map(r=>[r[1],r[0]]));
const lineage=[
 ['PlannedMeals','MealReplacementHistories','logical','PlannedMealId in MealReplacementHistory'],
 ['FmdSafetyAssessments','FmdCycles','logical','same UserId + checked FMD safety gate'],
 ['ActivityLogs','TrackingOutbox','event','TrackingService queues activity events'],
 ['ScoreConfigurationVersions','AdherenceScores','logical','AdherenceScore.Version matches configuration Version'],
 ['ReminderSchedules','ReminderDispatchRecords','logical','UserId + Category + due schedule'],
 ['ReminderDispatchRecords','WorkerOutbox','event','ReminderWorkerEngine emits NotificationReady event']
];
for(const [a,b,type,reason] of lineage){
 if(parentOf.has(b))throw Error('Physical child given second parent '+b);
 if(!nodes.has('tbl:'+a)||!nodes.has('tbl:'+b))throw Error('Missing lineage table '+a+' '+b);
 connect('tbl:'+a,'tbl:'+b,type,[.52,1],[.52,0],[],reason);
 parentOf.set(b,a);
}
// Actual grouped ownership/context fields are labelled in the table, and bus
// edges are visually gray to avoid misrepresenting them as SQL relations.
const groupContext={
 Identity:{IdentityInbox:'event result (EventId)',IdentityOutbox:'UserId event owner'},
 Planning:{MealPlans:'UserId owner',MealLogs:'UserId owner',RecommendationFeedbacks:'UserId owner'},
 FMD:{FmdSafetyAssessments:'UserId owner',FmdEducationAcknowledgements:'UserId owner'},
 Tracking:{ActivityGoals:'UserId owner',ActivityLogs:'UserId owner',ScoreConfigurationVersions:'Version catalog',TrackingScoreSignals:'UserId + day score signal'},
 Worker:{ReminderSchedules:'UserId and Category',WorkerProcessedEvents:'processed eventId'}
};
for(const domain of domains){
 const rail='rail:'+domain.id,railNode=nodes.get(rail);
 for(const table of domain.data){
  if(parentOf.has(table))continue;
  const node=nodes.get('tbl:'+table),exitY=(node.y+node.h*.5-railNode.y)/railNode.h;
  const kind=table==='IdentityInbox'||table==='WorkerProcessedEvents'?'event':'context';
  const reason=groupContext[domain.id]?.[table]||'UserId business context, not SQL FK';
  connect(rail,'tbl:'+table,kind,[1,exitY],[0,.5],[],reason);
  spokes.push({domain:domain.id,table,reason,kind});
 }
}
if(edges.filter(e=>e.type==='physical').length!==9)throw Error('Missing enforced FKs');
const tableEdgeSet=new Set();
for(const edge of edges){if(edge.from.startsWith('tbl:'))tableEdgeSet.add(edge.from.slice(4));if(edge.to.startsWith('tbl:'))tableEdgeSet.add(edge.to.slice(4));}
if(tableEdgeSet.size!==32)throw Error('Some tables lack attached diagram links');
const adjacency=new Map();
for(const n of nodes.keys())adjacency.set(n,new Set());
for(const edge of edges){adjacency.get(edge.from).add(edge.to);adjacency.get(edge.to).add(edge.from);}
const seen=new Set(['global']),queue=['global'];
while(queue.length){const cur=queue.shift();for(const next of adjacency.get(cur)){if(!seen.has(next)){seen.add(next);queue.push(next);}}}
const unreachable=[...nodes.keys()].filter(x=>!seen.has(x));
if(unreachable.length)throw Error('Unconnected table or context node: '+unreachable.join(','));
vertex(null,250,8140,width-500,380,
 '<b>ĐỌC THEO LUỒNG:</b> Users → UserProfiles / RefreshTokens / ReminderPreferences / UserNotifications;  MealPlans → MealPlanDays → PlannedMeals;  MealLogs → MealLogItems;  FmdCycles → FmdCycleDays;  AdherenceScores → ScoreDimensions.<br/>'+
 '<b>LƯU Ý:</b> Trục xanh lam chỉ là bản đồ liên hệ nghiệp vụ/dữ liệu; các bảng Outbox/Inbox không có SQL FK chéo database. Không thêm bảng hoặc quan hệ giả vào CSDL.',
 'context','fillColor=#FFF6E6;strokeColor=#DABF96;fontSize=41;');
const svgXml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="Database Diagram" id="complete-erd"><mxGraphModel page="1" grid="1" gridSize="10" pageWidth="'+width+'" pageHeight="'+height+'" pageScale="1" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+backgrounds.join('')+e.join('')+v.join('')+'</root></mxGraphModel></diagram></mxfile>';
fs.writeFileSync(path.join(root,'docs/assignment/one-page/Database Diagram.drawio'),svgXml,'utf8');
const result={status:'CURRENT_MODEL_PLUS_DOCUMENTED_CONTEXT_NOT_SQL_FK',tables:32,physicalSqlFkCount:9,
 relationships:edges,spokes,allTablesHaveLinks:true,allNodesOneConnectedGraph:true,source:'EF Core contexts and current services'};
fs.writeFileSync(path.join(root,'scripts/connected-erd-manifest.json'),JSON.stringify(result,null,2)+'\n','utf8');
console.log('CONNECTED_DATABASE_DIAGRAM_COMPLETE tables=32 actualSQLFK=9 graphEdges='+edges.length+' reachableNodes='+seen.size);
