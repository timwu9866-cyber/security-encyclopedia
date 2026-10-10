import sys
from playwright.sync_api import sync_playwright
log=open('/workspace/security-encyclopedia/shots/uitest.log','w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s); log.write(s+'\n'); log.flush()
def run(url,vw=1440,vh=860):
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--no-sandbox"])
        pg=b.new_page(viewport={'width':vw,'height':vh}); errs=[]
        pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e))); pg.on("console",lambda m:errs.append(m.text) if m.type=="error" else None)
        pg.goto(url); pg.wait_for_timeout(1500)
        P("==",url,vw,vh)
        P("events",pg.evaluate("ENC.events.length"),"total label:",pg.inner_text('#total'),"| cnt:",pg.inner_text('#cnt'))
        # realtime play
        for ids in ['sqli','ddos','waf']:
            pg.evaluate(f"ENC.select(ENC.events.findIndex(e=>e.id=='{ids}'),false)")
            pg.select_option('#speed','3'); pg.click('#bPlay'); pg.wait_for_timeout(3500)
            P("realtime",ids,"t=%.2f"%pg.evaluate("ENC.state.t"),"playing",pg.evaluate("ENC.state.playing"),"stage errs",pg.evaluate("ENC.stage.errors.length"))
            pg.click('#bPlay')
        pg.select_option('#speed','1')
        # search
        pg.fill('#q','注入'); pg.wait_for_timeout(300); P("search 注入 ->",pg.inner_text('#cnt'))
        pg.fill('#q','ddos'); pg.wait_for_timeout(300); P("search ddos ->",pg.inner_text('#cnt'))
        pg.fill('#q',''); pg.wait_for_timeout(300)
        # severity chips
        chips=pg.query_selector_all('#sevs button, #sevs .chip, #sevs *[data-sev]')
        P("sev chips",len(chips))
        for c in chips[:6]:
            c.click(); pg.wait_for_timeout(200); P("  chip",c.inner_text().strip().replace('\n',' '),"->",pg.inner_text('#cnt'))
        if chips: chips[0].click()
        # bloom
        pg.evaluate("(()=>{const s=document.getElementById('bloom');s.value=60;s.dispatchEvent(new Event('input'))})()"); P("bloom",pg.inner_text('#bloomV'))
        pg.evaluate("(()=>{const s=document.getElementById('bloom');s.value=20;s.dispatchEvent(new Event('input'))})()"); P("bloom",pg.inner_text('#bloomV'))
        # list click
        items=pg.query_selector_all('#list .it'); P("list items",len(items))
        if len(items)>5: items[5].click(); pg.wait_for_timeout(300); P("clicked -> title:",pg.inner_text('#title'))
        # category mode
        pg.select_option('#speed','3')
        pg.click('#bCat'); pg.wait_for_timeout(500); c0=pg.evaluate("ENC.state.cur"); m=pg.evaluate("ENC.state.mode")
        pg.evaluate("ENC.state.t=ENC.events[ENC.state.cur].dur-0.2"); pg.wait_for_timeout(1500)
        P("cat mode",m,"cur",c0,"->",pg.evaluate("ENC.state.cur"),"mode",pg.evaluate("ENC.state.mode"),"playing",pg.evaluate("ENC.state.playing"))
        pg.click('#bAll'); pg.wait_for_timeout(500)
        pg.evaluate("ENC.state.t=ENC.events[ENC.state.cur].dur-0.2"); c1=pg.evaluate("ENC.state.cur"); pg.wait_for_timeout(1500)
        P("all demo mode",pg.evaluate("ENC.state.mode"),"cur",c1,"->",pg.evaluate("ENC.state.cur"))
        pg.click('#bHome') if pg.query_selector('#bHome') else None
        # drag pan + wheel
        box=pg.locator('#cv').bounding_box(); cx,cy=box['x']+box['width']/2,box['y']+box['height']/2
        pg.mouse.move(cx,cy); pg.mouse.down(); pg.mouse.move(cx+80,cy+40,steps=5); pg.mouse.up(); pg.mouse.wheel(0,-300); pg.wait_for_timeout(300)
        P("after pan/zoom stage errs",pg.evaluate("ENC.stage.errors.length"))
        P("PAGE ERRORS",errs)
        b.close()
for a in sys.argv[1:]:
    if '@' in a: u,w,h=a.split('@')[0],*a.split('@')[1].split('x'); run(u,int(w),int(h))
    else: run(a)
