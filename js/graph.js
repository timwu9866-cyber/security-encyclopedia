/* graph.js — 知识图谱渲染与交互(Canvas 2D,自带力导向,离线无依赖) */
(function () {
'use strict';
const G = window.SEC_GRAPH_BUILD(), CATS = window.SEC_CATS;
const nodes = G.nodes, edges = G.edges, adj = G.adj, byId = G.byId;
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COL = { event: '#ff4d5e', defense: '#2ee6d6', category: '#8fa8ff', stage: '#b69cff', asset: '#ffb04d', measure: '#7dffb0', ref: '#a9b8dc' };
const TH = { text: '#e6f0ff', text2: '#c5d3f3', halo: 'rgba(10,16,32,.92)', gap: '#ffb04d', sel: '#ffffff', defStroke: '#d8fff9', day: false };
function applyGraphTheme() {
  const cs = getComputedStyle(document.documentElement), g = n => (cs.getPropertyValue(n) || '').trim();
  Object.keys(COL).forEach(t => { const v = g('--g-' + t); if (v) COL[t] = v; });
  nodes.forEach(n => { if (COL[n.type]) n.col = COL[n.type]; });
  Object.keys(ET).forEach(t => { const v = g('--e-' + t); if (v) ET[t].col = v; });
  TH.day = document.documentElement.getAttribute('data-theme') === 'light';
  TH.text = g('--g-text') || TH.text; TH.text2 = g('--g-text2') || TH.text2; TH.halo = g('--g-halo') || TH.halo;
  TH.gap = g('--g-gap') || TH.gap; TH.sel = g('--g-sel') || TH.sel; TH.defStroke = g('--g-defstroke') || TH.defStroke;
  kick();
}
const TNAME = { event: '攻击事件', defense: '防守事件', category: '分类', stage: '攻击链阶段', asset: '资产 / 目标', measure: '通用防御措施', ref: '参考标准' };
const TSHORT = { event: '攻击事件', defense: '防守事件', category: '分类', stage: '阶段', asset: '资产', measure: '措施', ref: '标准' };
const ET = {
  belongs: { name: "属于", col: "#5f77c9", rest: 52, k: .10, a: .30 }, stage: { name: '位于阶段', col: '#b69cff', rest: 150, k: .012, a: .16 },
  asset: { name: '目标资产', col: '#ffb04d', rest: 160, k: .008, a: .10 }, mitigate: { name: '被缓解', col: '#2ee6d6', rest: 120, k: .012, a: .16 },
  chain: { name: '常串联', col: '#ff4d5e', rest: 60, k: .06, a: .65 }, similar: { name: '同类相似', col: '#ffd24d', rest: 80, k: .025, a: .40, dash: 1 },
  measure: { name: '通用措施', col: '#7dffb0', rest: 110, k: .008, a: .12 }, ref: { name: '参考标准', col: '#a9b8dc', rest: 55, k: .05, a: .20 },
};
const ETORDER = ['belongs', 'asset', 'stage', 'measure', 'ref', 'similar', 'mitigate', 'chain'];
const SEVN = { critical: '严重', high: '高危', medium: '中危', low: '低危', none: '防守' };
const SEVR = { critical: 7.5, high: 6.5, medium: 5.5, low: 4.5, none: 6.2 };
const catIdx = {}; CATS.forEach((c, i) => catIdx[c.id] = i);
const defaults = () => ({
  typeOn: { event: 1, defense: 1, category: 1, stage: 1, asset: 1, measure: 0, ref: 0 },
  edgeOn: { belongs: 1, stage: 1, asset: 1, mitigate: 1, chain: 1, similar: 1, measure: 1, ref: 1 },
  cat: 'all', sevOn: { critical: 1, high: 1, medium: 1, low: 1, none: 1 }, q: '', gap: 0,
});
const S = Object.assign(defaults(), { expanded: new Set(), forced: new Set(), sel: null, hover: null, layout: 'force', glow: .2, view: { x: 0, y: 0, k: 1 } });

nodes.forEach(n => {
  n.r = n.type === 'event' || n.type === 'defense' ? SEVR[n.sev] : { category: 11, stage: 9, asset: 9.5, measure: 5.5, ref: 3.8 }[n.type];
  n.col = COL[n.type]; n.x = NaN; n.y = NaN; n.vx = 0; n.vy = 0; n.pin = false;
  n.text = (n.name + ' ' + (n.en || '') + ' ' + (n.kw || '') + ' ' + n.id).toLowerCase();
});

/* ---------- 可见性 ---------- */
let vis = new Set(), vn = [], ve = [];
/* 覆盖缺口:没有"直接对应"防守事件的攻击事件,以及与它们仅有弱关联的防守事件 */
const gapEv = new Set(G.stat.gap.map(id => 'e:' + id)), gapDef = new Set(), gapCat = new Set();
G.stat.gap.forEach(id => { (G.stat.gapWeak[id] || []).forEach(d => gapDef.add('e:' + d)); gapCat.add(byId.get('e:' + id).cat); });
function filtering() { return S.cat !== 'all' || S.gap || Object.values(S.sevOn).some(v => !v); }
function base(n) {
  if (!S.typeOn[n.type]) return false;
  if (n.type === 'event' || n.type === 'defense') return !!S.sevOn[n.sev] && (S.cat === 'all' || n.cat === S.cat) && (!S.gap || (n.type === 'event' ? gapEv.has(n.id) : gapDef.has(n.id)));
  if (n.type === 'category') return (S.cat === 'all' || n.cat === S.cat) && (!S.gap || gapCat.has(n.cat));
  return true;
}
function recompute() {
  vis = new Set();
  nodes.forEach(n => { if (base(n)) vis.add(n.id); });
  if (filtering()) nodes.forEach(n => { if (['stage', 'asset', 'measure', 'ref'].includes(n.type) && vis.has(n.id) && !adj.get(n.id).some(x => { const o = byId.get(x.s === n.id ? x.t : x.s); return (o.type === 'event' || o.type === 'defense') && vis.has(o.id); })) vis.delete(n.id); });
  S.expanded.forEach(id => { if (vis.has(id) || S.forced.has(id)) adj.get(id).forEach(x => { vis.add(x.s); vis.add(x.t); }); });
  S.forced.forEach(id => vis.add(id));
  vn = nodes.filter(n => vis.has(n.id));
  ve = edges.filter(x => vis.has(x.s) && vis.has(x.t) && (S.edgeOn[x.type] || S.expanded.has(x.s) || S.expanded.has(x.t)));
  ve.forEach(x => { x.a = byId.get(x.s); x.b = byId.get(x.t); });
  vn.forEach(n => { if (isNaN(n.x)) place(n); });
  $('gempty').style.display = vn.length ? 'none' : 'flex';
  stats(); updateChipCounts();
}
function ringPos(n) {
  const ci = n.type === 'category' ? catIdx[n.cat] : (n.cat != null ? catIdx[n.cat] : 0);
  const a = (ci + .5) / CATS.length * Math.PI * 2 - Math.PI / 2; return { a, ci };
}
function place(n) {
  const nb = adj.get(n.id).map(x => byId.get(x.s === n.id ? x.t : x.s)).filter(o => !isNaN(o.x));
  if (n.type === 'category') { const r = ringPos(n); n.x = Math.cos(r.a) * 380; n.y = Math.sin(r.a) * 380; return; }
  if (n.type === 'stage') { const i = G.stages.findIndex(s => 's:' + s[0] === n.id); const a = i / G.stages.length * Math.PI * 2; n.x = Math.cos(a) * 130; n.y = Math.sin(a) * 130; return; }
  if (n.type === 'asset') { const i = Object.keys(window.SEC_GRAPH_META.ASSETS).findIndex(k => 'a:' + k === n.id); const a = i / 11 * Math.PI * 2 + .3; n.x = Math.cos(a) * 250; n.y = Math.sin(a) * 250; return; }
  if (nb.length) { let sx = 0, sy = 0; nb.forEach(o => { sx += o.x; sy += o.y; }); n.x = sx / nb.length + (Math.random() - .5) * 60; n.y = sy / nb.length + (Math.random() - .5) * 60; return; }
  const a = Math.random() * 6.28; n.x = Math.cos(a) * 450; n.y = Math.sin(a) * 450;
}

/* ---------- 力导向 ---------- */
let alpha = 1, moving = false;
function tick() {
  const n = vn.length;
  for (let i = 0; i < n; i++) { vn[i].fx = 0; vn[i].fy = 0; }
  const R2 = 240 * 240;
  for (let i = 0; i < n; i++) {
    const a = vn[i], ca = a.type === 'category' ? 3 : a.type === 'stage' ? 2 : a.type === 'asset' ? 2 : 1;
    for (let j = i + 1; j < n; j++) {
      const b = vn[j]; let dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy; if (d2 > R2) continue;
      if (d2 < 1) { dx = Math.random() - .5; dy = Math.random() - .5; d2 = 1; }
      const mind = a.r + b.r + 3; let f;
      if (d2 < mind * mind) f = 6; else f = 1100 * ca * (b.type === 'category' ? 3 : b.type === 'stage' || b.type === 'asset' ? 2 : 1) / d2;
      const d = Math.sqrt(d2); f = Math.min(f, 6) / d; a.fx += dx * f; a.fy += dy * f; b.fx -= dx * f; b.fy -= dy * f;
    }
  }
  for (let i = 0; i < ve.length; i++) {
    const x = ve[i], t = ET[x.type], a = x.a, b = x.b; let dx = b.x - a.x, dy = b.y - a.y; const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = (d - t.rest) * t.k / d; a.fx += dx * f; a.fy += dy * f; b.fx -= dx * f; b.fy -= dy * f;
  }
  for (let i = 0; i < n; i++) {
    const a = vn[i]; a.fx -= a.x * .0025; a.fy -= a.y * .0025;
    if (a.type === 'category') { const r = ringPos(a); a.fx += (Math.cos(r.a) * 400 - a.x) * .012; a.fy += (Math.sin(r.a) * 400 - a.y) * .012; }
  }
  for (let i = 0; i < n; i++) {
    const a = vn[i]; if (a.pin) { a.vx = a.vy = 0; continue; }
    a.vx = (a.vx + a.fx * alpha) * .78; a.vy = (a.vy + a.fy * alpha) * .78;
    const sp = Math.hypot(a.vx, a.vy); if (sp > 14) { a.vx *= 14 / sp; a.vy *= 14 / sp; }
    a.x += a.vx; a.y += a.vy;
  }
  alpha *= .985;
}
function warm(n) { alpha = Math.max(alpha, .9); for (let i = 0; i < n; i++) tick(); alpha = Math.min(alpha, .25); }

/* ---------- 分层布局(按攻击链阶段) ---------- */
function layered() {
  const st = G.stages, stIdx = {}; st.forEach((s, i) => stIdx['s:' + s[0]] = i);
  const ROWS = 12, DX = 24, DY = 21, cols = st.map(() => []), pos = new Map();
  vn.filter(n => n.type === 'event' || n.type === 'defense').forEach(n => {
    const ss = adj.get(n.id).filter(x => x.type === 'stage').map(x => stIdx[x.t]).sort((a, b) => a - b);
    cols[ss.length ? ss[0] : (n.type === 'defense' ? 14 : 2)].push(n);
  });
  cols.forEach(c => c.sort((a, b) => catIdx[a.cat] - catIdx[b.cat] || a.name.localeCompare(b.name)));
  const place2 = (ci0, ci1, y0) => { let x = 0; for (let i = ci0; i < ci1; i++) { const c = cols[i], sub = Math.max(1, Math.ceil(c.length / ROWS)); const w = sub * DX + 36; c.forEach((n, k) => pos.set(n.id, [x + 18 + Math.floor(k / ROWS) * DX, y0 + 30 + (k % ROWS) * DY + (Math.floor(k / ROWS) % 2) * 8])); if (byId.has('s:' + st[i][0]) && vis.has('s:' + st[i][0])) pos.set('s:' + st[i][0], [x + w / 2 - 6, y0]); x += w; } return x; };
  place2(0, 14, 0); const dy0 = ROWS * DY + 120; place2(14, 18, dy0);
  const rowOf = (arr, y, gap) => { const items = arr.map(n => { const nb = adj.get(n.id).map(x => pos.get(x.s === n.id ? x.t : x.s)).filter(Boolean); const cx = nb.length ? nb.reduce((s, p) => s + p[0], 0) / nb.length : 0; return { n, cx }; }).sort((a, b) => a.cx - b.cx); let last = -1e9; items.forEach(it => { const x = Math.max(it.cx, last + gap); pos.set(it.n.id, [x, y]); last = x; }); };
  rowOf(vn.filter(n => n.type === 'category'), -150, 64); rowOf(vn.filter(n => n.type === 'asset'), -100, 90);
  const bottom = dy0 + ROWS * DY + 90;
  rowOf(vn.filter(n => n.type === 'measure'), bottom, 70); rowOf(vn.filter(n => n.type === 'ref'), bottom + 50, 14);
  let sx = 0, c = 0; pos.forEach(p => { sx += p[0]; c++; }); const off = c ? sx / c : 0;
  vn.forEach(n => { const p = pos.get(n.id); if (p) { n.tx = p[0] - off; n.ty = p[1] - 120; } else { n.tx = n.x; n.ty = n.y; } });
  moving = true;
}
function relayout(fresh) {
  if (S.layout === 'layered') { layered(); fit(); } else { moving = false; if (fresh) warm(260); else { alpha = .6; warm(40); } }
  kick();
}

/* ---------- 视图 ---------- */
const cv = $('gcv'), ctx = cv.getContext('2d'); let W = 0, H = 0, dpr = 1, anim = null;
function resize() { const r = $('gcenter').getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1); W = Math.max(50, r.width); H = Math.max(50, r.height); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); kick(); }
function fit() {
  if (!vn.length) return; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  vn.forEach(n => { const x = S.layout === 'layered' && n.tx != null ? n.tx : n.x, y = S.layout === 'layered' && n.ty != null ? n.ty : n.y; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  const k = Math.max(.12, Math.min(3, Math.min((W - 60) / Math.max(40, x1 - x0), (H - 60) / Math.max(40, y1 - y0))));
  S.view = { k, x: W / 2 - (x0 + x1) / 2 * k, y: H / 2 - (y0 + y1) / 2 * k }; anim = null; kick();
}
const toWorld = (px, py) => [(px - S.view.x) / S.view.k, (py - S.view.y) / S.view.k];
function centerOn(n, k) { const kk = Math.max(S.view.k, k || 1.2); anim = { k: kk, x: W / 2 - n.x * kk, y: H / 2 - n.y * kk }; kick(); }

/* ---------- 绘制 ---------- */
let running = false;
function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }
function loop() {
  let busy = false;
  if (S.layout === 'force') { if (alpha > .02) { tick(); tick(); busy = true; } }
  else if (moving) { let md = 0; vn.forEach(n => { if (n.pin) return; const dx = n.tx - n.x, dy = n.ty - n.y; n.x += dx * .2; n.y += dy * .2; md = Math.max(md, Math.abs(dx), Math.abs(dy)); }); if (md < .4) { moving = false; vn.forEach(n => { n.x = n.tx; n.y = n.ty; }); } busy = moving; }
  if (anim) { const v = S.view; v.x += (anim.x - v.x) * .22; v.y += (anim.y - v.y) * .22; v.k += (anim.k - v.k) * .22; if (Math.abs(anim.x - v.x) + Math.abs(anim.y - v.y) < .5 && Math.abs(anim.k - v.k) < .004) { S.view = { x: anim.x, y: anim.y, k: anim.k }; anim = null; } else busy = true; }
  draw(); if (busy) requestAnimationFrame(loop); else running = false;
}
function shape(t, x, y, r) {
  ctx.beginPath();
  if (t === 'category') { const s = r * .9; ctx.rect(x - s, y - s, s * 2, s * 2); }
  else if (t === 'stage') { ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.2, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r * 1.2, y); ctx.closePath(); }
  else if (t === 'asset') { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.2832 + .5236; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
  else if (t === 'ref') { ctx.rect(x - r * .8, y - r * .8, r * 1.6, r * 1.6); }
  else ctx.arc(x, y, r, 0, 6.2832);
}
let hlSet = null, matchSet = null;
function computeHL() {
  hlSet = null; if (S.sel && vis.has(S.sel)) { hlSet = new Set([S.sel]); ve.forEach(x => { if (x.s === S.sel) hlSet.add(x.t); else if (x.t === S.sel) hlSet.add(x.s); }); }
  matchSet = null; if (S.q.trim()) { const q = S.q.trim().toLowerCase(); matchSet = new Set(); vn.forEach(n => { if (n.text.includes(q)) matchSet.add(n.id); }); }
}
const FONT = '"Noto Sans CJK SC","Noto Sans SC","Microsoft YaHei","PingFang SC","Segoe UI",sans-serif';
function draw() {
  computeHL(); const v = S.view, k = v.k;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * v.x, dpr * v.y);
  const vx0 = -v.x / k - 40, vy0 = -v.y / k - 40, vx1 = (W - v.x) / k + 40, vy1 = (H - v.y) / k + 40;
  const inV = n => n.x > vx0 && n.x < vx1 && n.y > vy0 && n.y < vy1;
  const dimMode = !!(hlSet || matchSet);
  /* 边 */
  ETORDER.forEach(t => {
    const spec = ET[t], list = ve.filter(x => x.type === t); if (!list.length) return;
    const bright = [], dim = [];
    list.forEach(x => { (hlSet ? (x.s === S.sel || x.t === S.sel ? bright : dim) : (matchSet ? (matchSet.has(x.s) || matchSet.has(x.t) ? bright : dim) : dim)).push(x); });
    const run = (arr, al, lw) => {
      if (!arr.length) return; ctx.beginPath();
      arr.forEach(x => { if (!(inV(x.a) || inV(x.b))) return; ctx.moveTo(x.a.x, x.a.y); ctx.lineTo(x.b.x, x.b.y); });
      ctx.strokeStyle = spec.col; ctx.globalAlpha = al; ctx.lineWidth = lw / k; ctx.setLineDash(spec.dash ? [5 / k, 4 / k] : []); ctx.stroke();
    };
    if (hlSet || matchSet) { run(dim, spec.a * (TH.day ? .5 : .22), .8); run(bright, Math.min(.95, spec.a * 3 + .3), hlSet ? 1.5 : 1.1); }
    else run(dim, spec.a, t === 'chain' ? 1.3 : .9);
    ctx.setLineDash([]);
    if (t === 'chain' || (hlSet && t === 'mitigate')) {
      const arrs = hlSet ? bright : list; const sz = Math.max(4, 7 / Math.sqrt(k)); ctx.fillStyle = spec.col; ctx.globalAlpha = hlSet ? .95 : .7; ctx.beginPath();
      arrs.forEach(x => { if (!inV(x.b) && !inV(x.a)) return; const dx = x.b.x - x.a.x, dy = x.b.y - x.a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, ex = x.b.x - ux * (x.b.r + 2), ey = x.b.y - uy * (x.b.r + 2);
        ctx.moveTo(ex, ey); ctx.lineTo(ex - ux * sz + uy * sz * .45, ey - uy * sz - ux * sz * .45); ctx.lineTo(ex - ux * sz - uy * sz * .45, ey - uy * sz + ux * sz * .45); ctx.closePath(); });
      ctx.fill();
    }
  });
  /* 节点 */
  const glowPx = S.glow * (TH.day ? 13 : 26), special = [];
  ['ref', 'measure', 'asset', 'stage', 'category', 'defense', 'event'].forEach(t => {
    vn.forEach(n => {
      if (n.type !== t || !inV(n)) return;
      const isSel = n.id === S.sel, isHl = hlSet && hlSet.has(n.id), isM = matchSet && matchSet.has(n.id), isHover = n.id === S.hover;
      if (isSel || isHover || (isHl && hlSet.size <= 40 && glowPx > 0)) { special.push(n); return; }
      const dimA = TH.day ? .36 : .13, dimM = TH.day ? .4 : .15; let al = .88; if (hlSet && !isHl) al = dimA; else if (matchSet && !isM) al = dimM;
      ctx.globalAlpha = al; shape(t, n.x, n.y, n.r); ctx.fillStyle = n.col; ctx.fill();
      if (t === 'defense' || t === 'measure') { ctx.lineWidth = 1.2 / k; ctx.strokeStyle = TH.defStroke; ctx.globalAlpha = al * .8; ctx.stroke(); }
      if (S.expanded.has(n.id)) { ctx.globalAlpha = al; ctx.lineWidth = 1.5 / k; ctx.strokeStyle = TH.sel; shape(t, n.x, n.y, n.r + 3); ctx.stroke(); }
      if (isM && !isSel) { ctx.globalAlpha = 1; ctx.lineWidth = 2 / k; ctx.strokeStyle = TH.sel; shape(t, n.x, n.y, n.r + 3.5); ctx.stroke(); }
    });
  });
  special.forEach(n => {
    const isSel = n.id === S.sel; ctx.globalAlpha = 1; ctx.shadowColor = n.col; ctx.shadowBlur = glowPx * (isSel ? 1.4 : 1) * dpr;
    shape(n.type, n.x, n.y, n.r + (isSel ? 1.5 : 0)); ctx.fillStyle = n.col; ctx.fill(); ctx.shadowBlur = 0;
    if (isSel || n.id === S.hover) { ctx.lineWidth = 2 / k; ctx.strokeStyle = TH.sel; shape(n.type, n.x, n.y, n.r + 3.5); ctx.stroke(); }
  });
  ctx.shadowBlur = 0;
  if (S.gap) { ctx.setLineDash([3 / k, 2.5 / k]); ctx.lineWidth = 1.6 / k; ctx.strokeStyle = TH.gap; ctx.globalAlpha = hlSet ? .5 : .95;
    vn.forEach(n => { if (n.gap && inV(n)) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 5, 0, 6.2832); ctx.stroke(); } }); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  /* 标签 */
  const fs = 11 / k; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round'; let drawn = 0;
  const lab = (n, bold) => {
    const txt = n.type === 'category' ? n.name : n.name; ctx.font = (bold ? '600 ' : '') + fs + 'px ' + FONT;
    ctx.lineWidth = 3 / k; ctx.strokeStyle = TH.halo; ctx.fillStyle = bold ? TH.text : TH.text2; ctx.globalAlpha = 1;
    const y = n.y + n.r + 2 / k; ctx.strokeText(txt, n.x, y); ctx.fillText(txt, n.x, y); drawn++;
  };
  vn.forEach(n => {
    if (!inV(n) || drawn > 260) return;
    const hl = hlSet && hlSet.has(n.id), m = matchSet && matchSet.has(n.id);
    if (hlSet && !hl) return; if (!hlSet && matchSet && !m) return;
    if (n.type === 'category' || n.type === 'stage' || n.type === 'asset') lab(n, true);
    else if (n.id === S.sel || n.id === S.hover || (hl && (hlSet.size <= 60 || k > 1.3)) || m) lab(n, n.id === S.sel);
    else if ((n.type === 'event' || n.type === 'defense') && k >= 1.7) lab(n, false);
    else if ((n.type === 'measure') && k >= 1.0) lab(n, false);
    else if (n.type === 'ref' && k >= 2.4) lab(n, false);
  });
  ctx.globalAlpha = 1;
}

