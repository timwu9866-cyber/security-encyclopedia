from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
ids=[('sqli',.55),('ddos',.5),('mitm',.5),('ransomware',.6),('bgp',.5),('containerescape',.55),('backdoor',.55),('phishmail',.5),('waf',.5),('zerotrust',.55),('promptinj',.5),('reflectamp',.5),('goldenticket',.55),('aitm',.5),('doubleext',.55),('cicdleak',.5),('siem',.55),('microseg',.55),('deceive',.5),('reentrancy',.5),('indirectinj',.5),('ntlmrelay',.55),('nac',.55),('ueba',.55),('cspdef',.5),('bridge',.5),('badusb',.5),('cardclone',.55),('asm',.55),('memshell',.55),('k8sapi',.5),('signphish',.5),('macflood',.5),('adcs',.55),('dbmask',.55),('honeytoken',.5)]
out='/workspace/security-encyclopedia/shots/'
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--no-sandbox"])
    pg=b.new_page(viewport={'width':1600,'height':900}); errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto("http://localhost:8765/index.html"); pg.wait_for_timeout(1500)
    pg.screenshot(path=out+'00_full_ui_home.png')
    files=[]
    for i,f in ids:
        idx=pg.evaluate(f"ENC.events.findIndex(e=>e.id=='{i}')"); d=pg.evaluate(f"ENC.events[{idx}].dur")
        pg.evaluate(f"ENC.seek({idx},{d*f})"); pg.wait_for_timeout(300)
        pg.screenshot(path=out+f'ui_{i}.png'); pg.locator('#stage').screenshot(path=out+f'stage_{i}.png'); files.append((i,out+f'stage_{i}.png'))
    print(errs, pg.evaluate("ENC.stage.errors")); b.close()
W,H=480,270; cols=6
rows=(len(files)+cols-1)//cols
sheet=Image.new('RGB',(W*cols,H*rows),(10,12,16))
for k,(i,f) in enumerate(files):
    im=Image.open(f).convert('RGB').resize((W,H)); ImageDraw.Draw(im).text((8,H-16),i,fill=(255,255,255)); sheet.paste(im,((k%cols)*W,(k//cols)*H))
sheet.save(out+'contact_sheet.png'); print(sheet.size)
