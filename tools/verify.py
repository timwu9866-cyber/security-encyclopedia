import sys,json,time
from playwright.sync_api import sync_playwright
url=sys.argv[1] if len(sys.argv)>1 else "http://localhost:8765/index.html"
log=open('/workspace/security-encyclopedia/shots/verify.log','w')
def P(*a):
    s=' '.join(str(x) for x in a); print(s); log.write(s+'\n'); log.flush()
STAT="""()=>{const src=ENC.stage.renderer.domElement;const c=document.createElement('canvas');c.width=192;c.height=108;const x=c.getContext('2d');x.drawImage(src,0,0,192,108);const d=x.getImageData(0,0,192,108).data;let nb=0,r=0,cy=0,g=0,n=d.length/4;for(let i=0;i<d.length;i+=4){const R=d[i],G=d[i+1],B=d[i+2];if(Math.max(R,G,B)>40)nb++;if(R>150&&G<110&&B<110)r++;if(G>140&&B>140&&R<110)cy++;if(G>150&&R<120&&B<120)g++;}return [nb/n,r/n,cy/n,g/n]}"""
SIG="""()=>{const src=ENC.stage.renderer.domElement;const c=document.createElement('canvas');c.width=24;c.height=14;const x=c.getContext('2d');x.drawImage(src,0,0,24,14);const d=x.getImageData(0,0,24,14).data;const o=[];for(let i=0;i<d.length;i+=4){o.push(d[i],d[i+1],d[i+2])}return o}"""
sigs={}
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--use-gl=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist","--no-sandbox"])
    pg=b.new_page(viewport={'width':1440,'height':860}); errs=[]
    pg.on("pageerror",lambda e:errs.append("PAGEERR "+str(e))); pg.on("console",lambda m:errs.append("CONSOLE "+m.text) if m.type in("error","warning") else None)
    pg.goto(url); pg.wait_for_timeout(1500)
    n=pg.evaluate("ENC.events.length"); P("url",url,"events",n, "categories",pg.evaluate("SEC_CATS.length") if pg.evaluate("typeof SEC_CATS!='undefined'") else '?')
    fr=[0,0.08,0.2,0.32,0.44,0.56,0.68,0.8,0.9,0.97,1.0]
    bad=0; weak=[]
    for i in range(n):
        e=pg.evaluate(f"(()=>{{const E=ENC.events[{i}];return {{id:E.id,dur:E.dur,name:E.name,nph:E.ph.length,nfx:E.fx.length}}}})()")
        mx=[0,0,0,0]; blank=0; frames=0
        for f in fr:
            pg.evaluate(f"ENC.seek({i},{e['dur']*f})")
            s=pg.evaluate(STAT); frames+=1
            if s[0]<0.01: blank+=1
            mx=[max(a,b2) for a,b2 in zip(mx,s)]
        sg=[]
        for f in (0.45,0.7):
            pg.evaluate(f"ENC.seek({i},{e['dur']*f})"); sg+=pg.evaluate(SIG)
        sigs[e['id']]=sg
        er=pg.evaluate("ENC.stage.errors.slice()")
        if er: bad+=1
        flag=[]
        if blank>2: flag.append(f"blank{blank}")
        if mx[1]+mx[2]+mx[3]<0.0005: flag.append("nocolor")
        if flag: weak.append((e['id'],flag))
        P(f"{i+1:02d} {e['id']:<16} dur={e['dur']:<5} ph={e['nph']} fx={e['nfx']:<3} nonblack_max={mx[0]:.3f} red={mx[1]:.4f} cyan={mx[2]:.4f} green={mx[3]:.4f} errs={len(er)} {flag if flag else ''}")
        if er: P("   ERR",er[:3])
    P("EVENTS_WITH_RENDER_ERRORS",bad,"WEAK",weak)
    order=[pg.evaluate(f"ENC.events[{i}].id") for i in range(n)]
    import math
    ds=[]
    for a,b2 in zip(order,order[1:]):
        va,vb=sigs[a],sigs[b2]; d=math.sqrt(sum((x-y)**2 for x,y in zip(va,vb))/len(va)); ds.append((d,a,b2))
    ds.sort(); P("ADJ_DIST min/median/max %.1f %.1f %.1f"%(ds[0][0],ds[len(ds)//2][0],ds[-1][0]), "(RMS 像素差,0-255;越小越相似)")
    P("ADJ_MOST_SIMILAR",[(round(d,1),a,b2) for d,a,b2 in ds[:12]])
    P("ADJ_BELOW_12",[(round(d,1),a,b2) for d,a,b2 in ds if d<12])
    P("PAGE_ERRORS",errs)
    # real-time playback test of a few events using actual play loop at 4x
    for ids in ['sqli','ddos','waf','promptinj','siem','reentrancy']:
        pg.evaluate(f"ENC.select(ENC.events.findIndex(e=>e.id=='{ids}'))"); 
        pg.select_option('#speed','4') if pg.query_selector('#speed') else None
        pg.click('#bPlay') if pg.query_selector('#bPlay') else None
        pg.wait_for_timeout(3000)
        P("realtime",ids,"t=",pg.evaluate("ENC.state.t"),"playing",pg.evaluate("ENC.state.playing"),"errs",pg.evaluate("ENC.stage.errors.length"))
    P("FINAL_PAGE_ERRORS",errs)
    b.close()
