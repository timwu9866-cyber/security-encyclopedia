/* nodelib.js v4 — 通用网络安全节点模型库(实心低多边形 + 发光方形底框 + 分区底板;概念造型,程序化生成,无外部模型/商标)
   用法: NODELIB.addLights(scene, theme); const n = NODELIB.createNode('firewall', { theme:'dark', size:1 });
         const z = NODELIB.createZone({ title:'安全管理区', w:8, d:6, color:'violet' }); NODELIB.createLink(p1, p2);
         scene.add(n.group); n.setState('attacked'); 每帧 n.update(t);  n.dispose()
   规范数据: NODELIB.SPEC / NODELIB.CATS / NODELIB.SIZES / NODELIB.STATES
   依赖: window.THREE(仅在 createNode 时需要;SPEC 可在无 THREE 的环境读取,用于导出 JSON) */
(function (root) {
'use strict';

/* ---------- 类别与色板 ---------- */
const CATS = {
  /* 夜间色对齐旧图采样(饱和亮蓝/金黄/绿);日间加深一档保证浅底对比 */
  net:    { name: '网络设备',          en: 'Network',            dark: '#1fe85a', light: '#0c7a32', glyph: '◇', target: '#1fd65a' },
  office: { name: '办公设备',          en: 'Office / Endpoint',  dark: '#2f8fff', light: '#1a6fd4', glyph: '▢', target: '#2f8fff' },
  sec:    { name: '安全设备',          en: 'Security',           dark: '#f5c518', light: '#c9a010', glyph: '⛉', target: '#f5c518' },
  srv:    { name: '服务器 / 云',       en: 'Server / Cloud',     dark: '#c9a0ff', light: '#7a48c8', glyph: '☰', target: '#c9a0ff' },
  iot:    { name: '终端 / IoT / 工控',  en: 'IoT / ICS',          dark: '#ff6bcb', light: '#c02098', glyph: '◎', target: '#ff6bcb' },
  ext:    { name: '攻击者 / 外部',      en: 'Threat / External',  dark: '#ff3b4e', light: '#c01830', glyph: '✕', target: '#ff3b4e' },
};
/* 状态色(与事件大全语义色一致) */
const STATE_COL = {
  dark:  { sel: '#ffffff', atk: '#ff2a3c', def: '#22e6ff', bg: '#07090f', grid: '#1a2438' },
  light: { sel: '#0d1626', atk: '#c4001c', def: '#007f9e', bg: '#d5dee9', grid: '#7a8799' },
};
const SIZES = { S: 0.8, M: 1.0, L: 1.25, XL: 1.5 };
const STATES = {
  normal:    { name: '普通',   desc: 'MeshStandard 主体 + 细部(屏幕/支架/刻线),无地面底座' },
  selected:  { name: '选中',   desc: '模型叠加白色细描边(EdgesGeometry)' },
  attacked:  { name: '被攻击', desc: '模型闪红 + 红色细描边,轻微抖动' },
  protected: { name: '已防护', desc: '青色细描边 + 薄半透明护罩' },
};

/* ---------- 造型 DSL ----------
   每个部件: [形状, 参数, 位置[x,y,z], 旋转[rx,ry,rz]?]
   形状: box[w,h,d] cyl[rt,rb,h,seg] sph[r,ws,hs] cone[r,h,seg] tor[R,r,arc] oct[r] hemi[r] */
const P = (s, a, p, r, tone) => tone ? [s, a, p || [0, 0, 0], r || [0, 0, 0], tone] : [s, a, p || [0, 0, 0], r || [0, 0, 0]];
const PI = Math.PI;

const SPEC = {
  /* ===== 网络设备(绿) ===== */
  router: { cat: 'net', name: '路由器', en: 'Router', size: 'M', abbr: 'RT', role: ['路径', '目标'],
    use: '在不同网段/运营商之间转发数据包、维护路由表。',
    look: '扁平机身 + 后部两根竖直天线,正面一排指示灯。',
    parts: [P('box', [2.2, .5, 1.4], [0, .35, 0]), P('cyl', [.05, .05, 1.3, 6], [-.85, 1.15, -.5]), P('cyl', [.05, .05, 1.3, 6], [.85, 1.15, -.5]),
      ...[-.6, -.3, 0, .3, .6].map(x => P('box', [.12, .08, .04], [x, .4, .72]))], core: [0, .9, 0] },
  switch: { cat: 'net', name: '交换机', en: 'Switch', size: 'M', abbr: 'SW', role: ['路径', '目标'],
    use: '在同一局域网内按 MAC 地址转发,连接大量终端端口。',
    look: '超长 1U 薄机身,正面两排小方口阵列。',
    parts: [P('box', [2.9, .32, 1.1], [0, .26, 0]), ...[...Array(10).keys()].flatMap(i => [P('box', [.16, .07, .04], [-1.2 + i * .267, .32, .57]), P('box', [.16, .07, .04], [-1.2 + i * .267, .2, .57])])], core: [0, .85, 0] },
  coreswitch: { cat: 'net', name: '核心交换机', en: 'Core Switch', size: 'L', abbr: 'CS', role: ['路径', '目标'],
    use: '园区/机房汇聚核心,承载大部分东西向流量。',
    look: '宽机箱,竖直插卡槽位(竖向条纹)+ 顶部风扇格栅。',
    parts: [P('box', [2.0, 1.5, 1.2], [0, .85, 0]), ...[...Array(7).keys()].map(i => P('box', [.06, 1.2, .04], [-.78 + i * .26, .85, .62])), P('cyl', [.3, .3, .06, 12], [-.45, 1.63, 0]), P('cyl', [.3, .3, .06, 12], [.45, 1.63, 0])], core: [0, 2.2, 0] },
  ap: { cat: 'net', name: '无线 AP', en: 'Wireless AP', size: 'S', abbr: 'AP', role: ['路径', '目标'],
    use: '为终端提供 Wi-Fi 接入,常见于办公区与公共区域。',
    look: '细杆上的圆饼形吸顶机身 + 上方两道同心信号弧。',
    parts: [P('cyl', [.08, .08, .95, 6], [0, .48, 0], [0,0,0], 'light'), P('hemi', [.9], [0, 1.0, 0], [0,0,0], 'dark'), P('cyl', [.95, .95, .12, 20], [0, 1.12, 0]), P('tor', [.55, .035, 3.14], [0, 1.28, 0], [0,0,0], 'light'), P('tor', [.95, .035, 3.14], [0, 1.28, 0], [0,0,0], 'light')], core: [0, 1.25, 0] },
  lb: { cat: 'net', name: '负载均衡', en: 'Load Balancer', size: 'M', abbr: 'LB', role: ['路径', '防护'],
    use: '把访问请求分发到多台后端服务器,提高可用性。',
    look: '中心方体 + 一进三出的扇形分叉臂,末端小方块。',
    parts: [P('box', [.9, .7, .9], [0, .45, 0]), P('box', [1.0, .08, .08], [-.95, .45, 0]), P('box', [.3, .3, .3], [-1.55, .45, 0]),
      ...[-.7, 0, .7].flatMap(z => [P('box', [.9, .08, .08], [.85, .45, z * .55], [0, -Math.atan2(z * .55, .85), 0]), P('box', [.3, .3, .3], [1.45, .45, z])])], core: [0, 1.15, 0] },
  dns: { cat: 'net', name: 'DNS 服务', en: 'DNS', size: 'S', abbr: 'DNS', role: ['目标', '路径'],
    use: '把域名解析为 IP 地址,是几乎所有访问的第一步。',
    look: '细高立柱托起一个带经纬线的小地球。',
    parts: [P('cyl', [.22, .32, 1.1, 8], [0, .55, 0]), P('sph', [.55, 10, 8], [0, 1.55, 0]), P('tor', [.62, .025, 2 * PI], [0, 1.55, 0], [PI / 2, 0, 0])], core: [0, 1.55, 0] },

  /* ===== 办公设备(蓝) ===== */
  pc: { cat: 'office', name: '台式电脑', en: 'Desktop PC', size: 'M', abbr: 'PC', role: ['目标', '源'],
    use: '员工日常办公主机,常是钓鱼、勒索的落点。',
    look: '左侧竖立机箱 + 右侧支架显示器。',
    parts: [P('box', [.55, 1.3, 1.1], [-.9, .65, 0]), P('box', [1.5, .95, .08], [.35, 1.15, 0]), P('box', [.1, .5, .1], [.35, .4, 0]), P('box', [.7, .05, .5], [.35, .05, 0])], core: [.35, 1.15, .25] },
  laptop: { cat: 'office', name: '笔记本', en: 'Laptop', size: 'S', abbr: 'NB', role: ['目标', '源'],
    use: '移动办公终端,常在外部网络与内网之间切换。',
    look: '薄底座 + 后仰张开的屏幕,呈打开的书本角度。',
    parts: [P('box', [1.7, .1, 1.15], [0, .1, .1]), P('box', [1.7, 1.05, .06], [0, .62, -.6], [-.3, 0, 0]), P('box', [1.3, .02, .6], [0, .16, .2], [0, 0, 0], 'dark')], core: [0, .7, -.3] },
  printer: { cat: 'office', name: '打印机', en: 'Printer', size: 'M', abbr: 'PR', role: ['目标'],
    use: '共享打印/扫描设备,常被忽视的联网资产。',
    look: '矮胖方机身 + 前伸出纸托盘 + 顶部斜插纸张。',
    parts: [P('box', [1.6, .7, 1.2], [0, .4, 0]), P('box', [1.2, .05, .7], [0, .2, .9]), P('box', [1.1, .9, .03], [0, 1.1, -.35], [-.35, 0, 0], 'light')], core: [0, .95, .3] },
  mobile: { cat: 'office', name: '手机', en: 'Mobile Phone', size: 'S', abbr: 'MB', role: ['目标', '源'],
    use: '移动终端,承载短信验证码、企业 IM 与邮件。',
    look: '直立的细长薄片,略向后倾,顶部听筒缝。',
    parts: [P('box', [.75, 1.5, .1], [0, .8, 0], [-.18, 0, 0]), P('box', [.3, .04, .02], [0, 1.45, .17], [-.18, 0, 0]), P('box', [.9, .08, .5], [0, .04, .1])], core: [0, .8, .3] },
  tablet: { cat: 'office', name: '平板', en: 'Tablet', size: 'S', abbr: 'TB', role: ['目标'],
    use: '会议/展示/移动审批终端。',
    look: '横放大屏薄片,靠在三角支架上明显后仰。',
    parts: [P('box', [1.6, 1.1, .07], [0, .7, 0], [-.55, 0, 0]), P('box', [.1, .7, .1], [0, .35, -.35], [.5, 0, 0]), P('box', [1.0, .05, .3], [0, .05, .3])], core: [0, .8, .25] },
  voip: { cat: 'office', name: 'IP 电话', en: 'IP Phone', size: 'S', abbr: 'VP', role: ['目标'],
    use: '基于网络的语音终端,常见于前台和会议室。',
    look: '斜面楔形底座 + 横卧听筒(两端鼓包)。',
    parts: [P('box', [1.4, .35, 1.0], [0, .3, 0], [-.3, 0, 0]), P('cyl', [.1, .1, 1.3, 8], [0, .65, -.25], [0, 0, PI / 2]), P('box', [.3, .22, .3], [-.6, .6, -.25]), P('box', [.3, .22, .3], [.6, .6, -.25])], core: [0, .5, .3] },

  /* ===== 安全设备(黄) ===== */
  firewall: { cat: 'sec', name: '防火墙', en: 'Firewall', size: 'L', abbr: 'FW', role: ['防护'],
    use: '按策略控制网段之间的流量,是边界的第一道闸门。',
    look: '三层错缝砖墙,砖块交错排列。',
    parts: [...[0, 1, 2].flatMap(r => [...Array(r % 2 ? 4 : 3).keys()].map(i => P('box', [r % 2 ? .52 : .7, .42, .5], [r % 2 ? -.81 + i * .54 : -.72 + i * .72, .24 + r * .46, 0])))], core: [0, 1.8, 0] },
  waf: { cat: 'sec', name: 'Web 应用防火墙', en: 'WAF', size: 'M', abbr: 'WAF', role: ['防护'],
    use: '在 Web 应用前检查 HTTP 请求,拦截注入、XSS 等。',
    look: '竖立的六边形盾牌板 + 板前一个网页窗口框。',
    parts: [P('cyl', [1.0, 1.0, .14, 6], [0, 1.05, -.2], [PI / 2, 0, 0]), P('box', [.9, .65, .06], [0, 1.05, .1]), P('box', [.9, .1, .06], [0, 1.32, .12]), P('box', [.6, .06, .5], [0, .03, 0])], core: [0, 1.05, .4] },
  idsips: { cat: 'sec', name: 'IDS / IPS', en: 'IDS / IPS', size: 'M', abbr: 'IPS', role: ['防护'],
    use: '检测(IDS)或在线阻断(IPS)可疑流量与攻击特征。',
    look: '立杆上朝上的雷达碟面 + 中心接收针。',
    parts: [P('cyl', [.08, .2, .9, 6], [0, .45, 0]), P('cone', [1.0, .45, 20], [0, 1.15, 0], [PI, 0, 0]), P('cyl', [.03, .03, .6, 4], [0, 1.4, 0]), P('sph', [.09, 6, 4], [0, 1.72, 0])], core: [0, 1.1, 0] },
  bastion: { cat: 'sec', name: '堡垒机', en: 'Bastion Host', size: 'M', abbr: 'BH', role: ['防护'],
    use: '运维统一入口,集中认证、授权与操作审计。',
    look: '宽矮台基上的方形塔楼,顶部四角城垛,台基正面一扇门。',
    parts: [P('box', [1.6, .5, 1.6], [0, .25, 0]), P('box', [.8, 1.5, .8], [0, 1.25, 0]), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => P('box', [.22, .26, .22], [a * .29, 2.13, b * .29])), P('box', [.3, .38, .03], [0, .19, .81])], core: [0, 1.3, .45] },
  honeypot: { cat: 'sec', name: '蜜罐', en: 'Honeypot', size: 'S', abbr: 'HP', role: ['防护', '目标'],
    use: '故意暴露的诱饵系统,用来发现与记录攻击行为。',
    look: '矮胖圆罐 + 宽口沿圆环 + 斜插的勺柄。',
    parts: [P('sph', [.8, 14, 10], [0, .7, 0]), P('tor', [.5, .07, 2 * PI], [0, 1.38, 0], [PI / 2, 0, 0]), P('cyl', [.04, .04, 1.2, 4], [.3, 1.6, 0], [0, 0, -.5])], core: [0, .7, 0], squash: [1, .8, 1] },
  soc: { cat: 'sec', name: '态势感知 / SOC', en: 'SOC / Situational Awareness', size: 'XL', abbr: 'SOC', role: ['防护'],
    use: '集中采集日志与告警,分析研判与响应调度。',
    look: '长桌面上三块弧形排列的大屏幕墙。',
    parts: [P('box', [2.8, .08, .9], [0, .6, .3]), P('box', [.1, .6, .1], [-1.2, .3, .3]), P('box', [.1, .6, .1], [1.2, .3, .3]),
      P('box', [1.0, .75, .05], [0, 1.25, -.2]), P('box', [1.0, .75, .05], [-.95, 1.25, -.02], [0, .45, 0]), P('box', [1.0, .75, .05], [.95, 1.25, -.02], [0, -.45, 0])], core: [0, 1.25, .2] },
  vpngw: { cat: 'sec', name: 'VPN 网关', en: 'VPN Gateway', size: 'M', abbr: 'VPN', role: ['防护', '路径'],
    use: '为远程用户/分支建立加密隧道接入内网。',
    look: '低矮机身上横跨一道半圆隧道拱门。',
    parts: [P('box', [1.8, .35, .9], [0, .2, 0]), P('tor', [.75, .12, PI], [0, .38, 0]), P('tor', [.5, .04, PI], [0, .38, 0])], core: [0, .65, 0] },
  behavior: { cat: 'sec', name: '上网行为管理', en: 'Secure Web Gateway', size: 'M', abbr: 'SWG', role: ['防护'],
    use: '对员工上网流量做分类、审计与访问控制。',
    look: '倒置漏斗(上宽下窄)+ 下方细出口管。',
    parts: [P('cone', [1.0, 1.0, 16], [0, 1.25, 0], [PI, 0, 0]), P('cyl', [.12, .12, .7, 8], [0, .4, 0]), P('tor', [1.0, .04, 2 * PI], [0, 1.75, 0], [PI / 2, 0, 0])], core: [0, 1.2, 0] },
  sandbox: { cat: 'sec', name: '沙箱', en: 'Sandbox', size: 'M', abbr: 'SBX', role: ['防护'],
    use: '在隔离环境中运行可疑文件,观察其行为。',
    look: '敞口方箱框 + 箱内悬浮一颗小球(被观察样本)。',
    parts: [P('box', [1.5, .08, 1.5], [0, .04, 0]), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => P('box', [.06, 1.3, .06], [a * .72, .69, b * .72])), P('box', [1.5, .05, .05], [0, 1.32, .72]), P('box', [1.5, .05, .05], [0, 1.32, -.72]), P('sph', [.32, 10, 8], [0, .7, 0])], core: [0, .7, 0] },

  /* ===== 服务器 / 云(紫) ===== */
  websrv: { cat: 'srv', name: 'Web / 应用服务器', en: 'Web / App Server', size: 'L', abbr: 'WEB', role: ['目标'],
    use: '对外提供网站与 API 服务,是最常见的攻击目标。',
    look: '高窄机柜,正面多条水平 1U 刻线。',
    parts: [P('box', [.95, 2.1, 1.0], [0, 1.05, 0]), ...[...Array(6).keys()].map(i => P('box', [.8, .05, .03], [0, .3 + i * .3, .51]))], core: [0, 2.45, 0] },
  dbsrv: { cat: 'srv', name: '数据库', en: 'Database', size: 'L', abbr: 'DB', role: ['目标'],
    use: '存放业务与用户数据,泄露后果最直接。',
    look: '三节堆叠的扁圆柱(经典数据库符号)。',
    parts: [P('cyl', [.85, .85, .45, 20], [0, .25, 0]), P('cyl', [.85, .85, .45, 20], [0, .78, 0]), P('cyl', [.85, .85, .45, 20], [0, 1.31, 0])], core: [0, 1.95, 0] },
  storage: { cat: 'srv', name: '存储阵列', en: 'Storage Array', size: 'L', abbr: 'NAS', role: ['目标'],
    use: '集中文件/块存储与备份,勒索软件的重点目标。',
    look: '地面上 2×2 平铺的四个磁盘模块,顶部一根横向汇流条。',
    parts: [[-.5, -.55], [.5, -.55], [-.5, .55], [.5, .55]].map(([x, z]) => P('box', [.85, .7, .9], [x, .35, z])).concat([[-.5, .55], [.5, .55]].map(([x, z]) => P('box', [.5, .04, .02], [x, .45, z + .46])), [P('box', [1.9, .06, .06], [0, .78, 0])]), core: [0, 1.25, 0] },
  cloud: { cat: 'srv', name: '云平台', en: 'Cloud Platform', size: 'XL', abbr: 'CLD', role: ['目标', '路径'],
    use: '公有云/私有云资源池,承载虚拟机、存储与服务。',
    look: '三颗大小不一的球团簇成云朵 + 扁平底座。',
    parts: [P('sph', [.6, 12, 8], [-.65, .75, 0]), P('sph', [.8, 12, 8], [.1, 1.0, 0]), P('sph', [.55, 12, 8], [.85, .7, 0]), P('box', [2.4, .1, .9], [0, .1, 0])], core: [0, 1.0, .6] },
  container: { cat: 'srv', name: '容器集群', en: 'Container Cluster', size: 'L', abbr: 'K8', role: ['目标'],
    use: '容器编排平台上的大量微服务实例。',
    look: '三块六棱柱错落堆叠成蜂巢簇。',
    parts: [P('cyl', [.55, .55, .6, 6], [-.55, .3, .3]), P('cyl', [.55, .55, .6, 6], [.55, .3, .3]), P('cyl', [.55, .55, .6, 6], [0, .3, -.6]), P('cyl', [.55, .55, .6, 6], [0, .9, 0])], core: [0, 1.6, 0] },
  mailsrv: { cat: 'srv', name: '邮件服务器', en: 'Mail Server', size: 'M', abbr: 'MX', role: ['目标', '路径'],
    use: '收发企业邮件,钓鱼与商业邮件诈骗的入口。',
    look: '方形邮箱身 + 半圆拱顶 + 侧边竖立小旗。',
    parts: [P('box', [1.3, .8, .9], [0, .4, 0]), P('cyl', [.65, .65, .9, 12, true], [0, .8, 0], [PI / 2, 0, 0]), P('cyl', [.03, .03, 1.0, 4], [.8, .75, 0]), P('box', [.35, .2, .03], [.95, 1.15, 0])], core: [0, .9, .5] },

  /* ===== 终端 / IoT / 工控(品红) ===== */
  ipcam: { cat: 'iot', name: '网络摄像头', en: 'IP Camera', size: 'S', abbr: 'CAM', role: ['目标', '源'],
    use: '视频监控终端,弱口令时易被拉入僵尸网络。',
    look: '墙装支架 + 横置圆筒镜头机身 + 前端遮阳檐。',
    parts: [P('box', [.4, 1.2, .15], [0, .6, -.6]), P('box', [.1, .1, .5], [0, 1.15, -.35]), P('cyl', [.3, .3, 1.2, 12], [0, 1.15, .3], [PI / 2, 0, 0]), P('box', [.7, .04, .5], [0, 1.47, .55])], core: [0, 1.15, .95] },
  plc: { cat: 'iot', name: 'PLC 控制器', en: 'PLC', size: 'M', abbr: 'PLC', role: ['目标'],
    use: '工业现场逻辑控制器,直接驱动阀门、电机等。',
    look: '横向导轨上一排高低不同的竖插模块。',
    parts: [P('box', [2.4, .08, .3], [0, .5, -.3]), ...[.9, .7, .7, .7, .5].map((h, i) => P('box', [.38, h, .6], [-.9 + i * .45, h / 2 + .05, 0]))], core: [0, 1.3, 0] },
  sensor: { cat: 'iot', name: '传感器', en: 'Sensor', size: 'S', abbr: 'SN', role: ['目标', '源'],
    use: '采集温湿度、压力等数据的小型联网节点。',
    look: '短杆顶上一个半球圆顶 + 两侧一组短弧。',
    parts: [P('cyl', [.06, .06, .6, 6], [0, .3, 0]), P('hemi', [.45], [0, .6, 0]), P('tor', [.7, .02, PI * .5], [0, .75, 0], [0, 0, PI * .25]), P('tor', [.7, .02, PI * .5], [0, .75, 0], [0, PI, PI * .25])], core: [0, .8, 0] },
  hmi: { cat: 'iot', name: '工控操作台 HMI', en: 'HMI Console', size: 'L', abbr: 'HMI', role: ['目标'],
    use: '操作员监视与控制产线的人机界面。',
    look: '立式柜体,上部前倾的斜面屏 + 下部按钮格。',
    parts: [P('box', [1.3, 1.2, .8], [0, .6, 0]), P('box', [1.3, .8, .08], [0, 1.45, .2], [-.6, 0, 0]), ...[-.35, 0, .35].map(x => P('cyl', [.08, .08, .05, 10], [x, .9, .42], [PI / 2, 0, 0]))], core: [0, 1.5, .5] },
  pos: { cat: 'iot', name: '收银 POS', en: 'POS Terminal', size: 'S', abbr: 'POS', role: ['目标'],
    use: '门店收银与刷卡终端,涉及支付卡数据。',
    look: '低矮底座 + 背后小票纸卷圆筒 + 前倾小屏。',
    parts: [P('box', [1.2, .3, 1.0], [0, .15, 0]), P('cyl', [.25, .25, .9, 12], [0, .55, -.3], [0, 0, PI / 2]), P('box', [.8, .5, .05], [0, .6, .25], [-.5, 0, 0])], core: [0, .65, .45] },

  /* ===== 攻击者 / 外部(红) ===== */
  attacker: { cat: 'ext', name: '攻击者', en: 'Attacker', size: 'M', abbr: 'ATK', role: ['源'],
    use: '外部恶意行为者的抽象,事件中的发起方。',
    look: '兜帽式尖锥身体 + 头部圆球 + 前方一块小屏。',
    parts: [P('cone', [.75, 1.4, 10], [0, .7, 0]), P('sph', [.32, 10, 8], [0, 1.55, 0]), P('cone', [.42, .45, 10], [0, 1.82, -.05]), P('box', [.7, .45, .05], [0, .7, .7], [-.3, 0, 0])], core: [0, 1.55, .3] },
  botnet: { cat: 'ext', name: '僵尸网络', en: 'Botnet', size: 'L', abbr: 'BOT', role: ['源'],
    use: '被控制的大量设备集合,常用于 DDoS 与撞库。',
    look: '环形分布的六个小八面体 + 中心较大的控制球。',
    parts: [...[...Array(6).keys()].map(i => P('oct', [.25], [Math.cos(i * PI / 3) * 1.15, .6 + (i % 2) * .35, Math.sin(i * PI / 3) * 1.15])), P('sph', [.35, 10, 8], [0, 1.0, 0]), P('tor', [1.15, .02, 2 * PI], [0, .75, 0], [PI / 2, 0, 0])], core: [0, 1.0, 0] },
  c2: { cat: 'ext', name: 'C2 服务器', en: 'C2 Server', size: 'M', abbr: 'C2', role: ['源'],
    use: '恶意软件回连的指挥控制端,下发指令收集数据。',
    look: '四棱锥格构铁塔 + 塔顶发射球 + 两道发射弧。',
    parts: [P('cone', [.75, 2.0, 4], [0, 1.0, 0]), P('box', [.9, .04, .04], [0, .6, 0], [0, PI / 4, 0]), P('sph', [.18, 8, 6], [0, 2.15, 0]), P('tor', [.45, .025, PI * .6], [0, 2.15, 0], [0, 0, PI * .2]), P('tor', [.75, .025, PI * .6], [0, 2.15, 0], [0, 0, PI * .2])], core: [0, 2.15, 0] },
  internet: { cat: 'ext', name: '互联网', en: 'Internet', size: 'XL', abbr: 'NET', role: ['路径', '源'],
    use: '外部公共网络的抽象,内外网边界的另一侧。',
    look: '大号经纬线地球 + 斜交的轨道环。',
    parts: [P('sph', [1.1, 16, 10], [0, 1.25, 0]), P('tor', [1.45, .03, 2 * PI], [0, 1.25, 0], [PI / 2 - .4, 0, .3]), P('tor', [1.15, .025, 2 * PI], [0, 1.25, 0], [0, 0, 0])], core: [0, 1.25, 0] },
  insider: { cat: 'ext', name: '内部威胁', en: 'Insider Threat', size: 'M', abbr: 'INS', role: ['源'],
    use: '拥有合法权限但滥用权限的内部人员。',
    look: '圆柱身体 + 圆头 + 胸前工牌方片(区别于兜帽攻击者)。',
    parts: [P('cyl', [.4, .5, 1.2, 12], [0, .6, 0]), P('sph', [.33, 10, 8], [0, 1.55, 0]), P('box', [.3, .38, .04], [.15, .85, .48]), P('box', [.04, .25, .02], [.15, 1.12, .48])], core: [0, 1.55, .35] },
};
Object.keys(SPEC).forEach(k => { SPEC[k].type = k; });

