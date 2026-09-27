const test=require('node:test');
const assert=require('node:assert/strict');
const {Simulation,PLANES,groundHeight,segmentDistance}=require('./simulation.js');
const advance=(sim,seconds,input={})=>{for(let t=0;t<seconds-1e-8;t+=1/60)sim.update(1/60,input);};
const fresh=(index=0)=>{const sim=new Simulation(()=>.5);sim.start(index);return sim;};

test('each aircraft starts with its own armor and flight envelope',()=>{
  for(let i=0;i<3;i++){const s=fresh(i);assert.equal(s.player.hp,PLANES[i].hp);assert.equal(s.enemies.length,3);assert.equal(s.state,'flying');assert.ok(s.player.speed>PLANES[i].stall);}
  assert.ok(PLANES[0].maxSpeed>PLANES[2].maxSpeed);assert.ok(PLANES[1].turn>PLANES[0].turn);assert.ok(PLANES[2].hp>PLANES[0].hp);
});
test('full throttle respects maximum speed for every aircraft',()=>{
  for(let i=0;i<3;i++){const s=fresh(i);s.enemies.forEach(e=>e.cooldown=1000);advance(s,40,{throttle:1});assert.ok(s.player.speed<=PLANES[i].maxSpeed);assert.ok(s.player.speed>PLANES[i].maxSpeed*.95);}
});
test('climb rate and service ceiling are bounded',()=>{
  for(let i=0;i<3;i++){const s=fresh(i);s.enemies=[];s.transition=1000;const p=s.player;p.position=[0,4000,0];p.throttle=1;p.speed=PLANES[i].maxSpeed;const before=p.position[1];advance(s,4,{pitch:1});assert.ok(p.position[1]-before<=PLANES[i].climb*4+1);p.position[1]=PLANES[i].ceiling;advance(s,1,{pitch:1});assert.ok(p.position[1]<=PLANES[i].ceiling);}
});
test('low airspeed produces a stall and altitude loss',()=>{
  const s=fresh(1);s.enemies=[];s.transition=1000;s.player.speed=25;s.player.throttle=.05;const y=s.player.position[1];advance(s,.4);assert.equal(s.player.stalling,true);assert.ok(s.player.position[1]<y);assert.ok(s.player.pitch<0);
});
test('continuous fire produces traces, overheats, and cools down',()=>{
  const s=fresh();s.enemies=[];s.transition=1000;advance(s,.25,{fire:true});assert.ok(s.bullets.length>0);assert.ok(s.bullets.every(b=>b.friendly));for(let i=0;i<480&&!s.player.overheated;i++)s.update(1/60,{fire:true});assert.equal(s.player.overheated,true);assert.ok(s.events.some(e=>e.type==='overheat'));advance(s,5);assert.equal(s.player.overheated,false);assert.equal(s.bullets.length,0);
});
test('swept collision catches a fast bullet between frame positions',()=>{
  assert.equal(segmentDistance([0,0,0],[100,0,0],[50,0,0]),0);
  const s=fresh();const e=s.enemies[0];e.position=[0,650,-100];e.speed=0;e.hp=10;s.enemies=[e];s.bullets=[{position:[0,650,-30],velocity:[0,0,-10000],friendly:true,life:1}];s.update(1/60);assert.equal(s.kills,1);assert.equal(s.enemies.length,0);assert.ok(s.events.some(e=>e.type==='hit'));
});
test('enemy projectiles damage the player and are consumed on contact',()=>{
  const s=fresh();s.bullets=[{position:[0,650,-30],velocity:[0,0,3000],friendly:false,life:1}];s.update(1/60);assert.ok(s.player.hp<PLANES[0].hp);assert.equal(s.bullets.length,0);
});
test('lethal damage during a multi-projectile frame safely enters the crash state',()=>{
  const s=fresh();s.player.hp=1;s.bullets=Array.from({length:3},()=>({position:[0,650,-30],velocity:[0,0,3000],friendly:false,life:1}));assert.doesNotThrow(()=>s.update(1/60));assert.equal(s.state,'crashing');assert.equal(s.bullets.length,0);
});
test('enemy AI can fire actual projectiles',()=>{
  const s=fresh();const e=s.enemies[0];e.position=[0,650,-700];e.yaw=Math.PI;e.pitch=0;e.cooldown=0;s.enemies=[e];advance(s,.1);assert.ok(s.events.some(e=>e.type==='shot'&&!e.friendly));assert.ok(s.bullets.some(b=>!b.friendly));
});
test('clearing a wave repairs the player and increases opposition',()=>{
  const s=fresh();const oldHp=s.enemies[0].maxHp;s.player.hp=25;for(const e of s.enemies)s.damageEnemy(e,1000);s.update(1/60);assert.equal(s.player.hp,PLANES[0].hp);assert.equal(s.kills,3);advance(s,4.1);assert.equal(s.wave,2);assert.equal(s.enemies.length,4);assert.ok(s.enemies[0].maxHp>oldHp);
});
test('loss removes control, crashes, then holds black for two seconds',()=>{
  const s=fresh();s.player.position=[0,200,0];s.damagePlayer(1000);assert.equal(s.state,'crashing');const yaw=s.player.yaw;advance(s,.1,{turn:1,pitch:1,fire:true});assert.equal(s.player.yaw,yaw);assert.equal(s.bullets.length,0);for(let i=0;i<1000&&s.state==='crashing';i++)s.update(1/60);assert.equal(s.state,'blackout');assert.ok(s.player.position[1]<=groundHeight(...[s.player.position[0],s.player.position[2]])+4);advance(s,1.9);assert.equal(s.state,'blackout');advance(s,.12);assert.equal(s.state,'hangar');assert.ok(s.events.some(e=>e.type==='home'));
});
test('terrain collision destroys the airframe',()=>{const s=fresh();s.player.position=[3600,10,-5500];s.update(1/60);assert.equal(s.state,'crashing');assert.equal(s.player.hp,0);});
test('pause freezes physics, damage, and wave timers',()=>{const s=fresh();assert.equal(s.pause(),true);const before=JSON.stringify(s.player),time=s.time;advance(s,3,{fire:true,turn:1});assert.equal(JSON.stringify(s.player),before);assert.equal(s.time,time);s.resume();advance(s,.1);assert.ok(s.time>time);});
test('restart clears prior combat state',()=>{const s=fresh();advance(s,.2,{fire:true});s.damagePlayer(1000);s.start(2);assert.equal(s.state,'flying');assert.equal(s.kills,0);assert.equal(s.wave,1);assert.equal(s.bullets.length,0);assert.equal(s.player.hp,160);assert.equal(s.enemies.length,3);});
test('long mixed-input sorties remain numerically stable',()=>{
  for(let i=0;i<3;i++){const s=fresh(i);for(let f=0;f<18000;f++){if(s.state==='hangar')s.start(i);s.update(1/60,{turn:Math.sin(f*.003),pitch:Math.sin(f*.008)*.2,fire:f%200<100,throttle:Math.sin(f*.001)});assert.ok(s.player.position.every(Number.isFinite));assert.ok(Number.isFinite(s.player.speed));assert.ok(s.bullets.length<100);}}
});
