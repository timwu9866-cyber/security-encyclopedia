# 滚动条样式验证:getComputedStyle + 像素检查 + 截图
import sys
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:8765/'
R = '/workspace/security-encyclopedia/shots/'
res = []
def ok(n, c, e=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n, e, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', ignore_default_args=['--hide-scrollbars'], args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"])
    for page, url, sels in [('index', 'index.html', ['#list', '#detail']), ('graph', 'graph.html', ['#gleft', '#gdetail'])]:
        pg = b.new_page(viewport={'width': 1440, 'height': 860}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(BASE + url); pg.wait_for_timeout(1500)
        if page == 'graph':
            pg.evaluate('GRAPH.select("e:sqli",true)'); pg.wait_for_timeout(500)
        pg.set_viewport_size({'width': 1440, 'height': 640}); pg.wait_for_timeout(500)
        ok(f'[{page}] color-scheme: dark', pg.evaluate("getComputedStyle(document.documentElement).colorScheme") == 'dark')
        pbar = pg.evaluate("getComputedStyle(document.documentElement,'::-webkit-scrollbar').width")
        ok(f'[{page}] ::-webkit-scrollbar 宽度 8px', pbar == '8px', pbar)
        thumb = pg.evaluate("getComputedStyle(document.querySelector('%s'),'::-webkit-scrollbar-thumb').backgroundColor" % sels[0])
        ok(f'[{page}] 滑块颜色为半透明青色', 'rgba(46, 230, 214' in thumb, thumb)
        ok(f'[{page}] scrollbar-color 未被设置(避免 Chrome 忽略 webkit 样式)', pg.evaluate("getComputedStyle(document.querySelector('%s')).scrollbarColor" % sels[0]) in ('auto', 'normal'))
        for s in sels:
            m = pg.evaluate("(()=>{const e=document.querySelector('%s');return {sh:e.scrollHeight,ch:e.clientHeight,ow:e.offsetWidth-e.clientWidth,x:e.getBoundingClientRect().right}})()" % s)
            ok(f'[{page}] {s} 出现纵向滚动条', m['sh'] > m['ch'] and m['ow'] >= 8, str(m))
            # 像素:滚动条槽区域不应是系统浅色/白色
            r = pg.evaluate("(()=>{const r=document.querySelector('%s').getBoundingClientRect();return {x:r.right-4,y:r.top+r.height/2}})()" % s)
            pg.screenshot(path='/tmp/sb.png', clip={'x': r['x'] - 2, 'y': r['y'] - 150, 'width': 4, 'height': 300})
            from PIL import Image
            im = Image.open('/tmp/sb.png').convert('RGB'); px = list(im.getdata()); mx = max(max(q) for q in px); lum = sum(sum(q) / 3 for q in px) / len(px)
            teal = sum(1 for q in px if q[1] > 100 and q[2] > 90 and q[0] < 90)
            ok(f'[{page}] {s} 滚动条区域像素为深色(平均亮度<90,最大通道<250)', lum < 90 and mx < 250, f'lum={lum:.0f} max={mx} teal_px={teal}')
        # 滚动一下并截图
        pg.evaluate("document.querySelector('%s').scrollTop=200" % sels[0])
        # hover 滑块
        r = pg.evaluate("(()=>{const e=document.querySelector('%s').getBoundingClientRect();return {x:e.right-4,y:e.top+60}})()" % sels[0])
        pg.mouse.move(r['x'], r['y']); pg.wait_for_timeout(300)
        pg.screenshot(path=R + f'scrollbar_{page}.png')
        pg.screenshot(path=R + f'scrollbar_{page}_zoom.png', clip={'x': r['x'] - 120, 'y': r['y'] - 60, 'width': 140, 'height': 300})
        ok(f'[{page}] 无 JS 报错', not errs, str(errs)); pg.close()
    # 窄屏 / 其他可滚动区域:select 弹层与 textarea 的 color-scheme、全局所有可滚动元素
    pg = b.new_page(viewport={'width': 1440, 'height': 640}); pg.goto(BASE + 'index.html'); pg.wait_for_timeout(1000)
    pg.evaluate("document.body.insertAdjacentHTML('beforeend','<textarea id=tx style=\"position:fixed;left:400px;top:100px;width:120px;height:50px\">'+'x\\n'.repeat(30)+'</textarea>')")
    ok('textarea 继承 dark 配色/滚动条', pg.evaluate("getComputedStyle(document.getElementById('tx'),'::-webkit-scrollbar').width") == '8px')
    sc = pg.evaluate("[...document.querySelectorAll('*')].filter(e=>(e.scrollHeight>e.clientHeight+1&&['auto','scroll'].includes(getComputedStyle(e).overflowY))).map(e=>e.id||e.tagName)")
    print('当前可滚动元素:', sc); pg.close(); b.close()
print('SUMMARY pass=%d fail=%d' % (sum(res), len(res) - sum(res)))
