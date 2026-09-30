/* Deterministic flight and combat simulation; no DOM or rendering dependencies. */
(function(root){
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0),length=a=>Math.hypot(...a),norm=a=>mul(a,1/(length(a)||1));
  const direction=(yaw,pitch)=>[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)];
  const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const PLANES=[
    {name:'Peregrine',model:'F-16',code:'F / 01',type:'FIGHTER JET',role:'MULTIROLE FIGHTER',tags:['HIGH SPEED','PRECISION'],description:'Fast, lean, and built to intercept. Trade tight turns for raw speed, and use your climb advantage to dictate the fight.',maxSpeed:340,stall:72,turn:.68,climb:95,acceleration:38,hp:100,damage:20,fireInterval:.095,heatRate:.24,coolRate:.25,ceiling:8500,limits:'Stalls below 259 km/h. Wide turns at high speed. Sustained climbs reduce airspeed.'},
    {name:'Kestrel',model:'P-51',code:'P / 02',type:'PROPELLER PLANE',role:'PROPELLER FIGHTER',tags:['AGILE','LIGHT ARMOR'],description:'A classic close-range dogfighter. Out-turn faster aircraft and stay on their tail, but watch your speed and lighter airframe.',maxSpeed:175,stall:38,turn:1.08,climb:28,acceleration:19,hp:75,damage:14,fireInterval:.075,heatRate:.2,coolRate:.3,ceiling:5500,limits:'Stalls below 137 km/h. Limited climb and top speed. Light armor rewards careful flying.'},
     {name:'Scythe',model:'R-77',code:'R / 03',type:'ROCKET INTERCEPTOR',role:'BOOSTER INTERCEPTOR',tags:['ROCKET BOOST','WINGED MISSILE'],boost:true,boostMax:5.5,boostAccel:120,boostGain:58,boostDrain:1,boostRecharge:.16,description:'A rocket-powered interceptor. Lightly armored and a poor turner, but its booster can burn to a burst speed no other craft reaches. Spend the reserve fast, or let it recharge.',maxSpeed:360,stall:64,turn:.4,climb:70,acceleration:30,hp:85,damage:22,fireInterval:.085,heatRate:.23,coolRate:.26,ceiling:9200,limits:'Stalls below 230 km/h. Boost burns a finite reserve and overheats the engine. Heavy armor belongs to other craft.'}
  ];
  const islands=[[-2700,-3000,2400,900],[3600,-5500,2800,1250],[500,3500,2600,1000],[-5900,1600,2000,850],[6400,1800,2400,1200],[-1800,-8700,2100,850]];
  function groundHeight(x,z){let h=-20;for(const [cx,cz,r,peak]of islands){const dx=(x-cx)/r,dz=(z-cz)/r,d=Math.sqrt(dx*dx+dz*dz);const edge=1-d+.07*Math.sin(x*.002+z*.0014);if(edge>0)h=Math.max(h,Math.pow(edge,1.7)*peak+Math.sin(x*.006)*Math.cos(z*.004)*35*edge-25);}return Math.max(0,h);}
  function segmentDistance(a,b,p){const d=sub(b,a),t=clamp(dot(sub(p,a),d)/(dot(d,d)||1),0,1);return length(sub(add(a,mul(d,t)),p));}
  class Simulation {
    constructor(random=Math.random){this.random=random;this.state='hangar';this.events=[];this.enemies=[];this.bullets=[];this.wave=0;this.kills=0;this.time=0;this.nextId=0;}
    emit(type,data={}){this.events.push({type,...data});}
    start(index){this.config=PLANES[index];this.planeIndex=index;this.player={position:[0,650,0],yaw:0,pitch:0,roll:0,speed:this.config.maxSpeed*.67,throttle:.72,hp:this.config.hp,heat:0,overheated:false,cooldown:0,fallSpeed:0,boost:this.config.boostMax||0,boosting:false};this.enemies=[];this.bullets=[];this.events=[];this.wave=0;this.kills=0;this.time=0;this.state='flying';this.transition=0;this.spawnWave();}
    spawnWave(){this.wave++;const p=this.player,c=this.config;const count=Math.min(2+this.wave,12);for(let i=0;i<count;i++){const forward=direction(p.yaw,p.pitch),right=[Math.cos(p.yaw),0,Math.sin(p.yaw)];const position=add(add(p.position,mul(forward,850+i*210)),mul(right,(i-(count-1)/2)*230));position[1]=Math.max(groundHeight(position[0],position[2])+250,p.position[1]+(i%3-1)*90);this.enemies.push({id:++this.nextId,position,yaw:p.yaw+(i===0?0:Math.PI),pitch:0,roll:0,speed:c.maxSpeed*(.4+this.random()*.12),hp:48+this.wave*7,maxHp:48+this.wave*7,cooldown:1.8+i*.5,type:i%3,seed:this.random()*Math.PI*2});}this.emit('wave',{wave:this.wave,count});}
    update(dt,input={}){if(this.state==='hangar'||this.state==='paused')return;dt=clamp(dt,0,.1);for(let remaining=dt;remaining>1e-8;){const step=Math.min(remaining,1/60);this.step(step,input);remaining-=step;}}
    step(dt,input){
      this.time+=dt;const p=this.player,c=this.config;
      if(this.state==='blackout'){this.transition-=dt;if(this.transition<=0){this.state='hangar';this.emit('home',{kills:this.kills,wave:this.wave});}return;}
      if(this.state==='crashing'){p.fallSpeed+=44*dt;p.pitch=Math.max(-1.4,p.pitch-dt*.7);p.roll+=dt*1.8;const f=direction(p.yaw,p.pitch);p.position=add(p.position,mul(f,p.speed*dt*.65));p.position[1]-=p.fallSpeed*dt;this.emit('smoke',{position:p.position.slice()});if(p.position[1]<=groundHeight(p.position[0],p.position[2])+4){this.emit('explosion',{position:p.position.slice(),large:true});this.state='blackout';this.transition=2;this.emit('blackout');}return;}
      if(this.state!=='flying')return;
      const yaw=clamp(input.turn||0,-1,1),pitch=clamp(input.pitch||0,-1,1);
      p.throttle=clamp(p.throttle+(input.throttle||0)*dt*.32,.05,1);
      // Rocket interceptor: a held boost burns a finite reserve for a speed burst, then recharges.
      p.boosting=!!c.boost&&!!input.boost&&p.boost>0&&!p.overheated;
      p.boost=clamp(p.boost+(p.boosting?-c.boostDrain:c.boostRecharge)*dt,0,c.boostMax||0);
      const speedRatio=p.speed/c.maxSpeed,authority=clamp(p.speed/c.stall-.2,.15,1),turnRate=c.turn*(1-.48*speedRatio)*authority;
      p.yaw+=yaw*turnRate*dt;p.roll+=(-yaw*.95-p.roll)*Math.min(1,dt*3.5);
      const pitchLimit=Math.asin(clamp(c.climb/Math.max(p.speed,1),0,.9));
      p.pitch=clamp(p.pitch+pitch*.6*authority*dt,-.8,pitchLimit);
      if(!pitch)p.pitch*=Math.exp(-dt*.65);
      const desired=c.maxSpeed*(.16+.84*p.throttle),boostSpeed=clamp(desired+ (c.boostGain||0),15,c.maxSpeed),drag=Math.abs(yaw)*speedRatio*9;
      const target=p.boosting?boostSpeed:desired;
      p.speed=clamp(p.speed+clamp((target-p.speed)*.35,-c.acceleration,c.acceleration)*dt-Math.sin(p.pitch)*34*dt-drag*dt,15,c.maxSpeed);
      p.stalling=p.speed<c.stall;if(p.stalling)p.pitch=Math.max(-.85,p.pitch-dt*.38);
      const f=direction(p.yaw,p.pitch);p.position=add(p.position,mul(f,p.speed*dt));if(p.stalling)p.position[1]-=(1-p.speed/c.stall)*48*dt;
      if(p.position[1]>c.ceiling){p.position[1]=c.ceiling;p.pitch=Math.min(p.pitch,0);}
      // A soft navigational boundary keeps the island chain and opponents nearby.
      if(Math.hypot(p.position[0],p.position[2])>11500){p.yaw+=clamp(angle(Math.atan2(-p.position[0],p.position[2])-p.yaw),-.65*dt,.65*dt);this.boundary=true;}else this.boundary=false;
      p.cooldown-=dt;if(!p.boosting)p.heat=Math.max(0,p.heat-c.coolRate*dt);if(p.heat<.28&&!p.boosting)p.overheated=false;
      if(input.fire&&p.cooldown<=0&&!p.overheated){this.fire(p,true);p.cooldown=c.fireInterval;p.heat=Math.min(1,p.heat+(c.heatRate+c.coolRate)*c.fireInterval);if(p.heat>=.98){p.overheated=true;this.emit('overheat');}}
       if(p.boosting){p.heat=Math.min(1,p.heat+c.heatRate*1.6*dt);if(p.heat>=1){p.overheated=true;p.boosting=false;this.emit('overheat');}}
      for(const e of this.enemies){
        const delta=sub(p.position,e.position),distance=length(delta),lead=add(delta,mul(f,p.speed*distance/1100));
        let desiredYaw=Math.atan2(lead[0],-lead[2]);const desiredPitch=Math.atan2(lead[1],Math.hypot(lead[0],lead[2]));
        if(distance<170)desiredYaw+=1.5;
        const maneuver=.38+Math.min(this.wave,12)*.042,change=clamp(angle(desiredYaw-e.yaw),-maneuver*dt,maneuver*dt);
        e.yaw+=change;e.roll+=(-change/dt*1.3-e.roll)*dt*3;e.pitch+=clamp(desiredPitch-e.pitch,-dt*.35,dt*.35);e.pitch=clamp(e.pitch,-.45,.4);
        const ground=groundHeight(e.position[0],e.position[2]);if(e.position[1]<ground+170)e.pitch=Math.max(e.pitch,.3);
        const ef=direction(e.yaw,e.pitch);e.position=add(e.position,mul(ef,e.speed*dt));e.position[1]=Math.max(groundHeight(e.position[0],e.position[2])+35,e.position[1]);e.cooldown-=dt;
        if(distance<1700&&distance>110&&dot(ef,norm(lead))>.98&&e.cooldown<=0){this.fire(e,false);e.cooldown=Math.max(.25,1.15-this.wave*.055)+this.random()*.45;}
        if(length(sub(e.position,p.position))<20){this.damagePlayer(55);this.damageEnemy(e,1000);if(this.state!=='flying')return;}
      }
      for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i],old=b.position;b.position=add(old,mul(b.velocity,dt));b.life-=dt;let hit=false;
        if(b.friendly){for(const e of this.enemies){if(e.hp>0&&segmentDistance(old,b.position,e.position)<24){this.damageEnemy(e,c.damage);this.emit('hit',{position:e.position.slice()});hit=true;break;}}}
        else if(segmentDistance(old,b.position,p.position)<13){this.damagePlayer(7+Math.min(this.wave,15)*1.15);if(this.state!=='flying')return;hit=true;}
        if(hit||b.life<=0||b.position[1]<groundHeight(b.position[0],b.position[2]))this.bullets.splice(i,1);
      }
      this.enemies=this.enemies.filter(e=>e.hp>0);
      if(p.position[1]<=groundHeight(p.position[0],p.position[2])+7)this.damagePlayer(10000);
      if(this.state==='flying'&&this.enemies.length===0){if(!this.transition){this.transition=4;this.bullets=this.bullets.filter(b=>b.friendly);p.hp=c.hp;this.emit('clear',{wave:this.wave});}this.transition-=dt;if(this.transition<=0){this.transition=0;this.spawnWave();}}
    }
    fire(entity,friendly){const p=this.player,c=this.config;let aim=direction(entity.yaw,entity.pitch);if(friendly){let best=.994;for(const e of this.enemies){const dist=length(sub(e.position,entity.position));const intercept=add(e.position,mul(direction(e.yaw,e.pitch),e.speed*dist/(1120+p.speed)));const d=norm(sub(intercept,entity.position)),alignment=dot(d,aim);if(alignment>best&&dist<1900){aim=d;best=alignment;}}}else{const dist=length(sub(p.position,entity.position));const lead=add(p.position,mul(direction(p.yaw,p.pitch),p.speed*dist/1050));lead[0]+=(this.random()-.5)*55;lead[1]+=(this.random()-.5)*35;aim=norm(sub(lead,entity.position));}
      this.bullets.push({position:add(entity.position,mul(aim,19)),velocity:mul(aim,(friendly?1120:1050)+entity.speed),friendly,life:2.4});this.emit('shot',{friendly,position:entity.position.slice()});
    }
    damageEnemy(e,amount){if(e.hp<=0)return;e.hp-=amount;if(!e.wounded&&e.hp>0&&e.hp<e.maxHp*.45){e.wounded=true;this.emit('wounded',{position:e.position.slice(),enemyType:e.type});}if(e.hp<=0){this.kills++;this.emit('explosion',{position:e.position.slice(),large:false});}}
    damagePlayer(amount){if(this.state!=='flying')return;this.player.hp=Math.max(0,this.player.hp-amount);this.emit('damage',{amount});if(this.player.hp<=0){this.state='crashing';this.player.fallSpeed=25;this.bullets=[];this.emit('crash');}}
    pause(){if(this.state==='flying'){this.state='paused';return true;}return false;}
    resume(){if(this.state==='paused')this.state='flying';}
  }
  const api={Simulation,PLANES,groundHeight,segmentDistance,direction,clamp};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NyxSim=api;
})(typeof window!=='undefined'?window:globalThis);
