/* schemes2.js — 追加的动效方案:凭据中继(relay)、准入闸门(dgate)、脱敏加密(dmask)、行为评分(dscore)
   与 schemes.js 同样由 SEC_X 展开,复用现有动效原语。 */
(function(){
'use strict';
const SCH=window.SEC_SCH, A=Object.assign;
const AT=[0,0,-5.5],ATT=[0,2.5,-5.5],X=[10.5,0,-6.5],XT=[10.5,2.5,-6.5];
const L=(c,e,o)=>['link',0.4,e||14.6,A({col:c||'ok'},o||{})];

// 凭据中继:受诱导主机把认证交给中间人,中间人原样转发给真正的目标并回传质询
SCH.relay={cc:['ok','warn','atk','atk','atk','atk'],fn(p){
  const o=A({rl:'中继主机',rk:'client',sg:'ticket',g:'mask',chg:'dot'},p);
  return [L('ok',14.6,{alpha:.35}),['relay',0,14.6,{id:'m',at:AT,kind:o.rk,col:'atk',label:o.rl,scale:.44}],
    ['packet',1.8,3.6,{col:'ok',shape:'mail',size:.38}],['glyph',3.4,14.6,{name:o.g,at:AT,dy:3.9,col:'atk',size:.95,anim:'float'}],
    ['packet',4.6,6.6,{wp:['srcT',ATT],col:'warn',shape:o.sg,size:.4,arc:2.4}],['@tint',6.4,7.6,{who:'m',col:'atk',k:.5,back:14}],
    ['packet',7,9,{wp:[ATT,'dstT'],col:'atk',shape:o.sg,size:.4,arc:2.4}],['packet',9,10.8,{wp:['dstT',ATT],col:'warn',shape:o.chg,size:.26,n:3,gap:.3,arc:2.4}],
    ['packet',10.2,12,{wp:[ATT,'srcT'],col:'warn',shape:o.chg,size:.26,n:3,gap:.3,arc:2.4}],['link',7,14.6,{wp:[ATT,'dstT'],col:'atk',dash:1,arc:2.4,r:.04}],
    ['@hit',10.8,11.6,{who:'dst',col:'atk',n:26,shards:4}],['@tint',10.8,11.8,{who:'dst',col:'atk',k:.8,back:14.8}],['glyph',11.6,14.8,{name:'unlock',at:'dst',dy:7.8,col:'atk',size:1,anim:'pop'}]];}};

// 准入闸门:合规设备放行,未知设备被拦在闸门外并送入隔离区
SCH.dgate={cc:['def','ok','atk','def','def','def'],fn(p){
  const o=A({gl:'准入网关',gk:'net',good:'user',bad:'dart',ng:'check',ql:'隔离区',qk:'iot'},p);
  return [L('ok',14.6,{alpha:.35}),['relay',0,14.6,{id:'gw',at:AT,kind:o.gk,col:'def',label:o.gl,scale:.44}],['relay',1,14.6,{id:'q',at:X,kind:o.qk,col:'warn',label:o.ql,scale:.4}],
    ['shield',.4,15,{at:'midF',style:'gate',col:'def',hits:[7.2,8.4]}],['glyph',.6,14.6,{name:'lock',at:'mid',dy:3,col:'def',size:.8,anim:'float'}],
    ['packet',2,4.6,{col:'ok',shape:o.good,size:.4}],['glyph',3.6,6.4,{name:'check',at:'mid',dy:4.4,col:'ok',size:.9,anim:'pop'}],['packet',4.8,7,{col:'ok',shape:o.good,size:.4}],
    ['packet',5.2,7.2,{col:'atk',shape:o.bad,size:.4,end:.5}],['glyph',7,10.2,{name:'question',at:'mid',dy:4.4,col:'warn',size:.95,anim:'blink'}],['burst',7.2,9,{at:'mid',col:'def',col2:'atk',n:34,r:2.2,shards:5}],
    ['@hit',7.2,8,{who:'gw',col:'def',n:16,r:1.4}],['packet',9,11.6,{wp:['mid',XT],col:'warn',shape:o.bad,size:.36,arc:3}],['@tint',11.2,12.6,{who:'q',col:'warn',k:.5,back:14.8}],
    ['glyph',11.4,14.8,{name:'flag',at:X,dy:5,col:'warn',size:.9,anim:'pop'}],['glyph',12,14.8,{name:o.ng,at:'dst',dy:7.8,col:'ok',size:1,anim:'pop'}],['packet',12.4,14.6,{col:'ok',shape:o.good,size:.4,n:2,gap:.8}]];}};

// 脱敏 / 加密:数据经网关后以脱敏或密文形式交付,窃取者拿到的没有价值
SCH.dmask={cc:['ok','warn','def','def','def','def'],fn(p){
  const o=A({ml:'脱敏 / 加密网关',mk:'db',sg:'doc',xl:'越权获取者'},p);
  return [L('ok',14.6,{alpha:.35}),['relay',0,14.6,{id:'m',at:AT,kind:o.mk,col:'def',label:o.ml,scale:.46}],['records',.4,14.6,{at:'dst',dy:6.4,cols:6,rows:3,sz:.34,mode:'blink',col:'ok',col2:'warn'}],
    ['packet',2,4.4,{col:'ok',shape:'mail',size:.38}],['packet',4.4,6.6,{wp:['dstT',ATT],col:'warn',shape:o.sg,n:4,gap:.35,size:.34,arc:2.6}],
    ['records',5.2,14.6,{at:AT,dy:5.6,cols:5,rows:2,sz:.3,mode:'flip',col:'warn',col2:'def'}],['glyph',6,14.6,{name:'lock',at:AT,dy:3.9,col:'def',size:1,anim:'pop'}],['@pulse',6.6,8.4,{at:AT,col:'def',n:2}],
    ['packet',8.4,11,{wp:[ATT,'srcT'],col:'def',shape:'hash',n:4,gap:.35,size:.34,arc:2.6}],['glyph',9.6,14.8,{name:'mask',at:'src',dy:6.4,col:'def',size:.95,anim:'pop'}],
    ['relay',10.2,14.6,{id:'x',at:X,kind:'client',col:'atk',label:o.xl,scale:.4}],['packet',10.6,13.2,{wp:['dstT',XT],col:'atk',shape:'dart',size:.36,arc:3}],
    ['glyph',13,14.8,{name:'cross',at:X,dy:5,col:'atk',size:.9,anim:'pop'}],['@tint',12.4,13.6,{who:'dst',col:'def',k:.4,back:14.8}]];}};

// 行为评分:基线内的行为放行,偏离基线的行为风险分上升并触发告警与限制
SCH.dscore={cc:['ok','ok','warn','def','def','def'],fn(p){
  const o=A({hl:'行为基线引擎',bad:'dart',ag:'bell'},p);
  return [L('ok',14.6,{alpha:.4}),['relay',0,14.6,{id:'e',at:AT,kind:'server',col:'def',label:o.hl,scale:.44}],
    ['packet',1.8,3.6,{col:'ok',shape:'user',size:.38,n:3,gap:.5}],['meter',2,14.6,{at:'src',lv:[[2,.15],[5,.2],[6.5,.6],[8,.95],[10.4,.9],[12,.2]]}],
    ['packet',3.6,5.6,{wp:['srcT',ATT],col:'ok',shape:'doc',size:.3,n:3,gap:.4,arc:2.4}],['glyph',4.6,14.6,{name:'bars',at:AT,dy:3.9,col:'def',size:.9,anim:'float'}],
    ['packet',5.6,8.4,{col:'atk',shape:o.bad,size:.34,n:6,gap:.35,arc:2.2}],['glyph',6.4,9.4,{name:'warn',at:'src',dy:8.8,col:'warn',size:.9,anim:'blink'}],
    ['packet',7.6,9.8,{wp:['srcT',ATT],col:'warn',shape:'doc',size:.3,n:4,gap:.3,arc:2.4}],['@pulse',8.6,10.4,{at:AT,col:'def',n:3}],['glyph',8.8,14.8,{name:o.ag,at:AT,dy:5.4,col:'def',size:1,anim:'blink'}],
    ['gate',9.6,14.6,{u:.5,col:'def',pulses:[10.4,11,11.6],bad:[0,1,2],r:1.1}],['@hit',10.4,11.2,{who:'dst',col:'def',n:16,r:1.4}],['glyph',12,14.8,{name:'check',at:'dst',dy:7.8,col:'ok',size:1,anim:'pop'}]];}};
})();
