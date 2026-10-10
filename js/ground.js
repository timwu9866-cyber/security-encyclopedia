/* ground.js — 事件大全与节点模型库共用的底色 + 90×60 着色器网格地面(唯一实现) */
(function (root) {
'use strict';
const BG = { dark: '#0b1020', light: '#d5dee9' };
const VS = 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}';
const FS = 'varying vec3 vW;uniform float uTime,uDay;void main(){vec2 p=vW.xz;vec2 g=abs(fract(p-.5)-.5)/fwidth(p);float l=1.-min(min(g.x,g.y),1.);vec2 g2=abs(fract(p/5.-.5)-.5)/fwidth(p/5.);float l2=1.-min(min(g2.x,g2.y),1.);float d=length(p*vec2(.05,.08));float f=exp(-d*d*2.2);if(uDay>0.5){float a=clamp((l*.7+l2*.95)*f,0.,.82);gl_FragColor=vec4(vec3(.27,.32,.39),a);}else{gl_FragColor=vec4(vec3(.12,.36,.5)*(l*.22+l2*.45)*f+vec3(0.,.1,.14)*f*.04,1.);}}';
function makeGrid(T, uTime) {
  const grid = new T.Mesh(new T.PlaneGeometry(90, 60), new T.ShaderMaterial({
    uniforms: { uTime: uTime || { value: 0 }, uDay: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    vertexShader: VS, fragmentShader: FS,
  }));
  grid.rotation.x = -Math.PI / 2; grid.position.y = -0.01; grid.renderOrder = -10; grid.name = 'sec-ground';
  return grid;
}
function setDay(T, grid, day) {
  grid.material.uniforms.uDay.value = day ? 1 : 0;
  grid.material.blending = day ? T.NormalBlending : T.AdditiveBlending; grid.material.needsUpdate = true;
}
/* 暗角:与 stage.js 末端 ShaderPass 同参数(夜 0.7→1,日 0.96→1),用于无后处理的画布 */
const VIG = 'float vg=smoothstep(1.1,.4,length((vUv-.5)*vec2(1.2,1.)));c*=uDay>0.5?mix(.96,1.,vg):mix(.7,1.,vg);';
function vignetteCSS(day) { return day ? 'radial-gradient(ellipse 92% 110% at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,.04) 100%)' : 'radial-gradient(ellipse 92% 110% at 50% 50%, rgba(0,0,0,0) 30%, rgba(0,0,0,.3) 100%)'; }
root.SECGROUND = { BG, VS, FS, VIG, makeGrid, setDay, vignetteCSS };
})(typeof window !== 'undefined' ? window : globalThis);
