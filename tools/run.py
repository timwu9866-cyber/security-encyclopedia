import sys
from playwright.sync_api import sync_playwright
url=sys.argv[1]; script=sys.argv[2]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--no-sandbox"])
    pg=b.new_page(viewport={'width':1440,'height':860}); errs=[]
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e))); pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
    pg.goto(url); pg.wait_for_timeout(1500)
    exec(open(script).read())
    print("errors",errs)
    b.close()