/* ---------- 命中与交互 ---------- */
function nodeAt(px, py) {
  const [wx, wy] = toWorld(px, py), k = S.view.k; let best = null, bd = 1e9;
  for (let i = vn.length - 1; i >= 0; i--) { const n = vn[i], d = Math.hypot(n.x - wx, n.y - wy), rr = n.r + 3 / k + 1; if (d <= rr && d < bd) { best = n; bd = d; } }
  return best;
}
const ptrs = new Map(); let mode = null, dragNode = null, moved = false, startP = null, lastPinch = 0;
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); const r = cv.getBoundingClientRect(); ptrs.set(e.pointerId, [e.clientX - r.left, e.clientY - r.top]); moved = false; anim = null;
  if (ptrs.size === 2) { mode = 'pinch'; const [a, b] = [...ptrs.values()]; lastPinch = Math.hypot(a[0] - b[0], a[1] - b[1]); return; }
  const p = ptrs.get(e.pointerId); startP = p.slice(); const hit = nodeAt(p[0], p[1]);
  if (hit) { mode = 'node'; dragNode = hit; } else { mode = 'pan'; cv.classList.add('drag'); }
});
cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect(), p = [e.clientX - r.left, e.clientY - r.top];
  if (!ptrs.has(e.pointerId)) { const h = nodeAt(p[0], p[1]); setHover(h, p); return; }
  const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, p);
  if (mode === 'pinch' && ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (lastPinch > 0) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / lastPinch); lastPinch = d; moved = true; return; }
  if (Math.hypot(p[0] - startP[0], p[1] - startP[1]) > 4) moved = true;
  if (mode === 'pan' && moved) { S.view.x += p[0] - prev[0]; S.view.y += p[1] - prev[1]; kick(); }
  else if (mode === 'node' && moved) { const [wx, wy] = toWorld(p[0], p[1]); dragNode.x = wx; dragNode.y = wy; dragNode.pin = true; if (S.layout === 'force') { alpha = Math.max(alpha, .35); } else { dragNode.tx = wx; dragNode.ty = wy; } kick(); }
});
function endPtr(e) {
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
  if (mode === 'pinch') { if (ptrs.size < 2) mode = null; return; }
  if (mode === 'node' && dragNode) { dragNode.pin = false; if (!moved) select(dragNode.id, false); }
  else if (mode === 'pan' && !moved) select(null);
  mode = null; dragNode = null; cv.classList.remove('drag');
}
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('pointerleave', () => setHover(null));
cv.addEventListener('dblclick', e => { const r = cv.getBoundingClientRect(), n = nodeAt(e.clientX - r.left, e.clientY - r.top); if (n) toggleExpand(n.id); });
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0016))); }, { passive: false });
function zoomAt(px, py, f) { const v = S.view, nk = Math.max(.1, Math.min(8, v.k * f)), r = nk / v.k; v.x = px - (px - v.x) * r; v.y = py - (py - v.y) * r; v.k = nk; anim = null; kick(); }
function setHover(n, p) {
  const id = n ? n.id : null; if (id !== S.hover) { S.hover = id; cv.classList.toggle('hit', !!n); kick(); }
  const t = $('gtip'); if (n && p) { t.style.display = 'block'; t.textContent = TSHORT[n.type] + ' · ' + n.name; t.style.left = Math.min(W - 160, p[0] + 14) + 'px'; t.style.top = (p[1] + 14) + 'px'; } else t.style.display = 'none';
}

