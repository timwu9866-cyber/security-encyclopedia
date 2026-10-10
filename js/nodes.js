/* nodes.js — 节点模型库页面:分类、画廊缩略图、放大预览、四态对比、主题联动 */
(function () {
'use strict';
const T = window.THREE, L = window.NODELIB, $ = id => document.getElementById(id);
const AZ = 24 * Math.PI / 180, EL = 32 * Math.PI / 180; // 与事件大全相同的固定等距镜头
const ST = { cat: 'all', sel: null, state: 'normal', quad: false, theme: 'dark' };
const curTheme = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

function makeCam(asp, h, cy) {
  const cam = new T.OrthographicCamera(-h * asp / 2, h * asp / 2, h / 2, -h / 2, -100, 200);
  const d = 40; cam.position.set(Math.sin(AZ) * Math.cos(EL) * d, cy + Math.sin(EL) * d, Math.cos(AZ) * Math.cos(EL) * d);
  cam.lookAt(0, cy, 0); cam.updateProjectionMatrix(); return cam;
}
function gridFor(theme, n = 8) {
  const c = L.STATE_COL[theme].grid, g = new T.GridHelper(n * 2, n * 2, c, c);
  g.material.transparent = true; g.material.opacity = theme === 'light' ? .45 : .35; g.material.depthWrite = false; return g;
}
function frameFor(node, asp) {
  const r = node.bounds.radius + 1.2, h = node.bounds.height + 1.3;
  const view = Math.max(h * 1.15, (r * 2.3) / asp * .9, 3.6);
  return makeCam(asp, view, h * .42);
}

/* ---------- 缩略图(一个离屏渲染器画到每个格子的 2D canvas) ---------- */
const TW = 300, TH = 250;
const off = new T.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
off.setPixelRatio(1); off.setSize(TW, TH, false);
function renderThumb(type, cv, theme, state, t) {
  const sc = new T.Scene(); sc.background = new T.Color(L.STATE_COL[theme].bg); sc.add(gridFor(theme, 5));
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
    d.onclick = () => { ST.cat = key; buildCats(); buildGallery(); }; el.appendChild(d);
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
let pr = null; try { pr = new T.WebGLRenderer({ canvas: pcv, antialias: true, preserveDrawingBuffer: true }); pr.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); } catch (e) { console.error(e); }
let pv = null; // { scenes:[{scene,node,cam}] }
function disposePv() { if (pv) pv.items.forEach(it => it.node.dispose()); pv = null; }
function buildPv() {
  disposePv(); if (!ST.sel || !pr) return;
  const states = ST.quad ? ['normal', 'selected', 'attacked', 'protected'] : [ST.state];
  pv = { items: states.map(s => { const sc = new T.Scene(); sc.background = new T.Color(L.STATE_COL[ST.theme].bg); sc.add(gridFor(ST.theme, 8)); const n = L.createNode(ST.sel, { theme: ST.theme }); n.setState(s); sc.add(n.group); return { scene: sc, node: n, state: s }; }) };
  $('pvlabels').classList.toggle('show', ST.quad);
}
function openPreview(type) {
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
  requestAnimationFrame(loop);
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
    D.innerHTML = '<h2>节点模型库</h2><div class="en">Generic security node models</div><h3>说明</h3><p>每种节点用程序化线框 + 发光核心 + 底座光环生成,轮廓区分种类、颜色区分类别。全部为概念造型,不对应任何真实产品或商标。</p><h3>类别色</h3><div style="display:flex;flex-direction:column;gap:6px;font-size:13px">' + rows + '</div><h3>复用</h3><p><code>NODELIB.createNode(type, { theme, size, badge })</code> 返回 <code>{ group, setState, update, dispose }</code>,事件场景可直接调用。</p>';
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

/* ---------- 主题 / 启动 ---------- */
function applyTheme() { ST.theme = curTheme(); L.setTheme(ST.theme); buildCats(); buildGallery(); if (ST.sel && $('pv').classList.contains('show')) buildPv(); detail(); }
document.querySelectorAll('#pvbar .stbtn').forEach(b => b.onclick = () => setState(b.dataset.s));
$('pvQuad').onclick = () => { ST.quad = !ST.quad; buildPv(); syncStateBtns(); detail(); };
$('pvBack').onclick = closePreview;
addEventListener('keydown', e => { if (e.key === 'Escape') closePreview(); });
addEventListener('sec-theme', applyTheme);
$('total').textContent = '共 ' + L.types().length + ' 种节点 · ' + Object.keys(L.CATS).length + ' 个类别';
applyTheme();
const h0 = decodeURIComponent(location.hash.slice(1)); if (L.SPEC[h0]) openPreview(h0);
requestAnimationFrame(loop);

/* 测试/复用接口 */
window.NODES_PAGE = {
  ST, openPreview, closePreview, setState, setQuad(on) { ST.quad = !!on; buildPv(); syncStateBtns(); detail(); },
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
