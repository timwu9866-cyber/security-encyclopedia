/* nodes.js — 节点模型库页面:分类、画廊缩略图、放大预览、四态对比、主题联动 */
(function () {
'use strict';
const T = window.THREE, L = window.NODELIB, $ = id => document.getElementById(id);
try { if (T.ColorManagement) T.ColorManagement.enabled = false; } catch (e) {}
const AZ = 24 * Math.PI / 180, EL = 32 * Math.PI / 180; // 与事件大全相同的固定等距镜头
const ST = { cat: 'all', sel: null, state: 'normal', quad: false, theme: 'dark' };
const curTheme = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

function makeCam(asp, h, cy) { // 正交(仅用于剪影比对)
  const cam = new T.OrthographicCamera(-h * asp / 2, h * asp / 2, h / 2, -h / 2, -100, 200);
  const d = 40; cam.position.set(Math.sin(AZ) * Math.cos(EL) * d, cy + Math.sin(EL) * d, Math.cos(AZ) * Math.cos(EL) * d);
  cam.lookAt(0, cy, 0); cam.updateProjectionMatrix(); return cam;
}
/* 透视俯视镜头(旧风格:更有纵深) */
const PAZ = 38 * Math.PI / 180, PEL = 42 * Math.PI / 180, FOV = 28;
function persp(asp, dist, tx, ty, tz) {
  const cam = new T.PerspectiveCamera(FOV, asp, .1, 400);
  cam.position.set(tx + Math.sin(PAZ) * Math.cos(PEL) * dist, ty + Math.sin(PEL) * dist, tz + Math.cos(PAZ) * Math.cos(PEL) * dist);
  cam.lookAt(tx, ty, tz); cam.updateProjectionMatrix(); return cam;
}
function gridFor(theme, n = 8) {
  const c = L.STATE_COL[theme].grid, g = new T.GridHelper(n * 2, n * 2, c, c);
  g.material.transparent = true; g.material.opacity = theme === 'light' ? .4 : .3; g.material.depthWrite = false; return g;
}
function frameFor(node, asp) {
  const r = node.bounds.radius + 1.3, h = node.bounds.height + 1.0;
  const need = Math.max(h * 1.25, (r * 2.2) / Math.min(asp, 1.6), 3.4);
  const dist = need / (2 * Math.tan(FOV * Math.PI / 360)) * 1.05;
  return persp(asp, dist, 0, h * .38, 0);
}
function newScene(theme, n) { const sc = new T.Scene(); sc.background = new T.Color(L.STATE_COL[theme].bg); sc.add(gridFor(theme, n)); L.addLights(sc, theme); return sc; }
function thumbLights(theme) {
  const day = theme === 'light', g = new T.Group();
  g.add(new T.HemisphereLight(day ? 0xffffff : 0xb0c0d8, day ? 0x8896a8 : 0x080c14, day ? .5 : .2));
  const d = new T.DirectionalLight(0xffffff, day ? 1.8 : 2.0); d.position.set(5, 14, 4); g.add(d);
  const f = new T.DirectionalLight(day ? 0x90a8d0 : 0x5070b8, day ? .35 : .55); f.position.set(-10, 3, -5); g.add(f);
  return g;
}

/* ---------- 缩略图(一个离屏渲染器画到每个格子的 2D canvas) ---------- */
const TW = 300, TH = 250;
const off = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
L.prepareRenderer(off); off.setPixelRatio(1); off.setSize(TW, TH, false);
function renderThumb(type, cv, theme, state, t) {
  const sc = new T.Scene(); sc.background = new T.Color(L.STATE_COL[theme].bg); sc.add(gridFor(theme, 5)); sc.add(thumbLights(theme));
  const n = L.createNode(type, { theme }); n.setState(state || 'normal'); n.update(t == null ? 1.3 : t); sc.add(n.group);
  off.render(sc, frameFor(n, TW / TH));
  const x = cv.getContext('2d'); x.drawImage(off.domElement, 0, 0, cv.width, cv.height);
  n.dispose();
}

/* ---------- 左侧分类 ---------- */
function buildCats() {
  const el = $('cats'); el.innerHTML = '';
  const types = L.types();
  const add = (key, name, en, color, count) => {
    const d = document.createElement('div'); d.className = 'ct' + (ST.cat === key ? ' on' : ''); d.dataset.c = key;
    d.innerHTML = (color ? '<i style="background:' + color + ';color:' + color + '"></i>' : '<i style="background:var(--dim);color:transparent"></i>') + '<span>' + name + '<span class="en">' + en + '</span></span><small>' + count + '</small>';
    d.onclick = () => { ST.cat = key; buildCats(); if (CB.on) setCombo(false); else buildGallery(); }; el.appendChild(d);
  };
  add('all', '全部', 'All', null, types.length);
  Object.keys(L.CATS).forEach(k => { const c = L.CATS[k]; add(k, c.name, c.en, c[ST.theme], L.byCat(k).length); });
}

/* ---------- 画廊 ---------- */
function buildGallery() {
  const g = $('gallery'); g.innerHTML = '';
  const list = ST.cat === 'all' ? L.types() : L.byCat(ST.cat);
  $('ghead').textContent = (ST.cat === 'all' ? '全部类别' : L.CATS[ST.cat].name) + ' · ' + list.length + ' 种节点 · 点击放大预览';
  list.forEach(type => {
    const sp = L.SPEC[type], c = L.CATS[sp.cat][ST.theme];
    const d = document.createElement('div'); d.className = 'cell' + (ST.sel === type ? ' on' : ''); d.dataset.t = type; d.title = sp.name + ' / ' + sp.en;
    const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; d.appendChild(cv);
    const nm = document.createElement('div'); nm.className = 'nm'; nm.innerHTML = '<i style="background:' + c + '"></i>' + sp.name + '<small>' + sp.size + '</small>'; d.appendChild(nm);
    d.onclick = () => openPreview(type);
    g.appendChild(d);
    renderThumb(type, cv, ST.theme);
  });
}

/* ---------- 预览 ---------- */
const pcv = $('pvcv');
let pr = null; try { pr = new T.WebGLRenderer({ canvas: pcv, antialias: true, preserveDrawingBuffer: true }); L.prepareRenderer(pr); pr.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); } catch (e) { console.error(e); }
let pv = null; // { scenes:[{scene,node,cam}] }
function disposePv() { if (pv) pv.items.forEach(it => it.node.dispose()); pv = null; }
function buildPv() {
  disposePv(); if (!ST.sel || !pr) return;
  const states = ST.quad ? ['normal', 'selected', 'attacked', 'protected'] : [ST.state];
  pv = { items: states.map(s => { const sc = newScene(ST.theme, 8); const n = L.createNode(ST.sel, { theme: ST.theme, label: L.SPEC[ST.sel].name }); n.setState(s); sc.add(n.group); return { scene: sc, node: n, state: s }; }) };
  $('pvlabels').classList.toggle('show', ST.quad);
}
function openPreview(type) {
  if (CB.on) setCombo(false);
  ST.sel = type; $('pv').classList.add('show'); $('pvTitle').textContent = L.SPEC[type].name + ' · ' + L.SPEC[type].en;
  document.querySelectorAll('.cell').forEach(c => c.classList.toggle('on', c.dataset.t === type));
  buildPv(); detail(); syncStateBtns(); location.hash = type;
}
function closePreview() { $('pv').classList.remove('show'); disposePv(); history.replaceState(null, '', location.pathname); }
function setState(s) { ST.state = s; if (ST.quad) { ST.quad = false; } buildPv(); syncStateBtns(); detail(); }
function syncStateBtns() {
  document.querySelectorAll('.stbtn').forEach(b => b.classList.toggle('on', !ST.quad && b.dataset.s === ST.state));
  $('pvQuad').classList.toggle('on', ST.quad);
}
let t0 = performance.now();
function loop(now) {
  requestAnimationFrame(loop); comboLoop(now);
  if (!pv || !pr || !$('pv').classList.contains('show')) return;
  const w = pcv.clientWidth, h = pcv.clientHeight; if (w < 10 || h < 10) return;
  const dpr = pr.getPixelRatio(); if (pcv.width !== Math.round(w * dpr) || pcv.height !== Math.round(h * dpr)) pr.setSize(w, h, false);
  const t = (now - t0) / 1000, n = pv.items.length, cw = w / n;
  pr.setScissorTest(true);
  pv.items.forEach((it, i) => {
    it.node.update(t);
    const cam = frameFor(it.node, cw / h);
    pr.setViewport(i * cw, 0, cw, h); pr.setScissor(i * cw, 0, cw, h); pr.render(it.scene, cam);
  });
  pr.setScissorTest(false);
}

/* ---------- 右侧说明 ---------- */
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function detail() {
  const D = $('detail');
  if (!ST.sel) {
    const rows = Object.keys(L.CATS).map(k => { const c = L.CATS[k]; return '<div><span class="sw" style="background:' + c[ST.theme] + '"></span>' + c.name + ' <span style="color:var(--dim)">夜 ' + c.dark + ' · 日 ' + c.light + '</span></div>'; }).join('');
    D.innerHTML = '<h2>节点模型库</h2><div class="en">Generic security node models</div><h3>说明</h3><p>每种节点是程序化生成的实心低多边形(MeshStandard 明暗面 + 少量自发光),上方有小标签牌;轮廓区分种类,颜色区分类别。状态用模型描边表示:选中=白边、被攻击=闪红+红边、已防护=青边+薄护罩。无地面发光底座。全部为概念造型,不对应任何真实产品或商标。</p><h3>类别色</h3><div style="display:flex;flex-direction:column;gap:6px;font-size:13px">' + rows + '</div><h3>复用</h3><p><code>NODELIB.createNode(type, { theme, size, badge })</code> 返回 <code>{ group, setState, update, dispose }</code>;另有 <code>createZone({title,w,d,color})</code> 分区底板、<code>createZoneLabel(text)</code> 区域标签、<code>createLink(a,b)</code> 绿色虚线箭头、<code>addLights(scene)</code>。</p>';
    return;
  }
  const sp = L.SPEC[ST.sel], c = L.CATS[sp.cat];
  D.innerHTML = '<h2>' + esc(sp.name) + '</h2><div class="en">' + esc(sp.en) + ' · <code>' + sp.type + '</code></div>' +
    '<div class="kv"><b>类别</b><span><span class="sw" style="background:' + c[ST.theme] + '"></span>' + c.name + '</span><b>尺寸</b><span>' + sp.size + '(×' + L.SIZES[sp.size] + ')</span><b>缩写</b><span>' + sp.abbr + '</span><b>色值</b><span>夜 ' + c.dark + ' / 日 ' + c.light + '</span></div>' +
    '<h3>用途</h3><p>' + esc(sp.use) + '</p><h3>造型要点</h3><p>' + esc(sp.look) + '</p>' +
    '<h3>事件中的角色</h3><div>' + sp.role.map(r => '<span class="role">' + r + '</span>').join('') + '</div>' +
    '<h3>状态</h3><div class="sts">' + Object.keys(L.STATES).map(s => '<button class="stbtn' + (!ST.quad && ST.state === s ? ' on' : '') + '" data-s="' + s + '">' + L.STATES[s].name + '</button>').join('') + '</div><p style="margin-top:6px">' + esc(L.STATES[ST.quad ? 'normal' : ST.state].desc) + '</p>';
  D.querySelectorAll('.stbtn').forEach(b => b.onclick = () => setState(b.dataset.s));
}


/* ---------- 组合示例:2 大区套子区,约 60 节点,选择性辉光 ---------- */
const cbcv = $('cbcv'); let cr = null; try { cr = new T.WebGLRenderer({ canvas: cbcv, antialias: true, preserveDrawingBuffer: true }); L.prepareRenderer(cr); cr.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); } catch (e) { console.error(e); }
const CB = { on: false, scene: null, nodes: [], links: [], zones: [], tgt: new T.Vector3(3.5, 0, 0.2), dist: 19, pick: [], bloom: null };
/* 2 个大区,每区 5~6 子区,合计约 60 节点 */
const MAJOR = [
  { title: '办公与研发区', cx: -7.5, cz: 0, w: 16.5, d: 14.5, color: 'violet',
    subs: [
      { title: '行政办公子区', ox: -5.2, oz: -4.4, w: 5.6, d: 4.6, cols: 4, items: Array.from({ length: 8 }, (_, i) => ['pc', '行政电脑' + (i + 1)]) },
      { title: '财务办公子区', ox: 1.0, oz: -4.4, w: 5.0, d: 4.6, cols: 3, items: [['pc', '财务电脑1'], ['pc', '财务电脑2'], ['pc', '财务电脑3'], ['laptop', '财务笔记本'], ['printer', '财务打印机'], ['pc', '出纳电脑']] },
      { title: '前端开发子区', ox: -5.2, oz: .6, w: 5.6, d: 4.8, cols: 4, items: Array.from({ length: 8 }, (_, i) => ['pc', '前端电脑' + (i + 1), i === 2 ? 'selected' : null]).map(x => x.filter(Boolean)) },
      { title: '后端开发子区', ox: 1.0, oz: .6, w: 5.0, d: 4.8, cols: 3, items: Array.from({ length: 6 }, (_, i) => ['pc', '后端电脑' + (i + 1)]) },
      { title: '测试运维子区', ox: 5.8, oz: -1.8, w: 3.8, d: 8.8, cols: 2, items: [['laptop', '测试本1'], ['laptop', '测试本2'], ['pc', '运维电脑1'], ['pc', '运维电脑2'], ['mobile', '值班手机'], ['voip', '值班电话']] },
    ] },
  { title: '基础设施与安全区', cx: 9.2, cz: 0, w: 15.5, d: 14.5, color: 'gray',
    subs: [
      { title: '网络汇聚子区', ox: -5.0, oz: -4.5, w: 5.0, d: 4.4, cols: 3, items: [['router', '出口路由'], ['coreswitch', '核心交换'], ['switch', '接入交换1'], ['switch', '接入交换2'], ['ap', '无线AP1'], ['ap', '无线AP2'], ['dns', 'DNS'], ['lb', '负载均衡']] },
      { title: '安全管理子区', ox: 1.2, oz: -4.5, w: 5.2, d: 4.4, cols: 3, items: [['firewall', '边界防火墙', 'protected'], ['waf', 'WAF'], ['idsips', '入侵防御'], ['bastion', '堡垒机'], ['soc', '态势感知'], ['honeypot', '蜜罐'], ['vpngw', 'VPN网关'], ['sandbox', '沙箱']] },
      { title: '业务服务子区', ox: -5.0, oz: .8, w: 5.0, d: 5.0, cols: 3, items: [['websrv', 'Web服务器1'], ['websrv', 'Web服务器2'], ['mailsrv', '邮件服务器'], ['container', '容器集群'], ['cloud', '云平台']] },
      { title: '数据存储子区', ox: 1.2, oz: .8, w: 5.2, d: 5.0, cols: 3, items: [['dbsrv', '核心数据库', 'attacked'], ['dbsrv', '业务库'], ['storage', '备份存储'], ['storage', '文件存储'], ['dbsrv', '缓存库']] },
      { title: '外部', ox: 5.8, oz: -1.5, w: 3.4, d: 8.5, cols: 1, items: [['internet', '互联网'], ['attacker', '外部攻击者'], ['c2', 'C2节点'], ['botnet', '僵尸网络']] },
    ] },
];
const LINK_PAIRS = [
  ['行政电脑1', '接入交换1'], ['财务电脑1', '接入交换1'], ['前端电脑1', '接入交换2'], ['后端电脑1', '接入交换2'],
  ['接入交换1', '核心交换'], ['接入交换2', '核心交换'], ['核心交换', '出口路由'], ['出口路由', '互联网'],
  ['外部攻击者', '互联网'], ['互联网', '边界防火墙'], ['边界防火墙', 'WAF'], ['WAF', 'Web服务器1'],
  ['Web服务器1', '核心数据库'], ['核心数据库', '备份存储'], ['堡垒机', '容器集群'], ['入侵防御', '态势感知'],
  ['核心交换', '边界防火墙'], ['VPN网关', '运维电脑1'], ['邮件服务器', 'DNS'], ['负载均衡', 'Web服务器2'],
];
function buildCombo() {
  if (CB.scene) { CB.nodes.forEach(n => n.dispose()); CB.links.forEach(l => l.dispose()); CB.zones.forEach(z => z.dispose()); if (CB.bloom) { try { CB.bloom.dispose(); } catch (e) {} CB.bloom = null; } }
  const th = ST.theme, sc = new T.Scene(); sc.background = new T.Color(L.STATE_COL[th].bg); L.addLights(sc, th);
  const gh = gridFor(th, 28); gh.material.opacity = th === 'light' ? .28 : .18; sc.add(gh);
  CB.nodes = []; CB.links = []; CB.zones = []; CB.pick = []; const byName = {};
  MAJOR.forEach(maj => {
    const big = L.createZone({ title: maj.title, w: maj.w, d: maj.d, color: maj.color, theme: th, titleSize: 1.2, nested: false });
    big.group.position.set(maj.cx, 0, maj.cz); sc.add(big.group); CB.zones.push(big);
    maj.subs.forEach(sub => {
      const z = L.createZone({ title: sub.title, w: sub.w, d: sub.d, color: 'violet', theme: th, titleSize: .62, nested: true });
      z.group.position.set(maj.cx + sub.ox, 0.02, maj.cz + sub.oz); sc.add(z.group); CB.zones.push(z);
      sub.items.forEach((it, i) => {
        const type = it[0], name = it[1], st = it[2];
        const n = L.createNode(type, { theme: th, size: (L.SIZES[L.SPEC[type].size] || 1) * 0.92, label: name });
        const p = z.slot(i, sub.items.length, sub.cols);
        n.group.position.set(maj.cx + sub.ox + p.x, 0.02, maj.cz + sub.oz + p.z);
        if (st) n.setState(st); sc.add(n.group); CB.nodes.push(n); byName[name] = n; CB.pick.push(n);
      });
    });
  });
  LINK_PAIRS.forEach(([a, b]) => { const A = byName[a], B = byName[b]; if (!A || !B) return; const l = L.createLink(A.group.position, B.group.position, { theme: th }); sc.add(l.group); CB.links.push(l); });
  CB.scene = sc;
  CB.bloom = null; /* v3.1: UnrealBloom 易发白;底框/连线靠 AdditiveBlending 出辉光,模型不进 bloom 层 */
}
function comboCam() { const w = cbcv.clientWidth, h = cbcv.clientHeight; return persp(w / Math.max(1, h), CB.dist, CB.tgt.x, .2, CB.tgt.z); }
function setCombo(on) {
  CB.on = !!on; $('combo').classList.toggle('show', CB.on); $('bView').classList.toggle('on', CB.on); $('bView').textContent = CB.on ? '▦ 节点画廊' : '⌗ 组合示例';
  if (CB.on) { $('pv').classList.remove('show'); buildCombo(); $('ghead').textContent = '组合示例 · 2 大区 / ' + CB.zones.filter(z => z.nested).length + ' 子区 / ' + CB.nodes.length + ' 节点 · 绿色虚线表示流向'; } else buildGallery();
}
{ let drag = null;
  cbcv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, m: 0 }; cbcv.setPointerCapture(e.pointerId); });
  cbcv.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.m += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; const k = CB.dist / cbcv.clientHeight * .85;
    const fx = -Math.sin(PAZ), fz = -Math.cos(PAZ), rx = Math.cos(PAZ), rz = -Math.sin(PAZ); CB.tgt.x += -dx * k * rx + dy * k * fx * -1.2; CB.tgt.z += -dx * k * rz + dy * k * fz * -1.2; });
  cbcv.addEventListener('pointerup', e => { const was = drag; drag = null; if (was && was.m < 5) comboPick(e); });
  cbcv.addEventListener('wheel', e => { e.preventDefault(); CB.dist = Math.min(55, Math.max(8, CB.dist * Math.exp(e.deltaY * .0012))); }, { passive: false });
}
function comboPick(e) {
  const r = cbcv.getBoundingClientRect(), v = new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  const rc = new T.Raycaster(); rc.setFromCamera(v, comboCam()); const hit = rc.intersectObjects(CB.pick.map(n => n.group), true).find(h => h.object.isMesh);
  if (!hit) return; let o = hit.object; while (o && !(o.name || '').startsWith('node:')) o = o.parent; if (!o) return;
  const n = CB.pick.find(x => x.group === o); CB.nodes.forEach(x => { if (x.state === 'selected') x.setState('normal'); }); if (n.state === 'normal') n.setState('selected');
  ST.sel = n.type; detail();
}
function comboLoop(now) {
  if (!CB.on || !cr || !CB.scene) return; const w = cbcv.clientWidth, h = cbcv.clientHeight; if (w < 10 || h < 10) return;
  const dpr = cr.getPixelRatio(); if (cbcv.width !== Math.round(w * dpr) || cbcv.height !== Math.round(h * dpr)) { cr.setSize(w, h, false); if (CB.bloom) CB.bloom.setSize(w, h); }
  const t = now / 1000; CB.nodes.forEach(n => n.update(t)); CB.links.forEach(l => l.update(t));
  const cam = comboCam();
  if (CB.bloom) CB.bloom.render(CB.scene, cam); else cr.render(CB.scene, cam);
}
$('bView').onclick = () => setCombo(!CB.on);

