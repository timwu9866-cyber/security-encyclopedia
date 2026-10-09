(function(E){
const U=[0,0,5.2], UT=[0,2.5,5.2], AT=[0,0,-5.5], ATT=[0,2.5,-5.5], X=[10.5,0,-6.5], XT=[10.5,2.5,-6.5];
const C='client', S='server', D='db', N='net', CL='cloud';
const L=(c,e)=>['link',0.4,e,{col:c||'ok'}];
E.push(
{ id:'bucket', cat:'cloud', name:'云存储桶公开', en:'Public Cloud Storage Bucket', sev:'high', stage:'收集 / 数据外泄',
 src:{n:'互联网访问者',k:C,c:'warn',d:'任何人,包括自动化扫描器'}, dst:{n:'云存储桶',k:CL,c:'ok',d:'被误设为“公开可读”的对象存储'},
 principle:'对象存储的访问策略被误配成对所有人开放。公开扫描器持续枚举桶名并尝试读取,一旦发现可读,桶内的文件就可以被任何人批量下载。',
 impact:'备份、日志、用户文件被公开下载,常成为大规模泄露事件的根源。',
 defense:['默认私有,开启“阻止公共访问”','定期用配置检查工具审计桶策略','最小权限的访问策略与加密','访问日志与异常下载告警'],
 refs:['MITRE ATT&CK T1530','OWASP Top 10:A05 安全配置错误','CWE-732'], kw:'s3 oss 对象存储 公开读 配置错误',
 dur:15, ph:[[0,'存储桶按预期应为私有','ok'],[2.5,'一次配置失误:访问策略被改为公开','warn'],[5,'自动化扫描器发现该桶','atk'],[8,'任何人都可以列出并下载文件','atk'],[11,'大量文件被批量拉走','atk']],
 fx:[['link',0.4,14.6,{col:'warn'}],['glyph',0.5,2.8,{name:'lock',at:'dst',dy:6.2,col:'ok',size:1,anim:'float'}],['glyph',2.8,15,{name:'unlock',at:'dst',dy:6.2,col:'warn',size:1.1,anim:'pop'}],['@tint',2.8,4,{who:'dst',col:'warn',k:.5}],
  ['sweep',4,8,{mode:'radar',at:'dst',col:'warn',r:3.6}],['stream',5,9,{wp:[[-10,3,6],'dstT'],col:'atk',rate:10,life:1.8,size:.18,spread:[2,2,2],arc:3}],['glyph',5,15,{name:'eye',at:'src',dy:6.2,col:'atk',size:1,anim:'float'}],
  ['records',6.5,15,{at:'dst',cols:5,rows:3,mode:'drain',col:'ok',col2:'warn',to:'srcT'}],['packet',9,13.5,{wp:['dstT','srcT'],col:'warn',shape:'doc',n:6,gap:.6,size:.36,arc:3}]]},

{ id:'iam-abuse', cat:'cloud', name:'云 IAM 权限滥用', en:'Cloud IAM Privilege Abuse', sev:'high', stage:'权限提升 / 影响',
 src:{n:'低权限云凭据',k:C,c:'atk',d:'被盗或泄露的低权限访问凭据'}, dst:{n:'云资源',k:CL,c:'ok',d:'由角色权限保护的数据库、计算和存储'},
 principle:'云里一切靠身份与权限(IAM)控制。攻击者拿到一个低权限凭据后,枚举它能“扮演”的其他角色和可附加的策略,一步步沿着权限链条升到管理员,再随意操作资源。',
 impact:'创建后门账号、删除/加密资源、滥用算力、导出全部数据。',
 defense:['最小权限与权限边界 (permission boundary)','禁止低权限身份修改策略/扮演高权限角色','启用云审计日志并监控提权调用','临时凭据与条件访问'],
 refs:['MITRE ATT&CK T1078.004 / T1098','OWASP 云安全常见项'], kw:'角色 策略 扮演 权限链 aws azure',
 dur:16, ph:[[0,'攻击者拿到一个低权限云凭据','atk'],[2.5,'枚举这个身份能扮演的角色','atk'],[5,'扮演中间角色,权限增加','atk'],[8,'利用策略配置缺陷,再升到管理员角色','atk'],[11,'以管理员身份操作云资源','atk'],[13.5,'资源被读取、复制或删除','atk']],
 fx:[L('atk',15.6),['hosts',2.5,16,{n:3,layout:'row',z:5.2,x:[-4.5,3.5],kind:'cloud',col:'atk',inf:[5,8,10.8],lab:['低权限角色','中间角色','管理员角色'],first:'src',links:true,scale:.4}],
  ['link',11,16,{wp:[[3.5,1.5,5.2],'dstT'],col:'atk',arc:2.4}],['packet',11.2,12.6,{wp:[[3.5,1.5,5.2],'dstT'],col:'atk',shape:'key',size:.42,arc:2.4}],['@hit',12.6,13.4,{who:'dst',col:'atk',n:28,shards:4}],
  ['records',12,16,{at:'dst',cols:5,rows:3,mode:'drain',col:'ok',col2:'atk',to:'srcT'}],['@tint',12.6,13.6,{who:'dst',col:'atk',k:.75}]]},

{ id:'containerescape', cat:'cloud', name:'容器逃逸', en:'Container Escape', sev:'critical', stage:'权限提升 / 防御规避',
 src:{n:'容器内攻击者',k:C,c:'atk',d:'控制了某个容器内进程的攻击者'}, dst:{n:'宿主机',k:S,c:'ok',d:'承载多个容器的物理/虚拟主机'},
 principle:'容器靠命名空间和权限隔离与宿主机分开。若容器以特权运行、挂载了敏感目录,或内核存在缺陷,攻击者就能突破隔离边界(示意),从容器内部“逃”到宿主机上。',
 impact:'宿主机及同机其他容器全部暴露,可横向到整个集群。',
 defense:['避免特权容器与危险挂载','启用 seccomp / AppArmor / 只读根文件系统','非 root 运行,及时升级运行时和内核','使用沙箱容器 (gVisor/Kata) 隔离高风险负载'],
 refs:['MITRE ATT&CK T1611','CWE-250'], kw:'docker 隔离 宿主机 特权容器',
 dur:16, ph:[[0,'容器在宿主机上被隔离运行','ok'],[2.5,'攻击者在容器内取得代码执行','atk'],[5,'探测隔离边界的薄弱处(特权/挂载/内核)','atk'],[8,'隔离边界被突破','atk'],[10.5,'攻击者来到宿主机,触及其他容器','atk'],[13,'宿主机被控制,风险扩散','atk']],
 fx:[L('atk',15.6),['shield',0,9,{at:'dst',style:'dome',col:'def',r:4.2,hits:[5.4,6.2,7],brk:8.4}],['relay',0,16,{id:'c',at:[5.2,0,2.4],kind:'iot',col:'atk',label:'容器',scale:.4}],
  ['packet',2.5,4.8,{wp:['srcT',[5.2,2.4,2.4]],col:'atk',shape:'dart',size:.4,arc:2.6}],['nodefx',0,0,{who:'c',tint:'atk',k:[[4.5,0],[5.5,.8]],cage:[[0,.8],[8,.8],[9,0]]}],
  ['link',5.5,12,{wp:[[5.2,2.4,2.4],'dstT'],col:'atk',arc:2,dash:1}],['@hit',8.4,9.4,{who:'dst',col:'atk',n:40,r:3.8,shards:8,sh:.1}],['@tint',8.6,11,{who:'dst',col:'atk',k:.9}],
  ['hosts',10,16,{n:2,layout:'fan',x:[9.8,12.8],kind:'iot',col:'atk',inf:[11,12],lab:['其他容器','其他容器'],first:'dst',scale:.36}]]},

{ id:'k8s', cat:'cloud', name:'K8s 配置错误', en:'Kubernetes Misconfiguration', sev:'high', stage:'初始访问 / 执行',
 src:{n:'攻击者',k:C,c:'atk',d:'扫描互联网上暴露的集群组件'}, dst:{n:'Kubernetes 集群',k:CL,c:'ok',d:'管理接口或权限配置不当的集群'},
 principle:'集群的管理面板或 API 被误暴露在公网,或默认账号权限过宽。攻击者无需漏洞,直接访问就能下发工作负载,创建高权限容器并在各个节点上扩散。',
 impact:'任意部署恶意容器、挖矿、窃取集群内密钥、横向到云账号。',
 defense:['API / 仪表盘不暴露公网并启用认证','启用 RBAC 最小权限、Pod 安全标准','网络策略限制 Pod 间通信','镜像准入控制与审计日志'],
 refs:['MITRE ATT&CK T1610 / T1609','CIS Kubernetes Benchmark'], kw:'集群 pod rbac dashboard 暴露',
 dur:16, ph:[[0,'集群管理入口应该只对内部开放','ok'],[2.5,'配置失误:管理入口暴露在公网','warn'],[5,'攻击者扫描发现并直接访问','atk'],[7.5,'部署一个高权限的恶意工作负载','atk'],[10,'工作负载在各节点上扩散','atk'],[13,'集群资源被滥用,密钥被窃取','atk']],
 fx:[L('atk',15.6),['glyph',2.5,16,{name:'unlock',at:'dst',dy:6.3,col:'warn',size:1,anim:'pop'}],['sweep',4,6.5,{mode:'radar',at:'src',col:'atk',r:3}],
  ['packet',6.6,8.4,{col:'atk',shape:'capsule',size:.46}],['@hit',8.4,9.2,{who:'dst',col:'atk',n:22}],
  ['hosts',8.4,16,{n:5,layout:'ring',kind:'iot',col:'atk',inf:[9.2,9.8,10.4,11,11.6],first:'dst',scale:.34,links:true}],['@tint',9,12,{who:'dst',col:'atk',k:.7}],['orbit',11,16,{at:'dst',n:4,shape:'coin',col:'warn',rad:2.4,h:3.4,size:.5}]]},

{ id:'apikey', cat:'cloud', name:'API 密钥泄露', en:'API Key Leakage', sev:'high', stage:'凭据访问 / 影响',
 src:{n:'攻击者',k:C,c:'atk',d:'持续搜索公开代码里密钥的人'}, dst:{n:'云 API / 服务',k:CL,c:'ok',d:'凭密钥即可调用的云端接口'},
 principle:'开发者不小心把访问密钥写进代码并推送到公开仓库,或放在前端、日志中。攻击者的自动化工具持续扫描这些公开位置,几分钟内就能找到并拿去调用云服务。',
 impact:'云资源被滥用(挖矿、数据读取、账单暴涨),数据泄露。',
 defense:['密钥放入密钥管理服务,不入库不入前端','提交前密钥扫描 (pre-commit / CI)','密钥最小权限、短期、定期轮换','账单与调用异常告警,泄露立即吊销'],
 refs:['MITRE ATT&CK T1552.001','CWE-798'], kw:'密钥 token 仓库 github 硬编码',
 dur:15, ph:[[0,'开发者提交代码到公开仓库','ok'],[2.5,'代码里不小心带着访问密钥','warn'],[5,'攻击者的自动扫描发现并取走密钥','atk'],[8,'攻击者拿密钥调用云服务','atk'],[10.5,'校验通过:密钥本身就是身份','warn'],[12.5,'资源被滥用,账单暴涨','atk']],
 fx:[L('atk',14.6),['relay',0,15,{id:'r',at:AT,kind:CL,col:'ok',label:'公开代码仓库',scale:.5}],['glyph',2.5,5,{name:'key',at:AT,dy:3.6,col:'warn',size:.9,anim:'blink'}],
  ['sweep',3.5,5.2,{mode:'radar',at:AT,col:'atk',r:2.8}],['packet',5,7.6,{wp:[ATT,'srcT'],col:'warn',shape:'key',size:.42,arc:2.6}],['glyph',7.6,15,{name:'key',at:'src',dy:6.2,col:'warn',size:1,anim:'float'}],
  ['packet',8,10.4,{col:'atk',shape:'key',size:.4,n:3,gap:.4}],['gate',8.2,12,{u:.9,col:'def',pulses:[10.4],r:1.1}],['@hit',10.6,11.4,{who:'dst',col:'atk',n:22}],['meter',10,15,{at:'dst',lv:[[10.4,.1],[13,1]]}],['glyph',11,15,{name:'coin',at:'dst',dy:6.2,col:'warn',size:1,anim:'rise'}]]}
);
})(window.SEC_EVENTS);