/* ---------- 选择 / 展开 ---------- */
function select(id, center) {
  if (id && !byId.has(id)) id = null;
  if (id && !vis.has(id)) { S.forced.add(id); recompute(); relayoutSoft(); }
  S.sel = id; detail(); kick();
  if (id && center) centerOn(byId.get(id), 1.3);
  if (id && history.replaceState) { try { history.replaceState(null, '', '#' + id.replace(/^e:/, '')); } catch (e) {} }
}
function relayoutSoft() { if (S.layout === 'layered') { layered(); } else { alpha = .5; warm(30); } kick(); }
function toggleExpand(id) {
  if (S.expanded.has(id)) S.expanded.delete(id); else S.expanded.add(id);
  recompute(); S.sel = id; relayoutSoft(); detail(); kick();
}

/* ---------- 侧栏详情 ---------- */
const REL = (x, n) => {
  const out = n.id === x.s;
  switch (x.type) {
    case 'belongs': return out ? '所属分类' : '包含事件'; case 'stage': return out ? '位于阶段' : '该阶段的事件'; case 'asset': return out ? (n.type === 'defense' ? '保护对象' : '目标资产') : '涉及事件';
    case 'mitigate': return out ? '可缓解的攻击' : '可由这些防守事件缓解'; case 'chain': return out ? '常见下一步 →' : '← 常见上一步'; case 'similar': return '同类相似';
    case 'measure': return out ? '通用防御措施' : '涉及事件'; case 'ref': return out ? '参考标准' : '引用该标准的事件';
  } return x.type;
};
function chip(o) { return '<span class="' + (o.type === 'event' ? 'e' : o.type === 'defense' ? 'd' : '') + '" data-id="' + esc(o.id) + '">' + esc(o.name) + '</span>'; }
function detail() {
  const n = S.sel ? byId.get(S.sel) : null; $('dEmpty').style.display = n ? 'none' : 'block'; const B = $('dBody');
  if (!n) { B.innerHTML = ''; return; }
  const e = n.ev, cat = CATS.find(c => c.id === n.cat); let h = '';
  h += '<div class="tags"><span class="tag" style="color:' + n.col + ';border-color:' + n.col + '">' + TNAME[n.type] + (n.type === 'ref' ? ' · ' + ({ owasp: 'OWASP', attack: 'ATT&CK', cwe: 'CWE', std: '标准' }[n.sub]) : '') + '</span>';
  if (cat && n.type !== 'category') h += '<span class="tag">' + esc(cat.icon || '') + ' ' + esc(cat.name) + '</span>';
  if (n.sev) h += '<span class="tag"><i class="sv ' + n.sev + '" style="display:inline-block;margin-right:4px"></i>' + SEVN[n.sev] + '</span>'; h += '</div>';
  h += '<h2>' + esc(n.name) + '</h2>' + (n.en ? '<div class="en">' + esc(n.en) + '</div>' : '');
  if (e) {
    h += '<div class="btns"><button class="primary" id="bDemo">▶ 在事件大全中演示</button><button id="bExp">' + (S.expanded.has(n.id) ? '收起邻居' : '展开邻居') + '</button></div>';
    if (n.type === 'event') {
      const inc = adj.get(n.id).filter(x => x.type === 'mitigate' && x.t === n.id), st = inc.filter(x => x.strong), wk = inc.filter(x => !x.strong);
      h += '<div class="sec cov ' + (n.gap ? 'gap' : 'ok') + '"><b>覆盖状态</b><p>' + (n.gap ? '⚠ 覆盖缺口:尚无直接对应的防守事件' + (wk.length ? '(仅有 ' + wk.length + ' 个弱关联:' + wk.map(x => esc(byId.get(x.s).name)).join('、') + ')' : '(完全没有关联)') : '✔ 已有 ' + st.length + ' 个直接对应的防守事件' + (wk.length ? ',另有 ' + wk.length + ' 个弱关联' : '')) + '</p></div>';
    }
    h += '<div class="sec"><b>所处阶段</b><p>' + esc(e.stage) + '</p></div><div class="sec"><b>原理</b><p>' + esc(e.principle) + '</p></div>';
    if (e.impact) h += '<div class="sec"><b>' + (n.type === 'defense' ? '效果' : '危害') + '</b><p>' + esc(e.impact) + '</p></div>';
    h += '<div class="sec"><b>' + (n.type === 'defense' ? '做法要点' : '防御要点') + '</b><ul>' + (e.defense || []).map(d => '<li>' + esc(d) + '</li>').join('') + '</ul></div>';
  } else {
    h += '<div class="btns"><button id="bExp">' + (S.expanded.has(n.id) ? '收起邻居' : '展开邻居') + '</button></div>';
    h += '<div class="sec"><p>' + esc(n.desc || '') + '</p></div>';
    if (n.type === 'category') { const c = nodes.filter(m => m.cat === n.cat && m.ev).length; h += '<div class="sec"><p>共 ' + c + ' 个事件。</p></div>'; }
  }
  const groups = new Map();
  adj.get(n.id).forEach(x => { const o = byId.get(x.s === n.id ? x.t : x.s), l = REL(x, n); if (!groups.has(l)) groups.set(l, []); groups.get(l).push(o); });
  const order = ['所属分类', '位于阶段', '目标资产', '保护对象', '常见上一步 ←', '← 常见上一步', '常见下一步 →', '可缓解的攻击', '可由这些防守事件缓解', '同类相似', '通用防御措施', '参考标准'];
  [...groups.keys()].sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99).forEach(l => {
    const arr = groups.get(l).sort((a, b) => a.name.localeCompare(b.name)); h += '<div class="sec"><b>' + l + ' (' + arr.length + ')</b><div class="nb">' + arr.slice(0, 60).map(chip).join('') + (arr.length > 60 ? '<span>… 共 ' + arr.length + '</span>' : '') + '</div></div>';
  });
  if (e && e.refs) h += '<div class="sec"><b>参考(原文)</b><ul>' + e.refs.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul></div>';
  B.innerHTML = h;
  const bd = $('bDemo'); if (bd) bd.onclick = () => { location.href = 'index.html#' + encodeURIComponent(e.id); };
  $('bExp').onclick = () => toggleExpand(n.id);
  B.querySelectorAll('.nb span[data-id]').forEach(s => s.onclick = () => select(s.dataset.id, true));
}

