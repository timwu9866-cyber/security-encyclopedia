(function(E){
const U=[0,0,5.2], UT=[0,2.5,5.2], AT=[0,0,-5.5], ATT=[0,2.5,-5.5], X=[10.5,0,-6.5], XT=[10.5,2.5,-6.5];
const C='client', S='server', D='db', N='net', CL='cloud';
const L=(c,e)=>['link',0.4,e,{col:c||'ok'}];
E.push(
{ id:'insider', cat:'phys', name:'内部人员威胁', en:'Insider Threat', sev:'high', stage:'收集 / 数据外泄',
 src:{n:'内部员工',k:C,c:'warn',d:'持有合法权限的员工或外包人员'}, dst:{n:'核心数据库',k:D,c:'ok',d:'员工因工作需要可访问的数据'},
 principle:'内部人员本来就拥有合法账号和网络位置,他们的访问看起来“完全正常”。当他们因利益、不满或疏忽而大量读取并带走数据时,边界防护几乎无从发现,只能靠行为分析与审计。',
 impact:'核心资料被带走或泄露;难以事前阻止,事后取证复杂。',
 defense:['最小权限与岗位分离、离职权限即时回收','用户行为分析 (UEBA) 与大批量访问告警','数据防泄漏 (DLP) 与外发管控','访问与操作的完整审计留痕'],
 refs:['MITRE ATT&CK T1078 / T1213 / T1052','CISA 内部威胁缓解指南'], kw:'员工 内鬼 越权 离职 dlp',
 dur:15, ph:[[0,'员工以合法身份访问数据库','ok'],[2.5,'日常访问:少量、符合岗位','ok'],[5,'行为异常:短时间大量读取','warn'],[8,'数据被复制并带出内网','atk'],[10.5,'行为分析发现访问量远超基线','def'],[12.5,'审计留痕,触发调查','def']],
 fx:[L('ok',14.6),['relay',7,15,{id:'x',at:X,kind:CL,col:'atk',label:'外部存储',scale:.42}],['packet',1.5,3.5,{col:'ok',shape:'mail',size:.34,wp:['srcT','dstT']}],
  ['packet',4.5,9,{wp:['dstT','srcT'],col:'warn',shape:'doc',n:8,gap:.5,size:.34,arc:3,d:1.4}],['records',5,10,{at:'dst',cols:6,rows:3,mode:'drain',col:'ok',col2:'warn',to:'srcT'}],
  ['packet',8,12,{wp:['srcT',XT],col:'warn',shape:'doc',n:4,gap:.6,size:.34,arc:3.4}],['glyph',10.5,15,{name:'eye',at:'dst',dy:8.3,col:'def',size:1.1,anim:'float'}],['ring',10.5,13,{at:'dstF',col:'def',r:[.5,4],n:2,gap:.7}],['glyph',11,15,{name:'bell',at:'src',dy:6.2,col:'def',size:.9,anim:'blink'}]]},

{ id:'usbdrop', cat:'phys', name:'U 盘投毒', en:'USB Drop Attack', sev:'medium', stage:'初始访问(物理介质)',
 src:{n:'员工电脑',k:C,c:'ok',d:'被插入陌生 U 盘的办公电脑'}, dst:{n:'内网服务器',k:S,c:'ok',d:'与该电脑相连的内部系统'},
 principle:'攻击者把带有恶意程序的 U 盘遗落在停车场、会议室等地,贴上“工资表”之类的标签引人好奇。员工捡到后插入电脑,恶意程序自动运行或诱导运行,绕过了边界防火墙。',
 impact:'入口突破了网络边界,内网设备被感染;气隙网络也可能被渗透。',
 defense:['禁用自动运行、限制可移动介质(白名单)','端点管控 USB 设备并扫描','安全意识:不插陌生设备','网络隔离与终端 EDR'],
 refs:['MITRE ATT&CK T1091 / T1200'], kw:'u盘 移动介质 物理 气隙 摆渡',
 dur:15, ph:[[0,'办公电脑正常工作','ok'],[2,'一只“遗落”的 U 盘被员工捡到','warn'],[4.5,'插入电脑','warn'],[7,'恶意程序自动运行,电脑被感染','atk'],[9.5,'感染沿内网扩散','atk'],[12,'内网服务器被波及','atk']],
 fx:[L('ok',14.6),['packet',2,4.6,{wp:[[-7,14,0],[-7,5.4,0]],col:'warn',shape:'usb',size:.8,arc:0}],['glyph',4.6,9,{name:'usb',at:'src',dy:5.8,col:'warn',size:.9,anim:'float'}],['@hit',4.8,5.6,{who:'src',col:'warn',n:14,r:1.8}],
  ['nodefx',0,0,{who:'src',tint:'atk',k:[[6.4,0],[8,.9]]}],['orbit',7,15,{at:'src',n:4,shape:'bug',col:'atk',rad:2.3,h:2.4,size:.5}],['packet',9,12,{col:'atk',shape:'capsule',size:.42,n:2,gap:.5}],
  ['@hit',12,12.8,{who:'dst',col:'atk',n:26,shards:4}],['@tint',12,13.2,{who:'dst',col:'atk',k:.8}]]},

{ id:'physaccess', cat:'phys', name:'物理接入 / 植入设备', en:'Physical Access & Rogue Device', sev:'high', stage:'初始访问 / 持久化',
 src:{n:'入侵者(现场)',k:C,c:'atk',d:'尾随进入或伪装成维修人员'}, dst:{n:'内网交换机 / 服务器',k:N,c:'ok',d:'机房或办公区的网络端口'},
 principle:'攻击者通过尾随、伪装成访客或维修人员进入办公区,把一个小型设备接入空闲网口或机柜。该设备在内网里窃听、探测,并通过移动网络或隧道把数据传回外部。',
 impact:'绕过所有外部边界防护;长期隐蔽的内网据点。',
 defense:['门禁与访客管理、防尾随','网口端口安全与 802.1X、关闭未用端口','定期巡检机房/机柜与资产核对','网络准入控制检测未知设备'],
 refs:['MITRE ATT&CK T1200 / T1078','CWE-1263'], kw:'尾随 机房 网口 树莓派 植入',
 dur:15, ph:[[0,'办公区有门禁保护','def'],[2.5,'入侵者尾随进入','atk'],[5,'把小型设备接入空闲网口','atk'],[7.5,'设备在内网里窃听与探测','atk'],[10,'通过隧道把数据传回外部','atk'],[12.5,'形成长期隐蔽的内网据点','atk']],
 fx:[['shield',0,3.8,{at:'srcF',style:'gate',col:'def',x:-3.8,brk:3.6}],['glyph',0.5,3.8,{name:'lock',at:[-3.8,0,0],dy:5.8,col:'def',size:.9,anim:'float'}],['packet',2.5,5,{wp:['srcT',[3.5,2.6,5.2]],col:'atk',shape:'user',size:.5,arc:2}],
  ['relay',5,15,{id:'d',at:[3.5,0,5.2],kind:'iot',col:'atk',label:'植入设备',scale:.38}],['link',5.5,15,{wp:[[3.5,1.8,5.2],'dstT'],col:'atk',arc:1.4,dash:1}],['glyph',7.5,15,{name:'eye',at:[3.5,0,5.2],dy:3.2,col:'atk',size:.9,anim:'float'}],
  ['sweep',7,10,{mode:'radar',at:'dst',col:'atk',r:3.2}],['relay',9.5,15,{id:'x',at:X,kind:CL,col:'atk',label:'外部',scale:.42}],['packet',10,14,{wp:[[3.5,2.6,5.2],XT],col:'warn',shape:'lock',size:.4,n:3,gap:.8,arc:3.2}]]}
);
})(window.SEC_EVENTS);
