
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'docs/assignment/one-page');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'full-schema-manifest.json'),'utf8'));
const xml=fs.readFileSync(path.join(dir,'Database Diagram FULL.drawio'),'utf8');
function check(ok,msg){if(!ok)throw Error('FULL_SCHEMA_QA_FAIL '+msg);}
check(manifest.tableCount===56&&manifest.tables.length===56,'missing physical tables');
check(manifest.groups.main===45&&manifest.groups.tracking===7&&manifest.groups.worker===4,'inconsistent SQL catalogs');
check(manifest.physicalFkCount===23,'declared EF SQL FKs changed');
const names=new Set(manifest.tables.map(x=>x.id));
check(names.size===56,'duplicate physical keys');
const links=new Map([...names].map(n=>[n,new Set()]));
for(const e of manifest.relations){
 check(names.has(e.from)&&names.has(e.to),'unbound relation endpoint');
 if(e.kind==='SQL_FK')check(e.from.split(':')[0]===e.to.split(':')[0],'fake cross-database SQL FK');
 links.get(e.from).add(e.to);links.get(e.to).add(e.from);
}
check([...links.values()].every(x=>x.size>0),'disconnected table');
const visited=new Set(),stack=['main:Users'];
while(stack.length){const current=stack.pop();if(visited.has(current))continue;visited.add(current);for(const next of links.get(current)||[])if(!visited.has(next))stack.push(next);}
check(visited.size===names.size,'multiple unconnected graphs: '+[...names].filter(x=>!visited.has(x)).join(', '));
check((xml.match(/edge="1"/g)||[]).length===manifest.relations.length,'native arrows missing');
check((xml.match(/shape=umlActor/g)||[]).length===0,'database diagram must not show fake people');
check(xml.includes('page="1"')&&xml.includes('pageWidth="9000"'),'not a single-page diagram');
check(!/fillColor=#(?!FFFFFF)/i.test(xml),'colored table found');
const geometry=[...xml.matchAll(/<mxCell id="(n\d+)"[^>]*vertex="1"[^>]*><mxGeometry x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)];
check(geometry.length>=56,'not enough source-backed vertices');
console.log('FULL_SCHEMA_DIAGRAM_QA=PASS 56/56 tables; 23 SQL FK; '+manifest.logicalAssociations+' APP; '+manifest.relations.length+' native arrows; one connected graph; one monochrome page');
