/* schemes.js — 事件"表现方案"库:把动效原语组合成可复用的方案,事件只需给出参数与字幕。
   SEC_X(o) 把紧凑的事件描述展开成与 events-*.js 相同结构的事件对象(含 ph 与 fx)。 */
(function(){
'use strict';
const U=[0,0,5.2],UT=[0,2.5,5.2],AT=[0,0,-5.5],ATT=[0,2.5,-5.5],X=[10.5,0,-6.5],XT=[10.5,2.5,-6.5],XL=[-11,0,-6.5],XLT=[-11,2.5,-6.5];
const L=(c,e,o)=>['link',0.4,e||14.6,Object.assign({col:c||'ok'},o||{})];
const A=Object.assign, lerp=(a,b,u)=>a+(b-a)*u;
const SCH={};
const rowX=(n,a,b)=>Array.from({length:n},(_,i)=>n===1?(a+b)/2:lerp(a,b,i/(n-1)));
const fanPos=(n,a,b)=>rowX(n,a,b).map((x,i)=>[x,2.0,-4.5-(i%2)*2.2]);
const NEVER=1e9;

/* ===== 攻击类方案 ===== */
// A. 注入拼接 / 属性篡改 / 撕裂
SCH.inject={cc:['ok','ok','atk','atk','atk','atk'],fn(p){
  const o=A({cells:9,ins:2,mode:'inject',shape:'dart',rec:'drain',rc:[5,3],idx:[2,3,4],bad:'atk',tin:5.4,tex:8.2,glyph:null,hitCol:'atk',recCol:'ok',recCol2:'atk',ret:true,g2:'doc',nshape:'mail'},p);
  const f=[L('ok'),['packet',2,3.6,{col:'ok',shape:o.nshape,size:.4}]];
  const bar={at:{a:'dstT',d:[0,2.6,0]},cells:o.cells,mode:o.mode,tIn:o.tin,tEx:o.tex,ins:o.ins,bad:o.bad};
  if(o.mode==='swap')bar.idx=o.idx;
  f.push(['bar',3.2,10.8,bar],['packet',5,7.5,{col:o.bad,shape:o.shape,size:.4}],['@hit',8.2,9,{who:'dst',col:o.hitCol,shards:8}],['@tint',8.2,9.6,{who:'dst',col:o.hitCol,k:.8,back:14.2}]);
  if(o.glyph)f.push(['glyph',8.4,14.5,{name:o.glyph,at:'dst',dy:8.8,col:o.hitCol,size:.95,anim:'pop'}]);
  if(o.ret)f.push(['packet',10.6,13.4,{wp:['dstT','srcT'],col:'warn',shape:o.g2,n:4,gap:.35,size:.4}]);
  if(o.rec)f.push(['records',10.2,14.6,{at:'dst',mode:o.rec,col:o.recCol,col2:o.recCol2,rows:o.rc[1],cols:o.rc[0]}]);
  return f;}};

// B. 口令尝试 / 喷洒 / 轮换出口绕过限速
SCH.guess={cc:['ok','atk','atk','warn','atk','atk'],fn(p){
  const o=A({n:18,shape:'key',lock:'lock',un:'unlock',acc:0,lab:[],pick:3,via:0,ret:'ticket',kind:'client'},p);
  const f=[L('ok'),['glyph',.8,10.4,{name:o.lock,at:'dst',dy:6.2,col:'ok',size:1,anim:'float'}],['glyph',10.4,15,{name:o.un,at:'dst',dy:6.2,col:'atk',size:1.1,anim:'pop'}]];
  if(o.acc){
    const xs=rowX(o.acc,-3.8,3.8),inf=xs.map((x,i)=>i===o.pick?10.2:NEVER);
    f.push(['hosts',0.6,14.6,{n:o.acc,layout:'row',z:5.6,x:[-3.8,3.8],kind:o.kind,col:'atk',inf,lab:o.lab,links:false,scale:.32,id:'ac'}]);
    xs.forEach((x,i)=>{const ts=2+i*(6.5/o.acc);f.push(['packet',ts,ts+1.1,{wp:['srcT',[x,2.2,5.6]],col:'atk',shape:o.shape,size:.3,n:2,gap:.25,arc:2.2}]);});
    f.push(['packet',10.4,12.4,{wp:[[xs[o.pick],2.2,5.6],'dstT'],col:'atk',shape:o.ret,size:.42,arc:2.6}]);
  }else if(o.via){
    const ps=fanPos(o.via,-6,6);
    f.push(['hosts',0.6,14.6,{n:o.via,layout:'fan',x:[-6,6],kind:'net',col:'warn',inf:ps.map((_,i)=>6+i*.5),lab:[],links:false,scale:.3,id:'px'}]);
    f.push(['gate',1,14.6,{u:.88,col:'def',pulses:[2.4,3,3.6,4.2,7.2,7.9,8.6,9.3],bad:[0,1,2,3],r:1.1}],['meter',2,14.6,{at:'dst',lv:[[2,.1],[4.4,.85],[5.6,.25],[10,.9]]}]);
    f.push(['packet',2.2,4.8,{col:'atk',shape:o.shape,size:.3,n:5,gap:.5,d:1.3,end:.55}]);
    ps.forEach((q,i)=>f.push(['packet',6.4+i*.9,8.4+i*.9,{wp:['srcT',[q[0],2.2,q[2]],'dstT'],col:'atk',shape:o.shape,size:.3,n:2,gap:.3,arc:2.6}]));
  }else{
    f.push(['packet',2,9.4,{col:'atk',shape:o.shape,size:.34,n:o.n,gap:.4,d:1.2,arc:2.6}],['meter',2,15,{at:'dst',lv:[[2,.05],[10,.95]]}],['glyph',3,10,{name:'cross',at:'dst',dy:7.4,col:'atk',size:.7,anim:'blink'}]);
  }
  f.push(['@hit',10.4,11.2,{who:'dst',col:'atk',n:28,shards:4}],['@tint',10.4,11.4,{who:'dst',col:'atk',k:.7}]);
  if(!o.acc)f.push(['packet',11.5,13.8,{wp:['dstT','srcT'],col:'warn',shape:o.ret,size:.46,arc:3}]);
  return f;}};

// C. 洪水 / 慢速占满
SCH.flood={cc:['ok','atk','atk','warn','atk','atk'],fn(p){
  const o=A({style:'stream',n:8,kind:'iot',shape:'dart',rate:44,ulab:'正常用户'},p);
  const f=[L('ok'),['relay',0,14.6,{id:'u',at:U,kind:'client',col:'ok',label:o.ulab,scale:.42}],['packet',.8,2.8,{wp:[UT,'dstT'],col:'ok',shape:'mail',size:.36}]];
  if(o.style==='queue'){
    f.push(['queue',2,14.6,{at:'dst',n:16,r:3.1,col:'warn',col2:'atk',fill:[2.5,10]}],['packet',2.5,13,{col:'warn',shape:o.shape,size:.3,n:o.n,gap:.7,d:3.6,arc:2.4,end:.9}],['hosts',1,14.6,{n:3,layout:'row',z:-5.8,x:[-12,-6],kind:o.kind,col:'atk',inf:[2,2.4,2.8],links:false,scale:.32}]);
    f.push(['meter',3,14.6,{at:'dst',lv:[[3,.1],[6,.45],[10,1]]}]);
  }else{
    f.push(['hosts',1.5,14.6,{n:o.n,layout:'row',z:-5.8,x:[-13,-3],kind:o.kind,col:'atk',inf:rowX(o.n,2,3.4),links:false,scale:.34}],
      ['stream',3.6,11.5,{wp:[[-9,2.4,-5.8],'dstT'],col:'atk',rate:o.rate,life:1.7,spread:[5,1.4,1.5],size:.22,arc:3}],['stream',3.6,11.5,{wp:['srcT','dstT'],col:'atk',rate:22,life:1.5,spread:[1,1,1],size:.22}],['meter',3.5,14.6,{at:'dst',lv:[[3.5,.1],[6,.55],[9,1]]}]);
  }
  f.push(['@tint',6,10,{who:'dst',col:'atk',k:.85}],['packet',9.8,12,{wp:[UT,'dstT'],col:'ok',shape:'mail',size:.36,end:.8,bounce:.4}],['glyph',11.4,14.6,{name:'cross',at:[0,0,5.2],dy:3.3,col:'atk',size:.9}],['nodefx',0,0,{who:'dst',shake:[[7,12,.05]],dim:[[9.5,1],[11,.45]]}]);
  return f;}};

// D. 反射放大
SCH.reflect={cc:['ok','warn','warn','atk','atk','atk'],fn(p){
  const o=A({n:3,rk:'cloud',rl:['公共服务甲','公共服务乙','公共服务丙'],small:'dot',big:'atk'},p);
  const rs=[[-4,-6],[0.5,-7.5],[5,-6]].slice(0,o.n),f=[L('ok',14.6,{alpha:.5})];
  rs.forEach((r,i)=>{f.push(['relay',1,14.6,{id:'r'+i,at:[r[0],0,r[1]],kind:o.rk,col:'warn',label:o.rl[i]||'',scale:.4}],
    ['packet',2.5+i*.5,4.4+i*.5,{wp:['srcT',[r[0],2.2,r[1]]],col:'warn',shape:o.small,size:.22,n:3,gap:.25,arc:2.4}],
    ['stream',5.2,11.8,{wp:[[r[0],2.2,r[1]],'dstT'],col:o.big,rate:20,life:1.5,spread:[1.6,1,1],size:.25,arc:2.6,seed:3+i}]);});
  f.push(['glyph',3,6,{name:'mask',at:'src',dy:6.2,col:'warn',size:.9,anim:'pop'}],['meter',5,14.6,{at:'dst',lv:[[5,.1],[8,.7],[10.5,1]]}],['@tint',7,11,{who:'dst',col:'atk',k:.8}],['nodefx',0,0,{who:'dst',shake:[[8,12,.05]],dim:[[10,1],[11.5,.45]]}],['glyph',11,14.6,{name:'cross',at:'dst',dy:7.4,col:'atk',size:.9,anim:'blink'}]);
  return f;}};

// E. 劫持改道 / 窃听 / 降级
SCH.detour={cc:['ok','ok','atk','atk','atk','atk'],fn(p){
  const o=A({rk:'net',rl:'中间节点',rcol:'atk',g:'eye',shape:'mail',mode:'sniff',gate:false,steal:true,sg:'doc',hold:null,ng:'check'},p);
  const f=[['link',0.4,5.6,{col:'ok',out:.6}],['relay',4.3,14.6,{id:'m',at:AT,kind:o.rk,col:o.rcol,label:o.rl,scale:.44}],['packet',2,4.2,{col:'ok',shape:o.shape,size:.4}]];
  if(o.gate)f.push(['gate',1.5,14.6,{u:.5,col:'def',pulses:[3.1,8.4,9.4,10.4],bad:[1,2,3],r:1.2}]);
  if(o.mode==='redirect'){
    f.push(['link',5.4,14.6,{wp:['srcT',ATT],col:'atk',arc:2.4}],['packet',6,8.6,{wp:['srcT',ATT],col:'ok',colTo:'atk',tAt:.55,shape:o.shape,size:.4,n:3,gap:.6,arc:2.4}],['nodefx',0,0,{who:'dst',dim:[[7,1],[9,.45]]}],
      ['glyph',8.6,14.6,{name:o.g,at:AT,dy:3.7,col:'atk',size:1,anim:'pop'}],['@hit',8.8,9.6,{who:'m',col:'atk',n:22,r:1.8}]);
    if(o.steal)f.push(['packet',10.6,13.2,{wp:[ATT,'srcT'],col:'atk',shape:o.sg,n:2,gap:.5,size:.4,arc:2.6}]);
  }else{
    f.push(['link',5.4,14.6,{wp:['srcT',ATT,'dstT'],col:'atk',arc:2.4}],['packet',6,9.4,{wp:['srcT',ATT,'dstT'],col:'ok',colTo:o.mode==='tamper'?'atk':null,tAt:.5,shape:o.shape,size:.4,n:3,gap:.7,arc:2.4}],
      ['glyph',8,14.6,{name:o.g,at:AT,dy:3.7,col:'atk',size:1,anim:o.mode==='tamper'?'throb':'float'}],['@hit',8.2,9,{who:'m',col:'atk',n:18,r:1.6}]);
    if(o.steal)f.push(['packet',9.8,12.6,{wp:[ATT,XT],col:'warn',shape:o.sg,n:3,gap:.5,size:.38,arc:3}],['relay',9,14.6,{id:'x',at:X,kind:'cloud',col:'atk',label:'攻击者服务器',scale:.4}]);
  }
  f.push(['@tint',10.4,11.4,{who:'dst',col:'atk',k:.5,back:14.4}],['glyph',12,14.6,{name:o.ng,at:'dst',dy:8.2,col:'atk',size:.9,anim:'pop'}]);
  return f;}};

// F. 隧道 / 隐蔽通道
SCH.tunnel={cc:['ok','atk','warn','warn','atk','atk'],fn(p){
  const o=A({s1:'globe',s2:'lock',mid:'dns',ml:'DNS 服务',mk:'net',ex:'攻击者服务器',n:6},p);
  const f=[L('ok'),['relay',0,14.6,{id:'x',at:X,kind:'cloud',col:'atk',label:o.ex,scale:.42}],
    ['records',1,14.6,{at:'src',dy:6.4,cols:5,rows:2,sz:.34,mode:'hop',seq:[1,3,5,7,8],col:'ok',col2:'warn',to:'dstT'}],
    ['orbit',2.5,6,{at:'src',n:3,shape:'bug',col:'atk',rad:1.4,h:1.9,size:.4,flat:1}],
    ['packet',3,10.6,{col:'ok',colTo:'warn',tAt:.45,shape:o.s1,size:.34,n:o.n,gap:.8,d:2,arc:2.4}],
    ['glyph',6,14.6,{name:'mask',at:'dst',dy:6.2,col:'warn',size:.9,anim:'float'}],
    ['packet',6.2,12.8,{wp:['dstT',XT],col:'warn',shape:o.s2,size:.34,n:o.n-1,gap:.8,d:2.2,arc:3.2}],
    ['link',6,14.6,{wp:['dstT',XT],col:'warn',dash:1,arc:3.2,r:.04}],['@pulse',8,10,{at:'srcF',col:'warn',n:2}],['glyph',12.8,14.6,{name:'check',at:X,dy:5,col:'atk',size:1,anim:'pop'}]];
  return f;}};

// G. 提权上升
SCH.climb={cc:['ok','ok','atk','atk','atk','atk'],fn(p){
  const o=A({via:'bug',shape:'dart',lvl:[.5,2.3,4.1],glyph:'skull',extra:null,eg:'gear',nshape:'mail'},p);
  const f=[L('ok'),['packet',2,3.6,{col:'ok',shape:o.nshape,size:.4}],['glyph',.8,6,{name:'user',at:'dst',dy:6.2,col:'ok',size:.9,anim:'float'}],
    ['packet',4.4,6.6,{col:'atk',shape:o.shape,size:.4}],['orbit',5.4,11.4,{at:'dst',n:4,shape:o.via,col:'atk',rad:2.3,h:2.2,size:.5,grow:2}],
    ['privesc',6.4,11.8,{at:'dst',col:'atk',lvl:o.lvl}],['@hit',11.6,12.4,{who:'dst',col:'atk',n:30,shards:6}],['@tint',11.6,12.4,{who:'dst',col:'atk',k:.85,back:14.4}],
    ['glyph',11.8,14.8,{name:o.glyph,at:'dst',dy:7.4,col:'atk',size:1.05,anim:'pop'}],['link',12.6,14.6,{wp:['dstT','srcT'],col:'atk',dash:1,arc:2.6}]];
  if(o.extra)f.push(['glyph',7,11,{name:o.eg,at:'dst',dy:8.6,col:'warn',size:.8,anim:'throb'}]);
  return f;}};

// H. 持久化植入(清除后仍复活)
SCH.persist={cc:['atk','atk','atk','def','warn','atk'],fn(p){
  const o=A({mark:'hook',hidden:'flag',shape:'dart',hl:null},p);
  return [L('atk'),['packet',1.2,3.2,{col:'atk',shape:o.shape,size:.4}],['@hit',3.2,4,{who:'dst',col:'atk',n:22,shards:3}],['glyph',3.6,9.4,{name:o.mark,at:'dst',dy:7.6,col:'atk',size:1,anim:'pop'}],
    ['glyph',5,14.8,{name:o.hidden,at:'dst',dy:.4,dz:-.5,col:'vio',size:.7,anim:'blink'}],
    ['sweep',7.6,10.6,{mode:'radar',at:'dst',col:'def',r:3.6}],['glyph',9.4,10.6,{name:'check',at:'dst',dy:7.6,col:'def',size:1,anim:'pop'}],
    ['nodefx',0,0,{who:'dst',dim:[[10.8,1],[11.5,.25],[12.6,1]],tint:'atk',k:[[3.6,0],[4.4,.5],[9.4,.5],[10.6,.1],[12.8,.7]]}],
    ['ring',12.6,14.6,{at:'dstF',col:'atk',n:2,gap:.4}],['glyph',12.8,14.8,{name:o.mark,at:'dst',dy:7.6,col:'atk',size:1.05,anim:'pop'}],['packet',13,14.8,{wp:['dstT','srcT'],col:'atk',shape:'orb',size:.34,n:2,gap:.35,arc:2.8}]];}};

// I. 域认证票据类
SCH.ticket={cc:['ok','atk','warn','atk','atk','atk'],fn(p){
  const o=A({mode:'kerb',dl:'域控制器',dk:'server'},p);
  const f=[L('ok',14.6,{alpha:.5}),['relay',0,14.6,{id:'dc',at:AT,kind:o.dk,col:'info',label:o.dl,scale:.46}]];
  if(o.mode==='kerb'){
    f.push(['packet',2,3.6,{wp:['srcT',ATT],col:'atk',shape:'ticket',size:.38,n:2,gap:.4,arc:2.4}],['packet',3.8,5.6,{wp:[ATT,'srcT'],col:'warn',shape:'ticket',size:.4,n:2,gap:.4,arc:2.4}],
      ['glyph',5.8,10,{name:'hash',at:'src',dy:6.4,col:'warn',size:1,anim:'float'}],['timer',6,10,{at:'src',dy:8.2,col:'warn',done:9.6}],['orbit',6,10,{at:'src',n:4,shape:'key',col:'warn',rad:1.8,h:2.3,size:.4}],
      ['packet',10.3,12.3,{col:'atk',shape:'key',size:.42}]);
  }else if(o.mode==='golden'){
    f.push(['packet',1.5,3.2,{wp:['srcT',ATT],col:'atk',shape:'hook',size:.38,arc:2.4}],['@hit',3.2,4,{who:'dc',col:'atk',n:22,r:1.6}],['nodefx',0,0,{who:'dc',tint:'atk',k:[[3.2,0],[4,.7]]}],
      ['glyph',4.6,14.6,{name:'ticket',at:'src',dy:6.4,col:'vio',size:1.1,anim:'pop'}],['gate',5,14.6,{u:.55,col:'def',pulses:[8.6,9.4,10.2],bad:[],r:1.2}],
      ['packet',7.8,10.8,{col:'vio',shape:'ticket',size:.44,n:3,gap:.6}],['link',5,14.6,{wp:[ATT,'dstT'],col:'dim',dash:1,alpha:.35,arc:2.4}],['glyph',8,11,{name:'question',at:AT,dy:4,col:'warn',size:.9,anim:'blink'}]);
  }else{ // dcsync
    f.push(['packet',2,4.2,{wp:['srcT',ATT],col:'atk',shape:'hook',size:.4,n:3,gap:.4,arc:2.4}],['glyph',3,14.6,{name:'mask',at:'src',dy:6.2,col:'atk',size:.9,anim:'float'}],
      ['records',4.6,10.8,{at:AT,dy:5.8,cols:5,rows:3,sz:.34,mode:'drain',col:'info',col2:'atk'}],['packet',5.4,10.8,{wp:[ATT,'srcT'],col:'warn',shape:'hash',n:6,gap:.6,size:.34,arc:3}],['@tint',4.6,6,{who:'dc',col:'atk',k:.45,back:12}]);
  }
  f.push(['@hit',10.8,11.6,{who:'dst',col:'atk',n:30,shards:5}],['@tint',10.8,11.8,{who:'dst',col:'atk',k:.85,back:14.4}],['glyph',11.5,14.6,{name:'skull',at:'dst',dy:7.6,col:'atk',size:1,anim:'pop'}],['link',12.4,14.6,{wp:['dstT','srcT'],col:'atk',dash:1,arc:2.6}]);
  return f;}};

// J. 窃取 / 暴露 / 误发
SCH.steal={cc:['ok','atk','warn','atk','atk','atk'],fn(p){
  const o=A({mode:'scan',dk:'db',g:'unlock',sg:'doc',rc:[5,3],seq:[1,3,5,7,9,11],wl:'错误收件方'},p);
  const f=[L('ok',14.6,{alpha:.6})];
  if(o.mode==='infect'){
    f.push(['relay',0,14.6,{id:'u',at:U,kind:'client',col:'ok',label:'用户终端',scale:.45}],['orbit',2.5,8,{at:U,n:3,shape:'bug',col:'atk',rad:1.4,h:1.9,size:.4,flat:1}],['packet',2.2,4.2,{wp:['srcT',UT],col:'atk',shape:'dart',size:.4}],
      ['@hit',4.2,5,{who:'u',col:'atk',n:20,r:1.6}],['glyph',5,14.6,{name:'key',at:U,dy:3.4,col:'warn',size:.9,anim:'float'}],['packet',6,10.4,{wp:[UT,'srcT'],col:'warn',shape:o.sg,n:5,gap:.6,size:.36,arc:3.4}],
      ['records',7,14.6,{at:'dst',dy:6.4,cols:5,rows:2,sz:.34,mode:'blink',col:'ok',col2:'warn'}],['packet',10.4,13.4,{col:'atk',shape:'ticket',size:.44}]);
  }else if(o.mode==='misdeliver'){
    f.push(['relay',0,14.6,{id:'w',at:X,kind:'client',col:'warn',label:o.wl,scale:.42}],['packet',1.8,3.4,{col:'ok',shape:'mail',size:.38}],['records',2.4,6,{at:'src',dy:6.4,cols:5,rows:2,sz:.34,mode:'hop',seq:[1,3,6,8],col:'ok',col2:'warn',to:'srcT'}],
      ['glyph',5.4,8,{name:'question',at:'src',dy:8.4,col:'warn',size:.9,anim:'blink'}],['packet',6,10.2,{wp:['srcT',XT],col:'warn',shape:o.sg,n:3,gap:.7,size:.4,arc:3.2}],['link',5.8,14.6,{wp:['srcT',XT],col:'warn',dash:1,arc:3.2,r:.04}],
      ['@pulse',10.2,11.4,{at:X,col:'warn',n:2}],['glyph',10.4,14.6,{name:'warn',at:X,dy:5,col:'atk',size:1,anim:'pop'}],['@tint',10.4,12,{who:'w',col:'atk',k:.5}],['glyph',11.5,14.6,{name:'eye',at:'src',dy:6.2,col:'def',size:.9,anim:'float'}]);
  }else{ // scan: 暴露面被发现并取走
    f.push(['sweep',2,6.5,{mode:'radar',at:'dst',col:'atk',r:3.8,spd:1.5}],['stream',2,6,{wp:['srcT','dstT'],col:'atk',rate:26,life:1.4,size:.16,spread:[.5,.5,.5]}],
      ['shield',0.4,14.6,{at:'dst',style:'dome',col:'warn',r:3.2,brk:6.4,a:.6}],['glyph',6.4,14.6,{name:o.g,at:'dst',dy:8.4,col:'atk',size:1,anim:'pop'}],['@pulse',6.4,8,{at:'dstF',col:'warn',n:2}],
      ['records',7.2,14.6,{at:'dst',cols:o.rc[0],rows:o.rc[1],mode:'drain',col:'ok',col2:'warn'}],['packet',7.6,12.4,{wp:['dstT','srcT'],col:'warn',shape:o.sg,n:6,gap:.7,d:1.6,size:.38,arc:3}],['@tint',7.2,10,{who:'dst',col:'warn',k:.5,back:14.4}]);
  }
  return f;}};

// K. 加密勒索 / 擦除 / 双重勒索
SCH.encrypt={cc:['ok','atk','atk','atk','warn','atk'],fn(p){
  const o=A({mode:'ransom',rc:[7,3],g:'dollar',orb:'lock',ex:true},p);
  const f=[L('atk',14.6,{alpha:.7}),['packet',2,4.5,{col:'atk',shape:'dart',size:.4,n:2,gap:.6}]];
  if(o.mode==='wiper'){
    f.push(['records',0,15,{at:'dst',cols:o.rc[0],rows:o.rc[1],sz:.36,mode:'drain',col:'ok',col2:'dim'}],['sweep',3,9,{mode:'radar',at:'dst',col:'atk',r:3.6}],['nodefx',0,0,{who:'dst',tint:'dim',k:[[3.5,0],[10,.9]],shake:[[3.5,10,.035]],dim:[[10,1],[12,.3]]}],
      ['orbit',4,15,{at:'dst',n:6,shape:'skull',col:'atk',rad:2.6,h:2.2,size:.55,grow:5}],['glyph',11.5,15,{name:'skull',at:'src',dy:6.3,col:'atk',size:1.1,anim:'throb'}],['glyph',10.5,15,{name:'cross',at:'dst',dy:8.8,col:'atk',size:1.0,anim:'blink'}]);
  }else{
    f.push(['records',0,15,{at:'dst',cols:o.rc[0],rows:o.rc[1],sz:.36,mode:'fill',col:'ok',col2:'vio'}],['sweep',2.5,9,{mode:'radar',at:'dst',col:'vio',r:3.6}],['nodefx',0,0,{who:'dst',tint:'vio',k:[[3,0],[9,.85]],shake:[[3,9,.03]]}],
      ['orbit',4,15,{at:'dst',n:7,shape:o.orb,col:'vio',rad:2.7,h:2.2,size:.6,grow:4}],['glyph',11,15,{name:o.g,at:'src',dy:6.4,col:'warn',size:1.1,anim:'throb'}],['timer',11,15,{at:'dst',dy:8.4,col:'warn',done:14.6}]);
    if(o.mode==='extort')f.push(['relay',5,14.6,{id:'x',at:X,kind:'cloud',col:'warn',label:'泄露站点',scale:.42}],['packet',5.2,9.6,{wp:['dstT',XT],col:'warn',shape:'doc',n:5,gap:.7,size:.36,arc:3.2}],['link',5,14.6,{wp:['dstT',XT],col:'warn',dash:1,arc:3.2,r:.04}],['glyph',10,14.6,{name:'globe',at:X,dy:5,col:'warn',size:1,anim:'throb'}]);
  }
  return f;}};

// L. 社会工程诱骗
SCH.lure={cc:['ok','atk','warn','atk','atk','atk'],fn(p){
  const o=A({bait:'mail',bk:'client',ul:'受害者',fl:'伪造站点',fk:'cloud',fake:'doc',lg:'hook',take:'key',mode:'std'},p);
  const f=[L('ok',14.6,{alpha:.35}),['relay',0,14.6,{id:'u',at:U,kind:o.bk,col:'ok',label:o.ul,scale:.46}],['relay',4,14.6,{id:'x',at:X,kind:o.fk,col:'atk',label:o.fl,scale:.42}]];
  if(o.mode==='door'){
    f.push(['shield',0.5,14.6,{at:'mid',style:'gate',col:'def',x:0}],['packet',2,5.4,{wp:[U,UT,'dstT'],col:'ok',shape:'user',size:.4,arc:1.5}],['packet',2.7,6.1,{wp:['srcT','dstT'],col:'atk',shape:'user',size:.4,arc:2.2}]);
    f.push(['glyph',5.4,9,{name:'question',at:'mid',dy:3,col:'warn',size:.95,anim:'blink'}],['@hit',6.1,6.9,{who:'dst',col:'atk',n:22,shards:3}],['@tint',6.1,7,{who:'dst',col:'atk',k:.7,back:14.4}],['glyph',7,14.6,{name:'unlock',at:'dst',dy:7.8,col:'atk',size:1,anim:'pop'}],
      ['packet',8,11.4,{wp:['dstT','srcT'],col:'warn',shape:'doc',n:3,gap:.5,size:.4,arc:3}],['glyph',10.4,14.6,{name:'eye',at:'src',dy:6.2,col:'def',size:.9,anim:'float'}]);
    return f;}
  f.push(['packet',1.8,4,{wp:['srcT',UT],col:'atk',shape:o.bait,size:.42,arc:2.8}],['glyph',3.8,14.6,{name:o.lg,at:U,dy:3.4,col:'warn',size:.9,anim:'float'}],
    ['packet',5.4,8.2,{wp:[UT,XT],col:'warn',shape:o.take,size:.4,arc:3.4}],['link',5.4,14.6,{wp:[UT,XT],col:'warn',dash:1,arc:3.4,r:.04}],['@tint',5.6,7,{who:'u',col:'warn',k:.5,back:14.4}],['@hit',8.2,9,{who:'x',col:'atk',n:18,r:1.6}],
    ['packet',9,12,{wp:[XT,'dstT'],col:'atk',shape:'ticket',size:.44,arc:3}],['@hit',12,12.8,{who:'dst',col:'atk',n:26,shards:4}],['@tint',12,13,{who:'dst',col:'atk',k:.8,back:14.8}],['glyph',12.6,14.8,{name:'skull',at:'dst',dy:7.6,col:'atk',size:1,anim:'pop'}]);
  return f;}};

// M. 供应链投毒
SCH.supply={cc:['ok','atk','atk','atk','atk','atk'],fn(p){
  const o=A({mode:'std',rl:'软件仓库',rk:'cloud',fake:'仿冒仓库',pk:'bug',n:3,lab:['下游甲','下游乙','下游丙']},p);
  const f=[L('ok',14.6,{alpha:.4}),['relay',0,14.6,{id:'r',at:AT,kind:o.rk,col:'info',label:o.rl,scale:.46}],['packet',1.2,3,{wp:['dstT',ATT],col:'ok',shape:'doc',size:.38,arc:2.4}]];
  if(o.mode==='twin'){
    f.push(['relay',2.2,14.6,{id:'f',at:[3.5,0,-7.4],kind:o.rk,col:'atk',label:o.fake,scale:.4}],['packet',3,5.4,{wp:['srcT',[3.5,2.4,-7.4]],col:'atk',shape:'shard',size:.4,arc:2.6}],['@tint',5.4,6.4,{who:'f',col:'atk',k:.7}],
      ['packet',6.2,9.2,{wp:['dstT',[3.5,2.4,-7.4]],col:'ok',colTo:'atk',tAt:.5,shape:'hook',size:.38,arc:3}],['packet',9.2,11.4,{wp:[[3.5,2.4,-7.4],'dstT'],col:'atk',shape:o.pk,size:.44,arc:3}]);
  }else{
    f.push(['packet',3,5.8,{wp:['srcT',ATT],col:'atk',shape:'shard',size:.42,arc:2.4}],['@hit',5.8,6.6,{who:'r',col:'atk',n:22,r:1.8}],['@tint',5.8,7,{who:'r',col:'atk',k:.55,back:14.4}],
      ['packet',7,10.8,{wp:[ATT,'dstT'],col:'atk',shape:o.pk,size:.44,arc:2.8}]);
  }
  f.push(['hosts',6,14.6,{n:o.n,layout:'row',z:5.4,x:[-3.6,1.6],kind:'server',col:'atk',inf:[10.6,11.4,12.2].slice(0,o.n),lab:o.lab,links:false,scale:.34,id:'d'}],
    ['@hit',10.8,11.6,{who:'dst',col:'atk',n:26,shards:4}],['@tint',10.8,11.8,{who:'dst',col:'atk',k:.8,back:14.8}],['glyph',11.2,14.8,{name:o.pk,at:'dst',dy:7.6,col:'atk',size:1,anim:'pop'}],['packet',12,14.4,{wp:['dstT','srcT'],col:'warn',shape:'doc',n:2,gap:.5,size:.38,arc:2.8}]);
  return f;}};

// N. 账号/所有权被夺
SCH.takeover={cc:['ok','warn','atk','atk','atk','atk'],fn(p){
  const o=A({cr:null,cl:'中间环节',ck:'net',g:'user',ul:'合法用户',sg:'key'},p);
  const f=[['relay',0,14.6,{id:'u',at:U,kind:'client',col:'ok',label:o.ul,scale:.44}],['link',0.4,14.6,{wp:[UT,'dstT'],col:'ok',cut:{u:.6,t:8.6,w:.08}}],['glyph',.6,14.6,{name:o.g,at:'dst',dy:6.2,col:'ok',colTo:'atk',tC:8.8,size:1,anim:'float'}],
    ['sweep',1.8,4.4,{mode:'radar',at:'dst',col:'atk',r:3.4}]];
  if(o.cr)f.push(['relay',3.4,14.6,{id:'c',at:AT,kind:o.ck,col:'warn',label:o.cl,scale:.42}],['packet',4.2,6.6,{wp:['srcT',ATT],col:'atk',shape:o.sg,size:.4,arc:2.4}],['packet',6.4,8.6,{wp:[ATT,'dstT'],col:'atk',shape:o.sg,size:.4,arc:2.4}],['@tint',5.5,7,{who:'c',col:'atk',k:.6}]);
  else f.push(['packet',4.4,8.4,{col:'atk',shape:o.sg,size:.4,n:2,gap:.6}]);
  f.push(['@hit',8.6,9.4,{who:'dst',col:'atk',n:24,shards:4}],['@tint',8.6,9.6,{who:'dst',col:'atk',k:.8,back:14.8}],['link',9,14.6,{col:'atk',arc:2.4}],['@tint',8.8,10,{who:'u',col:'dim',k:.6}],['glyph',9.6,14.6,{name:'cross',at:U,dy:3.3,col:'atk',size:.9,anim:'blink'}],
    ['packet',10.6,13.4,{wp:['dstT','srcT'],col:'warn',shape:'doc',n:3,gap:.5,size:.38,arc:3}]);
  return f;}};

// P. 竞态 / 并发
SCH.race={cc:['ok','warn','atk','atk','atk','atk'],fn(p){
  const o=A({shape:'dart',rg:'coin',gl:'warn'},p);
  return [L('ok'),['packet',2,3.6,{col:'ok',shape:'mail',size:.4}],['records',2,14.6,{at:'dst',cols:5,rows:2,sz:.38,mode:'hop',seq:[2],col:'ok',col2:'warn',to:'srcT'}],
    ['glyph',3.4,14.6,{name:'check',at:'dst',dy:7.8,col:'ok',size:.8,anim:'float'}],
    ['packet',5,8,{col:'atk',shape:o.shape,size:.38,arc:2.0}],['packet',5,8,{col:'atk',shape:o.shape,size:.38,arc:3.6}],['packet',5.1,8.1,{col:'atk',shape:o.shape,size:.34,arc:4.6}],
    ['glyph',6.4,8.2,{name:'bolt',at:'mid',dy:2.4,col:'warn',size:1,anim:'blink'}],['@hit',8,8.9,{who:'dst',col:'atk',n:28,shards:4}],['@tint',8,9.4,{who:'dst',col:'warn',k:.7,back:14.4}],
    ['packet',9.2,12.8,{wp:['dstT','srcT'],col:'warn',shape:o.rg,n:3,gap:0,size:.42,arc:2.6,off:[0,.45,0]}],['records',9,14.6,{at:'dst',dy:8.6,cols:5,rows:1,sz:.36,mode:'flip',col:'ok',col2:'atk'}],['glyph',11.4,14.6,{name:'warn',at:'dst',dy:7.8,col:'atk',size:1,anim:'pop'}]];}};

// Q. 录制重放 / 总线注入
SCH.replay={cc:['ok','ok','warn','atk','atk','atk'],fn(p){
  const o=A({rl:'嗅探设备',rk:'iot',sg:'key',ng:'unlock',mode:'replay',nshape:'key'},p);
  const f=[L('ok'),['relay',1.5,14.6,{id:'m',at:AT,kind:o.rk,col:'warn',label:o.rl,scale:.4}],['packet',2,4.2,{col:'ok',shape:o.nshape,size:.4}],['glyph',3.2,6,{name:'eye',at:AT,dy:3.6,col:'warn',size:.9,anim:'blink'}],
    ['packet',3.4,5.6,{wp:['srcT',ATT],col:'warn',shape:'dot',size:.22,arc:3}],['loopArc',5.6,9.6,{at:'mid',col:'warn',r:1.5}],['glyph',5.6,14.6,{name:'doc',at:AT,dy:5.2,col:'warn',size:.7,anim:'float'}]];
  if(o.mode==='inject'){
    f.push(['packet',8.4,10.4,{wp:[ATT,'dstT'],col:'atk',shape:o.sg,size:.38,n:5,gap:.3,arc:2.4}],['bar',7.6,13,{at:{a:'dstT',d:[0,2.6,0]},cells:10,mode:'swap',idx:[3,4,5,6],tIn:9.4,bad:'atk'}]);
  }else f.push(['packet',8.2,11.2,{col:'warn',colTo:'atk',tAt:.5,shape:o.nshape,size:.4,n:3,gap:.6,arc:2.2}]);
  f.push(['@hit',10.8,11.6,{who:'dst',col:'atk',n:26,shards:4}],['@tint',10.8,11.8,{who:'dst',col:'atk',k:.7,back:14.6}],['glyph',11.4,14.6,{name:o.ng,at:'dst',dy:7.6,col:'atk',size:1,anim:'pop'}]);
  return f;}};

// R. 合约循环 / 闪电贷
SCH.chain={cc:['ok','atk','atk','atk','atk','atk'],fn(p){
  const o=A({mode:'reenter',cl:'流动性池'},p);
  const f=[L('ok',14.6,{alpha:.5}),['meter',1,14.6,{at:'dst',lv:[[1,.9],[8,.82],[10.5,.35],[13,.05]]}],['records',1,14.6,{at:'dst',cols:5,rows:3,sz:.36,mode:'drain',col:'warn',col2:'atk'}]];
  if(o.mode==='reenter'){
    f.push(['packet',2,3.6,{col:'atk',shape:'bolt',size:.42}],['glyph',3.4,14.6,{name:'hook',at:'src',dy:6.2,col:'atk',size:.9,anim:'throb'}]);
    for(let i=0;i<5;i++){f.push(['packet',4.6+i*1.5,5.8+i*1.5,{wp:['srcT','dstT'],col:'atk',shape:'bolt',size:.34,arc:2.6}],['packet',5.6+i*1.5,6.9+i*1.5,{wp:['dstT','srcT'],col:'warn',shape:'coin',size:.4,arc:3.4}]);}
    f.push(['loopArc',5,12.6,{at:'mid',col:'atk',r:1.8,spd:2.4}]);
  }else{
    f.push(['relay',1.5,14.6,{id:'p',at:XL,kind:'cloud',col:'info',label:o.cl,scale:.42}],['packet',2.4,4.8,{wp:[XLT,'srcT'],col:'warn',shape:'coin',size:.7,arc:3}],['glyph',4.4,13,{name:'bolt',at:'src',dy:6.2,col:'warn',size:1,anim:'throb'}],
      ['bar',5,10.8,{at:{a:'dstT',d:[0,2.6,0]},cells:10,mode:'swap',idx:[2,3,4],tIn:6.4,bad:'atk'}],['packet',5.2,7,{col:'warn',shape:'coin',size:.6,n:2,gap:.3}],['packet',7.6,9.4,{wp:['dstT','srcT'],col:'warn',shape:'coin',size:.5,n:4,gap:.3,arc:3}],
      ['packet',10.4,12.4,{wp:['srcT',XLT],col:'warn',shape:'coin',size:.7,arc:3}]);
  }
  f.push(['@hit',8.6,9.4,{who:'dst',col:'atk',n:30,shards:5}],['@tint',8.6,9.6,{who:'dst',col:'atk',k:.8,back:14.6}],['glyph',11.8,14.6,{name:'dollar',at:'src',dy:6.4,col:'atk',size:1.05,anim:'pop'}],['glyph',12,14.6,{name:'cross',at:'dst',dy:8.8,col:'atk',size:.9,anim:'blink'}]);
  return f;}};

/* ===== 防守类方案 ===== */
// U. 拦截过滤 / 清洗 / 校验门
SCH.dfilter={cc:['def','ok','atk','def','def','def'],fn(p){
  const o=A({style:'wall',gl:'WAF',gk:'net',bad:'dart',good:'mail',gg:'shield',mode:'pass',out:false},p);
  const f=[L('ok',14.6),['shield',0.5,15,{at:'midF',style:o.style,col:'def',hits:[7.2,8.2,9.2]}],['relay',0,15,{id:'w',at:[0,0,-4.5],kind:o.gk,col:'def',label:o.gl,scale:.42}]];
  if(o.mode==='scrub'){
    f.push(['hosts',1.5,14.6,{n:6,layout:'row',z:-5.8,x:[-13,-5],kind:'iot',col:'atk',inf:rowX(6,2,3),links:false,scale:.32}],['stream',3.6,10.5,{wp:[[-9,2.4,-5.8],'midF'],col:'atk',rate:46,life:1.4,spread:[4,1.4,1.5],size:.22,arc:2}],
      ['stream',3.6,11,{wp:['mid','dstT'],col:'ok',rate:7,life:1.5,spread:[.5,.5,.5],size:.2}],['meter',3.5,14.6,{at:'dst',lv:[[3.5,.1],[5,.3],[9,.2]]}],['burst',6,9,{at:'mid',col:'def',col2:'atk',n:40,r:2.6,shards:5}]);
  }else{
    f.push(['packet',2,4.6,{col:'ok',shape:o.good,size:.4}],['bar',4,11,{at:'mid',dy:.4,cells:9,mode:'filter',tIn:7.2,col:'ok',bad:'atk'}],['packet',5,7.2,{col:'atk',shape:o.bad,size:.4,end:.5}],['burst',7.2,9,{at:'mid',col:'def',col2:'atk',n:36,r:2.4,shards:6}],
      ['packet',9,12,{col:'ok',shape:o.good,size:.4,n:2,gap:.8}]);
  }
  f.push(['@hit',7.2,8,{who:'dst',col:'def',n:16,r:1.6}],['glyph',7.4,12,{name:o.gg,at:'mid',dy:2.8,col:'def',size:1.1,anim:'pop'}],['glyph',11.8,15,{name:'doc',at:AT,dy:3.2,col:'def',size:.8,anim:'pop'}]);
  return f;}};

// V. 多源关联 / 汇聚告警
SCH.dsiem={cc:['def','warn','warn','def','def','def'],fn(p){
  const o=A({n:4,kind:'server',lab:['日志源 A','日志源 B','日志源 C','日志源 D'],hub:'chip',hg:'bell',rsp:'shield'},p);
  const ps=fanPos(o.n,-6,6),f=[L('ok',14.6,{alpha:.4}),['hosts',0.4,14.6,{n:o.n,layout:'fan',x:[-6,6],kind:o.kind,col:'warn',inf:rowX(o.n,2.2,4.6),lab:o.lab,links:false,scale:.34,id:'s'}],['glyph',.6,14.6,{name:o.hub,at:'src',dy:6.2,col:'def',size:.9,anim:'float'}]];
  ps.forEach((q,i)=>f.push(['packet',2.4+i*.7,4.4+i*.7,{wp:[[q[0],2.0,q[2]],'srcT'],col:'warn',shape:'doc',size:.3,n:2,gap:.3,arc:2.6}]));
  f.push(['records',5,14.6,{at:'src',dy:6.8,cols:6,rows:2,sz:.3,mode:'flip',col:'dim',col2:'def'}],['@pulse',7,9,{at:'srcF',col:'def',n:3}],['glyph',7.2,14.6,{name:o.hg,at:'src',dy:9,col:'def',size:1.1,anim:'blink'}],['packet',8.4,10,{col:'atk',shape:'dart',size:.36,end:.8}],
    ['packet',9.6,12.2,{col:'def',shape:o.rsp,size:.46,n:2,gap:.6}],['@hit',12.2,13,{who:'dst',col:'def',n:20,r:1.8}],['@tint',12.2,13.2,{who:'dst',col:'def',k:.5,back:14.6}],['glyph',12.6,14.8,{name:'check',at:'dst',dy:7.8,col:'ok',size:1,anim:'pop'}]);
  return f;}};

// W. 沙箱动态分析
SCH.dsandbox={cc:['def','warn','warn','def','def','def'],fn(p){
  const o=A({sl:'沙箱',v:'bad'},p);
  return [L('ok',14.6,{alpha:.4}),['relay',0,14.6,{id:'sb',at:AT,kind:'cloud',col:'def',label:o.sl,scale:.46}],['shield',.4,14.6,{at:AT,style:'dome',col:'def',r:2.6,a:.7}],
    ['packet',1.8,4.6,{wp:['srcT',ATT],col:'warn',shape:'doc',size:.42,arc:2.4}],['sweep',4.6,10,{mode:'radar',at:AT,col:'def',r:2.4,spd:1.6}],['orbit',5.2,9.6,{at:AT,n:4,shape:'bug',col:'atk',rad:1.8,h:2.2,size:.4}],
    ['glyph',7.5,10,{name:'eye',at:AT,dy:5.2,col:'def',size:.9,anim:'blink'}],['records',5,10,{at:AT,dy:5.6,cols:5,rows:2,sz:.28,mode:'flip',col:'dim',col2:'atk'}],['@hit',9.6,10.4,{who:'sb',col:'def',n:16,r:1.4}],
    ['packet',10.4,12.8,{wp:[ATT,'srcT'],col:'def',shape:'doc',size:.4,arc:2.4}],['glyph',10.6,14.8,{name:'skull',at:AT,dy:5.2,col:'atk',size:.9,anim:'pop'}],['packet',11.2,14,{wp:['srcT','dstT'],col:'def',shape:'shield',size:.46,arc:2.2}],['@tint',12.6,13.6,{who:'dst',col:'def',k:.4,back:14.8}]];}};

// X. 分段阻断横向
SCH.dseg={cc:['atk','atk','def','def','def','def'],fn(p){
  const o=A({n:3,zl:['区域 A','区域 B','区域 C']},p);
  return [L('atk',14.6,{alpha:.5}),['shield',.5,15,{at:'midF',style:'wall',col:'def',hits:[6.4,8.2,10]}],['hosts',.5,14.6,{n:o.n,layout:'row',z:5.4,x:[-6.4,-2.4],kind:'server',col:'atk',inf:[3.2,3.8,NEVER],lab:o.zl,links:false,scale:.34,id:'z'}],
    ['hosts',.5,14.6,{n:2,layout:'row',z:5.4,x:[2.6,5.4],kind:'server',col:'atk',inf:[NEVER,NEVER],lab:['区域 D','区域 E'],links:false,scale:.34,id:'y'}],
    ['orbit',2.5,12,{at:'src',n:4,shape:'bug',col:'atk',rad:2.1,h:2.2,size:.46}],['packet',4.4,6.4,{col:'atk',shape:'dart',size:.4,end:.5}],['packet',6.4,8.2,{wp:['srcT',[-4.4,2.2,5.4]],col:'atk',shape:'dart',size:.34,arc:2.2}],
    ['packet',8.2,10,{col:'atk',shape:'dart',size:.4,end:.5}],['@hit',6.4,7.2,{who:'dst',col:'def',n:18,r:1.6}],['burst',8.2,10,{at:'mid',col:'def',col2:'atk',n:34,r:2.4,shards:5}],['glyph',8.6,15,{name:'shield',at:'mid',dy:2.8,col:'def',size:1.1,anim:'pop'}],
    ['@pulse',11,13,{at:'srcF',col:'def',n:2}],['glyph',11.2,15,{name:'lock',at:'src',dy:6.2,col:'def',size:.9,anim:'pop'}]];}};

// Y. 闭环(扫描-修复-验证 / 响应三步)
SCH.dloop={cc:['atk','def','def','def','def','ok'],fn(p){
  const o=A({g:['eye','gear','check'],tint:'atk',cols:['def','warn','ok']},p);
  const f=[L('ok',14.6,{alpha:.5}),['glyph',.4,14.8,{name:'bug',at:'dst',dy:6.2,col:'atk',colTo:'ok',tC:11.4,size:1,anim:'float'}],['nodefx',0,0,{who:'dst',tint:o.tint,k:[[0,.7],[10.8,.7],[11.8,0]]}]];
  [-3.2,0,3.2].forEach((dx,i)=>{const t0=2+i*3.3;f.push(['glyph',t0,14.8,{name:o.g[i],at:'mid',dx,dy:3.2,col:o.cols[i],size:1,anim:'pop'}],['packet',t0,t0+1.6,{wp:i?[{a:'mid',d:[dx-3.2,2,0]},{a:'mid',d:[dx,2,0]}]:['srcT',{a:'mid',d:[dx,2,0]}],col:o.cols[i],shape:o.g[i],size:.36,arc:1.6}]);});
  f.push(['loopArc',2,12,{at:'mid',col:'def',r:2.4,spd:1.2}],['sweep',2,5,{mode:'radar',at:'dst',col:'def',r:3.4}],['packet',8.6,10.6,{wp:['srcT','dstT'],col:'warn',shape:'gear',size:.42}],['@hit',10.6,11.4,{who:'dst',col:'ok',n:24,shards:3}],['@pulse',11.4,13,{at:'dstF',col:'ok',n:2}],
    ['packet',12,14.4,{wp:['dstT','srcT'],col:'ok',shape:'doc',size:.4,arc:2.6}]);
  return f;}};

// Z. 凭据/特权保险库:请求-校验-临时授予-记录
SCH.dvault={cc:['def','warn','def','def','def','def'],fn(p){
  const o=A({vl:'凭据保险库',vk:'db',g:'key',tg:'ticket'},p);
  return [L('ok',14.6,{alpha:.4}),['relay',0,14.6,{id:'v',at:AT,kind:o.vk,col:'def',label:o.vl,scale:.46}],['glyph',.4,14.6,{name:'lock',at:AT,dy:3.9,col:'def',size:.9,anim:'float'}],
    ['packet',1.8,3.8,{wp:['srcT',ATT],col:'warn',shape:'key',size:.38,arc:2.4}],['gate',3.4,8.4,{wp:['srcT',ATT],u:.6,col:'def',pulses:[3.6],bad:[],r:1.0}],['glyph',4.6,8,{name:'user',at:AT,dy:6,col:'def',size:.8,anim:'pop'}],
    ['packet',5.6,7.8,{wp:[ATT,'srcT'],col:'def',shape:o.tg,size:.42,arc:2.4}],['timer',6,12,{at:'src',dy:8.2,col:'def',done:11.6}],['gate',7.4,14.6,{u:.85,col:'def',pulses:[8.4,12.6],bad:[1],r:1.1}],['packet',8.2,10.8,{col:'def',shape:'mail',size:.4,n:2,gap:.7}],
    ['glyph',9,14.8,{name:'eye',at:'dst',dy:8.2,col:'def',size:.9,anim:'blink'}],['packet',12.4,14.2,{col:'atk',shape:'dart',size:.36,end:.5}],['burst',12.6,14,{at:'dstT',col:'def',col2:'atk',n:22,r:1.6,ring:false}],['@hit',12.4,13.2,{who:'dst',col:'def',n:12,r:1.4}]];}};

// AA. 红蓝对抗
SCH.dredblue={cc:['def','atk','atk','def','def','def'],fn(p){
  return [L('atk',14.6,{alpha:.5}),['relay',0,14.6,{id:'b',at:AT,kind:'server',col:'def',label:'蓝队 / 监控',scale:.44}],['shield',.5,14.6,{at:'dst',style:'dome',col:'def',r:3.4,hits:[4.8,7.2],a:.7}],
    ['packet',2.2,4.8,{col:'atk',shape:'dart',size:.4,end:.55}],['packet',5,7.2,{col:'atk',shape:'bug',size:.4,end:.55,arc:3.2}],['packet',7.6,10,{col:'warn',shape:'key',size:.4,arc:1.6}],
    ['@hit',10,10.8,{who:'dst',col:'warn',n:22,shards:3}],['glyph',10.2,14.6,{name:'flag',at:'dst',dy:7.8,col:'warn',size:1,anim:'pop'}],['glyph',10.4,14.6,{name:'bell',at:AT,dy:3.9,col:'def',size:1,anim:'blink'}],
    ['packet',11,13.4,{wp:['srcT',ATT],col:'warn',shape:'doc',n:2,gap:.5,size:.4,arc:2.4}],['packet',12,14.4,{wp:[ATT,'dstT'],col:'def',shape:'gear',size:.42,arc:2.4}],['@pulse',12.8,14.6,{at:'dstF',col:'def',n:2}]];}};

// AB. 演练/培训 员工分层响应
SCH.dtrain={cc:['def','warn','warn','def','def','ok'],fn(p){
  return [L('ok',14.6,{alpha:.3}),['hosts',0.4,14.6,{n:6,layout:'row',z:5.4,x:[-5.6,5.6],kind:'client',col:'atk',inf:[5.6,NEVER,6.2,NEVER,NEVER,7],lab:['员工1','员工2','员工3','员工4','员工5','员工6'],links:false,scale:.3,id:'e'}],
    ['glyph',.6,14.6,{name:'mail',at:'src',dy:6.2,col:'warn',size:.9,anim:'float'}],['packet',2,5.2,{wp:['srcT',[-5.6,2.1,5.4]],col:'warn',shape:'mail',size:.3,arc:2.4}],['packet',2.4,5.6,{wp:['srcT',[0,2.1,5.4]],col:'warn',shape:'mail',size:.3,arc:2.4}],['packet',2.8,6,{wp:['srcT',[5.6,2.1,5.4]],col:'warn',shape:'mail',size:.3,arc:2.4}],
    ['glyph',8,11,{name:'flag',at:[-1.1,0,5.4],dy:2.8,col:'def',size:.7,anim:'pop'}],['glyph',8.4,11,{name:'flag',at:[3.4,0,5.4],dy:2.8,col:'def',size:.7,anim:'pop'}],['glyph',8.8,11,{name:'flag',at:[1.1,0,5.4],dy:2.8,col:'def',size:.7,anim:'pop'}],
    ['meter',6,14.6,{at:'dst',lv:[[6,.6],[9,.5],[12,.15]]}],['packet',9.4,12,{wp:['dstT','srcT'],col:'def',shape:'doc',n:2,gap:.5,size:.4,arc:2.8}],['glyph',10.4,14.8,{name:'bars',at:'dst',dy:6.2,col:'def',size:.9,anim:'pop'}],['@pulse',12,14,{at:'dstF',col:'ok',n:2}]];}};

// AC. 情报联动封堵
SCH.dblock={cc:['atk','def','def','def','def','def'],fn(p){
  return [L('ok',14.6,{alpha:.4}),['relay',0,14.6,{id:'x',at:X,kind:'cloud',col:'atk',label:'恶意地址',scale:.42}],['relay',0,14.6,{id:'ti',at:XL,kind:'cloud',col:'def',label:'威胁情报源',scale:.42}],['relay',0,14.6,{id:'fw',at:AT,kind:'net',col:'def',label:'边界设备',scale:.42}],
    ['link',.6,6,{wp:['dstT',XT],col:'atk',dash:1,arc:3,out:.6}],['packet',1,5.6,{wp:['dstT',XT],col:'atk',shape:'orb',size:.34,n:3,gap:.8,arc:3}],
    ['packet',3.2,6.2,{wp:[XLT,ATT],col:'def',shape:'doc',n:3,gap:.4,size:.34,arc:2.6}],['@hit',6.2,7,{who:'fw',col:'def',n:18,r:1.6}],['glyph',6.6,14.6,{name:'shield',at:AT,dy:3.9,col:'def',size:1,anim:'pop'}],
    ['packet',8,9.8,{wp:['dstT',XT],col:'atk',shape:'orb',size:.34,end:.5,arc:3}],['burst',9.8,11,{at:{a:XT,d:[-3.4,-1.4,0]},col:'def',col2:'atk',n:26,r:1.8,shards:4}],['glyph',10,14.6,{name:'cross',at:X,dy:5,col:'atk',size:1,anim:'pop'}],
    ['@pulse',11.5,13.5,{at:'dstF',col:'def',n:2}],['glyph',12,14.8,{name:'check',at:'dst',dy:7.8,col:'ok',size:1,anim:'pop'}]];}};

// S. 边界突破(隔离墙 / 容器边界 / 租户隔离)
SCH.breach={cc:['ok','ok','warn','atk','atk','atk'],fn(p){
  const o=A({style:'wall',col:'info',shape:'dart',via:'hook',g:'unlock',tint:'atk'},p);
  return [L('ok',14.6,{alpha:.45}),['shield',.4,15,{at:o.style==='dome'?'dst':'midF',style:o.style,col:o.col,hits:[4.4,6.2],a:.8}],['glyph',.6,14.6,{name:'lock',at:o.style==='dome'?'dst':'mid',dy:o.style==='dome'?6.2:3,col:o.col,size:.8,anim:'float'}],
    ['packet',2,4.4,{col:'atk',shape:o.shape,size:.4,end:.5}],['packet',4,6.2,{col:'atk',shape:o.shape,size:.4,end:.5}],['glyph',6.4,9,{name:'question',at:'mid',dy:4.4,col:'warn',size:.9,anim:'blink'}],
    ['packet',7,10,{col:'atk',shape:o.via,size:.42,arc:2.4}],['glyph',8,14.6,{name:o.g,at:o.style==='dome'?'dst':'mid',dy:o.style==='dome'?8.4:3,col:'atk',size:1,anim:'pop'}],['burst',8.2,9.6,{at:'mid',col:'warn',col2:'atk',n:22,r:1.8,shards:4}],
    ['@hit',10,10.8,{who:'dst',col:'atk',n:26,shards:4}],['@tint',10,11,{who:'dst',col:o.tint,k:.8,back:14.8}],['packet',11.2,13.6,{wp:['dstT','srcT'],col:'warn',shape:'doc',n:3,gap:.5,size:.38,arc:2.8}]];}};

// T. 寄生可信进程 / 借道合法程序
SCH.blend={cc:['ok','atk','atk','atk','atk','warn'],fn(p){
  const o=A({pl:'可信程序',pk:'server',shape:'doc',g:'gear',from:'src',al:'外部服务器'},p),PP=[3.8,0,-5.6],PT=[3.8,2.3,-5.6];
  return [L('ok',14.6,{alpha:.5}),['relay',0,14.6,{id:'p',at:PP,kind:o.pk,col:'ok',label:o.pl,scale:.42}],['relay',6,14.6,{id:'x',at:X,kind:'cloud',col:'atk',label:o.al,scale:.4}],
    ['packet',1.8,3.4,{col:'ok',shape:'mail',size:.4}],['packet',2.2,4.2,{wp:['dstT',PT],col:'ok',shape:'gear',size:.3,arc:2.2}],
    ['packet',4.6,7,{wp:[o.from==='src'?'srcT':XT,'dstT'],col:'atk',shape:o.shape,size:.42,arc:2.6}],['@hit',7,7.8,{who:'dst',col:'atk',n:18,r:1.8}],['packet',7.6,9.4,{wp:['dstT',PT],col:'atk',shape:o.shape,size:.38,arc:2.2}],
    ['@hit',9.4,10.2,{who:'p',col:'atk',n:16,r:1.4}],['@tint',9.4,10.4,{who:'p',col:'atk',k:.8,back:14.6}],['glyph',9.4,14.8,{name:o.g,at:PP,dy:3.9,col:'atk',size:1,anim:'pop'}],
    ['packet',10.8,13.6,{wp:[PT,XT],col:'atk',shape:'orb',size:.34,n:3,gap:.5,arc:3.4}],['link',10.6,14.6,{wp:[PT,XT],col:'atk',dash:1,arc:3.4,r:.04}],['glyph',12.8,14.8,{name:'question',at:PP,dy:5.6,col:'warn',size:.85,anim:'float'}]];}};

// U'. 链式扩散(一连串主机依次沦陷)
SCH.spread={cc:['ok','atk','atk','atk','atk','atk'],fn(p){
  const o=A({n:4,kind:'server',lab:[],shape:'dart',col:'atk',first:'src',g:'skull'},p),step=o.n>4?1.3:1.7,xs=rowX(o.n,-5,3.6);
  const f=[L('ok',14.6,{alpha:.4}),['hosts',.5,14.6,{n:o.n,layout:'row',z:5.4,x:[-5,3.6],kind:o.kind,col:o.col,inf:xs.map((_,i)=>3+i*step),lab:o.lab,links:true,first:o.first,scale:.34,id:'sp'}]];
  xs.forEach((x,i)=>f.push(['packet',2.4+i*step,3.8+i*step,{wp:[i?[xs[i-1],2.2,5.4]:'srcT',[x,2.2,5.4]],col:o.col,shape:o.shape,size:.34,arc:1.8}]));
  const te=2.4+o.n*step;
  f.push(['packet',te,te+1.8,{wp:[[xs[o.n-1],2.2,5.4],'dstT'],col:o.col,shape:o.shape,size:.4,arc:2.4}],['@hit',te+1.8,te+2.6,{who:'dst',col:o.col,n:28,shards:4}],['@tint',te+1.8,te+2.8,{who:'dst',col:o.col,k:.85,back:14.8}],['glyph',te+2.2,14.8,{name:o.g,at:'dst',dy:7.6,col:o.col,size:1,anim:'pop'}]);
  return f;}};

// V'. 远程控制 / 键盘记录
SCH.remote={cc:['ok','atk','atk','atk','atk','atk'],fn(p){
  const o=A({mode:'rat',pre:null,g:'eye'},p);
  const f=[L('ok',14.6,{alpha:.4}),['packet',1.2,3.4,{col:o.pre?'warn':'atk',shape:o.pre||'dart',size:.4,n:o.pre?3:1,gap:.45}],['@hit',3.4,4.2,{who:'dst',col:'atk',n:20,shards:3}],['@tint',3.4,4.4,{who:'dst',col:'atk',k:.7,back:14.8}],['link',4,14.6,{col:'atk',dash:1,arc:2.6}]];
  if(o.mode==='keys'){
    f.push(['glyph',4.4,14.6,{name:'hook',at:'dst',dy:7.8,col:'atk',size:.95,anim:'throb'}],['records',4.6,14.6,{at:'dst',cols:6,rows:2,sz:.3,mode:'blink',col:'dim',col2:'warn'}],['packet',5.4,13.4,{wp:['dstT','srcT'],col:'warn',shape:'key',size:.26,n:14,gap:.5,d:1.6,arc:3}],['glyph',9,14.6,{name:'ticket',at:'src',dy:6.3,col:'warn',size:.9,anim:'pop'}]);
  }else{
    f.push(['packet',5,13.2,{col:'atk',shape:'gear',size:.3,n:5,gap:1.4,d:1.6,arc:2.2}],['packet',6,13.8,{wp:['dstT','srcT'],col:'warn',shape:'doc',size:.34,n:5,gap:1.4,d:1.8,arc:3.2}],['glyph',5.4,14.6,{name:o.g,at:'src',dy:6.3,col:'atk',size:1,anim:'float'}],['glyph',5.8,14.6,{name:'reticle',at:'dst',dy:7.8,col:'atk',size:.9,anim:'blink'}],['orbit',7,14.6,{at:'dst',n:3,shape:'gear',col:'atk',rad:2.2,h:2.2,size:.45,grow:2}]);
  }
  return f;}};

// W'. 借道中间服务取得凭据后再使用
SCH.pivot={cc:['ok','atk','warn','warn','atk','atk'],fn(p){
  const o=A({mode:'via',rl:'中间服务',rk:'cloud',g:'key',sg:'ticket',cl:'云资源'},p);
  const f=[L('ok',14.6,{alpha:.4}),['relay',0,14.6,{id:'r',at:AT,kind:o.rk,col:'info',label:o.rl,scale:.44}]];
  if(o.mode==='via'){
    f.push(['packet',1.8,4.2,{wp:['srcT',ATT],col:'atk',shape:'dart',size:.4,arc:2.4}],['@hit',4.2,5,{who:'r',col:'atk',n:20,r:1.6}],['@tint',4.2,5.2,{who:'r',col:'atk',k:.5,back:9}],['glyph',5,9,{name:o.g,at:AT,dy:4,col:'warn',size:.95,anim:'pop'}],
      ['packet',5.6,8.2,{wp:[ATT,'srcT'],col:'warn',shape:o.sg,size:.42,arc:2.4}],['packet',8.4,10.8,{col:'atk',shape:o.sg,size:.44}]);
  }else{
    f.push(['packet',1.8,4.2,{col:'atk',shape:'dart',size:.4}],['packet',4.4,6.6,{wp:['dstT',ATT],col:'atk',shape:'hook',size:.38,arc:2.8}],['@hit',6.6,7.2,{who:'r',col:'warn',n:16,r:1.4}],['packet',7.2,9,{wp:[ATT,'dstT'],col:'warn',shape:o.sg,size:.42,arc:2.8}],
      ['packet',9,11,{wp:['dstT','srcT'],col:'warn',shape:o.sg,size:.42,arc:3}],['relay',9.6,14.6,{id:'c',at:X,kind:'cloud',col:'ok',label:o.cl,scale:.42}],['packet',10.6,12.8,{wp:['srcT',XT],col:'atk',shape:o.sg,size:.42,arc:3.2}],['@hit',12.8,13.6,{who:'c',col:'atk',n:20,r:1.6}]);
  }
  if(o.mode==='via')f.push(['@hit',10.8,11.6,{who:'dst',col:'atk',n:26,shards:4}],['@tint',10.8,11.8,{who:'dst',col:'atk',k:.8,back:14.8}],['glyph',11.6,14.8,{name:'skull',at:'dst',dy:7.6,col:'atk',size:1,anim:'pop'}]);
  else f.push(['@tint',12.8,13.8,{who:'c',col:'atk',k:.7}],['glyph',13,14.8,{name:'skull',at:X,dy:5,col:'atk',size:1,anim:'pop'}],['@tint',6.6,8,{who:'r',col:'warn',k:.4,back:12}]);
  return f;}};

// X'. 欺骗防御(多个诱饵 + 绊线)
SCH.ddecoy={cc:['def','atk','atk','def','def','def'],fn(p){
  const o=A({n:3,lab:['诱饵 A','诱饵 B','诱饵 C']},p),ds=[[-3,-6.2],[1.5,-7.4],[5.5,-5.8]].slice(0,o.n);
  const f=[L('ok',14.6,{alpha:.4})];
  ds.forEach((d,i)=>f.push(['relay',.4,14.6,{id:'d'+i,at:[d[0],0,d[1]],kind:'server',col:'warn',label:o.lab[i]||'',scale:.38}]));
  const d1=ds[Math.min(1,ds.length-1)];
  f.push(['sweep',2,4.8,{mode:'radar',at:'src',col:'atk',r:3.4}],['packet',3.2,5.2,{wp:['srcT',[ds[0][0],2.2,ds[0][1]]],col:'atk',shape:'orb',size:.3,arc:2.4}],['packet',5.2,7.2,{wp:['srcT',[d1[0],2.2,d1[1]]],col:'atk',shape:'dart',size:.36,arc:2.6}],
    ['@hit',7.2,8,{who:'d'+Math.min(1,ds.length-1),col:'atk',n:20,r:1.6}],['@tint',7.2,8.4,{who:'d'+Math.min(1,ds.length-1),col:'atk',k:.6}],['glyph',7.4,14.6,{name:'eye',at:[d1[0],0,d1[1]],dy:3.8,col:'def',size:1,anim:'float'}],
    ['packet',8.6,11,{wp:[[d1[0],2.2,d1[1]],'dstT'],col:'def',shape:'doc',n:3,gap:.4,size:.34,arc:2.4}],['glyph',10,14.8,{name:'bell',at:'dst',dy:6.2,col:'def',size:.95,anim:'blink'}],['glyph',12,14.8,{name:'check',at:'dst',dy:8.2,col:'ok',size:1,anim:'pop'}]);
  return f;}};

/* ===== 展开器 ===== */
const TIMES=[0,2,5,8,10.5,13];
window.SEC_SCH=SCH;
window.SEC_X=function(o){
  const sc=SCH[o.sc]; if(!sc)throw new Error('unknown scheme '+o.sc+' for '+o.id);
  const cc=o.cc||sc.cc, f=sc.fn(o.sp||{}).concat(o.x||[]);
  const nd=a=>({n:a[0],k:a[1],c:a[2],d:a[3]});
  return {id:o.id,cat:o.cat,name:o.name,en:o.en,sev:o.sev,stage:o.stage,src:nd(o.s),dst:nd(o.t),principle:o.p,impact:o.i,defense:o.d,refs:o.r,kw:o.kw||'',dur:15,
    ph:o.cap.map((t,i)=>[TIMES[i],t,cc[i]]),fx:f,sc:o.sc};
};
})();
