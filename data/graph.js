/* graph.js — 知识图谱关系数据 + 构建器
   基础关系(属于/阶段/资产/参考/防御措施/相似/缓解)由事件数据自动生成;
   下方 CHAINS / MIT_MANUAL / SIMILAR_MANUAL / TAGS 是手工补充的"串联"与"缓解"关系。 */
(function () {
'use strict';
const EVS = window.SEC_EVENTS, CATS = window.SEC_CATS;

/* ---- 攻击链阶段(ATT&CK 战术) + 防守阶段 ---- */
const STAGES = [
  ['侦察','Reconnaissance','a'],['资源开发','Resource Development','a'],['初始访问','Initial Access','a'],['执行','Execution','a'],['持久化','Persistence','a'],
  ['权限提升','Privilege Escalation','a'],['防御规避','Defense Evasion','a'],['凭据访问','Credential Access','a'],['发现','Discovery','a'],['横向移动','Lateral Movement','a'],
  ['收集','Collection','a'],['命令与控制','Command & Control','a'],['数据外泄','Exfiltration','a'],['影响','Impact','a'],
  ['预防','Prevent','d'],['检测','Detect','d'],['响应','Respond','d'],['恢复','Recover','d'],
];
const STAGE_SYN = { '提权': '权限提升', '逃逸': '权限提升', '外泄': '数据外泄', '遏制': '响应', '修复': '响应', '调查': '检测', '欺骗': '检测', '持续验证': '预防' };

/* ---- 资产 / 目标类型 ---- */
const ASSETS = {
  WEB: ['Web / API 应用', '面向用户的网站、接口与业务系统'], HOST: ['主机与终端', '服务器、办公电脑与操作系统'], NET: ['网络与基础设施', '链路、DNS、路由、无线与网关'],
  ID: ['身份与账号', '账号、凭据、令牌与权限体系'], DATA: ['数据与存储', '数据库、文件、备份与日志'], CLOUD: ['云与容器', '云资源、容器、集群与 DevOps 平台'],
  SUP: ['软件供应链', '依赖、构建、发布与第三方组件'], PEOPLE: ['人员与组织', '员工、客户与物理场所'], IOT: ['IoT / 工控 / 移动', '联网设备、控制系统、车载与手机'],
  AI: ['AI / 大模型', '模型、训练数据与 LLM 应用'], FIN: ['金融与区块链', '支付、资产、合约与营销风控'],
};
const CAT_ASSET = { web: 'WEB', api: 'WEB', net: 'NET', host: 'HOST', iam: 'ID', data: 'DATA', cloud: 'CLOUD', supply: 'SUP', mal: 'HOST', social: 'PEOPLE', phys: 'PEOPLE', ext: 'IOT', ai: 'AI', fin: 'FIN' };
const ASSET_EXTRA = { ransomware: ['DATA'], ransomenc: ['HOST'], exfil: ['NET'], dbdump: ['WEB'], ssrf: ['CLOUD'], metadata: ['ID'], tokentheft: ['WEB'], aitm: ['WEB'], oauthabuse: ['CLOUD'], samlforge: ['WEB'],
  doubleext: ['HOST'], backupintercept: ['PEOPLE'], logleak: ['ID'], dnstunnel: ['DATA'], icmptunnel: ['DATA'], usbdrop: ['HOST'], physaccess: ['NET'], insider: ['DATA'], tailgating: ['HOST'],
  clipper: ['FIN'], walletkey: ['ID'], infostealer: ['ID'], sdkbackdoor: ['IOT'], appsigforge: ['SUP'], rootkit: ['HOST'], bec: ['FIN'], deepfake: ['FIN'], botnet: ['NET'], camerabots: ['NET'], iotbot: ['NET'] };

/* ---- 事件标签(用于自动匹配缓解) ---- */
const TAG_LISTS = {
  inject: ['sqli','cmdi','xxe','ssti','ldapi','nosqli','mailhdr','protopollute','promptinj','lfi','traversal','deser','xss'],
  authz: ['idor','authz','massassign','cors','wshijack','crosstenant','privabuse','csrf','redirect','clickjack'],
  dos: ['ddos','syn','slowloris','reflectamp','serverlessabuse','woolparty'],
  mitm: ['mitm','arp','dnshijack','dnspoison','eviltwin','wifideauth','sslstrip','tlsdowngrade','bgp','replay','sessionhijack','cachepoison','smuggle','subtakeover'],
  recon: ['portscan'],
  ransom: ['ransomware','ransomenc','raas','doubleext','medransom','plcransom','wiper','backupdel'],
  lateral: ['lateral','pth','credump','kerberoast','goldenticket','dcsync','privabuse','vlanhop'],
  privesc: ['linuxpriv','winpriv','bof','kernel','uacbypass','suidabuse','dockersock','containerescape','rootabuse'],
  persist: ['backdoor','rootkit','schedpersist','bootkit','shadowadmin','dllhijack','webshell'],
  exfil: ['exfil','leak','dbdump','dnstunnel','icmptunnel','infoexpo','logleak','misdelivery','llmleak','sdkbackdoor','backupintercept','modelsteal','infostealer','insider'],
  phish: ['phishmail','spearphish','bec','waterhole','smishing','vishing','qrphish','deepfake','fakesupport','fakejob','imimpersonate','macrodoc','aitm','oauthabuse'],
  supply: ['deppoison','badimage','buildhack','updatehijack','typosquat','maintainertakeover','depconfusion','ideplugin','sdkbackdoor','helmpoison','imagevuln','appsigforge'],
  cloudcfg: ['bucket','iam-abuse','k8s','apikey','dbexposed','iacmisconf','cicdleak','metadata','cloudabuse','ssrf','containerescape'],
  endpoint: ['rat','keylogger','procinject','lolbins','dllhijack','fileless','clipper','trojan','worm','miner','infostealer','macrodoc'],
  physical: ['usbdrop','physaccess','tailgating','smartlockreplay','insider'],
  social: ['phishmail','spearphish','bec','waterhole','smishing','vishing','qrphish','deepfake','fakesupport','fakejob','imimpersonate','tailgating'],
};
const CAT_TAG = { web: ['webapp'], api: ['webapp'], net: ['net'], host: ['endpoint'], iam: ['authn'], data: ['exfil'], cloud: ['cloudcfg'], supply: ['supply'], mal: ['malware'], social: ['phish'], phys: ['physical'], ext: ['iot'], ai: ['ai'], fin: ['fin'] };
/* 防守事件覆盖的标签 */
const COVERS = {
  waf: ['inject','webapp','ai'], ids: ['recon','lateral','malware','dos','exfil','mitm','net','iot'], honeypot: ['recon','lateral','malware','net'], isolate: ['malware','ransom','lateral','endpoint','iot'],
  patch: ['privesc','webapp','supply','malware','iot','endpoint'], audit: ['insider','exfil','authz','persist','physical','fin','ai'], zerotrust: ['lateral','authn','authz','cloudcfg','net'],
  recovery: ['ransom'], edr: ['malware','endpoint','persist','privesc','ransom','lateral','physical'],
  siem: ['lateral','authn','exfil','persist','dos','net','fin'], mailgw: ['malware','phish','social'], sandbox: ['malware','phish','endpoint'], tiblock: ['malware','recon','dos','exfil','phish','net','mitm'],
  ddosscrub: ['dos'], pam: ['privesc','authz','lateral','persist'], vulnloop: ['webapp','privesc','supply','cloudcfg','iot'], dlp: ['exfil'], microseg: ['lateral','ransom','iot','net'],
  deceive: ['lateral','recon','insider','physical'], mfa: ['authn','phish','social'], cspm: ['cloudcfg'], sbom: ['supply'], irplan: ['ransom','malware','persist','exfil'],
  redblue: ['webapp','authn','privesc','cloudcfg','ai','fin','authz'], secretsmgmt: ['cloudcfg','authn','supply'], sastdast: ['inject','webapp','authz','ai','fin'], awareness: ['phish','social','physical'],
};
/* 手工"缓解"关系:防守事件 → 攻击事件(优先级高于自动匹配) */
const MIT_MANUAL = {
  waf: ['sqli','cmdi','xss','lfi','xxe','ssti','traversal','smuggle','nosqli','ldapi','upload'], mailgw: ['phishmail','spearphish','bec','macrodoc','smishing'], awareness: ['phishmail','spearphish','vishing','smishing','qrphish','fakejob','tailgating','deepfake'],
  mfa: ['brute','stuffing','passwordspray','aitm','mfafatigue','phishmail','ato'], ddosscrub: ['ddos','syn','reflectamp','slowloris'], edr: ['ransomware','trojan','rat','fileless','procinject','lolbins','rootkit','keylogger','infostealer'],
  recovery: ['ransomenc','ransomware','backupdel','wiper','doubleext'], dlp: ['exfil','leak','misdelivery','llmleak','dnstunnel','logleak'], microseg: ['lateral','worm','pth','vlanhop','medransom','plcransom'],
  pam: ['privabuse','shadowadmin','dcsync','goldenticket','kerberoast','pth'], cspm: ['bucket','dbexposed','iacmisconf','k8s','iam-abuse','crosstenant'], sbom: ['deppoison','typosquat','depconfusion','maintainertakeover','buildhack','ideplugin','sdkbackdoor','helmpoison'],
  secretsmgmt: ['apikey','cicdleak','metadata','weakpwd'], sastdast: ['sqli','xss','ssrf','deser','massassign','payapitamper','reentrancy','race','protopollute'], deceive: ['portscan','lateral','insider'],
  honeypot: ['portscan','botnet','lateral'], tiblock: ['botnet','phishmail','dnshijack','exfil'], sandbox: ['macrodoc','trojan','phishmail','worm'], isolate: ['worm','ransomware','botnet'], patch: ['kernel','winpriv','linuxpriv','bof','imagevuln'],
  zerotrust: ['lateral','authz','tokentheft','cors','idor'], siem: ['brute','passwordspray','lateral','privabuse'], vulnloop: ['imagevuln','bof','kernel'], ids: ['portscan','arp','mitm','dns'+'hijack'], audit: ['insider','backupdel','infoexpo','shadowadmin'],
  irplan: ['ransomware','wiper','doubleext','backdoor'], redblue: ['sqli','authz','cicdleak'],
};
/* 手工"串联":攻击链先后关系(沿序列相邻两项连边) */
const CHAINS = [
  ['phishmail','macrodoc','infostealer','tokentheft','ato'], ['phishmail','credump','lateral','ransomware'], ['spearphish','trojan','rat','credump','pth','lateral','doubleext'],
  ['sqli','webshell','linuxpriv','lateral','exfil'], ['upload','webshell','backdoor','linuxpriv'], ['ssrf','metadata','iam-abuse','cloudabuse'], ['portscan','brute','lateral','dbdump','exfil'],
  ['kerberoast','privabuse','dcsync','goldenticket'], ['depconfusion','buildhack','updatehijack','trojan'], ['waterhole','kernel','rootkit','botnet'], ['cicdleak','iam-abuse','bucket','leak'],
  ['wifideauth','eviltwin','mitm','sslstrip','tokentheft'], ['botnet','ddos'], ['botnet','reflectamp'], ['passwordspray','ato','privabuse'], ['aitm','tokentheft','ato'], ['usbdrop','trojan','lateral'],
  ['physaccess','backdoor','exfil'], ['imagevuln','containerescape','dockersock','lateral'], ['backupdel','ransomenc','doubleext'], ['promptinj','llmleak'], ['fakejob','trojan'], ['deepfake','bec'],
  ['fakesupport','rat'], ['vishing','fakesupport'], ['uacbypass','procinject','credump'], ['camerabots','botnet','ddos'], ['iotbot','botnet'], ['smishing','simswap','ato'], ['xss','tokentheft','ato'],
  ['dnstunnel','exfil'], ['cachepoison','xss'], ['lolbins','schedpersist','bootkit'], ['phishmail','oauthabuse','ato'], ['typosquat','infostealer'], ['dbexposed','doubleext'], ['ideplugin','infostealer','cicdleak'],
  ['siem','irplan','isolate','recovery'], ['mailgw','sandbox','edr'], ['awareness','mailgw'], ['vulnloop','patch'], ['tiblock','ddosscrub'], ['sastdast','waf'], ['honeypot','deceive'],
];
const SIMILAR_MANUAL = [['sqli','nosqli'],['sqli','ldapi'],['cmdi','ssti'],['ddos','reflectamp'],['ddos','syn'],['syn','slowloris'],['arp','mitm'],['dnshijack','dnspoison'],['eviltwin','wifideauth'],['brute','passwordspray'],['stuffing','passwordspray'],
  ['kerberoast','goldenticket'],['trojan','rat'],['ransomware','raas'],['phishmail','spearphish'],['smishing','vishing'],['bucket','dbexposed'],['linuxpriv','suidabuse'],['winpriv','uacbypass'],['replay','smartlockreplay'],
  ['dllhijack','procinject'],['dnstunnel','icmptunnel'],['badimage','imagevuln'],['typosquat','depconfusion'],['wiper','ransomenc'],['waf','mailgw'],['edr','sandbox'],['honeypot','deceive'],['mfa','pam'],['ssrf','metadata'],['tokentheft','sessionhijack']];

/* ---- 第二批扩充(252 事件):标签、资产、覆盖、手工缓解、串联与相似 ---- */
(function () {
  const addTags = (o) => Object.keys(o).forEach(k => { TAG_LISTS[k] = (TAG_LISTS[k] || []).concat(o[k]); });
  addTags({
    inject: ['domxss','hpp','funcinject','indirectinj','cspbypass'], authz: ['jwtalg','apilegacy','bizlogic','pluginabuse','agenttool','approvalabuse','sessionfix','hostheader'],
    authn: ['exchangestuff','sessionfix','jwtalg','captchabypass','asrep','ptt','silverticket','adcs','cardclone','rfidcopy'],
    dos: ['smsbomb','macflood','dhcp','captchabypass'], mitm: ['ntphijack','llmnr','ra6','bgpleak','smbrelay','ntlmrelay','btattack','dhcp','macflood'],
    recon: ['apilegacy'], lateral: ['smbrelay','ntlmrelay','ptt','silverticket','asrep','adcs','cloudkeylateral'], privesc: ['tokenimperson','sandboxescape','adcs','jwtalg','pluginabuse','agenttool'],
    persist: ['modelbackdoor','comhijack','memshell'], exfil: ['membership','sidechannel','etcdexpose','layersecret','cloudsidechan','coldboot'], phish: ['signphish'], social: ['signphish'],
    supply: ['aisupply','ragpoison','layersecret'], cloudcfg: ['k8sapi','etcdexpose','cloudkeylateral','layersecret','funcinject','cloudsidechan'],
    endpoint: ['memshell','badusb','comhijack','tokenimperson','sandboxescape'], physical: ['cardclone','rfidcopy','btattack','badusb','sidechannel','coldboot'],
    /* 新标签:用于新增防守事件的精确匹配 */
    clientscript: ['xss','domxss','cspbypass','clickjack'], automation: ['brute','stuffing','passwordspray','captchabypass','smsbomb','woolparty','ratelimit','exchangestuff'],
    tlslayer: ['sslstrip','tlsdowngrade','eviltwin','mitm'], exposure: ['portscan','bucket','dbexposed','subtakeover','apilegacy','etcdexpose','k8sapi'],
    dbdata: ['leak','dbdump','dbexposed','etcdexpose','layersecret','membership','logleak'],
    l2access: ['arp','vlanhop','macflood','dhcp','ra6','k8s','k8sapi','etcdexpose','physaccess','usbdrop','badusb','wifideauth','eviltwin'],
  });
  Object.assign(ASSET_EXTRA, {
    sidechannel: ['IOT'], cardclone: ['IOT'], rfidcopy: ['IOT'], btattack: ['IOT'], badusb: ['HOST'], coldboot: ['HOST','DATA'], signphish: ['PEOPLE'], indirectinj: ['WEB'], agenttool: ['ID'], ragpoison: ['DATA'], pluginabuse: ['ID'],
    aisupply: ['SUP'], asrep: ['ID'], adcs: ['ID'], ptt: ['ID'], silverticket: ['ID'], tokenimperson: ['ID'], smbrelay: ['ID'], ntlmrelay: ['ID','HOST'], llmnr: ['ID'], ntphijack: ['HOST'], memshell: ['WEB'],
    etcdexpose: ['DATA'], layersecret: ['SUP','ID'], cloudkeylateral: ['ID'], funcinject: ['WEB'], jwtalg: ['ID'], sessionfix: ['ID'], captchabypass: ['ID'], exchangestuff: ['ID'], bizlogic: ['FIN'], smsbomb: ['PEOPLE'],
  });
  Object.assign(COVERS, {
    ratelimitdef: ['automation','dos','authn'], ueba: ['authn','insider','exfil','persist'], cdnwaf: ['inject','dos','webapp'], nac: ['l2access','physical','iot'], bastion: ['privesc','authz','insider'],
    dbmask: ['dbdata','exfil'], cthsts: ['tlslayer','mitm'], honeytoken: ['lateral','authn','cloudcfg'], cspdef: ['clientscript'], asm: ['exposure','recon','cloudcfg'],
  });
  const addMit = (o) => Object.keys(o).forEach(k => { MIT_MANUAL[k] = (MIT_MANUAL[k] || []).concat(o[k]); });
  addMit({
    ratelimitdef: ['brute','stuffing','passwordspray','captchabypass','smsbomb','woolparty','ratelimit','exchangestuff','graphql'],
    ueba: ['ato','tokentheft','insider','stuffing','credump','exchangestuff','ptt','silverticket','infostealer'],
    cdnwaf: ['ddos','syn','reflectamp','slowloris','hpp','hostheader','cachepoison','smuggle','sqli','cmdi'],
    nac: ['k8s','k8sapi','etcdexpose','arp','vlanhop','macflood','dhcp','eviltwin','physaccess','usbdrop','badusb'],
    bastion: ['privabuse','shadowadmin','insider','lateral','dockersock'],
    dbmask: ['leak','dbdump','dbexposed','insider','logleak','etcdexpose','backupintercept','membership'],
    cthsts: ['sslstrip','tlsdowngrade','eviltwin','mitm'],
    honeytoken: ['lateral','credump','apikey','cicdleak','infostealer','kerberoast','asrep','insider','cloudkeylateral'],
    cspdef: ['xss','domxss','cspbypass','clickjack'],
    asm: ['portscan','bucket','dbexposed','subtakeover','apilegacy','k8sapi','etcdexpose','iacmisconf'],
    pam: ['adcs','silverticket','ptt','tokenimperson','asrep','cloudkeylateral'], zerotrust: ['agenttool','pluginabuse','jwtalg','apilegacy','ptt','cloudkeylateral'],
    mfa: ['signphish','exchangestuff','sessionfix','ptt'], edr: ['memshell','comhijack','tokenimperson','badusb'], waf: ['hpp','hostheader','domxss'],
    sastdast: ['bizlogic','jwtalg','hpp','funcinject','sessionfix','indirectinj'], sbom: ['aisupply'], cspm: ['k8sapi','etcdexpose','funcinject','layersecret','cloudkeylateral'],
    secretsmgmt: ['layersecret','cloudkeylateral'], microseg: ['smbrelay','ntlmrelay','llmnr'], patch: ['sandboxescape','smbrelay','ntlmrelay'], sandbox: ['aisupply'],
    audit: ['approvalabuse','agenttool','pluginabuse'], awareness: ['signphish','badusb'], siem: ['asrep','ptt','silverticket','cloudkeylateral','exchangestuff'], dlp: ['indirectinj','ragpoison'],
    ids: ['dhcp','ra6','llmnr'],
  });
  CHAINS.push(
    ['indirectinj','agenttool','llmleak'], ['ragpoison','indirectinj'], ['aisupply','modelbackdoor'], ['signphish','approvalabuse'], ['llmnr','smbrelay','ntlmrelay','adcs','dcsync'], ['dhcp','mitm'], ['ra6','mitm'], ['macflood','mitm'],
    ['asrep','privabuse','dcsync'], ['adcs','goldenticket'], ['credump','ptt','lateral'], ['silverticket','lateral'], ['tokenimperson','credump'], ['memshell','backdoor'], ['k8sapi','etcdexpose','cloudkeylateral'],
    ['layersecret','cloudkeylateral'], ['funcinject','metadata','iam-abuse'], ['badusb','rat'], ['cardclone','physaccess'], ['xss','cspbypass'], ['domxss','tokentheft','ato'], ['hostheader','ato'], ['sessionfix','ato'], ['jwtalg','privabuse'],
    ['apilegacy','idor'], ['captchabypass','stuffing'], ['stuffing','exchangestuff'], ['smsbomb','captchabypass'], ['bizlogic','woolparty'], ['bgpleak','mitm'],
    ['cdnwaf','ratelimitdef'], ['asm','vulnloop'], ['nac','microseg'], ['ueba','siem'], ['honeytoken','deceive'], ['cspdef','waf'], ['bastion','pam'], ['dbmask','dlp'], ['cthsts','mfa'],
  );
  SIMILAR_MANUAL.push(
    ['smbrelay','ntlmrelay'], ['kerberoast','asrep'], ['silverticket','goldenticket'], ['ptt','pth'], ['domxss','xss'], ['cspbypass','xss'], ['dhcp','arp'], ['macflood','arp'], ['ra6','arp'], ['llmnr','dnspoison'], ['bgpleak','bgp'],
    ['jwtalg','jwt'], ['signphish','approvalabuse'], ['cardclone','rfidcopy'], ['sidechannel','cloudsidechan'], ['etcdexpose','k8sapi'], ['memshell','webshell'], ['aisupply','modelbackdoor'], ['indirectinj','promptinj'],
    ['smsbomb','ratelimit'], ['captchabypass','ratelimit'], ['hostheader','cachepoison'], ['sessionfix','sessionhijack'], ['badusb','usbdrop'], ['coldboot','sidechannel'], ['bridge','flashloan'], ['oracle','flashloan'],
    ['modelbackdoor','trainpoison'], ['ragpoison','trainpoison'], ['membership','modelsteal'], ['ratelimitdef','ddosscrub'], ['cdnwaf','waf'], ['cspdef','cdnwaf'], ['nac','microseg'], ['bastion','pam'], ['honeytoken','deceive'],
    ['ueba','siem'], ['asm','vulnloop'], ['dbmask','dlp'],
  );
})();

/* ---- 防御措施(通用对策):从 defense[] 文本关键词归类 ---- */
const MEASURES = [
  ['输入校验与转义', /参数化|预编译|转义|输入校验|输出编码|净化|模式校验|类型.*校验|白名单(校验)?/],
  ['多因素 / 强认证', /多因素|MFA|FIDO|Passkey|认证器|二次验证|硬件密钥/],
  ['最小权限与职责分离', /最小权限|最小化.{0,4}权限|职责分离|权限最小|最小特权/],
  ['补丁与更新', /补丁|升级|更新|修补|及时修/],
  ['加密与密钥保护', /加密|密钥|轮换|KMS|机密管理|HSM/],
  ['备份与恢复', /备份|恢复演练|不可变/],
  ['日志、监控与告警', /日志|监控|告警|审计|异常.{0,6}检测|检测.{0,4}异常|行为分析/],
  ['网络分段与隔离', /分段|隔离|微隔离|VLAN|沙箱|网络隔离/],
  ['零信任与访问控制', /零信任|访问控制|条件访问|授权校验|按需授权/],
  ['终端防护 (EDR)', /EDR|终端防护|终端检测|应用白名单|代码完整性|白名单/],
  ['网关、限流与 WAF', /WAF|网关|限流|速率|防火墙|清洗|验证码|人机/],
  ['完整性与签名校验', /签名|完整性|摘要|来源证明|SBOM|锁文件|固定版本|校验/],
  ['安全配置基线', /基线|配置|默认口令|关闭.{0,6}(服务|端口)|禁用/],
  ['安全意识与演练', /培训|演练|意识|宣传|警惕/],
  ['威胁情报与封堵', /情报|封堵|封禁|黑名单|信誉/],
  ['资产与暴露面管理', /资产|暴露面|扫描|盘点/],
  ['数据防泄漏与脱敏', /DLP|脱敏|分级|外发|泄漏|泄露/],
  ['凭据与会话管理', /口令|令牌|会话|Cookie|凭据/],
];

/* ================= 构建器 ================= */
function build() {
  const nodes = [], edges = [], byId = new Map(), warn = [];
  const add = n => { if (!byId.has(n.id)) { byId.set(n.id, n); nodes.push(n); } return byId.get(n.id); };
  const edgeSet = new Set();
  const link = (s, t, type, extra) => { if (!byId.has(s) || !byId.has(t) || s === t) return; const k = type + '|' + s + '|' + t; const k2 = type + '|' + t + '|' + s; if (edgeSet.has(k) || (type === 'similar' && edgeSet.has(k2))) return; edgeSet.add(k); edges.push(Object.assign({ s, t, type }, extra || {})); };
  const evById = new Map(EVS.map(e => [e.id, e])), eid = id => 'e:' + id;

  CATS.forEach(c => add({ id: 'c:' + c.id, type: 'category', name: c.name, en: c.en, icon: c.icon, cat: c.id, desc: c.en }));
  STAGES.forEach(s => add({ id: 's:' + s[0], type: 'stage', name: s[0], en: s[1], side: s[2], desc: s[2] === 'a' ? '攻击链阶段(参考 MITRE ATT&CK 战术)' : '防守与响应阶段' }));
  Object.keys(ASSETS).forEach(k => add({ id: 'a:' + k, type: 'asset', name: ASSETS[k][0], en: k, desc: ASSETS[k][1] }));
  const MN = {}; MEASURES.forEach(m => { MN[m[0]] = add({ id: 'm:' + m[0], type: 'measure', name: m[0], desc: '通用防御措施(由事件的防御要点自动归类)' }); });

  EVS.forEach(e => { add({ id: eid(e.id), type: e.sev === 'none' ? 'defense' : 'event', name: e.name, en: e.en, sev: e.sev, cat: e.cat, ev: e, desc: e.stage, kw: e.kw || '' }); });

  /* 属于 / 阶段 / 资产 / 措施 / 参考 */
  const refNodes = {};
  const refNode = (key, name, sub) => { const id = 'r:' + key; if (!byId.has(id)) refNodes[id] = add({ id, type: 'ref', sub, name, en: '', desc: sub === 'attack' ? 'MITRE ATT&CK 技术' : sub === 'cwe' ? 'CWE 弱点枚举' : sub === 'owasp' ? 'OWASP 项目' : '标准 / 规范 / 指南' }); return id; };
  const stagesOf = e => {
    const out = new Set(); const txt = e.stage || '';
    STAGES.forEach(s => { if (txt.includes(s[0])) out.add(s[0]); });
    Object.keys(STAGE_SYN).forEach(k => { if (txt.includes(k)) out.add(STAGE_SYN[k]); });
    if (e.sev === 'none') { [...out].forEach(n => { if (STAGES.find(s => s[0] === n && s[2] === 'a')) out.delete(n); }); if (!out.size) out.add('预防'); }
    else { [...out].forEach(n => { if (STAGES.find(s => s[0] === n && s[2] === 'd')) out.delete(n); }); if (!out.size) { out.add('初始访问'); warn.push('stage fallback ' + e.id); } }
    return [...out];
  };
  EVS.forEach(e => {
    const id = eid(e.id);
    link(id, 'c:' + e.cat, 'belongs');
    stagesOf(e).forEach(s => link(id, 's:' + s, 'stage'));
    const as = new Set([CAT_ASSET[e.cat]].filter(Boolean)); (ASSET_EXTRA[e.id] || []).forEach(a => as.add(a));
    if (e.sev === 'none') { as.clear(); const tg = COVERS[e.id] || []; const map = { webapp: 'WEB', inject: 'WEB', authn: 'ID', authz: 'ID', exfil: 'DATA', cloudcfg: 'CLOUD', supply: 'SUP', phish: 'PEOPLE', social: 'PEOPLE', physical: 'PEOPLE', malware: 'HOST', endpoint: 'HOST', ransom: 'HOST', lateral: 'NET', dos: 'NET', mitm: 'NET', net: 'NET', recon: 'NET', iot: 'IOT', ai: 'AI', fin: 'FIN', persist: 'HOST', privesc: 'HOST', insider: 'PEOPLE' }; tg.forEach(t => map[t] && as.add(map[t])); if (!as.size) as.add('HOST'); }
    as.forEach(a => link(id, 'a:' + a, 'asset'));
    const seenM = new Set(); (e.defense || []).forEach(d => MEASURES.forEach(m => { if (!seenM.has(m[0]) && m[1].test(d)) { seenM.add(m[0]); link(id, 'm:' + m[0], 'measure'); } }));
    (e.refs || []).forEach(r => {
      const keys = [];
      let m;
      if (/OWASP Top 10 for LLM/.test(r)) keys.push([refNode('LLM:' + r.replace(/.*Applications:/, ''), 'OWASP LLM · ' + r.replace(/.*Applications:/, ''), 'owasp')]);
      else if ((m = r.match(/OWASP API Security Top 10:API(\d+)\s*(.*)/))) keys.push([refNode('API' + m[1], 'OWASP API' + m[1] + ' ' + m[2], 'owasp')]);
      else if ((m = r.match(/OWASP Top 10:A(\d+)\s*(.*)/))) keys.push([refNode('A' + m[1], 'OWASP A' + m[1] + ' ' + m[2].replace(/\(相关\)/, ''), 'owasp')]);
      const cw = r.match(/CWE-\d+/g); if (cw) cw.forEach(c => keys.push([refNode(c, c, 'cwe')]));
      const tt = r.match(/T\d{4}(?:\.\d{3})?/g); if (tt && /ATT&CK/.test(r)) tt.forEach(t => keys.push([refNode(t, 'ATT&CK ' + t, 'attack')]));
      if (!keys.length) keys.push([refNode('S:' + r.replace(/\(相关\)/g, '').trim(), r.replace(/\(相关\)/g, '').trim(), 'std')]);
      keys.forEach(k => link(id, k[0], 'ref'));
    });
  });

  /* 缓解:防守事件 → 攻击事件(自动 top2 + 手工) */
  const tagsOf = {}; EVS.forEach(e => { tagsOf[e.id] = new Set(CAT_TAG[e.cat] || []); });
  Object.keys(TAG_LISTS).forEach(t => TAG_LISTS[t].forEach(id => { if (tagsOf[id]) tagsOf[id].add(t); }));
  const defs = EVS.filter(e => e.sev === 'none'), atks = EVS.filter(e => e.sev !== 'none');
  const mitCount = {};
  atks.forEach(a => {
    const sc = defs.map((d, i) => ({ d, s: (COVERS[d.id] || []).filter(t => tagsOf[a.id].has(t)).length, i })).filter(x => x.s > 0).sort((x, y) => y.s - x.s || x.i - y.i).slice(0, 2);
    sc.forEach(x => { link(eid(x.d.id), eid(a.id), 'mitigate', { auto: 1, score: x.s }); });
  });
  const manualSet = new Set();
  Object.keys(MIT_MANUAL).forEach(d => MIT_MANUAL[d].forEach(a => { if (evById.has(d) && evById.has(a)) { link(eid(d), eid(a), 'mitigate'); manualSet.add(d + '>' + a); } else warn.push('mit missing ' + d + '->' + a); }));
  /* 覆盖强度:手工映射,或自动匹配得分 ≥2 视为"直接对应";其余为弱关联 */
  edges.forEach(x => { if (x.type === 'mitigate') { x.manual = manualSet.has(x.s.slice(2) + '>' + x.t.slice(2)); x.strong = x.manual || (x.score || 0) >= 2; } });
  edges.filter(x => x.type === 'mitigate').forEach(x => { mitCount[x.t] = (mitCount[x.t] || 0) + 1; });

  /* 串联 */
  CHAINS.forEach(seq => { for (let i = 0; i + 1 < seq.length; i++) { if (evById.has(seq[i]) && evById.has(seq[i + 1])) link(eid(seq[i]), eid(seq[i + 1]), 'chain'); else warn.push('chain missing ' + seq[i] + '->' + seq[i + 1]); } });

  /* 相似:手工 + 自动(同参考 / 关键词相近,每点最多 2 条) */
  SIMILAR_MANUAL.forEach(p => { if (evById.has(p[0]) && evById.has(p[1])) link(eid(p[0]), eid(p[1]), 'similar'); else warn.push('sim missing ' + p); });
  const sig = {}; EVS.forEach(e => { const s = new Set(); (e.kw || '').split(/\s+/).filter(Boolean).forEach(k => s.add('k:' + k)); (e.refs || []).forEach(r => { (r.match(/CWE-\d+|T\d{4}(?:\.\d{3})?/g) || []).forEach(x => s.add('r:' + x)); }); (tagsOf[e.id] || new Set()).forEach(t => s.add('t:' + t)); sig[e.id] = s; });
  EVS.forEach(a => {
    const cand = EVS.filter(b => b.id !== a.id && (a.sev === 'none') === (b.sev === 'none')).map(b => { let inter = 0; sig[a.id].forEach(x => { if (sig[b.id].has(x)) inter += x[0] === 'r' ? 2 : 1; }); const uni = sig[a.id].size + sig[b.id].size; return { b, s: inter / Math.max(1, uni) }; }).filter(x => x.s >= 0.22).sort((x, y) => y.s - x.s).slice(0, 2);
    cand.forEach(x => link(eid(a.id), eid(x.b.id), 'similar', { auto: 1 }));
  });

  /* 邻接表 */
  const adj = new Map(nodes.map(n => [n.id, []]));
  edges.forEach(x => { adj.get(x.s).push(x); adj.get(x.t).push(x); });
  /* 统计与校验 */
  const stat = { nodes: nodes.length, edges: edges.length, byType: {}, byEdge: {}, warn };
  nodes.forEach(n => stat.byType[n.type] = (stat.byType[n.type] || 0) + 1);
  edges.forEach(x => stat.byEdge[x.type] = (stat.byEdge[x.type] || 0) + 1);
  stat.attackNoStage = atks.filter(a => !adj.get(eid(a.id)).some(x => x.type === 'stage')).map(a => a.id);
  stat.attackNoDefense = atks.filter(a => !adj.get(eid(a.id)).some(x => x.type === 'mitigate' && x.t === eid(a.id))).map(a => a.id);
  stat.defNoTarget = defs.filter(d => !adj.get(eid(d.id)).some(x => x.type === 'mitigate' && x.s === eid(d.id))).map(d => d.id);
  stat.attackCount = atks.length; stat.defenseCount = defs.length;
  /* 覆盖缺口:没有"直接对应"防守事件的攻击事件(只有弱关联防御,或完全没有) */
  const strongIn = {}; edges.forEach(x => { if (x.type === 'mitigate' && x.strong) strongIn[x.t] = (strongIn[x.t] || 0) + 1; });
  stat.gap = atks.filter(a => !strongIn[eid(a.id)]).map(a => a.id);
  stat.gapWeak = {}; stat.gap.forEach(id => { stat.gapWeak[id] = adj.get(eid(id)).filter(x => x.type === 'mitigate').map(x => x.s.slice(2)); });
  atks.forEach(a => { const n = byId.get(eid(a.id)); n.cover = strongIn[eid(a.id)] || 0; n.gap = !n.cover; });
  stat.strongEdges = edges.filter(x => x.type === 'mitigate' && x.strong).length; stat.manualEdges = manualSet.size;
  return { nodes, edges, adj, byId, stages: STAGES, stat };
}
window.SEC_GRAPH_BUILD = build;
window.SEC_GRAPH_META = { STAGES, ASSETS, MEASURES: MEASURES.map(m => m[0]) };
})();
