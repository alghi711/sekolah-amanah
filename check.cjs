const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawn}=require('node:child_process');
const root=__dirname;
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html');
const css=read('styles.css');
const referenceCss=read('pixel-reference.css');
for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  if(!/^https?:/.test(match[1]))assert(fs.existsSync(path.join(root,match[1])),`Missing asset ${match[1]}`);
}
for(const match of html.matchAll(/href="#([^"]+)"/g))assert(html.includes(`id="${match[1]}"`),`Missing anchor ${match[1]}`);
const levelNavigation=html.match(/<nav class="zone-pills"[\s\S]*?<\/nav>/)[0];
for(const destination of ['#jenjang','tk.html','sd.html','smp.html','smk.html'])assert(levelNavigation.includes(`href="${destination}"`),`Missing hero profile link ${destination}`);
assert(!/data-zone|aria-pressed|<button/.test(levelNavigation),'Hero level choices navigate directly without controlling the 3D scene');
const quickServices=html.match(/<section id="layanan" class="campus-hud"[\s\S]*?<\/section>/)[0];
for(const url of ['https://portal.pijarsekolah.id/smksamanah','https://layanan-surat-smk-amanah.wasmer.app/']){
  assert(quickServices.includes(`href="${url}"`),'School services are available below the illustration');
  assert.equal(html.split(`href="${url}"`).length-1,1,'Each service has a single entry point');
}
assert(!html.includes('class="services-section"'),'Large duplicate service section was removed');
assert.match(html, /<a id="spmb" class="button outline" href="https:\/\/docs.google.com\/forms\//,'Registration remains accessible from the hero');
for(const match of (css+referenceCss).matchAll(/url\(['"]?([^)'" ]+)/g))assert(fs.existsSync(path.join(root,match[1])),`Missing CSS asset ${match[1]}`);
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length,'Unbalanced CSS');
assert.equal((referenceCss.match(/{/g)||[]).length,(referenceCss.match(/}/g)||[]).length,'Unbalanced reference CSS');
for(const rule of ['.site-header{','.hero{','.news-grid{','.school-grid{','dialog{','@media(max-width:560px)','prefers-reduced-motion'])assert(css.includes(rule),`Missing layout rule ${rule}`);
let document;
class Node {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.events={};this.value='';this.textContent='';const classes=new Set();this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,force)=>{const value=force??!classes.has(x);value?classes.add(x):classes.delete(x);return value;}};}
  append(...nodes){this.children.push(...nodes);}
  appendChild(node){this.append(node);return node;}
  remove(){this.removed=true;}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(key,value){this.attrs[key]=value;}
  getAttribute(key){return this.attrs[key];}
  addEventListener(key,handler){(this.events[key]??=[]).push(handler);}
  emit(key,event={}){for(const handler of this.events[key]??[])handler(event);}
  focus(){document.activeElement=this;}
  querySelectorAll(tag){return this.children.flatMap(node=>[...(node.tagName===tag?[node]:[]),...node.querySelectorAll(tag)]);}
  querySelector(tag){return this.querySelectorAll(tag)[0];}
  showModal(){this.open=true;}
  close(){this.open=false;this.emit('close');}
}
const selectors={};
for(const key of ['#news-grid','#load-more','#news-status','#news-search','#content-dialog','#dialog-body','.dialog-close','.menu-toggle','#navigation','#partners','#partners-toggle'])selectors[key]=new Node();
const filters=['all','prestasi','kegiatan'].map(filter=>{const n=new Node('button');n.dataset.filter=filter;return n;});
selectors['#navigation'].append(new Node('a'));
document={body:new Node('body'),activeElement:new Node(),createElement:tag=>new Node(tag),querySelector:key=>selectors[key],querySelectorAll:key=>key==='.filter'?filters:[],addEventListener(){}};
const context=vm.createContext({window:{location:{search:''}},document,Intl,Date,console,URLSearchParams});
vm.runInContext(read('content.js'),context);
const data=context.window.AMANAH_CONTENT;
assert.equal(data.posts.length,29);assert.equal(data.profiles.length,3);assert.equal(data.partners.length,17);
assert(data.posts.some(p=>p.blocks.some(b=>b.type==='li')),'Article list content must be retained');
for(const post of data.posts){assert(post.title&&post.blocks.length&&/^https:\/\/sekolahamanah.sch.id\//.test(post.url));assert(fs.existsSync(path.join(root,post.image)));}
for(const source of data.partners)assert(fs.existsSync(path.join(root,source)));
assert(!read('content.js').includes('â€™'),'Content encoding damaged');
vm.runInContext(read('app.js'),context);
const grid=selectors['#news-grid'];
assert.equal(grid.children.length,6,'Initial six articles');
selectors['#load-more'].emit('click');assert.equal(grid.children.length,12,'More articles');
filters[1].emit('click');assert.equal(grid.children.length,6);assert(grid.children.every(n=>n.children[0].children[1].textContent==='PRESTASI'));
filters[2].emit('click');assert(grid.children.every(n=>n.children[0].children[1].textContent==='KEGIATAN'));
selectors['#news-search'].value='not-a-real-story';selectors['#news-search'].emit('input');assert.equal(grid.children[0].className,'empty');assert.equal(selectors['#load-more'].hidden,true);
filters[0].emit('click');selectors['#news-search'].value='  FuTsAl ';selectors['#news-search'].emit('input');assert(grid.children.every(n=>n.children[2].textContent.toLowerCase().includes('futsal')));
const trigger=grid.children[0].querySelector('button');trigger.focus();trigger.emit('click');assert.equal(selectors['#content-dialog'].open,true);assert(selectors['#dialog-body'].children.some(n=>n.id==='dialog-title'));
selectors['.dialog-close'].emit('click');assert.equal(selectors['#content-dialog'].open,false);assert.equal(document.activeElement,trigger);
selectors['.menu-toggle'].emit('click');assert.equal(selectors['.menu-toggle'].attrs['aria-expanded'],'true');selectors['#navigation'].children[0].emit('click');assert.equal(selectors['.menu-toggle'].attrs['aria-expanded'],'false');
assert.equal(selectors['#partners'].children.length,2,'Two matching groups provide a seamless logo loop');
const [originalPartners,duplicatePartners]=selectors['#partners'].children;
assert.equal(originalPartners.children.length,17);assert.equal(duplicatePartners.children.length,17);
assert.equal(duplicatePartners.getAttribute('aria-hidden'),'true');
assert.deepEqual(originalPartners.children.map(img=>img.src),duplicatePartners.children.map(img=>img.src));
assert(duplicatePartners.children.every(img=>img.alt===''),'Duplicate logos are decorative');
selectors['#partners-toggle'].emit('click');assert(selectors['#partners'].classList.contains('is-paused'));assert.equal(selectors['#partners-toggle'].getAttribute('aria-pressed'),'true');
selectors['#partners-toggle'].emit('click');assert(!selectors['#partners'].classList.contains('is-paused'));assert.equal(selectors['#partners-toggle'].getAttribute('aria-pressed'),'false');
const linkedContext=vm.createContext({window:{AMANAH_CONTENT:data,location:{search:'?berita=1028'}},document,Intl,Date,console,URLSearchParams});
vm.runInContext(read('app.js'),linkedContext);assert(selectors['#content-dialog'].open);assert(selectors['#dialog-body'].children.some(node=>node.textContent===context.readableTitle(data.posts.find(post=>post.id===1028).title)));selectors['#content-dialog'].close();
const invalidContext=vm.createContext({window:{AMANAH_CONTENT:data,location:{search:'?berita=unknown'}},document,Intl,Date,console,URLSearchParams});
vm.runInContext(read('app.js'),invalidContext);assert(!selectors['#content-dialog'].open,'Unknown story IDs leave the news page usable');
console.log('PASS: content, local assets, navigation anchors, filters, search, pagination, article deep links, focus restoration and menu state.');
{
  const profileCss=read('profiles.css');assert.equal((profileCss.match(/{/g)||[]).length,(profileCss.match(/}/g)||[]).length);
  const instagramAccounts={sd:'sditamanah_tng',smp:'smpamanah.tng',smk:'smkamanah.tng'};
  assert.equal((html.match(/class="instagram-card /g)||[]).length,4);
  assert(html.includes('class="instagram-card youtube" href="https://youtube.com/@sekolahamanahtv?si=uGbNANg7oGSKSqxz"'));
  for(const [key,account] of Object.entries(instagramAccounts))assert(html.includes(`class="instagram-card ${key}" href="https://www.instagram.com/${account}/"`));
  for(const [key,count] of [['tk',4],['sd',2],['smp',1],['smk',1]]){
    assert(html.includes(`class="level-tile ${key}" href="${key}.html"`));
    const page=read(`${key}.html`);assert(page.includes(`class="profile-page profile-${key}"`));
    assert(!page.includes('class="footer-socials"'),'Footer social duplicates are removed');
    assert(!page.includes('class="instagram-card '),'Profiles use a compact Instagram link');
    assert.equal((page.match(/class="profile-instagram-link"/g)||[]).length,key==='tk'?0:1,'Only available school accounts are shown');
    if(instagramAccounts[key])assert(page.includes(`class="profile-instagram-link" href="https://www.instagram.com/${instagramAccounts[key]}/"`),'Profile links to its own Instagram account');
    assert.equal((page.match(/aria-current="page"/g)||[]).length,1);
    assert.equal((page.match(/class="location-choice(?: is-active)?"/g)||[]).length,count);
    assert.equal((page.match(/aria-pressed="true"/g)||[]).length,1);
    for(const destination of ['tk','sd','smp','smk'])assert(page.includes(`href="${destination}.html"`));
    for(const id of ['main','tentang','about-heading','program','program-heading','kegiatan','lokasi','motion-toggle','school-map'])assert(page.includes(`id="${id}"`));
    assert(page.includes('class="profile-about-photo"'));assert(page.includes('class="profile-highlights"'));assert(page.includes('class="profile-program-list"'));
    assert.equal((page.match(/class="profile-program-icon"/g)||[]).length,key==='smk'?4:3);assert(!page.includes('d="undefined"'),'Every program has a valid illustrated icon');
    for(const match of page.matchAll(/(?:src|href)="([^\"]+)"/g)){
      const url=new URL(match[1].replace(/&amp;/g,'&'),`http://local/${key}.html`);
      if(url.origin!=='http://local')continue;
      const file=url.pathname.slice(1);assert(fs.existsSync(path.join(root,file)),`Missing profile destination ${key}: ${file}`);
      if(url.hash)assert(read(file).includes(`id="${url.hash.slice(1)}"`),`Missing profile anchor ${key}: ${url.hash}`);
      if(url.searchParams.has('berita'))assert(data.posts.some(post=>String(post.id)===url.searchParams.get('berita')&&post.school===`${key.toUpperCase()} AMANAH`),'Related stories match their school');
    }
    const button=page.match(/<button type="button" class="location-choice[^\"]*"[\s\S]*?<\/button>/)[0];
    assert(page.includes(`src="${button.match(/data-map-src="([^\"]+)"/)[1]}"`),'Initial profile map matches the selected branch');
  }
  assert(!html.includes('data-school='));assert(!html.includes('smpamanahkotatangerang.blogspot.com'));
  const menu=new Node('button'),navigation=new Node(),link=new Node('a'),events=new Node();navigation.append(link);
  vm.runInNewContext(read('profile.js'),{document:{querySelector:selector=>selector==='.menu-toggle'?menu:navigation,addEventListener:(...args)=>events.addEventListener(...args)}});
  menu.emit('click');assert.equal(menu.getAttribute('aria-expanded'),'true');link.emit('click');assert.equal(menu.getAttribute('aria-expanded'),'false');
  menu.emit('click');events.emit('keydown',{key:'Escape'});assert(!navigation.classList.contains('is-open'));assert.equal(document.activeElement,menu);
  console.log('PASS: four local school sites, static content, cross-profile navigation, assets, school-specific stories and maps, plus accessible mobile menus.');
}
const THREE=require('./assets/vendor/three.min.js');
const linearColor=hex=>new THREE.Color(hex).convertSRGBToLinear();
const modelContext=vm.createContext({window:{},console});
vm.runInContext(read('campus.js'),modelContext);
const campus=modelContext.window.AmanahCampus;
const model=campus.createModel(THREE);
assert.deepEqual(Object.keys(model.sections).sort(),['futsal','sd','smk','smp','tk']);
const bounds=new THREE.Box3().setFromObject(model.group);
assert(bounds.min.toArray().every(Number.isFinite)&&bounds.max.toArray().every(Number.isFinite));
assert(bounds.min.y>-2&&bounds.max.y<10,'Model stays inside the camera height');
assert(bounds.min.x>=-12&&bounds.max.x<=12&&bounds.min.z>=-12&&bounds.max.z<=12);
assert.equal(model.students.length,5);assert.equal(model.marker.visible,false);
const roofMaterial=model.sections.smk.children.find(node=>node.material?.color.equals(linearColor(0x317450))).material;
const originalRoof=roofMaterial.color.clone();
let foliage;
model.group.traverse(node=>{if(node.material?.color?.equals(linearColor(0x5d9c4c)))foliage=node.material;});
const originalFoliage=foliage.color.clone();
const closeColor=(actual,expected)=>actual.toArray().every((channel,index)=>Math.abs(channel-expected.toArray()[index])<.00001);
for(const key of ['tk','sd','smp','smk']){
  const before=roofMaterial.color.clone();const target=linearColor(campus.THEMES[key].roof[0]);
  model.setTheme(key);assert(roofMaterial.color.equals(before),'Changing a theme must not jump immediately');
  model.updateTheme(1/30);assert(!roofMaterial.color.equals(before));assert(!roofMaterial.color.equals(target));
  for(let i=0;i<90;i++)model.updateTheme(1/30);
  assert(closeColor(roofMaterial.color,target),`Theme ${key} reaches the intended color`);
  assert(foliage.color.equals(originalFoliage),'Building colors must not recolor shared tree materials');
}
model.setTheme('all',true);assert(roofMaterial.color.equals(originalRoof));
model.setTheme('tk');model.updateTheme(.1);const interrupted=roofMaterial.color.clone();model.setTheme('smp');assert(roofMaterial.color.equals(interrupted),'Rapid selection preserves the current transition color');
model.setTheme('smk',true);assert(roofMaterial.color.equals(linearColor(campus.THEMES.smk.roof[0])),'Reduced-motion changes apply immediately');
model.setTheme('all',true);
for(const key of Object.keys(campus.ZONES)){assert(Number.isFinite(campus.ZONES[key].angle));assert(campus.ZONES[key].point.every(Number.isFinite));}
let meshes=0;model.group.traverse(node=>{if(node.isMesh){meshes++;assert(node.geometry.attributes.position.array.every(Number.isFinite));}});
assert(meshes>100&&meshes<400,`Unexpected model complexity ${meshes}`);
const safePage=read('index.html');
for(const claim of ['EST. 2012','Pendidikan Islam Raya','Bina Insan Mandiri','ARCHERY','ROBO','Permintaan terkirim'])assert(!safePage.includes(claim),`Reference placeholder leaked: ${claim}`);
console.log(`PASS: 3D geometry, five selectable zones, model bounds, ${meshes} meshes and original school content.`);
// Exercise the actual scene controller with real geometry and an in-memory renderer.
const sceneNodes={};
for(const key of ['#campus-stage','#campus-fallback','#campus-left','#campus-auto','#campus-time','#campus-reset','#zone-badge','#zone-title','#zone-description'])sceneNodes[key]=new Node();
const stage=sceneNodes['#campus-stage'];stage.clientWidth=640;stage.clientHeight=520;
const introTitle=html.match(/id="zone-title">([^<]+)</)[1];
sceneNodes['#zone-title'].textContent=introTitle;
stage.closest=()=>stage;
let resizeScene,animateScene;
class MemoryRenderer{
  constructor(){this.domElement=new Node('canvas');this.shadowMap={};}
  setPixelRatio(){}setSize(){}dispose(){}
  render(scene,camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}
}
const sceneEvents=new Node();
const sceneDocument={hidden:false,querySelector:key=>sceneNodes[key],querySelectorAll:()=>[],addEventListener:(...args)=>sceneEvents.addEventListener(...args)};
const sceneWindow={THREE:{...THREE,WebGLRenderer:MemoryRenderer},matchMedia:()=>({matches:false}),devicePixelRatio:1,addEventListener(){}};
const sceneContext=vm.createContext({window:sceneWindow,document:sceneDocument,console,ResizeObserver:class{constructor(callback){resizeScene=callback;}observe(){}},requestAnimationFrame:callback=>{animateScene=callback;return 1;},cancelAnimationFrame(){}});
vm.runInContext(read('campus.js'),sceneContext);
assert.equal(sceneNodes['#campus-fallback'].hidden,true,'3D scene replaces static art');
const sceneModel=sceneWindow.AmanahCampus.scene.children.find(node=>node.isGroup);
assert.equal(sceneNodes['#campus-auto'].attrs['aria-pressed'],'true','Automatic rotation starts enabled');
animateScene(40);assert(sceneModel.rotation.y>0,'The model rotates immediately without clicking Auto');
const initialRotation=sceneModel.rotation.y;
for(const type of ['pointerdown','pointermove','pointerup','pointercancel','keydown'])assert(!stage.events[type],'The illustration has no manual pointer or keyboard controls');
stage.emit('pointerdown',{isPrimary:true,button:0,pointerId:1,clientX:50,clientY:50});
stage.emit('pointermove',{pointerId:1,clientX:90,clientY:50});stage.emit('pointerup',{pointerId:1});
assert.equal(sceneNodes['#campus-auto'].attrs['aria-pressed'],'true','Touching the illustration keeps automatic rotation enabled');
animateScene(80);assert(sceneModel.rotation.y>initialRotation,'Automatic rotation continues after touch or drag');
for(const zone of Object.keys(campus.ZONES)){sceneWindow.AmanahCampus.focusZone(zone);assert.equal(sceneNodes['#zone-title'].textContent,introTitle);}
const sceneRoof=sceneModel.children.find(node=>node.userData.zone==='smk').children.find(node=>node.material?.color.equals(linearColor(0x317450))).material;
const sceneBefore=sceneRoof.color.clone();
sceneWindow.AmanahCampus.focusZone('smp');
assert(sceneRoof.color.equals(sceneBefore));animateScene(120);assert(!sceneRoof.color.equals(sceneBefore));
for(let time=160;time<=3200;time+=40)animateScene(time);
assert(closeColor(sceneRoof.color,linearColor(campus.THEMES.smp.roof[0])),'Selecting a level animates the real model palette');
sceneNodes['#campus-auto'].emit('click');assert.equal(sceneNodes['#campus-auto'].attrs['aria-pressed'],'true');
sceneEvents.emit('amanah:motion',{detail:{paused:true}});animateScene(3240);const pausedRotation=sceneModel.rotation.y;animateScene(3280);assert.equal(sceneModel.rotation.y,pausedRotation,'Global pause stops automatic 3D rotation');assert.equal(sceneModel.position.y,0);
sceneEvents.emit('amanah:motion',{detail:{paused:false}});animateScene(3320);assert.notEqual(sceneModel.rotation.y,pausedRotation,'Global resume restores automatic 3D rotation');
sceneNodes['#campus-left'].emit('click');assert.equal(sceneNodes['#campus-auto'].attrs['aria-pressed'],'false');
sceneNodes['#campus-time'].emit('click');assert.equal(sceneNodes['#campus-time'].textContent,'◒ Senja');assert(stage.classList.contains('is-sunset'));
sceneNodes['#campus-time'].emit('click');assert.equal(sceneNodes['#campus-time'].textContent,'☀ Pagi');
sceneNodes['#campus-time'].emit('click');sceneNodes['#campus-reset'].emit('click');assert.equal(sceneNodes['#zone-title'].textContent,introTitle);assert.equal(sceneNodes['#campus-time'].textContent,'☀ Pagi');assert(!stage.classList.contains('is-sunset'));
const ambientLight=sceneWindow.AmanahCampus.scene.children.find(node=>node.isAmbientLight);
const sunlight=sceneWindow.AmanahCampus.scene.children.find(node=>node.isDirectionalLight);
assert.equal(ambientLight.intensity,.5);assert.equal(sunlight.intensity,.65);
assert(sunlight.color.equals(linearColor(0xfff8e8)),'Reset retains the correct lighting color space');
stage.clientWidth=360;stage.clientHeight=339;resizeScene();
const failedNodes={...sceneNodes};
failedNodes['#campus-fallback']=new Node();
const failedContext=vm.createContext({window:{THREE:undefined,matchMedia:()=>({matches:false})},document:{querySelector:key=>failedNodes[key],querySelectorAll:()=>[],addEventListener(){}}});
vm.runInContext(read('campus.js'),failedContext);
assert.equal(failedNodes['#campus-fallback'].hidden,false);assert.equal(failedNodes['#campus-left'].disabled,true);
console.log('PASS: smooth level palettes, isolated materials, interrupted transitions, reduced motion, zone selection, automatic rotation unaffected by touch, daylight, reset, resize and fallback.');
const bannerNodes={};
(async()=>{
  const source=read('banner-greeters.js');
  class MemoryTextureLoader extends THREE.Loader{load(url,onLoad){const texture=new THREE.Texture({width:64,height:64});queueMicrotask(()=>onLoad(texture));return texture;}}
  const assetThree={...THREE,TextureLoader:MemoryTextureLoader};
  vm.runInNewContext(read('assets/vendor/GLTFLoader.js'),{THREE:assetThree,console,URL,Blob,self:{URL},ArrayBuffer,Uint8Array,DataView});
  const scenes=await Promise.all(['steve','alex'].map(name=>new Promise((resolve,reject)=>{
    const data=fs.readFileSync(path.join(root,'assets/models/'+name+'.glb'));
    assert.equal(data.readUInt32LE(0),0x46546c67);
    const manifest=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString('utf8'));
    assert.equal(manifest.meshes.length,6,'All six original body parts are preserved');
    assert.equal(manifest.images.length,1);assert(manifest.images[0].bufferView!==undefined,'Original skin is embedded');
    new assetThree.GLTFLoader().parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'',asset=>resolve(asset.scene),reject);
  })));
  const modelContext={window:{}};vm.runInNewContext(source,modelContext);
  const greeters=modelContext.window.AmanahGreeters.createGreeters(THREE,scenes.map(scene=>scene.clone(true)));
  assert.equal(greeters.characters.map(item=>item.character.name).join(','),'Steve,Alex');
  const angles=greeters.characters.map(item=>item.wave.rotation.z);
  greeters.pose(.7);greeters.characters.forEach((item,index)=>assert.notEqual(item.wave.rotation.z,angles[index]));
  for(const time of [0,.7,2.2,4]){
    greeters.pose(time);
    const left=new THREE.Box3().setFromObject(greeters.characters[0].character);
    const right=new THREE.Box3().setFromObject(greeters.characters[1].character);
    assert(right.min.x-left.max.x>.3,'The two characters remain visibly separated throughout their wave');
  }
  let parts=0;greeters.group.traverse(item=>{if(item.isMesh){parts++;assert(item.material.color.toArray().every(Number.isFinite));}});
  assert.equal(parts,12,'The greeters use the actual meshes from both supplied models');
  const host=new Node(),fallback=new Node('img'),events=new Node(),windowEvents=new Node(),preferenceEvents=new Node();host.append(fallback);host.clientWidth=270;host.clientHeight=180;
  const preference={matches:false,addEventListener:(...args)=>preferenceEvents.addEventListener(...args)};
  const frames=new Map();let nextFrame=0,visibility,renderedScene;
  class GreeterRenderer extends MemoryRenderer{render(scene,camera){super.render(scene,camera);renderedScene=scene;}}
  const doc={hidden:false,querySelector:()=>host,addEventListener:(...args)=>events.addEventListener(...args)};
  class LocalModelLoader{load(url,onLoad){const index=url.includes('steve')?0:1;queueMicrotask(()=>onLoad({scene:scenes[index].clone(true)}));}}
  const win={THREE:{...THREE,GLTFLoader:LocalModelLoader,WebGLRenderer:GreeterRenderer},devicePixelRatio:1,localStorage:{getItem:()=>null},matchMedia:()=>preference,IntersectionObserver:class{constructor(callback){visibility=callback;}observe(){}},addEventListener:(...args)=>windowEvents.addEventListener(...args)};
  vm.runInNewContext(source,{window:win,document:doc,ResizeObserver:class{observe(){}},requestAnimationFrame:callback=>{const id=++nextFrame;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id)});
  events.emit('amanah:motion',{detail:{paused:true}});
  await new Promise(resolve=>setImmediate(resolve));
  assert(fallback.hidden);assert.equal(frames.size,0,'Offscreen mascots do not animate');
  visibility([{isIntersecting:true}]);assert.equal(frames.size,0,'Pause preferences received while models load are retained');
  events.emit('amanah:motion',{detail:{paused:false}});
  visibility([{isIntersecting:true}]);assert.equal(frames.size,1);
  const tick=time=>{const [id,callback]=frames.entries().next().value;frames.delete(id);callback(time);};
  const wave=renderedScene.getObjectByName('Steve_WaveArm');
  const initial=wave.rotation.z;tick(40);tick(80);assert.notEqual(wave.rotation.z,initial,'The visible character actually waves');
  events.emit('amanah:motion',{detail:{paused:true}});assert.equal(frames.size,0);
  events.emit('amanah:motion',{detail:{paused:false}});assert.equal(frames.size,1);
  preference.matches=true;preferenceEvents.emit('change');assert.equal(frames.size,0,'Reduced motion stops waving');
  preference.matches=false;preferenceEvents.emit('change');assert.equal(frames.size,1);
  doc.hidden=true;events.emit('visibilitychange');assert.equal(frames.size,0);doc.hidden=false;events.emit('visibilitychange');
  visibility([{isIntersecting:false}]);assert.equal(frames.size,0);visibility([{isIntersecting:true}]);
  host.children[1].emit('webglcontextlost',{preventDefault(){}});assert.equal(fallback.hidden,false);assert.equal(frames.size,0);
  windowEvents.emit('pageshow');assert.equal(frames.size,0,'Lost WebGL contexts keep the static fallback');
  const failedHost=new Node(),failedImage=new Node('img');failedHost.append(failedImage);
  class FailingModelLoader{load(url,onLoad,progress,onError){queueMicrotask(()=>onError(new Error('Model unavailable')));}}
  vm.runInNewContext(source,{window:{...win,THREE:{...win.THREE,GLTFLoader:FailingModelLoader}},document:{...doc,querySelector:()=>failedHost}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(failedImage.hidden,false,'A failed model download keeps the original-model PNG visible');assert.equal(failedHost.children.length,1,'No renderer is created for unavailable models');
  const chaseSource=read('portal-chase.js');vm.runInNewContext(chaseSource,modelContext);
  const chase=modelContext.window.AmanahPortalChase;
  assert.equal(chase.sample('Alex',.5,-20,20).visible,false);
  assert.equal(chase.sample('Alex',1.1,-20,20).mode,'run');
  assert.equal(chase.sample('Alex',8.5,-20,20).visible,false);
  assert.equal(chase.sample('Steve',9.5,-20,20).mode,'wave');
  assert.equal(chase.sample('Steve',9.5,-20,20).x,chase.sample('Steve',10.5,-20,20).x,'Steve stands still while waving');
  assert.equal(chase.sample('Steve',11.3,-20,20).mode,'run');assert.equal(chase.sample('Steve',12,-20,20).visible,false);
  assert.equal(JSON.stringify(chase.sample('Steve',5,-20,20)),JSON.stringify(chase.sample('Steve',5+chase.duration,-20,20)),'Portal story loops exactly');
  const story=chase.createChase(THREE,scenes.map(scene=>scene.clone(true)));
  assert.equal(story.portals.length,2);
  for(const width of [14,24,35])for(let time=0;time<chase.duration;time+=.1){
    story.pose(time,width);
    for(const actor of story.actors){assert(Number.isFinite(actor.character.position.x));assert(Math.abs(actor.character.position.x)<width);}
    const [steve,alex]=story.actors.map(actor=>actor.character);
    if(steve.visible&&alex.visible)assert(alex.position.x-steve.position.x>2,'Alex stays ahead without touching Steve');
  }
  const chaseHost=new Node(),chaseFallback=new Node('img');chaseHost.append(chaseFallback);chaseHost.clientWidth=240;chaseHost.clientHeight=60;
  vm.runInNewContext(chaseSource,{window:{...win,AmanahGreeters:modelContext.window.AmanahGreeters},document:{...doc,querySelector:()=>chaseHost},ResizeObserver:class{observe(){}},requestAnimationFrame:callback=>{const id=++nextFrame;frames.set(id,callback);return id;},cancelAnimationFrame:id=>frames.delete(id)});
  await new Promise(resolve=>setImmediate(resolve));assert(chaseFallback.hidden);assert.equal(frames.size,0);
  visibility([{isIntersecting:true}]);assert.equal(frames.size,1);
  const runningSteve=renderedScene.getObjectByName('Steve'),runningAlex=renderedScene.getObjectByName('Alex');
  assert(runningSteve.visible&&runningAlex.visible,'Both characters are already visible when the visitor scrolls to the scene');
  const arrivalX=runningSteve.position.x;tick(40);tick(80);assert(runningSteve.position.x>arrivalX);
  events.emit('amanah:motion',{detail:{paused:true}});assert.equal(frames.size,0);
  events.emit('amanah:motion',{detail:{paused:false}});assert.equal(frames.size,1);
  preference.matches=true;preferenceEvents.emit('change');assert.equal(frames.size,0,'Reduced motion freezes the portal scene');
  preference.matches=false;preferenceEvents.emit('change');assert.equal(frames.size,1);
  visibility([{isIntersecting:false}]);assert.equal(frames.size,0);
  visibility([{isIntersecting:true}]);assert.equal(runningSteve.position.x,arrivalX,'Returning visitors immediately see the running phase again');chaseHost.children[1].emit('webglcontextlost',{preventDefault(){}});assert.equal(chaseFallback.hidden,false);assert.equal(frames.size,0);
  console.log('PASS: portal entry, running order and separation, Steve stopping and waving, return portal, exact loop, pause, visibility and fallback.');
  assert(html.includes('id="banner-greeters"'));assert(read('prepare-deploy.cjs').includes("'banner-greeters.js'"));
  console.log('PASS: original Steve and Alex GLBs, embedded skins, real loader compatibility, waving, loading-time pause, reduced motion, visibility and fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
for(const key of ['#admission-carousel','#banner-track','#banner-play','#banner-prev','#banner-next','#banner-name','#banner-counter','#banner-full','#banner-status'])bannerNodes[key]=new Node();
bannerNodes['#banner-track'].style={};
const bannerMarkup=[...html.matchAll(/<a class="banner-slide"[\s\S]*?<\/a>/g)].map(match=>match[0]);
assert.deepEqual(bannerMarkup.map(slide=>slide.match(/<img src="([^"]+)"/)[1]),['assets/spmb-tk.png','assets/spmb-sd-2027.png','assets/spmb-smp-2027.png','assets/spmb-smk-2027.png']);
assert(bannerMarkup[0].includes('aria-hidden="false"')&&bannerMarkup[0].includes('loading="eager"'));
assert(bannerMarkup.slice(1).every(slide=>slide.includes('aria-hidden="true"')&&slide.includes('tabindex="-1" inert')&&slide.includes('loading="lazy"')));
const bannerSlides=bannerMarkup.map(markup=>{const slide=new Node('a');slide.dataset.name=markup.match(/data-name="([^"]+)"/)[1];const image=new Node('img');image.setAttribute('src',markup.match(/<img src="([^"]+)"/)[1]);slide.append(image);return slide;});
const bannerDots=bannerSlides.map((_,index)=>{const dot=new Node('button');dot.dataset.bannerSlide=String(index);return dot;});
const carousel=bannerNodes['#admission-carousel'];
carousel.querySelectorAll=selector=>selector==='.banner-slide'?bannerSlides:bannerDots;
const timers=new Map();let timerId=0;let reducedChange;
const bannerEvents=new Node();
const bannerDocument={hidden:false,querySelector:key=>bannerNodes[key],addEventListener:(...args)=>bannerEvents.addEventListener(...args)};
const bannerContext=vm.createContext({document:bannerDocument,window:{matchMedia:()=>({matches:false,addEventListener:(_,handler)=>{reducedChange=handler;}}),addEventListener(){}},setTimeout:handler=>{const id=++timerId;timers.set(id,handler);return id;},clearTimeout:id=>timers.delete(id)});
vm.runInContext(read('banner.js'),bannerContext);
assert.equal(timers.size,1);assert.equal(bannerNodes['#banner-name'].textContent,'KB/RA–TK Amanah');
bannerEvents.emit('amanah:motion',{detail:{paused:true}});assert.equal(timers.size,0,'Global animation pause stops banner autoplay');
bannerEvents.emit('amanah:motion',{detail:{paused:false}});assert.equal(timers.size,1,'Global resume restores the existing banner play preference');
const [firstTimer,advance]=timers.entries().next().value;timers.delete(firstTimer);advance();
assert.equal(bannerNodes['#banner-name'].textContent,'SDIT Amanah');assert.equal(timers.size,1);
assert.equal(bannerSlides[1].inert,false);assert.equal(bannerSlides[0].inert,true);
// Clicking Pause must still pause when focusin fires between pointerdown and click.
bannerNodes['#banner-play'].emit('pointerdown',{button:0});carousel.emit('focusin');bannerNodes['#banner-play'].emit('click');
assert.equal(bannerNodes['#banner-play'].attrs['aria-pressed'],'false');assert.equal(timers.size,0);
bannerNodes['#banner-prev'].emit('click');bannerNodes['#banner-prev'].emit('click');assert.equal(bannerNodes['#banner-counter'].textContent,'04 / 04');
bannerDots[2].emit('click');assert.equal(bannerNodes['#banner-name'].textContent,'SMP Amanah');assert.equal(bannerNodes['#banner-full'].href,'assets/spmb-smp-2027.png');
assert.equal(bannerDots[2].attrs['aria-pressed'],'true');assert.equal(bannerSlides[2].tabIndex,0);assert.equal(bannerSlides[0].tabIndex,-1);
bannerNodes['#banner-play'].emit('click');assert.equal(timers.size,1);
carousel.emit('mouseenter');assert.equal(timers.size,0);carousel.emit('mouseleave');assert.equal(timers.size,1);
bannerDocument.hidden=true;bannerEvents.emit('visibilitychange');assert.equal(timers.size,0);bannerDocument.hidden=false;bannerEvents.emit('visibilitychange');assert.equal(timers.size,1);
reducedChange({matches:true});assert.equal(timers.size,0);
let prevented=false;carousel.emit('keydown',{key:'ArrowRight',preventDefault(){prevented=true;}});assert(prevented);assert.equal(bannerNodes['#banner-name'].textContent,'SMK Amanah');
assert(bannerNodes['#banner-status'].textContent.includes('SMK Amanah'));assert.equal(timers.size,0);
console.log('PASS: banner autoplay, unique slides, wraparound, navigation, pause/focus ordering, hover, visibility, keyboard and reduced motion.');
{
  function motionHarness({saved=false,reduce=false,observers=true,storageBlocked=false}={}){
    const root=new Node('html'),button=new Node('button'),label=new Node('span'),events=new Node(),windowEvents=new Node();button.append(label);
    const idle=new Node(),reveal=new Node();reveal.style={setProperty(){}};
    const media=new Node();media.matches=reduce;
    const storage=new Map(saved?[['amanah-motion-paused','true']]:[]),watchers=[],changes=[];
    const doc={hidden:false,documentElement:root,querySelector:()=>button,querySelectorAll:selector=>selector.startsWith('.hero-background')?[idle]:[reveal],addEventListener:(...args)=>events.addEventListener(...args),dispatchEvent:event=>changes.push(event.detail.paused)};
    const win={matchMedia:()=>media,addEventListener:(...args)=>windowEvents.addEventListener(...args),localStorage:{getItem:key=>{if(storageBlocked)throw Error('Unavailable');return storage.get(key);},setItem:(key,value)=>{if(storageBlocked)throw Error('Unavailable');storage.set(key,value);}}};
    if(observers)win.IntersectionObserver=class{constructor(callback){this.callback=callback;this.observed=new Set();watchers.push(this);}observe(node){this.observed.add(node);}unobserve(node){this.observed.delete(node);}};
    vm.runInNewContext(read('motion.js'),{document:doc,window:win,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}}});
    return{root,button,label,events,windowEvents,idle,reveal,media,storage,watchers,changes,doc};
  }
  const motion=motionHarness();
  assert(motion.root.classList.contains('motion-running'));assert.equal(motion.button.hidden,false);assert.equal(motion.button.getAttribute('aria-pressed'),'false');
  motion.watchers[0].callback([{target:motion.idle,isIntersecting:true}]);assert(motion.idle.classList.contains('motion-inview'));
  motion.watchers[0].callback([{target:motion.idle,isIntersecting:false}]);assert(!motion.idle.classList.contains('motion-inview'),'Offscreen idle effects pause');
  motion.watchers[1].callback([{target:motion.reveal,isIntersecting:true}]);assert(motion.reveal.classList.contains('is-entering'));assert(!motion.watchers[1].observed.has(motion.reveal),'Reveal runs once');
  motion.events.emit('focusin',{target:{closest:()=>motion.reveal}});assert(!motion.reveal.classList.contains('is-entering'),'Keyboard focus makes entering content immediately visible');
  motion.button.emit('click');assert.equal(motion.changes.at(-1),true);assert(!motion.root.classList.contains('motion-running'));assert.equal(motion.storage.get('amanah-motion-paused'),'true');
  motion.button.emit('click');assert.equal(motion.changes.at(-1),false);
  motion.doc.hidden=true;motion.events.emit('visibilitychange');assert(!motion.root.classList.contains('motion-running'));
  motion.doc.hidden=false;motion.events.emit('visibilitychange');assert(motion.root.classList.contains('motion-running'));
  motion.media.matches=true;motion.media.emit('change');assert(!motion.root.classList.contains('motion-running'));assert(motion.button.disabled);assert.equal(motion.button.getAttribute('aria-pressed'),'true');
  motion.media.matches=false;motion.media.emit('change');assert(motion.root.classList.contains('motion-running'));assert(!motion.button.disabled);
  motion.storage.set('amanah-motion-paused','true');motion.windowEvents.emit('pageshow',{persisted:true});assert(!motion.root.classList.contains('motion-running'),'Back navigation honors an animation preference changed on another school page');
  const saved=motionHarness({saved:true});assert(!saved.root.classList.contains('motion-running'));assert.equal(saved.changes.at(-1),true);
  const reduced=motionHarness({reduce:true});assert(!reduced.root.classList.contains('motion-running'));assert(reduced.button.disabled);
  reduced.watchers[1].callback([{target:reduced.reveal,isIntersecting:true}]);assert(!reduced.reveal.classList.contains('is-entering'));
  const fallback=motionHarness({observers:false,storageBlocked:true});fallback.button.emit('click');assert(!fallback.root.classList.contains('motion-running'));assert.equal(fallback.watchers.length,0);
  console.log('PASS: motion pause/resume, saved preferences, reduced motion, hidden tabs, offscreen idling, one-time reveals, keyboard focus and unavailable browser APIs.');
}
{
  function introHarness({reduce=false,saved=false,hash='',complete=false,storageBlocked=false,returning=false}={}){
    const intro=new Node(),root=new Node('html'),skip=new Node('button'),events=new Node(),windowEvents=new Node(),media=new Node();intro.hidden=true;media.matches=reduce;
    const timers=new Map();let now=0,nextId=0;
    const win={location:{hash},matchMedia:()=>media,localStorage:{getItem:()=>{if(storageBlocked)throw Error('Unavailable');return String(saved);}},setTimeout:(callback,delay)=>{const id=++nextId;timers.set(id,{callback,due:now+delay});return id;},clearTimeout:id=>timers.delete(id),addEventListener:(...args)=>windowEvents.addEventListener(...args)};
    const doc={documentElement:root,readyState:complete?'complete':'loading',querySelector:selector=>selector==='#site-intro'?intro:skip,addEventListener:(...args)=>events.addEventListener(...args)};
    vm.runInNewContext(read('intro.js'),{document:doc,window:win,performance:{now:()=>now,getEntriesByType:()=>[{type:returning?'back_forward':'navigate'}]}});
    function advance(ms){const until=now+ms;let pending;while((pending=[...timers].filter(([,timer])=>timer.due<=until).sort((a,b)=>a[1].due-b[1].due)[0])){const [id,timer]=pending;now=timer.due;timers.delete(id);timer.callback();}now=until;}
    return{intro,root,skip,events,windowEvents,media,timers,advance};
  }
  const intro=introHarness();assert.equal(intro.intro.hidden,false);assert(intro.root.classList.contains('intro-active'));
  intro.windowEvents.emit('load');intro.advance(949);assert(!intro.intro.classList.contains('is-leaving'));
  intro.advance(1);assert(intro.intro.classList.contains('is-leaving'));assert(intro.intro.inert);assert(!intro.root.classList.contains('intro-active'));
  intro.advance(240);assert(intro.intro.hidden);assert.equal(intro.timers.size,0);
  const delayed=introHarness();delayed.advance(1500);delayed.windowEvents.emit('load');assert(delayed.intro.classList.contains('is-leaving'),'Ready pages receive no extra delay after the intro minimum');
  const timeout=introHarness();timeout.advance(3000);assert(timeout.intro.classList.contains('is-leaving'),'Failed or slow assets cannot trap visitors');timeout.advance(240);assert(timeout.intro.hidden);
  const skipped=introHarness();skipped.skip.emit('click');assert(!skipped.root.classList.contains('intro-active'));skipped.advance(240);assert(skipped.intro.hidden);
  const keyboard=introHarness();keyboard.events.emit('keydown',{key:'Tab'});assert(keyboard.intro.inert,'Keyboard users can reach the page immediately');keyboard.advance(240);assert(keyboard.intro.hidden);
  const preference=introHarness();preference.media.emit('change',{matches:true});assert(preference.intro.classList.contains('is-leaving'));
  const cached=introHarness();cached.windowEvents.emit('pageshow',{persisted:true});assert(cached.intro.hidden);assert.equal(cached.timers.size,0);cached.windowEvents.emit('load');assert(cached.intro.hidden);
  const leaving=introHarness();leaving.windowEvents.emit('pagehide');assert(leaving.intro.hidden);assert(!leaving.root.classList.contains('intro-active'));
  for(const options of [{reduce:true},{saved:true},{hash:'#lokasi'},{returning:true}]){const skippedIntro=introHarness(options);assert(skippedIntro.intro.hidden);assert.equal(skippedIntro.timers.size,0);}
  const complete=introHarness({complete:true,storageBlocked:true});complete.advance(1190);assert(complete.intro.hidden);
  console.log('PASS: pixel intro readiness, bounded duration, skip button, keyboard access, reduced motion, saved pause, deep links, cached navigation and unavailable storage.');
}
{
  const locationNodes={};
  for(const id of ['#school-map','#location-map-name','#location-map-address','#location-directions','#location-status'])locationNodes[id]=new Node();
  const locationChoices=[...html.matchAll(/<button type="button" class="location-choice[^\"]*"[\s\S]*?<\/button>/g)].map(([markup])=>{
    const choice=new Node('button');
    for(const [attribute,key] of [['map-src','mapSrc'],['address','address'],['directions','directions']])choice.dataset[key]=markup.match(new RegExp(`data-${attribute}="([^\"]+)"`))[1].replace(/&amp;/g,'&');
    choice.setAttribute('aria-pressed',markup.match(/aria-pressed="([^\"]+)"/)[1]);
    choice.querySelector=()=>({textContent:markup.match(/class="location-choice-name">([^<]+)</)[1]});
    return choice;
  });
  assert.equal(locationChoices.length,4,'Four original school locations');
  assert.equal(locationChoices.filter(choice=>choice.getAttribute('aria-pressed')==='true').length,1);
  assert(html.includes(`src="${locationChoices[0].dataset.mapSrc.replace(/&/g,'&amp;')}"`),'Default map matches the first location');
  let mapLoads=0;
  Object.defineProperty(locationNodes['#school-map'],'src',{get(){return this.currentSrc;},set(value){this.currentSrc=value;mapLoads++;}});
  vm.runInNewContext(read('locations.js'),{document:{querySelector:key=>locationNodes[key],querySelectorAll:()=>locationChoices}});
  for(const index of [1,3,2,0]){
    const choice=locationChoices[index];choice.emit('click');
    assert.equal(locationNodes['#school-map'].src,choice.dataset.mapSrc);
    assert.equal(locationNodes['#location-map-name'].textContent,choice.querySelector().textContent);
    assert.equal(locationNodes['#location-map-address'].textContent,choice.dataset.address);
    assert.equal(locationNodes['#location-directions'].href,choice.dataset.directions);
    assert(locationNodes['#school-map'].title.includes(choice.querySelector().textContent));
    assert(locationNodes['#location-status'].textContent.includes(choice.querySelector().textContent));
    for(const item of locationChoices){assert.equal(item.getAttribute('aria-pressed'),String(item===choice));assert.equal(item.classList.contains('is-active'),item===choice);}
    const loads=mapLoads;choice.emit('click');assert.equal(mapLoads,loads,'Selecting the current location preserves map interaction');
  }
  vm.runInNewContext(read('locations.js'),{document:{querySelector:()=>null}});
  console.log('PASS: all four location selections update map, address, title, directions and accessible state without reloading the selected map.');
}
(async()=>{
  const child=spawn(process.execPath,[path.join(root,'server.cjs')],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe']});
  try{
    const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),10000);child.once('error',reject);child.stdout.on('data',data=>{const match=data.toString().match(/http:\/\/localhost:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});});
    for(const asset of ['','tk.html','sd.html','smp.html','smk.html','styles.css','pixel-reference.css','profiles.css','profile.js','app.js','campus.js','locations.js','motion.js','intro.js','content.js','assets/campus.svg','assets/vendor/three.min.js','assets/vendor/GLTFLoader.js','assets/models/steve.glb','assets/models/alex.glb','assets/banner-greeters.png','portal-chase.js','assets/hero-chase.png','assets/plus-jakarta-sans.ttf','assets/silkscreen.ttf']){const response=await fetch(base+'/'+asset);assert.equal(response.status,200,asset);assert((await response.arrayBuffer()).byteLength>0);}
    assert.equal((await fetch(base+'/missing-file')).status,404);
    assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
    assert.equal((await fetch(base+'/%2e%2e%2f.gitignore')).status,403);
    console.log('PASS: local HTTP serving, asset delivery, 404, method restriction and traversal protection.');
  }finally{child.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