/* ---------- 构造(v4:MeshStandard 明暗 + 无地面底座 + 状态描边) ---------- */
let THEME = 'dark';
try { if (root.THREE && root.THREE.ColorManagement) root.THREE.ColorManagement.enabled = false; } catch (e) {}
function setTheme(t) { THEME = t === 'light' ? 'light' : 'dark'; }
/** 保证类别色按 sRGB 往返,避免 Linear 输出把 #2f8fff 洗成灰蓝(sat≈0.53) */
function prepareRenderer(renderer) {
  const T = root.THREE;
  try {
    /* 关闭色彩管理:默认管线会把 sRGB hex 当线性再编码一次, #2f8fff → (119,197,255) sat≈0.53 */
    if (T.ColorManagement) T.ColorManagement.enabled = false;
    if (T.LinearSRGBColorSpace) renderer.outputColorSpace = T.LinearSRGBColorSpace;
    else if (renderer.outputEncoding != null && T.LinearEncoding != null) renderer.outputEncoding = T.LinearEncoding;
    if (renderer.toneMapping != null) renderer.toneMapping = T.NoToneMapping;
  } catch (e) {}
  return renderer;
}
const FRAME = {
  dark:  { normal: '#1aff60', selected: '#7dffaa', outline: '#ffffff', attacked: '#ff2040', protected: '#00e8ff', label: 'rgba(8,10,18,.88)', labelTxt: '#f2f6ff', labelLine: 'rgba(255,255,255,.7)' },
  light: { normal: '#0c9a38', selected: '#14b848', outline: '#0d1626', attacked: '#c4001c', protected: '#007f9e', label: 'rgba(255,255,255,.96)', labelTxt: '#152033', labelLine: 'rgba(30,50,80,.5)' },
};
const ZONE = {
  dark:  { violet: '#8a5cff', gray: '#7a8498', green: '#00ff66', blue: '#2f8fff', plate: '#05070c', grid: '#1c2434', text: 'rgba(235,240,255,.78)' },
  light: { violet: '#5a2fa8', gray: '#4f5a6c', green: '#0c9a38', blue: '#1360c8', plate: '#e8eef6', grid: '#8a96aa', text: 'rgba(30,42,64,.8)' },
};
const texCache = {};
const segCap = (n, d) => Math.min(n || d, d);
function geo(T, s, a) {
  switch (s) {
    case 'box': return new T.BoxGeometry(a[0], a[1], a[2]);
    case 'cyl': return new T.CylinderGeometry(a[0], a[1], a[2], segCap(a[3], 10), 1, !!a[4], 0, a[4] ? PI : 2 * PI);
    case 'sph': return new T.SphereGeometry(a[0], segCap(a[1], 10), segCap(a[2], 7));
    case 'cone': return new T.ConeGeometry(a[0], a[1], segCap(a[2], 10));
    case 'tor': return new T.TorusGeometry(a[0], Math.max(a[1], .035), 4, 20, a[2] == null ? 2 * PI : a[2]);
    case 'oct': return new T.OctahedronGeometry(a[0]);
    case 'hemi': return new T.SphereGeometry(a[0], 10, 4, 0, 2 * PI, 0, PI / 2);
  }
  throw new Error('未知形状 ' + s);
}
function toneOf(p) {
  if (p[4]) return p[4];
  const s = p[0], a = p[1]; let d;
  if (s === 'box') d = a.slice(0, 3); else if (s === 'cyl') d = [Math.max(a[0], a[1]) * 2, Math.max(a[0], a[1]) * 2, a[2]]; else if (s === 'tor') d = [a[1] * 2, a[1] * 2, a[0]]; else return 'body';
  d = d.slice().sort((x, y) => x - y);
  return d[0] < .13 && d[1] < .32 ? 'light' : 'body';
}
function canvasTex(T, key, w, h, draw) {
  if (texCache[key]) return texCache[key];
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return (texCache[key] = t);
}
function labelPlate(T, text, theme, accent) {
  const fr = FRAME[theme]; const fs = 42;
  const mw = (() => { const c = document.createElement('canvas').getContext('2d'); c.font = 'bold ' + fs + 'px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif'; return Math.ceil(c.measureText(text).width); })();
  const w = Math.max(110, mw + 36), h = 58;
  const tex = canvasTex(T, 'lp2|' + text + theme + accent, w, h, (x) => {
    // 旧图:深半透明底 + 白描边 + 白字
    x.fillStyle = theme === 'light' ? fr.label : 'rgba(6,8,14,.9)';
    x.strokeStyle = theme === 'light' ? fr.labelLine : 'rgba(255,255,255,.85)';
    x.lineWidth = 3; const r = 6;
    x.beginPath(); x.moveTo(r, 2); x.arcTo(w - 2, 2, w - 2, h - 2, r); x.arcTo(w - 2, h - 2, 2, h - 2, r); x.arcTo(2, h - 2, 2, 2, r); x.arcTo(2, 2, w - 2, 2, r); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = fr.labelTxt; x.font = 'bold ' + fs + 'px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 1);
  });
  const m = new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }); const s = new T.Sprite(m);
  const sh = .42; s.scale.set(sh * w / h, sh, 1); s.renderOrder = 20; return s;
}
/* 场景灯光:强平行光打出亮面/暗面 + 半球 + 冷色边缘光 */
function addLights(scene, theme) {
  const T = root.THREE, day = theme === 'light', g = new T.Group(); g.name = 'nodelib-lights';
  g.add(new T.HemisphereLight(day ? 0xffffff : 0xb0c0d8, day ? 0x8a96a8 : 0x080c14, day ? .55 : .22));
  const d = new T.DirectionalLight(0xffffff, day ? 2.05 : 2.35); d.position.set(6, 15, 5); g.add(d);
  const f = new T.DirectionalLight(day ? 0xa8bce0 : 0x5570b0, day ? .4 : .65); f.position.set(-11, 4, -6); g.add(f);
  const k = new T.DirectionalLight(day ? 0xffe0b0 : 0xffc070, day ? .18 : .28); k.position.set(2, 3, -11); g.add(k);
  scene.add(g); return g;
}
/** 把物体及其子树放到辉光层(默认层1)。与事件大全同款 UnrealBloom 配合:只让底框/连线/描边过阈值 */
function markBloom(obj, on) {
  obj.traverse(o => { if (on) o.layers.enable(1); else o.layers.disable(1); });
}

