(function () {
  'use strict';
  const ZONES = {
    all: { angle:0, point:[0,0] },
    tk: { angle:0.85, point:[-6,4] },
    sd: { angle:-0.65, point:[-6,-4.4] },
    smp: { angle:0.5, point:[0.2,-4] },
    smk: { angle:-0.2, point:[4.5,-4] },
    futsal: { angle:0.3, point:[4.3,4.1] }
  };
  const THEMES = {
    tk: {roof:[0x65ad35,0x7bc543,0x95d65d,0xb1e780],wall:0xf0f7e3,frame:0x3d7026,glass:0xb2d797},
    sd: {roof:[0x185137,0x206b46,0x32855a,0x4ba571],wall:0xeaf1e8,frame:0x163f2b,glass:0x82b69a},
    smp: {roof:[0x142d55,0x1c3d70,0x2c548d,0x416fa8],wall:0xe9edf4,frame:0x142541,glass:0x8ba9cd},
    smk: {roof:[0x47515b,0x606c76,0x7c8990,0x9ca8ad],wall:0xeff0ee,frame:0x343e47,glass:0xa8bcc3}
  };

  function createModel(T) {
    const group = new T.Group();
    const geometryCache = new Map();
    const materialCache = new Map();
    const themeMaterials = [];
    const sections = {};
    function section(key) { const item = new T.Group(); item.userData.zone=key; sections[key]=item; group.add(item); return item; }
    function box(w,h,d,color,x,y,z,parent=group,role='') {
      const key=`${w},${h},${d}`;
      if(!geometryCache.has(key))geometryCache.set(key,new T.BoxGeometry(w,h,d));
      const materialKey=`${role}:${color}`;
      if(!materialCache.has(materialKey)){
        const material=new T.MeshLambertMaterial({color});
        // Three.js r128 requires explicit sRGB-to-linear conversion before lighting.
        material.color.convertSRGBToLinear();
        materialCache.set(materialKey,material);
        if(role)themeMaterials.push({material,role,original:material.color.clone(),target:material.color.clone()});
      }
      const mesh=new T.Mesh(geometryCache.get(key),materialCache.get(materialKey));
      mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
    }
    box(20,.65,20,0x8c7a5b,0,-.95,0);
    box(20.3,.45,20.3,0xa99874,0,-.4,0);
    box(20,.65,20,0xa8cb7d,0,.15,0);
    box(10,.12,8.5,0xe6e2ce,-.4,.54,1);
    box(2.6,.14,8,0xddd7c0,-2.5,.55,6);
    for(let z=-2;z<9;z++)box(2.6,.012,.025,0xcac4ac,-2.5,.63,z);
    for(const [z,y] of [[10.2,.25],[10.85,-.04],[11.5,-.33]])box(2.6,.35,.8,0xe4dfcd,-2.5,y,z);

    function school(key,x,z,w,d,height,roof) {
      const parent=section(key);
      box(w+.4,.22,d+.4,0xd4d5bd,x,.6,z,parent);
      box(w,height,d,0xf5f0df,x,.7+height/2,z,parent,'wall');
      if(height>3)box(w+.06,.19,d+.06,0x317450,x,2.6,z,parent,'roof0');
      const rows=height>3?[1.5,3.35]:[1.75];
      for(let wx=x-w/2+.8;wx<x+w/2-.3;wx+=1.2)for(const wy of rows){
        box(.65,.8,.09,0x285641,wx,wy,z+d/2+.055,parent,'frame');
        box(.47,.63,.04,0x99cdb4,wx,wy+.025,z+d/2+.11,parent,'glass');
      }
      for(let wz=z-d/2+.8;wz<z+d/2-.3;wz+=1.2)for(const wy of rows)box(.09,.8,.65,0x669c7e,x+w/2+.055,wy,wz,parent,'glass');
      for(let i=0;i<4;i++)box(w+.65-i*.62,.32,d+.6-i*.6,roof[i],x,.7+height+i*.32,z,parent,`roof${i}`);
      box(.9,1.45,.12,0x244d37,x,.7+.72,z+d/2+.08,parent,'frame');
      return parent;
    }
    const main=school('smk',3.3,-4.7,8.9,4.8,4.1,[0x317450,0x3d8b60,0x52a778,0x76bb8b]);
    box(2.8,.3,1.35,0x317450,2.7,3.05,-1.9,main,'roof0');
    box(.22,2.5,.25,0xe8e4cc,1.65,1.8,-1.65,main,'wall');
    box(.22,2.5,.25,0xe8e4cc,3.8,1.8,-1.65,main,'wall');
    school('sd',-5.7,-4.6,4.8,4.2,2.55,[0x3d8b60,0x52a778,0x76bb8b,0x98d4a5]);
    school('smp',-.2,-5.1,2.3,3.8,3.2,[0x37634b,0x45805a,0x5a956a,0x7bb588]);
    const kindergarten=section('tk');
    box(3.7,.24,3.4,0x6e9360,-6,0.58,3.5,kindergarten);
    box(3.35,.14,3.05,0xc5d994,-6,.77,3.5,kindergarten);
    for(const [x,z,c] of [[-7,3,0xe5b854],[-5.8,3.8,0x85bd54],[-6.6,4.4,0xe5cc7a]])box(.65,.6,.65,c,x,1.1,z,kindergarten);
    box(1.8,.18,.9,0xb18c57,-5.4,1.05,1.2,kindergarten);
    box(.18,.5,.8,0x79613b,-6.05,.72,1.2,kindergarten);box(.18,.5,.8,0x79613b,-4.75,.72,1.2,kindergarten);

    box(.75,.25,.75,0xcbd2bc,-1.7,.7,.2);
    box(.1,4.9,.1,0xf5f5e9,-1.7,3.1,.2);
    const flag=new T.Group();flag.position.set(-1.65,5.1,.2);group.add(flag);
    box(1.2,.33,.06,0xdf5149,.6,.16,0,flag);box(1.2,.33,.06,0xfff8e5,.6,-.17,0,flag);
    const court=section('futsal');
    box(7.4,.13,4.9,0xf8f6e8,4.5,.62,4.3,court);
    box(7.05,.05,4.55,0x3b7a57,4.5,.72,4.3,court);
    box(.08,.02,4.45,0xeaf1dc,4.5,.76,4.3,court);
    const center=new T.Mesh(new T.RingGeometry(.62,.67,32),new T.MeshBasicMaterial({color:0xeaf1dc,side:T.DoubleSide}));center.material.color.convertSRGBToLinear();center.rotation.x=-Math.PI/2;center.position.set(4.5,.76,4.3);court.add(center);
    for(const x of [1.1,7.9]){
      for(const z of [3.55,5.05])box(.09,.8,.09,0xf6f5e7,x,1.15,z,court);
      box(.09,.09,1.59,0xf6f5e7,x,1.55,4.3,court);
      box(.06,.02,2.5,0xeaf1dc,x===1.1?2.05:6.95,.76,4.3,court);
      for(const z of [3.05,5.55])box(.95,.02,.06,0xeaf1dc,x===1.1?1.58:7.42,.76,z,court);
    }
    function tree(x,z,scale=1){
      const item=new T.Group();item.position.set(x,.5,z);item.scale.setScalar(scale);group.add(item);
      box(.38,1.1,.38,0x80603c,0,.55,0,item);
      box(1.7,.9,1.7,0x5d9c4c,0,1.3,0,item);
      box(1.3,.8,1.3,0x7db454,0,2,0,item);
      box(.75,.5,.75,0x9aca6b,0,2.65,0,item);
    }
    [[-8.5,-7,1],[-8.7,-1.6,1.05],[-8.5,6.8,1.05],[-8.6,2,.8],[8.7,-6,1.1],[8.7,-.5,.9],[8.6,7.7,.85],[.1,7.9,.9],[-3,-8,.8]].forEach(args=>tree(...args));
    for(const [start,end] of [[-9,-4.3],[-.6,9]]){
      for(let x=start;x<=end;x+=1.1)box(.13,.72,.13,0xf5f2e0,x,.87,9.35);
      box(end-start,.12,.1,0xf5f2e0,(start+end)/2,1,9.35);
    }
    const students=[];
    for(const [x,z,color] of [[-2.4,1.8,0xfff9e8],[-1,3.3,0xfff9e8],[-2.7,6.6,0xb2da6b],[3.2,4.3,0xe4b251],[5.9,3.9,0xc7e1c7]]){
      const item=new T.Group();item.position.set(x,.7,z);students.push(item);group.add(item);
      box(.16,.32,.22,0x304637,-.12,.16,0,item);box(.16,.32,.22,0x304637,.12,.16,0,item);
      box(.43,.42,.31,color,0,.53,0,item);box(.34,.33,.33,0xe5bd8c,0,.9,0,item);box(.38,.1,.37,0x2d4735,0,1.12,0,item);
    }
    box(.18,.18,.18,0xf2ead4,4.5,.9,4.2,court);
    const marker=new T.Mesh(new T.RingGeometry(1.8,2.1,4),new T.MeshBasicMaterial({color:0xa3e635,side:T.DoubleSide,transparent:true,opacity:.8,depthTest:false}));
    marker.material.color.convertSRGBToLinear();
    marker.rotation.x=-Math.PI/2;marker.renderOrder=5;marker.visible=false;group.add(marker);
    function setTheme(key,immediate=false){
      const theme=THEMES[key];
      themeMaterials.forEach(entry=>{
        if(!theme)entry.target.copy(entry.original);
        else entry.target.setHex(entry.role.startsWith('roof')?theme.roof[Number(entry.role.slice(4))]:theme[entry.role]).convertSRGBToLinear();
        if(immediate)entry.material.color.copy(entry.target);
      });
    }
    function updateTheme(delta){
      const blend=1-Math.exp(-Math.max(0,delta)*5);
      themeMaterials.forEach(entry=>entry.material.color.lerp(entry.target,blend));
    }
    return {group,sections,students,flag,marker,setTheme,updateTheme};
  }
  window.AmanahCampus={ZONES,THEMES,createModel};
  if(typeof document==='undefined')return;
  const stage=document.querySelector('#campus-stage');
  if(!stage)return;
  const T=window.THREE;
  const fallback=document.querySelector('#campus-fallback');
  const controls={left:document.querySelector('#campus-left'),auto:document.querySelector('#campus-auto'),time:document.querySelector('#campus-time'),reset:document.querySelector('#campus-reset')};
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let model,renderer,scene,camera,ambient,sun;
  let rotation=0,auto=!reduced.matches,sunset=false,currentZone='all',active=true,frame=0,previous=0,start=0,motionPaused=false;
  document.addEventListener('amanah:motion',event=>{motionPaused=event.detail.paused;});
  function syncAuto(){controls.auto.textContent=auto?'Ⅱ Auto':'▶ Auto';controls.auto.setAttribute('aria-pressed',String(auto));}
  function focusZone(key){
    if(!ZONES[key])return;
    currentZone=key;const zone=ZONES[key];auto=false;syncAuto();rotation=zone.angle;
    if(model){model.setTheme(key,reduced.matches||motionPaused);model.marker.visible=key!=='all';model.marker.position.set(zone.point[0],.9,zone.point[1]);if(reduced.matches||motionPaused)model.group.rotation.y=rotation;}
  }
  window.AmanahCampus.focusZone=focusZone;
  function staticMode(){fallback.hidden=false;controls.left.disabled=true;controls.auto.disabled=true;controls.time.disabled=true;controls.reset.disabled=true;document.querySelector('#campus-caption').textContent='ILUSTRASI STATIS • PILIH JENJANG UNTUK MENGENAL AMANAH';}
  if(!T){staticMode();return;}
  try{
    renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.outputEncoding=T.sRGBEncoding;
    renderer.domElement.setAttribute('aria-hidden','true');stage.appendChild(renderer.domElement);
    scene=new T.Scene();camera=new T.OrthographicCamera(-18,18,15,-15,.1,150);camera.position.set(26,24,26);camera.lookAt(0,1,0);
    ambient=new T.AmbientLight(0xffffff,.5);scene.add(ambient);
    sun=new T.DirectionalLight(0xfff8e8,.65);sun.color.convertSRGBToLinear();sun.position.set(-12,25,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;sun.shadow.bias=-.001;scene.add(sun);
    model=createModel(T);scene.add(model.group);
    function resize(){const w=Math.max(stage.clientWidth,1),h=Math.max(stage.clientHeight,1),aspect=w/h;const d=Math.max(14.4,15.4/aspect);camera.left=-d*aspect;camera.right=d*aspect;camera.top=d;camera.bottom=-d;camera.updateProjectionMatrix();renderer.setSize(w,h);}
    new ResizeObserver(resize).observe(stage);resize();renderer.render(scene,camera);fallback.hidden=true;
    function animate(now){
      frame=requestAnimationFrame(animate);
      if(document.hidden||!active||now-previous<33)return;
      const delta=Math.min((now-previous)/1000,.1);previous=now;if(!start)start=now;const elapsed=(now-start)/1000;
      if(auto&&!reduced.matches&&!motionPaused)rotation+=delta*.13;
      model.updateTheme(delta);
      model.group.rotation.y+=(rotation-model.group.rotation.y)*(reduced.matches||motionPaused?1:Math.min(delta*8,1));
      model.group.position.y=reduced.matches||motionPaused?0:Math.sin(elapsed*1.1)*.08;
      if(!reduced.matches&&!motionPaused){model.flag.rotation.y=Math.sin(elapsed*3)*.08;model.students.forEach((student,index)=>student.position.y=.7+Math.abs(Math.sin(elapsed*2+index))*.08);}
      renderer.render(scene,camera);
    }
    syncAuto();frame=requestAnimationFrame(animate);
    if('IntersectionObserver' in window)new IntersectionObserver(entries=>{active=entries[0].isIntersecting;},{rootMargin:'80px'}).observe(stage);
    controls.left.addEventListener('click',()=>{auto=false;syncAuto();rotation-=Math.PI/4;});
    controls.auto.addEventListener('click',()=>{auto=!auto;syncAuto();});
    function setTime(value){sunset=value;controls.time.textContent=sunset?'◒ Senja':'☀ Pagi';controls.time.setAttribute('aria-pressed',String(sunset));ambient.color.setHex(sunset?0xffdbb2:0xffffff).convertSRGBToLinear();ambient.intensity=sunset?.4:.5;sun.color.setHex(sunset?0xffa660:0xfff8e8).convertSRGBToLinear();sun.intensity=sunset?.75:.65;stage.closest('.campus').classList.toggle('is-sunset',sunset);}
    controls.time.addEventListener('click',()=>setTime(!sunset));
    controls.reset.addEventListener('click',()=>{focusZone('all');setTime(false);});
    renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();cancelAnimationFrame(frame);renderer.domElement.hidden=true;staticMode();});
    window.addEventListener('pagehide',()=>cancelAnimationFrame(frame),{once:true});
    window.addEventListener('pageshow',event=>{if(event.persisted)frame=requestAnimationFrame(animate);});
    window.AmanahCampus.scene=scene;
  }catch(error){if(renderer){renderer.domElement.remove();renderer.dispose();}staticMode();console.warn('Ilustrasi statis digunakan:',error.message);}
})();
