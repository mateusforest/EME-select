import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '/tmp/marble-preview/vendor/spark.module.js';

// This is a local review tool: no API keys, provider requests, tracking or sound.
// The world file is a downloaded output, never generated in the visitor's browser.
const viewer = document.querySelector('.viewer');
const host = document.querySelector('#webgl');
const start = document.querySelector('#start');
const status = document.querySelector('#status');
const toolbar = document.querySelector('#toolbar');
const compare = document.querySelector('#compare');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const query = new URLSearchParams(location.search);
const allowedQuality = window.innerWidth > 680 ? ['100k', '500k', 'full-res'] : ['100k', '500k'];
const quality = allowedQuality.includes(query.get('quality')) ? query.get('quality') : (window.innerWidth > 680 ? '500k' : '100k');
const worldUrl = new URL(`/tmp/marble-preview/world-${quality}.spz`, location.origin).href;
let renderer, spark, splats, controls, camera, scene;
let frame = 0;
let renderUntil = 0;
let ready = false;
let photo = false;
let pose = { position: [0, 0, -2], target: [0, -0.35, -6], fov: 48, flipY: true, maxAngle: 0.12 };

function scheduleRender() {
  renderUntil = performance.now() + 1800;
  if (!frame) frame = requestAnimationFrame(render);
}

function render(time) {
  frame = 0;
  if (!renderer || document.hidden || photo) return;
  controls?.update();
  renderer.render(scene, camera);
  if (time < renderUntil) frame = requestAnimationFrame(render);
}

function resize() {
  if (!renderer) return;
  const rect = host.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height);
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  scheduleRender();
}

function setPose() {
  camera.position.fromArray(pose.position);
  controls.target.fromArray(pose.target);
  controls.minAzimuthAngle = -Infinity;
  controls.maxAzimuthAngle = Infinity;
  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;
  controls.update();
  const horizontal = controls.getAzimuthalAngle();
  const vertical = controls.getPolarAngle();
  const distance = camera.position.distanceTo(controls.target);
  controls.minAzimuthAngle = horizontal - pose.maxAngle;
  controls.maxAzimuthAngle = horizontal + pose.maxAngle;
  controls.minPolarAngle = Math.max(0.1, vertical - pose.maxAngle * 0.6);
  controls.maxPolarAngle = Math.min(Math.PI - 0.1, vertical + pose.maxAngle * 0.6);
  controls.minDistance = distance * 0.84;
  controls.maxDistance = distance * 1.1;
  controls.update();
  scheduleRender();
}

function cleanup() {
  cancelAnimationFrame(frame);
  frame = 0;
  controls?.dispose();
  splats?.dispose();
  spark?.dispose();
  renderer?.dispose();
  host.replaceChildren();
  renderer = spark = splats = controls = camera = scene = undefined;
  ready = false;
}

function showReference(value) {
  photo = value;
  viewer.classList.toggle('is-comparing', value);
  compare.setAttribute('aria-pressed', String(value));
  compare.textContent = value ? 'Voltar ao 3D' : 'Ver referência';
  status.textContent = value ? 'Imagem de referência original' : `Cenário 3D · ${quality === '100k' ? 'prévia leve' : quality === 'full-res' ? 'resolução completa' : 'revisão detalhada'}`;
  if (!value) scheduleRender();
}

start.addEventListener('click', async () => {
  start.disabled = true;
  start.textContent = 'Preparando cenário…';
  status.textContent = 'Carregando visualização 3D';
  try {
    const config = await fetch('./camera.json', { cache: 'no-store' });
    if (config.ok) {
      const candidate = await config.json();
      for (const key of ['position', 'target']) {
        if (Array.isArray(candidate[key]) && candidate[key].length === 3 && candidate[key].every(Number.isFinite)) pose[key] = candidate[key];
      }
      if (Number.isFinite(candidate.fov)) pose.fov = Math.max(30, Math.min(100, candidate.fov));
      if (typeof candidate.flipY === 'boolean') pose.flipY = candidate.flipY;
      if (Number.isFinite(candidate.maxAngle)) pose.maxAngle = Math.max(0.03, Math.min(0.5, candidate.maxAngle));
    }
    const response = await fetch(worldUrl);
    if (!response.ok) throw new Error('world-unavailable');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength < 100 || response.headers.get('content-type')?.includes('text/html')) throw new Error('world-unavailable');

    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0xb6c7c0, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.append(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(pose.fov, 1, 0.03, 1500);
    spark = new SparkRenderer({ renderer });
    scene.add(spark);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = !reducedMotion.matches;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.3;
    controls.zoomSpeed = 0.35;
    controls.autoRotate = false;
    controls.addEventListener('change', scheduleRender);
    setPose();
    resize();

    splats = new SplatMesh({ fileBytes: bytes, fileName: `world-${quality}.spz` });
    if (pose.flipY) splats.quaternion.set(1, 0, 0, 0);
    scene.add(splats);
    await splats.initialized;
    ready = true;
    viewer.classList.add('is-ready');
    document.querySelector('#start-card').hidden = true;
    toolbar.hidden = false;
    document.querySelector('#instructions').textContent = 'Arraste para olhar · role para aproximar · use as setas com o cenário selecionado';
    showReference(false);
    host.focus({ preventScroll: true });
    window.__emeMarblePreview = { get camera() { return camera; }, get controls() { return controls; }, get mesh() { return splats; }, reset: setPose, quality };
  } catch (error) {
    cleanup();
    viewer.classList.remove('is-ready');
    start.disabled = false;
    start.textContent = 'Tentar abrir o 3D ↗';
    status.textContent = error.message === 'world-unavailable'
      ? 'A imagem permanece disponível. O arquivo do cenário 3D ainda não foi adicionado a esta prévia.'
      : 'Não foi possível abrir o 3D neste dispositivo. A imagem de referência permanece disponível.';
    console.warn('EME local preview:', error.message);
  }
});

compare.addEventListener('click', () => showReference(!photo));
document.querySelector('#reset').addEventListener('click', () => { showReference(false); setPose(); });
document.querySelector('#fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await viewer.requestFullscreen(); }
  catch { status.textContent = 'A tela cheia não está disponível neste navegador.'; }
});
host.addEventListener('keydown', (event) => {
  if (!ready || photo || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Home') return setPose();
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  const step = 0.025;
  if (event.key === 'ArrowLeft') spherical.theta -= step;
  if (event.key === 'ArrowRight') spherical.theta += step;
  if (event.key === 'ArrowUp') spherical.phi -= step;
  if (event.key === 'ArrowDown') spherical.phi += step;
  spherical.theta = THREE.MathUtils.clamp(spherical.theta, controls.minAzimuthAngle, controls.maxAzimuthAngle);
  spherical.phi = THREE.MathUtils.clamp(spherical.phi, controls.minPolarAngle, controls.maxPolarAngle);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
  controls.update();
  scheduleRender();
});
host.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  if (ready) showReference(true);
  status.textContent = 'Visualização pausada pelo dispositivo. A referência continua disponível.';
}, true);
reducedMotion.addEventListener('change', () => { if (controls) controls.enableDamping = !reducedMotion.matches; });
new ResizeObserver(resize).observe(host);
document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleRender(); });
window.addEventListener('pagehide', cleanup, { once: true });