/**
 * createNode(type, opts) — 接口兼容 v1/v2
 * opts: theme, size, badge/label, ring/frame, mask, color
 * 场景需要: NODELIB.addLights(scene, theme); 组合示例用 setupBloom(renderer)
 */
function createNode(type, opts) {
  const T = root.THREE; if (!T) throw new Error('需要 THREE');
  const o = opts || {}; const sp = SPEC[type]; if (!sp) throw new Error('未知节点类型 ' + type);
  const theme = o.theme === 'light' || o.theme === 'dark' ? o.theme : THEME, day = theme === 'light';
  const cat = CATS[sp.cat], fr = FRAME[theme];
  const color = new T.Color(o.color || cat[theme]);
  const scale = (o.size != null ? o.size : SIZES[sp.size]) || 1;
  const group = new T.Group(); group.name = 'node:' + type;
  const body = new T.Group(); body.scale.setScalar(scale); group.add(body);
  if (sp.squash) body.scale.set(scale * sp.squash[0], scale * sp.squash[1], scale * sp.squash[2]);
  const mats = [], disp = []; const mk = m => { mats.push(m); return m; };
  const bodyC = new T.Color(day ? cat.light : cat.dark);
  const lightC = new T.Color(day ? '#f4f7fb' : '#eef2f8'), darkC = new T.Color(day ? '#1a2438' : '#0e1422');
  /* MeshStandard + 少量 emissive; ColorManagement 已关,颜色不被二次编码 */
  const emI = day ? 0.1 : 0.12;
  const matFor = {
    body: mk(new T.MeshStandardMaterial({ color: bodyC, roughness: .42, metalness: .12, flatShading: true, emissive: bodyC.clone(), emissiveIntensity: emI })),
    light: mk(new T.MeshStandardMaterial({ color: lightC, roughness: .35, metalness: .05, flatShading: true, emissive: lightC.clone(), emissiveIntensity: day ? .04 : .06 })),
    dark: mk(new T.MeshStandardMaterial({ color: darkC, roughness: .3, metalness: .18, flatShading: true })),
    glow: mk(new T.MeshStandardMaterial({ color: bodyC.clone().lerp(new T.Color('#fff'), .12), roughness: .45, metalness: .08, flatShading: true, emissive: bodyC.clone(), emissiveIntensity: emI + .05 })),
  };
  const maskMat = o.mask ? mk(new T.MeshBasicMaterial({ color: 0xffffff })) : null;
  const bodyMeshes = [];
  sp.parts.forEach(pt => {
    const g = geo(T, pt[0], pt[1]); disp.push(g);
    const tone = toneOf(pt);
    const m = new T.Mesh(g, maskMat || matFor[tone] || matFor.body);
    m.position.set(pt[2][0], pt[2][1], pt[2][2]); m.rotation.set(pt[3][0], pt[3][1], pt[3][2]); body.add(m);
    if (!o.mask && (tone === 'body' || tone === 'glow')) bodyMeshes.push(m);
  });
  const box = new T.Box3().setFromObject(body); const size = new T.Vector3(); box.getSize(size);
  const radius = Math.max(size.x, size.z) * .5;
  const out = { group, type, spec: sp, cat: sp.cat, color, theme, scale, state: 'normal', bounds: { height: box.max.y, radius } };
  if (o.mask) { out.update = () => { }; out.setState = () => { }; out.setLabel = () => { }; out.dispose = () => { disp.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); }; return out; }

  /* 状态描边:EdgesGeometry 合集,默认隐藏;选中白 / 被攻击红 / 已防护青 */
  const edgeGroup = new T.Group(); edgeGroup.visible = false; body.add(edgeGroup);
  const edgeMat = mk(new T.LineBasicMaterial({ color: new T.Color(fr.outline), transparent: true, opacity: 0.95, depthTest: true }));
  bodyMeshes.forEach(m => {
    const eg = new T.EdgesGeometry(m.geometry, 28); disp.push(eg);
    const ls = new T.LineSegments(eg, edgeMat);
    ls.position.copy(m.position); ls.rotation.copy(m.rotation); ls.scale.copy(m.scale);
    edgeGroup.add(ls);
  });
  /* 已防护:薄半透明护罩(普通混合,不加色外扩) */
  const domeR = Math.max(radius / scale + .35, (box.max.y - box.min.y) / scale * .55);
  const domeGeo = new T.SphereGeometry(domeR, 16, 10, 0, PI * 2, 0, PI * .55); disp.push(domeGeo);
  const domeMat = mk(new T.MeshStandardMaterial({ color: new T.Color(fr.protected), transparent: true, opacity: 0, roughness: .55, metalness: .05, flatShading: true, depthWrite: false, side: T.DoubleSide, emissive: new T.Color(fr.protected), emissiveIntensity: .08 }));
  const dome = new T.Mesh(domeGeo, domeMat); dome.position.y = (box.max.y + box.min.y) / (2 * scale); dome.visible = false; body.add(dome);

  let tag = null; const tagText = typeof o.label === 'string' ? o.label : (typeof o.badge === 'string' ? o.badge : sp.abbr);
  const showTag = o.badge !== false && o.label !== false;
  out.setLabel = text => { if (tag) { group.remove(tag); tag.material.dispose(); } tag = text ? labelPlate(T, text, theme, '#' + new T.Color(cat[theme]).getHexString()) : null; if (tag) { tag.position.set(0, box.max.y + .48, 0); group.add(tag); } };
  if (showTag) out.setLabel(tagText);

  const cSel = new T.Color(fr.outline), cAtk = new T.Color(fr.attacked), cDef = new T.Color(fr.protected);
  const baseBody = bodyC.clone(), baseEm = emI;
  out.setState = s => { out.state = STATES[s] ? s : 'normal'; };
  out.update = t => {
    const s = out.state, sel = s === 'selected', atk = s === 'attacked', pro = s === 'protected';
    const flash = atk ? (.55 + .45 * Math.sin(t * 12)) : 0;
    edgeGroup.visible = sel || atk || pro;
    if (sel) edgeMat.color.copy(cSel);
    else if (atk) edgeMat.color.copy(cAtk);
    else if (pro) edgeMat.color.copy(cDef);
    edgeMat.opacity = atk ? (.5 + .5 * flash) : .95;
    dome.visible = pro; domeMat.opacity = pro ? (day ? .14 : .18) : 0;
    /* 被攻击:主体短暂偏红 */
    if (atk) {
      const c = baseBody.clone().lerp(cAtk, .35 + .4 * flash);
      matFor.body.color.copy(c); matFor.body.emissive.copy(c); matFor.body.emissiveIntensity = baseEm + .15 * flash;
    } else {
      matFor.body.color.copy(baseBody); matFor.body.emissive.copy(baseBody); matFor.body.emissiveIntensity = baseEm * (sel ? 1.35 : 1);
    }
    body.position.x = atk ? Math.sin(t * 38) * .02 : 0;
  };
  out.dispose = () => { disp.forEach(g => g.dispose && g.dispose()); mats.forEach(m => m.dispose()); if (tag) tag.material.dispose(); };
  out.update(0);
  return out;
}

