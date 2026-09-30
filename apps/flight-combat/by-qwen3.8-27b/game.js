(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const {Renderer,Geometry,V,transform,identity}=NyxPatrol;
  const {Simulation,PLANES,groundHeight,direction,clamp}=NyxSim;
  let renderer;
  try{renderer=new Renderer($('world'));}catch(error){$('graphics-error').hidden=false;$('launch').disabled=true;console.error(error);return;}
  const sim=new Simulation(),models=PLANES.map((_,i)=>renderer.aircraft(i));
  const keys=new Set(),pointer={x:0,y:0,active:false,fire:false},touch={x:0,y:0,active:false,fire:false,boost:false};
  let selected=0,lastTime=0,clock=0,noticeUntil=0,hitUntil=0,damageFlash=0,smokeTimer=0,menuRect=null;
  let camera=[0,675,95],cameraTarget=[0,650,-300];
  const particles=[],targetElements=new Map(),radar=$('radar').getContext('2d');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const silhouettes=[
    'M32 2 36 24 57 43 57 49 37 42 37 53 46 59 46 62 32 58 18 62 18 59 27 53 27 42 7 49 7 43 28 24Z',
    'M32 3 36 9 36 26 60 29 60 37 36 36 35 51 44 55 44 61 32 58 20 61 20 55 29 51 28 36 4 37 4 29 28 26 28 9Z',
    'M32 3 37 10 37 27 61 31 61 39 43 39 43 52 50 55 50 61 33 57 14 61 14 55 21 52 21 39 3 39 3 31 27 27 27 10Z'
  ];
  const cards=document.querySelector('.aircraft-list');
  PLANES.forEach((p,i)=>{const b=document.createElement('button');b.className='aircraft-card';b.setAttribute('aria-pressed',i===selected);b.setAttribute('aria-label',`${p.name} ${p.model}, ${p.type}`);b.innerHTML=`<div class="card-top"><span>0${i+1}</span><span class="card-check">SELECTED ✓</span></div><svg viewBox="0 0 64 64" aria-hidden="true"><path d="${silhouettes[i]}"/></svg><h3>${p.name}</h3><p>${p.type}</p>`;b.addEventListener('click',()=>selectPlane(i));cards.appendChild(b);});
  function selectPlane(index){selected=index;const p=PLANES[index];$('plane-name').innerHTML=`${p.name} <span>${p.model}</span>`;$('class-label').textContent=p.role;$('spec-index').textContent=`0${index+1} / 03`;$('role-tags').innerHTML=p.tags.map(t=>`<span>${t}</span>`).join('');$('plane-description').textContent=p.description;$('plane-limits').textContent=p.limits;$('preview-code').textContent=p.code;$('preview-name').textContent=p.name.toUpperCase();
    const stats=[['Top speed',Math.round(p.maxSpeed*3.6),'KM/H',p.maxSpeed/340],['Turn rate',Math.round(p.turn*(1-.48*.65)*180/Math.PI),'DEG/S',p.turn/1.08],['Climb rate',p.climb,'M/S',p.climb/95],['Armor',p.hp,'HP',p.hp/160]];
    $('performance').innerHTML=stats.map(([label,value,unit,percent])=>`<div class="stat"><div class="stat-label"><span>${label}</span><b>${value} <small>${unit}</small></b></div><div class="stat-track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percent*100)}" aria-valuetext="${value} ${unit}"><i style="width:${percent*100}%"></i></div></div>`).join('');
    [...cards.children].forEach((b,i)=>b.setAttribute('aria-pressed',index===i));
  }
  selectPlane(0);

  // One indexed scene is unnecessary here: flat triangle normals give the terrain its facets.
  const terrainGeometry=new Geometry();
  let seed=7823;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const point=(x,z)=>[x,groundHeight(x,z)-1,z];
  for(let x=-11000;x<11000;x+=200)for(let z=-11000;z<11000;z+=200){const a=point(x,z),b=point(x+200,z),c=point(x+200,z+200),d=point(x,z+200);if(Math.max(a[1],b[1],c[1],d[1])<=0)continue;for(const tri of [[a,d,c],[a,c,b]]){const h=(tri[0][1]+tri[1][1]+tri[2][1])/3,n=random()*.055;const color=h<35?[.56+n,.57+n,.42+n]:h>700?[.36+n,.43+n,.4+n]:[.27+n,.4+n,.31+n];terrainGeometry.triangle(...tri,color);}}
  const terrain=renderer.mesh(terrainGeometry);
  const clouds=Array.from({length:36},()=>({p:[(random()-.5)*26000,2100+random()*1400,(random()-.5)*26000],s:[500+random()*900,70+random()*100,220+random()*250]}));
  const waterLines=Array.from({length:100},()=>({p:[(random()-.5)*24000,1,(random()-.5)*24000],s:[50+random()*160,1,2]}));

  let audioContext,engineOscillator,engineGain;
  function initAudio(){try{if(!audioContext){audioContext=new (window.AudioContext||window.webkitAudioContext)();engineOscillator=audioContext.createOscillator();engineGain=audioContext.createGain();engineOscillator.type='sawtooth';engineOscillator.frequency.value=42;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=140;engineOscillator.connect(filter);filter.connect(engineGain);engineGain.connect(audioContext.destination);engineGain.gain.value=0;engineOscillator.start();}audioContext.resume().catch(()=>{});}catch(_){/* Audio is optional; flight remains available. */}}
  function sound(kind){if(!audioContext||audioContext.state!=='running')return;const t=audioContext.currentTime,osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.connect(gain);gain.connect(audioContext.destination);if(kind==='shot'){osc.type='triangle';osc.frequency.setValueAtTime(190,t);osc.frequency.exponentialRampToValueAtTime(55,t+.065);gain.gain.setValueAtTime(.06,t);gain.gain.exponentialRampToValueAtTime(.001,t+.07);osc.start();osc.stop(t+.08);}else{osc.type='sawtooth';osc.frequency.setValueAtTime(kind==='hit'?150:75,t);osc.frequency.exponentialRampToValueAtTime(22,t+.4);gain.gain.setValueAtTime(kind==='hit'?.045:.12,t);gain.gain.exponentialRampToValueAtTime(.001,t+.45);osc.start();osc.stop(t+.5);}}
  function message(text,duration=3){$('notice').textContent=text;noticeUntil=clock+duration;}
  function clearInput(){keys.clear();pointer.fire=false;pointer.active=false;pointer.x=pointer.y=0;touch.active=touch.fire=touch.boost=false;touch.x=touch.y=0;document.querySelector('#stick i').style.transform='';}
  function start(){initAudio();clearInput();particles.length=0;targetElements.forEach(el=>el.remove());targetElements.clear();sim.start(selected);$('hangar').hidden=true;$('hud').hidden=false;$('blackout').hidden=true;$('debrief').textContent='';$('hud-plane').textContent=PLANES[selected].name.toUpperCase();document.body.style.overflow='hidden';camera=[0,675,95];cameraTarget=[0,650,-300];processEvents();}
  function home(debrief=''){sim.state='hangar';clearInput();$('hangar').hidden=false;$('hud').hidden=true;$('blackout').hidden=true;$('pause-dialog').close();document.body.style.overflow='';$('debrief').textContent=debrief;menuRect=null;$('launch').focus({preventScroll:true});}
  function pause(){if(sim.pause()){clearInput();$('pause-dialog').showModal();}}
  function resume(){sim.resume();clearInput();$('pause-dialog').close();initAudio();}
  $('launch').addEventListener('click',start);$('pause-button').addEventListener('click',pause);$('resume').addEventListener('click',resume);$('return-hangar').addEventListener('click',()=>home());
  $('pause-dialog').addEventListener('cancel',event=>{event.preventDefault();resume();});
  const openControls=()=>$('controls-dialog').showModal();$('help').addEventListener('click',openControls);$('controls-link').addEventListener('click',openControls);document.querySelectorAll('.dialog-close,.dialog-close-action').forEach(b=>b.addEventListener('click',()=>$('controls-dialog').close()));
  addEventListener('keydown',event=>{if(event.code==='Escape'){if(sim.state==='flying'){event.preventDefault();pause();}return;}if(sim.state!=='flying')return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ShiftLeft','ShiftRight'].includes(event.code)){event.preventDefault();keys.add(event.code);if(event.code!=='Space')pointer.active=false;}});
  addEventListener('keyup',event=>keys.delete(event.code));
  addEventListener('blur',()=>{clearInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
  addEventListener('pointermove',event=>{if(event.pointerType==='touch'||sim.state!=='flying'||event.target.closest('button'))return;pointer.active=true;pointer.x=clamp((event.clientX-innerWidth/2)/(innerWidth*.32),-1,1);pointer.y=clamp((innerHeight/2-event.clientY)/(innerHeight*.32),-1,1);});
  addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.button===0&&sim.state==='flying'&&!event.target.closest('button,dialog'))pointer.fire=true;});
  addEventListener('pointerup',()=>{pointer.fire=false;});addEventListener('pointercancel',()=>{pointer.fire=false;});
  const stick=$('stick');let stickPointer=null;
  const moveStick=event=>{const rect=stick.getBoundingClientRect();touch.x=clamp((event.clientX-rect.left-rect.width/2)/40,-1,1);touch.y=clamp(-(event.clientY-rect.top-rect.height/2)/40,-1,1);stick.firstElementChild.style.transform=`translate(${touch.x*30}px,${-touch.y*30}px)`;};
  stick.addEventListener('pointerdown',event=>{stickPointer=event.pointerId;touch.active=true;stick.setPointerCapture(event.pointerId);moveStick(event);});stick.addEventListener('pointermove',event=>{if(event.pointerId===stickPointer)moveStick(event);});
  const releaseStick=()=>{stickPointer=null;touch.active=false;touch.x=touch.y=0;stick.firstElementChild.style.transform='';};stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);
  $('touch-fire').addEventListener('pointerdown',event=>{touch.fire=true;event.currentTarget.setPointerCapture(event.pointerId);});for(const name of ['pointerup','pointercancel'])$('touch-fire').addEventListener(name,()=>touch.fire=false);
  const touchBoost=$('touch-boost');touchBoost.addEventListener('pointerdown',event=>{touch.boost=true;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.classList.add('active');});for(const name of ['pointerup','pointercancel'])touchBoost.addEventListener(name,()=>{touch.boost=false;touchBoost.classList.remove('active');});
  addEventListener('resize',()=>{menuRect=null;});addEventListener('scroll',()=>{menuRect=null;},{passive:true});
  function input(){const axis=(a,b,c,d)=>(keys.has(a)||keys.has(b)?1:0)-(keys.has(c)||keys.has(d)?1:0);const boost=keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.boost;return {turn:touch.active?touch.x:pointer.active?pointer.x:axis('KeyD','ArrowRight','KeyA','ArrowLeft'),pitch:touch.active?touch.y:pointer.active?pointer.y:axis('KeyW','ArrowUp','KeyS','ArrowDown'),throttle:(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0),fire:keys.has('Space')||pointer.fire||touch.fire,boost:boost};}

  function burst(position,large){for(let i=0;i<(large?38:22);i++){const velocity=[(Math.random()-.5)*95,Math.random()*75,(Math.random()-.5)*95];particles.push({p:position.slice(),v:velocity,life:1+Math.random()*1.2,maxLife:2.2,size:4+Math.random()*10,color:i%3?[1,.55,.15]:[.2,.26,.25]});}}
  function processEvents(){for(const event of sim.events){switch(event.type){case 'wave':message(`WAVE ${String(event.wave).padStart(2,'0')}\n${event.count} HOSTILES INBOUND`,3.4);break;case 'clear':message('AIRSPACE CLEAR\nREPAIRED · NEXT WAVE INBOUND',3.8);break;case 'shot':if(event.friendly)sound('shot');break;case 'hit':hitUntil=clock+.13;sound('hit');break;case 'damage':damageFlash=.7;break;case 'explosion':burst(event.position,event.large);sound('explosion');break;case 'crash':message('AIRFRAME LOST\nFLIGHT CONTROLS OFFLINE',30);clearInput();break;case 'smoke':smokeTimer+=1/60;if(smokeTimer>.06){smokeTimer=0;particles.push({p:event.position.slice(),v:[0,15,0],life:2,maxLife:2,size:8,color:[.14,.18,.17]});}break;case 'blackout':$('blackout').hidden=false;break;case 'home':home(`SORTIE ENDED / WAVE ${String(event.wave).padStart(2,'0')} / ${event.kills} CONFIRMED KILLS`);break;}}sim.events.length=0;}

  function renderHangar(){
    if(!menuRect)menuRect=document.querySelector('.showcase').getBoundingClientRect();
    const eye=[0,32,67],distance=Math.hypot(...eye),fov=.75,units=2*distance*Math.tan(fov/2)/innerHeight;
    const cx=menuRect.left+menuRect.width*.54,cy=menuRect.top+menuRect.height*.56;
    const ox=(cx-innerWidth/2)*units,oy=(innerHeight/2-cy)*units;
    const center=[ox,oy*.902,oy*-.431],scale=clamp(menuRect.width/660,.57,1.25);
    renderer.begin(eye,[0,0,0],{fog:[.063,.098,.11],density:.008,fov});
    const floor=[center[0],center[1]-6*scale,center[2]];
    renderer.draw(renderer.box,transform([floor[0],floor[1]-1,floor[2]],0,0,0,[240,.5,200]),[.07,.107,.114]);
    for(let i=-6;i<=6;i++){renderer.draw(renderer.box,transform([floor[0]+i*7,floor[1],floor[2]],0,0,0,[.025,.01,84]),[.16,.23,.23],1);renderer.draw(renderer.box,transform([floor[0],floor[1],floor[2]+i*7],0,0,0,[84,.01,.025]),[.16,.23,.23],1);}
    renderer.draw(renderer.disc,transform([floor[0],floor[1]+.04,floor[2]],0,0,0,[22*scale,1,22*scale]),[.093,.145,.143]);
    renderer.draw(renderer.ring,transform([floor[0],floor[1]+.07,floor[2]],0,0,0,[22*scale,1,22*scale]),[.34,.44,.37,.55],1);
    renderer.draw(renderer.ring,transform([floor[0],floor[1]+.08,floor[2]],0,0,0,[18.8*scale,1,18.8*scale]),[.3,.41,.35,.25],1);
    for(let i=0;i<36;i++){const a=i/36*Math.PI*2;renderer.draw(renderer.box,transform([floor[0]+Math.sin(a)*21*scale,floor[1]+.1,floor[2]+Math.cos(a)*21*scale],-a,0,0,[.07,.05,(i%3===0?1.2:.5)*scale]),[.58,.7,.5,.65],1);}
    renderer.draw(renderer.disc,transform([center[0],floor[1]+.12,center[2]],-.9,0,0,[9*scale,1,14*scale]),[.015,.03,.034,.5]);
    const yaw=-2.2+(reducedMotion?0:Math.sin(clock*.12)*.2),bob=reducedMotion?0:Math.sin(clock*.7)*.35;
    renderer.drawAircraft(models[selected],transform([center[0],center[1]+bob,center[2]],yaw,.05,-.06,[scale,scale,scale]),selected===1?clock*.12:clock);
  }
  function renderWorld(dt){const p=sim.player,f=direction(p.yaw,p.pitch),desired=V.add(V.add(p.position,V.mul(f,-82)),[0,23,0]);
    // Camera and guns share the same forward sight line; targets at the reticle are hittable.
    const target=V.add(p.position,V.mul(f,650));
    const follow=sim.state==='crashing'?2.5:7;
    camera=V.add(camera,V.mul(V.sub(desired,camera),1-Math.exp(-dt*follow)));cameraTarget=V.add(cameraTarget,V.mul(V.sub(target,cameraTarget),1-Math.exp(-dt*8)));
    renderer.begin(camera,cameraTarget,{night:true,fov:.92});renderer.renderSky();
    renderer.draw(renderer.box,transform([p.position[0],-12,p.position[2]],0,0,0,[70000,20,70000]),[.19,.37,.41]);
    renderer.draw(terrain,identity(),[1,1,1]);
    for(const line of waterLines)if(groundHeight(line.p[0],line.p[2])===0)renderer.draw(renderer.box,transform(line.p,0,0,0,line.s),[.55,.73,.69,.32],1);
    for(const cloud of clouds)renderer.draw(renderer.sphere,transform(cloud.p,0,0,0,cloud.s),[.2,.24,.3,.5]);
    if(sim.state!=='blackout'){
      renderer.drawAircraft(models[sim.planeIndex],transform(p.position,p.yaw,p.pitch,p.roll),clock);
      for(const e of sim.enemies){renderer.drawAircraft(models[e.type],transform(e.position,e.yaw,e.pitch,e.roll),clock,true);const frac=e.hp/e.maxHp;if(frac<.25&&Math.random()<dt*16)particles.push({p:e.position.slice(),v:[(Math.random()-.5)*10,18,(Math.random()-.5)*10],life:.8,maxLife:.8,size:6,color:[1,.5,.15]});else if(frac<.45&&Math.random()<dt*9)particles.push({p:e.position.slice(),v:[0,4,0],life:1.4,maxLife:1.4,size:5,color:[.24,.27,.25]});}
      for(const b of sim.bullets){const d=V.norm(b.velocity),yaw=Math.atan2(d[0],-d[2]),pitch=Math.asin(d[1]);const col=b.friendly?[1,.91,.42]:[1,.38,.16];renderer.draw(renderer.box,transform(b.position,yaw,pitch,0,[b.friendly?.7:.9,b.friendly?.7:.9,42]),col,1);renderer.drawGlow(renderer.sphere,transform(b.position,yaw,pitch,0,[1.6,1.6,3]),col,b.friendly?1.1:.85);}
    }
    for(let i=particles.length-1;i>=0;i--){const a=particles[i];if(sim.state!=='paused'){a.life-=dt;a.p=V.add(a.p,V.mul(a.v,dt));a.v[1]-=dt*12;}if(a.life<=0){particles.splice(i,1);continue;}const scale=a.size*(1+(a.maxLife-a.life)*1.5);renderer.draw(renderer.sphere,transform(a.p,0,0,0,[scale,scale,scale]),[...a.color,Math.min(.9,a.life/a.maxLife)],a.color[0]>.5?1:0);}
    updateHUD();
  }

  function updateHUD(){const p=sim.player,c=sim.config;
    $('wave').textContent=String(sim.wave).padStart(2,'0');$('hostiles').textContent=sim.enemies.length;$('speed').textContent=Math.round(p.speed*3.6);$('altitude').textContent=Math.max(0,Math.round(p.position[1]-groundHeight(p.position[0],p.position[2])));$('throttle').textContent=Math.round(p.throttle*100);$('kills').textContent=String(sim.kills).padStart(2,'0');
    const hp=Math.max(0,p.hp/c.hp*100);$('hull-number').textContent=`${Math.round(hp)}%`;$('hull-bar').style.width=`${hp}%`;$('hull-bar').style.background=hp<30?'#ff9a72':'var(--accent)';$('heat-bar').style.width=`${p.heat*100}%`;$('heat-number').textContent=p.overheated?'COOLING':p.heat>.65?'HOT':'READY';
    const booster=$('boost-label'),boostTrack=$('boost-track');const hasBoost=!!c.boostMax;if(hasBoost){booster.hidden=false;boostTrack.hidden=false;const reserve=p.boost/c.boostMax*100;$('boost-number').textContent=Math.round(reserve)+'%';$('boost-bar').style.width=reserve+'%';$('boost-bar').style.background=p.boosting?'#ffd27a':p.overheated?'#ff7a5c':'var(--accent)';}else{booster.hidden=true;boostTrack.hidden=true;}
    $('warning').textContent=sim.state==='crashing'?'':p.stalling?'STALL — INCREASE THROTTLE [E]':p.position[1]-groundHeight(p.position[0],p.position[2])<130?'TERRAIN — PULL UP':sim.boundary?'SECTOR BOUNDARY — TURNING HOME':p.overheated?'CANNON OVERHEATED — COOLING':p.position[1]>c.ceiling-40?'SERVICE CEILING':hp<30?'CRITICAL AIRFRAME DAMAGE':'';
    if(clock>noticeUntil)$('notice').textContent='';$('hit-marker').style.opacity=clock<hitUntil?'1':'0';$('damage-vignette').style.opacity=String(damageFlash+Math.max(0,.25-hp/100));
    const alive=new Set(sim.enemies.map(e=>e.id));for(const [id,el]of targetElements)if(!alive.has(id)){el.remove();targetElements.delete(id);}
    for(const e of sim.enemies){let el=targetElements.get(e.id);if(!el){el=document.createElement('div');el.className='target';el.innerHTML='<i></i><span></span>';targetElements.set(e.id,el);$('targets').appendChild(el);}const screen=renderer.project(e.position),outside=!screen.front||screen.x<45||screen.x>innerWidth-45||screen.y<100||screen.y>innerHeight-160;el.className=`target${outside?' offscreen':''}`;
      if(outside){let dx=screen.x-innerWidth/2,dy=screen.y-innerHeight/2;if(!screen.front){dx=-dx;dy=dy||100;}const angle=Math.atan2(dy,dx),rx=innerWidth*.43,ry=innerHeight*.32;el.style.left=`${innerWidth/2+Math.cos(angle)*rx}px`;el.style.top=`${innerHeight/2+Math.sin(angle)*ry}px`;el.style.rotate=`${angle}rad`;el.textContent='›';}
      else{el.style.rotate='';if(!el.querySelector('span'))el.innerHTML='<i></i><span></span>';el.style.left=`${screen.x}px`;el.style.top=`${screen.y}px`;el.querySelector('span').textContent=`${(V.dot(V.sub(e.position,p.position),V.sub(e.position,p.position))**.5/1000).toFixed(1)} KM`;el.querySelector('i').style.width=`${Math.max(0,e.hp/e.maxHp)*100}%`;}
    }
    drawRadar();
  }
  function drawRadar(){const ctx=radar,p=sim.player;ctx.clearRect(0,0,240,240);ctx.fillStyle='#112a3055';ctx.strokeStyle='#d8f2b544';ctx.lineWidth=1;ctx.beginPath();ctx.arc(120,120,108,0,Math.PI*2);ctx.fill();ctx.stroke();for(const r of [36,72]){ctx.beginPath();ctx.arc(120,120,r,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(12,120);ctx.lineTo(228,120);ctx.moveTo(120,12);ctx.lineTo(120,228);ctx.stroke();ctx.fillStyle='#e1f8b5';ctx.beginPath();ctx.moveTo(120,109);ctx.lineTo(126,128);ctx.lineTo(120,124);ctx.lineTo(114,128);ctx.closePath();ctx.fill();
    for(const e of sim.enemies){const dx=e.position[0]-p.position[0],dz=e.position[2]-p.position[2];let x=(dx*Math.cos(p.yaw)+dz*Math.sin(p.yaw))/4000*108,y=(-dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))/4000*108;const len=Math.hypot(x,y);if(len>103){x=x/len*103;y=y/len*103;}ctx.fillStyle='#ffb480';ctx.fillRect(117+x,117+y,6,6);}
    ctx.fillStyle='#d8e5c2';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText('FWD',120,9);
  }
  function frame(now){const dt=Math.min((now-lastTime)/1000||.016,.06);lastTime=now;clock+=dt;
    if(sim.state!=='paused'){sim.update(dt,input());processEvents();damageFlash=Math.max(0,damageFlash-dt*1.7);}
    if(engineGain){const active=sim.state==='flying';engineGain.gain.setTargetAtTime(active?.023:0,audioContext.currentTime,.1);engineOscillator.frequency.setTargetAtTime(active?32+sim.player.speed*.14:30,audioContext.currentTime,.1);}
    if(sim.state==='hangar')renderHangar();else renderWorld(sim.state==='paused'?0:dt);
    requestAnimationFrame(frame);
  }
  // Read-only diagnostics make the local renderer and simulation inspectable without cheats.
  Object.defineProperty(window,'nyxStatus',{get:()=>{const pl=sim.player;return {state:sim.state,aircraft:PLANES[selected].name,wave:sim.wave,enemies:sim.enemies.length,bullets:sim.bullets.length,kills:sim.kills,health:pl?pl.hp:0,boost:pl?pl.boosting:false,boostReserve:pl?pl.boost:0};}});
  requestAnimationFrame(frame);
})();
