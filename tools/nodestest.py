# 节点模型库:日/夜画廊、放大预览、四态对比、全部节点缩略图合集、剪影去重
import json, sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8876/'
OUT = '/workspace/security-encyclopedia/shots/'
ARGS = ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']
rep = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=ARGS)
    for theme, tag in (('dark','night'),('light','day')):
        ctx = b.new_context(viewport={'width':1920,'height':1080})
        ctx.add_init_script(f"localStorage.setItem('sec-theme','{theme}')")
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        pg.on('console', lambda m: errs.append(m.text[:200]) if m.type=='error' else None)
        pg.goto(BASE+'nodes.html', wait_until='load'); pg.wait_for_function('window.NODES_PAGE'); pg.wait_for_timeout(500)
        pg.screenshot(path=OUT+f'nodes-gallery-{tag}-1920.png')
        cells = pg.evaluate("document.querySelectorAll('.cell').length")
        # blank-thumb check: each cell canvas must differ from its own corner
        blank = pg.evaluate("""()=>[...document.querySelectorAll('.cell')].filter(c=>{const cv=c.querySelector('canvas'),x=cv.getContext('2d'),d=x.getImageData(0,0,cv.width,cv.height).data;const r0=d[0],g0=d[1],b0=d[2];let n=0;for(let i=0;i<d.length;i+=16){if(Math.abs(d[i]-r0)+Math.abs(d[i+1]-g0)+Math.abs(d[i+2]-b0)>60)n++;}return n<150;}).map(c=>c.dataset.t)""")
        pg.click('.cell[data-t="firewall"]'); pg.wait_for_timeout(700)
        pg.screenshot(path=OUT+f'nodes-preview-firewall-{tag}.png')
        pg.evaluate("NODES_PAGE.setQuad(true)"); pg.wait_for_timeout(900)
        pg.screenshot(path=OUT+f'nodes-states-firewall-{tag}.png')
        pg.evaluate("NODES_PAGE.openPreview('websrv'); NODES_PAGE.setQuad(true)"); pg.wait_for_timeout(900)
        pg.screenshot(path=OUT+f'nodes-states-websrv-{tag}.png')
        pg.click('#pvBack'); pg.wait_for_timeout(200)
        pg.click('#bView'); pg.wait_for_timeout(1500)
        pg.screenshot(path=OUT+f'nodes-combo-{tag}-1920.png')
        rep.setdefault('combo',{})[theme]=pg.evaluate("({nodes:NODES_PAGE.CB.nodes.length, links:NODES_PAGE.CB.links.length, zones:NODES_PAGE.CB.zones.length, states:NODES_PAGE.CB.nodes.map(n=>n.state).filter(s=>s!='normal')})")
        pg.click('#bView'); pg.wait_for_timeout(300)
        pg.set_viewport_size({'width':800,'height':900}); pg.wait_for_timeout(400)
        pg.screenshot(path=OUT+f'nodes-gallery-{tag}-800.png')
        rep[theme] = {'cells': cells, 'blankThumbs': blank, 'errors': errs[:5], 'bodyTheme': pg.evaluate("document.body.dataset.theme")}
        if theme == 'dark':
            m = pg.evaluate("""()=>{const L=NODELIB, ts=L.types(), M=ts.map(t=>NODES_PAGE.mask(t,96)); const res=[];
              for(let i=0;i<ts.length;i++)for(let j=i+1;j<ts.length;j++){let a=0,u=0;for(let k=0;k<M[i].length;k++){const x=M[i][k],y=M[j][k];if(x&&y)a++;if(x||y)u++;}res.push([u?a/u:1,ts[i],ts[j]]);}
              res.sort((p,q)=>q[0]-p[0]); const area=ts.map((t,i)=>[t,M[i].reduce((s,v)=>s+v,0)]); return {top:res.slice(0,8), emptyMasks:area.filter(a=>a[1]<40)};}""")
            rep['silhouette'] = m
        ctx.close()
    # contact sheet: all nodes, night + day side by side via page canvases
    for theme, tag in (('dark','night'),('light','day')):
        ctx = b.new_context(viewport={'width':1600,'height':1200})
        ctx.add_init_script(f"localStorage.setItem('sec-theme','{theme}')")
        pg = ctx.new_page(); pg.goto(BASE+'nodes.html', wait_until='load'); pg.wait_for_function('window.NODES_PAGE'); pg.wait_for_timeout(400)
        data = pg.evaluate("""()=>{const cells=[...document.querySelectorAll('.cell')];const cols=8,w=200,h=200,rows=Math.ceil(cells.length/cols);
          const c=document.createElement('canvas');c.width=cols*w;c.height=rows*h;const x=c.getContext('2d');
          x.fillStyle=getComputedStyle(document.body).backgroundColor;x.fillRect(0,0,c.width,c.height);
          cells.forEach((el,i)=>{const cv=el.querySelector('canvas');const cx=(i%cols)*w,cy=Math.floor(i/cols)*h;x.drawImage(cv,cx,cy,w,w*cv.height/cv.width);
            x.fillStyle=getComputedStyle(document.body).color;x.font='15px sans-serif';x.textAlign='center';x.fillText(el.querySelector('.nm').childNodes[1].textContent+' · '+el.dataset.t,cx+w/2,cy+h-12);});
          return c.toDataURL('image/png');}""")
        import base64
        open(OUT+f'nodes-sheet-all-{tag}.png','wb').write(base64.b64decode(data.split(',')[1]))
        ctx.close()
    b.close()
print(json.dumps(rep, ensure_ascii=False, indent=1))
