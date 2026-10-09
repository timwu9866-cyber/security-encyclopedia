/* app.js — 页面逻辑:分类/搜索/筛选、播放控制、详情面板 */
(function () {
'use strict';
const $ = id => document.getElementById(id), S = window.SEC;
const SEV = { critical: '严重', high: '高危', medium: '中危', low: '低危', none: '防御' };
const CATS = window.SEC_CATS, EVS = window.SEC_EVENTS.slice();
const catOf = id => CATS.find(c => c.id === id);
EVS.sort((a, b) => CATS.findIndex(c => c.id === a.cat) - CATS.findIndex(c => c.id === b.cat));
EVS.forEach((e, i) => { e.idx = i; });
const ST = { cur: -1, t: 0, playing: false, speed: 1, mode: 'single', sev: 'all', q: '', filtered: EVS.slice(), collapsed: {} };
let stage = null;
function showStatus(k, msg) {
  const n = $('nodata'), b = $('stnote');
  if (k === 'fail' || k === 'lost') { n.style.display = 'flex'; n.innerHTML = ''; const d = document.createElement('div'); d.className = 'nd'; d.textContent = '⚠ ' + msg; n.appendChild(d); b.style.display = 'none'; }
  else if (k === 'safe') { n.style.display = 'none'; b.style.display = 'block'; b.textContent = 'ℹ ' + msg; }
  else { n.style.display = 'none'; if (k === 'ok' || k === 'restored') b.style.display = k === 'ok' ? 'none' : b.style.display; }
}

function init() {
  $('total').innerHTML = `共 <b>${EVS.length}</b> 种事件 · ${CATS.length} 个分类`;
  try { stage = new S.Stage($('cv'), $('stage')); stage.onstatus = showStatus; } catch (e) { showStatus('fail', '无法初始化 WebGL:' + e.message + '。请开启浏览器硬件加速或换用最新版 Chrome / Edge;其余内容(列表、详情、字幕)仍可浏览。'); console.error(e); }
  // 严重程度筛选
  const sv = $('sevs'); [['all', '全部'], ['critical', '严重'], ['high', '高危'], ['medium', '中危'], ['low', '低危'], ['none', '防御']].forEach(([k, n]) => {
    const d = document.createElement('span'); d.className = 'chip' + (k === 'all' ? ' on' : ''); d.dataset.s = k; d.textContent = n; d.onclick = () => { ST.sev = k; [...sv.children].forEach(c => c.classList.toggle('on', c === d)); refilter(); }; sv.appendChild(d);
  });
  $('q').oninput = () => { ST.q = $('q').value.trim().toLowerCase(); refilter(); };
  $('bPlay').onclick = () => { if (!ST.playing && ST.t >= dur() - 0.01) ST.t = 0; ST.playing = !ST.playing; sync(); };
  $('bReplay').onclick = () => { ST.t = 0; ST.playing = true; sync(); };
  $('bPrev').onclick = () => step(-1); $('bNext').onclick = () => step(1);
  $('scrub').oninput = () => { ST.t = $('scrub').value / 100; ST.playing = false; sync(); };
  $('speed').onchange = () => { ST.speed = +$('speed').value; };
  $('bAll').onclick = () => { ST.mode = ST.mode === 'all' ? 'single' : 'all'; if (ST.mode === 'all') { if (!ST.filtered.length) return; select(ST.filtered[0].idx, true); } sync(); };
  $('bCat').onclick = () => { ST.mode = ST.mode === 'cat' ? 'single' : 'cat'; if (ST.mode === 'cat') { ST.t = 0; ST.playing = true; } sync(); };
  $('bHome').onclick = () => stage && stage.resetView();
  const bl = $('bloom'); bl.value = 20; const setB = () => { stage && stage.setBloom(bl.value / 100); $('bloomV').textContent = bl.value + '%'; }; bl.oninput = setB; setB();
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'search') return; const k = e.key;
    if (k === ' ') { e.preventDefault(); $('bPlay').click(); } else if (k === 'r' || k === 'R') $('bReplay').click(); else if (k === 'ArrowRight') { ST.t = Math.min(dur(), ST.t + 0.5); ST.playing = false; sync(); } else if (k === 'ArrowLeft') { ST.t = Math.max(0, ST.t - 0.5); ST.playing = false; sync(); } else if (k === ']') step(1); else if (k === '[') step(-1); else if (k === 'h' || k === 'H') $('bHome').click();
  });
  renderList();
  const h = decodeURIComponent(location.hash.slice(1)); const ev = EVS.find(e => e.id === h) || EVS[0]; if (ev) select(ev.idx, true);
  addEventListener('sec-theme', e => { if (stage && stage.applyTheme) stage.applyTheme(e.detail); });
  requestAnimationFrame(loop);
}
const cur = () => EVS[ST.cur];
const dur = () => cur() ? cur().dur : 1;
function refilter() {
  const q = ST.q;
  ST.filtered = EVS.filter(e => (ST.sev === 'all' || e.sev === ST.sev) && (!q || (e.name + ' ' + e.en + ' ' + e.id + ' ' + e.stage + ' ' + e.principle + ' ' + (e.kw || '') + ' ' + catOf(e.cat).name).toLowerCase().includes(q)));
  renderList();
}
function renderList() {
  const L = $('list'); L.innerHTML = ''; $('cnt').textContent = `显示 ${ST.filtered.length} / 共 ${EVS.length} 种事件`;
  CATS.forEach(c => {
    const items = ST.filtered.filter(e => e.cat === c.id); if (!items.length) return;
    const h = document.createElement('div'); h.className = 'cat' + (cur() && cur().cat === c.id ? ' cur' : ''); h.dataset.c = c.id; h.innerHTML = `<span>${c.icon} ${c.name} <small>${c.en}</small></span><small>${ST.collapsed[c.id] ? '▸' : '▾'} ${items.length}</small>`;
    h.onclick = () => { ST.collapsed[c.id] = !ST.collapsed[c.id]; renderList(); }; L.appendChild(h);
    if (ST.collapsed[c.id]) return;
    items.forEach(e => {
      const d = document.createElement('div'); d.className = 'it' + (e.idx === ST.cur ? ' on' : ''); d.dataset.i = e.idx;
      d.innerHTML = `<span class="sv ${e.sev}" title="${SEV[e.sev]}"></span><span class="nm"><b>${e.name}</b><i>${e.en}</i></span>`;
      d.onclick = () => { ST.mode = 'single'; select(e.idx, true); }; L.appendChild(d);
    });
  });
}
function select(i, play) {
  const e = EVS[i]; if (!e) return; ST.cur = i; ST.t = 0; ST.playing = !!play; location.hash = e.id;
  if (stage) { try { stage.load(e); } catch (err) { console.error(err); stage.errors.push('load: ' + err.message); } }
  $('scrub').max = Math.round(e.dur * 100); renderTicks(); renderDetail(e);
  $('title').innerHTML = `<b>${e.name}</b><span>${e.en}</span>`;
  [...document.querySelectorAll('.it')].forEach(d => d.classList.toggle('on', +d.dataset.i === i));
  [...document.querySelectorAll('.cat')].forEach(d => d.classList.toggle('cur', d.dataset.c === e.cat));
  const on = document.querySelector('.it.on'); if (on) on.scrollIntoView({ block: 'nearest' });
  sync();
  if (stage) { try { stage.draw(0); } catch (err) { console.error(err); } }
}
function step(d) {
  const L = ST.mode === 'cat' ? ST.filtered.filter(e => e.cat === cur().cat) : ST.filtered; if (!L.length) return;
  let k = L.findIndex(e => e.idx === ST.cur); k = (k + d + L.length) % L.length; select(L[k].idx, true);
}
function phaseOf(e, t) { let k = 0; e.ph.forEach((p, i) => { if (t >= p[0]) k = i; }); return k; }
function renderTicks() {
  const e = cur(), T = $('ticks'); T.innerHTML = '';
  e.ph.forEach((p, i) => { const s = document.createElement('span'); s.textContent = i + 1; s.style.left = (p[0] / e.dur * 100) + '%'; s.title = p[1]; s.onclick = () => { ST.t = p[0] + 0.02; ST.playing = false; sync(); }; T.appendChild(s); });
}
function renderDetail(e) {
  const c = catOf(e.cat);
  $('detail').innerHTML = `<h2>${e.name}</h2><div class="en">${e.en}</div>
  <div class="badges"><span class="badge">${c.icon} ${c.name}</span><span class="badge sev-${e.sev}">${e.sev === 'none' ? '防御措施' : '严重程度:' + SEV[e.sev]}</span><span class="badge">链路阶段:${e.stage}</span></div>
  <h3>源 / 目标含义</h3><div class="roles"><div class="role s"><b>源节点 · ${e.src.n}</b>${e.src.d}</div><div class="role d"><b>目标节点 · ${e.dst.n}</b>${e.dst.d}</div></div>
  <h3>原理简述</h3><p>${e.principle}</p>
  <h3>典型表现 / 危害</h3><p>${e.impact}</p>
  <p style="margin:8px 0"><a class="navbtn" id="lnkGraph" href="graph.html#${e.id}" title="在知识图谱中查看该事件的阶段、缓解与串联关系">✦ 在知识图谱中查看</a></p>
  <h3>防御要点</h3><ul>${e.defense.map(x => `<li>${x}</li>`).join('')}</ul>
  ${e.refs && e.refs.length ? `<h3>参考</h3><ul>${e.refs.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
  <h3>动效时间线</h3><ul class="tl" id="tl">${e.ph.map((p, i) => `<li data-i="${i}" class="${p[2] === 'atk' ? 'atk' : p[2] === 'def' ? 'def' : ''}"><time>${p[0].toFixed(1)}s</time><span>${p[1]}</span></li>`).join('')}</ul>
  <div class="note">纯概念示意:所有“恶意输入”均为占位表现,不含任何可直接利用的载荷、exploit 或命令。仅用于安全意识与防御教育。</div>`;
  [...$('tl').children].forEach(li => li.onclick = () => { ST.t = e.ph[+li.dataset.i][0] + 0.02; ST.playing = false; sync(); });
  $('detail').scrollTop = 0;
}
function sync() {
  const e = cur(); if (!e) return; const k = phaseOf(e, ST.t), p = e.ph[k];
  $('scrub').value = Math.round(ST.t * 100); $('scrub').style.setProperty('--p', (ST.t / e.dur * 100) + '%');
  $('tm').textContent = `${ST.t.toFixed(1)} / ${e.dur.toFixed(1)} 秒`; $('cap').textContent = p[1]; $('cap').className = p[2] || '';
  [...$('ticks').children].forEach((s, i) => s.classList.toggle('act', i === k));
  const tl = $('tl'); if (tl) [...tl.children].forEach((li, i) => li.classList.toggle('act', i === k));
  $('bPlay').textContent = ST.playing ? '❚❚ 暂停' : '▶ 播放';
  $('bAll').classList.toggle('on', ST.mode === 'all'); $('bCat').classList.toggle('on', ST.mode === 'cat');
  $('mode').textContent = ST.mode === 'all' ? `全部演示中 ${ST.filtered.findIndex(x => x.idx === ST.cur) + 1}/${ST.filtered.length}` : ST.mode === 'cat' ? `连播「${catOf(e.cat).name}」` : '';
}
let last = performance.now(), holdUntil = 0;
let loopErrs = 0;
function loop(now) {
  try {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (ST.playing && cur() && now > holdUntil) {
      ST.t += dt * ST.speed;
      if (ST.t >= dur()) {
        ST.t = dur();
        if (ST.mode === 'all') { const k = ST.filtered.findIndex(x => x.idx === ST.cur); if (k >= 0 && k < ST.filtered.length - 1) { select(ST.filtered[k + 1].idx, true); holdUntil = now + 600; } else { ST.mode = 'single'; ST.playing = false; } }
        else if (ST.mode === 'cat') { const L = ST.filtered.filter(x => x.cat === cur().cat), k = L.findIndex(x => x.idx === ST.cur); if (k < L.length - 1) { select(L[k + 1].idx, true); holdUntil = now + 600; } else { ST.mode = 'single'; ST.playing = false; } }
        else ST.playing = false;
      }
      sync();
    }
    if (stage && cur()) stage.draw(ST.t);
  } catch (err) {
    // 任何一帧出错都不能让整个播放循环停止
    loopErrs++; if (loopErrs < 20) console.error(err);
    if (stage) stage.errors.push('loop: ' + err.message);
    if (loopErrs === 30) showStatus('fail', '渲染循环反复出错:' + err.message);
  }
  requestAnimationFrame(loop);
}
window.ENC = { events: EVS, state: ST, select, seek(i, t) { if (i !== ST.cur) select(i, false); ST.t = t; ST.playing = false; sync(); stage.draw(t); }, get stage() { return stage; } };
init();
})();
