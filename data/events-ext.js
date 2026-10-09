(function(E){
const U=[0,0,5.2], UT=[0,2.5,5.2], AT=[0,0,-5.5], ATT=[0,2.5,-5.5], X=[10.5,0,-6.5], XT=[10.5,2.5,-6.5];
const C='client', S='server', D='db', N='net', CL='cloud';
const L=(c,e)=>['link',0.4,e,{col:c||'ok'}];
E.push(
{ id:'iotbot', cat:'ext', name:'IoT 设备被接管', en:'IoT Device Takeover', sev:'high', stage:'初始访问 / 影响',
 src:{n:'攻击者',k:C,c:'atk',d:'扫描互联网上的 IoT 设备'}, dst:{n:'智能摄像头 / 网关',k:'iot',c:'ok',d:'使用默认口令或存在已知缺陷的设备'},
 principle:'摄像头、路由器等 IoT 设备往往出厂口令固定、很少更新、直接暴露在公网。攻击者自动化扫描后批量登录,植入程序,把它们编入僵尸网络,用于窥探画面或发起攻击。',
 impact:'隐私被窥探、设备成为攻击流量来源、内网被穿透。',
 defense:['修改默认口令、关闭不必要的公网暴露','固件及时升级、停止支持的设备更换','IoT 设备放入独立网段','监控设备异常外联'],
 refs:['MITRE ATT&CK T1078.001 / T1584','CWE-798'], kw:'摄像头 路由器 默认口令 僵尸 物联网',
 dur:15, ph:[[0,'设备暴露在互联网上,口令是出厂默认','warn'],[2.5,'攻击者自动化扫描发现它','atk'],[5,'用默认口令登录,植入程序','atk'],[7.5,'设备被编入僵尸网络','atk'],[10,'同类设备被批量接管','atk'],[12.5,'它们被用来窥探或发起攻击','atk']],
 fx:[L('atk',14.6),['sweep',1.5,4.5,{mode:'radar',at:'dst',col:'atk',r:3.2}],['glyph',0.6,5,{name:'key',at:'dst',dy:5.4,col:'warn',size:.9,anim:'float'}],['packet',4.5,6.2,{col:'atk',shape:'key',size:.4}],['@hit',6.2,7,{who:'dst',col:'atk',n:22}],
  ['@tint',6.2,7.6,{who:'dst',col:'atk',k:.8}],['hosts',7.5,15,{n:4,layout:'fan',x:[9.2,13],kind:'iot',col:'atk',inf:[8.5,9.2,9.9,10.6],first:'dst',scale:.34,links:true}],
  ['relay',10,15,{id:'x',at:[-12,0,-5],kind:S,col:'ok',label:'攻击目标',scale:.42}],['stream',11,14.5,{wp:['dstT',[-12,2.6,-5]],col:'atk',rate:16,life:1.8,spread:[1,1,1],size:.2,arc:5}]]},

{ id:'icsplc', cat:'ext', name:'工控 PLC 指令篡改', en:'ICS / PLC Command Tampering', sev:'critical', stage:'执行 / 影响',
 src:{n:'攻击者(已入侵办公网)',k:C,c:'atk',d:'通过网络接触到控制网络的一方'}, dst:{n:'PLC 控制器',k:'iot',c:'ok',d:'控制生产设备的可编程逻辑控制器'},
 principle:'工业控制系统的协议多为早期设计,缺少认证与加密。攻击者进入控制网络后,可以伪造合法设备向 PLC 发送写入指令,改变设定值,让设备偏离安全工况,同时向操作员界面回报“一切正常”。',
 impact:'物理设备被损坏、生产中断,甚至人身与环境安全事故。',
 defense:['办公网与控制网严格隔离、单向网关','工控协议白名单与深度包检测','安全仪表系统 (SIS) 独立联锁','资产清点、变更审批与异常告警'],
 refs:['MITRE ATT&CK for ICS:T0855 / T0831','IEC 62443'], kw:'scada 工业 设定值 modbus 控制网络',
 dur:16, ph:[[0,'PLC 按设定值稳定控制设备','ok'],[2.5,'攻击者进入控制网络,伪装成合法设备','atk'],[5,'向 PLC 发送篡改后的写入指令(示意)','atk'],[8,'设定值被改变,设备偏离安全工况','atk'],[11,'操作界面仍显示“正常”','warn'],[13.5,'设备过载,触发联锁或损坏','atk']],
 fx:[L('ok',15.6),['relay',0,16,{id:'t',at:[11.4,0,3.8],kind:D,col:'ok',label:'生产设备',scale:.5}],['link',0.5,16,{wp:['dstT',[11.4,2.8,3.8]],col:'ok',arc:1.2,r:.04}],['meter',0.5,16,{at:[11.4,0,3.8],dx:1.7,dy:1.5,lv:[[0.5,.4],[8,.4],[10,.95]]}],
  ['gate',2.5,6,{u:.9,col:'def',pulses:[5.6],bad:[0],r:1.1}],['packet',5,7.6,{col:'atk',shape:'bolt',size:.46,n:2,gap:.5}],['@hit',7.6,8.4,{who:'dst',col:'atk',n:22}],
  ['@tint',7.8,9,{who:'dst',col:'atk',k:.7}],['glyph',8.5,16,{name:'warn',at:[11.4,0,3.8],dy:3.8,col:'atk',size:1,anim:'blink'}],['glyph',11,16,{name:'check',at:'src',dy:6.2,col:'ok',size:.9,anim:'pop'}],['@hit',13.5,14.3,{who:'t',col:'atk',n:28,r:2.2,shards:6}],['@tint',13.4,14.6,{who:'t',col:'atk',k:.9}]]},

{ id:'mobileapp', cat:'ext', name:'恶意移动应用', en:'Malicious Mobile App', sev:'medium', stage:'初始访问 / 收集',
 src:{n:'攻击者',k:C,c:'atk',d:'发布恶意或重打包应用的开发者'}, dst:{n:'用户手机',k:'phone',c:'ok',d:'安装并授予了过多权限的设备'},
 principle:'攻击者把应用伪装成实用工具或山寨热门应用,在第三方市场或链接中分发。安装时申请通讯录、短信、麦克风等不必要的权限,用户一路“允许”,应用便在后台收集并上传数据。',
 impact:'隐私泄露、短信验证码被读取、资费扣费或被远程控制。',
 defense:['只从官方应用商店安装','审慎授予权限,定期检查权限','移动设备管理 (MDM) 与应用白名单','应用行为检测与系统更新'],
 refs:['OWASP MASVS / Mobile Top 10'], kw:'app 权限 山寨 重打包 安卓 ios',
 dur:15, ph:[[0,'攻击者发布伪装成实用工具的应用','atk'],[2.5,'用户从第三方渠道下载安装','warn'],[5,'应用申请一连串权限,用户全部允许','warn'],[8,'应用在后台读取通讯录、短信等','atk'],[10.5,'数据被上传到攻击者服务器','atk'],[13,'隐私泄露,验证码被截获','atk']],
 fx:[['relay',0,15,{id:'s',at:AT,kind:CL,col:'warn',label:'第三方应用市场',scale:.5}],['packet',1.5,4,{wp:['srcT',ATT],col:'atk',shape:'capsule',size:.44,arc:2}],['packet',3.2,6,{wp:[ATT,'dstT'],col:'atk',shape:'capsule',size:.44,arc:2.4}],
  ['glyph',5.2,15,{name:'eye',at:'dst',dy:5.6,dx:-1.6,col:'warn',size:.8,anim:'pop'}],['glyph',5.9,15,{name:'mail',at:'dst',dy:5.6,dx:0,col:'warn',size:.8,anim:'pop'}],['glyph',6.6,15,{name:'user',at:'dst',dy:5.6,dx:1.6,col:'warn',size:.8,anim:'pop'}],
  ['@tint',8,9.5,{who:'dst',col:'atk',k:.5}],['link',9,15,{col:'atk',dash:1,wp:['dstT','srcT'],arc:3}],['packet',9.5,13,{wp:['dstT','srcT'],col:'warn',shape:'doc',n:5,gap:.55,size:.36,arc:3}]]}
);
})(window.SEC_EVENTS);
