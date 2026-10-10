# 只算画面签名(不跑完整 verify):python tools/adjcheck.py  → /tmp/sigs.json(id→签名),并输出新事件相邻指标
import sys, json, math
from playwright.sync_api import sync_playwright
SIG="""()=>{const src=ENC.stage.renderer.domElement;const c=document.createElement('canvas');c.width=24;c.height=14;const x=c.getContext('2d');x.drawImage(src,0,0,24,14);const d=x.getImageData(0,0,24,14).data;const o=[];for(let i=0;i<d.length;i+=4){o.push(d[i],d[i+1],d[i+2])}return o}"""
url = 'http://localhost:8765/index.html'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"])
    pg = b.new_page(viewport={'width': 1440, 'height': 860}); pg.goto(url); pg.wait_for_timeout(1500)
    n = pg.evaluate('ENC.events.length'); order = []; sigs = {}
    for i in range(n):
        d = pg.evaluate(f'ENC.events[{i}].dur'); order.append(pg.evaluate(f'ENC.events[{i}].id')); sg = []
        for f in (0.45, 0.7):
            pg.evaluate(f'ENC.seek({i},{d*f})'); sg += pg.evaluate(SIG)
        sigs[order[-1]] = sg
    b.close()
json.dump({'order': order, 'sigs': sigs}, open('/tmp/sigs.json', 'w'))
print('events', n)