function createZoneLabel(text, opts) {
  const T = root.THREE, o = opts || {}, theme = o.theme === 'light' || o.theme === 'dark' ? o.theme : THEME, Z = ZONE[theme];
  const fs = 110, c0 = document.createElement('canvas').getContext('2d'); c0.font = 'bold ' + fs + 'px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif';
  const w = Math.ceil(c0.measureText(text).width) + 48, h = 148;
  const tex = canvasTex(T, 'zl2|' + text + theme, w, h, x => {
    x.fillStyle = theme === 'light' ? Z.text : 'rgba(245,248,255,.82)';
    x.font = c0.font; x.textBaseline = 'middle'; x.fillText(text, 24, h / 2);
  });
  const height = o.height || 1.05; const g = new T.PlaneGeometry(height * w / h, height);
  const m = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .95 });
  const mesh = new T.Mesh(g, m); mesh.rotation.x = -PI / 2; mesh.position.y = .04; mesh.renderOrder = 3;
  mesh.userData.width = height * w / h; mesh.userData.dispose = () => { g.dispose(); m.dispose(); };
  return mesh;
}
/**
 * createZone({ title, w, d, color:'violet'|'gray'|css, theme, titleSize, nested:false, pad })
 * 旧图风格:很暗近透明底板 + 细网格 + 紫色发光细描边; nested=true 时做子分区(略浅、略小描边)
 */
