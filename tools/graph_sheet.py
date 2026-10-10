# 生成图谱截图并拼成 graph_contact_sheet.png(需 8765 服务)
import time
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
R='/workspace/security-encyclopedia/shots/'; B='http://localhost:8765/graph.html'
ARGS=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--no-sandbox"]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS,ignore_default_args=['--hide-scrollbars'])
    pg=b.new_page(viewport={'width':1440,'height':860}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    pg.goto(B); pg.wait_for_function('window.GRAPH'); pg.wait_for_timeout(1200)
    pg.screenshot(path=R+'graph-default.png')
    pg.evaluate("GRAPH.select('e:ntlmrelay',true)"); pg.wait_for_timeout(700); pg.screenshot(path=R+'graph-newevent.png')
    pg.evaluate("GRAPH.reset()"); pg.wait_for_timeout(500); pg.evaluate("GRAPH.select('e:cspdef',true)"); pg.wait_for_timeout(700); pg.screenshot(path=R+'graph-defense-pair.png')
    pg.evaluate("GRAPH.reset()"); pg.wait_for_timeout(500); pg.click('#fGap .chip'); pg.wait_for_timeout(900); pg.screenshot(path=R+'graph-gap.png')
    pg.evaluate("GRAPH.reset()"); pg.wait_for_timeout(500); pg.select_option('#fCat','phys'); pg.wait_for_timeout(800); pg.screenshot(path=R+'graph-filter-phys.png')
    pg.evaluate("GRAPH.reset()"); pg.wait_for_timeout(500); pg.click('#bLayout'); pg.wait_for_timeout(1800); pg.screenshot(path=R+'graph-layered.png')
    print('errors',errs); b.close()
names=['graph-default','graph-newevent','graph-defense-pair','graph-gap','graph-filter-phys','graph-layered','graph-selected','graph-expanded','graph-narrow']
W,H=800,450; sh=Image.new('RGB',(W*3,H*3),(10,12,16))
for k,n in enumerate(names):
    im=Image.open(R+n+'.png').convert('RGB').resize((W,H)); ImageDraw.Draw(im).text((8,H-16),n,fill=(255,255,255)); sh.paste(im,((k%3)*W,(k//3)*H))
sh.save(R+'graph_contact_sheet.png'); print(sh.size)
