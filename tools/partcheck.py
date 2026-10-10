#!/usr/bin/env python3
"""按部件(原子)审查 53 个模型:悬空 / 严重穿插 / 贴面偏差与共面 / 朝向 / 超出立方体 / 对称。
用法: python3 tools/partcheck.py [out.json] [--verbose]   (需 8876 服务)"""
import sys, json
from playwright.sync_api import sync_playwright
ARGS=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']
# 故意悬浮/不接触的部件白名单: (type, 规则, 理由)。规则按原子索引或角色+形状匹配,写在 JS 里的 WL 对象。
WL = {
 'c2':       {'tor': '发射弧:信号示意,故意悬在天线上方'},
 'internet': {'tor': '轨道环/经纬环:环绕地球,允许与球面不接触', 'sph:led': '轨道上的卫星指示灯,随轨道悬浮'},
 'botnet':   {'tor': '环形链路示意', 'oct': '被控节点沿环悬浮', 'sph:led': '节点指示灯悬浮', 'box:detail': '辐条连线'},
 'ap':       {'tor': '无线信号弧'},
 'idsips':   {'tor': '探测波纹'},
 'honeypot': {'tor': '诱捕环'},
 'sandbox':  {'sph:led': '被隔离样本:故意悬浮在沙箱笼中央,表达"隔离/不接触"', 'tor': '样本外的隔离光环'},
 'nta':      {'tor': '探测环'},
 'hids':     {'tor': '主机防护环'},
 'sensor':   {'tor': '信号弧'},
 'ipcam':    {'tor': '视野/信号弧'},
 'behavior': {'tor': '轨迹环'},
 'vpngw':    {'tor': '隧道环'},
 'c2_':      {},
}
# lb(左负载均衡体+右服务器组)、mailsrv(侧边信旗)为刻意不对称,不列入
SYM = ['switch','coreswitch','aggswitch','router','websrv','dbsrv','appsrv','storage','firewall','waf','idsips','bastion','attacker','insider','nta','hids','registry','k8snode','printer']
DWL = {
 'aggswitch': {'cyl:detail': '天线:单端固定在机身顶部,向外伸出是设计'},
 'printer': {'4': '出纸托盘:悬臂结构,一边插入机身前面板'},
 'mailsrv': {'box:led': '信箱旗:只有一边与旗杆相连'},
 'router': {'cyl:detail': '天线'}, 'iotgw': {'cyl:detail': '天线'}, 'c2': {'cyl:detail': '天线桅杆:单端固定'},
}  # 脱离父表面白名单 {type:{'shape:role' 或 原子索引:理由}}
PWL = {
 'plc': {'1': 'DIN 导轨:横贯各模块背部,两端伸出属设计'},
}  # 外凸穿插白名单
JS = r"""([WL,SYM,DWL,PWL])=>{
 const L=NODELIB,T=THREE,D=L._debug,out={};
 const vol=b=>{const s=b.getSize(new T.Vector3());return Math.max(0,s.x)*Math.max(0,s.y)*Math.max(0,s.z);};
 const gap=(a,b)=>{const dx=Math.max(0,a.min.x-b.max.x,b.min.x-a.max.x),dy=Math.max(0,a.min.y-b.max.y,b.min.y-a.max.y),dz=Math.max(0,a.min.z-b.max.z,b.min.z-a.max.z);return Math.hypot(dx,dy,dz);};
 const inter=(a,b)=>{const c=a.clone().intersect(b);return c.isEmpty()?0:vol(c);};
 for(const type of L.types()){
  const atoms=D.RSPEC[type].flat();
  const geos=atoms.map(a=>{const b=Object.assign({},a);const g=D.atomGeo(T,b);g.computeBoundingBox();return g;});
  const all=new T.Box3();geos.forEach(g=>all.union(g.boundingBox));
  const raw=all.getSize(new T.Vector3()),k=1/Math.max(raw.x,raw.y,raw.z),cx=(all.min.x+all.max.x)/2,cz=(all.min.z+all.max.z)/2,y0=all.min.y;
  const P=atoms.map((a,i)=>{const g=geos[i];g.translate(-cx,-y0,-cz);g.scale(k,k,k);g.computeBoundingBox();const b=g.boundingBox.clone();
    // 精确体积近似:用几何包围盒;旋转原子标记
    const s=b.getSize(new T.Vector3());
    return {i,role:a.r,s:a.s,g,rot:!!(a.rot&&a.rot.some(v=>Math.abs(v)>1e-6)),b,size:s,v:vol(b),c:b.getCenter(new T.Vector3())};});
  // 凸体平面集(tor 非凸,跳过)
  P.forEach(p=>{ if(p.s==='tor'){p.planes=null;return;} const A=p.g.attributes.position,pl=[];const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    for(let t=0;t<A.count;t+=3){a.fromBufferAttribute(A,t);b.fromBufferAttribute(A,t+1);c.fromBufferAttribute(A,t+2);const n=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a));if(n.lengthSq()<1e-14)continue;n.normalize();pl.push([n,n.dot(a)]);}
    p.planes=pl;});
  const inside=(q,v)=>q.planes&&q.planes.every(([n,d])=>n.dot(v)-d< -2e-4);
  const samples=p=>{const A=p.g.attributes.position,pts=[];for(let t=0;t<A.count;t++)pts.push(new T.Vector3().fromBufferAttribute(A,t));pts.push(p.c.clone());return pts;};
  const wl=WL[type]||{};
  const isWL=p=>wl[p.s]||wl[p.s+':'+p.role]||null;
  const R={floating:[],buried:[],offset:[],coplanar:[],orient:[],range:[],sym:[],detached:[],pierce:[],whitelisted:[]};
  const dwl=DWL[type]||{}, pwl=PWL[type]||{}; const isDWL=p=>dwl[p.i]||dwl[p.s+':'+p.role]||dwl[p.role]||null, isPWL=p=>pwl[p.i]||pwl[p.s+':'+p.role]||pwl[p.role]||null;
  // 1) 悬空:按"包围盒间距<=0.01 即接触"建连通图,不与任何贴地部件连通的分量全部记为悬空
  const adj=P.map(p=>P.filter(q=>q!==p&&gap(p.b,q.b)<=0.01));
  const grounded=new Set(),st=P.filter(p=>p.b.min.y<=0.01); st.forEach(p=>grounded.add(p));
  while(st.length){const p=st.pop();for(const q of adj[p.i]) if(!grounded.has(q)){grounded.add(q);st.push(q);}}
  P.forEach(p=>{ if(grounded.has(p)) return; const alone=!adj[p.i].length; const w=isWL(p);
    if(w) R.whitelisted.push({i:p.i,role:p.role,s:p.s,why:w}); else R.floating.push({i:p.i,role:p.role,s:p.s,y:+p.b.min.y.toFixed(3),group:!alone});});
  // 2) 严重穿插:>=80% 采样点(顶点+中心)严格位于另一个凸部件内部 → 细节被埋看不见
  P.forEach(p=>{ if(p.v<1e-8) return; const pts=samples(p);
    for(const q of P){ if(q===p||!q.planes||q.v<=p.v*0.9||!q.b.intersectsBox(p.b)) continue;
      const f=pts.filter(v=>inside(q,v)).length/pts.length;
      if(f>=0.8){R.buried.push({i:p.i,role:p.role,s:p.s,in:q.i,inRole:q.role,inShape:q.s,frac:+f.toFixed(2)});break;}}});
  const mainAxis=p=>{const A=p.g.attributes.position,v=[];for(let t=0;t<A.count;t+=Math.max(1,(A.count/60)|0))v.push(new T.Vector3().fromBufferAttribute(A,t));let best=0,u=new T.Vector3(1,0,0);for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++){const d=v[i].distanceToSquared(v[j]);if(d>best){best=d;u=new T.Vector3().subVectors(v[j],v[i]).normalize();}}return u;};
  // 8) 脱离父表面:细部角色或小部件,>30% 体积采样点既不在其他部件内部、也不在其表面 0.01 内
  const sdist=(q,v)=>{ if(!q.planes){ // tor: 用包围盒距离近似
      const c=q.b.clampPoint(v,new T.Vector3()); return c.distanceTo(v);} let m=-1e9; for(const [n,d] of q.planes){const x=n.dot(v)-d; if(x>m)m=x;} return m; };
  const volSamples=p=>{const pts=[],N=5,sz=p.size;for(let a=0;a<N;a++)for(let b=0;b<N;b++)for(let c=0;c<N;c++){const v=new T.Vector3(p.b.min.x+sz.x*(a+.5)/N,p.b.min.y+sz.y*(b+.5)/N,p.b.min.z+sz.z*(c+.5)/N);
      if(!p.planes||p.planes.every(([n,d])=>n.dot(v)-d<=1e-6)) pts.push(v);} if(!pts.length) pts.push(p.c.clone()); return pts;};
  P.forEach(p=>{ const dims=[p.size.x,p.size.y,p.size.z].sort((a,b)=>a-b), small=dims[2]<0.08, thin=dims[0]<0.05;
    if(!(small||(['face','port','led','detail'].includes(p.role)&&thin))) return;
    // 支杆:两端分别接触两个不同部件的细长件(结构件)跳过;允许贴片按自身厚度外凸
    const tol=Math.max(0.01,dims[0]+0.005);
    if(p.s==='cyl'||p.s==='box'){ const A=p.g.attributes.position; const u=mainAxis(p); const vs=[];for(let t=0;t<A.count;t++)vs.push(new T.Vector3().fromBufferAttribute(A,t));
      const ds=vs.map(v=>v.dot(u)), lo=Math.min(...ds), hi=Math.max(...ds);
      if(hi-lo>4*dims[0]&&hi-lo>0.12){
      const endC=(t)=>{const sel=vs.filter((v,k)=>Math.abs(ds[k]-t)<0.004);return sel.reduce((a,v)=>a.add(v),new T.Vector3()).multiplyScalar(1/sel.length);};
      const touch=v=>v.y<=0.01||P.some(q=>q!==p&&sdist(q,v)<0.015); if(touch(endC(lo))&&touch(endC(hi))) return; } }
    const pts=volSamples(p); let bad=0;
    for(const v of pts){ let ok=v.y<=tol; if(!ok) for(const q of P){ if(q===p) continue; if(sdist(q,v)<tol){ok=true;break;} } if(!ok) bad++; }
    const f=bad/pts.length; if(f>0.3){ const w=isWL(p)||isDWL(p); if(w) R.whitelisted.push({i:p.i,role:p.role,s:p.s,why:w,check:'detached'}); else R.detached.push({i:p.i,role:p.role,s:p.s,frac:+f.toFixed(2)});}});
  // 9) 外凸穿插:部件 p 穿过主体 q,并在 p 主轴两端都从 q 伸出(贯穿),或同时插入两个互不接触的主体
  P.forEach(p=>{ if(p.role==='base'||!p.planes&&p.s!=='tor') return; const pts=volSamples(p), u=mainAxis(p);
    const hits=[];
    for(const q of P){ if(q===p||!q.planes||!['body','base'].includes(q.role)||q.v<=p.v) continue; if(!q.b.intersectsBox(p.b)) continue;
      const ins=pts.filter(v=>sdist(q,v)<-1e-3); if(ins.length<Math.max(1,pts.length*.08)) continue; hits.push(q);
      const outs=pts.filter(v=>sdist(q,v)>0.01); if(!outs.length) continue;
      const pi=ins.map(v=>v.dot(u)), lo=Math.min(...pi), hi=Math.max(...pi);
      const pr=outs.map(v=>v.dot(u)); const plus=pr.filter(x=>x>hi+0.02).length, minus=pr.filter(x=>x<lo-0.02).length;
      const ds=[p.size.x,p.size.y,p.size.z].sort((a,b)=>a-b); if(ds[2]<ds[1]*2) continue;
      if(plus>=1&&minus>=1){ const w=isPWL(p); if(w) R.whitelisted.push({i:p.i,role:p.role,s:p.s,why:w,check:'pierce'}); else R.pierce.push({i:p.i,role:p.role,s:p.s,through:q.i,throughRole:q.role,note:'贯穿主体两端伸出'}); return; } }
    if(hits.length>=2){ for(let i=0;i<hits.length;i++)for(let j=i+1;j<hits.length;j++) if(gap(hits[i].b,hits[j].b)>0.01){ const w=isPWL(p); if(w) R.whitelisted.push({i:p.i,role:p.role,s:p.s,why:w,check:'pierce'}); else R.pierce.push({i:p.i,role:p.role,s:p.s,through:[hits[i].i,hits[j].i],note:'同时插入两个互不接触的主体'}); return; } }
  });
  // 3) 贴面偏差 / 共面 / 沉没:face/port/led/detail 的薄片(最薄轴<最厚轴*0.35)
  const att=['face','port','led','detail'];
  P.forEach(p=>{ if(!att.includes(p.role)||p.rot||p.s!=='box') return;
    const sz=[p.size.x,p.size.y,p.size.z],ax=sz.indexOf(Math.min(...sz)); if(sz[ax]>Math.max(...sz)*.35) return;
    const key=['x','y','z'][ax];
    // 父部件:与扩张后的包围盒相交、体积更大、非旋转、且在薄轴外的两个方向上包住该片
    const eb=p.b.clone().expandByScalar(.025);
    const cands=P.filter(q=>q!==p&&!q.rot&&q.v>p.v*1.5&&eb.intersectsBox(q.b)&&['x','y','z'].filter(t=>t!==key).every(t=>p.c[t]>=q.b.min[t]-1e-3&&p.c[t]<=q.b.max[t]+1e-3));
    if(!cands.length) return;
    let near=null, cop=null;
    for(const q of cands){ if(q.s!=='box') continue; const s=p.c[key]>=q.c[key]?1:-1,surf=s>0?q.b.max[key]:q.b.min[key],outer=s>0?p.b.max[key]:p.b.min[key],inner=s>0?p.b.min[key]:p.b.max[key];
      const d=s*(outer-surf),g=s*(inner-surf);
      if(Math.abs(d)<2e-4 && q.role!==p.role || Math.abs(d)<2e-4) cop=cop||{q,s,d,g};
      if(!near||Math.abs(g)<Math.abs(near.g)) near={q,s,d,g};}
    if(cop){const {q,s,d}=cop;R.coplanar.push({i:p.i,role:p.role,parent:q.i,parentRole:q.role,axis:(s>0?'+':'-')+key});}
    else if(near&&near.g>0.02){const {q,s,g}=near;R.offset.push({i:p.i,role:p.role,parent:q.i,parentRole:q.role,axis:(s>0?'+':'-')+key,gap:+g.toFixed(4)});}
    if(near) p.attach={parent:near.q,side:near.s,axis:key};
  });
  // 4) 朝向:face/led 贴片若贴在父部件的 -Z 面(背面)且是大面板 → 特征面朝后
  P.forEach(p=>{ if(!['face','led'].includes(p.role)||!p.attach) return;
    if(p.attach.axis==='z'&&p.attach.side<0&&p.size.x*p.size.y>0.003&&p.attach.parent.role!=='led') R.orient.push({i:p.i,role:p.role,note:'特征面贴在父部件背面(-Z)'});});
  // 语义朝向:人物/笔记本
  if(type==='attacker'){ // 屏幕(led 大片)应在人物前方且面向人物(屏在人物 +Z 侧)
    const head=P.filter(p=>p.s==='sph'&&p.role==='body').sort((a,b)=>b.c.y-a.c.y)[0];
    const scr=P.filter(p=>p.role==='led').sort((a,b)=>b.v-a.v)[0];
    if(!(head&&scr&&scr.c.z>head.c.z)) R.orient.push({note:'笔记本屏幕不在人物前方'});
    const eyes=P.filter(p=>p.role==='led'&&p.s==='sph'&&p.c.y>0.4);
    if(eyes.length<2||eyes.some(e=>e.c.z<head.c.z)) R.orient.push({note:'红眼不在兜帽前侧(+Z)'});}
  if(type==='insider'){ const sph=P.filter(p=>p.s==='sph'), head=sph.filter(p=>p.role==='body').sort((a,b)=>b.c.y-a.c.y)[0];
    const hair=sph.filter(p=>p.role==='port').sort((a,b)=>b.v-a.v)[0], eyes=sph.filter(p=>p.role==='port'&&p!==hair);
    if(!head||!hair||hair.c.z>=head.c.z||eyes.length<2||eyes.some(e=>e.c.z<=head.c.z)) R.orient.push({note:'脸/眼点不朝 +Z'});
    const box=P.filter(p=>p.role==='detail'&&p.s==='box').sort((a,b)=>b.v-a.v)[0];
    if(!box||box.c.z<=head.c.z||Math.abs(box.c.x)>0.02) R.orient.push({note:'文件箱不在身体正前方'});}
  // 5) 超出范围
  P.forEach(p=>{ const e=1e-3; if(p.b.min.y<-e||p.b.max.y>1+e||p.b.min.x<-.5-e||p.b.max.x>.5+e||p.b.min.z<-.5-e||p.b.max.z>.5+e) R.range.push({i:p.i,role:p.role,min:p.b.min.toArray().map(v=>+v.toFixed(3)),max:p.b.max.toArray().map(v=>+v.toFixed(3))});});
  // 6) 对称:body/base/face 体积加权的 x 质心偏差
  if(SYM.includes(type)){ let sv=0,sx=0; P.forEach(p=>{if(['body','base','face'].includes(p.role)){sv+=p.v;sx+=p.v*p.c.x;}}); const dx=sx/Math.max(sv,1e-9);
    if(Math.abs(dx)>0.03) R.sym.push({dx:+dx.toFixed(3)});}
  P.forEach(p=>p.g.dispose()); out[type]={atoms:P.length,...R};
 }
 return out;
}"""
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=ARGS); pg=br.new_page()
    pg.goto('http://127.0.0.1:8876/nodes.html'); pg.wait_for_function('window.NODES_PAGE')
    res=pg.evaluate(JS,[WL,SYM,DWL,PWL]); br.close()
CATS=['floating','buried','offset','coplanar','orient','range','sym','detached','pierce']
tot={c:0 for c in CATS}; bad=0
print(f"{'type':12}"+''.join(f'{c[:7]:>8}' for c in CATS)+'   wl')
for t,r in res.items():
    n=[len(r[c]) for c in CATS]
    for c,v in zip(CATS,n): tot[c]+=v
    if sum(n): bad+=1; print(f"{t:12}"+''.join(f'{v:>8}' for v in n)+f"{len(r['whitelisted']):>5}")
print('TOTAL       '+''.join(f'{tot[c]:>8}' for c in CATS))
print('models with issues:',bad,'/',len(res))
if '--verbose' in sys.argv:
    for t,r in res.items():
        for c in CATS:
            for x in r[c]: print(t,c,json.dumps(x,ensure_ascii=False))
out=[a for a in sys.argv[1:] if not a.startswith('--')]
if out: json.dump({'totals':tot,'models':res,'whitelist':WL},open(out[0],'w'),ensure_ascii=False,indent=1)
sys.exit(1 if bad else 0)