function createZone(opts) {
  const T = root.THREE, o = opts || {}, theme = o.theme === 'light' || o.theme === 'dark' ? o.theme : THEME, day = theme === 'light', Z = ZONE[theme];
  const w = o.w || 8, d = o.d || 6, nested = !!o.nested;
  const edge = new T.Color(Z[o.color] || o.color || Z.violet);
  const g = new T.Group(); g.name = 'zone:' + (o.title || ''); const disp = [];
  const pg = new T.PlaneGeometry(w, d); disp.push(pg);
  // 底板:夜间几乎透明的深色,日间浅半透明
  const pm = new T.MeshBasicMaterial({ color: new T.Color(Z.plate), transparent: true, opacity: day ? (nested ? .5 : .62) : (nested ? .18 : .22), depthWrite: false }); disp.push(pm);
  const plate = new T.Mesh(pg, pm); plate.rotation.x = -PI / 2; plate.position.y = nested ? .004 : .002; g.add(plate);
  const gp = [], step = o.grid || .4;
  for (let x = -w / 2 + step; x < w / 2 - 1e-6; x += step) gp.push(x, .008, -d / 2, x, .008, d / 2);
  for (let z = -d / 2 + step; z < d / 2 - 1e-6; z += step) gp.push(-w / 2, .008, z, w / 2, .008, z);
  const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(gp, 3)); disp.push(gg);
  const gm = new T.LineBasicMaterial({ color: new T.Color(Z.grid), transparent: true, opacity: day ? .35 : .22, depthWrite: false }); disp.push(gm);
  g.add(new T.LineSegments(gg, gm));
  // 发光描边(bloom 层)
  const bw = nested ? .035 : .045;
  const bm = new T.MeshBasicMaterial({ color: edge, transparent: true, opacity: day ? .85 : .9, depthWrite: false }); disp.push(bm);
  const border = new T.Group();
  [[0, -d / 2, w + bw, bw], [0, d / 2, w + bw, bw], [-w / 2, 0, bw, d], [w / 2, 0, bw, d]].forEach(([x, z, ww, dd]) => { const e = new T.PlaneGeometry(ww, dd); disp.push(e); const m = new T.Mesh(e, bm); m.rotation.x = -PI / 2; m.position.set(x, .02, z); border.add(m); });
  /* 极轻外描边(普通混合,不加色外扩 glow) */
  const om = new T.MeshBasicMaterial({ color: edge, transparent: true, opacity: day ? .25 : .3, depthWrite: false }); disp.push(om);
  const ow = w + (nested ? .18 : .28), od = d + (nested ? .18 : .28);
  [[0, -od / 2, ow, .02], [0, od / 2, ow, .02], [-ow / 2, 0, .02, od], [ow / 2, 0, .02, od]].forEach(([x, z, ww, dd]) => { const e = new T.PlaneGeometry(ww, dd); disp.push(e); const m = new T.Mesh(e, om); m.rotation.x = -PI / 2; m.position.set(x, .015, z); border.add(m); });
  g.add(border);
  let label = null;
  if (o.title) {
    label = createZoneLabel(o.title, { theme, height: o.titleSize || (nested ? .7 : Math.min(1.15, d * .14)) });
    label.position.set(-w / 2 + .25 + label.userData.width / 2, .045, d / 2 - label.userData.width * .08 - .35);
    // 大区标签放外侧前方
    if (!nested) label.position.set(0, .05, d / 2 + (o.titleSize || 1.1) * .7);
    g.add(label);
  }
  const pad = o.pad || (nested ? .55 : .9);
  return {
    group: g, w, d, title: o.title || '', nested,
    slot(i, n, cols) {
      cols = cols || Math.ceil(Math.sqrt(n)); const rows = Math.ceil(n / cols), r = Math.floor(i / cols), c = i % cols;
      const top = -d / 2 + pad, bot = d / 2 - pad - (nested && o.title ? .55 : 0);
      const left = -w / 2 + pad, right = w / 2 - pad;
      return { x: cols === 1 ? 0 : left + (right - left) * c / (cols - 1 || 1), z: rows === 1 ? (top + bot) / 2 : top + (bot - top) * r / (rows - 1 || 1) };
    },
    dispose() { disp.forEach(x => x.dispose()); if (label) label.userData.dispose(); },
  };
}
function createLink(a, b, opts) {
  const T = root.THREE, o = opts || {}, theme = o.theme === 'light' || o.theme === 'dark' ? o.theme : THEME, day = theme === 'light';
  const col = new T.Color(o.color || FRAME[theme].normal), y = o.y == null ? .05 : o.y;
  const A = new T.Vector3(a.x, y, a.z), B = new T.Vector3(b.x, y, b.z), dir = B.clone().sub(A), len = dir.length(); dir.normalize();
  const dash = o.dash || .3, gap = o.gap || .2, per = dash + gap, n = Math.max(1, Math.floor((len - .4) / per));
  const g = new T.Group(); const disp = [];
  const mat = new T.MeshBasicMaterial({ color: col, transparent: true, opacity: day ? .75 : .85, depthWrite: false }); disp.push(mat);
  const dg = new T.PlaneGeometry(dash, .045); disp.push(dg);
  const ang = Math.atan2(dir.x, dir.z) - PI / 2;
  const dashes = [];
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(dg, mat); m.rotation.set(-PI / 2, 0, ang); g.add(m); dashes.push(m);
  }
  if (o.arrow !== false) {
    const sh = new T.Shape(); sh.moveTo(0, .18); sh.lineTo(-.11, -.08); sh.lineTo(.11, -.08); sh.closePath();
    const ag = new T.ShapeGeometry(sh); disp.push(ag); const ar = new T.Mesh(ag, mat);
    const aq = new T.Group(); aq.add(ar); ar.rotation.set(-PI / 2, 0, 0); aq.rotation.y = Math.atan2(dir.x, dir.z) + PI; aq.position.copy(B).addScaledVector(dir, -.12); g.add(aq);
  }
  const usable = len - .35;
  const update = t => { const off = ((t || 0) * .55) % per; dashes.forEach((m, i) => { const s = Math.min(usable, i * per + off + dash / 2); m.position.copy(A).addScaledVector(dir, s); }); };
  update(0);
  return { group: g, update, dispose() { disp.forEach(x => x.dispose()); } };
}

