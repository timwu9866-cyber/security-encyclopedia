# 黑屏回归:多视口 / DPR / 访问方式 / 操作顺序,选事件后 0s、5s、10s 用像素统计确认中间画布非黑
import sys, json, time
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
QUICK = '--quick' in sys.argv
ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"]
STAT = """()=>{const src=document.getElementById('cv');const c=document.createElement('canvas');c.width=192;c.height=108;const x=c.getContext('2d');x.drawImage(src,0,0,192,108);const d=x.getImageData(0,0,192,108).data;let nb=0,z=0,n=d.length/4;for(let i=0;i<d.length;i+=4){const m=Math.max(d[i],d[i+1],d[i+2]);if(m>40)nb++;if(m<3)z++;}return {nonbg:nb/n,zero:z/n,cw:src.width,ch:src.height,cssw:src.clientWidth,cssh:src.clientHeight}}"""
res = []
def ok(n, c, e=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n, e, flush=True)
def page(b, w, h, dpr, errs):
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr)
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); return pg
def good(s): return s['nonbg'] > 0.01 and s['zero'] < 0.9
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    vps = [(1920, 1080, 1), (1440, 860, 1), (800, 900, 1), (1920, 1080, 1.25), (1440, 860, 2), (1280, 720, 1.5)]
    if QUICK: vps = vps[:3]
    for (w, h, dpr) in vps:
        tag = f'{BASE.split("//")[1][:22]} {w}x{h}@{dpr}'
        # 场景1:无深链,加载后立刻点选(不等待)
        errs = []; pg = page(b, w, h, dpr, errs); pg.goto(BASE + 'index.html', wait_until='domcontentloaded')
        pg.wait_for_selector('#list .it', timeout=20000)
        pg.locator('#list .it').nth(1).click()   # 立刻点第二个
        outs = []
        for wait in (300, 5000, 10000):
            pg.wait_for_timeout(wait if wait < 1000 else wait - (0 if not outs else 0) if False else wait); outs.append(pg.evaluate(STAT))
        pg.screenshot(path=f'/tmp/bc_{w}x{h}_{dpr}.png')
        ok(f'[{tag}] 立刻点选 +0.3s/+5s/+15s 非黑', all(good(s) for s in outs), json.dumps([round(s['nonbg'], 3) for s in outs]) + f" canvas={outs[0]['cw']}x{outs[0]['ch']} css={outs[0]['cssw']}x{outs[0]['cssh']}")
        ok(f'[{tag}] bloom 默认 20%', pg.evaluate("document.getElementById('bloom').value") == '20' and pg.inner_text('#bloomV') == '20%')
        ok(f'[{tag}] 时间在推进', pg.evaluate('ENC.state.t') > 1 or not pg.evaluate('ENC.state.playing'))
        ok(f'[{tag}] 无报错', not errs, str(errs[:3])); pg.context.close()
        if QUICK: continue
        # 场景2:先点列表,再点播放;上一个/下一个
        errs = []; pg = page(b, w, h, dpr, errs); pg.goto(BASE + 'index.html'); pg.wait_for_timeout(1500)
        pg.locator('#list .it').nth(5).click(); pg.click('#bPlay'); pg.wait_for_timeout(1200); s1 = pg.evaluate(STAT)
        pg.click('#bNext'); pg.wait_for_timeout(1200); s2 = pg.evaluate(STAT); pg.click('#bPrev'); pg.wait_for_timeout(1200); s3 = pg.evaluate(STAT)
        ok(f'[{tag}] 列表→播放→下一个→上一个 非黑', all(good(s) for s in (s1, s2, s3)), str([round(s['nonbg'], 3) for s in (s1, s2, s3)]))
        # 场景3:快速切换 + 缩放窗口
        for k in range(12): pg.locator('#list .it').nth(k * 7).click(); pg.wait_for_timeout(60)
        pg.set_viewport_size({'width': max(700, w - 300), 'height': max(600, h - 200)}); pg.wait_for_timeout(1000); s4 = pg.evaluate(STAT)
        pg.set_viewport_size({'width': w, 'height': h}); pg.wait_for_timeout(1000); s5 = pg.evaluate(STAT)
        ok(f'[{tag}] 快速切换+改窗口大小 非黑,画布随尺寸', good(s4) and good(s5) and abs(s5['cssw'] - s4['cssw']) > 50, f"{round(s4['nonbg'],3)} {round(s5['nonbg'],3)} css {s4['cssw']}->{s5['cssw']}")
        ok(f'[{tag}] 无报错(场景2/3)', not errs, str(errs[:3])); pg.context.close()
    b.close()
print('SUMMARY pass=%d fail=%d' % (sum(res), len(res) - sum(res)))
