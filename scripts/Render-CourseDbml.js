/* PRN232 teaching ERD from DBML. 10 core EF Core entities (of 18 mapped).
   Owns a single uncluttered SVG sheet. Source is editable 04-database-core.dbml. */
const fs=require('fs'),path=require('path'),folder=path.resolve(__dirname,'../docs/assignment/one-page');
const dbml=fs.readFileSync(path.join(folder,'04-database-core.dbml'),'utf8');
const W=5200,H=2520;
function X(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
const esc=(a)=>X(a);
const tables=new Map();
for(const m of dbml.matchAll(/^Table\s+(\w+)\.(\w+)\s*\{([\s\S]*?)^\}/gm)){
  const cols=[];let index=false;
  for(const row of m[3].split(/\r?\n/)){
    const s=row.trim();if(!s)continue;
    if(s.startsWith('indexes {')){index=true;continue;}
    if(index){if(s==='}')index=false;continue;}
    const z=s.match(/^(\w+)\s+([^\s]+)\s*(.*)$/);
    if(z){cols.push({name:z[1],type:z[2],pk:/\bpk\b/.test(z[3]),uq:/\bunique\b/.test(z[3])});}
  }
  tables.set(m[1]+'.'+m[2],{group:m[1],name:m[2],cols});
}
const pos={
 'identity.Users':[880,515,920], 'identity.UserProfiles':[180,1150,950],
 'identity.RefreshTokens':[1390,1150,920], 'identity.ReminderPreferences':[180,1720,950],
 'identity.UserNotifications':[1390,1720,920],
 'tracking.ActivityLogs':[2630,555,770], 'tracking.ActivityGoals':[3475,555,770],
 'tracking.AdherenceScores':[2630,1460,770], 'tracking.ScoreDimensions':[3475,1460,770],
 'worker.ReminderSchedules':[4410,960,675]
};
if(tables.size!==10)throw Error('Expected ten core tables, got '+tables.size);
let lines=[];
function add(s){lines.push(s)}
function text(x,y,t,size=30,color='#292929',bold=false,anchor='start'){
 add('<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+(bold?700:400)+'" fill="'+color+'">'+esc(t)+'</text>');
}
add('<?xml version="1.0" encoding="utf-8"?>');
add('<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">');
add('<rect width="'+W+'" height="'+H+'" fill="#FFFFFF"/>');
add('<defs><marker id="arr" orient="auto" markerWidth="10" markerHeight="10" refX="8" refY="5"><path d="M0 0 L10 5 L0 10 Z" fill="#333333"/></marker></defs>');
text(100,120,'LongevityDiet | Core Database ERD',73,'#161616',true);
text(110,190,'PRN232 assignment · 10 selected current tables · 3 EF Core database owners · NOT the full 18-table physical schema',37,'#555555');
add('<line x1="110" y1="225" x2="5100" y2="225" stroke="#777777" stroke-width="5"/>');
const zones=[['IDENTITY',65,280,2390,1990,'Users, profiles, sessions and notifications'],['TRACKING',2530,280,1750,1990,'Activity tracking and educational scores'],['WORKER',4350,280,785,1990,'Background scheduling']];
for(const z of zones){
 add('<rect x="'+z[1]+'" y="'+z[2]+'" width="'+z[3]+'" height="'+z[4]+'" fill="#FFFFFF" stroke="#777777" stroke-width="4"/>');
 text(z[1]+30,z[2]+77,z[0],49,'#222222',true);
 text(z[1]+30,z[2]+124,z[5],27,'#666666');
 add('<line x1="'+(z[1]+28)+'" y1="'+(z[2]+149)+'" x2="'+(z[1]+z[3]-28)+'" y2="'+(z[2]+149)+'" stroke="#BBBBBB" stroke-width="2"/>');
}
const box={};
for(const [key,t] of tables){
 const xy=pos[key];if(!xy)throw Error('Unplaced '+key);
 const h=125+t.cols.length*52, [x,y,w]=xy;
 box[key]={x,y,w,h};
}
// FK connectors routed through dedicated gutters, underneath table text.
const connectors=[
 [[880,740],[730,740],[730,1110],[660,1110],[660,1150]], // profile
 [[1800,740],[1815,740],[1815,1150]], // refresh
 [[880,800],[110,800],[110,1900],[180,1900]], // preferences
 [[1800,815],[2390,815],[2390,1900],[2310,1900]], // notifications
 [[3400,1600],[3475,1600]] // score dimensions
];
for(const path of connectors){
 add('<polyline points="'+path.map(p=>p.join(',')).join(' ')+'" stroke="#444444" stroke-width="5" fill="none" marker-end="url(#arr)"/>');
}
for(const [key,t] of tables){
 const {x,y,w,h}=box[key];
 add('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#FFFFFF" stroke="#292929" stroke-width="4"/>');
 add('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="102" fill="#333333"/>');
 text(x+27,y+72,t.name,45,'#FFFFFF',true);
 let cy=y+153;
 for(let i=0;i<t.cols.length;i++){
   const c=t.cols[i];if(i%2===1)add('<rect x="'+(x+5)+'" y="'+(cy-35)+'" width="'+(w-10)+'" height="48" fill="#F5F5F5"/>');
   const fk=key==='identity.UserProfiles'&&c.name==='UserId'||key==='identity.RefreshTokens'&&c.name==='UserId'||key==='identity.ReminderPreferences'&&c.name==='UserId'||key==='identity.UserNotifications'&&c.name==='UserId'||key==='tracking.ScoreDimensions'&&c.name==='AdherenceScoreId';
   if(c.pk||fk||c.uq)text(x+16,cy,c.pk&&fk?'PK/FK':c.pk?'PK':fk?'FK':'UQ',26,'#444444',true);
   text(x+85,cy,c.name,31,c.pk?'#111111':'#333333',c.pk);
   text(x+w-26,cy,c.type,27,'#666666',false,'end');
   cy+=52;
 }
}
text(115,2392,'Legend: PK = primary key  |  FK = foreign key (within the same database)  |  UQ = unique  |  Lines show database relationships.',29,'#333333',true);
text(115,2443,'Technical outbox/inbox, event deduplication, configuration and extra score tables remain in source migrations; cross-database UserId values are NOT SQL foreign keys.',26,'#555555');
add('</svg>');
const output=path.join(folder,'04-database-core.svg');
fs.writeFileSync(output,lines.join('\n'),'utf8');
console.log('DBML CORE ERD',tables.size,'tables',output);