function setupBloom(renderer, opts) {
  const T = root.THREE, o = opts || {};
  if (!T.EffectComposer || !T.UnrealBloomPass) return null;
  try {
    const size = new T.Vector2(); renderer.getSize(size);
    const pr = renderer.getPixelRatio();
    const darkMat = new T.MeshBasicMaterial({ color: 0x000000 });
    const bloomPass = new T.UnrealBloomPass(new T.Vector2(size.x * pr, size.y * pr), o.strength == null ? .7 : o.strength, o.radius == null ? .5 : o.radius, o.threshold == null ? .15 : o.threshold);
    const composer = new T.EffectComposer(renderer);
    const renderPass = new T.RenderPass(new T.Scene(), new T.PerspectiveCamera());
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    bloomPass.renderToScreen = false;
    let blit = null, blitScene = null, blitCam = null;
    return {
      bloom: bloomPass,
      setSize(w, h) {
        const p = renderer.getPixelRatio();
        composer.setSize(w, h); bloomPass.setSize(w * p, h * p);
      },
      render(scene, cam) {
        // A. 正常整景
        cam.layers.enable(0); cam.layers.enable(1);
        renderer.setRenderTarget(null); renderer.autoClear = true; renderer.render(scene, cam);
        // B. 非辉光物体涂黑,只留层1
        const saved = new Map(), lights = [];
        scene.traverse(o => {
          if (o.isLight) { lights.push([o, o.intensity]); o.intensity = 0; return; }
          if (!(o.isMesh || o.isLine || o.isLineSegments || o.isSprite || o.isPoints)) return;
          if ((o.layers.mask & 2) !== 0) return; // bit1 = layer 1
          saved.set(o, o.material);
          o.material = Array.isArray(o.material) ? o.material.map(() => darkMat) : darkMat;
        });
        const bg = scene.background; scene.background = new T.Color(0x000000);
        cam.layers.set(1);
        renderPass.scene = scene; renderPass.camera = cam;
        composer.renderToScreen = false;
        composer.render();
        if (!blit) {
          blitCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
          blitScene = new T.Scene();
          blit = new T.Mesh(new T.PlaneGeometry(2, 2), new T.MeshBasicMaterial({ map: composer.readBuffer.texture, transparent: true, blending: T.AdditiveBlending, depthTest: false, depthWrite: false }));
          blitScene.add(blit);
        }
        blit.material.map = composer.readBuffer.texture;
        renderer.autoClear = false; renderer.setRenderTarget(null); renderer.render(blitScene, blitCam); renderer.autoClear = true;
        saved.forEach((m, o) => { o.material = m; });
        lights.forEach(([o, i]) => { o.intensity = i; });
        scene.background = bg; cam.layers.enable(0); cam.layers.enable(1);
      },
      dispose() { darkMat.dispose(); composer.dispose(); if (blit) { blit.geometry.dispose(); blit.material.dispose(); } },
    };
  } catch (e) { console.error('setupBloom', e); return null; }
}

const api = { version: 4, CATS, SPEC, SIZES, STATES, STATE_COL, FRAME, ZONE, createNode, createZone, createZoneLabel, createLink, addLights, setupBloom, markBloom, prepareRenderer, setTheme, get theme() { return THEME; }, types: () => Object.keys(SPEC), byCat: c => Object.keys(SPEC).filter(k => SPEC[k].cat === c) };
root.NODELIB = api;
if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
