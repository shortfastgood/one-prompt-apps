const { test } = require('node:test');
const assert = require('node:assert/strict');
const { game, arena, board, ghost, state, eq, plain, seeded, mazeInvariant } = require('./harness.cjs');

test('U01 selection boundaries and immutability', () => {
  const g = game(), items = [{}, {}, {}, {}];
  for (const [r, i] of [[0,0],[.25-Number.EPSILON,0],[.25,1],[.5-Number.EPSILON,1],[.5,2],[.75-Number.EPSILON,2],[.75,3],[1-Number.EPSILON,3]]) {
    g.random(() => r); assert.equal(g.choose(items), items[i]); assert.equal(g.choose([items[0]]), items[0]);
  }
  assert.equal(items.length, 4);
});
test('U02 U03 inclusive house and ring geometry', () => {
  const g = game();
  for (let y = 6; y <= 13; y++) for (let x = 9; x <= 20; x++) {
    const house = x >= 11 && x <= 18 && y >= 8 && y <= 11;
    assert.equal(g.inHouse(x,y), house);
    const perimeter = ((y === 7 || y === 12) && x >= 10 && x <= 19) || ((x === 10 || x === 19) && y >= 7 && y <= 12);
    assert.equal(g.inRing(x,y), perimeter);
  }
});
test('U04 U05 destination bounds and cell values', () => {
  const g = arena(game());
  for (const [x,y] of [[-1,5],[30,5],[5,-1],[5,20],[0,5],[14,8],[15,8]]) assert.equal(g.valid(x,y), false);
  for (let c = 0; c <= 4; c++) { g.maze[5][5] = c; assert.equal(g.valid(5,5), [0,2,3].includes(c)); }
  assert.equal(g.valid(12,9), true);
});
test('M01 M02 M03 ghost construction and placement for every color', () => {
  const g = game();
  for (let i = 0; i < 6; i++) for (const initial of [true,false]) {
    g.random(() => .5);
    const a = g.makeGhost(g.ghostTypes[i], initial), b = g.makeGhost(g.ghostTypes[i], initial);
    assert.notEqual(a,b); assert.equal(a.type,g.ghostTypes[i]); assert.equal(a.color,g.ghostTypes[i].color);
    assert.equal(a.direction,g.directions[2]); assert.equal(a.moveTimer,0);
    eq([a.x,a.y,a.waiting], initial && i === 0 ? [14,7,null] : [12+i,10,initial ? i*900 : 900]);
    a.moveTimer=7; a.direction=g.directions[3]; a.x=1;
    g.placeGhost(a, initial);
    assert.equal(a.moveTimer,7); assert.equal(a.direction,g.directions[3]);
    eq([a.x,a.y,a.waiting], initial && i === 0 ? [14,7,null] : [12+i,10,initial ? i*900 : 900]);
  }
});
test('M04 M05 M12 reset replaces dirty state and regenerates maze', () => {
  const g = game(); const old = [g.maze,g.player,g.ghosts];
  const first = plain(g.maze); g.score=400; g.lives=-2; g.gameOver=true; g.player.powered=true;
  g.random(seeded(42)); g.reset();
  assert.equal(g.score,0); assert.equal(g.lives,3); assert.equal(g.gameOver,false);
  [g.maze,g.player,g.ghosts].forEach((v,i) => assert.notEqual(v,old[i]));
  eq(g.player,{x:1,y:1,direction:[1,0],mouthOpen:true,mouthTimer:0,powered:false,powerTimer:0,heading:null,moveTimer:0});
  eq(g.ghosts.map(v=>v.color),['#ff0000','#ffc0cb','#00ffff','#ffa500','#00ff00','#9b30ff']);
  g.ghosts.forEach((v,i)=>eq([v.x,v.y,v.waiting,v.moveTimer],i ? [12+i,10,900*i,0] : [14,7,null,0]));
  assert.notDeepEqual(plain(g.maze),first); mazeInvariant(g.maze);
});
test('M06 generation probability thresholds without repair interference', () => {
  const g = game();
  // Spawn consumes a pellet draw; the next two decisions are wall/pellet for (2,1).
  for (const [wall,pellet,expected] of [[.2-Number.EPSILON,.5,1],[.2,.1,2],[.2,.1-Number.EPSILON,3]]) {
    const values = [.5,wall,pellet]; g.random(()=>values.length ? values.shift() : .5); g.reset();
    assert.equal(g.maze[1][2],expected); assert.equal(g.maze[1][1],0); mazeInvariant(g.maze);
  }
  g.random(()=>0); g.reset();
  for (let y=7;y<=12;y++) for(let x=10;x<=19;x++) if(g.inRing(x,y)) assert.equal(g.maze[y][x],3);
});
test('M07 connected maze is unchanged', () => {
  const g = game(); g.random(()=>.5); g.reset(); const before=plain(g.maze); g.connectMaze(); eq(g.maze,before);
});
test('M08 M09 M10 shortest repair, row-major target and preservation', () => {
  const g=game(); g.maze=board(1); g.maze[1][1]=0; g.maze[1][3]=3; g.maze[1][5]=0;
  const before=plain(g.maze); g.connectMaze();
  assert.equal(g.maze[1][2],2); assert.equal(g.maze[1][4],2);
  const changed=[]; for(let y=0;y<20;y++) for(let x=0;x<30;x++) if(g.maze[y][x]!==before[y][x]) changed.push([x,y]);
  eq(changed,[[2,1],[4,1]]); assert.equal(g.maze[1][3],3); assert.equal(g.maze[1][5],0);
  // A target below the house must connect around its footprint, never through it.
  g.maze=board(1); g.maze[1][1]=0; g.maze[12][15]=3; const fixed=plain(g.maze);
  g.connectMaze(); assert.equal(g.maze[12][15],3);
  let carved=0; for(let y=0;y<20;y++) for(let x=0;x<30;x++) {
    if(g.inHouse(x,y)||!x||x===29||!y||y===19) assert.equal(g.maze[y][x],fixed[y][x]);
    if(fixed[y][x]===1 && g.maze[y][x]===2) carved++;
  }
  assert.equal(carved,24); // Manhattan distance 25, with an equally short route around the house.
});
for(let seed=1;seed<=20;seed++) test(`M11 generated maze invariants seed=${seed}`,()=>mazeInvariant(game(seed).maze));

