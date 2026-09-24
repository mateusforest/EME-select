import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowUpRight, Maximize, Minus, Move, Plus } from 'lucide-react';
import gsap from 'gsap';
import { environmentById, type Environment, type EnvironmentId } from '../data';
import './photographic-home.css';

interface Props { environment?: Environment; selectedId: string | null; onSelect: (id: string) => void }
interface Pose { x: number; y: number; scale: number }
interface Bounds { width: number; height: number; imageWidth: number; imageHeight: number }
interface Contact { x: number; y: number }

const homeEnvironment = environmentById('todos');
// Anchors are measured on each approved image, never on a stretched crop.
const photographicScenes: Record<EnvironmentId, { width: number; height: number; alt: string; anchors: Record<string, { x: number; y: number }> }> = {
  todos: {
    width: 1586, height: 992,
    alt: 'Paisagem da EME Select: compactos em um edifício baixo à esquerda, casa no morro, casa em condomínio com jardim e piscina no primeiro plano e apartamentos com varandas à direita.',
    anchors: { 'serra-01': { x: 59.5, y: 47.7 }, 'litoral-02': { x: 61.1, y: 71.2 }, 'urbano-01': { x: 88, y: 43.5 }, 'urbano-02': { x: 19.4, y: 62.8 } },
  },
  litoral: {
    width: 1586, height: 992,
    alt: 'Paisagem do litoral: casa contemporânea com piscina, residências entre jardins e apartamentos com varandas diante da praia e do mar.',
    anchors: { 'litoral-01': { x: 37, y: 68.4 }, 'litoral-02': { x: 64.5, y: 52.1 }, 'litoral-03': { x: 91.4, y: 45.3 } },
  },
  serra: {
    width: 1585, height: 992,
    alt: 'Paisagem da Serra Gaúcha: casa de madeira e pedra junto a um espelho d’água, cabanas e residências entre araucárias e montanhas.',
    anchors: { 'serra-01': { x: 53.6, y: 68 }, 'serra-02': { x: 19.2, y: 65 }, 'serra-03': { x: 86.8, y: 42.2 } },
  },
  urbano: {
    width: 1585, height: 992,
    alt: 'Paisagem urbana: edifício de compactos junto à praça, torre residencial arborizada e apartamentos com varandas voltados à vida de bairro.',
    anchors: { 'urbano-02': { x: 39, y: 64 }, 'urbano-03': { x: 82.3, y: 36 }, 'urbano-01': { x: 91, y: 65.2 } },
  },
  condominios: {
    width: 1586, height: 992,
    alt: 'Condomínios entre jardins e colinas: casas horizontais ligadas por caminhos arborizados e edifícios residenciais com varandas, em torno de áreas de convivência.',
    anchors: { 'litoral-02': { x: 61, y: 71 }, 'urbano-03': { x: 86, y: 40 } },
  },
  comercial: {
    width: 1586, height: 992,
    alt: 'Paisagem comercial: galeria de lojas voltada à praça, edifício de salas comerciais e torre corporativa com fachadas de vidro, conectados por jardins e caminhos.',
    anchors: { 'comercial-01': { x: 37, y: 68 }, 'comercial-02': { x: 62, y: 51 }, 'comercial-03': { x: 86, y: 34 } },
  },
  terrenos: {
    width: 1586, height: 992,
    alt: 'Paisagem de terrenos e terras: terreno urbano vazio junto à rua, lote em condomínio arborizado e extensas terras agrícolas entre campos e colinas.',
    anchors: { 'terrenos-01': { x: 48, y: 73 }, 'terrenos-02': { x: 73, y: 55 }, 'terrenos-03': { x: 87, y: 33 } },
  },
  industrial: {
    width: 1586, height: 992,
    alt: 'Paisagem industrial e logística: galpão com pátio de acesso, grande pavilhão industrial e centro de distribuição com docas e caminhões.',
    anchors: { 'industrial-01': { x: 46, y: 62 }, 'industrial-02': { x: 81, y: 44 }, 'industrial-03': { x: 84, y: 30 } },
  },
};
const INITIAL: Pose = { x: 0, y: 0, scale: 1 };
const MAX_ZOOM = 2.4;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export default function PhotographicHome({ environment = homeEnvironment, selectedId, onSelect }: Props) {
  const scene = photographicScenes[environment.id];
  const landmarks = useMemo(() => environment.markers.map(marker => ({ ...marker, ...(environment.image.includes('urbano-bairro') ? {} : scene.anchors[marker.propertyId]) })), [environment, scene]);
  const root = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const photograph = useRef<HTMLImageElement>(null);
  const pinNodes = useRef(new Map<string, HTMLButtonElement>());
  const pose = useRef<Pose>({ ...INITIAL });
  const destination = useRef<Pose>({ ...INITIAL });
  const bounds = useRef<Bounds>({ width: 1, height: 1, imageWidth: 1, imageHeight: 1 });
  const contacts = useRef(new Map<number, Contact>());
  const gesture = useRef({ distance: 0, x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const lastMove = useRef(0);
  const tween = useRef<gsap.core.Tween | null>(null);
  const reduced = useRef(false);
  const activeSelection = useRef(selectedId);
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [imageAttempt, setImageAttempt] = useState(0);
  const [zoomState, setZoomState] = useState(1);
  activeSelection.current = selectedId;

  function constrain(next: Pose): Pose {
    const b = bounds.current;
    const scale = clamp(next.scale, 1, MAX_ZOOM);
    const xLimit = Math.max(0, (b.imageWidth * scale - b.width) / 2);
    const yLimit = Math.max(0, (b.imageHeight * scale - b.height) / 2);
    return { scale, x: clamp(next.x, -xLimit, xLimit), y: clamp(next.y, -yLimit, yLimit) };
  }

  function draw() {
    const p = pose.current, b = bounds.current;
    if (photograph.current) gsap.set(photograph.current, { x: p.x, y: p.y, scale: p.scale });
    for (const marker of landmarks) {
      const pin = pinNodes.current.get(marker.propertyId);
      if (!pin) continue;
      const x = b.width / 2 + (marker.x / 100 - .5) * b.imageWidth * p.scale + p.x;
      const y = b.height / 2 + (marker.y / 100 - .5) * b.imageHeight * p.scale + p.y;
      gsap.set(pin, { x, y });
      // Keep the label usable at a photographic edge; the dot stays on its landmark.
      const label = pin.firstElementChild as HTMLElement | null;
      if (label) {
        const halfWidth = label.offsetWidth / 2 + 10;
        label.style.setProperty('--pin-label-shift', `${clamp(0, halfWidth - x, b.width - halfWidth - x)}px`);
      }
      const outside = x < 9 || x > b.width - 9 || y < 48 || y > b.height - 12;
      pin.hidden = outside;
    }
    if (root.current) {
      root.current.dataset.camera = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.scale.toFixed(3)}`;
      root.current.dataset.zoom = p.scale.toFixed(3);
      root.current.dataset.photoPose = JSON.stringify({ x: +p.x.toFixed(3), y: +p.y.toFixed(3), scale: +p.scale.toFixed(4), imageWidth: +b.imageWidth.toFixed(2), imageHeight: +b.imageHeight.toFixed(2), viewportWidth: +b.width.toFixed(2), viewportHeight: +b.height.toFixed(2) });
    }
  }

  function move(next: Pose, duration = .7) {
    tween.current?.kill();
    destination.current = constrain(next);
    setZoomState(destination.current.scale);
    tween.current = gsap.to(pose.current, {
      ...destination.current, duration: reduced.current ? 0 : duration, ease: 'power3.out',
      onUpdate: draw, onComplete: draw,
    });
  }

  function overviewPose(): Pose {
    const b = bounds.current;
    if (b.width >= 601) return { ...INITIAL };
    // Portrait framing follows the main building; the whole photograph stays draggable.
    const primaryId = environment.id === 'todos' ? 'litoral-02' : environment.markers[0].propertyId;
    const primary = landmarks.find(marker => marker.propertyId === primaryId)!;
    return constrain({ x: (.5 - primary.x / 100) * b.imageWidth, y: 0, scale: 1 });
  }

  function overview() { move(overviewPose(), 1.05); }

  function focusLandmark(id: string | null, duration = 1.1) {
    const marker = landmarks.find(item => item.propertyId === id);
    if (!marker) { move(overviewPose(), duration); return; }
    const b = bounds.current, mobile = b.width < 601;
    const scale = mobile ? 1.5 : marker.propertyId === 'urbano-01' ? 1.68 : 1.62;
    move({
      scale,
      x: b.width * (mobile ? .5 : .59) - b.width / 2 - (marker.x / 100 - .5) * b.imageWidth * scale,
      y: b.height * (mobile ? .50 : .62) - b.height / 2 - (marker.y / 100 - .5) * b.imageHeight * scale,
    }, duration);
  }

  function zoomTo(scale: number, focal?: Contact, duration = .55) {
    const b = bounds.current, from = destination.current;
    const factor = clamp(scale, 1, MAX_ZOOM) / from.scale;
    const anchor = focal || { x: b.width * .65, y: b.height * .61 };
    move({
      scale: from.scale * factor,
      x: (anchor.x - b.width / 2) * (1 - factor) + from.x * factor,
      y: (anchor.y - b.height / 2) * (1 - factor) + from.y * factor,
    }, duration);
  }

  useLayoutEffect(() => {
    const surface = viewport.current!;
    const image = photograph.current!;
    if (image.complete && image.naturalWidth > 0) setImageState('ready');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = preference.matches;
    const preferenceChanged = () => {
      reduced.current = preference.matches;
      if (preference.matches) move({ ...destination.current }, 0);
    };
    preference.addEventListener('change', preferenceChanged);
    const resize = () => {
      const { width, height } = surface.getBoundingClientRect();
      const previous = bounds.current;
      const selectionLayout = previous.width > 1 && Math.abs(previous.width - width) < 1 && Math.abs(previous.height - height) > 1;
      const imageWidth = Math.max(width, height * scene.width / scene.height);
      const imageHeight = imageWidth * scene.height / scene.width;
      if (selectionLayout) {
        // Preserve the photographed pixel positions when the mobile detail sheet opens.
        // The new framing then travels from this pose instead of snapping to its endpoint.
        tween.current?.kill();
        pose.current = { x: pose.current.x + (previous.width - width) / 2, y: pose.current.y + (previous.height - height) / 2, scale: pose.current.scale * previous.imageWidth / imageWidth };
      }
      bounds.current = { width, height, imageWidth, imageHeight };
      image.style.width = `${imageWidth}px`;
      image.style.height = `${imageHeight}px`;
      image.style.left = `${(width - imageWidth) / 2}px`;
      image.style.top = `${(height - imageHeight) / 2}px`;
      draw();
      focusLandmark(activeSelection.current, selectionLayout ? .95 : 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    resize();
    const wheel = (event: WheelEvent) => {
      // Normal scrolling continues down the page; focus or Ctrl enables scene zoom.
      if (!event.ctrlKey && document.activeElement !== surface) return;
      event.preventDefault();
      const rect = surface.getBoundingClientRect();
      zoomTo(destination.current.scale * Math.exp(clamp(-event.deltaY * .0014, -.22, .22)), { x: event.clientX - rect.left, y: event.clientY - rect.top }, .22);
    };
    surface.addEventListener('wheel', wheel, { passive: false });
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', preferenceChanged);
      surface.removeEventListener('wheel', wheel);
      tween.current?.kill();
      gsap.killTweensOf(image);
      contacts.current.clear();
    };
  }, []);

  useEffect(() => { focusLandmark(selectedId); }, [selectedId]);
  useLayoutEffect(() => { if (imageState === 'ready') draw(); }, [imageState]);

  function updateGesture() {
    const points = [...contacts.current.values()];
    if (points.length < 2) { gesture.current.distance = 0; return; }
    gesture.current = {
      distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
  }

  function down(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    tween.current?.kill();
    destination.current = { ...pose.current };
    contacts.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    velocity.current = { x: 0, y: 0 };
    lastMove.current = event.timeStamp;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-dragging');
    updateGesture();
  }

  function drag(event: PointerEvent<HTMLDivElement>) {
    const previous = contacts.current.get(event.pointerId);
    if (!previous) return;
    contacts.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (contacts.current.size >= 2) {
      const before = { ...gesture.current };
      updateGesture();
      if (before.distance > 0) {
        const rect = event.currentTarget.getBoundingClientRect();
        const next = gesture.current;
        const from = destination.current;
        const scale = clamp(from.scale * next.distance / before.distance, 1, MAX_ZOOM);
        const ratio = scale / from.scale;
        const b = bounds.current;
        move({
          scale,
          x: (before.x - rect.left - b.width / 2) * (1 - ratio) + from.x * ratio + next.x - before.x,
          y: (before.y - rect.top - b.height / 2) * (1 - ratio) + from.y * ratio + next.y - before.y,
        }, .1);
      }
    } else {
      const dx = event.clientX - previous.x, dy = event.clientY - previous.y;
      const elapsed = Math.max(8, event.timeStamp - lastMove.current);
      velocity.current = { x: clamp(dx / elapsed, -1.2, 1.2), y: clamp(dy / elapsed, -1.2, 1.2) };
      move({ ...destination.current, x: destination.current.x + dx, y: destination.current.y + dy }, .12);
    }
    lastMove.current = event.timeStamp;
  }

  function release(event: PointerEvent<HTMLDivElement>) {
    const wasActive = contacts.current.delete(event.pointerId);
    if (!wasActive) return;
    const intentional = event.type === 'pointerup';
    if (contacts.current.size === 0) {
      event.currentTarget.classList.remove('is-dragging');
      if (intentional && event.timeStamp - lastMove.current < 90 && !reduced.current) {
        move({ ...destination.current, x: destination.current.x + velocity.current.x * 75, y: destination.current.y + velocity.current.y * 75 }, .65);
      }
    }
    velocity.current = { x: 0, y: 0 };
    updateGesture();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (['+', '=', '-', '_', 'Home', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
    if (event.key === 'Home' || event.key === '0') overview();
    if (event.key === '+' || event.key === '=') zoomTo(destination.current.scale + .25);
    if (event.key === '-' || event.key === '_') zoomTo(destination.current.scale - .25);
    if (event.key.startsWith('Arrow')) {
      const from = destination.current;
      move({ ...from, x: from.x + (event.key === 'ArrowLeft' ? 64 : event.key === 'ArrowRight' ? -64 : 0), y: from.y + (event.key === 'ArrowUp' ? 64 : event.key === 'ArrowDown' ? -64 : 0) }, .35);
    }
  }

  return <div ref={root} className={`photographic-home${selectedId ? ' has-selection' : ''}`} data-photographic-home={environment.id === 'todos' ? '' : undefined} data-photographic-scene data-environment={environment.id} data-env-id={environment.id} data-mode="photographic" data-status={imageState} data-zoom="1.000">
    <div ref={viewport} className="photographic-home__viewport" tabIndex={0} role="region" aria-label="Explorar o cenário em imagem" aria-describedby="photographic-home-instructions"
      onPointerDown={down} onPointerMove={drag} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onKeyDown={keyboard}
      onDoubleClick={event => {
        if ((event.target as HTMLElement).closest('button')) return;
        const rect = event.currentTarget.getBoundingClientRect();
        zoomTo(destination.current.scale > 1.7 ? 1 : 1.85, { x: event.clientX - rect.left, y: event.clientY - rect.top }, .85);
      }}>
      <img ref={photograph} className={`photographic-home__image${imageState === 'ready' ? ' is-loaded' : ''}`} src={imageAttempt ? `${environment.image}?attempt=${imageAttempt}` : environment.image} width={scene.width} height={scene.height}
        alt={environment.image.includes('urbano-bairro') ? 'Bairro residencial ilustrativo com casas, jardins e edifício baixo de apartamentos.' : scene.alt}
        draggable={false} fetchPriority="high" onLoad={() => setImageState('ready')} onError={() => setImageState('error')} />
      <div className="photographic-home__scrim" aria-hidden="true" />
      <div className="photographic-home__pins" hidden={imageState !== 'ready'}>
        {landmarks.map(marker => <button key={marker.propertyId} ref={node => { if (node) pinNodes.current.set(marker.propertyId, node); else pinNodes.current.delete(marker.propertyId); }}
          className="photographic-home__pin" aria-label={marker.label} aria-pressed={selectedId === marker.propertyId}
          onClick={() => { if (selectedId === marker.propertyId) focusLandmark(marker.propertyId); else onSelect(marker.propertyId); }}>
          <span className="photographic-home__label">{marker.label}<ArrowUpRight size={11} aria-hidden="true" /></span>
          <span className="photographic-home__dot" aria-hidden="true"><Plus size={14} strokeWidth={1.4} /></span>
        </button>)}
      </div>
    </div>
    <div className="photographic-home__caption"><span />Paisagem ilustrativa</div>
    {imageState === 'error' && <div className="photographic-home__error" role="status"><p>Não foi possível carregar a paisagem. Você pode continuar pela busca ou escolher outro ambiente.</p><button onClick={() => { setImageState('loading'); setImageAttempt(value => value + 1); }}>Tentar novamente <ArrowUpRight size={13} aria-hidden="true" /></button></div>}
    <div className="photographic-home__controls" role="group" aria-label="Controles da paisagem">
      <button className="photographic-home__overview" aria-label="Centralizar cenário" onClick={overview}><Maximize size={15} strokeWidth={1.4} /><span>Visão ampla</span></button>
      <div className="photographic-home__zoom"><button aria-label="Afastar cenário" disabled={zoomState <= 1.001} onClick={() => zoomTo(destination.current.scale - .25)}><Minus size={17} strokeWidth={1.4} /></button><span aria-hidden="true" /><button aria-label="Aproximar cenário" disabled={zoomState >= MAX_ZOOM - .001} onClick={() => zoomTo(destination.current.scale + .25)}><Plus size={17} strokeWidth={1.4} /></button></div>
    </div>
    <p className="photographic-home__hint" id="photographic-home-instructions"><Move size={13} strokeWidth={1.4} /><span>Escolha um lugar. Aproxime e arraste para explorar.</span><span className="sr-only"> Use mais e menos para ampliar, as setas para mover e Home para restaurar. Em telas de toque, use dois dedos para ampliar.</span></p>
  </div>;
}
