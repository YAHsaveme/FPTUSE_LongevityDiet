'use strict';
// Current four-canonical-diagram pipeline. C0/C1 remain verified current
// context/container diagrams; C2 and DB Diagram are source-generated below.
// Historical 32-table generator is archived in docs/assignment/legacy-diagrams.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'docs/assignment/one-page');
for(const name of ['C0','C1']){
 if(!fs.existsSync(path.join(dir,name+'.drawio')))
  throw Error('Current C0/C1 diagram missing: '+name);
}
require('./Generate-CompleteSchemaDiagram.js');
require('./Generate-TreeSchemaDiagram.js');
require('./Generate-CurrentC2.js');
fs.copyFileSync(path.join(dir,'Database Diagram FULL.drawio'),path.join(dir,'Database Diagram.drawio'));
const schema=require('../docs/assignment/one-page/full-schema-manifest.json');
const c2=require('../docs/assignment/one-page/c2-current-manifest.json');
if(schema.tableCount!==56||c2.controllers.length!==22)throw Error('Physical/controller source drift');
console.log('FOUR_CURRENT_DIAGRAM_SOURCES_READY=C0 C1 C2 Database Diagram (22 controllers, 56 tables)');
