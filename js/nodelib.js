/* nodelib.js — 通用网络安全节点模型库(概念造型,程序化生成,不依赖外部模型/商标)
   用法: const n = NODELIB.createNode('firewall', { theme:'dark', size:1, label:true });
         scene.add(n.group); n.setState('attacked'); 每帧 n.update(t);  n.dispose()
   规范数据: NODELIB.SPEC / NODELIB.CATS / NODELIB.SIZES / NODELIB.STATES
   依赖: window.THREE(仅在 createNode 时需要;SPEC 可在无 THREE 的环境读取,用于导出 JSON) */
(function (root) {
'use strict';

/* ---------- 类别与色板 ---------- */
const CATS = {
  net:    { name: '网络设备',          en: 'Network',            dark: '#4dff88', light: '#137a3a', glyph: '◇' },
  office: { name: '办公设备',          en: 'Office / Endpoint',  dark: '#4d9dff', light: '#1d55b8', glyph: '▢' },
  sec:    { name: '安全设备',          en: 'Security',           dark: '#ffd23d', light: '#8a6400', glyph: '⛉' },
  srv:    { name: '服务器 / 云',       en: 'Server / Cloud',     dark: '#b08cff', light: '#5a2fa8', glyph: '☰' },
  iot:    { name: '终端 / IoT / 工控',  en: 'IoT / ICS',          dark: '#ff7ad9', light: '#a1238c', glyph: '◎' },
  ext:    { name: '攻击者 / 外部',      en: 'Threat / External',  dark: '#ff4d5e', light: '#b01030', glyph: '✕' },
};
/* 状态色(与事件大全语义色一致) */
const STATE_COL = {
  dark:  { sel: '#ffffff', atk: '#ff3048', def: '#2ee6d6', bg: '#0b1020', grid: '#1e3550' },
  light: { sel: '#0d1626', atk: '#c00020', def: '#0b6e6a', bg: '#d5dee9', grid: '#7a8799' },
};
const SIZES = { S: 0.8, M: 1.0, L: 1.25, XL: 1.5 };
const STATES = {
  normal:    { name: '普通',   desc: '常亮线框 + 慢速呼吸核心 + 单层底环' },
  selected:  { name: '选中',   desc: '线框提亮、四角取景框、底环外加旋转虚线环' },
  attacked:  { name: '被攻击', desc: '线框与核心闪红、轻微抖动、红色告警脉冲环' },
  protected: { name: '已防护', desc: '青色半球护罩线框 + 底环转青、核心稳定' },
};

/* ---------- 造型 DSL ----------
   每个部件: [形状, 参数, 位置[x,y,z], 旋转[rx,ry,rz]?]
   形状: box[w,h,d] cyl[rt,rb,h,seg] sph[r,ws,hs] cone[r,h,seg] tor[R,r,arc] oct[r] hemi[r] */
const P = (s, a, p, r) => [s, a, p || [0, 0, 0], r || [0, 0, 0]];
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
    parts: [P('cyl', [.07, .07, 1.0, 6], [0, .5, 0]), P('cyl', [.85, .95, .22, 24], [0, 1.1, 0]), P('tor', [.55, .03, PI], [0, 1.35, 0], [0, 0, 0]), P('tor', [.9, .03, PI], [0, 1.35, 0], [0, 0, 0])], core: [0, 1.3, 0] },
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
    parts: [P('box', [1.7, .1, 1.15], [0, .1, .1]), P('box', [1.7, 1.05, .06], [0, .62, -.6], [-.3, 0, 0]), P('box', [1.3, .02, .6], [0, .16, .2])], core: [0, .7, -.3] },
  printer: { cat: 'office', name: '打印机', en: 'Printer', size: 'M', abbr: 'PR', role: ['目标'],
    use: '共享打印/扫描设备,常被忽视的联网资产。',
    look: '矮胖方机身 + 前伸出纸托盘 + 顶部斜插纸张。',
    parts: [P('box', [1.6, .7, 1.2], [0, .4, 0]), P('box', [1.2, .05, .7], [0, .2, .9]), P('box', [1.1, .9, .03], [0, 1.1, -.35], [-.35, 0, 0])], core: [0, .95, .3] },
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

/* ---------- 构造 ---------- */
let THEME = 'dark';
function setTheme(t) { THEME = t === 'light' ? 'light' : 'dark'; }
const glyphCache = {};

