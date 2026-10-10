// 从 js/nodelib.js 导出规范 JSON(给 Unity 等其他引擎用)与调研清单 Markdown。用法: node tools/export_nodespec.js
global.window = global; require('../js/nodelib.js');
const L = window.NODELIB, NODELIB_FRAME = window.NODELIB.FRAME, NODELIB_ZONE = window.NODELIB.ZONE, fs = require('fs'), path = require('path'), R = path.join(__dirname, '..');
const json = {
  schema: 'security-node-spec', version: 5, generated: new Date().toISOString().slice(0, 10),
  note: '概念造型规范,不对应任何真实产品或商标。坐标单位与事件大全一致(1 = 地面网格 1 格),Y 轴向上;尺寸系数乘到整个节点。',
  sizes: { note: '已取消 S/M/L/XL;size 仅整体倍数默认 1' },
  cube: { edge: (L.CUBE || 1), note: '所有模型归一化到边长 edge 的立方体(最长边=1),底贴地、水平居中;norms[type]=CUBE/rawLongest' },
  norms: {}, /* 由 verify 脚本填充 */
  categories: Object.fromEntries(Object.entries(L.CATS).map(([k, c]) => [k, { name: c.name, en: c.en, color: { dark: c.target || c.dark, light: c.light, albedo: c.dark } }])),
  stateColors: L.STATE_COL,
  states: L.STATES,
  style: 'v5 统一立方体归一化;MeshStandard; 无地面发光底座;MeshStandard 明暗;状态=EdgesGeometry 描边;ColorManagement 关闭;标签牌;透视俯视镜头',
  camera: { projection: 'perspective', fovDeg: 32, azimuthDeg: 30, elevationDeg: 46 },
  tones: { body: '类别主色(夜间向日间色混 22%,日间混 45%)', light: '浅色细部(支架/刻线/天线):夜 #e9eef6 日 #f4f7fb', dark: '深色面(屏幕/键盘):夜 #1a2438 日 #25324a', rule: '部件未指定色调时,最小尺寸<0.13 且次小<0.32 的细杆/刻线自动用 light' },
  emissive: { body: { dark: .1, light: .05 }, selectedMultiplier: 2.2 },
  frame: { desc: 'v4 已取消地面方形底框;状态色仍用于描边(选中白/攻击红/防护青)', colors: NODELIB_FRAME },
  zone: { desc: 'createZone({title,w,d,color}):半透明底板 + 0.5 格细网格 + 实线描边 + 外侧淡描边 + 前沿大号区域名', colors: NODELIB_ZONE },
  link: { desc: 'createLink(a,b):绿色平面虚线短条(长 0.32、间隔 0.22)向终点流动 + 末端三角箭头', color: '同 frame.normal' },
  blending: { dark: 'additive', light: 'normal(alpha)' },
  types: Object.values(L.SPEC).map(s => ({ type: s.type, name: s.name, en: s.en, category: s.cat, size: s.size, scale: L.SIZES[s.size], abbr: s.abbr,
    color: { dark: L.CATS[s.cat].target || L.CATS[s.cat].dark, light: L.CATS[s.cat].light, albedo: L.CATS[s.cat].dark }, roles: s.role, use: s.use, look: s.look, core: s.core || null, squash: s.squash || null,
    parts: s.parts.map(p => ({ shape: p[0], args: p[1], pos: p[2], rotRad: p[3], tone: p[4] || null })) })),
};
fs.writeFileSync(path.join(R, 'data/nodespec.json'), JSON.stringify(json, null, 1));

