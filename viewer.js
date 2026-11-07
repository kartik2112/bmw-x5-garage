import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

export async function createViewer(host, opts={}){
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(opts.pr||Math.min(1.75,window.devicePixelRatio||1));
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();opts.onLost&&opts.onLost()});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=0.82;
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const pm=new THREE.PMREMGenerator(renderer);
  const envTex=pm.fromScene(new RoomEnvironment(),0.04).texture; scene.environment=envTex;
  const camera=new THREE.PerspectiveCamera(32,1,0.1,200);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=.08; controls.minDistance=4; controls.maxDistance=26;
  controls.maxPolarAngle=Math.PI*0.495; controls.enablePan=false; controls.autoRotateSpeed=0.8;
  const hemi=new THREE.HemisphereLight(0xfff8f0,0x8f857a,0.35); scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff6ec,1.7); sun.position.set(3,11,4); sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024); Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:1,far:30}); sun.shadow.radius=6; sun.shadow.bias=-0.0004; scene.add(sun);
  const rim=new THREE.DirectionalLight(0xcfe0ff,0.9); rim.position.set(-6,5,-6); scene.add(rim); const fill=new THREE.DirectionalLight(0xffffff,0.35); fill.position.set(2,2,-8); scene.add(fill); scene.environmentIntensity=0.65;
  // ground: shadow catcher + soft AO blob
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.28})); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
  const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'); const rg=g.createRadialGradient(128,128,10,128,128,128); rg.addColorStop(0,'rgba(0,0,0,.55)'); rg.addColorStop(.55,'rgba(0,0,0,.25)'); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=rg; g.fillRect(0,0,256,256);
  const blob=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false})); blob.rotation.x=-Math.PI/2; blob.position.y=0.002; scene.add(blob);

  const loader=new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const st=opts.stage||(()=>{});st('fetching model');opts.onProgress&&opts.onProgress(.3);
  const b64=(await import('./x5model.js')).default; opts.onProgress&&opts.onProgress(.7);
  st('decoding');const raw=atob(b64);const bin=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bin[i]=raw.charCodeAt(i);st('parsing');
  const gltf=await new Promise((res,rej)=>loader.parse(bin.buffer,'',res,rej)); opts.onProgress&&opts.onProgress(1);
  const car=gltf.scene;
  // normalize scale: real length 4.935 m
  car.updateMatrixWorld(true);
  let box=new THREE.Box3().setFromObject(car); let size=box.getSize(new THREE.Vector3());
  const longAxis=size.x>size.z?'x':'z'; const s=4.935/Math.max(size.x,size.z); car.scale.multiplyScalar(s);
  car.updateMatrixWorld(true); box.setFromObject(car); const ctr=box.getCenter(new THREE.Vector3());
  car.position.sub(new THREE.Vector3(ctr.x,box.min.y,ctr.z)); car.updateMatrixWorld(true);
  const root=new THREE.Group(); scene.add(root); root.add(car);
  // gather parts by top-level node name
  const parts={}; const rn=car.getObjectByName('RootNode')||car;
  const key=n=>{if(/Ani_Wheel_Caliper/.test(n))return 'Caliper';if(/Ani_|SK_Tyre/.test(n))return 'Wheel';const m=n.match(/(SK|SM)_([A-Za-z]+(?:_[A-Z]{1,2})?)_101/);return m?m[2]:'other'};
  [...rn.children].forEach(o=>{const k=key(o.name);(parts[k]=parts[k]||[]).push(o)});
  const bbOf=arr=>{const b=new THREE.Box3();arr.forEach(o=>b.expandByObject(o));return b};
  // front direction: engine relative to center
  const eng=bbOf(parts.Engine||[]); const fwdAxis=longAxis; const front=Math.sign(eng.getCenter(new THREE.Vector3())[fwdAxis])||1;
  // rotate root so front points +x (side view nice): compute yaw
  const yaw = fwdAxis==='z' ? (front>0? Math.PI/2 : -Math.PI/2) : (front>0?0:Math.PI);
  root.rotation.y=yaw; root.updateMatrixWorld(true);
  // materials
  const paint=new THREE.MeshPhysicalMaterial({color:0x010102,metalness:0.0,roughness:0.14,clearcoat:1,clearcoatRoughness:0.03,envMapIntensity:0.3});
  const cognac=new THREE.Color(opts.leather||0x8a4a22);
  const mats={};
  car.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const m=o.material;const nm=(m.name||'');mats[nm]=(mats[nm]||0)+1;
    if(/CARPAINT/i.test(nm)){o.material=paint}
    else if(/LEATHER/i.test(nm)){let p=o,sw=false;while(p){if(/Body_Bones/.test(p.name)){sw=true;break}p=p.parent}if(sw){o.material=m.clone();o.material.color=new THREE.Color(0x131313);o.material.map=null;o.material.roughness=.55}else{m.color=cognac.clone();if(m.map){m.map=null};m.roughness=.6;m.needsUpdate=true}}
  });
  // pivots
  const W=v=>v; // world helpers
  function pivotFor(arr,hinge){const p=new THREE.Group();scene.add(p);p.position.copy(hinge);p.updateMatrixWorld(true);arr.forEach(o=>p.attach(o));return p}
  // after yaw, front is +x in world. lateral = z. left side (driver, US) when facing +x: +? facing +x, left is -z.
  const hb=bbOf(parts.Hood||[]); const hood=parts.Hood&&pivotFor(parts.Hood,new THREE.Vector3(hb.min.x,hb.max.y,(hb.min.z+hb.max.z)/2));
  const tb=bbOf(parts.Trunk||[]);
  // split the one-piece tailgate into the X5's upper liftgate and lower drop-down tailgate
  const thr=tb.min.y+(tb.max.y-tb.min.y)*0.235; /* shut line just below the X5 / xDrive40i badges */ const upperObjs=[],lowerObjs=[];
  const lowB=new THREE.Box3(),upB=new THREE.Box3();const tmp=new THREE.Vector3(),a=new THREE.Vector3(),b2=new THREE.Vector3(),c2=new THREE.Vector3();
  (parts.Trunk||[]).forEach(top=>{const meshes=[];top.traverse(m=>{if(m.isMesh)meshes.push(m)});
    meshes.forEach(m=>{const g=m.geometry,pos=g.attributes.position;const idx=g.index?g.index.array:[...Array(pos.count).keys()];
      const up=[],lo=[];for(let i=0;i<idx.length;i+=3){a.fromBufferAttribute(pos,idx[i]).applyMatrix4(m.matrixWorld);b2.fromBufferAttribute(pos,idx[i+1]).applyMatrix4(m.matrixWorld);c2.fromBufferAttribute(pos,idx[i+2]).applyMatrix4(m.matrixWorld);
        const cy=(a.y+b2.y+c2.y)/3,cx=(a.x+b2.x+c2.x)/3;if(cy<thr&&cx<tb.min.x+0.3){lo.push(idx[i],idx[i+1],idx[i+2]);lowB.expandByPoint(a).expandByPoint(b2).expandByPoint(c2)}else{up.push(idx[i],idx[i+1],idx[i+2]);upB.expandByPoint(a).expandByPoint(b2).expandByPoint(c2)}}
      if(!lo.length){upperObjs.push(m);return}if(!up.length){lowerObjs.push(m);return}
      const gl=g.clone();gl.setIndex(lo);const ml=new THREE.Mesh(gl,m.material);ml.castShadow=ml.receiveShadow=true;m.parent.add(ml);ml.position.copy(m.position);ml.quaternion.copy(m.quaternion);ml.scale.copy(m.scale);ml.updateMatrixWorld(true);
      g.setIndex(up);upperObjs.push(m);lowerObjs.push(ml)})});
  const lb2=lowB.clone(),ub2=upB.clone();
  // cargo floor height just inside the tailgate (raycast), so the opened lower gate lies flush with it
  let floorY=lb2.min.y;{const rc=new THREE.Raycaster();rc.set(new THREE.Vector3(lb2.min.x+0.35,1.4,0),new THREE.Vector3(0,-1,0));const hit=rc.intersectObject(car,true).find(i=>i.object.visible&&!lowerObjs.includes(i.object)&&!upperObjs.includes(i.object));if(hit&&hit.point.y>lb2.min.y&&hit.point.y<thr)floorY=hit.point.y}
  // find where the cargo floor ends at the back (step rearward until the floor disappears)
  let floorEdgeX=lb2.min.x+0.09;{const rc=new THREE.Raycaster();for(let x=lb2.min.x+0.45;x>lb2.min.x-0.05;x-=0.01){rc.set(new THREE.Vector3(x,floorY+0.05,0),new THREE.Vector3(0,-1,0));rc.far=0.09;const h=rc.intersectObject(car,true).find(i=>i.object.visible&&!lowerObjs.includes(i.object)&&!upperObjs.includes(i.object));if(!h){floorEdgeX=x+0.01;break}}}
  const trunk=upperObjs.length&&pivotFor(upperObjs,new THREE.Vector3(ub2.max.x,ub2.max.y,(ub2.min.z+ub2.max.z)/2));
  const lgate=lowerObjs.length&&pivotFor(lowerObjs,new THREE.Vector3(lb2.min.x+0.04,lb2.min.y,(lb2.min.z+lb2.max.z)/2));
  // one ribbed load-protection panel on the inside of the lower tailgate (covers the open inner frame)
  if(lgate){const cv=document.createElement('canvas');cv.width=64;cv.height=256;const g2=cv.getContext('2d');g2.fillStyle='#17181b';g2.fillRect(0,0,64,256);for(let y=0;y<256;y+=14){g2.fillStyle='#26282d';g2.fillRect(0,y,64,6);g2.fillStyle='#0b0c0e';g2.fillRect(0,y+6,64,2)}
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const pm=new THREE.MeshStandardMaterial({map:tex,roughness:.85});const em=new THREE.MeshStandardMaterial({color:0x111214,roughness:.7});
    const ph=thr-lb2.min.y-0.01,pw=(lb2.max.z-lb2.min.z)*0.9;const panel=new THREE.Mesh(new THREE.BoxGeometry(0.02,ph,pw),[pm,em,em,em,em,em]);
    panel.position.set(lb2.min.x+0.11,lb2.min.y+ph/2+0.005,(lb2.min.z+lb2.max.z)/2);panel.castShadow=panel.receiveShadow=true;scene.add(panel);panel.updateMatrixWorld(true);lgate.attach(panel)}

  const doors={};['FL','FR','BL','BR'].forEach(k=>{const a=parts['Door_'+k];if(!a)return;const b=bbOf(a);const zSide=(b.min.z+b.max.z)/2;doors[k]={p:pivotFor(a,new THREE.Vector3(b.max.x,(b.min.y+b.max.y)/2,zSide>0?b.max.z:b.min.z)),side:Math.sign(zSide)}});
  // wheels
  const wheels=(parts.Wheel||[]).map(o=>{const b=new THREE.Box3().setFromObject(o);return pivotFor([o],b.getCenter(new THREE.Vector3()))});
  // lights
  const headMeshes=[],tailMeshes=[];
  // only the LED elements (material with an emissive map) glow; the clear lens covers stay clear
  car.traverse(m=>{if(!m.isMesh||!/0_040/.test(m.material.name||'')||!m.material.emissiveMap)return;m.material=m.material.clone();const c=new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());(c.x>0?headMeshes:tailMeshes).push(m);m.material.emissiveIntensity=0});
  const lb=bbOf(parts.Light_F||[]);
  const gc=document.createElement('canvas');gc.width=gc.height=128;const gx=gc.getContext('2d');const gr=gx.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.18,'rgba(230,240,255,.85)');gr.addColorStop(.5,'rgba(190,215,255,.22)');gr.addColorStop(1,'rgba(190,215,255,0)');gx.fillStyle=gr;gx.fillRect(0,0,128,128);
  const gtex=new THREE.CanvasTexture(gc);const glows=[lb.min.z+0.3,lb.max.z-0.3].map(z=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:gtex,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0}));sp.position.set(lb.max.x-0.22,lb.getCenter(new THREE.Vector3()).y+0.01,z);sp.scale.setScalar(0.55);scene.add(sp);return sp});
  const beams=[];[-1,1].forEach(sd=>{const sl=new THREE.SpotLight(0xeaf2ff,0,30,0.42,0.5,1.2);const zc=sd>0?lb.max.z-0.25:lb.min.z+0.25;sl.position.set(lb.max.x,lb.getCenter(new THREE.Vector3()).y,zc);sl.target.position.set(lb.max.x+10,-0.5,zc*1.3);scene.add(sl,sl.target);beams.push(sl)});
  // remove side 'M' fender badges (car is not an M model)
  car.traverse(o=>{if(o.isMesh&&/BADGES/i.test(o.material.name||'')){let p=o,hit=false;while(p){if(/Fender_F/.test(p.name)){hit=true;break}p=p.parent}if(hit)o.visible=false}});
  // panoramic roof sunshade
  const roofGlass=[];car.traverse(o=>{if(o.isMesh&&/D_Glass/i.test(o.material.name||'')){let p=o,hit=false;while(p){if(/SM_Roof/.test(p.name)){hit=true;break}p=p.parent}if(hit)roofGlass.push(o)}});
  let shade=null;if(roofGlass.length){const gb=new THREE.Box3();roofGlass.forEach(o=>gb.expandByObject(o));const gs=gb.getSize(new THREE.Vector3());
    const sg=new THREE.BoxGeometry(1,0.006,gs.z*1.02);sg.translate(0.5,0,0); // anchored at rear edge: shade retracts rearward, opening front first
    shade=new THREE.Mesh(sg,new THREE.MeshStandardMaterial({color:0x1a1714,roughness:0.95}));shade.position.set(gb.min.x-0.01,gb.min.y-0.012,(gb.min.z+gb.max.z)/2);shade.userData.len=gs.x*1.03;shade.scale.x=shade.userData.len;scene.add(shade)}
  // engine idle shake
  const eb=bbOf(parts.Engine||[]);const engP=parts.Engine&&pivotFor(parts.Engine,eb.getCenter(new THREE.Vector3()));const engBase=engP?engP.position.clone():null;let rpmNow=0;
  // rear light lenses are red-tinted on the real car (clear lenses on the model)
  car.traverse(m=>{if(!m.isMesh||!/GLASS_LIGHT/.test(m.material.name||''))return;const c=new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());if(c.x<0){const mt=m.material.clone();mt.color=new THREE.Color(0x9a120c);mt.opacity=0.82;mt.transparent=true;if('transmission' in mt)mt.transmission=0.15;mt.roughness=0.08;m.material=mt}});
  // footwell / courtesy lights: switch on when doors open so the pedals are visible
  const fw=[[0.95,0.62,-0.38],[0.95,0.62,0.38],[-0.15,0.62,-0.4],[-0.15,0.62,0.4]].map(p=>{const l=new THREE.PointLight(0xffe2c0,0,1.4,1.6);l.position.set(...p);scene.add(l);return l});
  // fit blob
  const cb=new THREE.Box3().setFromObject(root); const cs=cb.getSize(new THREE.Vector3()); blob.scale.set(cs.x*1.25,cs.z*1.5,1);
  const center=cb.getCenter(new THREE.Vector3());
  // state & animation
  const anim={hood:0,trunk:0,lgate:0,FL:0,FR:0,BL:0,BR:0,roof:0}; const tgt={...anim}; let spin=0,lights='off';
  const VIEWS={driver:[-0.16,1.24,-0.40],front:[6.2,1.6,4.2],side:[0.2,1.3,8.4],rear:[-6.2,1.9,4.4],top:[0.01,10,0.01],engine:[5.4,3.4,0.01],cargo:[-6,2.4,0.6],lights:[6.0,1.0,0.01],wheel:[3.2,0.9,4.8],cabin:[0.6,3.2,5.6]};
  const TGT={driver:[-0.13,1.235,-0.40],front:[0,0.7,0],side:[0,0.8,0],rear:[0,0.8,0],top:[0,0,0],engine:[1.6,0.9,0],cargo:[-2,0.9,0],lights:[1,0.7,0],wheel:[1.45,0.4,0.9],cabin:[0,1,0]};
  let fly=null;
  function view(name,dur=1100){if(!placed)return;const inside=name==='driver';controls.minDistance=inside?0.01:4;controls.maxDistance=inside?0.05:26;controls.minPolarAngle=inside?Math.PI*0.2:0;controls.maxPolarAngle=inside?Math.PI*0.8:Math.PI*0.495;controls.rotateSpeed=inside?-0.45:1;controls.enableZoom=!inside;if(inside)controls.autoRotate=false;camera.near=inside?0.02:0.1;camera.fov=inside?62:32;camera.updateProjectionMatrix();const t=new THREE.Vector3(...TGT[name]);const k=inside?1:Math.max(1,1.15/camera.aspect);const p=new THREE.Vector3(...VIEWS[name]).sub(t).multiplyScalar(k).add(t);fly={p0:camera.position.clone(),t0:controls.target.clone(),p,t,s:performance.now(),d:dur}}
  controls.target.set(...TGT.front);
  function setLights(m){lights=m;const on=m!=='off';
    headMeshes.forEach(x=>{x.material.emissive.set(0xf2f7ff);x.material.emissiveIntensity=!on?0:m==='drl'?4:m==='low'?7:9});
    tailMeshes.forEach(x=>{x.material.emissive.set(0xff2414);x.material.emissiveIntensity=on?3:0.6});
    glows.forEach(g=>{g.material.opacity=!on?0:m==='drl'?0.35:m==='low'?0.8:1;g.scale.setScalar(m==="high"?0.5:0.38)});
    beams.forEach(b=>{b.intensity=m==='low'?60:m==='high'?140:0;b.angle=m==='high'?0.32:0.45;b.target.position.y=m==='high'?0.6:-0.5})}
  let placed=false;function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(!placed){placed=true;const t=new THREE.Vector3(...TGT.front);camera.position.set(...VIEWS.front).sub(t).multiplyScalar(Math.max(1,1.15/camera.aspect)).add(t);controls.target.copy(t)}}
  new ResizeObserver(resize).observe(host); resize();
  const hotspots=[]; // {el, obj|vec}
  const hp={engine:()=>bbOf(parts.Hood||[]).getCenter(new THREE.Vector3()).setY(hb.max.y+0.05),
    lights:()=>new THREE.Vector3(lb.max.x,lb.getCenter(new THREE.Vector3()).y,lb.max.z-0.3),
    cargo:()=>new THREE.Vector3(tb.max.x-0.2,tb.getCenter(new THREE.Vector3()).y,0),
    wheel:()=>{const b=new THREE.Box3().setFromObject(wheels[0]||root);return b.getCenter(new THREE.Vector3())},
    cabin:()=>new THREE.Vector3(0.3,cb.max.y-0.2,0)};
  function addHotspot(el,k){const w=hp[k]&&hp[k]();if(w)hotspots.push({el,w:root.localToWorld?w:w})}
  // fix wheel hotspot: choose wheel nearest front-left visible (+x, +z)
  const ndc=new THREE.Vector3();
  let last=performance.now();
  st('compiling');try{renderer.compile(scene,camera)}catch(e){st('compile err '+e)};st('compiled');let first=true;renderer.setAnimationLoop(now=>{if(first){first=false;st('frame1 start')}const dt=Math.min(.05,(now-last)/1000);last=now;
    if(fly){const k=Math.min(1,(now-fly.s)/fly.d),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;camera.position.lerpVectors(fly.p0,fly.p,e);controls.target.lerpVectors(fly.t0,fly.t,e);if(k>=1)fly=null}
    for(const k in anim){anim[k]+=(tgt[k]-anim[k])*Math.min(1,dt*4)}
    if(hood)hood.rotation.z=anim.hood*0.85; if(shade){shade.scale.x=Math.max(0.0001,shade.userData.len*(1-anim.roof*0.94))} if(trunk)trunk.rotation.z=-anim.trunk*1.25; if(lgate)lgate.rotation.z=anim.lgate*Math.PI/2*0.98;
    for(const k in doors){const d=doors[k];d.p.rotation.y=d.side*anim[k]*1.05}const dOpen=Math.max(anim.FL,anim.FR,anim.BL,anim.BR);fw.forEach((l,i)=>l.intensity=(i<2?Math.max(anim.FL,anim.FR):Math.max(anim.BL,anim.BR))*2.2);
    if(engP){if(rpmNow>0){const a=0.0025+rpmNow/6800*0.0035;engP.position.set(engBase.x+(Math.random()-.5)*a,engBase.y+(Math.random()-.5)*a,engBase.z+(Math.random()-.5)*a*.6);engP.rotation.x=Math.sin(now*0.09)*a*0.6}else{engP.position.copy(engBase);engP.rotation.x=0}}
    if(spin)wheels.forEach(w=>w.rotateZ(-spin*dt*8));
    if(!host.clientWidth)return;controls.update(); renderer.render(scene,camera); if(!window.__f2){window.__f2=1;st('frame1 done')}
    if(!placed)return;const w=host.clientWidth,h=host.clientHeight; const cdir=camera.position.clone().sub(center).normalize();
    hotspots.forEach(hs=>{ndc.copy(hs.w).project(camera);const vis=hs.w.clone().sub(center).normalize().dot(cdir)>-0.15;hs.el.style.transform=`translate(${(ndc.x*.5+.5)*w}px,${(-ndc.y*.5+.5)*h}px)`;hs.el.style.opacity=vis?1:0;hs.el.style.pointerEvents=vis?'auto':'none'})});
  return {renderer,scene,camera,controls,view,setLights,addHotspot,parts:Object.keys(parts),mats,
    toggle(k,v){tgt[k]=v===undefined?(tgt[k]?0:1):(v?1:0);return !!tgt[k]},
    setSpin(v){spin=v},setRpm(r){rpmNow=r},autoRotate(v){controls.autoRotate=v},
    setLeather(hex){car.traverse(o=>{if(o.isMesh&&/LEATHER/i.test(o.material.name||''))o.material.color.set(hex)})},
    setNight(v){hemi.intensity=v?0.06:0.35;sun.intensity=v?0.12:1.7;rim.intensity=v?0.3:0.9;fill.intensity=v?0.05:0.35;scene.environmentIntensity=v?0.15:0.65;},
    mount(el){el.appendChild(host)}};
}