function geo(T, s, a) {
  switch (s) {
    case 'box': return new T.BoxGeometry(a[0], a[1], a[2]);
    case 'cyl': return new T.CylinderGeometry(a[0], a[1], a[2], a[3] || 12, 1, !!a[4], 0, a[4] ? PI : 2 * PI);
    case 'sph': return new T.SphereGeometry(a[0], a[1] || 12, a[2] || 8);
    case 'cone': return new T.ConeGeometry(a[0], a[1], a[2] || 12);
    case 'tor': return new T.TorusGeometry(a[0], a[1], 4, 32, a[2] == null ? 2 * PI : a[2]);
    case 'oct': return new T.OctahedronGeometry(a[0]);
    case 'hemi': return new T.SphereGeometry(a[0], 14, 6, 0, 2 * PI, 0, PI / 2);
  }
  throw new Error('未知形状 ' + s);
}

function badge(T, text, color, theme) {
  const key = text + color + theme; if (glyphCache[key]) return glyphCache[key];
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
  const day = theme === 'light';
  x.fillStyle = day ? 'rgba(255,255,255,.88)' : 'rgba(8,12,26,.75)'; x.strokeStyle = color; x.lineWidth = 4;
  const r = 12; x.beginPath(); x.moveTo(r + 4, 4); x.arcTo(124, 4, 124, 60, r); x.arcTo(124, 60, 4, 60, r); x.arcTo(4, 60, 4, 4, r); x.arcTo(4, 4, 124, 4, r); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = color; x.font = 'bold 30px "Segoe UI",Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 64, 34);
  const tex = new T.CanvasTexture(c); tex.colorSpace = T.SRGBColorSpace || tex.colorSpace; tex.anisotropy = 4;
  return (glyphCache[key] = tex);
}

/**
 * createNode(type, opts) -> { group, type, spec, color, setState(s), update(t), setHover(b), dispose(), bounds }
 * opts: theme 'dark'|'light'(默认用 NODELIB.setTheme 设置的), size 覆盖尺寸系数, badge 是否显示缩写徽标,
 *       ring 是否画底环, mask true 时全部纯白不透明(用于轮廓比对), color 覆盖类别色
 */