/* ---------- 过滤 UI ---------- */
function stats() {
  const vt = {}; vn.forEach(n => vt[n.type] = (vt[n.type] || 0) + 1);
  $('gstat').innerHTML = '节点 <b>' + vn.length + '</b>/' + nodes.length + ' · 边 <b>' + ve.length + '</b>/' + edges.length + (S.gap ? ' · 覆盖缺口 <b>' + G.stat.gap.length + '</b>' : '');
  $('gstat').title = Object.keys(TNAME).map(t => TNAME[t] + ' ' + (vt[t] || 0) + '/' + G.stat.byType[t]).join(' · ');
}
function chipsInit() {
  const ft = $('fType'); Object.keys(TNAME).forEach(t => { const c = document.createElement('span'); c.className = 'chip'; c.dataset.t = t; c.innerHTML = TNAME[t] + ' <small>' + G.stat.byType[t] + '</small>'; c.onclick = () => { S.typeOn[t] = S.typeOn[t] ? 0 : 1; recompute(); relayout(false); }; ft.appendChild(c); });
  const fe = $('fEdge'); Object.keys(ET).forEach(t => { const c = document.createElement('span'); c.className = 'chip'; c.dataset.e = t; c.innerHTML = ET[t].name + ' <small>' + G.stat.byEdge[t] + '</small>'; c.onclick = () => { S.edgeOn[t] = S.edgeOn[t] ? 0 : 1; recompute(); relayout(false); }; fe.appendChild(c); });
  const fs = $('fSev'); ['critical', 'high', 'medium', 'low', 'none'].forEach(s => { const c = document.createElement('span'); c.className = 'chip'; c.dataset.s = s; c.textContent = SEVN[s]; c.onclick = () => { S.sevOn[s] = S.sevOn[s] ? 0 : 1; recompute(); relayout(false); }; fs.appendChild(c); });
  const fg = $('fGap'); { const c = document.createElement('span'); c.className = 'chip'; c.dataset.g = '1'; c.innerHTML = '⚠ 仅显示覆盖缺口 <small>' + G.stat.gap.length + '</small>'; c.title = '没有直接对应防守事件的攻击事件(虚线环标出),连同与它们仅有弱关联的防守事件'; c.onclick = () => { setGap(!S.gap); }; fg.appendChild(c); }
  const sel = $('fCat'); sel.innerHTML = '<option value="all">全部分类</option>' + CATS.map(c => '<option value="' + c.id + '">' + esc(c.icon || '') + ' ' + esc(c.name) + '</option>').join(''); sel.onchange = () => { S.cat = sel.value; recompute(); relayout(false); fit(); };
  $('legendG').innerHTML = '<div class="lg">' +
    '<div><i style="background:var(--g-event);border-radius:50%"></i>攻击事件</div><div><i style="background:var(--g-defense);border-radius:50%;box-shadow:0 0 0 1.5px #d8fff9"></i>防守事件</div>' +
    '<div><i style="background:var(--g-category)"></i>分类</div><div><i style="background:var(--g-stage);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)"></i>攻击链阶段</div>' +
    '<div><i style="background:var(--g-asset);clip-path:polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0 50%)"></i>资产 / 目标</div><div><i style="background:var(--g-measure);border-radius:50%"></i>通用措施</div>' +
    '<div><i style="background:var(--g-ref);transform:scale(.7)"></i>参考标准</div><div><i style="border:1.5px dashed var(--g-gap);border-radius:50%;background:none"></i>覆盖缺口(缺口视图)</div><div style="color:var(--dim)">大小=严重程度</div>' +
    Object.keys(ET).map(t => '<div><i class="ln' + (ET[t].dash ? ' ds' : '') + '" style="border-color:var(--e-' + t + ')"></i>' + ET[t].name + (t === 'chain' || t === 'mitigate' ? ' →' : '') + '</div>').join('') + '</div>';
  syncChips();
}
function syncChips() {
  document.querySelectorAll('#fType .chip').forEach(c => c.classList.toggle('on', !!S.typeOn[c.dataset.t]));
  document.querySelectorAll('#fEdge .chip').forEach(c => c.classList.toggle('on', !!S.edgeOn[c.dataset.e]));
  document.querySelectorAll('#fSev .chip').forEach(c => c.classList.toggle('on', !!S.sevOn[c.dataset.s]));
  document.querySelectorAll('#fGap .chip').forEach(c => c.classList.toggle('on', !!S.gap));
  $('fCat').value = S.cat; $('gq').value = S.q;
}
function updateChipCounts() { syncChips(); }
function setGap(on) { S.gap = on ? 1 : 0; recompute(); relayout(false); fit(); syncChips(); }

