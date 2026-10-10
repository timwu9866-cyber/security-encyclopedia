# 黑屏回归(第二部分):252 事件首帧非黑、图谱跳转、注入故障必须给出提示/自动降级
import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"]
STAT = """()=>{const src=document.getElementById('cv');const c=document.createElement('canvas');c.width=192;c.height=108;const x=c.getContext('2d');x.drawImage(src,0,0,192,108);const d=x.getImageData(0,0,192,108).data;let nb=0,z=0,n=d.length/4;for(let i=0;i<d.length;i+=4){const m=Math.max(d[i],d[i+1],d[i+2]);if(m>40)nb++;if(m<3)z++;}return {nonbg:nb/n,zero:z/n}}"""
res = []
def ok(n, c, e=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n, e, flush=True)
good = lambda s: s['nonbg'] > 0.01 and s['zero'] < 0.9
def newpage(b, w=1440, h=860, dpr=1):
    c = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr); pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:150])); pg.on('console', lambda m: errs.append(m.text[:150]) if m.type == 'error' else None); return pg, errs
vis = lambda pg, sel: pg.evaluate(f"getComputedStyle(document.querySelector('{sel}')).display!=='none'")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    # 1. 252 个事件逐个选中,首帧非黑
    pg, errs = newpage(b); pg.goto(BASE + 'index.html'); pg.wait_for_function('window.ENC'); pg.wait_for_timeout(1200)
    n = pg.evaluate('ENC.events.length'); bad = []; mins = 1
    for i in range(n):
        pg.evaluate(f'ENC.select({i},true)'); pg.wait_for_timeout(120)
        s = pg.evaluate(STAT); mins = min(mins, s['nonbg'])
        if not good(s): bad.append((pg.evaluate(f'ENC.events[{i}].id'), s))
    ok(f'{n} 个事件逐个选中后首帧(0.12s 内)非黑', not bad, f'min nonbg={mins:.3f} bad={bad[:5]}')
    ok('逐个选中无渲染错误', pg.evaluate('ENC.stage.errors.length') == 0, str(pg.evaluate('ENC.stage.errors.slice(0,3)')))
    ok('逐个选中无页面报错', not errs, str(errs[:3])); pg.context.close()
    # 2. 首次加载后立刻点选(不等任何东西)
    pg, errs = newpage(b); pg.goto(BASE + 'index.html', wait_until='commit'); pg.wait_for_selector('#list .it', timeout=20000); pg.locator('#list .it').nth(2).click(); pg.wait_for_timeout(600)
    ok('commit 后立刻点选 0.6s 非黑', good(pg.evaluate(STAT))); pg.context.close()
    # 3. 起始视口极小(容器≈0)后放大
    pg, errs = newpage(b, 120, 90); pg.goto(BASE + 'index.html'); pg.wait_for_function('window.ENC'); pg.wait_for_timeout(500)
    pg.set_viewport_size({'width': 1440, 'height': 860}); pg.wait_for_timeout(300); pg.locator('#list .it').nth(4).click(); pg.wait_for_timeout(1500)
    ok('起始容器极小再放大后选事件 非黑', good(pg.evaluate(STAT)), json.dumps(pg.evaluate(STAT)) + ' errs=' + str(errs[:2])); pg.context.close()
    # 4. 默认进入(无深链)直接展示第一个事件,并自动播放;bloom 默认 20%
    pg, errs = newpage(b); pg.goto(BASE + 'index.html'); pg.wait_for_function('window.ENC'); pg.wait_for_timeout(2500)
    ok('无深链进入:默认选中首个事件并播放且非黑', pg.evaluate('ENC.state.cur') == 0 and pg.evaluate('ENC.state.t') > 1 and good(pg.evaluate(STAT)), f"t={pg.evaluate('ENC.state.t'):.2f}")
    ok('bloom 默认 20%', pg.evaluate("document.getElementById('bloom').value") == '20' and pg.inner_text('#bloomV') == '20%'); pg.context.close()
    # 5. ?safe=1
    pg, errs = newpage(b); pg.goto(BASE + 'index.html?safe=1'); pg.wait_for_function('window.ENC'); pg.wait_for_timeout(1500)
    ok('?safe=1 兼容渲染非黑', pg.evaluate('ENC.stage.safe') is True and good(pg.evaluate(STAT)), json.dumps(pg.evaluate(STAT))); pg.context.close()
    # 6. 故障注入
    # 6a. draw 中抛异常:循环不能死,必须出现提示
    pg, errs = newpage(b); pg.goto(BASE + 'index.html'); pg.wait_for_function('window.ENC'); pg.wait_for_timeout(1000)
    pg.evaluate("()=>{ENC.stage.glow.flush=function(){throw new Error('boom')}}"); pg.locator('#list .it').nth(3).click(); pg.wait_for_timeout(2500)
    ok('故障A(draw 每帧抛异常):播放循环仍在推进', pg.evaluate('ENC.state.t') > 1.0, f"t={pg.evaluate('ENC.state.t'):.2f}")
    ok('故障A:中间显示明确提示', vis(pg, '#nodata') and '渲染' in pg.inner_text('#nodata'), pg.inner_text('#nodata')[:60]); pg.context.close()
    # 6b. 后处理渲染抛异常 -> 自动降级兼容模式
    pg, errs = newpage(b); pg.goto(BASE + 'index.html'); pg.wait_for_function('window.ENC'); pg.wait_for_timeout(800)
    pg.evaluate("()=>{const r=ENC.stage.renderer,o=r.render.bind(r);r.render=function(a,c){if(!ENC.stage.safe)throw new Error('composer-fail');return o(a,c)}}"); pg.locator('#list .it').nth(3).click(); pg.wait_for_timeout(1500)
    ok('故障B(后处理抛异常):自动切到兼容模式且画面非黑', pg.evaluate('ENC.stage.safe') is True and good(pg.evaluate(STAT)), json.dumps(pg.evaluate(STAT)))
    ok('故障B:显示降级提示', vis(pg, '#stnote'), pg.inner_text('#stnote')[:60]); pg.context.close()
    # 6c. 后处理输出全黑(不抛异常) -> 探测到后自动降级
    pg, errs = newpage(b); pg.goto(BASE + 'index.html'); pg.wait_for_function('window.ENC'); pg.wait_for_timeout(800)
    pg.evaluate("()=>{const r=ENC.stage.renderer,o=r.render.bind(r);r.render=function(a,c){if(!ENC.stage.safe){r.setClearColor(0,1);r.clear();return}return o(a,c)}}"); pg.locator('#list .it').nth(3).click(); pg.wait_for_timeout(2500)
    ok('故障C(后处理输出全黑):探测并自动降级后非黑', pg.evaluate('ENC.stage.safe') is True and good(pg.evaluate(STAT)), json.dumps(pg.evaluate(STAT))); pg.context.close()
    # 6d. 上下文丢失 -> 提示;恢复 -> 画面回来
    pg, errs = newpage(b); pg.goto(BASE + 'index.html'); pg.wait_for_function('window.ENC'); pg.wait_for_timeout(1000)
    pg.evaluate("window.__ext=ENC.stage.renderer.getContext().getExtension('WEBGL_lose_context');window.__ext.loseContext()"); pg.wait_for_timeout(800)
    ok('故障D(上下文丢失):显示明确提示', vis(pg, '#nodata') and 'WebGL' in pg.inner_text('#nodata'), pg.inner_text('#nodata')[:60])
    pg.evaluate("window.__ext.restoreContext()"); pg.wait_for_timeout(2500)
    ok('故障D:上下文恢复后提示消失且画面非黑', not vis(pg, '#nodata') and good(pg.evaluate(STAT)), json.dumps(pg.evaluate(STAT)) + ' ' + str(errs[:2])); pg.context.close()
    b.close()
    # 6e. 无 WebGL
    b2 = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=["--disable-gpu", "--disable-3d-apis", "--no-sandbox"])
    pg, errs = newpage(b2); pg.goto(BASE + 'index.html'); pg.wait_for_function('window.ENC !== undefined'); pg.wait_for_timeout(1200)
    ok('故障E(无 WebGL):显示明确提示,列表/详情仍可用', vis(pg, '#nodata') and 'WebGL' in pg.inner_text('#nodata') and pg.locator('#list .it').count() == 252 and 'SQL' in pg.inner_text('#detail') or pg.locator('#detail h2').count() == 1, pg.inner_text('#nodata')[:70])
    pg.locator('#list .it').nth(5).click(); pg.wait_for_timeout(300); ok('故障E:点选事件不报 JS 错误', not [e for e in errs if 'PAGEERR' in e], str(errs[:2])); b2.close()
    # 7. 图谱跳转 + 深链
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    for eid in ['sqli', 'goldenticket', 'promptinj', 'siem']:
        pg, errs = newpage(b); pg.goto(BASE + 'graph.html'); pg.wait_for_function('window.GRAPH'); pg.wait_for_timeout(500)
        pg.evaluate(f'GRAPH.select("e:{eid}",true)'); pg.wait_for_timeout(300)
        with pg.expect_navigation(): pg.click('#bDemo')
        pg.wait_for_function('window.ENC && ENC.state'); pg.wait_for_timeout(2500)
        ok(f'图谱跳转 index.html#{eid}:播放中且非黑', pg.evaluate('ENC.events[ENC.state.cur].id') == eid and pg.evaluate('ENC.state.t') > 0.5 and good(pg.evaluate(STAT)) and not errs, f"{pg.url} t={pg.evaluate('ENC.state.t'):.2f} {errs[:2]}"); pg.context.close()
    pg, errs = newpage(b); pg.goto(BASE + 'index.html#kerberoast'); pg.wait_for_function('window.ENC'); pg.wait_for_timeout(2000)
    ok('index 深链 #kerberoast 非黑', pg.evaluate('ENC.events[ENC.state.cur].id') == 'kerberoast' and good(pg.evaluate(STAT))); pg.click('#bGraph'); pg.wait_for_function('window.GRAPH'); ok('index→graph 入口仍可用', 'graph.html' in pg.url)
    pg.goto(BASE + 'graph.html#kerberoast'); pg.wait_for_function('window.GRAPH'); pg.wait_for_timeout(400); ok('graph 深链仍可用', pg.evaluate('GRAPH.S.sel') == 'e:kerberoast'); pg.context.close()
    b.close()
print('SUMMARY pass=%d fail=%d' % (sum(res), len(res) - sum(res)))