function createNode(type, opts) {
  const T = root.THREE; if (!T) throw new Error('需要 THREE');
  const o = opts || {}; const sp = SPEC[type]; if (!sp) throw new Error('未知节点类型 ' + type);
  const theme = o.theme === 'light' || o.theme === 'dark' ? o.theme : THEME, day = theme === 'light';
  const cat = CATS[sp.cat], st = STATE_COL[theme];
  const color = new T.Color(o.color || cat[theme]);
  const scale = (o.size != null ? o.size : SIZES[sp.size]) || 1;
  const blend = o.mask ? T.NormalBlending : (day ? T.NormalBlending : T.AdditiveBlending);
  const group = new T.Group(); group.name = 'node:' + type;
  const body = new T.Group(); body.scale.setScalar(scale); group.add(body);
  if (sp.squash) body.scale.set(scale * sp.squash[0], scale * sp.squash[1], scale * sp.squash[2]);
  const mats = [], disp = [];
  const mk = (m) => { mats.push(m); return m; };
  const edgeMat = mk(new T.LineBasicMaterial({ color: color.clone(), transparent: true, opacity: o.mask ? 1 : (day ? 1 : .95), blending: blend, depthWrite: false }));
  const innerMat = mk(new T.LineBasicMaterial({ color: color.clone(), transparent: true, opacity: day ? .32 : .28, blending: blend, depthWrite: false }));
  const faceMat = mk(new T.MeshBasicMaterial({ color: o.mask ? 0xffffff : color.clone(), transparent: !o.mask, opacity: o.mask ? 1 : (day ? .2 : .1), blending: blend, depthWrite: !!o.mask, side: T.DoubleSide }));
  // L1 外轮廓线框 + 面填充;L2 内缩 0.9 的淡线框(体积感)
  sp.parts.forEach(pt => {
    const g = geo(T, pt[0], pt[1]); disp.push(g);
    const pos = pt[2], rot = pt[3];
    const m = new T.Mesh(g, faceMat); m.position.set(pos[0], pos[1], pos[2]); m.rotation.set(rot[0], rot[1], rot[2]); body.add(m);
    if (!o.mask) {
      const eg = new T.EdgesGeometry(g, 25); disp.push(eg);
      const l = new T.LineSegments(eg, edgeMat); l.position.copy(m.position); l.rotation.copy(m.rotation); body.add(l);
      const l2 = new T.LineSegments(eg, innerMat); l2.position.copy(m.position); l2.rotation.copy(m.rotation); l2.scale.setScalar(.9); body.add(l2);
    }
  });
  const box = new T.Box3().setFromObject(body); const size = new T.Vector3(); box.getSize(size);
  const radius = Math.max(size.x, size.z) * .5;
  const out = { group, type, spec: sp, cat: sp.cat, color, theme, scale, state: 'normal', bounds: { height: box.max.y, radius } };
  if (o.mask) { out.update = () => { }; out.setState = () => { }; out.dispose = () => { disp.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); }; return out; }

  // 发光核心
  const coreMat = mk(new T.MeshBasicMaterial({ color: color.clone(), transparent: true, opacity: day ? .9 : 1, blending: blend, depthWrite: false }));
  const core = new T.Mesh(new T.OctahedronGeometry(.16), coreMat); disp.push(core.geometry);
  const cp = sp.core || [0, box.max.y / scale + .3, 0]; core.position.set(cp[0], cp[1], cp[2]); body.add(core);
  const haloMat = mk(new T.MeshBasicMaterial({ color: color.clone(), transparent: true, opacity: day ? .18 : .22, blending: blend, depthWrite: false }));
  const halo = new T.Mesh(new T.SphereGeometry(.32, 12, 8), haloMat); disp.push(halo.geometry); halo.position.copy(core.position); body.add(halo);

  // 底座光环: 实线内环 + 3/4 外弧 + 淡色底盘
  const R = Math.max(1.0, radius + .35);
  const ringMat = mk(new T.MeshBasicMaterial({ color: color.clone(), transparent: true, opacity: day ? .85 : .6, blending: blend, depthWrite: false, side: T.DoubleSide }));
  const diskMat = mk(new T.MeshBasicMaterial({ color: color.clone(), transparent: true, opacity: day ? .1 : .06, blending: blend, depthWrite: false, side: T.DoubleSide }));
  const ringG = new T.Group(); group.add(ringG);
  const r1 = new T.Mesh(new T.RingGeometry(R, R + .06, 64), ringMat); const r2 = new T.Mesh(new T.RingGeometry(R + .28, R + .31, 64, 1, 0, PI * 1.5), ringMat);
  const dk = new T.Mesh(new T.CircleGeometry(R, 48), diskMat);
  [r1, r2, dk].forEach(m => { m.rotation.x = -PI / 2; m.position.y = .01; ringG.add(m); disp.push(m.geometry); });
  if (o.ring === false) ringG.visible = false;

  // 状态装饰
  const selMat = mk(new T.MeshBasicMaterial({ color: new T.Color(st.sel), transparent: true, opacity: 0, blending: blend, depthWrite: false, side: T.DoubleSide }));
  const selRing = new T.Mesh(new T.RingGeometry(R + .5, R + .56, 64, 1, 0, PI * .4), selMat); selRing.rotation.x = -PI / 2; selRing.position.y = .02; group.add(selRing); disp.push(selRing.geometry);
  const selRing2 = selRing.clone(); selRing2.rotation.z = PI; group.add(selRing2);
  const brMat = mk(new T.LineBasicMaterial({ color: new T.Color(st.sel), transparent: true, opacity: 0, blending: blend, depthWrite: false }));
  const H = box.max.y + .25, W = R + .1, k = .35, bp = [];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { [0, H].forEach(y => { const dy = y ? -k : k; bp.push(sx * W, y, sz * W, sx * W, y + dy, sz * W, sx * W, y, sz * W, sx * (W - k), y, sz * W, sx * W, y, sz * W, sx * W, y, sz * (W - k)); }); });
  const bg = new T.BufferGeometry(); bg.setAttribute('position', new T.Float32BufferAttribute(bp, 3)); disp.push(bg);
  const brackets = new T.LineSegments(bg, brMat); group.add(brackets);
  const atkMat = mk(new T.MeshBasicMaterial({ color: new T.Color(st.atk), transparent: true, opacity: 0, blending: blend, depthWrite: false, side: T.DoubleSide }));
  const atkRing = new T.Mesh(new T.RingGeometry(R + .05, R + .2, 64), atkMat); atkRing.rotation.x = -PI / 2; atkRing.position.y = .03; group.add(atkRing); disp.push(atkRing.geometry);
  const domeMat = mk(new T.LineBasicMaterial({ color: new T.Color(st.def), transparent: true, opacity: 0, blending: blend, depthWrite: false }));
  const domeG = new T.SphereGeometry(Math.max(R + .2, H * .78), 18, 8, 0, 2 * PI, 0, PI / 2); disp.push(domeG);
  const domeE = new T.WireframeGeometry(domeG); disp.push(domeE);
  const dome = new T.LineSegments(domeE, domeMat); dome.scale.y = Math.max(1, (H + .2) / Math.max(R + .2, H * .78)); group.add(dome);
  const domeFillMat = mk(new T.MeshBasicMaterial({ color: new T.Color(st.def), transparent: true, opacity: 0, blending: blend, depthWrite: false, side: T.DoubleSide }));
  const domeFill = new T.Mesh(domeG, domeFillMat); domeFill.scale.copy(dome.scale); group.add(domeFill);

  // 缩写徽标
  let tag = null;
  if (o.badge !== false) {
    const tm = mk(new T.SpriteMaterial({ map: badge(T, sp.abbr, '#' + color.getHexString(), theme), transparent: true, depthWrite: false, depthTest: false }));
    tag = new T.Sprite(tm); tag.scale.set(.9, .45, 1); tag.position.set(0, box.max.y + .6, 0); tag.renderOrder = 10; group.add(tag);
  }

  const base = color.clone(), white = new T.Color(st.sel), red = new T.Color(st.atk), cyan = new T.Color(st.def), tmp = new T.Color();
  out.setState = s => { out.state = STATES[s] ? s : 'normal'; };
  out.update = t => {
    const s = out.state, sel = s === 'selected', atk = s === 'attacked', pro = s === 'protected';
    const fl = atk ? (.5 + .5 * Math.sin(t * 14)) : 0;
    tmp.copy(base); if (sel) tmp.lerp(white, day ? .25 : .35); if (atk) tmp.lerp(red, .35 + .5 * fl);
    edgeMat.color.copy(tmp); innerMat.color.copy(tmp); faceMat.color.copy(tmp); coreMat.color.copy(atk ? red : (pro ? cyan : tmp));
    edgeMat.opacity = sel ? 1 : (day ? .92 : .85); faceMat.opacity = (day ? .2 : .1) * (sel ? 1.6 : 1);
    const br = .5 + .5 * Math.sin(t * 2.2);
    haloMat.opacity = (day ? .14 : .18) + (day ? .08 : .14) * br + (sel ? .1 : 0) + fl * .2; haloMat.color.copy(coreMat.color);
    core.rotation.y = t * 1.2; core.scale.setScalar(1 + .12 * br + (atk ? .25 * fl : 0));
    ringMat.color.copy(pro ? cyan : (atk ? tmp : base)); r2.rotation.z = t * .4;
    selMat.opacity = sel ? (day ? .95 : .9) : 0; selRing.rotation.z = t * 1.1; selRing2.rotation.z = t * 1.1 + PI; brMat.opacity = sel ? 1 : 0;
    atkMat.opacity = atk ? (.25 + .6 * fl) : 0; atkRing.scale.setScalar(atk ? 1 + .15 * ((t * 1.6) % 1) : 1);
    body.position.x = atk ? Math.sin(t * 41) * .03 : 0;
    domeMat.opacity = pro ? (day ? .55 : .45) : 0; domeFillMat.opacity = pro ? (day ? .07 : .05) : 0; dome.rotation.y = t * .25;
  };
  out.dispose = () => { disp.forEach(g => g.dispose && g.dispose()); mats.forEach(m => m.dispose()); };
  out.update(0);
  return out;
}

const api = { CATS, SPEC, SIZES, STATES, STATE_COL, createNode, setTheme, get theme() { return THEME; }, types: () => Object.keys(SPEC), byCat: c => Object.keys(SPEC).filter(k => SPEC[k].cat === c) };
root.NODELIB = api;
if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
