# 网络安全事件大全 · Cybersecurity Event Encyclopedia

离线 3D 网页(Three.js 本地打包,无外网依赖),共 **252 个事件 / 15 个分类**(215 个攻击/风险事件 + 37 个防守事件),另附 **知识图谱** 页 `graph.html`。左右两个虚拟节点(源/目标),事件动效在两节点之间发生。
**仅用于防御教育与表现**:所有内容只讲概念与防御要点,不含真实攻击载荷、exploit 或可执行命令,画面中的文字均为"示意"。

## 使用
- 直接双击 `index.html`(file:// 即可),或 `python3 tools/serve.py 8765`(带 `Cache-Control: no-cache` 的静态服务)后访问 `http://localhost:8765/`。
- 需要系统安装中文字体(Windows/macOS 自带即可)。
- 左侧:搜索 / 严重程度筛选 / 分类折叠;中间:播放、暂停、重播、上一个/下一个、进度条(带阶段刻度)、速度;
  顶部:辉光滑块(默认 20%)、"连续播放当前分类"、"全部演示"、"视角"复位。
- 画面:固定等距 2.5D 角度,不可旋转;鼠标拖动平移,滚轮/双指缩放。
- 颜色:红=攻击/恶意,青=防守,绿=正常流量,黄=风险/数据。
- 顶部「☾ 夜间 / ☀ 日间」切换整站样式(含 3D 场景与知识图谱)。默认夜间;第一次打开跟随系统浅色/深色偏好,手动选过之后记在本地。
- 支持 URL 锚点定位并自动播放,如 `index.html#sqli`;顶部「✦ 知识图谱」进入关系图。

## 目录
- `index.html` `css/app.css`  页面
- `js/core.js`   调色板、辉光点池、图标库、节点(三层线框+发光核心+脚下双环)
- `js/prims.js`  动效原语:link/packet/stream/burst/ring/nodefx/relay/hosts/glyph/orbit/sweep/shield/gate/records/buffer/bar/panel/meter/queue/privesc/timer/loopArc 等
- `js/stage.js`  正交相机、地面网格、辉光后处理、时间轴驱动
- `js/app.js`    列表、筛选、播放控制、详情面板
- `graph.html` `css/graph.css` `js/graph.js` `data/graph.js`  知识图谱(见下)
- `data/cats.js` 分类(web/api/net/host/iam/data/cloud/supply/mal/social/phys/ext/ai/fin/def);`data/events-*.js` 第一批 85 个事件(完整字段);`data/schemes.js` + `data/schemes2.js` + `data/events-new-*.js` 第二、三批 167 个事件(紧凑写法,见下;文件名带 `2` 的是第三批:ai2/phys2/fin2/web2/net2/host2/cloud2/def2);`data/events.json` 由上述 JS 导出的只读副本(252 个)(`node tools/export_json.js` 重新生成,页面实际读取的是 JS)
- `lib/three.bundle.js` Three.js r160 + 后处理(本地打包);`build/` 为打包源(`entry.js`,需 `npm i three esbuild` 才能重新打包)
- `tools/` Playwright 验证脚本;`shots/` 截图、拼图与验证日志

## 新增事件
方式一(完整写法):在 `data/events-<分类>.js` 追加一个对象:
`id, cat, name, en, sev(critical|high|medium|low|none=防御类), stage, src/dst{n,k,c,d}, principle, impact, defense[], refs[], kw, dur, ph[[秒,'字幕','ok|atk|def|warn'],...], fx[[原语, 起, 止, 参数],...]`。
`fx` 中的原语参照 `js/prims.js`;锚点 src/dst/srcT/dstT/mid/out 等见该文件。新分类在 `data/cats.js` 注册。

方式二(紧凑写法,第二批事件使用):在 `data/events-new-<分类>.js` 中用 `EV({...})`(即 `SEC_X`)。只写 `id, cat, name, en, sev, stage, s:[名称,图标,颜色,说明](源), t:[…](目标), sc(动画方案), cap[6 条字幕], p(原理), i(影响), d[防御要点], r[参考], kw`,
由 `data/schemes.js` 中的方案(inject/guess/flood/reflect/detour/tunnel/climb/persist/ticket/steal/encrypt/lure/supply/takeover/race/replay/chain/breach/blend/spread/remote/pivot,防守侧 dfilter/dsiem/dsandbox/dseg/dloop/dvault/dredblue/dtrain/dblock/ddecoy),`data/schemes2.js` 追加 relay(凭据中继)/dgate(准入闸门)/dmask(脱敏加密)/dscore(行为评分)
展开成标准的 6 段时间线(`ph` 时刻 0/2/5/8/10.5/13 秒,总长 15 秒)和 `fx` 列表。新增文件后运行 `python3 tools/setnew.py`,会把脚本标签同步写入 `index.html` 与 `graph.html`。
新增后依次运行:`node tools/lint.js`(字段/重名/参考/payload 黑名单检查)→ `node tools/export_json.js` → 验证脚本。

## 知识图谱(graph.html)
- Canvas 2D 自带力导向引擎(无外部依赖,离线可用),672 个节点/3271 条边,默认只显示 296 个节点(事件、分类、阶段、资产),措施与参考标准节点按需开启或双击展开。
- 节点类型:攻击事件(红,大小=严重程度)、防守事件(青)、分类、攻击链阶段(14 个 ATT&CK 战术 + 预防/检测/响应/恢复)、资产/目标(11 类)、通用防御措施(18 类,由各事件的防御要点按关键词归类)、参考标准(OWASP / MITRE ATT&CK / CWE / 其他,来自事件 refs 原文,不额外添加)。
- 攻防对应:防守事件与对应的攻击事件互相连边(如 XSS / DOM 型 XSS / CSP 绕过 ↔ 内容安全策略,暴力破解 / 撞库 / 验证码绕过 ↔ 速率限制与风控,K8s 配置错误 / K8s API 未授权 ↔ 网络准入控制 / CSPM 等)。
- **覆盖缺口视图**:左栏「覆盖情况」→「仅显示覆盖缺口」(或 `graph.html#gap`)只显示"尚无直接对应防守事件"的攻击事件(虚线琥珀环标出)及其仅有的弱关联防守事件;事件详情的「覆盖状态」说明有几个直接对应、几个弱关联。"直接对应" = 手工映射,或自动标签重合度 ≥2;其余为弱关联。缺口名单由数据自动算出(`GRAPH.G.stat.gap`),可作为后续补充防守事件的待办。
- 边类型:属于、位于阶段、目标资产、被缓解(防守事件→攻击事件)、常串联(攻击链先后,带箭头)、同类相似(虚线)、通用措施、参考标准。
- 关系数据:`data/graph.js`。基础关系由事件数据自动生成(分类/阶段关键词/资产/措施关键词/参考解析/相似度);手工部分是 `TAG_LISTS`(事件标签)、`COVERS`(防守事件覆盖的标签,自动取重合度最高的前 2 个)、`MIT_MANUAL`(手工缓解)、`CHAINS`(手工串联序列)、`SIMILAR_MANUAL`。
  加载时自动校验:每个攻击事件至少 1 个阶段、至少 1 个防守事件;结果见 `GRAPH.G.stat`。
- 交互:搜索(回车定位)、按类型/关系/分类/严重程度过滤、单击高亮邻居并在右栏显示详情、双击展开/收起、拖动节点、拖动空白平移、滚轮/双指缩放、「布局」切换力导向/攻击链分层、重置、适应、辉光滑块(默认 20%)、图例。
  事件/防守节点详情里的「▶ 在事件大全中演示」会跳转到 `index.html#事件id` 并自动播放。`graph.html#事件id` 可直接定位。
- 测试钩子:`window.GRAPH`(`counts() select() search() setType() setCat() screenPos() …`)。

## 验证脚本(tools/,需要 Playwright + Chrome)
- `verify.py` 逐个事件按 11 个时间点渲染并统计像素/渲染错误,并计算相邻事件的画面差异(RMS),结果写入 `shots/verify.log`
- `graphtest.py` 图谱页 67 项检查(统计、阶段/防守覆盖、新增事件节点与攻防边、覆盖缺口视图、点击、搜索、过滤、双击、布局、缩放平移、跳转播放、file://、窄屏)
- `uitest.py` 事件大全界面测试;`shots.py` 代表性截图 + 拼图;`sheet.py` 按时间的拼图;`lint.js` `export_json.js` `setnew.py` 见上
- 自己运行时先在项目目录执行 `python3 -m http.server 8765`。

## 渲染健壮性(黑屏防护)
- 播放循环任何一帧出错都不会停止(曾因一次异常导致循环终止、画面黑、时间停在 0.0)。
- 后处理(辉光)渲染抛异常或探测到画面全黑 → 自动切换为兼容渲染(无辉光)并在画面左上显示提示;也可用 `index.html?safe=1` 强制兼容渲染。
- WebGL 不可用 / 上下文丢失 / 兼容渲染仍全黑 → 中间显示明确的提示文字,而不是黑屏;上下文恢复后自动重绘。
- 画布尺寸与容器不一致时自动重新适配(ResizeObserver + 每若干帧检查);选择事件会同步绘制第一帧;无深链进入默认选中并播放第一个事件。
- 滑块/下拉框设置 `autocomplete="off"`,辉光启动时固定为 20%,避免浏览器表单状态恢复造成显示不一致。
- `tools/stamp.py` 给 html 里的 js/css 加内容哈希 `?v=`,避免旧缓存;修改文件后重新运行。`tools/blackcheck.py`、`blackcheck2.py` 是黑屏回归测试(多视口/DPR/操作顺序/故障注入/252 事件首帧)。

## 滚动条
`css/app.css` 末尾统一定义(两页共用):`color-scheme: dark`、8px 细滚动条、深色轨道、半透明青色圆角滑块(hover 变亮带轻微发光)、透明 corner;Firefox 用 `scrollbar-width/scrollbar-color` 兜底(仅在不支持 `::-webkit-scrollbar` 的浏览器启用,因为 Chrome 121+ 一旦设置 scrollbar-color 就会忽略 webkit 样式)。验证:`tools/scrolltest.py`、`tools/scrollthumb.py`(headless 需去掉 `--hide-scrollbars`)。

## 说明与限制
- 所有动画和字幕均为示意,不含真实攻击载荷;参考标准仅列有把握的 OWASP / ATT&CK / CWE / RFC / NIST 等条目。
- 图谱里的"缓解""串联"关系是教学性的归纳,不是严格的因果模型;"同类相似"部分由关键词/参考重合度自动给出。
- 需要系统中文字体;未在真实 GPU 或其他浏览器上做过压力测试。
