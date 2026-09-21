import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { GalleryId, Lighting, TowerId } from './moradas';

export interface ModelControls { zoom: (direction: number) => void; reset: () => void }
interface Props { tower: TowerId; floor: number; lighting: Lighting; onSelectFloor: (floor: number, tower: TowerId) => void; onArea: (area: GalleryId) => void; onReady: () => void; onFail: () => void }

// Deliberately a reference-based massing study, not a surveyed/BIM representation.
const DevelopmentModel = forwardRef<ModelControls, Props>(function DevelopmentModel(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const api = useRef<ModelControls & { update: () => void } | null>(null);
  useImperativeHandle(ref, () => ({ zoom: value => api.current?.zoom(value), reset: () => api.current?.reset() }), []);
  useEffect(() => { api.current?.update(); }, [props.floor, props.tower, props.lighting]);
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    async function setup() {
      const THREE = await import('three');
      const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
      if (cancelled || !host.current) return;
      const mount = host.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, .1, 600);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.22;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const canvas = renderer.domElement;
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', 'Maquete 3D do Moradas da Serra. Arraste para girar; use setas para girar, mais e menos para zoom, Home para restaurar. A seleção de andares também está disponível no painel.');
      canvas.setAttribute('role', 'img');
      mount.appendChild(canvas);
      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = .12;
      controls.enablePan = false;
      controls.minDistance = 27;
      controls.maxDistance = 125;
      controls.minPolarAngle = .28;
      controls.maxPolarAngle = Math.PI / 2 - .04;
      controls.rotateSpeed = .48;
      controls.zoomSpeed = .6;
      const home = new THREE.Vector3(52, 37, 74);
      const homeTarget = new THREE.Vector3(0, 12, 0);
      camera.position.copy(home); controls.target.copy(homeTarget); controls.update();
      const resources = new Set<{ dispose: () => void }>();
      const own = <T extends { dispose: () => void }>(resource: T) => { resources.add(resource); return resource; };
      const material = (color: string, roughness = .8) => own(new THREE.MeshStandardMaterial({ color, roughness }));
      const ivory = material('#e8e6df'), side = material('#d9d9d0'), charcoal = material('#51565a');
      const timber = material('#7a5b40'), stone = material('#b0aca0'), paving = material('#c1bfb3');
      const metal = material('#414b49', .45), glass = material('#5f7e86', .18), frameMat = material('#f6f5ec');
      const trunk = material('#74614b'), leaves = material('#526b42'), lawn = material('#708755');
      const white = material('#f5f0e4'), asphalt = material('#747a77');
      const warmGlass = own(new THREE.MeshStandardMaterial({ color: '#ddd4a2', emissive: '#ffbd68', emissiveIntensity: .25, roughness: .32 }));
      const water = own(new THREE.MeshStandardMaterial({ color: '#609fa5', metalness: .18, roughness: .2 }));
      const boxGeo = own(new THREE.BoxGeometry(1, 1, 1));
      const leafGeo = own(new THREE.IcosahedronGeometry(1, 2));
      const trunkGeo = own(new THREE.CylinderGeometry(.16, .24, 1, 6));
      const hitTargets: import('three').Object3D[] = [];
      function box(parent: import('three').Object3D, x: number, y: number, z: number, w: number, h: number, d: number, mat: import('three').Material, shadow = false) {
        const mesh = new THREE.Mesh(boxGeo, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
      }
      function tree(x: number, z: number, scale = 1) {
        const stem = new THREE.Mesh(trunkGeo, trunk); stem.position.set(x, 1.7 * scale, z); stem.scale.set(scale, 3.4 * scale, scale); stem.castShadow = true; scene.add(stem);
        for (let j = 0; j < 3; j++) { const crown = new THREE.Mesh(leafGeo, leaves); crown.position.set(x + Math.sin(j * 2.2) * .65 * scale, (3.4 + j * .38) * scale, z + Math.cos(j * 2.2) * .65 * scale); crown.scale.set(1.7 * scale, 1.55 * scale, 1.5 * scale); crown.castShadow = true; scene.add(crown); }
      }
      box(scene, 0, -.35, 0, 69, .6, 64, paving);
      box(scene, 0, -.7, 0, 500, .5, 500, lawn);
      box(scene, 0, -.05, 36, 130, .08, 8, asphalt);
      for (let x = -56; x < 60; x += 8) box(scene, x, .01, 36, 3.5, .03, .12, white);
      for (const x of [-33.5, 33.5]) box(scene, x, .6, 0, .3, 1.4, 61, stone, true);
      box(scene, 0, .6, -31, 67, 1.4, .3, stone, true);
      box(scene, -21, .6, 31, 25, 1.4, .3, stone, true); box(scene, 24, .6, 31, 19, 1.4, .3, stone, true);
      for (let x = -8; x < 14; x += .43) box(scene, x, 1.15, 31, .06, 2.3, .06, metal);
      box(scene, 3, 2.3, 31, 22, .08, .1, metal);
      for (let x = -28; x <= 29; x += 9) { tree(x, 29, .85); tree(x, -27, 1.1); }
      for (let z = -18; z < 25; z += 9) { tree(-30, z); tree(31, z); }

      const towerCenters = { a: new THREE.Vector3(8, 0, 0), b: new THREE.Vector3(-12, 0, -10) };
      function windowAt(parent: import('three').Object3D, x: number, y: number, z: number, rotate: number, index: number, wide = 1.4) {
        const window = new THREE.Group(); window.position.set(x, y, z); window.rotation.y = rotate; parent.add(window);
        box(window, 0, 0, 0, wide + .14, 1.4, .12, frameMat);
        box(window, 0, 0, .07, wide, 1.25, .045, index % 5 === 0 ? warmGlass : glass);
        box(window, 0, 0, .11, .045, 1.27, .035, frameMat);
        box(window, 0, -.73, .1, wide + .22, .07, .32, frameMat, true);
      }
      function tower(id: TowerId) {
        const root = new THREE.Group(); root.position.copy(towerCenters[id]); scene.add(root);
        const podium = 3.4, story = 2.85;
        for (const x of [-5, 0, 5]) for (const z of [-4, 4]) box(root, x, podium / 2, z, .45, podium, .45, ivory, true);
        box(root, 0, podium / 2, -1, 2.8, podium, 3.2, timber, true);
        for (let f = 1; f <= 9; f++) {
          const y = podium + (f - .5) * story;
          const level = new THREE.Group(); level.userData = { tower: id, floor: f }; root.add(level);
          box(level, 0, y, 0, 11.8, story, 9.8, side, true);
          box(level, -3.7, y, 5.15, 4.2, story, .65, ivory, true);
          box(level, 3.7, y, 5.15, 4.2, story, .65, ivory, true);
          box(level, 0, y, 4.99, 3.2, story, .3, charcoal, true);
          box(level, 0, y - .97, 5.2, 3.15, .64, .24, timber, true);
          windowAt(level, -3.7, y + .1, 5.51, 0, f); windowAt(level, 3.7, y + .1, 5.51, 0, f + 1);
          windowAt(level, 0, y + .32, 5.19, 0, f + 2, .87);
          box(level, -3.7, y - story / 2 + .02, 5.49, 4.2, .025, .035, stone);
          box(level, 3.7, y - story / 2 + .02, 5.49, 4.2, .025, .035, stone);
          for (const x of [-3.8, 3.8]) windowAt(level, x, y, -4.98, Math.PI, f);
          windowAt(level, -6, y, 1.8, -Math.PI / 2, f);
          windowAt(level, -6, y, -2.5, -Math.PI / 2, f + 2);
          windowAt(level, 6, y, -2.8, Math.PI / 2, f + 3);
          // Recessed side balcony and its solid charcoal parapet.
          box(level, 6.55, y - 1.29, 1.3, 1.6, .18, 3.7, ivory, true);
          box(level, 7.3, y - .8, 1.3, .15, .96, 3.7, charcoal, true);
          box(level, 6.55, y - .8, 3.15, 1.6, .96, .15, charcoal, true);
          windowAt(level, 6.02, y + .1, 1.3, Math.PI / 2, f, 2.25);
          hitTargets.push(...level.children);
          level.children.forEach(child => { child.userData = { tower: id, floor: f }; });
        }
        const roof = podium + 9 * story;
        box(root, 0, roof + .16, 0, 12.6, .35, 10.5, ivory, true);
        box(root, 0, roof + 1.8, -.8, 5.6, 3.3, 5.5, charcoal, true);
        const labelCanvas = document.createElement('canvas'); labelCanvas.width = 256; labelCanvas.height = 128;
        const context = labelCanvas.getContext('2d')!; context.fillStyle = '#50565a'; context.fillRect(0, 0, 256, 128); context.fillStyle = '#f7f2de'; context.textAlign = 'center'; context.font = '36px Arial'; context.fillText('DeVille', 128, 76);
        const logoMap = own(new THREE.CanvasTexture(labelCanvas)); logoMap.colorSpace = THREE.SRGBColorSpace;
        const logoMat = own(new THREE.MeshStandardMaterial({ map: logoMap, roughness: .9 }));
        box(root, 0, roof + 1.7, 1.96, 3.4, 1.7, .015, logoMat);
      }
      tower('a'); tower('b');
      // Court, leisure pavilion and arrival are separate clickable places.
      const turf = material('#46764d');
      const court = box(scene, -16, .03, 16, 15, .08, 17, turf); court.userData.area = 'court'; hitTargets.push(court);
      for (const x of [-23.3, -8.7]) box(scene, x, .09, 16, .09, .025, 16.4, white);
      for (const z of [7.8, 16, 24.2]) box(scene, -16, .09, z, 14.6, .025, .09, white);
      const circle = own(new THREE.RingGeometry(2.3, 2.37, 48)); const pitchRing = new THREE.Mesh(circle, white); pitchRing.rotation.x = -Math.PI / 2; pitchRing.position.set(-16, .11, 16); scene.add(pitchRing);
      for (const z of [8, 24]) { box(scene, -16, 1.7, z, 4.5, .1, .1, white); for (const x of [-18.2, -13.8]) box(scene, x, .85, z, .1, 1.7, .1, white); }
      for (let z = 7.5; z < 26; z += 3.5) { box(scene, -24, 1.8, z, .06, 3.6, .06, metal); box(scene, -8, 1.8, z, .06, 3.6, .06, metal); }
      for (const y of [1, 2, 3.5]) { box(scene, -24, y, 16, .03, .035, 18, metal); box(scene, -8, y, 16, .03, .035, 18, metal); }
      box(scene, 23, .05, 18, 16, .1, 19, stone);
      box(scene, 23, .2, 20, 10, .38, 7, ivory);
      const pool = box(scene, 23, .41, 20, 9.5, .02, 6.5, water); pool.userData.area = 'leisure'; hitTargets.push(pool);
      box(scene, 24, 1.6, 10, 12, 3.1, 4.5, timber, true);
      box(scene, 24, 3.3, 10.5, 14, .4, 7.5, ivory, true);
      for (const x of [19, 23, 27]) box(scene, x, 1.65, 12.3, 3.5, 2.65, .06, glass);
      for (const x of [17.2, 30.8]) box(scene, x, 1.5, 13.5, .3, 3, .3, stone, true);
      for (const x of [17.7, 28.8]) for (const z of [18, 22]) box(scene, x, .45, z, 1.3, .35, 2.4, timber, true);
      const entrance = box(scene, 8, 1.6, 27, 10, 3.2, 4, ivory, true); entrance.userData.area = 'entrance'; hitTargets.push(entrance);
      box(scene, 8, 3.3, 27, 11.5, .35, 5.2, ivory, true); box(scene, 8, 1.7, 29.02, 5.5, 2.4, .06, glass);
      // Context is a subdued schematic neighborhood, not a geographic survey.
      for (let i = 0; i < 36; i++) {
        const angle = i * 2.399, radius = 62 + (i % 4) * 13;
        const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
        const h = 3 + (i % 3) * 1.3;
        box(scene, x, h / 2, z, 6 + i % 4, h, 7, i % 2 ? stone : ivory);
        box(scene, x, h + .2, z, 6.5 + i % 4, .4, 7.6, timber);
        if (i % 2) tree(x + 6, z + 5, 1.3);
      }
      for (let z = -22; z <= 7; z += 4) {
        box(scene, 23, .01, z, 8, .06, 3.4, asphalt);
        const carMat = z % 3 ? ivory : charcoal;
        box(scene, 23, .65, z, 2.1, .9, 3.5, carMat, true); box(scene, 23, 1.24, z + .1, 1.85, .55, 1.7, glass, true);
      }
      const ambient = new THREE.HemisphereLight('#fff4db', '#a1ac93', 2.5); scene.add(ambient);
      const sun = new THREE.DirectionalLight('#ffe3af', 3.1); sun.position.set(-28, 46, 24); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -52; sun.shadow.camera.right = 52; sun.shadow.camera.top = 52; sun.shadow.camera.bottom = -52; sun.shadow.camera.near = .5; sun.shadow.camera.far = 130; sun.shadow.bias = -.0004; sun.shadow.normalBias = .025; scene.add(sun);
      const fill = new THREE.DirectionalLight('#bed1df', .8); fill.position.set(35, 28, -30); scene.add(fill);
      const highlightMat = own(new THREE.MeshBasicMaterial({ color: '#a9c594', transparent: true, opacity: .29, depthWrite: false }));
      const highlight = box(scene, 0, 0, 0, 14.8, 2.8, 11.2, highlightMat);
      const edges = own(new THREE.EdgesGeometry(new THREE.BoxGeometry(14.8, 2.8, 11.2)));
      const outline = new THREE.LineSegments(edges, own(new THREE.LineBasicMaterial({ color: '#e8efd6', transparent: true, opacity: .85 }))); scene.add(outline);
      const pinLayer = document.createElement('div'); pinLayer.className = 'development-model-pins'; mount.appendChild(pinLayer);
      const pinInfo = [{ area: 'court' as const, text: 'Quadra', position: new THREE.Vector3(-16, 1, 16) }, { area: 'leisure' as const, text: 'Lazer', position: new THREE.Vector3(24, 2, 18) }, { area: 'entrance' as const, text: 'Acesso', position: new THREE.Vector3(8, 4, 27) }];
      const pinButtons = pinInfo.map(pin => { const button = document.createElement('button'); button.type = 'button'; button.className = 'development-model-pin'; button.textContent = `${pin.text} ＋`; button.onclick = () => latest.current.onArea(pin.area); pinLayer.appendChild(button); return button; });
      let frame = 0, settling = 0, width = 1, height = 1, lost = false;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      controls.enableDamping = !reduced.matches;
      const projection = new THREE.Vector3();
      function schedule() { if (!frame && !cancelled && !lost && !document.hidden) frame = requestAnimationFrame(draw); }
      function draw() {
        frame = 0;
        if (cancelled || lost || document.hidden) return;
        controls.update(); renderer.render(scene, camera);
        pinInfo.forEach((pin, index) => { projection.copy(pin.position).project(camera); const visible = projection.z > -1 && projection.z < 1 && Math.abs(projection.x) < .91 && Math.abs(projection.y) < .83; pinButtons[index].hidden = !visible; if (visible) pinButtons[index].style.transform = `translate(${(projection.x * .5 + .5) * width}px, ${(-projection.y * .5 + .5) * height}px) translate(-50%, -100%)`; });
        mount.dataset.camera = camera.position.toArray().map(value => value.toFixed(2)).join(',');
        if (settling-- > 0) schedule();
      }
      function update() {
        const state = latest.current; const center = towerCenters[state.tower];
        highlight.position.set(center.x + .5, 3.4 + (state.floor - .5) * 2.85, center.z + .3); outline.position.copy(highlight.position);
        const night = state.lighting === 'night', day = state.lighting === 'day';
        scene.background = new THREE.Color(night ? '#263949' : day ? '#d9e6eb' : '#e8dfcf');
        scene.fog = new THREE.Fog(scene.background, 120, 245);
        ambient.intensity = night ? .75 : day ? 2.8 : 2.2;
        sun.intensity = night ? .4 : day ? 3 : 2.9;
        sun.color.set(night ? '#a4bfe1' : day ? '#fff4de' : '#ffd5a0');
        sun.position.set(day ? -18 : -36, day ? 65 : 30, 30);
        warmGlass.emissiveIntensity = night ? 2.6 : .22;
        renderer.toneMappingExposure = night ? .88 : 1.16;
        mount.dataset.lighting = state.lighting; mount.dataset.selectedFloor = `${state.tower}-${state.floor}`; schedule();
      }
      function reset() { camera.position.copy(home); controls.target.copy(homeTarget); controls.update(); settling = 20; schedule(); }
      function zoom(direction: number) { const offset = camera.position.clone().sub(controls.target); offset.setLength(THREE.MathUtils.clamp(offset.length() * (direction > 0 ? .84 : 1.18), controls.minDistance, controls.maxDistance)); camera.position.copy(controls.target).add(offset); controls.update(); schedule(); }
      api.current = { zoom, reset, update };
      const resize = () => { const rect = mount.getBoundingClientRect(); width = Math.max(rect.width, 1); height = Math.max(rect.height, 1); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); schedule(); };
      const observer = new ResizeObserver(resize); observer.observe(mount);
      const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
      let down = { x: 0, y: 0 };
      const pointerDown = (event: PointerEvent) => { down = { x: event.clientX, y: event.clientY }; };
      const pointerUp = (event: PointerEvent) => { if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6 || event.button !== 0) return; const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(hitTargets, true)[0]; if (!hit) return; let object: import('three').Object3D | null = hit.object; while (object && !object.userData.floor && !object.userData.area) object = object.parent; if (object?.userData.floor) latest.current.onSelectFloor(object.userData.floor, object.userData.tower); else if (object?.userData.area) latest.current.onArea(object.userData.area); };
      const keydown = (event: KeyboardEvent) => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return; event.preventDefault(); if (event.key === 'Home') return reset(); if (['+', '=', '-'].includes(event.key)) return zoom(event.key === '-' ? -1 : 1); const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)); spherical.theta += event.key === 'ArrowLeft' ? -.14 : event.key === 'ArrowRight' ? .14 : 0; spherical.phi = THREE.MathUtils.clamp(spherical.phi + (event.key === 'ArrowUp' ? -.1 : event.key === 'ArrowDown' ? .1 : 0), controls.minPolarAngle, controls.maxPolarAngle); camera.position.copy(new THREE.Vector3().setFromSpherical(spherical).add(controls.target)); controls.update(); schedule(); };
      const contextLost = (event: Event) => { event.preventDefault(); lost = true; latest.current.onFail(); };
      const visibility = () => { if (!document.hidden) schedule(); };
      const change = () => schedule();
      controls.addEventListener('change', change); controls.addEventListener('end', () => { settling = 30; schedule(); });
      canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('keydown', keydown); canvas.addEventListener('webglcontextlost', contextLost);
      document.addEventListener('visibilitychange', visibility);
      cleanup = () => { api.current = null; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('keydown', keydown); canvas.removeEventListener('webglcontextlost', contextLost); document.removeEventListener('visibilitychange', visibility); resources.forEach(resource => resource.dispose()); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); pinLayer.remove(); };
      update(); resize(); renderer.render(scene, camera); latest.current.onReady();
    }
    void setup().catch(error => { cleanup?.(); if (!cancelled) { console.warn('Maquete conceitual indisponível.', error); latest.current.onFail(); } });
    return () => { cancelled = true; cleanup?.(); };
  }, []);
  return <div className="development-model" ref={host} data-testid="development-model" />;
});

export default DevelopmentModel;
