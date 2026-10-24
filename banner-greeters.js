(function () {
  'use strict';
  function createGreeters(T, scenes) {
    const group = new T.Group();
    const characters = scenes.map((character, index) => {
      const name = index ? 'Alex' : 'Steve';
      const head = character.getObjectByName(name + '_Head');
      const wave = character.getObjectByName(name + '_WaveArm');
      const rest = character.getObjectByName(name + '_RestArm');
      if (!head || !wave || !rest) throw new Error('Incomplete original character model');
      character.name = name;
      character.position.x = index ? 1.55 : -1.55;
      character.rotation.y = index ? -.12 : .12;
      rest.rotation.x = -.12;
      character.traverse(mesh => {
        if (!mesh.isMesh) return;
        const original = mesh.material;
        if (original.map) {
          original.map.magFilter = T.NearestFilter;
          original.map.minFilter = T.NearestFilter;
          original.map.generateMipmaps = false;
          original.map.needsUpdate = true;
        }
        mesh.material = new T.MeshLambertMaterial({map: original.map, color: original.color, transparent: original.transparent, alphaTest: original.alphaTest, side: original.side});
      });
      group.add(character);
      return {character, head, wave, outer: index ? 1 : -1};
    });
    function pose(time) {
      characters.forEach(({character, head, wave, outer}, index) => {
        wave.rotation.z = outer * (2.72 + Math.sin(time * 2.5 + index * 1.4) * .19);
        wave.rotation.x = -.12;
        head.rotation.z = Math.sin(time * .7 + index) * .025;
        character.position.y = Math.sin(time * .9 + index) * .025;
      });
    }
    pose(0);
    return {group, characters, pose};
  }
  window.AmanahGreeters = {createGreeters};
  if (typeof document === 'undefined') return;
  const host = document.querySelector('#banner-greeters');
  if (!host || !window.THREE || !window.THREE.GLTFLoader) return;
  const T = window.THREE;
  const fallback = host.querySelector('img');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false, visible = false, available = true, frame = 0, previous = 0, elapsed = 0, renderer;
  try { paused = window.localStorage.getItem('amanah-motion-paused') === 'true'; } catch {}
  let refresh = () => {};
  document.addEventListener('amanah:motion', event => { paused = event.detail.paused; refresh(); });
  async function initialize() {
    try {
      const scenes = await Promise.all(['steve', 'alex'].map(name => new Promise((resolve, reject) => {
        new T.GLTFLoader().load('assets/models/' + name + '.glb', gltf => resolve(gltf.scene), undefined, reject);
      })));
      renderer = new T.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputEncoding = T.sRGBEncoding;
      renderer.domElement.setAttribute('aria-hidden', 'true'); host.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const model = createGreeters(T, scenes); scene.add(model.group);
      scene.add(new T.AmbientLight(0xffffff, .64));
      const light = new T.DirectionalLight(0xffffff, .36); light.position.set(-5, 9, 12); scene.add(light);
      const camera = new T.OrthographicCamera(-5.1, 5.1, 3.4, -3.4, .1, 100);
      camera.position.set(3, 5.7, 24); camera.lookAt(0, 3.05, 0);
      function resize() {
        const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
        camera.left = -3.4 * width / height; camera.right = -camera.left;
        camera.updateProjectionMatrix(); renderer.setSize(width, height); renderer.render(scene, camera);
      }
      new ResizeObserver(resize).observe(host); resize(); fallback.hidden = true;
      function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; previous = 0; }
      function animate(now) {
        frame = requestAnimationFrame(animate);
        if (now - previous < 40) return;
        if (previous) elapsed += Math.min((now - previous) / 1000, .08);
        previous = now; model.pose(elapsed); renderer.render(scene, camera);
      }
      function sync() {
        stop();
        if (available && visible && !paused && !reduced.matches && !document.hidden) frame = requestAnimationFrame(animate);
      }
      refresh = sync;
      document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync);
      if ('IntersectionObserver' in window) new window.IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(host);
      else { visible = true; sync(); }
      window.addEventListener('pagehide', stop);
      window.addEventListener('pageshow', sync);
      renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); available = false; stop(); renderer.domElement.hidden = true; fallback.hidden = false; });
    } catch {
      if (renderer) { renderer.domElement.remove(); renderer.dispose(); }
      fallback.hidden = false;
    }
  }
  initialize();
}());
