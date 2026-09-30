const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={window:{},Float32Array,Math,devicePixelRatio:1,innerWidth:1280,innerHeight:800};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'engine.js'),'utf8'),context);
const {transform,multiply,identity,Renderer}=context.window.NyxPatrol;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} is not near ${b}`);

test('aircraft transform preserves an orthogonal orientation and translation',()=>{
  const m=transform([11,25,-49],.71,.4,-.6);
  for(let a=0;a<3;a++)for(let b=0;b<3;b++)near(m[a*4]*m[b*4]+m[a*4+1]*m[b*4+1]+m[a*4+2]*m[b*4+2],a===b?1:0);
  assert.deepEqual(Array.from(m.slice(12,15)),[11,25,-49]);
});
test('forward geometry uses the same yaw and pitch convention as flight physics',()=>{
  const {direction}=require('./simulation.js');for(const [yaw,pitch]of [[0,0],[Math.PI/2,.3],[-2,-.5]]){const m=transform([0,0,0],yaw,pitch),f=direction(yaw,pitch);f.forEach((v,i)=>near(-m[8+i],v));}
});
test('matrix composition keeps local aircraft components attached',()=>{
  const m=multiply(transform([10,20,30],Math.PI/2),transform([0,0,-5]));near(m[12],15);near(m[13],20);near(m[14],30);assert.deepEqual(Array.from(multiply(identity(),m)),Array.from(m));
});

// This validates generated geometry and renderer commands, not GPU shader compilation.
test('all three aircraft generate finite geometry and render matrices',()=>{
  let uploadedVertices=0,draws=0;
  const gl=new Proxy({}, {get:(_,name)=>{
    if(name==='getShaderParameter'||name==='getProgramParameter')return()=>true;
    if(name==='getAttribLocation')return()=>0;
    if(name==='bufferData')return(_target,data)=>{assert.ok(data.length>0);assert.ok(data.every(Number.isFinite));assert.equal(data.length%9,0);uploadedVertices+=data.length/9;};
    if(name==='uniformMatrix4fv')return(_where,_transpose,matrix)=>{assert.equal(matrix.length,16);assert.ok(matrix.every(Number.isFinite));};
    if(name==='drawArrays')return()=>draws++;
    if(name.startsWith('create')||name==='getUniformLocation')return()=>({});
    if(name===name.toUpperCase())return 1;
    return()=>{};
  }});
  const canvas={getContext:()=>gl,width:1280,height:800};const renderer=new Renderer(canvas);
  renderer.begin([0,10,70],[0,0,0]);
  for(let i=0;i<3;i++){const parts=renderer.aircraft(i);assert.ok(parts.length>=15);renderer.drawAircraft(parts,transform([0,0,0]),1.5);}
  assert.ok(uploadedVertices>1000);assert.ok(draws>45);const projected=renderer.project([0,0,0]);near(projected.x,640);near(projected.y,400);assert.equal(projected.front,true);
});
test('HTML references only existing local assets and scripts use no network APIs',()=>{
  const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
  for(const [,asset]of html.matchAll(/(?:src|href)="([^"]+)"/g)){assert.ok(asset.startsWith('./'),asset);assert.ok(fs.existsSync(path.join(__dirname,asset)),asset);}
  for(const file of ['engine.js','simulation.js','game.js']){const source=fs.readFileSync(path.join(__dirname,file),'utf8');assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|importScripts)\s*\(/);}
});
