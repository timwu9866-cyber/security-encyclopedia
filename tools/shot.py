import sys,json
from playwright.sync_api import sync_playwright
# usage: shot.py url idx t1,t2,... out_prefix
url,idx,ts,pre=sys.argv[1:5]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--no-sandbox"])
    pg=b.new_page(viewport={'width':1280,'height':720}); errs=[]
    pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
    pg.goto(url); pg.wait_for_timeout(1500)
    pg.evaluate(f"ld({idx})")
    for t in ts.split(','):
        pg.evaluate(f"dr({t})"); pg.screenshot(path=f"{pre}_{t}.png")
    print("errors",errs, pg.evaluate("st.errors"))
    b.close()
