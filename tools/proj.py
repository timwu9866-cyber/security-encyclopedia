pts={'X':[10.5,2.5,-6.5],'Xlabel':[10.5,5.5,-6.5],'leakL':[-12,2.6,-5],'dstRecTop':[7,9.3,0],'srcRec':[-7,9.0,0],'mid':[0,5.2,0],'xl':[-14,0,-5],'dstTag':[7,-0.35,3],'srcTag':[-7,-.35,3],'fan':[13,1.5,-6.7],'hostrow':[4.8,1.5,5.2],'phone':[0,0,5.2],'src':[-7,1,0],'dst':[7,1,0]}
JS="""(pts)=>{const st=ENC.stage,cam=st.cam;const c=document.getElementById('cv').getBoundingClientRect();const out={};for(const k in pts){const p=new THREE.Vector3(...pts[k]).project(cam);out[k]=[Math.round((p.x*.5+.5)*c.width),Math.round((1-(p.y*.5+.5))*c.height)]};return [Math.round(c.width),Math.round(c.height),out]}"""
for w,h in [(1500,900),(1000,800),(800,900)]:
    pg.set_viewport_size({'width':w,'height':h}); pg.wait_for_timeout(500)
    print(w,h,pg.evaluate(JS,pts))
