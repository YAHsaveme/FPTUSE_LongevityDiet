const fs = require('fs');
const path = require('path');

const ROOT = 'D:/PRN232/PRN232_LongevityDiet';
const OUT = path.join(ROOT, 'docs/architecture/10-production-secure-deployment.drawio');

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
let id = 2;
const cells = ['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'];
function vid(prefix='c'){ return `${prefix}${id++}`; }
function vertex(value,x,y,w,h,style,cid){
  const i=cid||vid();
  cells.push(`<mxCell id="${i}" value="${esc(value)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
  return i;
}
function text(value,x,y,w,h,size=14,bold=false,align='left'){
  const style=`text;html=1;strokeColor=none;fillColor=none;align=${align};verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Arial;fontColor=#1F2937;fontSize=${size};${bold?'fontStyle=1;':''}`;
  return vertex(value,x,y,w,h,style);
}
function edge(source,target,{dashed=false,exit=[.5,.5],entry=[.5,.5],points=[]}={}){
  const i=vid('e');
  const style=`edgeStyle=orthogonalEdgeStyle;rounded=0;curved=0;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;endSize=12;strokeColor=#374151;strokeWidth=2;${dashed?'dashed=1;dashPattern=7 5;':''}exitX=${exit[0]};exitY=${exit[1]};exitDx=0;exitDy=0;entryX=${entry[0]};entryY=${entry[1]};entryDx=0;entryDy=0;`;
  let pts='';
  if(points.length){ pts='<Array as="points">'+points.map(([x,y])=>`<mxPoint x="${x}" y="${y}"/>`).join('')+'</Array>'; }
  cells.push(`<mxCell id="${i}" style="${style}" edge="1" parent="1" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry">${pts}</mxGeometry></mxCell>`);
  return i;
}

const BOX='rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#374151;strokeWidth=2;fontFamily=Arial;fontColor=#1F2937;align=center;verticalAlign=middle;';
const DB=BOX+'shape=cylinder3;boundedLbl=1;backgroundOutline=1;';
const QUEUE=BOX+'shape=process;size=0.08;';
const BOUND='rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#FFFFFF;fillOpacity=0;strokeColor=#6B7280;strokeWidth=2;dashed=1;dashPattern=8 6;';
const PRIVATE='rounded=1;arcSize=10;whiteSpace=wrap;html=1;fillColor=#F9FAFB;fillOpacity=45;strokeColor=#9CA3AF;strokeWidth=2;dashed=1;dashPattern=8 6;';
const EXT=BOX+'dashed=1;dashPattern=8 6;';
function box(name,type,tech,resp){ return `<b>${name}</b><br><font style='font-size:13px'>[${type}]</font><br><font style='font-size:13px'>${tech}</font><br><font style='font-size:13px'>${resp}</font>`; }

text('C4 Deployment - Production Target - Longevity Diet Companion',60,35,1900,50,27,true);
text('Secure transport and private runtime topology.',60,88,1200,32,13,false);
vertex('',390,190,1710,900,BOUND,'prod-boundary');
text('<b>Production Environment</b> [Target]',420,205,420,34,16,false);
vertex('',960,285,1100,650,PRIVATE,'private-boundary');
text('<b>Private Application Network</b>',990,300,430,32,15,false);

const browser=vertex(box('User Browser','Deployment Node','Web Browser','Web Application instance'),80,450,230,170,EXT);
const edgeNode=vertex(box('Web Edge','Infrastructure Node','Nginx / TLS','Serve SPA + proxy /api'),470,445,300,180,BOX+'strokeWidth=3;');
const api=vertex(box('REST API','Container Instance','ASP.NET Core / .NET 9','Application API'),1420,380,280,180,BOX);
const grpc=vertex(box('Recommendation Service','Container Instance','gRPC / .NET 9','Meal ranking'),1810,380,220,180,BOX);
const sql=vertex(box('SQL Database','Container Instance','SQL Server 2022','System of record'),1030,720,280,180,DB);
const worker=vertex(box('Background Worker','Container Instance','.NET 9 Worker','Async jobs'),1420,720,280,180,BOX);
const redis=vertex(box('Event Streams','Container Instance','Redis 7 Streams','Async events'),1830,720,200,180,QUEUE);

edge(browser,edgeNode,{exit:[1,.5],entry:[0,.5]});
text('HTTPS / TLS',325,475,130,28,13,false,'center');

edge(edgeNode,api,{exit:[1,.5],entry:[0,.5],points:[[880,535],[880,470]]});
text('HTTPS / REST',1010,430,170,28,13,false,'center');

edge(api,grpc,{exit:[1,.5],entry:[0,.5]});
text('gRPC / HTTP/2 + TLS',1705,425,100,30,12,false,'center');

edge(api,sql,{exit:[.5,1],entry:[.5,0],points:[[1560,650],[1170,650]]});
text('EF Core / TDS',1300,610,180,28,13,false,'center');

edge(worker,sql,{exit:[0,.5],entry:[1,.5]});
text('EF Core / TDS',1315,760,100,28,12,false,'center');

edge(worker,redis,{dashed:true,exit:[1,.5],entry:[0,.5]});
text('Redis Streams',1705,760,70,28,12,false,'center');

text('<b>Security boundary</b>  Only Web Edge is public. SQL Server and Redis have no public application ports.',1030,975,820,34,13,false,'center');
text('<b>Legend</b>  Solid = synchronous | Dashed = asynchronous | Dashed frame = deployment/network boundary',480,1135,1200,34,13,false,'center');

const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" modified="2026-10-05T14:10:00+07:00" agent="LongevityDiet Production Deployment Generator" version="31.4.5" type="device">\n  <diagram id="Production-Secure-Deployment" name="Page-1">\n    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="2200" pageHeight="1220" math="0" shadow="0">\n      <root>\n        ${cells.join('\n        ')}\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n`;
fs.writeFileSync(OUT,xml,'utf8');
console.log('WROTE',OUT);
