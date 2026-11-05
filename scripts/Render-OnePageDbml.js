/* Render one giant printable LANDSCAPE VECTOR SHEET directly from the validated DBML source.
   Source is DBML (.dbml); this is a deterministic ERD projection, not a Draw.io database painting.
   One SVG = one page = all tables, all local FK links. Print on A0 landscape or zoom for detail.
*/
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'docs','assignment','one-page');
// Standard engineering ERD: neutral black/white, sharp table boxes, local FK connectors.
const color={identity:'#303030',catalog:'#303030',planning:'#303030',tracking:'#303030',recommendation:'#303030',worker:'#303030'};
const bg={identity:'#FFFFFF',catalog:'#FFFFFF',planning:'#FFFFFF',tracking:'#FFFFFF',recommendation:'#FFFFFF',worker:'#FFFFFF'};
function asGrayscale(svg){
  return svg.replace(/#[0-9a-fA-F]{6}\b/g, (hex)=>{
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    const v=Math.round(.299*r+.587*g+.114*b).toString(16).padStart(2,'0').toUpperCase();
    return '#'+v+v+v;
  });
}
const X=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function readDBML(file){
 const src=fs.readFileSync(path.join(dest,file),'utf8'),groups=new Map(),rel=[];
 const re=/^Table\s+([\w]+)\.([\w]+)\s*\{([\s\S]*?)^\}/gm;
 for(const m of src.matchAll(re)){
  const schema=m[1].replace(/^target_|^current_/,'');
  if(!groups.has(schema))groups.set(schema,[]);
  const cols=[];
  let inIndexes=false;
  for(const ln of m[3].split(/\r?\n/)){
   const v=ln.trim();if(!v)continue;
   if(v.startsWith('indexes {')){inIndexes=true;continue;}
   if(inIndexes){if(v==='}')inIndexes=false;continue;}
   if(v.startsWith('Note:'))continue;
   const c=v.match(/^(\w+)\s+(\S+)(?:\s+\[(.+)\])?/);
   if(c)cols.push({name:c[1],type:c[2],pk:/\bpk\b/.test(c[3]||''),unique:/\bunique\b/.test(c[3]||'')});
  }
  groups.get(schema).push({schema,name:m[2],cols});
 }
 for(const r of src.matchAll(/^Ref:\s+([\w]+)\.([\w]+)\.([\w]+)\s+([-<>])\s+([\w]+)\.([\w]+)\.([\w]+)/gm)){
  if(r[1]!==r[5])throw Error('Cross DB FK forbidden: '+r[0]);
  rel.push({schema:r[1].replace(/^target_|^current_/,''),a:r[2],aCol:r[3],kind:r[4],b:r[6],bCol:r[7]});
 }
 return {groups,rel};
}
function render(file,output,title,sub){
 const {groups,rel}=readDBML(file),schemas=[...groups.keys()],isTarget=schemas.length===6;
 const W=9600,H=isTarget?6360:3580,GW=3030,GH=isTarget?2670:2690;
 const markup=[],pos={};
 let currentGroupX=0;
 function put(s){markup.push(s)}
 const tx=(x,y,text,size=30,fill='#223249',weight=400,anchor='start')=>
  put('<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+fill+'" text-anchor="'+anchor+'">'+X(text)+'</text>');
 put('<?xml version="1.0" encoding="UTF-8"?>');
 put('<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">');
 put('<defs><marker id="end" orient="auto" markerWidth="12" markerHeight="12" refX="9" refY="5"><path d="M0 0 L10 5 L0 10 Z" fill="#73839D"/></marker></defs>');
 put('<rect width="'+W+'" height="'+H+'" fill="#FFFFFF"/>');
 tx(145,128,title,89,'#18304D',700);
 tx(145,208,sub,43,'#61748B');
 put('<line x1="145" y1="258" x2="'+(W-150)+'" y2="258" stroke="#CBD7E6" stroke-width="7"/>');
 // Each logical database uses two vertical columns of fixed-width legible cards.
 schemas.forEach((schema,si)=>{
  const row=isTarget?Math.floor(si/3):0,col=si%3;
  const gx=125+col*3150,gy=338+row*2820;
  const c=color[schema]||'#53789F',f=bg[schema]||'#EFF5FC';
  put('<rect x="'+gx+'" y="'+gy+'" width="'+GW+'" height="'+GH+'" fill="#FFFFFF" stroke="'+c+'" stroke-width="7"/>');
  put('<rect x="'+gx+'" y="'+gy+'" width="'+GW+'" height="204" fill="'+f+'" stroke="none"/>');
  tx(gx+78,gy+87,schema.toUpperCase()+' DATABASE',63,c,700);
  tx(gx+78,gy+156,(isTarget?'TARGET · LOGICAL SQL SERVER DB':'CURRENT · EF CORE ENTITY DB')+'  |  '+groups.get(schema).length+' TABLES',36,'#526278');
  const list=groups.get(schema),cols=[[],[]];
  // Put longest tables first for a well-balanced two-column layout.
  const sorted=[...list].sort((a,b)=>b.cols.length-a.cols.length);
  const weight=[0,0]; for(const t of sorted){const k=weight[0]<=weight[1]?0:1;cols[k].push(t);weight[k]+=100+Math.max(4,t.cols.length)*38+46;}
  const tw=1390, xx=[gx+72,gx+1570], ys=[gy+275,gy+275];
  cols.forEach((arr,k)=>arr.forEach(t=>{
   const h=110+t.cols.length*42+22;
   const x=xx[k],y=ys[k];
   pos[schema+'.'+t.name]={x,y,w:tw,h,col:k,groupX:gx,groupY:gy};
   ys[k]+=h+44;
  }));
 });
 // Relationship lines BEHIND table cards, with central/side routing lanes, no cross-database edges.
 let nEdges=0;
 for(const e of rel){
  const a=pos[e.schema+'.'+e.a],b=pos[e.schema+'.'+e.b];
  if(!a||!b)throw Error('Reference missing endpoint: '+JSON.stringify(e));
  const sc=color[e.schema]||'#6A8299';
  const ay=a.y+Math.min(100,a.h/2),by=b.y+Math.min(100,b.h/2);
  const same=a.col===b.col;
  let coords;
  if(!same){
   const center=a.groupX+1510;
   const ax=a.col===0?a.x+a.w:a.x;
   const bx=b.col===0?b.x+b.w:b.x;
   coords=[[ax,ay],[center,ay],[center,by],[bx,by]];
  }else{
   const lane=a.col===0?a.groupX+25:a.groupX+GW-25;
   const ax=a.col===0?a.x:a.x+a.w;
   const bx=b.col===0?b.x:b.x+b.w;
   coords=[[ax,ay],[lane,ay],[lane,by],[bx,by]];
  }
  put('<polyline fill="none" stroke="'+sc+'" stroke-opacity=".56" stroke-width="5" stroke-dasharray="'+(same?'0':'')+'" points="'+coords.map(p=>p.join(',')).join(' ')+'" marker-end="url(#end)"/>');nEdges++;
 }
 // Nodes after edges prevents lines from obscuring text.
 for(const [schema,tables] of groups){
  const c=color[schema]||'#53789F',f=bg[schema]||'#EFF5FC';
  for(const t of tables){
   const {x,y,w,h}=pos[schema+'.'+t.name];
   put('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#FFFFFF" stroke="'+c+'" stroke-width="4"/>');
   put('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="100" fill="'+c+'"/>');
   tx(x+36,y+70,t.name,49,'#FFFFFF',700);
   let yy=y+139;
   t.cols.forEach((field,i)=>{
    if(i%2===1)put('<rect x="'+(x+5)+'" y="'+(yy-37)+'" width="'+(w-10)+'" height="42" fill="#F4F7FB"/>');
    const key=field.pk?'PK':rel.some(e=>e.schema===schema&&e.a===t.name&&e.aCol===field.name)?'FK':field.unique?'UQ':'';
    if(key)tx(x+25,yy,key,26,key==='PK'?'#9A5B00':'#3B73AC',700);
    tx(x+115,yy,field.name,32,'#23344A',field.pk?700:400);
    tx(x+w-30,yy,field.type,30,'#63748C',400,'end');
    yy+=42;
   });
  }
 }
 const legendY=isTarget?6045:3280;
 put('<rect x="140" y="'+legendY+'" width="9320" height="180" fill="#F7F7F7" stroke="#999999" stroke-width="3"/>');
 tx(180,legendY+62,'PK = PRIMARY KEY    |    FK = FOREIGN KEY (ONLY WITHIN SAME LOGICAL DB)    |    UQ = UNIQUE    |    ARROWS = LOCAL RELATIONSHIPS',34,'#29405A',700);
 tx(180,legendY+125,(isTarget?'TARGET OWNERSHIP PROPOSAL · '+nEdges+' SQL FK links · Cross-service IDs are scalar references, NOT relational joins.':'CURRENT EF CORE MODELS · '+nEdges+' modeled local FKs · SQL Server migrations are the source of ultimate physical truth.'),31,'#577086');
 put('</svg>');
 fs.writeFileSync(path.join(dest,output),asGrayscale(markup.join('\n')),'utf8');
 console.log(output,'groups',schemas.length,'tables',Object.keys(pos).length,'refs',nEdges,'size',W,H);
}
render('06-database-target.dbml','06-database-target-one-page.svg','LONGEVITYDIET  |  TARGET DATABASE ARCHITECTURE','DBML SOURCE  •  33 LOGICAL ENTITY TYPES  •  SIX SEPARATE DATABASE OWNERS  •  ONE VECTOR SHEET');
render('06-database-current.dbml','06-database-current-one-page.svg','LONGEVITYDIET  |  CURRENT PHYSICAL ENTITY MAP','GENERATED FROM EF CORE CLASSES  •  18 MAPPED ENTITY SETS  •  THREE DBCONTEXT OWNERS  •  ONE VECTOR SHEET');
