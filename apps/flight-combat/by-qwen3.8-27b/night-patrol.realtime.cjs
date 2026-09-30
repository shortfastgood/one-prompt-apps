// Night Patrol — realtime smoke test (no deps beyond the locally-installed
// @playwright/cli's bundled playwright + system Chrome). Run: node night-patrol.realtime.cjs
const {spawn}=require('child_process');
const http=require('http');
const path=require('path');

const PORT=8447;
const URL='http://127.0.0.1:'+PORT+'/index.html';

// Resolve the playwright bundled with the locally-installed playwright-cli.
function loadPlaywright(){
  const candidates=[
    process.env.PLAYWRIGHT_PATH,
    '/opt/homebrew/Cellar/playwright-cli/0.1.21/libexec/lib/node_modules/@playwright/cli/node_modules/playwright',
  ].filter(Boolean);
  for(const p of candidates){try{return require(p);}catch(_){}}
  try{return require('playwright');}catch(_){}
  throw new Error('Could not locate a playwright module. Set PLAYWRIGHT_PATH to it.');
}

let passed=0,failed=0;
const ok=(cond,msg)=>{if(cond){passed++;console.log('  \u2713 '+msg);}else{failed++;console.log('  \u2717 FAIL: '+msg);}};

const netRequests=[];
const consoleErrors=[];

async function main(){
  const {chromium}=loadPlaywright();
  const server=spawn('python3',['-m','http.server',String(PORT),'-b','127.0.0.1'],{cwd:process.cwd(),stdio:'ignore',detached:false});
  await new Promise((res,rej)=>{
    const t=setInterval(()=>http.get(URL,r=>{r.resume();clearInterval(t);res();}).on('error',()=>{}),120);
    setTimeout(()=>{clearInterval(t);rej(new Error('http server did not start'));},8000);
  });
  console.log('Serving '+URL);

  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const context=await browser.newContext();
  const page=await context.newPage();
  page.on('request',req=>{const u=req.url();if(!/^https?:\/\/127\.0\.0\.1:/.test(u))netRequests.push(u);});
  page.on('pageerror',err=>consoleErrors.push(String(err)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});

  await page.goto(URL,{waitUntil:'load'});
  await page.waitForTimeout(400);

  // Graphics + menu integrity
  const graphicsError=await page.$eval('#graphics-error',el=>el.hidden).catch(()=>true);
  ok(graphicsError,'#graphics-error stays hidden (WebGL initialized)');
  const cards=await page.$$('.aircraft-card');
  ok(cards.length===3,'exactly 3 .aircraft-card (fighter, prop, interceptor)');
  const launchDisabled=await page.$eval('#launch',el=>el.disabled).catch(()=>true);
  ok(!launchDisabled,'#launch is enabled');

  // Select the interceptor (3rd card) and launch
  await cards[2].click();
  await page.click('#launch');
  await page.waitForTimeout(300);
  let st=await page.evaluate(()=>window.nyxStatus);
  ok(st&&st.state==='flying','after launch nyxStatus.state === flying');
  ok(st&&st.enemies>0,'enemies spawned at wave start');

  // Fire: hold Space, expect bullets to appear
  await page.keyboard.down('Space');
  await page.waitForTimeout(450);
  await page.keyboard.up('Space');
  st=await page.evaluate(()=>window.nyxStatus);
  ok(st&&st.bullets>0,'firing produces bullets ('+st.bullets+')');

  // No uncaught page errors, zero external network
  ok(consoleErrors.length===0,'no uncaught page errors ('+consoleErrors.length+')');
  ok(netRequests.length===0,'zero external network requests ('+netRequests.length+')');

  await browser.close();
  server.kill('SIGKILL');
  console.log('\n'+passed+' passed, '+failed+' failed');
  process.exit(failed?1:0);
}

main().catch(err=>{console.error('FATAL',err);process.exit(1);});
