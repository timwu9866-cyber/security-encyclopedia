#!/usr/bin/env python3
"""四视角审查图: 每行一个模型(正/侧/俯/背),每张 9 个模型。用法: viewsheet.py OUTDIR TAG [types,comma] [--views f,s,t,b]"""
import sys, base64, os
from playwright.sync_api import sync_playwright
ARGS=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']
out, tag = sys.argv[1], sys.argv[2]
only = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] and not sys.argv[3].startswith('--') else None
os.makedirs(out, exist_ok=True)
JS = r"""async ([theme, types, per, CW, CH, tag])=>{
 const T=THREE,L=NODELIB,G=SECGROUND,day=theme==='light';
 const r=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true}); L.prepareRenderer(r); r.setPixelRatio(1); r.setSize(CW,CH,false);
 const V=[['正面',0,.32],['侧面(+X)',Math.PI/2,.32],['俯视',0.35,1.45],['背面',Math.PI,.32]];
 const sheets=[]; types=types||L.types();
 for(let s0=0;s0<types.length;s0+=per){
  const list=types.slice(s0,s0+per), cv=document.createElement('canvas'); cv.width=CW*4+150; cv.height=CH*list.length+30;
  const x=cv.getContext('2d'); x.fillStyle=day?'#c3ccd8':'#05080f'; x.fillRect(0,0,cv.width,cv.height);
  x.font='bold 15px sans-serif'; x.fillStyle=day?'#123':'#cde';
  V.forEach((v,j)=>x.fillText(v[0]+'  '+tag+' '+theme,150+j*CW+8,20));
  list.forEach((type,i)=>{
   const n=L.createNode(type,{theme}); n.setState('normal'); n.update(1.3);
   x.fillStyle=day?'#123':'#cde'; x.font='bold 14px sans-serif'; x.fillText(type,8,30+i*CH+CH/2);
   x.font='12px sans-serif'; x.fillText((L.SPEC&&L.SPEC[type]&&L.SPEC[type].name)||'',8,30+i*CH+CH/2+18);
   V.forEach((v,j)=>{
    const sc=new T.Scene(); sc.background=new T.Color(G.BG[day?'light':'dark']); const g=G.makeGrid(T); G.setDay(T,g,day); sc.add(g); L.addLights(sc,theme);
    sc.add(n.group);
    const h=n.bounds.height, ty=h*.42, dist=2.3;
    const cam=new T.PerspectiveCamera(30,CW/CH,.05,100);
    if(v[2]>1.4){cam.position.set(0.0001,ty+dist,0.12);} else cam.position.set(Math.sin(v[1])*Math.cos(v[2])*dist,ty+Math.sin(v[2])*dist,Math.cos(v[1])*Math.cos(v[2])*dist);
    cam.lookAt(0,ty*(v[2]>1.4?0:1),0);
    if(L.fitLabels) L.fitLabels(sc,cam,CH,15);
    r.render(sc,cam); x.drawImage(r.domElement,150+j*CW,30+i*CH);
    sc.remove(n.group); g.geometry.dispose(); g.material.dispose();
   });
   x.strokeStyle=day?'#8895a5':'#1c2638'; x.strokeRect(0,30+i*CH,cv.width,CH);
   n.dispose();
  });
  sheets.push(cv.toDataURL('image/png'));
 }
 r.dispose(); return sheets;
}"""
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS); pg=br.new_page(viewport={'width':1400,'height':900})
    pg.goto('http://127.0.0.1:8876/nodes.html'); pg.wait_for_function('window.NODES_PAGE')
    for theme in ('dark','light'):
        sh=pg.evaluate(JS,[theme,only,9,250,215,tag])
        for i,d in enumerate(sh):
            fn=f'{out}/{tag}-{theme}-{i+1}.png'; open(fn,'wb').write(base64.b64decode(d.split(',')[1])); print(fn)
    br.close()