/* ---------- 搜索 ---------- */
function search(q) {
  S.q = q; const t = q.trim().toLowerCase();
  if (!t) $('gqres').textContent = ''; else { const all = nodes.filter(n => n.text.includes(t)), v = all.filter(n => vis.has(n.id)); $('gqres').textContent = '匹配 ' + all.length + ' 个(当前可见 ' + v.length + ')· 回车定位第一个'; }
  kick();
}
function searchEnter() {
  const t = S.q.trim().toLowerCase(); if (!t) return;
  const all = nodes.filter(n => n.text.includes(t)).sort((a, b) => (vis.has(b.id) ? 1 : 0) - (vis.has(a.id) ? 1 : 0) || (a.text.startsWith(t) ? 0 : 1) - (b.text.startsWith(t) ? 0 : 1));
  if (all.length) select(all[0].id, true);
}

/* ---------- 重置 ---------- */
function reset() {
  Object.assign(S, defaults()); S.expanded = new Set(); S.forced = new Set(); S.sel = null; S.layout = 'force'; $('bLayout').textContent = '布局:力导向';
  nodes.forEach(n => { n.x = NaN; n.y = NaN; n.vx = n.vy = 0; n.pin = false; n.tx = n.ty = null; });
  $('gqres').textContent = ''; recompute(); relayout(true); fit(); detail();
  if (history.replaceState) { try { history.replaceState(null, '', location.pathname); } catch (e) {} }
}
$('bReset').onclick = reset; $('bFit').onclick = fit;
$('bLayout').onclick = () => { S.layout = S.layout === 'force' ? 'layered' : 'force'; $('bLayout').textContent = '布局:' + (S.layout === 'force' ? '力导向' : '攻击链分层'); relayout(false); fit(); };
$('bPanel').onclick = () => document.body.classList.toggle('showpanel');
$('gq').addEventListener('input', e => search(e.target.value)); $('gq').addEventListener('keydown', e => { if (e.key === 'Enter') searchEnter(); if (e.key === 'Escape') { e.target.value = ''; search(''); } });
$('glow').oninput = e => { S.glow = e.target.value / 100; $('glowV').textContent = e.target.value + '%'; kick(); };
window.addEventListener('resize', () => { resize(); });
if (window.ResizeObserver) new ResizeObserver(() => resize()).observe($('gcenter'));
window.addEventListener('error', e => { window.__gerrs = (window.__gerrs || []).concat(String(e.message)); });

