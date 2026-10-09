const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, arena, ghost, state, eq, html } = require('./harness.cjs');
const codes=['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Space','Escape','KeyA'];

test('E01 E03 key event filtering and default prevention',()=>{
  const g=arena(game()),before=state(g);
  for(const code of codes){assert.equal(g.emit('keydown',code),code.startsWith('Arrow')||code==='Space');assert.equal(g.emit('keyup',code),code.startsWith('Arrow')||code==='Space');}
  eq(g.events,codes.slice(0,-1));eq(state(g),before);
});
test('E02 stopped, hidden and repeat independently reject input',()=>{
  for(const mode of ['stopped','hidden','repeat'])for(const code of codes){
    const g=arena(game());if(mode==='stopped')g.stopped=true;if(mode==='hidden')g.document.hidden=true;
    assert.equal(g.emit('keydown',code,{repeat:mode==='repeat'}),code.startsWith('Arrow')||code==='Space');eq(g.events,[]);
  }
});
test('E04 E05 blur and visibility changes clear pending input and timing',()=>{
  const g=arena(game());
  for(const queued of [[],['ArrowRight']]){
    g.events=queued.slice();g.clearInput();eq(g.events,[]);
    g.events=queued.slice();g.emit('blur');eq(g.events,[]);g.tick();assert.equal(g.player.x,5);
  }
  for(const hidden of [true,false]){g.document.hidden=hidden;g.events=['ArrowRight'];g.previous=100;g.accumulator=5;g.emit('visibilitychange');eq([g.events,g.previous,g.accumulator],[[],null,0]);}
});
test('E06 repeated held arrow cannot start movement after restart',()=>{
  const g=arena(game());g.gameOver=true;g.random(()=>.5);g.emit('keydown','Space');g.emit('keydown','ArrowRight',{repeat:true});g.tick();assert.equal(g.player.heading,null);assert.equal(g.player.x,1);
  g.emit('keyup','ArrowRight');g.emit('keydown','ArrowRight');g.tick();assert.equal(g.player.x,2);
});
test('E07 F01 F06 Escape stops catch-up and preserves last drawing',()=>{
  const g=arena(game());g.calls.length=0;g.raf.length=0;g.previous=0;g.events=['Escape'];g.frame(100);
  assert.equal(g.stopped,true);assert.equal(g.player.mouthTimer,0);assert.equal(g.calls.length,0);assert.equal(g.raf.length,0);
  const before=state(g);g.emit('keydown','Space');g.emit('keydown','ArrowRight');g.frame(200);eq(state(g),before);eq(g.events,[]);assert.equal(g.calls.length,0);assert.equal(g.raf.length,0);
});
test('F02 F03 frame accumulator boundaries and scheduling',()=>{
  for(const [elapsed,ticks]of [[5,0],[1000/60,1],[3*1000/60+5,3],[1000/60-2e-7,0],[1000/60+2e-7,1]]){
    const g=arena(game());g.calls.length=0;g.raf.length=0;g.frame(0);assert.equal(g.player.mouthTimer,0);assert.equal(g.previous,0);assert.equal(g.raf.length,1);
    g.frame(elapsed);assert.equal(g.player.mouthTimer,ticks);assert.ok(Math.abs(g.accumulator-(elapsed-ticks*g.step))<1e-8);
    assert.equal(g.raf.length,2);assert.equal(g.calls.filter(c=>c.method==='fillRect'&&c.args[2]===1200).length,2);
  }
});
test('F04 equal elapsed durations at 30/60/120/144 Hz',()=>{
  let expected;
  for(const hz of [30,60,120,144]){
    const g=arena(game());g.player.heading=g.directions[0];g.player.powered=true;g.player.powerTimer=300;
    g.frame(0);for(let n=1;n<=hz;n++){g.calls.length=0;g.raf.length=0;g.frame(n*1000/hz);}
    assert.equal(g.player.powerTimer,240);assert.equal(g.player.x,11);assert.equal(g.player.mouthTimer,0);
    if(expected)eq(state(g),expected);else expected=state(g);
  }
});
test('F05 hidden interval and visibility return never fast-forward',()=>{
  const g=arena(game());g.previous=10;g.accumulator=7;g.document.hidden=true;g.calls.length=0;g.raf.length=0;
  g.frame(10000);eq([g.previous,g.accumulator],[null,0]);assert.equal(g.calls.length,0);assert.equal(g.raf.length,1);
  g.document.hidden=false;g.emit('visibilitychange');g.frame(20000);assert.equal(g.player.mouthTimer,0);assert.equal(g.previous,20000);assert.equal(g.raf.length,2);
  g.frame(20000+g.step);assert.equal(g.player.mouthTimer,1);
});
test('F07 terminal frames continue drawing while simulation freezes',()=>{
  const g=arena(game());g.gameOver=true;const before=state(g);g.calls.length=0;g.raf.length=0;g.frame(0);g.frame(100);eq(state(g),before);assert.equal(g.raf.length,2);assert.equal(g.calls.filter(c=>c.method==='fillText').length,6);
});
test('D01 circle emits filled full arc with effective style',()=>{
  const g=game();g.calls.length=0;g.circle(10,20,6,'red');eq(g.calls.map(c=>[c.method,c.args,c.color]),[['beginPath',[],'red'],['arc',[10,20,6,0,Math.PI*2],'red'],['fill',[],'red']]);
});
test('D02 D07 maze primitives, draw order and immutable game state',()=>{
  const g=arena(game());g.maze[2][2]=1;g.maze[2][3]=2;g.maze[2][4]=3;g.maze[2][5]=4;
  g.player.x=2;g.player.y=2;g.player.mouthOpen=false;g.ghosts=[ghost(g,0,2,2),ghost(g,1,2,2)];const before=state(g);g.calls.length=0;g.draw();eq(state(g),before);
  const find=(method,args,color)=>g.calls.findIndex(c=>c.method===method&&JSON.stringify(c.args)===JSON.stringify(args)&&c.color===color);
  assert.equal(find('fillRect',[0,0,1200,800],'#000000'),0);
  const wall=find('fillRect',[80,80,40,40],'#0000ff');assert.ok(wall>0);
  assert.ok(find('fillRect',[138,98,4,4],'#ffffff')>0);assert.ok(find('arc',[180,100,8,0,Math.PI*2],'#ffffff')>0);assert.ok(find('fillRect',[200,96,40,8],'#ffb8de')>0);
  assert.equal(find('fillRect',[240,80,40,40],'#000000'),-1);
  const player=find('arc',[100,100,18,0,Math.PI*2],'#ffff00'),red=find('arc',[100,100,18,0,Math.PI*2],'#ff0000'),pink=find('arc',[100,100,18,0,Math.PI*2],'#ffc0cb');
  assert.ok(wall<player&&player<red&&red<pink);assert.ok(g.calls.findIndex(c=>c.method==='fillText')>pink);
});
test('D03 player sectors and closed circle in every direction',()=>{
  for(const powered of [false,true])for(const open of [false,true])for(let d=0;d<4;d++){
    const g=arena(game());g.player.direction=g.directions[d];g.player.mouthOpen=open;g.player.powered=powered;g.calls.length=0;g.draw();
    const arcs=g.calls.filter(c=>c.method==='arc'&&c.color==='#ffff00');assert.equal(arcs.length,1);
    const [start,end]=[[30,330],[150,210],[240,300],[60,120]][d];
    eq(arcs[0].args,open?[220,220,18,-start*Math.PI/180,-end*Math.PI/180,true]:[220,220,18,0,Math.PI*2]);
    const path=g.calls.filter(c=>c.color==='#ffff00').map(c=>c.method);
    eq(path,open?['beginPath','moveTo','arc','closePath','fill']:['beginPath','arc','fill']);
  }
});
test('D04 D05 ghost geometry, colors and negative pupil floor offsets',()=>{
  for(const powered of [false,true])for(let type=0;type<6;type++)for(let d=0;d<4;d++){
    const g=arena(game());g.player.powered=powered;const a=ghost(g,type);a.direction=g.directions[d];g.ghosts=[a];g.calls.length=0;g.draw();
    const color=powered?'#0000ff':a.color;
    const arcs=g.calls.filter(c=>c.method==='arc'&&c.color===color);eq(arcs.map(c=>c.args),[[220,220,18,0,Math.PI*2],[211,238,6,0,Math.PI*2],[220,238,6,0,Math.PI*2],[229,238,6,0,Math.PI*2]]);
    assert.ok(g.calls.some(c=>c.method==='fillRect'&&c.color===color&&JSON.stringify(c.args)==='[202,220,36,18]'));
    eq(g.calls.filter(c=>c.method==='arc'&&c.color==='#ffffff').map(c=>c.args),[[214,214,6,0,Math.PI*2],[226,214,6,0,Math.PI*2]]);
    const [ox,oy]=[[1,0],[-2,0],[0,1],[0,-2]][d];
    eq(g.calls.filter(c=>c.method==='arc'&&c.color==='#000000').map(c=>c.args),[[214+ox,214+oy,3,0,Math.PI*2],[226+ox,214+oy,3,0,Math.PI*2]]);
  }
});
test('D06 HUD and terminal messages, styles and repeated drawing',()=>{
  for(const [over,lives]of [[false,3],[true,3],[true,0],[true,-2]]){
    const g=arena(game());g.score=123;g.lives=lives;g.gameOver=over;
    for(let n=0;n<2;n++){
      g.calls.length=0;g.draw();const texts=g.calls.filter(c=>c.method==='fillText');assert.equal(texts.length,over?3:2);
      eq(texts[0].args,['Score: 123',10,10]);eq(texts[1].args,[`Lives: ${lives}`,1190,10]);
      eq(texts.slice(0,2).map(c=>[c.color,c.align,c.font,c.baseline]),[['#ffffff','left','36px sans-serif','top'],['#ffffff','right','36px sans-serif','top']]);
      if(over){eq(texts[2].args,[lives<=0?'Game Over! Press SPACE to restart':'You Win! Press SPACE to restart',300,400]);assert.equal(texts[2].color,lives<=0?'#ff0000':'#ffff00');assert.equal(texts[2].align,'left');}
    }
  }
});
test('D09 startup initializes, draws and registers browser entry points',()=>{
  const g=game();eq([g.score,g.lives,g.player.x,g.player.y],[0,3,1,1]);assert.equal(g.raf.length,1);assert.equal(g.raf[0],g.frame);
  eq(Object.keys(g.listeners.window),['keydown','keyup','blur']);eq(Object.keys(g.listeners.document),['visibilitychange']);
  assert.equal(g.calls[0].method,'fillRect');assert.ok(g.calls.some(c=>c.method==='fillText'&&c.args[0]==='Score: 0'));
});
test('D08 static offline prerequisites (real browser check is separate)',()=>{
  assert.match(html,/<title>Pac-Man<\/title>/);assert.match(html,/<canvas[^>]*width="1200" height="800"/);
  assert.doesNotMatch(html,/<(?:script|img|link)[^>]+(?:src|href)=/i);assert.match(html,/width: min\(1200px, 100vw, calc\(100vh \* 3 \/ 2\)\)/);
});
