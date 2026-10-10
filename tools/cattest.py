import json
from playwright.sync_api import sync_playwright
ARGS=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']
EXP={'all':53,'net':7,'office':10,'sec':11,'srv':9,'cn':5,'iot':6,'ext':5}
NAME={'all':'节点模型库','cn':'云原生','net':'网络设备','office':'办公设备','sec':'安全设备','srv':'服务器 / 云','iot':'终端 / IoT / 工控','ext':'攻击者 / 外部'}
res=[]; fails=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    for theme in ('dark','light'):
        ctx=b.new_context(viewport={'width':1600,'height':950}); ctx.add_init_script(f"localStorage.setItem('sec-theme','{theme}')")
        pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)[:200])); pg.on('console',lambda m:errs.append(m.text[:200]) if m.type=='error' else None)
        pg.goto('http://127.0.0.1:8876/nodes.html'); pg.wait_for_function('window.NODES_PAGE'); pg.wait_for_timeout(300)
        def enter(view):
            pg.click('.ct[data-c="all"]'); pg.wait_for_timeout(150)
            if view=='detail': pg.click('.cell[data-t="pc"]')
            elif view=='quad': pg.click('.cell[data-t="pc"]'); pg.wait_for_timeout(150); pg.click('#pvQuad')
            elif view=='combo': pg.click('#bView')
            pg.wait_for_timeout(350)
        for view in ('gallery','detail','quad','combo'):
            for cat,n in EXP.items():
                enter(view); e0=len(errs)
                pg.click(f'.ct[data-c="{cat}"]'); pg.wait_for_timeout(250)
                s=pg.evaluate("""()=>({cells:document.querySelectorAll('#gallery .cell').length, pv:document.getElementById('pv').classList.contains('show'),
                  combo:document.getElementById('combo').classList.contains('show'), hash:location.hash, on:[...document.querySelectorAll('.ct.on')].map(x=>x.dataset.c),
                  h2:document.querySelector('#detail h2').textContent, sel:NODES_PAGE.ST.sel, cb:!!NODES_PAGE.CB.scene})""")
                ok = s['cells']==n and not s['pv'] and not s['combo'] and s['hash']=='#cat='+cat and s['on']==[cat] and s['h2']==NAME[cat] and s['sel'] is None and not s['cb'] and len(errs)==e0
                res.append((theme,view,cat,s['cells'],ok))
                if not ok: fails.append((theme,view,cat,s,errs[e0:]))
                if theme=='dark' and view=='detail' and cat=='sec': pg.screenshot(path='/workspace/security-encyclopedia/shots/nodes-catfix-detail-to-sec.png')
        # back button: gallery sec -> detail pc -> back => sec gallery; back again => previous cat
        pg.click('.ct[data-c="office"]'); pg.wait_for_timeout(150); pg.click('.ct[data-c="sec"]'); pg.wait_for_timeout(150)
        pg.click('.cell[data-t="firewall"]'); pg.wait_for_timeout(300)
        pg.go_back(); pg.wait_for_timeout(300); b1=pg.evaluate("[location.hash,document.querySelectorAll('#gallery .cell').length,document.getElementById('pv').classList.contains('show')]")
        pg.go_back(); pg.wait_for_timeout(300); b2=pg.evaluate("[location.hash,document.querySelectorAll('#gallery .cell').length]")
        pg.go_forward(); pg.wait_for_timeout(300); b3=pg.evaluate("[location.hash,document.querySelectorAll('#gallery .cell').length]")
        print(theme,'back',b1,b2,b3,'errs',errs[:3])
        if b1!=['#cat=sec',11,False] or b2!=['#cat=office',10] or b3!=['#cat=sec',11]: fails.append((theme,'history',b1,b2,b3))
        ctx.close()
    b.close()
print('pass',sum(r[4] for r in res),'/',len(res))
for f in fails[:8]: print('FAIL',f)
json.dump(res,open('/workspace/security-encyclopedia/shots/nodes-catfix-matrix.json','w'))