/* ---------- 启动 ---------- */
chipsInit(); applyGraphTheme(); resize(); recompute(); relayout(true); fit(); detail();
addEventListener('sec-theme', applyGraphTheme);
function fromHash() { const h0 = decodeURIComponent(location.hash.slice(1)); if (h0 === 'gap') { setGap(true); return; } if (h0 && (byId.has(h0) || byId.has('e:' + h0))) select(byId.has(h0) ? h0 : 'e:' + h0, true); }
fromHash(); window.addEventListener('hashchange', fromHash);

window.GRAPH = {
  applyGraphTheme,
  G, S, nodes, edges, select, search, searchEnter, toggleExpand, reset, fit, relayout, recompute,
  setType(t, on) { S.typeOn[t] = on ? 1 : 0; recompute(); relayout(false); }, setEdge(t, on) { S.edgeOn[t] = on ? 1 : 0; recompute(); relayout(false); },
  setGap, gapList() { return G.stat.gap.slice(); },
  setCat(c) { S.cat = c; recompute(); relayout(false); fit(); syncChips(); }, setSev(s, on) { S.sevOn[s] = on ? 1 : 0; recompute(); relayout(false); },
  setLayout(l) { S.layout = l; $('bLayout').textContent = '布局:' + (l === 'force' ? '力导向' : '攻击链分层'); relayout(false); fit(); },
  counts() { const t = {}; vn.forEach(n => t[n.type] = (t[n.type] || 0) + 1); const et = {}; ve.forEach(x => et[x.type] = (et[x.type] || 0) + 1); return { nodes: vn.length, edges: ve.length, byType: t, byEdge: et }; },
  screenPos(id) { const n = byId.get(id), r = cv.getBoundingClientRect(); return n ? { x: r.left + S.view.x + n.x * S.view.k, y: r.top + S.view.y + n.y * S.view.k } : null; },
  emptyPoint() { const r = cv.getBoundingClientRect(); for (let y = 20; y < H - 20; y += 20) for (let x = 20; x < W - 20; x += 20) { if (!nodeAt(x, y) && !vn.some(n => Math.hypot(n.x * S.view.k + S.view.x - x, n.y * S.view.k + S.view.y - y) < 30)) return { x: r.left + x, y: r.top + y }; } return null; },
  layoutStats() { let ov = 0, c = 0; const ev = vn.filter(n => n.type === 'event' || n.type === 'defense'); for (let i = 0; i < ev.length; i++) for (let j = i + 1; j < ev.length; j++) { const d = Math.hypot(ev[i].x - ev[j].x, ev[i].y - ev[j].y); if (d < ev[i].r + ev[j].r) ov++; } let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; vn.forEach(n => { x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); y0 = Math.min(y0, n.y); y1 = Math.max(y1, n.y); }); return { overlaps: ov, w: Math.round(x1 - x0), h: Math.round(y1 - y0), alpha, k: S.view.k }; },
};
})();
