'use strict';
/**
 * The ONLY official source + exported diagram acceptance.
 * Exactly 5 native editable diagrams and exactly 5 one-page PDFs.
 * No obsolete 32/56-table duplicates, FULL copies, or detached connectors.
 */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'docs','assignment','one-page');
const names=['C0','C1','C2','Database Diagram','Business Flow'];
const errors=[];
function check(ok,message){if(!ok)errors.push(message)}
const actual=fs.readdirSync(dir)
 .filter(n=>/\.(drawio|pdf)$/i.test(n)).sort();
const expected=names.flatMap(n=>[n+'.drawio',n+'.pdf']).sort();
check(JSON.stringify(actual)===JSON.stringify(expected),
  'Official folder must contain exactly 5 editable Draw.io + 5 PDF files: '+actual.join(', '));
check(!fs.existsSync(path.join(root,'docs','assignment','legacy-diagrams')),
  'Obsolete legacy-diagrams directory still exists');
check(!fs.existsSync(path.join(root,'docs','assignment','nutrition-target-52-tables.dbml')),
  'Old candidate ERD DBML still present as a second database diagram');
let totalCells=0,tableCells=0;
const diagrams={};
for(const name of names){
 const drawio=path.join(dir,name+'.drawio');
 const pdf=path.join(dir,name+'.pdf');
 if(!fs.existsSync(drawio)||!fs.existsSync(pdf)){check(false,'Missing '+name);continue}
 const xml=fs.readFileSync(drawio,'utf8');
 const bin=fs.readFileSync(pdf,'latin1');
 check(xml.includes('<mxfile')&&xml.includes('<mxGraphModel'),
   'Invalid diagrams.net container: '+name);
 const vertices=[...xml.matchAll(/<mxCell\b[^>]*\bvertex="1"[^>]*>/g)]
  .map(m=>m[0]);
 const edges=[...xml.matchAll(/<mxCell\b[^>]*\bedge="1"[^>]*>/g)]
  .map(m=>m[0]);
 const ids=new Set(vertices.map(s=>(s.match(/\bid="([^"]+)"/)||[])[1]));
 // Every drawn functional component MUST have a real directed connector.
 // Text captions, titles, boundary panels and routing spines are annotations.
 const connected=new Set();
 for(const e of edges) {
  connected.add((e.match(/\bsource="([^"]+)"/)||[])[1]);
  connected.add((e.match(/\btarget="([^"]+)"/)||[])[1]);
 }
 for(const cell of vertices){
  const id=(cell.match(/\bid="([^"]+)"/)||[])[1];
  const freeText=/^(title-|label-|heading-|fk-|footer|bottom-rule)/.test(id);
  const group=/^(panel-|box-)/.test(id);
  check(freeText||group||connected.has(id),
    name+' orphan functional node '+id);
 }
 check(new Set([...ids]).size===vertices.length,'Duplicate node ids '+name);
 for(const e of edges){
  const source=(e.match(/\bsource="([^"]+)"/)||[])[1],
   target=(e.match(/\btarget="([^"]+)"/)||[])[1];
  check(ids.has(source)&&ids.has(target),
    'Disconnected edge in '+name+': '+source+' -> '+target);
 }
 check((bin.match(/\/Type\s*\/Page\b/g)||[]).length===1,
   'PDF must be exactly one page: '+name);
 check(fs.statSync(pdf).size>3500,'Empty PDF '+name);
 check(fs.statSync(pdf).mtimeMs>=fs.statSync(drawio).mtimeMs-5000,
   'Stale PDF export compared with source: '+name);
 const hexColors=[...xml.matchAll(/#[A-Fa-f0-9]{6}\b/g)]
  .map(x=>x[0].toUpperCase());
 check(hexColors.every(x=>x==='#000000'||x==='#FFFFFF'),
   'Non-black/white style '+name);
 check((xml.match(/edgeStyle=segmentEdgeStyle/g)||[]).length === edges.length,
   name+' connectors must be square orthogonal segments');
 check(edges.every(e=>/value=""/.test(e)),
   name+' edge labels must be detached and positioned off arrow strokes');
 check(!xml.includes('edgeStyle=elbowEdgeStyle') &&
   !xml.includes('curved=1') &&
   !xml.includes('rounded=1;orthogonalLoop'),
   'Avoid bent or curved connectors '+name);
 diagrams[name]={xml,vertices,edges};
 totalCells+=vertices.length+edges.length;
 if(name==='Database Diagram')
  tableCells=vertices.filter(x=>/\bid="tbl-/.test(x)).length;
 if(name==='C0')check(vertices.filter(x=>x.includes('shape=umlActor')).length===2,
   'C0 should include exactly 2 real UML actors');
}
for(const name of ['C1','C2','Business Flow']){
 const xml=diagrams[name]?.xml||'';
 check(/RabbitMQ/i.test(xml) && /OPTIONAL/i.test(xml),
   name+' must show optional, actually integrated RabbitMQ audit transport');
 check(/REDIS STREAMS/i.test(xml),
   name+' must also show actually implemented Redis Streams');
}
for(const name of ['C0','Database Diagram'])
 check(!/RabbitMQ/i.test(diagrams[name]?.xml||''),
   name+' must not invent RabbitMQ within context or SQL schema');
for(const name of ['C1','C2','Database Diagram'])
 check(diagrams[name]?.xml.includes('ADR-005 TARGET QA'),
  name+' must explicitly identify the opt-in Target QA rather than default runtime');
check(diagrams.C1?.xml.includes('UI HTTPS :443 (TARGET)') &&
 diagrams.C1?.xml.includes('REST HTTP / JWT nội bộ'),
 'C1 must distinguish planned public HTTPS :443 from actual internal HTTP :80/:8080');
check((diagrams.C1?.xml.match(/id="db-(identity|catalog|planning|tracking|recommendation|worker)"/g)||[]).length===6,
  'C1 must show all six owned SQL databases');
check((diagrams.C2?.xml.match(/id="panel-(id|cat|plan|track|rec|work)"/g)||[]).length===6,
  'C2 must show six bounded contexts');
check((diagrams['Business Flow']?.xml.match(/id="edge-fmd-(1|2|3)"/g)||[]).length===3,
  'FMD must have one entry and separate yes/no branches');
const modelFiles=[
 'src/LongevityDiet.Identity/IdentityDbContext.cs',
 'src/LongevityDiet.Catalog/CatalogDbContext.cs',
 'src/LongevityDiet.Planning/PlanningDbContext.cs',
 'src/LongevityDiet.Tracking/TrackingDbContext.cs',
 'src/LongevityDiet.Recommendation.Grpc/Ownership/RecommendationDbContext.cs',
 'src/LongevityDiet.Worker/Reminders/ReminderWorkerDbContext.cs',
 'src/LongevityDiet.Worker.Ops/WorkerOpsDbContext.cs',
];
let targetDbSets=0;
for(const file of modelFiles){
 const src=fs.readFileSync(path.join(root,file),'utf8');
 targetDbSets += [...src.matchAll(/public DbSet<([^>]+)>/g)].length;
}
// EF Core creates one implicit many-to-many physical join table, despite no
// public DbSet. Physical SQL inventory (6 target DBs) confirms 50 tables.
const joinFile=fs.readFileSync(path.join(root,
 'src/LongevityDiet.Repositories/Catalog/Configurations/RuleSetVersionConfiguration.cs'),'utf8');
const hasImplicitCatalogJoin=joinFile.includes('RuleSetVersionItem') &&
 joinFile.includes('UsingEntity<Dictionary<string, object>>');
check(hasImplicitCatalogJoin,'Missing implicit physical Catalog RuleSetVersionItems table.');
check(targetDbSets===49,'Unexpected entity ownership DbSet count: '+targetDbSets);
const physicalTableCount=targetDbSets+(hasImplicitCatalogJoin?1:0);
check(physicalTableCount===50,'Unexpected target physical table count: '+physicalTableCount);
check(tableCells===physicalTableCount,
 'ERD must list ALL physical tables including implicit EF join: '+tableCells+
 ' != '+physicalTableCount);
check(diagrams['Database Diagram']?.xml.includes('RuleSetVersionItems'),
 'ERD must show real RuleSetVersionItems SQL join table.');
// The lecturer-facing handover must describe the same physical SQL inventory
// and five official diagrams that this validator checks in source/PDF.
const handover=fs.readFileSync(path.join(root,
 'docs/assignment/00-ASSIGNMENT-DOCUMENT.md'),'utf8');
const demo=fs.readFileSync(path.join(root,
 'docs/assignment/PRN232-FINAL-DEMO-7-STEPS.md'),'utf8');
check(handover.includes('50 physical tables') &&
 handover.includes('RuleSetVersionItems') && handover.includes('20 source-confirmed'),
 'Assignment handover must explain 50 physical tables, implicit EF join and 20 SQL FKs');
check(demo.includes('**năm**') && demo.includes('Business Flow') &&
 demo.includes('50 bảng vật lý / 20 SQL foreign keys'),
 'Official demo must present five diagrams with accurate 50-table/20-FK target ERD');
check(demo.includes('Validate-OfficialArchitecture.js') &&
 !demo.includes('node scripts/Validate-OverallDiagrams.js'),
 'Official demo must invoke current five-diagram validation, not a legacy diagram validator');
check(demo.includes('RabbitMQ chỉ là audit mirror tùy chọn'),
 'Official demo must not misrepresent optional RabbitMQ as required course transport');
if(errors.length){
 console.error(errors.map(x=>'FAIL: '+x).join('\n'));
 process.exitCode=1;
}else{
 console.log('OFFICIAL_FIVE_ARCHITECTURE_QA=PASS diagrams='+names.length+
  ' tables='+tableCells+' nativeCells='+totalCells+' pdfPages=5');
}