const roleMap = { '源': '源', '目标': '目标', '防护': '防护', '路径': '路径' };
let md = '# 通用网络安全节点模型 · 调研清单与造型规范\n\n> 概念展示用,不对应任何真实产品或商标。数据源:`js/nodelib.js`(`NODELIB.SPEC`),由 `node tools/export_nodespec.js` 生成本文件与 `data/nodespec.json`。在线预览:`nodes.html`。\n\n';
md += '## 1. 类别与颜色\n\n| 类别 | 英文 | 夜间色 | 日间色 | 数量 |\n|---|---|---|---|---|\n';
Object.entries(L.CATS).forEach(([k, c]) => { md += `| ${c.name} | ${c.en} | \`${c.dark}\` | \`${c.light}\` | ${L.byCat(k).length} |\n`; });
md += `\n合计 **${L.types().length}** 种。必选三类:网络设备=绿、办公设备=蓝、安全设备=黄;补充三类:服务器/云=紫、终端/IoT/工控=品红、攻击者/外部=红(与事件大全"攻击"语义红一致)。\n\n`;
md += '## 2. 节点清单\n\n角色说明:**源**=事件发起方,**目标**=被攻击对象,**防护**=防守措施,**路径**=流量途经的中间设施。\n\n';
Object.entries(L.CATS).forEach(([k, c]) => {
  md += `### ${c.name}(${c.en})\n\n| 类型 | 名称 | 尺寸 | 缩写 | 用途 | 造型要点 | 常见角色 |\n|---|---|---|---|---|---|---|\n`;
  L.byCat(k).forEach(t => { const s = L.SPEC[t]; md += `| \`${t}\` | ${s.name} / ${s.en} | ${s.size} | ${s.abbr} | ${s.use} | ${s.look} | ${s.role.join('、')} |\n`; });
  md += '\n';
});
md += `## 3. 造型规范

### 3.1 镜头
透视俯视:FOV 32°,方位角 30°,俯仰角 46°(比事件大全的正交镜头更有纵深)。剪影比对仍用正交镜头。

### 3.2 尺寸等级
| 等级 | 系数 | 用于 |
|---|---|---|
| S | 0.8 | 小型终端/单点设备(AP、手机、传感器、摄像头、POS 等) |
| M | 1.0 | 常规设备(路由器、交换机、PC、WAF、VPN 等) |
| L | 1.25 | 机柜/集群/关键设施(核心交换、服务器、数据库、防火墙、僵尸网络等) |
| XL | 1.5 | 平台级抽象(云平台、SOC、互联网) |

单元基准:节点主体占地约 2×2 网格格、高 0.8–2.4 格;组合示例中再乘 0.62。

### 3.3 模型(v2 实心低多边形)
- 材质:MeshStandard,flatShading(低多边形切面),roughness 0.42、metalness 0.12(轻微光泽),自发光 夜 0.10 / 日 0.05。
- 色调三档:**主体**=类别色;**浅色细部**(支架、刻线、天线、杆)夜 \`#e9eef6\` 日 \`#f4f7fb\`;**深色面**(屏幕/键盘)夜 \`#1a2438\` 日 \`#25324a\`。
- 圆柱/球最多 10 段,保持低多边形观感。
- 灯光:半球光 + 主方向光 + 冷色补光(\`NODELIB.addLights\`)。

### 3.4 标签牌(无地面底座)
- **不再使用地面发光方形底框**;节点上方标签牌保留。
- 标签牌:悬在节点顶部 +0.55 的小牌,深底浅字(日间白底深字),底边一条类别色;默认显示缩写,可传自定义文字。

### 3.5 分区底板 / 区域标签 / 连线
- \`createZone({title,w,d,color})\`:半透明底板 + 0.5 格细网格 + 紫色或灰色实线描边 + 外侧淡描边;前沿平铺大号中文区域名(\`createZoneLabel\`)。\`zone.slot(i,n,cols)\` 给出节点槽位。
- \`createLink(a,b)\`:绿色平面虚线(流动)+ 末端三角箭头。

### 3.6 状态(模型描边)
| 状态 | 表现 |
|---|---|
| 普通 normal | MeshStandard 常亮 |
| 选中 selected | 白色 EdgesGeometry 细描边 |
| 被攻击 attacked | 主体闪红 + 红色细描边 + 轻微抖动 |
| 已防护 protected | 青色细描边 + 薄半透明护罩 |

### 3.7 色值
| 用途 | 夜间 | 日间 |
|---|---|---|
| 场景背景 | \`${L.STATE_COL.dark.bg}\` | \`${L.STATE_COL.light.bg}\` |
| 地面网格 | \`${L.STATE_COL.dark.grid}\` | \`${L.STATE_COL.light.grid}\` |
| 描边色·普通 | \`${L.FRAME.dark.normal}\` | \`${L.FRAME.light.normal}\` |
| 描边色·选中 | \`${L.FRAME.dark.selected}\` + 描边 \`${L.FRAME.dark.outline}\` | \`${L.FRAME.light.selected}\` + 描边 \`${L.FRAME.light.outline}\` |
| 描边色·被攻击 | \`${L.FRAME.dark.attacked}\` | \`${L.FRAME.light.attacked}\` |
| 描边色·已防护 | \`${L.FRAME.dark.protected}\` | \`${L.FRAME.light.protected}\` |
| 分区描边·紫 | \`${L.ZONE.dark.violet}\` | \`${L.ZONE.light.violet}\` |
| 分区描边·灰 | \`${L.ZONE.dark.gray}\` | \`${L.ZONE.light.gray}\` |
${Object.values(L.CATS).map(c => `| ${c.name} | \`${c.dark}\` | \`${c.light}\` |`).join('\n')}

日间:背景浅色,描边/分区边线用更深一档色值;无地面底座、无加色外扩 glow。

## 4. 复用接口

\`\`\`js
NODELIB.setTheme('dark');                       // 或 'light'
NODELIB.addLights(scene);
const n = NODELIB.createNode('firewall', { size: 1.25, badge: true });
scene.add(n.group);
n.setState('attacked');                         // normal | selected | attacked | protected
function frame(t){ n.update(t); }               // 每帧调用,t 为秒
const z = NODELIB.createZone({ title: '安全管理区', w: 10, d: 7, color: 'violet' }); scene.add(z.group);
const link = NODELIB.createLink(n1.group.position, n2.group.position); scene.add(link.group); // 每帧 link.update(t)
n.dispose();
\`\`\`
返回对象还有 \`bounds:{height,radius}\`、\`color\`、\`cat\`。现有事件场景暂未替换为这些节点。

## 5. Unity 端
\`data/nodespec.json\` 含类别色、尺寸、状态色、每种节点的部件列表(shape/args/pos/rotRad,单位与 three.js 一致,Y 向上,右手坐标;导入 Unity 时 Z 取反)。Unity 工程本次未改动。
`;
fs.writeFileSync(path.join(R, 'docs/nodes-research.md'), md);
console.log('types', json.types.length, 'md', md.length);
