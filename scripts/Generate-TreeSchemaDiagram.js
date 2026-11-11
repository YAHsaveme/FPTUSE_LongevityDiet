'use strict';
/**
 * Non-crossing hierarchy layout for the 56-table FULL ERD.
 * Preserves every EF SQL FK, and connects otherwise separate tables
 * with the minimal source-backed association set from full-schema-manifest.
 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'docs/assignment/one-page');
const data=JSON.parse(fs.readFileSync(path.join(dir,'full-schema-manifest.json'),'utf8'));
if(data.tableCount!==56||data.physicalFkCount!==23||data.logicalAssociations!==32||data.relations.length!==55)throw Error('Source backed physical ERD scope drift');
const byId=new Map(data.tables.map(x=>[x.id,x])),adj=new Map([...byId.keys()].map(x=>[x,[]]));
for(const e of data.relations){
 if(!adj.has(e.from)||!adj.has(e.to))throw Error('Unknown physical relationship endpoint');
 adj.get(e.from).push(e.to);adj.get(e.to).push(e.from);
}
const domainGroups=[
 ['Users','UserProfiles','RefreshTokens','ReminderPreferences','UserNotifications','IdentityOutbox','IdentityInbox','WellnessScreenings','WellnessCheckIns'],
 ['Foods','Recipes','RecipeIngredients','Allergens','RecipeAllergens','DietRules','RuleVersions','RuleAudits','RuleSetVersions','RuleSetVersionItems'],
 ['UserDietaryPreferences','MealPlans','MealPlanDays','PlannedMeals','MealLogs','MealLogItems','EatingWindowSnapshots','RecommendationFeedbacks','MealReplacementHistories','UserFoodPreferences'],
 ['ChallengeTemplates','ChallengeDayTemplates','UserChallenges','UserChallengeDays','DailyWellnessSummaries','ProgressEventReceipts','FmdEducationAcknowledgements','FmdSafetyAssessments','FmdCycles','FmdCycleDays','WeeklyReports','WeeklyReportMetrics','WorkerJobs','WorkerDeadLetters','WorkerHeartbeats','WorkerProcessedEvents'],
 ['ActivityGoals','ActivityLogs','AdherenceScores','ScoreDimensions','ScoreConfigurationVersions','TrackingScoreSignals','TrackingOutbox'],
 ['ReminderSchedules','ReminderDispatchRecords','WorkerProcessedEvents','WorkerOutbox']
];
function groupOf(node){
 let n=byId.get(node);
 return n.db==='main'?domainGroups.slice(0,4).findIndex(g=>g.includes(n.table)):n.db==='tracking'?4:5;
}
const traversed=[],visited=new Set(),rootId='main:Users';
function dfs(id,previous){
 if(visited.has(id))return;
 visited.add(id);traversed.push(id);
 const neighbors=adj.get(id).filter(x=>x!==previous);
 neighbors.sort((a,b)=>{
  const ia=groupOf(a),ib=groupOf(b),base=groupOf(id);
  const score=x=>Math.abs(groupOf(x)-base)*20+(x.startsWith('main:')?0:5);
  return score(a)-score(b)||a.localeCompare(b);
 });
 for(const next of neighbors)dfs(next,id);
}
dfs(rootId,null);
if(traversed.length!==56)throw Error('ERD not connected');
const order=new Map(traversed.map((id,i)=>[id,i]));
const rowGap=132,cardY=360,cardH=109,W=9000,H=8010,xCard=170,wCard=3180,railStart=3400,railScale=95;
const shapes=[],edges=[],rows=new Map(),midX=xCard+wCard;
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let seq=2;
function text(x,y,w,h,value,font=28,bold=false){
 shapes.push('<mxCell id="n'+seq+++'" value="'+esc(value)+'" style="text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;fontFamily=Arial;fontColor=#000000;fontSize='+font+';'+(bold?'fontStyle=1;':'')+'" vertex="1" parent="1"><mxGeometry x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" as="geometry"/></mxCell>');
}
text(170,34,6980,92,'DATABASE DIAGRAM — 56 PHYSICAL TABLES / COMPLETE LIVE EF CORE MODEL',53,true);
text(170,130,6900,68,'Three SQL catalogs: 45 main + 7 activity + 4 reminder | 23 real SQL FKs (solid) | 32 required logical links (dashed); 50 associations fully recorded in manifest',28);
text(170,207,6800,66,'Follow the external elbow connectors. Every table connects exactly once to the graph; only solid Crow’s Foot lines are enforced by SQL Server.',26);
for(let i=0;i<traversed.length;i++){
 const id=traversed[i],n=byId.get(id),y=cardY+i*rowGap;
 const cellId='n'+seq++;
 const pk=n.pk.slice(0,2).join(', ')||'none';
 const secondary=n.properties.filter(p=>!n.pk.includes(p)).slice(0,3).join(', ');
 const caption=n.table+'  ['+n.db+' / '+n.schema+']\nPK: '+pk+'\n'+(secondary||'Columns: see EF migration');
 const value=esc(caption).replace(/\n/g,'&lt;br/&gt;');
 const size=n.table.length>24?21:23;
 shapes.push('<mxCell id="'+cellId+'" value="'+value+'" style="rounded=0;html=1;whiteSpace=wrap;strokeColor=#000000;strokeWidth=2;fillColor=#FFFFFF;align=left;verticalAlign=middle;spacingLeft=26;spacingRight=14;fontFamily=Arial;fontColor=#000000;fontSize='+size+';" vertex="1" parent="1"><mxGeometry x="'+xCard+'" y="'+y+'" width="'+wCard+'" height="'+cardH+'" as="geometry"/></mxCell>');
 rows.set(id,{id:cellId,y,w:wCard,x:xCard,h:cardH});
}
// Geometric tree orientation is based on DFS depth/order, independent of
// EF FK direction. Each non-root table has exactly one earlier/parent link.
// Parent incoming port is ABOVE its child outgoing ports. Outgoing branches
// are sorted long-to-short; outer elbows leave first, preventing crossings.
const children=new Map(traversed.map(x=>[x,[]]));
const spanOf=e=>Math.abs(order.get(e.from)-order.get(e.to));
for(const e of data.relations){
 const upper=order.get(e.from)<order.get(e.to)?e.from:e.to;
 children.get(upper).push(e);
}
for(const arr of children.values())arr.sort((a,b)=>spanOf(b)-spanOf(a));
const geometry=[];
for(let ei=0;ei<data.relations.length;ei++){
 const e=data.relations[ei],a=rows.get(e.from),b=rows.get(e.to);
 const span=spanOf(e);
 const rail=railStart+span*railScale;
 const upper=order.get(e.from)<order.get(e.to)?e.from:e.to;
 const list=children.get(upper),rank=list.indexOf(e);
 if(rank<0)throw Error('Broken planar tree order');
 const upperPort=.26+.60*(rank+1)/(list.length+1);
 const lowerPort=.11;
 const leave=e.from===upper?upperPort:lowerPort;
 const enter=e.to===upper?upperPort:lowerPort;
 const startY=Math.round(a.y+a.h*leave),endY=Math.round(b.y+b.h*enter);
 const sql=e.kind==='SQL_FK';
 const label=sql?'FK '+e.label.replace(/^FK /,''):'APP '+e.label.replace(/^APP /,'');
 const style='edgeStyle=segmentEdgeStyle;rounded=0;orthogonalLoop=1;html=1;strokeColor=#000000;strokeWidth='+(sql?2.9:1.8)+';'+
  (sql?'startArrow=ERmandOne;endArrow=ERmany;startFill=0;endFill=0;':'dashed=1;dashPattern=12 9;startArrow=none;endArrow=open;endFill=0;')+
  'fontColor=#000000;fontFamily=Arial;fontSize=17;labelBackgroundColor=#FFFFFF;verticalLabelPosition=top;exitX=1;exitY='+leave+';exitPerimeter=0;entryX=1;entryY='+enter+';entryPerimeter=0;';
 const meta='<mxGeometry x="0" y="-22" relative="1" as="geometry"><Array as="points"><mxPoint x="'+rail.toFixed(2)+'" y="'+startY+'"/><mxPoint x="'+rail.toFixed(2)+'" y="'+endY+'"/></Array></mxGeometry>';
 edges.push('<mxCell id="e'+seq+++'" value="'+esc(label).slice(0,70)+'" style="'+style+'" edge="1" source="'+a.id+'" target="'+b.id+'" parent="1">'+meta+'</mxCell>');
 geometry.push({from:e.from,to:e.to,kind:e.kind,span,rail,startY,endY});
}
text(170,7740,8490,112,'DATA PROVENANCE: 56 table nodes and 23 FK links are parsed from EF migration snapshots. The 32 dashed lines are a minimum connected subset of 50 source-backed APP relations listed in full-schema-manifest.json.',26);
const mx='<mxfile host="app.diagrams.net" version="32.6.10"><diagram name="Database Diagram" id="tree-ef-56"><mxGraphModel grid="1" gridSize="10" page="1" pageScale="1" pageWidth="'+W+'" pageHeight="'+H+'" connect="1" arrows="1"><root><mxCell id="0"/><mxCell id="1" parent="0"/>'+edges.join('')+shapes.join('')+'</root></mxGraphModel></diagram></mxfile>';
fs.writeFileSync(path.join(dir,'Database Diagram FULL.drawio'),mx,'utf8');
fs.writeFileSync(path.join(dir,'Database Diagram.drawio'),mx,'utf8');
fs.writeFileSync(path.join(dir,'full-schema-layout-geometry.json'),JSON.stringify({page:{W,H},rowGap,cardH,tableOrder:traversed,edges:geometry},null,2)+'\n','utf8');
console.log('TREE_LAYOUT_ERD=PASS rows=56 FK=23 APP=32 page='+W+'x'+H+' rails='+geometry.length);