test('P01 P02 P03 P04 player destinations, collectibles and preservation',()=>{
  for(let d=0;d<4;d++) {
    const g=arena(game()), direction=g.directions[d]; g.player.moveTimer=7;
    assert.equal(g.movePlayer(direction),true); eq([g.player.x,g.player.y],[5+direction[0],5+direction[1]]);
    assert.equal(g.player.direction,direction); assert.equal(g.player.moveTimer,7); assert.equal(g.player.heading,null); assert.equal(g.score,0);
  }
  for(const cell of [1,4]) { const g=arena(game()); g.maze[5][6]=cell; const before=state(g); assert.equal(g.movePlayer(g.directions[0]),false); eq(state(g),before); }
  const g=arena(game()); g.player.x=29; const before=state(g); assert.equal(g.movePlayer(g.directions[0]),false); eq(state(g),before);
  g.player.x=5; g.maze[5][6]=2; g.movePlayer(g.directions[0]); assert.equal(g.score,10); assert.equal(g.maze[5][6],0);
  g.movePlayer(g.directions[1]); g.movePlayer(g.directions[0]); assert.equal(g.score,10);
  for(const x of [7,8]) {g.maze[5][x]=3; g.player.powerTimer=13; g.movePlayer(g.directions[0]); assert.equal(g.player.powered,true); assert.equal(g.player.powerTimer,300); assert.equal(g.maze[5][x],0);}
  assert.equal(g.score,110);
});
test('P05 P06 P07 steer start, duplicate, reverse and blocked turn',()=>{
  const g=arena(game()); g.player.moveTimer=7; g.steer(g.directions[0]); eq([g.player.x,g.player.y,g.player.moveTimer],[6,5,0]);
  assert.equal(g.player.heading,g.directions[0]); g.player.moveTimer=9; const before=state(g); g.steer(g.directions[0]); eq(state(g),before);
  g.maze[4][6]=1; g.steer(g.directions[3]); eq(state(g).player,before.player);
  g.steer(g.directions[1]); eq([g.player.x,g.player.y,g.player.moveTimer],[5,5,0]); assert.equal(g.player.heading,g.directions[1]);
});
test('P08 P09 P10 automatic movement thresholds and wall stop',()=>{
  const g=arena(game()); g.player.moveTimer=8; g.autoMove(); assert.equal(g.player.moveTimer,8);
  g.player.heading=g.directions[0];
  for(const timer of [0,8]) {g.player.moveTimer=timer; g.autoMove(); assert.equal(g.player.moveTimer,timer+1); assert.equal(g.player.x,5);}
  for(const cell of [0,2,3,1,4]) {
    arena(g); g.player.heading=g.directions[0]; g.player.moveTimer=9; g.maze[5][6]=cell; g.autoMove();
    const blocked=[1,4].includes(cell); assert.equal(g.player.x,blocked?5:6); assert.equal(g.player.moveTimer,0);
    assert.equal(g.player.heading,blocked?null:g.directions[0]); assert.equal(g.score,cell===2?10:cell===3?50:0);
    if(cell===3) assert.equal(g.player.powerTimer,300);
    if(blocked){const before=state(g);g.autoMove();eq(state(g),before);}
  }
});
test('P11 P12 tick movement cadence and blocked input before scheduled move',()=>{
  const g=arena(game());g.events=['ArrowRight'];g.tick();eq([g.player.x,g.player.moveTimer],[6,1]);
  for(let i=0;i<8;i++)g.tick();assert.equal(g.player.x,6);g.tick();assert.equal(g.player.x,7);
  for(let i=0;i<10;i++)g.tick();assert.equal(g.player.x,8);
  g.player.moveTimer=9;g.maze[4][8]=1;g.events=['ArrowUp'];g.tick();assert.equal(g.player.x,9);assert.equal(g.player.heading,g.directions[0]);
});
test('G01 G02 G03 exact ghost release and movement cadence',()=>{
  const g=arena(game());assert.equal(g.makeGhost(g.ghostTypes[0],true).waiting,null);
  for(let i=1;i<6;i++) {
    const a=g.makeGhost(g.ghostTypes[i],true), direction=a.direction; a.moveTimer=8;
    for(let t=0;t<i*900-1;t++)g.moveGhost(a);
    eq([a.x,a.y,a.waiting,a.moveTimer],[12+i,10,1,8]);g.moveGhost(a);
    eq([a.x,a.y,a.waiting,a.moveTimer],[14,7,null,0]);assert.equal(a.direction,direction);
    a.direction=g.directions[0];for(let t=0;t<14;t++)g.moveGhost(a);eq([a.x,a.moveTimer],[14,14]);g.moveGhost(a);eq([a.x,a.moveTimer],[15,0]);
  }
});
test('G04 G05 G06 G07 G08 ghost straight, blocked, reversal, trapped and power parity',()=>{
  for(let d=0;d<4;d++)for(const c of [0,2,3]) {
    const g=arena(game()),a=ghost(g),dir=g.directions[d];a.direction=dir;a.moveTimer=14;g.maze[5+dir[1]][5+dir[0]]=c;
    g.random(()=>{throw Error('straight movement must not choose');});g.moveGhost(a);
    eq([a.x,a.y],[5+dir[0],5+dir[1]]);assert.equal(g.maze[a.y][a.x],c);
  }
  for(const powered of [false,true])for(let choice=0;choice<3;choice++) {
    const g=arena(game()),a=ghost(g);g.player.powered=powered;g.maze[5][6]=4;a.moveTimer=14;g.random(()=>choice/3);g.moveGhost(a);
    eq([a.x,a.y],[[4,5],[5,6],[5,4]][choice]);assert.equal(a.direction,g.directions[choice+1]);assert.equal(a.moveTimer,0);
  }
  for(const trapped of [false,true]) {
    const g=arena(game()),a=ghost(g);for(const [dx,dy]of g.directions)g.maze[5+dy][5+dx]=1;
    if(!trapped)g.maze[5][4]=0;a.moveTimer=14;g.moveGhost(a);eq([a.x,a.y,a.moveTimer],[trapped?5:4,5,0]);assert.equal(a.direction,g.directions[trapped?0:1]);
  }
  const g=arena(game()),a=ghost(g,0,1,1);a.direction=g.directions[1];a.moveTimer=14;g.random(()=>0);g.moveGhost(a);eq([a.x,a.y],[2,1]);
  const b=ghost(g,1,1,1);b.moveTimer=14;g.moveGhost(b);eq([b.x,b.y],[a.x,a.y]);
});

