import sys,json
from playwright.sync_api import sync_playwright
url="http://localhost:8765/index.html"
only=sys.argv[1] if len(sys.argv)>1 else None
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--no-sandbox"])
    pg=b.new_page(viewport={'width':1280,'height':720}); errs=[]
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e))); pg.on("console",lambda m:errs.append(m.text) if m.type=="error" and '404' not in m.text else None)
    pg.goto(url); pg.wait_for_timeout(1500)
    n=pg.evaluate("ENC.events.length"); print("events",n)
    for i in range(n):
        e=pg.evaluate(f"({{id:ENC.events[{i}].id,dur:ENC.events[{i}].dur}})")
        if only and only not in e['id']: continue
        pg.evaluate(f"ENC.state.mode='single'")
        res=pg.evaluate(f"""(()=>{{const E=ENC.events[{i}];ENC.seek({i},0);const out=[];const d=E.dur;for(const f of [0.03,0.15,0.3,0.45,0.6,0.75,0.9,1.0]){{ENC.seek({i},d*f);}};return ENC.stage.errors.slice(0,3)}})()""")
        for t in ([float(x) for x in sys.argv[2].split(',')] if len(sys.argv)>2 else []):
            pg.evaluate(f"ENC.seek({i},{t})"); pg.screenshot(path=f"/tmp/ev_{e['id']}_{t}.png")
        if res: print("ERR",e['id'],res)
    print("PAGE ERRORS",errs, pg.evaluate("ENC.stage.errors"))
    b.close()
