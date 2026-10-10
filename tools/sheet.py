import sys
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
# usage: sheet.py out.png id1,id2 fracs
out=sys.argv[1]; ids=sys.argv[2].split(','); fr=[float(x) for x in sys.argv[3].split(',')]
W,H=640,380
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--no-sandbox"])
    pg=b.new_page(viewport={'width':1280,'height':760}); pg.goto("http://localhost:8765/index.html"); pg.wait_for_timeout(1200)
    sheet=Image.new('RGB',(W*len(fr),H*len(ids)))
    for r,i in enumerate(ids):
        idx=pg.evaluate(f"ENC.events.findIndex(e=>e.id=='{i}')"); d=pg.evaluate(f"ENC.events[{idx}].dur")
        for c,f in enumerate(fr):
            pg.evaluate(f"ENC.seek({idx},{d*f})"); pg.locator('#stage').screenshot(path='/tmp/_s.png')
            im=Image.open('/tmp/_s.png').convert('RGB').resize((W,H)); dr=ImageDraw.Draw(im); dr.text((6,H-14),f"{i} t={d*f:.1f}",fill=(255,255,255)); sheet.paste(im,(c*W,r*H))
    sheet.save(out); print(pg.evaluate("ENC.stage.errors")); b.close()
