// Dependency-free Chrome DevTools layout QA, isolated browser profile.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawn, spawnSync} = require('node:child_process');

const EDGE = process.env.EDGE_PATH ||
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE = process.env.WEB_BASE_URL || 'http://127.0.0.1:5173';
const uri = new URL(BASE);
if (!['127.0.0.1','localhost','[::1]'].includes(uri.hostname)) {
  throw new Error('Only local isolated QA websites are allowed.');
}
if (!fs.existsSync(EDGE)) throw new Error('Edge executable not found');
const artifacts = process.env.WEB_QA_ARTIFACTS ||
  (fs.existsSync('D:\\PRN232\\DockerRuntime\\tmp')
    ? 'D:\\PRN232\\DockerRuntime\\tmp\\browser-qa'
    : path.join(os.tmpdir(), 'longevity-browser-qa'));
fs.mkdirSync(artifacts,{recursive:true});
const profile = fs.mkdtempSync(path.join(artifacts,'cdp-profile-'));
const sleep = ms=>new Promise(r=>setTimeout(r,ms));
let browser, socket, nextId=0;
const pending = new Map();

function command(method, params={}) {
  return new Promise((resolve,reject)=>{
    const id=++nextId;
    const timeout=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method))},15000);
    pending.set(id,{resolve,reject,timeout});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function connectSocket(url){
  socket=new WebSocket(url);
  socket.addEventListener('message',event=>{
    const result=JSON.parse(event.data);
    if(!result.id || !pending.has(result.id)) return;
    const wait=pending.get(result.id);
    pending.delete(result.id);
    clearTimeout(wait.timeout);
    if(result.error)wait.reject(new Error(result.error.message));
    else wait.resolve(result.result);
  });
  await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('CDP connection timed out')),12000);
    socket.addEventListener('open',()=>{clearTimeout(timeout);resolve()},{once:true});
    socket.addEventListener('error',event=>{clearTimeout(timeout);reject(new Error('CDP connect error: '+event.type))},{once:true});
  });
}
const checkExpression='('+function(){
  const viewport=window.innerWidth;
  const layoutWidth=document.documentElement.clientWidth;
  const bodyScrollWidth=document.body.scrollWidth;
  const fullScrollWidth=document.documentElement.scrollWidth;
  const selected=[...document.querySelectorAll(
    '.hero-copy h1, .auth-copy h1, .form-heading h2, .hero-description, .auth-copy p, .auth-form, .field-control, .topbar, .auth-panel'
  )];
  const boxes=selected.map(el=>{
    const rect=el.getBoundingClientRect();
    let rangeRight=rect.right,rangeLeft=rect.left;
    if(/^(H1|H2|P)$/.test(el.tagName)){
      const range=document.createRange(); range.selectNodeContents(el);
      for(const x of range.getClientRects()){
        rangeRight=Math.max(rangeRight,x.right);
        rangeLeft=Math.min(rangeLeft,x.left);
      }
    }
    return {
      selector:el.className||el.tagName,tag:el.tagName,
      left:+rect.left.toFixed(1),right:+rect.right.toFixed(1),
      rectWidth:+rect.width.toFixed(1),scrollWidth:el.scrollWidth,overflowX:getComputedStyle(el).overflowX,
      clientWidth:el.clientWidth,rangeRight:+rangeRight.toFixed(1),
      rangeLeft:+rangeLeft.toFixed(1),font:getComputedStyle(el).fontSize
    };
  });
  return {viewport,layoutWidth,bodyScrollWidth,fullScrollWidth,boxes,
    title:document.title,lang:document.documentElement.lang,
    inputs:document.querySelectorAll('input').length,
    labels:document.querySelectorAll('label').length,
    hasHero:!!document.querySelector('.hero-copy h1'),
    hasAuth:!!document.querySelector('.auth-form')};
}.toString()+')()';

