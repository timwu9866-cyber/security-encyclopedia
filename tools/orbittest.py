#!/usr/bin/env python3
"""节点库详情页轨道控制测试:拖动改角、俯仰限位、滚轮缩放限位、复位/双击复位、触屏、四态同步、监听清理。"""
import json
from playwright.sync_api import sync_playwright
ARGS=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']
R={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS)
    ctx=b.new_context(viewport={'width':1400,'height':900}); pg=ctx.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('http://127.0.0.1:8876/nodes.html'); pg.wait_for_function('window.NODES_PAGE')
    pg.evaluate("NODES_PAGE.openPreview('attacker')"); pg.wait_for_timeout(400)
    O=lambda: pg.evaluate("({az:NODES_PAGE.ORB.az,el:NODES_PAGE.ORB.el*180/Math.PI,zoom:NODES_PAGE.ORB.zoomT,spin:!!NODES_PAGE.ST.spin,lis:NODES_PAGE.orbListeners()})")
    bb=pg.locator('#pvcv').bounding_box(); cx=bb['x']+bb['width']/2; cy=bb['y']+bb['height']/2
    def drag(dx,dy,steps=10):
        pg.mouse.move(cx,cy); pg.mouse.down()
        for i in range(1,steps+1): pg.mouse.move(cx+dx*i/steps, cy+dy*i/steps)
        pg.mouse.up(); pg.mouse.move(cx,cy); pg.wait_for_timeout(500)
    s0=O(); R['listenersOpen']=s0['lis']
    pg.click('#pvSpin'); R['spinOn']=O()['spin']
    drag(200,0); s1=O(); R['azChanged']=abs(s1['az']-s0['az'])>.3; R['spinPausedByDrag']=not s1['spin']
    for _ in range(6): drag(0,250)
    R['elMaxDeg']=round(O()['el'],2)
    for _ in range(8): drag(0,-250)
    R['elMinDeg']=round(O()['el'],2)
    for _ in range(30): pg.mouse.wheel(0,400)
    pg.wait_for_timeout(200); R['zoomMax']=round(O()['zoom'],3)
    for _ in range(40): pg.mouse.wheel(0,-400)
    pg.wait_for_timeout(200); R['zoomMin']=round(O()['zoom'],3)
    pg.click('#pvReset'); s=O(); R['resetBtn']=abs(s['az']-s0['az'])<1e-6 and abs(s['el']-s0['el'])<1e-6 and s['zoom']==1
    drag(150,40); pg.mouse.dblclick(cx,cy); pg.wait_for_timeout(100); s=O(); R['dblclickReset']=abs(s['az']-s0['az'])<1e-6 and abs(s['el']-s0['el'])<1e-6
    pg.click('#pvQuad'); pg.wait_for_timeout(200); drag(250,30)
    R['quadSharedOrbit']=pg.evaluate("document.querySelectorAll('#pvlabels.show').length")==1 and O()['lis']>0
    cdp=ctx.new_cdp_session(pg)
    def t(tp,pts): cdp.send('Input.dispatchTouchEvent',{'type':tp,'touchPoints':[{'x':x,'y':y,'id':i} for i,(x,y) in enumerate(pts)]})
    a0=O()['az']; t('touchStart',[(cx,cy)]); t('touchMove',[(cx+60,cy)]); t('touchMove',[(cx+120,cy)]); t('touchEnd',[]); pg.wait_for_timeout(300)
    R['touchRotate']=abs(O()['az']-a0)>.1
    z0=O()['zoom']; t('touchStart',[(cx-50,cy),(cx+50,cy)])
    for k in range(1,8): t('touchMove',[(cx-50-k*15,cy),(cx+50+k*15,cy)])
    t('touchEnd',[]); pg.wait_for_timeout(300); R['pinchZoom']=[z0,round(O()['zoom'],3)]
    pg.click('#pvBack'); pg.wait_for_timeout(300); R['listenersAfterClose']=O()['lis']
    pg.evaluate("NODES_PAGE.openPreview('pc')"); pg.wait_for_timeout(200); pg.evaluate("NODES_PAGE.setCombo(true)"); pg.wait_for_timeout(300); R['listenersInCombo']=O()['lis']
    R['errors']=errs; b.close()
ok = R['azChanged'] and R['spinPausedByDrag'] and 84.9<R['elMaxDeg']<=85.01 and 4.99<=R['elMinDeg']<5.1 and R['zoomMax']<=2.4 and R['zoomMin']>=.45 and R['resetBtn'] and R['dblclickReset'] and R['touchRotate'] and R['pinchZoom'][1]<R['pinchZoom'][0] and R['listenersAfterClose']==0 and R['listenersInCombo']==0 and not R['errors']
R['PASS']=bool(ok); print(json.dumps(R,ensure_ascii=False,indent=1)); json.dump(R,open('shots/v9/orbittest.json','w'),ensure_ascii=False,indent=1)
