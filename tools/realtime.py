# 实时播放测试:用真实播放循环(4× 速)播放若干事件,检查时间推进与渲染错误
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--no-sandbox"])
    pg=b.new_page(viewport={'width':1440,'height':860}); errs=[]
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e)))
    pg.goto("http://localhost:8765/index.html"); pg.wait_for_timeout(1500)
    pg.select_option('#speed','3')
    for i in ['sqli','ddos','waf','promptinj','siem','reentrancy','goldenticket','deceive']:
        pg.evaluate(f"ENC.select(ENC.events.findIndex(e=>e.id=='{i}'),true)"); pg.wait_for_timeout(2500)
        print("realtime",i,"t=%.2f"%pg.evaluate("ENC.state.t"),"playing",pg.evaluate("ENC.state.playing"),"render_errs",pg.evaluate("ENC.stage.errors.length"))
    print("PAGEERRS",errs); b.close()
