'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const attr=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
function parse(name){
 const xml=fs.readFileSync(path.join(root,'docs/assignment/one-page',name+'.drawio'),'utf8');
 const cells=[...xml.matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)].map(m=>attr(m[1]));
 const nodes=cells.filter(c=>c.vertex==='1'),edges=cells.filter(c=>c.edge==='1'),byId=new Map(nodes.map(c=>[c.id,c]));
 const graph=new Map();
 for(const e of edges){
  if(!byId.has(e.source)||!byId.has(e.target))throw Error(name+' dangling native connector '+e.id);
  for(const id of [e.source,e.target])if(!graph.has(id))graph.set(id,new Set());
  graph.get(e.source).add(e.target);graph.get(e.target).add(e.source);
 }
 const find=t=>nodes.filter(n=>(n.value||'').includes(t));
 const unique=t=>{const arr=find(t);if(arr.length!==1)throw Error(name+' nonunique component '+t+' '+arr.length);return arr[0];};
 const reach=id=>{const seen=new Set([id]),q=[id];while(q.length)for(const n of graph.get(q.shift())||[])if(!seen.has(n)){seen.add(n);q.push(n);}return seen;};
 return {nodes,edges,graph,find,unique,reach};
}
const c1=parse('C1'),c2=parse('C2'),erd=parse('Database Diagram');
const c1Names=['MEMBER','ADMIN  /  role','WEB / NGINX','REST API  (.NET)','RECOMMENDATION gRPC','REDIS STREAMS','REMINDER WORKER','LongevityDietDb','LongevityTrackingDb','LongevityWorkerDb'];
const connectedC1=c1.reach(c1.unique('MEMBER').id);
for(const name of c1Names){
 const n=c1.unique(name);
 if(!connectedC1.has(n.id)||(c1.graph.get(n.id)||new Set()).size===0)throw Error('C1 isolated component or DB '+name);
}
function hasDirected(a,b){const x=c1.unique(a),y=c1.unique(b);return c1.edges.some(e=>e.source===x.id&&e.target===y.id);}
for(const [a,b] of [
 ['WEB / NGINX','REST API  (.NET)'],['REST API  (.NET)','RECOMMENDATION gRPC'],
 ['REST API  (.NET)','LongevityDietDb'],['REST API  (.NET)','LongevityTrackingDb'],
 ['REMINDER WORKER','LongevityWorkerDb'],
 ['REST API  (.NET)','REDIS STREAMS'],['REDIS STREAMS','REST API  (.NET)'],
 ['REDIS STREAMS','REMINDER WORKER'],['REMINDER WORKER','REDIS STREAMS']
])if(!hasDirected(a,b))throw Error('C1 required direction missing '+a+' -> '+b);
for(const e of c1.edges)if(!(e.value||'').trim()||!(e.style||'').includes('endArrow=block'))throw Error('C1 unlabeled or undirected arrow '+e.id);
const spec=JSON.parse(fs.readFileSync(path.join(root,'scripts/current-physical-schema.json'),'utf8'));
const rel=JSON.parse(fs.readFileSync(path.join(root,'scripts/unified-erd-manifest.json'),'utf8'));
const c2manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/c2-extended-manifest.json'),'utf8'));
const dbCode={identity:'I',tracking:'T',worker:'W'},owners={};
for(const [db,g] of Object.entries(spec.groups))for(const t of Object.keys(g.columns))owners[t]=dbCode[db];
if(Object.keys(owners).length!==32||spec.refs.length!==9||rel.relationships.length!==31)throw Error('Current EF model counts changed');
if(!c2manifest.referenceTags||Object.keys(c2manifest.referenceTags).length!==10)throw Error('Missing 10 precise API-to-table reference codes');
function checkTableGraph(view,kind){
 const names=Object.keys(owners),cards=new Map();
 for(const name of names){
  const found=view.nodes.filter(n=>kind==='ERD'?(n.value||'').startsWith('&lt;b&gt;'+name+'&lt;/b&gt;'):
   (n.value||'').startsWith(name+'  ['+owners[name]+']'));
  if(found.length!==1)throw Error(kind+' SQL table not unique '+name+' count '+found.length);
  cards.set(name,found[0]);
  if((view.graph.get(found[0].id)||new Set()).size<1)throw Error(kind+' zero-degree table '+name);
 }
 const seen=view.reach(cards.get('Users').id);
 for(const [name,node] of cards)if(!seen.has(node.id))throw Error(kind+' table unreachable from Users '+name);
 for(const relation of rel.relationships){
  const a=cards.get(relation.from),b=cards.get(relation.to);
  const match=view.edges.filter(e=>e.source===a.id&&e.target===b.id);
  if(match.length!==1)throw Error(kind+' missing or duplicated relation '+relation.from+' -> '+relation.to);
  const style=match[0].style||'';
  if(relation.kind==='sql'){
   if(!spec.refs.some(r=>r[1]===relation.from&&r[3]===relation.to&&r[5]===relation.cardinality)||
      !style.includes('startArrow=ERmandOne')||!style.includes('endArrow='+(relation.cardinality==='1:1'?'ERmandOne':'ERmany')))
    throw Error(kind+' fabricated or untyped SQL FK '+relation.from+' -> '+relation.to);
  }else if(!style.includes('dashed=1'))throw Error(kind+' logical/event incorrectly drawn as SQL FK '+relation.from+' -> '+relation.to);
 }
 return cards;
}
const dbCards=checkTableGraph(erd,'ERD'),c2Cards=checkTableGraph(c2,'C2');
const c2Reach=c2.reach(c2.unique('WEB / NGINX').id);
for(const [name,node] of c2Cards)if(!c2Reach.has(node.id))throw Error('C2 SQL table not reachable from actual Web/API flow '+name);
for(const [controller,table] of c2manifest.tableAccessLinks){
 const tag=c2manifest.referenceTags[table],tableNode=c2Cards.get(table);
 if(!tag||!tableNode.value.includes('  |  '+tag))throw Error('C2 table missing visible navigation tag '+table);
 const refs=c2.nodes.filter(n=>(n.value||'').includes('DATA REFERENCE '+tag));
 if(refs.length!==1||!refs[0].value.includes(table)||!c2Reach.has(refs[0].id))
  throw Error('C2 mismatched/disconnected API reference '+controller+' -> '+table+' / '+tag);
 if(!c2.nodes.some(n=>(n.value||'').includes(controller)))throw Error('C2 controller missing '+controller);
}
const register=fs.readFileSync(path.join(root,'docs/assignment/04-ARCHITECTURE-CONNECTIVITY-REGISTER.md'),'utf8');
for(const table of Object.keys(owners))if(!register.includes('| '+table+' |'))throw Error('Connectivity register missing source-mapped table '+table);
for(const tag of Object.values(c2manifest.referenceTags))if(!register.includes('**'+tag+'**'))throw Error('Connectivity register missing API locator '+tag);
const c1Databases=['LongevityDietDb','LongevityTrackingDb','LongevityWorkerDb'];
for(const db of c1Databases)if(!connectedC1.has(c1.unique(db).id))throw Error('C1 missing reachable database '+db);
console.log('ARCHITECTURE_CONNECTIVITY_AUDIT=PASS C1 '+c1Names.length+'/10 real nodes connected; C2 10/10 exact reference tags and 32/32 tables reachable; ERD 32/32 tables reachable; 9 SQL FK verified; 16 APP; 6 EVENT');