async function run(){
  browser=spawn(EDGE,[
    '--headless=new','--disable-gpu','--disable-extensions',
    '--no-first-run','--no-default-browser-check',
    '--disable-background-networking','--remote-debugging-port=0',
    '--remote-allow-origins=*','--user-data-dir='+profile,'about:blank'
  ],{stdio:'ignore'});
  const portFile=path.join(profile,'DevToolsActivePort');
  let port;
  for(let i=0;i<100;i++){
    if(fs.existsSync(portFile)){
      port=+fs.readFileSync(portFile,'utf8').split(/\r?\n/)[0];
      break;
    }
    if(browser.exitCode!==null)throw new Error('Edge exited unexpectedly');
    await sleep(100);
  }
  if(!port)throw new Error('CDP port unavailable');
  let tab;
  for(let i=0;i<50;i++){
    try{
      const res=await fetch('http://127.0.0.1:'+port+'/json/list');
      const tabs=await res.json();
      tab=tabs.find(t=>t.type==='page');
      if(tab)break;
    }catch{}
    await sleep(100);
  }
  if(!tab)throw new Error('CDP tab unavailable');
  await connectSocket(tab.webSocketDebuggerUrl);
  await command('Page.enable');
  await command('Runtime.enable');
  const cases=[
    {name:'home-mobile',route:'/',width:390,height:844},
    {name:'login-mobile',route:'/login',width:390,height:844},
    {name:'register-mobile',route:'/register',width:390,height:844},
    {name:'home-small',route:'/',width:320,height:740},
    {name:'login-small',route:'/login',width:320,height:740},
    {name:'home-desktop',route:'/',width:1365,height:768}
  ];
  let failures=0;
  for(const c of cases){
    await command('Emulation.setDeviceMetricsOverride',
      {width:c.width,height:c.height,deviceScaleFactor:1,mobile:c.width<600});
    await command('Page.navigate',{url:BASE+c.route});
    for(let k=0;k<90;k++){
      await sleep(100);
      const res=await command('Runtime.evaluate',{expression:checkExpression,returnByValue:true});
      const val=res.result?.value;
      if(val&&(c.route==='/'?val.hasHero:val.hasAuth)){
        await sleep(300);
        break;
      }
    }
    const response=await command('Runtime.evaluate',{expression:checkExpression,returnByValue:true});
    const state=response.result.value;
    const offenders=state.boxes.filter(b=>{
      const text=(b.tag==='H1'||b.tag==='H2'||b.tag==='P') &&
        (b.rangeRight>state.layoutWidth+2||b.rangeLeft< -2);
      const box=b.rectWidth>0&&(b.right>state.layoutWidth+2||b.left< -2);
      // Decorative ::after circles intentionally overflow clipped panels;
      // scrollWidth includes them even though they are not visible or scrollable.
      const scroll=b.overflowX!=='hidden'&&b.overflowX!=='clip'&&
        b.scrollWidth>b.clientWidth+2;
      return text||box||scroll;
    });
    const okay=state.viewport===c.width &&
      state.fullScrollWidth<=state.layoutWidth+2&&state.lang==='vi'&&
      (c.route==='/'?state.hasHero:state.hasAuth)&&offenders.length===0;
    if(!okay)failures++;
    const screenshot=await command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(artifacts,'cdp-'+c.name+'.png'),Buffer.from(screenshot.data,'base64'));
    console.log((okay?'PASS ':'FAIL ')+c.name+' viewport='+state.viewport+' fullScrollWidth='+state.fullScrollWidth+' lang='+state.lang+' inputs='+state.inputs+' labels='+state.labels);
    if(offenders.length)console.log('  offenders='+JSON.stringify(offenders));
  }
  console.log('MOBILE_LAYOUT_QA='+(failures?'FAIL':'PASS')+' cases='+cases.length+' failed='+failures);
  if(failures)process.exitCode=1;
}
run().catch(e=>{console.error('QA_ERROR: '+e.stack);process.exitCode=1}).finally(()=>{
  try{socket?.close()}catch{}
  if(browser?.pid){
    if(process.platform==='win32')spawnSync('taskkill',['/PID',String(browser.pid),'/T','/F'],{stdio:'ignore'});
    else browser.kill();
  }
});
