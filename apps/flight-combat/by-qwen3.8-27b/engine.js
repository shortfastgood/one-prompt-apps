/* Small, purpose-built WebGL renderer. All geometry is generated locally. */
(() => {
  'use strict';
  const V = {
    add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
    sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
    mul:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
    dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
    cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
    norm:a=>{const n=Math.hypot(...a)||1;return a.map(x=>x/n);}
  };
  const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  function multiply(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;}
  function transform(p=[0,0,0],yaw=0,pitch=0,roll=0,s=[1,1,1]){
    const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch),cr=Math.cos(roll),sr=Math.sin(roll);
    const right=[cy,0,sy],forward=[sy*cp,sp,-cy*cp],up=V.cross(right,forward);
    const r=V.add(V.mul(right,cr),V.mul(up,sr)),u=V.sub(V.mul(up,cr),V.mul(right,sr));
    return new Float32Array([r[0]*s[0],r[1]*s[0],r[2]*s[0],0,u[0]*s[1],u[1]*s[1],u[2]*s[1],0,-forward[0]*s[2],-forward[1]*s[2],-forward[2]*s[2],0,...p,1]);
  }
  function view(eye,target){const z=V.norm(V.sub(eye,target)),x=V.norm(V.cross([0,1,0],z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]);}
  function perspective(aspect,fov=.86,near=1,far=28000){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
  class Geometry {
    constructor(){this.data=[];}
    triangle(a,b,c,color=[1,1,1]){const n=V.norm(V.cross(V.sub(b,a),V.sub(c,a)));for(const p of [a,b,c])this.data.push(...p,...n,...color);return this;}
    quad(a,b,c,d,color){return this.triangle(a,b,c,color).triangle(a,c,d,color);}
  }
  function box(){const g=new Geometry(),p=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];for(const [a,b,c,d] of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])g.quad(p[a],p[b],p[c],p[d]);return g;}
  function ellipsoid(segments=12,rings=7){const g=new Geometry();const p=(i,j)=>{const a=i/segments*Math.PI*2,b=j/rings*Math.PI;return [Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];};for(let j=0;j<rings;j++)for(let i=0;i<segments;i++)g.quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1));return g;}
  function disc(n=64){const g=new Geometry();for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;g.triangle([0,0,0],[Math.sin(a),0,Math.cos(a)],[Math.sin(b),0,Math.cos(b)]);}return g;}
  function ring(n=100,inner=.985){const g=new Geometry();for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;g.quad([Math.sin(a),0,Math.cos(a)],[Math.sin(b),0,Math.cos(b)],[Math.sin(b)*inner,0,Math.cos(b)*inner],[Math.sin(a)*inner,0,Math.cos(a)*inner]);}return g;}
  function wing(points,thickness=.25){const g=new Geometry();const top=points.map(p=>[p[0],p[1]+thickness,p[2]]),bottom=points.map(p=>[p[0],p[1]-thickness,p[2]]);for(let i=1;i<points.length-1;i++){g.triangle(top[0],top[i+1],top[i]);g.triangle(bottom[0],bottom[i],bottom[i+1]);}for(let i=0;i<points.length;i++){const j=(i+1)%points.length;g.quad(top[i],top[j],bottom[j],bottom[i]);}return g;}
  function fuselage(sections,sides=10){const g=new Geometry();for(let j=0;j<sections.length-1;j++)for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;const point=(s,t)=>[Math.cos(t)*s[1],Math.sin(t)*s[2]+(s[3]||0),s[0]];g.quad(point(sections[j],a),point(sections[j],b),point(sections[j+1],b),point(sections[j+1],a));}return g;}
  class Renderer {
    constructor(canvas){
      this.canvas=canvas;const gl=canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'high-performance'});if(!gl)throw new Error('WebGL unavailable');this.gl=gl;
      const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      const vs=shader(gl.VERTEX_SHADER,`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uModel;uniform mat4 uVP;uniform vec3 uEye;varying vec3 vNormal;varying vec3 vColor;varying vec3 vView;varying float vDistance;void main(){vec4 p=uModel*vec4(aPosition,1.0);vNormal=normalize(mat3(uModel)*aNormal);vColor=aColor;vView=uEye-p.xyz;vDistance=distance(uEye,p.xyz);gl_Position=uVP*p;}`);
      const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float;uniform vec4 uColor;uniform vec3 uFog;uniform float uFogDensity;uniform float uEmissive;uniform vec3 uSun;uniform vec3 uSunColor;uniform float uAmbient;uniform float uSpecular;varying vec3 vNormal;varying vec3 vColor;varying vec3 vView;varying float vDistance;void main(){vec3 N=normalize(vNormal);vec3 L=normalize(uSun);float diff=max(dot(N,L),0.0);vec3 H=normalize(L+normalize(vView));float spec=pow(max(dot(N,H),0.0),28.0)*uSpecular;vec3 lit=vColor*(uAmbient+diff*uSunColor)+spec*uSunColor;vec3 c=mix(lit,vColor*uColor.rgb,uEmissive);float fog=1.0-exp(-vDistance*uFogDensity);gl_FragColor=vec4(mix(c,uFog,clamp(fog,0.0,.97)),uColor.a);}`);
      this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
      this.attributes=['aPosition','aNormal','aColor'].map(n=>gl.getAttribLocation(this.program,n));this.uniforms={};for(const n of ['uModel','uVP','uEye','uColor','uFog','uFogDensity','uEmissive','uSun','uSunColor','uAmbient','uSpecular'])this.uniforms[n]=gl.getUniformLocation(this.program,n);
      gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      this.box=this.mesh(box());this.sphere=this.mesh(ellipsoid());this.disc=this.mesh(disc());this.ring=this.mesh(ring());
      this.lighting={sun:[-.5,.35,.28],sunColor:[.55,.62,.85],ambient:.32,specular:0};
      // Precompute a deterministic night sky: a low moon and a scattered starfield on a far dome.
      this.stars=[];let seed=1337;for(let i=0;i<110;i++){seed=(seed*1103515245+12345)&0x7fffffff;const u=(seed/0x7fffffff)*Math.PI*2,v=Math.acos(2*((seed>>8&0xffff)/0xffff)-1),r=9200;this.stars.push({p:[Math.sin(v)*Math.cos(u)*r,Math.abs(Math.cos(v))*r*1.2+120,Math.sin(v)*Math.sin(u)*r],s:.5+((seed>>3&255)/255)*1.4,c:[.8,.86,1]});}
    }
    mesh(geometry){const gl=this.gl,b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(geometry.data),gl.STATIC_DRAW);return {buffer:b,count:geometry.data.length/9};}
    resize(){const d=Math.min(devicePixelRatio||1,1.75),w=Math.round(innerWidth*d),h=Math.round(innerHeight*d);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);}
    begin(eye,target,o={}){
      // Night mode overrides fog and the light rig with a moonlit palette unless the caller supplies one.
      const night=o.night!==false;const fog=o.fog||(night?[.012,.028,.05]:[.47,.62,.65]),density=o.density||(night?.00012:.00012),sun=o.sun||(night?[.35,.26,.55]:[.34,.86,.42]),sunColor=o.sunColor||(night?[.5,.56,.92]:[1,.96,.86]),ambient=o.ambient??(night?.34:.48),specular=o.specular??(night?.6:.15);const gl=this.gl;
      this.resize();gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.vp=multiply(perspective(this.canvas.width/this.canvas.height,o.fov||.86),view(eye,target));
      gl.uniformMatrix4fv(this.uniforms.uVP,false,this.vp);gl.uniform3fv(this.uniforms.uEye,eye);gl.uniform3fv(this.uniforms.uFog,fog);gl.uniform1f(this.uniforms.uFogDensity,density);gl.uniform3fv(this.uniforms.uSun,sun);gl.uniform3fv(this.uniforms.uSunColor,sunColor);gl.uniform1f(this.uniforms.uAmbient,ambient);gl.uniform1f(this.uniforms.uSpecular,specular);this._fog=fog;this._density=density;
     }
    renderSky(){const gl=this.gl;gl.depthMask(false);for(const star of this.stars)this.drawGlow(this.disc,transform(star.p,0,0,0,[star.s,star.s,star.s]),star.c,.9);this.drawGlow(this.disc,transform([-2600,2200,-5200],0,0,0,[60,60,60]),[.78,.83,.98],1.2);gl.depthMask(true);}
    drawGlow(mesh,matrix,color,intensity=1){const gl=this.gl;gl.blendFunc(gl.ONE,gl.ONE);this.draw(mesh,matrix,[color[0],color[1],color[2],.9],1);this.draw(mesh,matrix,[color[0],color[1],color[2],.45*intensity],1);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);}
    draw(mesh,matrix=identity(),color=[1,1,1,1],emissive=0){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);this.attributes.forEach((a,i)=>{gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,36,i*12);});gl.uniformMatrix4fv(this.uniforms.uModel,false,matrix);gl.uniform4fv(this.uniforms.uColor,color.length===3?[...color,1]:color);gl.uniform1f(this.uniforms.uEmissive,emissive);if(color[3]<1)gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,mesh.count);gl.depthMask(true);}
    project(p){const m=this.vp,x=m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],y=m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];return {x:(x/Math.abs(w)*.5+.5)*innerWidth,y:(-.5*y/Math.abs(w)+.5)*innerHeight,front:w>0};}
    aircraft(type){
      const parts=[],part=(mesh,p,s,color,yaw=0,pitch=0,roll=0,tag='')=>parts.push({mesh,matrix:transform(p,yaw,pitch,roll,s),color,tag});
      const olive=type===1?[.48,.52,.37]:type===2?[.38,.46,.46]:[.58,.64,.59],light=[.7,.74,.66],dark=[.15,.22,.23],glass=[.19,.36,.38],accent=[.84,.93,.59];
      const body=type===0?[[-15,.08,.08],[-10,1,1],[-4,1.8,1.5],[4,1.6,1.6],[10,1.2,1.1],[12,1,1]]:type===1?[[-10,.6,.7],[-8,1.3,1.5],[-3,1.45,1.6],[4,.8,1],[11,.2,.4]]:[[-13,.2,.3],[-9,1.6,1.5],[-4,2,1.8],[6,1.4,1.4],[12,.7,.7]];
      part(this.mesh(fuselage(body)),[0,0,0],[1,1,1],olive);
      part(this.sphere,[0,1.25,type===0?-5:-3],[.96,1.2,type===0?3.6:2.4],glass);
      // Faceted wings, stabilizers, and vertical fins are genuine 3D geometry.
      for(const side of [-1,1]){
        const points=type===0?[[side*1,0,-5],[side*11,0,3.2],[side*10.8,0,5.1],[side*1,0,4]]:type===1?[[side*.7,0,-3],[side*13,0,-1],[side*13.4,0,1],[side*11,0,2.1],[side*.7,0,2]]:[[side*1,0,-2],[side*16,0,0],[side*16,0,3.2],[side*1,0,3.7]];
        part(this.mesh(wing(points)),[0,-.3,0],[1,1,1],olive);
        part(this.mesh(wing([[side*.3,0,7],[side*5.5,0,9.5],[side*5.2,0,11],[side*.3,0,10.5]],.14)),[0,.4,0],[1,1,1],olive);
        part(this.box,[side*(type===2?12:8),-.04,type===0?3.2:.4],[1.5,.12,2],accent);
        part(this.box,[side*(type===0?11:6),-.65,type===0?3:-1],[.28,.35,4.5],dark);
        if(type===2){part(this.mesh(fuselage([[-3,1.2,1.2],[2,1.3,1.3],[6,.9,.9]],12)),[side*3,1,3],[1,1,1],light);part(this.disc,[side*3,1,9.1],[.85,.85,.85],dark,0,Math.PI/2);}
      }
      const fin=this.mesh(wing([[0,0,4.5],[0,5.5,8],[0,5,10.3],[0,0,11]],.12));
      if(type===2){for(const s of [-1,1])part(fin,[s*4,0,0],[1,.7,1],olive);}else part(fin,[0,.3,0],[1,1,1],olive);
      if(type===0){part(this.disc,[0,0,12.05],[1,1,1],dark,0,Math.PI/2);part(this.disc,[0,0,12.1],[.68,.68,.68],[.95,.48,.19],0,Math.PI/2,0,'exhaust');part(this.box,[0,-1.25,-3.5],[1.65,.75,3.5],dark);}
      if(type===1){part(this.box,[0,0,-10.6],[.28,9,.18],dark,0,0,0,'prop');part(this.box,[0,0,-10.6],[9,.28,.18],dark,0,0,0,'prop');part(this.sphere,[0,0,-11],[.6,.6,1],accent);}
      part(this.box,[0,2.1,2],[.1,.8,.5],dark);
      return parts;
    }
    drawAircraft(parts,matrix,time=0,enemy=false){for(const p of parts){let local=p.matrix;if(p.tag==='prop')local=multiply(transform([0,0,-10.6],0,0,time*38),multiply(transform([0,0,10.6]),p.matrix));this.draw(p.mesh,multiply(matrix,local),enemy&&p.color[0]>.35?[.61,.31,.22,1]:p.color,p.tag==='exhaust'?.7:0);}}
  }
  window.NyxPatrol={V,Renderer,Geometry,transform,multiply,identity};
})();
