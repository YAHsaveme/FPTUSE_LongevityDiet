'use strict';
// Real RabbitMQ/Redis -> Worker-owned SQL acceptance. Synthetic QA only.
// The RabbitMQ audit mirror must not leak personal-domain payloads.
import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
let checks=0;
function run(bin,args,input,timeout=25000){
 const r=spawnSync(bin,args,{encoding:'utf8',input,timeout});
 if(r.error||r.status!==0)throw Error(bin+' failed: '+String(r.stderr).slice(0,500));
 return r.stdout.trim();
}
function check(label,value){assert.ok(value,label);checks++;console.log('PASS '+label)}
function docker(...args){return run('docker',args)}
// Find containers from Compose service labels, no guessed names.
function service(name){
 const ids=docker('ps','-q','--filter','label=com.docker.compose.service='+name)
   .split(/\s+/).filter(Boolean);
 if(ids.length!==1)throw Error('QA service '+name+' must have one running container; found '+ids.length);
 const details=JSON.parse(docker('inspect',ids[0]))[0];
 const project=details.Config.Labels['com.docker.compose.project'];
 if(process.env.GITHUB_ACTIONS!=='true' && project!=='prn232-acceptance')
   throw Error('Refusing to use non-QA Docker Compose project: '+project);
 return ids[0];
}
const sqlId=service('sqlserver'),redisId=service('redis'),rabbitId=service('rabbitmq');
service('worker-ops');
function sql(q){
 return run('docker',['exec','-i',sqlId,'sh','-lc',
  '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" '+
  '-C -W -h -1 -d LongevityWorkerDb -b'], 'SET NOCOUNT ON;\n'+q+'\nGO\n')
  .split(/\r?\n/).map(s=>s.trim()).filter(Boolean).join('');
}
function count(source,id){
 const q="SELECT COUNT_BIG(*) FROM dbo.WorkerReceivedEvents WHERE [Source] = '"+source+
  "' AND [EventId] = '"+id+"';";
 return Number(sql(q).match(/\d+/)?.[0]||NaN);
}
function redis(...args){return docker('exec',redisId,'redis-cli',...args)}
async function wait(label,test,maxMs=35000){
 const end=Date.now()+maxMs;
 while(Date.now()<end){
  if(test()){checks++;console.log('PASS '+label);return}
  await new Promise(r=>setTimeout(r,1200));
 }
 throw Error('Timed out: '+label);
}
(async()=>{
 check('RABBIT_CONTAINER_RUNNING',
   docker('exec',rabbitId,'rabbitmq-diagnostics','-q','ping').length>=0);
 const id=randomUUID();
 const payload=JSON.stringify({eventId:id,test:true,sensitive:'DO-NOT-COPY-TO-RABBIT'});
 const streamId=redis('XADD','ldc:planning-events','*',
  'eventId',id,'eventType','PreferencesUpdated.v1','payload',payload);
 check('REDIS_PUBLISHED_SYNTHETIC_EVENT',/^\d+-\d+$/.test(streamId));
 await wait('RABBIT_EVENT_PERSISTED_IN_WORKER_SQL',()=>count('rabbit-planning',id)===1,60000);
 const qlist=docker('exec',rabbitId,'rabbitmqctl','list_queues','name','messages_ready');
 check('RABBIT_DURABLE_QUEUE_EXISTS',qlist.includes('ldc.worker-ops.audit.v1'));
 const duplicate=redis('XADD','ldc:planning-events','*',
  'eventId',id,'eventType','PreferencesUpdated.v1','payload',payload);
 check('REDIS_DUPLICATE_DELIVERED',/^\d+-\d+$/.test(duplicate));
 await wait('RABBIT_DUPLICATE_REDELIVERY_DEDUPED',()=>{
  const group=redis('XPENDING','ldc:planning-events','ldc-rabbit-audit-planning');
  return group.split(/\r?\n/)[0]==='0' && count('rabbit-planning',id)===1;
 },45000);
 const invalidId=redis('XADD','ldc:planning-events','*',
  'eventId','not-a-guid','eventType','Invalid.v1','payload','{}');
 await wait('MALFORMED_REDIS_ENVELOPE_QUARANTINED',()=>{
  const found=redis('XRANGE','ldc:rabbit-audit-rejected','-','+');
  return found.includes(invalidId);
 },45000);
 const src=fs.readFileSync(path.join(__dirname,'..','src',
  'LongevityDiet.Worker.Ops','RabbitMqDomainAudit.cs'),'utf8');
 check('RABBIT_PAYLOAD_METADATA_ONLY',
  src.includes('JsonSerializer.Serialize(evt)') && !src.includes('Serialize(payload)'));

 // Optional destructive-to-QA-only broker outage/recovery rehearsal.
 // Never run --outage on a shared or production Docker project.
 if(process.argv.includes('--outage')){
  check('RABBIT_QA_PROJECT_ISOLATED',
    process.env.GITHUB_ACTIONS==='true' ||
    JSON.parse(docker('inspect',rabbitId))[0].Config.Labels['com.docker.compose.project']
      ==='prn232-acceptance');
  docker('stop',rabbitId);
  const retryId=randomUUID();
  const retryPayload=JSON.stringify({eventId:retryId,test:true});
  const pendingId=redis('XADD','ldc:planning-events','*',
    'eventId',retryId,'eventType','PreferencesUpdated.v1',
    'payload',retryPayload);
  check('REDIS_ACCEPTS_EVENTS_WHEN_BROKER_OFFLINE',
    pendingId.includes('-') && count('rabbit-planning',retryId)===0);
  await new Promise(r=>setTimeout(r,1800));
  docker('start',rabbitId);
  await wait('RABBIT_BROKER_RECOVERS',()=>{
   try{docker('exec',rabbitId,'rabbitmq-diagnostics','-q','ping');return true}
   catch{return false}
  },90000);
  await wait('RABBIT_PENDING_EVENT_REDELIVERED_AFTER_OUTAGE',
    ()=>count('rabbit-planning',retryId)===1,90000);
 }
 console.log('RABBITMQ_REAL_E2E=PASS checks='+checks);
})().catch(e=>{console.error('RABBITMQ_REAL_E2E=FAIL '+e.message);process.exitCode=1});