/* ---------- 主题 / 启动 ---------- */
function applyTheme() { ST.theme = curTheme(); L.setTheme(ST.theme); buildCats(); if (CB.on) buildCombo(); else buildGallery(); if (ST.sel && $('pv').classList.contains('show')) buildPv(); detail(); }
document.querySelectorAll('#pvbar .stbtn').forEach(b => b.onclick = () => setState(b.dataset.s));
$('pvQuad').onclick = () => { ST.quad = !ST.quad; buildPv(); syncStateBtns(); detail(); };
$('pvBack').onclick = closePreview;
addEventListener('keydown', e => { if (e.key === 'Escape') closePreview(); });
addEventListener('sec-theme', applyTheme);
$('total').textContent = '共 ' + L.types().length + ' 种节点 · ' + Object.keys(L.CATS).length + ' 个类别';
applyTheme();
const h0 = decodeURIComponent(location.hash.slice(1)); if (h0 === 'combo') setCombo(true); else if (L.SPEC[h0]) openPreview(h0);
requestAnimationFrame(loop);

/* 测试/复用接口 */
window.NODES_PAGE = {
  ST, CB, setCombo, openPreview, closePreview, setState, setQuad(on) { ST.quad = !!on; buildPv(); syncStateBtns(); detail(); },
  /* 纯白剪影掩码,用于判断轮廓是否重复 */
  mask(type, size = 96) {
    const sc = new T.Scene(); sc.background = new T.Color('#000');
    const n = L.createNode(type, { mask: true, size: 1 });
    sc.add(n.group);
    const cam = makeCam(1, 5.2, 1.3);
    off.setSize(size, size, false); off.render(sc, cam);
    const gl = off.getContext(), buf = new Uint8Array(size * size * 4); gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    off.setSize(TW, TH, false); n.dispose();
    const m = new Uint8Array(size * size); for (let i = 0; i < m.length; i++) m[i] = buf[i * 4] > 127 ? 1 : 0; return m;
  },
};
})();
