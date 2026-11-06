'use strict';
// Four canonical current-source diagrams, no extra numbered/partial diagrams.
// C0/C1/C2 monochrome C4: actual ports, components, SQL ownership.
// Database Diagram: source-verified EF entities and relationship types.
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const c4File=path.join(root,'scripts/c4-architecture-manifest.json');
require('./Generate-C4Architecture.js');
require('./Generate-UnifiedERD.js');
const c4=JSON.parse(fs.readFileSync(c4File,'utf8'));
const schema=JSON.parse(fs.readFileSync(path.join(root,'scripts/current-physical-schema.json'),'utf8'));
const counts=Object.fromEntries(Object.entries(schema.groups).map(([key,g])=>[key,Object.keys(g.columns).length]));
if(JSON.stringify(counts)!==JSON.stringify({identity:21,tracking:7,worker:4})||schema.refs.length!==9)throw Error('Physical schema source drift');
for(const [key,meta] of Object.entries(schema.groups)){
 const text=fs.readFileSync(path.join(root,meta.context),'utf8');
 const mapped=[...text.matchAll(/\.ToTable\("([^"]+)"\)/g)].map(m=>m[1]).sort();
 if(JSON.stringify(mapped)!==JSON.stringify(Object.keys(meta.columns).sort()))throw Error('Mapped table drift in '+key);
 if((text.match(/\.HasForeignKey(?:<[^>]+>)?\s*\(/g)||[]).length!==schema.refs.filter(r=>r[0]===key).length)throw Error('SQL FK drift in '+key);
}
const manifest={
 status:'CURRENT_IMPLEMENTED_SOURCE',
 names:['C0','C1','C2','Database Diagram'],
 controllers:c4.controllers,
 mappedTableCount:Object.values(counts).reduce((a,b)=>a+b,0),
 tableGroups:counts,
 sqlForeignKeys:schema.refs.length,
 realRelationships:schema.refs.map(([owner,parent,parentColumn,child,childColumn,cardinality])=>({owner,parent,parentColumn,child,childColumn,cardinality})),
 labels:{C0:'C0',C1:'C1',C2:'C2',database:'Database Diagram'},
 databaseCardNames:Object.values(schema.groups).flatMap(g=>Object.keys(g.columns)),
 ports:c4.ports
};
fs.writeFileSync(path.join(root,'scripts/overall-diagram-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('FOUR_CANONICAL_DIAGRAMS_COMPLETE',manifest.names.join(','),'32 mapped tables, 9 SQL foreign keys');
