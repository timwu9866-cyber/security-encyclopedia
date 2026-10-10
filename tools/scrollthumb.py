from playwright.sync_api import sync_playwright
from PIL import Image
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',ignore_default_args=['--hide-scrollbars'],args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"])
    for url,sels in [('index.html',['#list','#detail']),('graph.html',['#gleft','#gdetail'])]:
        pg=b.new_page(viewport={'width':1440,'height':640}); pg.goto('http://localhost:8765/'+url); pg.wait_for_timeout(1500)
        if 'graph' in url: pg.evaluate('GRAPH.select("e:sqli",true)'); pg.wait_for_timeout(400)
        for s in sels:
            m=pg.evaluate("(()=>{const e=document.querySelector('%s');const r=e.getBoundingClientRect();const th=Math.max(20,e.clientHeight*e.clientHeight/e.scrollHeight);return {x:r.right-1-4,y:r.top+th/2+1,top:r.top}})()"%s)
            def px():
                pg.screenshot(path='/tmp/t.png',clip={'x':m['x']-1,'y':m['y']-1,'width':3,'height':3}); return Image.open('/tmp/t.png').convert('RGB').getpixel((1,1))
            pg.mouse.move(700,300); pg.wait_for_timeout(250); a=px()
            pg.mouse.move(m['x'],m['y']); pg.wait_for_timeout(350); h=px()
            print(url,s,'thumb normal',a,'hover',h)
        pg.close()
    b.close()
