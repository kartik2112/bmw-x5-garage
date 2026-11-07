import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// Procedural cutaway of a turbo inline-six with B58-like proportions (1 unit = 100 mm):
// bore 82 mm, stroke 94.6 mm, rod ~144 mm, bore spacing ~91 mm, firing order 1-5-3-6-2-4.
export function createEngine(host,opts={}){
  const R=0.473,L=1.4435,BORE=0.41,SP=0.91,DECK=R+L+0.36;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(1.75,devicePixelRatio||1));
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();const pm=new THREE.PMREMGenerator(renderer);scene.environment=pm.fromScene(new RoomEnvironment(),0.04).texture;scene.environmentIntensity=.8;
  const cam=new THREE.PerspectiveCamera(30,1,0.1,100);cam.position.set(5.2,4.6,7.6);
  const ctl=new OrbitControls(cam,renderer.domElement);ctl.target.set(0,1.6,0);ctl.enableDamping=true;ctl.enablePan=false;ctl.minDistance=4;ctl.maxDistance=16;ctl.autoRotate=true;ctl.autoRotateSpeed=0.6;
  scene.add(new THREE.HemisphereLight(0xfff4ea,0x3a3029,0.6));const key=new THREE.DirectionalLight(0xffffff,1.6);key.position.set(4,8,6);scene.add(key);
  const steel=new THREE.MeshStandardMaterial({color:0xb9bcc2,metalness:.9,roughness:.28});
  const darkSteel=new THREE.MeshStandardMaterial({color:0x5d6066,metalness:.85,roughness:.35});
  const alu=new THREE.MeshStandardMaterial({color:0xcfd2d6,metalness:.75,roughness:.32});
  const cognac=new THREE.MeshStandardMaterial({color:0x9a5426,metalness:.2,roughness:.45});
  const blockMat=new THREE.MeshPhysicalMaterial({color:0x8f949b,metalness:.3,roughness:.5,transparent:true,opacity:.14,depthWrite:false,side:THREE.DoubleSide});
  const glass=new THREE.MeshPhysicalMaterial({color:0xd8e2ec,metalness:0,roughness:.1,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});
  const xs=[0,1,2,3,4,5].map(i=>(i-2.5)*SP);
  // block, head, cam cover, oil pan (cutaway: translucent shells + cognac outline)
  const shell=(w,h,d,y,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.y=y;scene.add(m);const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color:0xb8733f,transparent:true,opacity:.55}));e.position.copy(m.position);scene.add(e);return m};
  shell(6*SP+0.35,DECK+0.35,1.25,(DECK-0.35)/2,blockMat);
  shell(6*SP+0.35,0.55,1.35,DECK+0.28,blockMat);
  const cover=new THREE.Mesh(new THREE.BoxGeometry(6*SP+0.1,0.32,1.05),new THREE.MeshStandardMaterial({color:0x1b1c1f,metalness:.4,roughness:.55}));cover.position.y=DECK+0.72;scene.add(cover);
  const badge=new THREE.Mesh(new THREE.BoxGeometry(1.6,0.02,0.32),cognac);badge.position.set(0,DECK+0.89,0);scene.add(badge);
  shell(6*SP+0.1,0.55,1.15,-0.95,blockMat);
  // camshafts with lobes
  [-0.25,0.25].forEach(z=>{const cs=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,6*SP,12),darkSteel);cs.rotation.z=Math.PI/2;cs.position.set(0,DECK+0.42,z);scene.add(cs)});
  // liners, pistons, rods, crank
  const liners=[],pistons=[],rods=[],flashes=[],plugs=[];
  const crank=new THREE.Group();scene.add(crank);
  const main=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,6*SP+0.6,20),steel);main.rotation.z=Math.PI/2;crank.add(main);
  const fly=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.95,0.12,48),darkSteel);fly.rotation.z=Math.PI/2;fly.position.x=3*SP+0.45;crank.add(fly);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(0.95,0.035,8,64),cognac);ring.rotation.y=Math.PI/2;ring.position.x=3*SP+0.45;crank.add(ring);
  const pulley=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,0.16,32),darkSteel);pulley.rotation.z=Math.PI/2;pulley.position.x=-3*SP-0.4;crank.add(pulley);
  // crank throws: cyl 1&6 at 0°, 2&5 at 240°, 3&4 at 120° (pistons at TDC phases 0/120/240 for firing 1-5-3-6-2-4)
  const PH=[0,240,120,120,240,0].map(d=>d*Math.PI/180);
  xs.forEach((x,i)=>{
    const th=new THREE.Group();th.position.x=x;th.rotation.x=-PH[i];crank.add(th);
    [-0.2,0.2].forEach(dx=>{const web=new THREE.Mesh(new THREE.BoxGeometry(0.1,R+0.42,0.5),steel);web.position.set(dx,R/2-0.08,0);th.add(web);const cw=new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.38,0.1,24,1,false,Math.PI*0.25,Math.PI*1.5),darkSteel);cw.rotation.z=Math.PI/2;cw.position.set(dx,-0.05,0);th.add(cw)});
    const pin=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,0.5,16),steel);pin.rotation.z=Math.PI/2;pin.position.y=R;th.add(pin);
    const ln=new THREE.Mesh(new THREE.CylinderGeometry(BORE+0.02,BORE+0.02,1.45,32,1,true),glass);ln.position.set(x,DECK-0.72,0);scene.add(ln);liners.push(ln);
    const pg=new THREE.Group();const crown=new THREE.Mesh(new THREE.CylinderGeometry(BORE,BORE,0.42,32),alu);pg.add(crown);
    [0.12,0.06,0.0].forEach(y=>{const rg=new THREE.Mesh(new THREE.TorusGeometry(BORE,0.012,6,32),darkSteel);rg.rotation.x=Math.PI/2;rg.position.y=y+0.03;pg.add(rg)});
    const dish=new THREE.Mesh(new THREE.CylinderGeometry(BORE*0.6,BORE*0.6,0.02,24),darkSteel);dish.position.y=0.21;pg.add(dish);
    scene.add(pg);pistons.push(pg);
    const rod=new THREE.Mesh(new THREE.BoxGeometry(0.1,L,0.16),steel);scene.add(rod);rods.push(rod);
    const big=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,0.18,20),steel);big.rotation.z=Math.PI/2;rod.add(big);big.position.y=-L/2;
    const fl=new THREE.Mesh(new THREE.CylinderGeometry(BORE*0.95,BORE*0.95,0.3,24),new THREE.MeshBasicMaterial({color:0xffa24a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));fl.position.set(x,DECK-0.12,0);scene.add(fl);flashes.push(fl);
    const pl=new THREE.PointLight(0xff9a3c,0,2.2,2);pl.position.set(x,DECK-0.1,0);scene.add(pl);plugs.push(pl);
    const sp=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.5,10),new THREE.MeshStandardMaterial({color:0xe9e9ea,roughness:.3}));sp.position.set(x,DECK+0.3,0);scene.add(sp);
  });
  // twin-scroll turbo on the exhaust side + exhaust manifold
  const turbo=new THREE.Group();turbo.position.set(0.6,DECK-0.4,-1.15);scene.add(turbo);
  const tMat=new THREE.MeshStandardMaterial({color:0x6b6e74,metalness:.8,roughness:.4});
  const snail=new THREE.Mesh(new THREE.TorusGeometry(0.33,0.15,16,40),tMat);turbo.add(snail);
  const snail2=new THREE.Mesh(new THREE.TorusGeometry(0.33,0.15,16,40),new THREE.MeshStandardMaterial({color:0xa4a8ae,metalness:.85,roughness:.3}));snail2.position.z=-0.36;turbo.add(snail2);
  const wheel=new THREE.Group();wheel.position.z=-0.36;turbo.add(wheel);for(let k=0;k<10;k++){const b=new THREE.Mesh(new THREE.BoxGeometry(0.02,0.26,0.08),alu);b.rotation.z=k*Math.PI/5;b.position.set(Math.sin(k*Math.PI/5)*0.1,Math.cos(k*Math.PI/5)*0.1,0);wheel.add(b)}
  xs.forEach(x=>{const r=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.9,12),tMat);r.position.set(x*0.55+0.25,DECK-0.35,-0.85);r.rotation.z=(x>0?-1:1)*0.35;r.rotation.x=Math.PI/2*0.4;scene.add(r)});
  // intake runners on the other side
  xs.forEach(x=>{const r=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.75,12),new THREE.MeshStandardMaterial({color:0x1d1e21,roughness:.6}));r.position.set(x,DECK+0.1,0.95);r.rotation.x=-0.9;scene.add(r)});
  // labels: cylinder numbers floating above
  const lab=document.createElement('div');lab.style.cssText='position:absolute;inset:0;pointer-events:none';host.appendChild(lab);
  const tags=xs.map((x,i)=>{const d=document.createElement('div');d.textContent=i+1;d.style.cssText='position:absolute;left:0;top:0;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;font:600 10px/20px JetBrains Mono,monospace;text-align:center;color:#f5efe8;background:#00000066;border:1px solid #b8733f88;transition:background .08s,box-shadow .08s';lab.appendChild(d);return d});
  // animation state
  let rpm=0,ang=0,last=performance.now(),boost=0,hi=null;const v=new THREE.Vector3();
  const order=[1,5,3,6,2,4];const firePh={1:0,5:120,3:240,6:360,2:480,4:600};
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix();const k=Math.max(1,1.55/cam.aspect);const d=cam.position.clone().sub(ctl.target).normalize().multiplyScalar(10.6*k);cam.position.copy(ctl.target).add(d);ctl.maxDistance=Math.max(16,11*k+4)}
  new ResizeObserver(resize).observe(host);resize();
  renderer.setAnimationLoop(now=>{const dt=Math.min(.05,(now-last)/1000);last=now;
    // slow-motion so the pistons are visible: ~0.6 rev/s at idle, ~3 rev/s near redline
    const revps=rpm>0?0.25+rpm/2600:0;ang=(ang+revps*dt*2*Math.PI)%(4*Math.PI);ctl.autoRotate=true;
    crank.rotation.x=-ang;
    xs.forEach((x,i)=>{const th=ang+PH[i];const py=R*Math.cos(th)+Math.sqrt(L*L-Math.pow(R*Math.sin(th),2));const pinZ=-R*Math.sin(th),pinY=R*Math.cos(th);
      pistons[i].position.set(x,py+0.12,0);
      const mid=new THREE.Vector3(x,(py+pinY)/2,pinZ/2);rods[i].position.copy(mid);rods[i].rotation.set(Math.atan2(-pinZ,py-pinY),0,0);
      const cyl=i+1;const deg=((ang*180/Math.PI)-firePh[cyl]+720)%720;const f=rpm>0&&deg<70?1-deg/70:0;
      flashes[i].material.opacity=f*0.85;plugs[i].intensity=f*6;flashes[i].position.y=py+0.42;
      tags[i].style.background=f>0.2?'#d0782e':'#00000066';tags[i].style.boxShadow=f>0.2?'0 0 14px #ff9a3c':'none'});
    boost+=((rpm>0?Math.min(1,Math.max(0,(rpm-1500)/3500)):0)-boost)*Math.min(1,dt*2);wheel.rotation.z+=dt*(rpm>0?6+boost*40:0);
    ctl.update();renderer.render(scene,cam);
    const w=host.clientWidth,h=host.clientHeight;xs.forEach((x,i)=>{v.set(x,DECK+1.05,0).project(cam);tags[i].style.transform=`translate(${(v.x*.5+.5)*w}px,${(-v.y*.5+.5)*h}px)`});
    if(hi){hi.material.emissive=hi.material.emissive||new THREE.Color();}
  });
  return {setRpm(r){rpm=r},highlight(part){[snail,snail2].forEach(m=>{m.material.emissive=new THREE.Color(part==='turbo'?0x7a3a12:0)})}};
}
