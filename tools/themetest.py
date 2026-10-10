# 日间/夜间截图、对比度、252 首帧、图谱点击与缺口。仅测试用。
import json, sys
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8876/'
OUT = '/workspace/security-encyclopedia/shots/'
ARGS = ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']
CONTRAST_JS = r'''
() => {
  function lum(r,g,b){const f=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)}
  function parse(c){const m=c.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(',').map(s=>parseFloat(s)); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}
  function bgOf(el){let e=el; while(e){const c=parse(getComputedStyle(e).backgroundColor); if(c&&c.a>0.5) return c; e=e.parentElement} return {r:255,g:255,b:255,a:1}}
  const sels=['.brand','header button','#bTheme','#q','#list .it .nm b','#list .it .nm','#detail h2','#detail','#cap','#tl .chip','#sv','#cnt','.legend','#dBody h2','#dBody','#tip','#gstat','#fGap .chip','select','#cv'];
  const out=[];
  for (const s of sels){
    const el=document.querySelector(s); if(!el) continue;
    const cs=getComputedStyle(el); const fg=parse(cs.color); const bg=bgOf(el); if(!fg) continue;
    const L1=lum(fg.r,fg.g,fg.b), L2=lum(bg.r,bg.g,bg.b);
    const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    out.push({s, ratio:+ratio.toFixed(2), fg:cs.color, bg:`rgb(${bg.r|0},${bg.g|0},${bg.b|0})`, t:(el.innerText||'').slice(0,18)});
  }
  return out;
}
'''
NODES_JS = r'''
() => {
  const r = ENC.stage.renderer, gl = r.getContext(), c = r.domElement;
  const fails = []; let satMin = 1e9, satId = '';
  const n = ENC.events.length;
  for (let i = 0; i < n; i++) {
    ENC.seek(i, 0);
    const w = c.width, h = c.height;
    const ww = 240, hh = 140;
    const x = Math.max(0, (w - ww) >> 1), y = Math.max(0, (h - hh) >> 1);
    const buf = new Uint8Array(ww * hh * 4);
    gl.readPixels(x, y, ww, hh, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let sat = 0, dark = 0, samples = 0;
    for (let p = 0; p < buf.length; p += 16) {
      const R = buf[p], G = buf[p+1], B = buf[p+2];
      const mx = Math.max(R,G,B), mn = Math.min(R,G,B);
      if (mx - mn > 36 && mx > 36) sat++;
      if (mx < 14) dark++;
      samples++;
    }
    if (sat < satMin) { satMin = sat; satId = ENC.events[i].id; }
    if (sat < 25) fails.push(ENC.events[i].id + ':sat' + sat);
    if (dark > samples * 0.8) fails.push(ENC.events[i].id + ':black');
  }
  return { n, failN: fails.length, fails: fails.slice(0, 25), satMin, satId, errs: (ENC.stage.errors||[]).slice(0,6), day: !!SEC.day, bg: '#'+ENC.stage.scene.background.getHexString() };
}
'''
def main():
    report = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
        # first visit follows prefers-color-scheme, nothing stored
        for scheme, expect in (('light','light'),('dark','dark')):
            ctx = b.new_context(viewport={'width':1200,'height':800}, color_scheme=scheme)
            pg = ctx.new_page()
            pg.goto(BASE+'index.html', wait_until='domcontentloaded')
            pg.wait_for_timeout(400)
            got = pg.evaluate("document.documentElement.getAttribute('data-theme')")
            report['prefers_'+scheme] = {'got': got, 'ok': got==expect}
            ctx.close()
        # screenshots + contrast + toggle
        for theme in ('light','dark'):
            for w,h,tag in ((1920,1080,'1920'),(800,900,'800')):
                ctx = b.new_context(viewport={'width':w,'height':h}, color_scheme='dark')
                ctx.add_init_script(f"localStorage.setItem('sec-theme','{theme}')")
                pg = ctx.new_page()
                pg.goto(BASE+'index.html', wait_until='domcontentloaded')
                pg.wait_for_function('window.ENC && ENC.stage')
                pg.wait_for_timeout(700)
                name = f'theme-index-{"day" if theme=="light" else "night"}-{tag}.png'
                pg.screenshot(path=OUT+name)
                if tag=='1920':
                    report['contrast_index_'+theme] = pg.evaluate(CONTRAST_JS)
                    report['theme_attr_'+theme] = pg.evaluate("({html:document.documentElement.dataset.theme, body:document.body.dataset.theme, btn:document.getElementById('bTheme').textContent, ls:localStorage.getItem('sec-theme')})")
                ctx.close()
            ctx = b.new_context(viewport={'width':1920,'height':1080})
            ctx.add_init_script(f"localStorage.setItem('sec-theme','{theme}')")
            pg = ctx.new_page()
            for w,tag in ((1920,'1920'),(800,'800')):
                pg.set_viewport_size({'width':w,'height':900 if w==800 else 1080})
                if w==1920:
                    pg.goto(BASE+'graph.html', wait_until='domcontentloaded')
                    pg.wait_for_function('window.GRAPH')
                    pg.wait_for_timeout(900)
                else:
                    pg.wait_for_timeout(300)
                name = f'theme-graph-{"day" if theme=="light" else "night"}-{tag}.png'
                pg.screenshot(path=OUT+name)
            if theme=='light':
                pg.set_viewport_size({'width':1920,'height':1080})
                # click a node via API and via real canvas click
                info = pg.evaluate("""() => {
                  const id = 'e:sqli';
                  GRAPH.select(id, true);
                  const t = document.getElementById('dBody').innerText.slice(0,80);
                  return {sel: t, theme: document.body.dataset.theme};
                }""")
                pg.wait_for_timeout(200)
                pg.screenshot(path=OUT+'theme-graph-day-select-1920.png')
                pos = pg.evaluate("GRAPH.screenPos('e:xss')")
                if pos:
                    pg.mouse.click(pos['x'], pos['y'])
                    pg.wait_for_timeout(250)
                clicked = pg.evaluate("document.getElementById('dBody').innerText.slice(0,60)")
                pg.evaluate("GRAPH.setGap(true)")
                pg.wait_for_timeout(400)
                gap = pg.evaluate("({n:GRAPH.counts().nodes, gap:GRAPH.S.gap, stat:document.getElementById('gstat').innerText})")
                pg.screenshot(path=OUT+'theme-graph-day-gap-1920.png')
                report['graph_day'] = {'api': info, 'clickText': clicked, 'gap': gap}
                report['contrast_graph_light'] = pg.evaluate(CONTRAST_JS)
            ctx.close()
        # toggle without reload
        ctx = b.new_context(viewport={'width':1280,'height':800}, color_scheme='dark')
        ctx.add_init_script("localStorage.setItem('sec-theme','dark')")
        pg = ctx.new_page()
        pg.goto(BASE+'index.html', wait_until='domcontentloaded')
        pg.wait_for_function('window.ENC && ENC.stage')
        pg.wait_for_timeout(500)
        before = pg.evaluate("ENC.stage.scene.background.getHexString()")
        pg.click('#bTheme')
        pg.wait_for_timeout(400)
        after = pg.evaluate("""() => ({
          html: document.documentElement.dataset.theme,
          body: document.body.dataset.theme,
          bg: ENC.stage.scene.background.getHexString(),
          day: !!SEC.day,
          ls: localStorage.getItem('sec-theme'),
          btn: document.getElementById('bTheme').textContent
        })""")
        pg.reload(wait_until='domcontentloaded')
        pg.wait_for_timeout(400)
        persist = pg.evaluate("document.documentElement.dataset.theme")
        report['toggle'] = {'before': before, 'after': after, 'afterReload': persist}
        ctx.close()
        # 252 first frames, day
        ctx = b.new_context(viewport={'width':1280,'height':800}, color_scheme='light')
        ctx.add_init_script("localStorage.setItem('sec-theme','light')")
        pg = ctx.new_page()
        pg.set_default_timeout(180000)
        pg.goto(BASE+'index.html', wait_until='domcontentloaded')
        pg.wait_for_function('window.ENC && ENC.events && ENC.events.length>=252')
        pg.wait_for_timeout(600)
        report['nodes'] = pg.evaluate(NODES_JS)
        ctx.close()
        b.close()
    print(json.dumps(report, ensure_ascii=False, indent=2))
if __name__ == '__main__':
    main()
