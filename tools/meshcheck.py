#!/usr/bin/env python3
"""对 53 个模型逐个做几何检测:退化三角、异常长边、越界顶点、面/顶点法线夹角>60°。
用法: python3 tools/meshcheck.py [out.json]  (需 8876 端口服务)"""
import sys, json
from playwright.sync_api import sync_playwright
ARGS=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']
JS = r"""()=>{
 const L=NODELIB,T=THREE,D=L._debug,res={};
 for(const type of L.types()){
  const atoms=D.RSPEC[type].flat();
  // 参考包围盒:用原始图元(rbox 视为普通盒),经同样的归一变换
  const ref=atoms.map(a=>{const b=Object.assign({},a); if(b.s==='rbox') b.s='box'; const g=D.atomGeo(T,b); g.computeBoundingBox(); const bb=g.boundingBox.clone(); g.dispose(); return bb;});
  const all=new T.Box3(); ref.forEach(b=>all.union(b));
  const raw=all.getSize(new T.Vector3()), k=1/Math.max(raw.x,raw.y,raw.z), cx=(all.min.x+all.max.x)/2, cz=(all.min.z+all.max.z)/2, y0=all.min.y;
  const boxes=ref.map(b=>{const o=b.clone(); o.translate(new T.Vector3(-cx,-y0,-cz)); o.min.multiplyScalar(k); o.max.multiplyScalar(k); const e=1e-3; o.expandByScalar(e); return {b:o,diag:o.getSize(new T.Vector3()).length()};});
  const m=D.buildModel(T,type); const c={degenerate:0,longEdge:0,outside:0,normal:0,tris:0};
  const a=new T.Vector3(),b=new T.Vector3(),cc=new T.Vector3(),fn=new T.Vector3(),vn=new T.Vector3(),e1=new T.Vector3(),e2=new T.Vector3();
  for(const p of m.parts){
   const P=p.geo.attributes.position,N=p.geo.attributes.normal,I=p.geo.index;
   const nt=I?I.count/3:P.count/3; c.tris+=nt;
   for(let t=0;t<nt;t++){
    const ids=[0,1,2].map(j=>I?I.getX(t*3+j):t*3+j);
    a.fromBufferAttribute(P,ids[0]);b.fromBufferAttribute(P,ids[1]);cc.fromBufferAttribute(P,ids[2]);
    e1.subVectors(b,a);e2.subVectors(cc,a);fn.crossVectors(e1,e2);const area=fn.length()/2;
    if(area<1e-8){c.degenerate++;continue;}
    fn.normalize();
    // 寻找同时包含三个顶点的原子
    const owner=boxes.filter(x=>x.b.containsPoint(a)&&x.b.containsPoint(b)&&x.b.containsPoint(cc));
    if(!owner.length){c.outside++;}
    const maxE=Math.max(a.distanceTo(b),b.distanceTo(cc),cc.distanceTo(a));
    const diag=owner.length?Math.max(...owner.map(x=>x.diag)):Math.max(...boxes.map(x=>x.diag));
    if(maxE>diag+1e-4) c.longEdge++;
    let bad=false; for(const id of ids){ vn.fromBufferAttribute(N,id).normalize(); if(fn.dot(vn)<Math.cos(Math.PI/3)) bad=true; }
    if(bad) c.normal++;
   }
  }
  c.total=c.degenerate+c.longEdge+c.outside+c.normal; res[type]=c;
 }
 return res;
}"""
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS); pg=br.new_page()
    pg.goto('http://127.0.0.1:8876/nodes.html'); pg.wait_for_function('window.NODES_PAGE')
    r=pg.evaluate(JS); br.close()
bad=0
print(f"{'type':14}{'tris':>6}{'degen':>7}{'long':>6}{'out':>6}{'norm':>6}{'total':>7}")
for t,c in r.items():
    print(f"{t:14}{c['tris']:>6}{c['degenerate']:>7}{c['longEdge']:>6}{c['outside']:>6}{c['normal']:>6}{c['total']:>7}")
    bad+= c['total']>0
print('models with issues:',bad,'/',len(r))
if len(sys.argv)>1: json.dump(r,open(sys.argv[1],'w'),indent=1)
sys.exit(1 if bad else 0)
