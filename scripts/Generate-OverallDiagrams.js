'use strict';
// Source-audited, four-canonical-diagram pipeline.
// C0 / C1 / extended C2 / full Database Diagram are rendered in one
// coherent monochrome editorial system from the same current repository facts.
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const c4=require('./c4-architecture-manifest.json');
const c2=require('./c2-extended-manifest.json');
const rel=require('./unified-erd-manifest.json');
const model=require('./current-physical-schema.json');
const counts={};
for(const [key,g] of Object.entries(model.groups)){
 const content=fs.readFileSync(path.join(root,g.context),'utf8');
 const physical=[...content.matchAll(/\.ToTable\("([^"]+)"\)/g)].map(m=>m[1]).sort();
 const listed=Object.keys(g.columns).sort();
 if(JSON.stringify(physical)!==JSON.stringify(listed))throw Error('EF table mappings changed in '+key);
 if((content.match(/\.HasForeignKey(?:<[^>]+>)?\s*\(/g)||[]).length!==model.refs.filter(r=>r[0]===key).length)
  throw Error('EF foreign keys changed in '+key);
 counts[key]=listed.length;
}
if(JSON.stringify(counts)!==JSON.stringify({identity:21,tracking:7,worker:4})||
 model.refs.length!==9||rel.relationships.length!==31||c4.controllers.length!==10||c2.tableAccessLinks.length!==10)
 throw Error('Current physical/operational source counts require review before redrawing');
for(const x of c4.controllers){
 const location=path.join(root,'src/LongevityDiet.API/Controllers',x.controller+'.cs');
 if(!fs.existsSync(location))throw Error('Missing API component '+location);
}
const names=['C0','C1','C2','Database Diagram'];
const manifest={
 status:'CURRENT_IMPLEMENTED_SOURCE',
 names,
 controllers:c4.controllers,
 mappedTableCount:32,tableGroups:counts,sqlForeignKeys:model.refs.length,
 realRelationships:model.refs.map(([owner,parent,parentColumn,child,childColumn,cardinality])=>({owner,parent,parentColumn,child,childColumn,cardinality})),
 labels:{C0:'C0',C1:'C1',C2:'C2',database:'Database Diagram'},
 databaseCardNames:Object.values(model.groups).flatMap(g=>Object.keys(g.columns)),
 ports:c4.ports
};
fs.writeFileSync(path.join(root,'scripts/overall-diagram-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
require('./Generate-EditorialDiagrams.js');
require('./Generate-Connectivity-Register.js');
console.log('FOUR_EDITORIAL_DIAGRAMS=PASS '+names.join(' | ')+' / 32 mapped tables / 9 EF-declared SQL FK relationships');
