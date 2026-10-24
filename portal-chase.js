(function () {
  'use strict';
  const duration = 14;
  const mix = (a, b, value) => a + (b - a) * value;
  function sample(name, time, left, right) {
    const t = ((time % duration) + duration) % duration;
    const alex = name === 'Alex';
    const start = alex ? .7 : 1.8;
    const arrival = alex ? 7.5 : 8.8;
    const stop = right - (alex ? 1.1 : 3);
    if (t < start || t >= (alex ? 8.3 : 11.8)) return {visible:false,x:left,scale:0,mode:'hidden'};
    if (t < start + .8) {
      const progress = (t - start) / .8;
      return {visible:true,x:mix(left,left+2,progress),scale:progress,mode:'run'};
    }
    if (t < arrival) return {visible:true,x:mix(left+2,stop,(t-start-.8)/(arrival-start-.8)),scale:1,mode:'run'};
    if (!alex && t < 10.8) return {visible:true,x:stop,scale:1,mode:'wave'};
    const entry = alex ? 7.5 : 10.8;
    const end = alex ? 8.3 : 11.8;
    const progress = (t-entry)/(end-entry);
    return {visible:true,x:mix(stop,right+.3,progress),scale:Math.min(1,(1-progress)*2),mode:'run'};
  }
  function createChase(T, scenes) {
    const model = window.AmanahGreeters.createGreeters(T, scenes);
    const group = model.group;
    const actors = model.characters.map(({character,head,wave}) => {
      const name = character.name;
      const rest = character.getObjectByName(name + '_RestArm');
      const legs = ['_LeftLeg','_RightLeg'].map(part => character.getObjectByName(name + part));
      character.position.set(0,0,0); character.rotation.set(0,0,0);
      [head,wave,rest].forEach(part => part.rotation.set(0,0,0));
      const floor = -new T.Box3().setFromObject(character).min.y;
      return {character,head,wave,rest,legs,floor};
    });
    const geometry = new T.BoxGeometry(1,1,1);
    const stone = new T.MeshLambertMaterial({color:0x30243e});
    const accent = new T.MeshLambertMaterial({color:0x554066});
    const purple = new T.MeshBasicMaterial({color:0x8e52ce,transparent:true,opacity:.8});
    const spark = new T.MeshBasicMaterial({color:0xc89aef});
    function block(parent,x,y,z,w,h,d,material) {
      const mesh = new T.Mesh(geometry,material); mesh.position.set(x,y,z); mesh.scale.set(w,h,d); parent.add(mesh); return mesh;
    }
    const portals = [-1,1].map(side => {
      const portal = new T.Group(); portal.rotation.y = side * -.22; group.add(portal);
      for (let row=0;row<7;row++) for (const edge of [-1,1]) block(portal,edge*1.6,.7+row*1.3,0,.8,1.3,.8,row%3===0?accent:stone);
      for (let column=0;column<4;column++) for (const y of [.3,9.4]) block(portal,-1.5+column,y,0,1,.8,.8,column%2?accent:stone);
      block(portal,0,4.85,.03,2.4,8.3,.06,purple);
      const particles = Array.from({length:5},(_,index)=>block(portal,(index%2?1:-1)*(1+index*.12),1+index*1.6,.6,.13,.13,.13,spark));
      return {portal,particles};
    });
    function pose(time, halfWidth=24) {
      const left=-halfWidth+2.5,right=halfWidth-2.5;
      const cycle=((time%duration)+duration)%duration;
      portals[0].portal.position.x=left; portals[1].portal.position.x=right;
      portals.forEach(({particles},index)=>particles.forEach((particle,i)=>{particle.position.y=.7+(i*1.7+time*.65+index)%8.3;}));
      actors.forEach(({character,head,wave,rest,legs,floor})=>{
        const state=sample(character.name,time,left,right);
        character.visible=state.visible; character.scale.setScalar(Math.max(.001,state.scale));
        character.position.set(state.x,floor*state.scale,.65);
        character.rotation.set(0,state.mode==='wave'?0:1.05,0);
        head.rotation.set(0,0,0); wave.rotation.set(0,0,0); rest.rotation.set(0,0,0);
        legs.forEach(leg=>leg.rotation.set(0,0,0));
        if(state.mode==='wave') {
          const raise=Math.min(1,(cycle-8.8)/.35);
          const smooth=raise*raise*(3-2*raise);
          character.rotation.y=1.05*(1-smooth);
          wave.rotation.z=-(2.7+Math.sin(time*7)*.22)*smooth;
          wave.rotation.x=-.12;
        } else if(state.visible) {
          const stride=Math.sin(time*11+(character.name==='Alex'?1:0));
          legs[0].rotation.x=stride*.7; legs[1].rotation.x=-stride*.7;
          wave.rotation.x=-stride*.65; rest.rotation.x=stride*.65;
          character.position.y+=Math.abs(stride)*.16*state.scale;
          character.rotation.z=-.06;
          if(character.name==='Steve'&&cycle>=10.8&&cycle<11.05){const lower=1-(cycle-10.8)/.25;wave.rotation.z=-2.7*lower;character.rotation.y=1.05*(1-lower);}
        }
      });
    }
    pose(5);
    return {group,actors,portals,pose};
  }
  window.AmanahPortalChase={sample,createChase,duration};
  if(typeof document==='undefined')return;
  const host=document.querySelector('#hero-chase');
  if(!host||!window.THREE?.GLTFLoader||!window.AmanahGreeters)return;
  const T=window.THREE,fallback=host.querySelector('img');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused=false,visible=false,available=true,frame=0,previous=0,elapsed=0,halfWidth=24,renderer;
  try{paused=window.localStorage.getItem('amanah-motion-paused')==='true';}catch{}
  let refresh=()=>{};
  document.addEventListener('amanah:motion',event=>{paused=event.detail.paused;refresh();});
  async function initialize(){
    try{
      const scenes=await Promise.all(['steve','alex'].map(name=>new Promise((resolve,reject)=>new T.GLTFLoader().load('assets/models/'+name+'.glb',asset=>resolve(asset.scene),undefined,reject))));
      renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputEncoding=T.sRGBEncoding;
      renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);
      const scene=new T.Scene(),model=createChase(T,scenes);scene.add(model.group);
      scene.add(new T.AmbientLight(0xffffff,.7));
      const light=new T.DirectionalLight(0xffffff,.3);light.position.set(-4,9,15);scene.add(light);
      const camera=new T.OrthographicCamera(-24,24,6,-6,.1,100);camera.position.set(0,5.8,30);camera.lookAt(0,5.8,0);
      function render(){if(!available)return;model.pose(reduced.matches?5:elapsed,halfWidth);renderer.render(scene,camera);}
      function resize(){const width=Math.max(host.clientWidth,1),height=Math.max(host.clientHeight,1);halfWidth=6*width/height;camera.left=-halfWidth;camera.right=halfWidth;camera.updateProjectionMatrix();renderer.setSize(width,height);render();}
      new ResizeObserver(resize).observe(host);resize();fallback.hidden=true;
      function stop(){if(frame)cancelAnimationFrame(frame);frame=0;previous=0;}
      function animate(now){frame=requestAnimationFrame(animate);if(now-previous<40)return;if(previous)elapsed+=Math.min((now-previous)/1000,.08);previous=now;render();}
      function sync(){stop();if(reduced.matches)render();if(available&&visible&&!paused&&!reduced.matches&&!document.hidden)frame=requestAnimationFrame(animate);}
      refresh=sync;reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
      if('IntersectionObserver'in window)new window.IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(host);else{visible=true;sync();}
      window.addEventListener('pagehide',stop);window.addEventListener('pageshow',sync);
      renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();available=false;stop();renderer.domElement.hidden=true;fallback.hidden=false;});
    }catch{available=false;if(renderer){renderer.domElement.remove();renderer.dispose();}fallback.hidden=false;}
  }
  initialize();
}());