test('T01 T02 T03 T17 event ordering, terminal freeze and restart',()=>{
  const g=arena(game());g.maze[4][6]=1;g.events=['ArrowRight','ArrowRight','ArrowUp','ArrowDown','Space'];g.tick();
  eq([g.player.x,g.player.y,g.player.moveTimer],[6,6,1]);eq(g.events,[]);
  for(const lives of [3,0]) {
    arena(g);g.gameOver=true;g.lives=lives;g.events=['ArrowRight'];const before=state(g);g.tick();eq(state(g),before);eq(g.events,[]);
    g.random(()=>.5);g.events=['ArrowDown','Space','ArrowRight'];g.tick();
    eq([g.player.x,g.player.y,g.player.moveTimer,g.player.mouthTimer,g.score,g.lives,g.gameOver],[2,1,1,1,10,3,false]);
    assert.equal(g.ghosts[1].waiting,899);
  }
});
test('T04 Escape at different positions preserves only preceding event effects',()=>{
  for(const [events,x,terminal] of [[['Escape','ArrowRight'],5,false],[['ArrowRight','Escape','ArrowDown'],6,false],[['Space','Escape','ArrowRight'],1,true]]) {
    const g=arena(game());g.gameOver=terminal;g.events=events;g.tick();assert.equal(g.player.x,x);assert.equal(g.player.mouthTimer,0);assert.equal(g.stopped,true);eq(g.events,[]);
  }
});
test('T05 T06 animation and power timer boundaries while stationary',()=>{
  for(const open of [false,true]){const g=arena(game());g.player.mouthOpen=open;g.player.mouthTimer=8;g.tick();eq([g.player.mouthOpen,g.player.mouthTimer],[open,9]);g.tick();eq([g.player.mouthOpen,g.player.mouthTimer],[!open,0]);}
  const g=arena(game());g.player.powerTimer=8;g.tick();assert.equal(g.player.powerTimer,8);g.player.powered=true;g.player.powerTimer=2;g.tick();eq([g.player.powered,g.player.powerTimer],[true,1]);g.tick();eq([g.player.powered,g.player.powerTimer],[false,0]);
});
test('T07 pellet collection and expiration precede collision outcomes',()=>{
  for(const auto of [false,true]) {
    const g=arena(game());g.maze[5][6]=3;g.ghosts=[ghost(g,0,6,5)];
    if(auto){g.player.heading=g.directions[0];g.player.moveTimer=9;}else g.events=['ArrowRight'];
    g.tick();eq([g.score,g.lives,g.player.powerTimer],[250,3,299]);
  }
  const g=arena(game());g.player.powered=true;g.player.powerTimer=1;g.ghosts=[ghost(g)];g.tick();assert.equal(g.lives,2);assert.equal(g.score,0);
});
test('T08 T09 collision phase ignores mismatches, swaps and intermediate positions',()=>{
  for(const [x,y]of [[5,6],[6,5],[6,6]]){const g=arena(game());g.ghosts=[ghost(g,0,x,y)];g.tick();assert.equal(g.lives,3);assert.equal(g.score,0);}
  for(const scenario of ['converge','away','swap','intermediate']) {
    const g=arena(game());const a=ghost(g,0,scenario==='converge'?7:6,5);g.ghosts=[a];
    g.events=['ArrowRight'];
    if(scenario==='intermediate')g.events.push('ArrowDown');
    else {a.moveTimer=14;a.direction=g.directions[scenario==='away'?0:1];}
    g.tick();assert.equal(g.lives,scenario==='converge'?2:3,scenario);
  }
});
test('T10 T11 powered snapshot replacement preserves order and defers new ghosts',()=>{
  const g=arena(game());g.player.powered=true;g.player.powerTimer=100;g.random(()=>.75);
  const originals=Array.from({length:6},(_,i)=>ghost(g,i));g.ghosts=originals.slice();g.tick();
  assert.equal(g.score,1200);assert.equal(g.ghosts.length,6);
  g.ghosts.forEach((a,i)=>{assert.notEqual(a,originals[i]);assert.equal(a.type,originals[i].type);eq([a.x,a.y,a.waiting,a.moveTimer],[12+i,10,900,0]);assert.equal(a.direction,g.directions[3]);});
  g.tick();g.ghosts.forEach(a=>assert.equal(a.waiting,899));assert.equal(g.score,1200);
});
test('T12 T14 life loss resets positions but retains current timers and directions',()=>{
  const g=arena(game());g.score=70;g.player.heading=g.directions[2];g.player.moveTimer=2;g.player.direction=g.directions[1];g.player.mouthTimer=4;g.player.powerTimer=17;
  g.ghosts=Array.from({length:6},(_,i)=>ghost(g,i));g.ghosts[2]=g.makeGhost(g.ghostTypes[2],false);
  const beforeMaze=plain(g.maze);g.tick();eq([g.lives,g.score,g.player.x,g.player.y],[2,70,1,1]);eq(g.maze,beforeMaze);
  eq([g.player.heading,g.player.direction,g.player.moveTimer,g.player.mouthTimer,g.player.powerTimer,g.player.mouthOpen],[[0,1],[-1,0],3,5,17,true]);
  g.ghosts.forEach((a,i)=>{eq([a.x,a.y,a.waiting],i?[12+i,10,i*900]:[14,7,null]);assert.equal(a.moveTimer,i===2?0:1);});
});
test('T13 simultaneous fatal collisions continue below zero without reset',()=>{
  const g=arena(game());g.lives=1;g.ghosts=[ghost(g),ghost(g,1),ghost(g,2)];g.tick();eq([g.lives,g.gameOver,g.player.x,g.player.y],[-2,true,5,5]);g.ghosts.forEach(a=>eq([a.x,a.y],[5,5]));
});
test('T15 T16 collectibles and simultaneous terminal outcomes',()=>{
  for(const c of [0,2,3])for(const [x,y]of [[1,1],[28,18]]){const g=arena(game());g.maze=board();g.maze[y][x]=c;g.tick();assert.equal(g.gameOver,c===0);}
  for(const fatal of [false,true]){const g=arena(game());g.maze=board();g.maze[5][6]=2;g.events=['ArrowRight'];if(fatal){g.lives=1;g.ghosts=[ghost(g,0,6,5)];}g.tick();eq([g.gameOver,g.lives,g.score],[true,fatal?0:3,10]);}
});

test('M09 row-major component choice is observable in carve order',()=>{
  const g=game();g.maze=board(1);g.maze[1][1]=0;g.maze[1][3]=3;g.maze[3][1]=0;
  const writes=[];
  // Observe real writes without replacing the connectivity algorithm.
  g.maze=g.maze.map((row,y)=>new Proxy(row,{set(target,x,value){if(target[x]!==value)writes.push([Number(x),y,value]);target[x]=value;return true;}}));
  g.connectMaze();eq(writes,[[2,1,2],[1,2,2]]);
});
test('T10 replacement appends after surviving ghosts and retains collision order',()=>{
  const g=arena(game());g.player.powered=true;g.player.powerTimer=10;
  const a=ghost(g,0),survivor=ghost(g,1,20,5),b=ghost(g,2);g.ghosts=[a,survivor,b];g.tick();
  assert.equal(g.ghosts[0],survivor);eq(g.ghosts.map(v=>v.type.color),['#ffc0cb','#ff0000','#00ffff']);assert.equal(g.score,400);
});
