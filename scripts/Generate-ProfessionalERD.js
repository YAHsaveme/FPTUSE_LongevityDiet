'use strict';
// CROW'S FOOT: full 32-table current schema (9 SQL FKs + grounded logical joins).
// Source: EF Core DbContexts; logical links never become a SQL FK.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),schema=JSON.parse(fs.readFileSync(path.join(root,'scripts/current-physical-schema.json'),'utf8'));
const groups=schema.groups,refs=schema.refs;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const owner={};
for(const [k,m] of Object.entries(groups)){
 const code=fs.readFileSync(path.join(root,m.context),'utf8');
 const mapped=[...code.matchAll(/\.ToTable\("([^"]+)"\)/g)].map(x=>x[1]);
 for(const n of Object.keys(m.columns)){if(!mapped.includes(n)||owner[n])throw Error('Stale/missing EF table '+n);owner[n]=k;}
 if(mapped.length!==Object.keys(m.columns).length)throw Error('EF table count drift '+k);
 if((code.match(/\.HasForeignKey(?:<[^>]+>)?\s*\(/g)||[]).length!==refs.filter(r=>r[0]===k).length)throw Error('FK drift '+k);
}
if(Object.keys(owner).length!==32||refs.length!==9)throw Error('Expected 32 source tables/9 physical FKs');
const nodes=[],edges=[],tables=new Map(),trace=[],W=15800,H=8100;let count=1;
function add(x,y,w,h,value,style,key){
 const id='erd'+(++count);
 nodes.push('<mxCell id="'+id+'" value="'+esc(value)+'" style="'+esc(style)+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
 if(key)tables.set(key,{id,x,y,w,h});
 return id;
}
const font='fontFamily=Arial;fontColor=#18283D;whiteSpace=wrap;html=1;';
const title='text;'+font+'strokeColor=none;fillColor=none;fontSize=82;fontStyle=1;align=left;verticalAlign=middle;';
const sub='text;'+font+'strokeColor=none;fillColor=none;fontSize=38;align=left;verticalAlign=middle;';
const panel='rounded=1;'+font+'strokeColor=#93A8B9;strokeWidth=3;dashed=1;fillColor=none;align=left;verticalAlign=top;spacing=18;';
const tableStyle='rounded=0;'+font+'strokeColor=#6A8296;strokeWidth=3;fillColor=#F9FBFD;fontSize=58;align=left;verticalAlign=middle;spacingLeft=19;spacingTop=10;spacingBottom=10;';
const note='rounded=1;'+font+'strokeColor=#C3CFDA;strokeWidth=2;fillColor=#EFF6FA;fontSize=54;align=left;verticalAlign=middle;spacing=27;';
add(140,35,W-280,140,'Database Diagram',title);
add(140,170,W-280,105,'ERD TỔNG THỂ | 32 bảng hiện tại | Crow’s Foot 1:1 / 1:N | PK • FK • khóa logic',sub);
add(140,285,W-280,180,
 '<b>ĐƯỜNG XANH ĐẬM LIỀN + CHÂN QUẠ</b> = 9 khóa ngoại SQL thật.   '+
 '<font color="#A96D27"><b>NÉT ĐỨT VÀNG</b></font> = quan hệ logic có khóa tương ứng nhưng SQL không ràng buộc.   '+
 '<b>PK</b>: khóa chính; <b>FK</b>: khóa ngoại; <b>LNK</b>: khóa logic.',note);
const panels=[
 [100,545,7460,2410,'LongevityDietDb | NGƯỜI DÙNG & CẤU HÌNH','#E7F0FA'],
 [7740,545,7940,2410,'LongevityDietDb | THỰC ĐƠN & NHẬT KÝ ĂN','#E8F6E9'],
 [100,3090,7460,1520,'LongevityDietDb | FMD & ĐÁNH GIÁ AN TOÀN','#FFF1DE'],
 [7740,3090,7940,2720,'LongevityTrackingDb | HOẠT ĐỘNG & ĐIỂM','#EAF2FB'],
 [100,4830,7460,1570,'LongevityWorkerDb | NHẮC NHỞ & SỰ KIỆN','#F1EDFC']
];
for(const [x,y,w,h,name,bg] of panels){
 add(x,y,w,h,'',panel);
 add(x+12,y+14,w-24,100,name,'rounded=0;'+font+'strokeColor=none;fillColor='+bg+';fontSize=62;fontStyle=1;align=left;verticalAlign=middle;spacingLeft=16;');
}
const identity=[
 ['RefreshTokens',0,0],['Users',1,0],['UserProfiles',2,0],['UserDietaryPreferences',3,0],
 ['IdentityOutbox',0,1],['ReminderPreferences',1,1],['UserNotifications',2,1],['UserFoodPreferences',3,1],
 ['IdentityInbox',0,2],['EatingWindowSnapshots',1,2],['RecommendationFeedbacks',2,2]
];
const plan=[
 ['MealPlans',0,0],['MealPlanDays',1,0],['PlannedMeals',2,0],
 ['MealLogs',0,1],['MealLogItems',1,1],['MealReplacementHistories',2,1]
];
const fmd=[
 ['FmdSafetyAssessments',0,0],['FmdCycles',1,0],['FmdCycleDays',2,0],['FmdEducationAcknowledgements',3,0]
];
const tracking=[
 ['AdherenceScores',0,0],['ScoreDimensions',1,0],['ActivityLogs',2,0],
 ['ActivityGoals',0,1],['TrackingScoreSignals',1,1],['ScoreConfigurationVersions',2,1],
 ['TrackingOutbox',0,2]
];
const worker=[
 ['ReminderSchedules',0,0],['ReminderDispatchRecords',1,0],['WorkerProcessedEvents',2,0],['WorkerOutbox',3,0]
];
const locations=[
 ...identity.map(([t,c,r])=>[t,230+c*1830,875+r*690,1640,515]),
 ...plan.map(([t,c,r])=>[t,7940+c*2560,885+r*870,2300,600]),
 ...fmd.map(([t,c,r])=>[t,230+c*1830,3460,1640,590]),
 ...tracking.map(([t,c,r])=>[t,7950+c*2550,3460+r*755,2280,590]),
 ...worker.map(([t,c,r])=>[t,230+c*1830,5260,1640,600])
];
for(const [name,x,y,w,h] of locations){
 const k=owner[name];if(!k)throw Error('Unmapped source '+name);
 const cols=groups[k].columns[name];
 const body=cols.map(field=>{
  if(field.startsWith('PK')||field.startsWith('FK'))
    return '<font color="#16674C"><b>'+esc(field)+'</b></font>';
  if(field.includes('[logical'))
    return '<font color="#9D6422">LNK '+esc(field.replace(/\s*\[logical[^\]]*\]/g,''))+'</font>';
  return esc(field);
 }).join('<br/>');
 add(x,y,w,h,'<b>'+esc(name)+'</b><br/><font color="#9AABBA">------------------------------------</font><br/>'+body,tableStyle,name);
}
if(tables.size!==32)throw Error('Incomplete 32-table catalog');
function connect(from,to,mode,card,exit,entry,points,why){
 const a=tables.get(from),b=tables.get(to);if(!a||!b)throw Error('No table endpoint '+from+' -> '+to);
 const solid=mode==='physical';
 const style='edgeStyle=segmentEdgeStyle;rounded=0;orthogonal=1;html=1;'+
 'strokeColor='+(solid?'#123E68':'#BA7A26')+';strokeWidth='+(solid?'10':'6')+';'+
 'startArrow='+(solid?'ERmandOne':'none')+';endArrow='+(solid?(card==='1:1'?'ERmandOne':'ERmany'):'open')+';'+
 'startSize=35;endSize=44;startFill=0;endFill=0;'+
 (solid?'':'dashed=1;dashPattern=14 10;')+
 'exitX='+exit[0]+';exitY='+exit[1]+';exitPerimeter=0;entryX='+entry[0]+';entryY='+entry[1]+';entryPerimeter=0;';
 const geom=points.length?'<Array as="points">'+points.map(([x,y])=>'<mxPoint x="'+x+'" y="'+y+'"/>').join('')+'</Array>':'';
 const id='erd'+(++count);
 edges.push('<mxCell id="'+id+'" value="" style="'+esc(style)+'" edge="1" parent="1" source="'+a.id+'" target="'+b.id+'"><mxGeometry relative="1" as="geometry">'+geom+'</mxGeometry></mxCell>');
 trace.push({from,to,mode,cardinality:card,reason:why||''});
}
const fk=[
 ['Users','RefreshTokens','1:N',[0,.55],[1,.55],[]],
 ['Users','UserProfiles','1:1',[1,.45],[0,.45],[]],
 ['Users','ReminderPreferences','1:1',[.42,1],[.42,0],[]],
 ['Users','UserNotifications','1:N',[.80,1],[.22,0],[[3390,1470],[4250,1470]]],
 ['MealPlans','MealPlanDays','1:N',[1,.45],[0,.45],[]],
 ['MealPlanDays','PlannedMeals','1:N',[1,.45],[0,.45],[]],
 ['MealLogs','MealLogItems','1:N',[1,.50],[0,.50],[]],
 ['FmdCycles','FmdCycleDays','1:N',[1,.5],[0,.5],[]],
 ['AdherenceScores','ScoreDimensions','1:N',[1,.5],[0,.5],[]]
];
for(const [a,b,card,p,q,pts] of fk){
 if(!refs.some(r=>r[1]===a&&r[3]===b))throw Error('Fake SQL foreign key '+a+' -> '+b);
 connect(a,b,'physical',card,p,q,pts,'SQL FK');
}
const logical=[
 ['Users','MealPlans',[.20,0],[.25,0],[[2390,690],[8515,690]],'same UserId'],
 ['Users','UserDietaryPreferences',[.45,0],[.55,0],[[2800,785],[6590,785]],'same UserId'],
 ['UserProfiles','UserFoodPreferences',[1,.93],[.48,0],[[5630,1460],[6500,1460]],'same UserId'],
 ['MealPlans','MealReplacementHistories',[.25,1],[.20,0],[[8500,1640],[13530,1640]],'MealPlanId'],
 ['PlannedMeals','MealReplacementHistories',[.72,1],[.72,0],[],'PlannedMealId'],
 ['FmdSafetyAssessments','FmdCycles',[1,.77],[0,.77],[],'same UserId'],
 ['FmdEducationAcknowledgements','FmdCycles',[.45,0],[.45,0],[[6450,3340],[2800,3340]],'same UserId'],
 ['ScoreConfigurationVersions','AdherenceScores',[.70,0],[.72,1],[[14640,4160],[9590,4160]],'Version'],
 ['ReminderSchedules','ReminderDispatchRecords',[1,.78],[0,.78],[],'UserId and Category']
];
for(const [a,b,p,q,pts,why] of logical)connect(a,b,'logical','',p,q,pts,why);
add(7840,6115,7720,790,
 '<b>CÁCH ĐỌC ERD</b><br/>'+
 '<font color="#123E68"><b>── 1 / N (Crow’s Foot)</b></font> = FK thật do SQL Server kiểm soát.<br/>'+
 '<font color="#9D6422"><b>┄┄ liên kết logic</b></font> = các khóa UserId, MealPlanId, PlannedMealId, Version trong code; không phải FK.<br/>'+
 'Outbox/Inbox và một số bảng sự kiện độc lập không cần SQL FK. Không nối giả bảng thiếu ràng buộc.',
 note);
add(145,6940,15430,680,
 '<b>NHÌN THEO LUỒNG</b>   Users → UserProfiles, RefreshTokens, ReminderPreferences, UserNotifications   |   MealPlans → MealPlanDays → PlannedMeals   |   MealLogs → MealLogItems   |   FmdCycles → FmdCycleDays   |   AdherenceScores → ScoreDimensions.<br/>'+
 'Toàn bộ 32 bảng có thật; 9 FK (đường liền xanh đậm) và '+logical.length+' liên kết logic (nét đứt vàng). Không tạo thêm FK/database ngoài code thực tế.',
 'rounded=1;'+font+'strokeColor=#D2AA73;strokeWidth=2;fillColor=#FFF7E7;fontSize=57;align=left;verticalAlign=middle;spacing=30;');
const xml='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="Database Diagram" id="erd-pro"><mxGraphModel page="1" grid="1" gridSize="10" pageWidth="15800" pageHeight="8100" pageScale="1" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+edges.join('')+nodes.join('')+'</root></mxGraphModel></diagram></mxfile>';
fs.writeFileSync(path.join(root,'docs/assignment/one-page/Database Diagram.drawio'),xml,'utf8');
fs.writeFileSync(path.join(root,'scripts/professional-erd-relations.json'),JSON.stringify({currentTables:32,physicalCount:9,logicalCount:logical.length,links:trace},null,2)+'\n');
console.log('PROFESSIONAL_ERD=BUILT 32 tables; 9 real SQL FK CrowFoot; '+logical.length+' logically grounded dashed links.');
