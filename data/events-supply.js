(function(E){
const U=[0,0,5.2], UT=[0,2.5,5.2], AT=[0,0,-5.5], ATT=[0,2.5,-5.5], X=[10.5,0,-6.5], XT=[10.5,2.5,-6.5];
const C='client', S='server', D='db', N='net', CL='cloud';
const L=(c,e)=>['link',0.4,e,{col:c||'ok'}];
E.push(
{ id:'deppoison', cat:'supply', name:'依赖投毒', en:'Dependency Poisoning', sev:'high', stage:'初始访问(供应链)',
 src:{n:'攻击者',k:C,c:'atk',d:'发布恶意软件包的人'}, dst:{n:'下游应用',k:S,c:'ok',d:'自动安装依赖包的业务应用'},
 principle:'现代软件大量依赖公共包仓库。攻击者发布名称相近的恶意包(仿冒包),或入侵某个维护者账号向正规包注入恶意更新。应用在构建时自动拉取,恶意代码随之进入生产环境。',
 impact:'构建机与生产环境被植入后门,窃取密钥与数据。',
 defense:['依赖锁定与哈希校验','使用私有镜像仓库与包白名单','SCA/SBOM 持续扫描依赖','核对包名与维护者,警惕近似包名'],
 refs:['MITRE ATT&CK T1195.001','OWASP Top 10:A06 / A08','CWE-829'], kw:'npm pypi 仿冒包 typosquatting',
 dur:16, ph:[[0,'攻击者准备一个恶意包(示意)','atk'],[2.5,'发布到公共包仓库,名称与正规包相近','atk'],[5.5,'被某个依赖库引用并传播','warn'],[8.5,'应用构建时自动拉取依赖','warn'],[11,'恶意代码随包进入应用','atk'],[13.5,'生产环境被植入,攻击者获得入口','atk']],
 fx:[L('atk',15.6),['hosts',2.5,16,{n:3,layout:'row',z:5.2,x:[-4.5,4.5],kind:S,col:'atk',inf:[5.2,7.6,10.2],lab:['公共包仓库','依赖库','应用构建'],first:'src',links:true,scale:.4}],
  ['packet',2.5,5,{col:'atk',shape:'capsule',size:.44,wp:['srcT',[-4.5,2.2,5.2]],arc:2.4}],['link',10.4,16,{wp:[[4.5,1.5,5.2],'dstT'],col:'atk',arc:2.4}],['packet',10.4,12.4,{wp:[[4.5,1.5,5.2],'dstT'],col:'atk',shape:'capsule',size:.44,arc:2.4}],
  ['@hit',12.4,13.2,{who:'dst',col:'atk',n:30,shards:5}],['@tint',12.4,13.4,{who:'dst',col:'atk',k:.85}]]},

{ id:'badimage', cat:'supply', name:'恶意镜像', en:'Malicious Container Image', sev:'high', stage:'初始访问 / 执行',
 src:{n:'攻击者',k:C,c:'atk',d:'发布看似好用的恶意镜像'}, dst:{n:'运行环境',k:CL,c:'ok',d:'从公共仓库拉取并运行镜像的集群'},
 principle:'公共镜像仓库中,有些镜像被植入了挖矿程序或后门,并用热门镜像的相似名称或好用的描述吸引用户。运行环境不加核验直接拉取并运行,恶意程序便在内部启动。',
 impact:'资源被滥用(挖矿)、被植入后门、泄露集群内密钥。',
 defense:['只使用可信来源与签名镜像','镜像扫描与准入控制策略','限制运行权限(非 root、只读文件系统)','私有仓库代理并固定摘要'],
 refs:['MITRE ATT&CK T1525 / T1610','CWE-506'], kw:'docker hub 镜像 仓库 挖矿',
 dur:15, ph:[[0,'攻击者构建带恶意内容的镜像(示意)','atk'],[2.5,'推送到公共镜像仓库,名称近似热门镜像','atk'],[5.5,'目标环境不加核验直接拉取镜像','warn'],[8,'镜像被运行,恶意程序启动','atk'],[10.5,'占用算力 / 回连攻击者','atk'],[13,'运行环境被滥用','atk']],
 fx:[L('atk',14.6),['relay',1.5,15,{id:'r',at:AT,kind:CL,col:'warn',label:'公共镜像仓库',scale:.5}],['packet',2.5,5,{wp:['srcT',ATT],col:'atk',shape:'capsule',size:.46,arc:2}],
  ['packet',5.5,8,{wp:[ATT,'dstT'],col:'atk',colTo:'atk',shape:'capsule',size:.46,arc:2}],['@hit',8,8.8,{who:'dst',col:'atk',n:24}],['@tint',8,9.5,{who:'dst',col:'atk',k:.6}],
  ['orbit',9,15,{at:'dst',n:5,shape:'coin',col:'warn',rad:2.5,h:3,size:.5}],['packet',10.5,13.5,{wp:['dstT','srcT'],col:'warn',shape:'coin',size:.4,n:3,gap:.7,arc:3.4}],['meter',8.5,15,{at:'dst',lv:[[8.5,.2],[11,.95]]}]]},

{ id:'buildhack', cat:'supply', name:'构建系统入侵', en:'Build System Compromise', sev:'critical', stage:'初始访问(供应链)/ 防御规避',
 src:{n:'攻击者',k:C,c:'atk',d:'入侵了持续集成/构建环境的人'}, dst:{n:'下游用户',k:S,c:'ok',d:'信任并安装官方发布物的用户'},
 principle:'攻击者不去改源码,而是入侵构建服务器或持续集成流水线,在编译打包的环节悄悄加入恶意内容。产出的发布物带有官方签名与正规外观,所有下游用户都会信任并安装。',
 impact:'影响面可达所有用户,极难通过代码审查发现。',
 defense:['构建环境隔离、临时化与最小权限','可复现构建与多方验证','发布物签名与来源证明 (SLSA)','对流水线配置做变更审批'],
 refs:['MITRE ATT&CK T1195.002','SLSA 供应链安全框架'], kw:'ci cd 流水线 官方签名 solarwinds 类',
 dur:16, ph:[[0,'源码仓库 → 构建服务器 → 制品仓库 → 用户','ok'],[2.5,'攻击者入侵构建服务器','atk'],[5.5,'在打包环节加入恶意内容(源码无变化)','atk'],[8.5,'制品带着官方签名发布','warn'],[11,'下游用户信任并安装官方发布物','warn'],[13.5,'大量用户同时被植入','atk']],
 fx:[['link',0.4,15.6,{col:'atk'}],['hosts',0,16,{n:3,layout:'row',z:5.2,x:[-4.5,4.5],kind:S,col:'atk',inf:[4.5],lab:['源码仓库','构建服务器','制品仓库'],first:'src',links:false,scale:.4}],
  ['link',1,16,{wp:[[-4.5,1.5,5.2],[0,1.5,5.2]],arc:0,col:'ok',r:.04}],['link',1,16,{wp:[[0,1.5,5.2],[4.5,1.5,5.2]],arc:0,col:'ok',r:.04}],['packet',1.5,3.5,{wp:[[-4.5,1.5,5.2],[0,1.5,5.2]],arc:0,col:'ok',shape:'doc',size:.34}],
  ['packet',2.5,4.5,{wp:['srcT',[0,2.6,5.2]],col:'atk',shape:'dart',size:.4,arc:3}],['glyph',5.2,15,{name:'bug',at:[0,0,5.2],dy:3.4,col:'atk',size:.9,anim:'throb'}],
  ['packet',6,8.5,{wp:[[0,1.5,5.2],[4.5,1.5,5.2]],arc:0,col:'ok',colTo:'atk',tAt:0,shape:'capsule',size:.4}],['glyph',8.5,15,{name:'check',at:[4.5,0,5.2],dy:3.2,col:'ok',size:.8,anim:'pop'}],
  ['packet',9,12,{wp:[[4.5,1.5,5.2],'dstT'],col:'atk',shape:'capsule',size:.44,arc:2.4,n:3,gap:.45}],['@hit',12,12.8,{who:'dst',col:'atk',n:30,shards:6}],['@tint',12,13.2,{who:'dst',col:'atk',k:.85}]]},

{ id:'updatehijack', cat:'supply', name:'软件更新劫持', en:'Software Update Hijacking', sev:'high', stage:'初始访问 / 执行',
 src:{n:'软件厂商更新服务器',k:CL,c:'ok',d:'正规的更新分发源'}, dst:{n:'客户端',k:C,c:'ok',d:'定期检查并安装更新的终端'},
 principle:'软件定期从厂商服务器下载更新。如果更新通道没有加密和签名校验,攻击者在路径中(或入侵分发服务器)就能把更新包替换成带恶意内容的版本,客户端照常安装。',
 impact:'终端被植入后门,且来自“官方更新”,用户难以察觉。',
 defense:['更新包强制数字签名并在客户端校验','全程 TLS 与证书固定','分发基础设施隔离与双人审批','监控更新包哈希与异常下载'],
 refs:['MITRE ATT&CK T1195 / T1557','CWE-494'], kw:'更新 升级 签名 替换 中间人',
 dur:15, ph:[[0,'客户端定期检查厂商的更新','ok'],[2.5,'厂商准备了正规更新包','ok'],[5,'攻击者占据更新通道,换包','atk'],[8,'客户端下载到被替换的更新包','warn'],[10.5,'没有校验签名,直接安装','warn'],[12.5,'终端被植入后门','atk']],
 fx:[L('ok',14.6),['relay',0,15,{id:'v',at:X,kind:CL,col:'ok',label:'厂商更新服务器',scale:.5}],['relay',4,15,{id:'m',at:AT,kind:C,col:'atk',label:'攻击者',scale:.45}],
  ['packet',1.2,3.5,{wp:['dstT',XT],col:'ok',shape:'question',size:.36,arc:2.8}],['packet',2.5,4.8,{wp:[XT,'dstT'],col:'ok',shape:'hex',size:.4,arc:2.8}],['link',5,15,{wp:[XT,ATT,'dstT'],col:'atk',dash:1,arc:1.8}],
  ['packet',6.5,10,{wp:[XT,ATT,'dstT'],col:'ok',colTo:'atk',tAt:.45,shape:'hex',size:.44,arc:1.8}],['gate',8,12,{wp:[XT,ATT,'dstT'],u:.93,col:'def',pulses:[10],bad:[],r:1.0,arc:1.8,no:true}],
  ['@hit',10,10.8,{who:'dst',col:'atk',n:26,shards:4}],['@tint',10.2,11.5,{who:'dst',col:'atk',k:.8}],['glyph',11.5,15,{name:'bug',at:'dst',dy:6.2,col:'atk',size:1,anim:'throb'}]]}
);
})(window.SEC_EVENTS);
