import {useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {KeyboardEvent, PointerEvent} from 'react';
import {ArrowLeft, ArrowRight, Expand, Maximize2, Pause, Play, RotateCcw, X} from 'lucide-react';
import {gsap} from 'gsap';
import './property-gallery.css';

type Photograph = {url: string; caption: string; room?: string; width?: number; height?: number};
type Chapter = {name: string; start: number; end: number};
type Dimensions = {width: number; height: number};

/** The old image remains visible until the next photograph has decoded pixels. */
function decodePhoto(image: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Photo timeout')), 12000);
    image.decode().then(() => {clearTimeout(timer); resolve();}, () => {clearTimeout(timer); reject(new Error('Photo unavailable'));});
  });
}

export default function PropertyGallery({images, title}: {images: Photograph[]; title: string}) {
  const photos = useMemo(() => images.filter(image => Boolean(image.url)), [images]);
  const photoKey = JSON.stringify(photos);
  const [index, setIndex] = useState(0), [incoming, setIncoming] = useState<number | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [initialFailed, setInitialFailed] = useState(false), [initialReady, setInitialReady] = useState(false);
  const [playing, setPlaying] = useState(false), [reduced, setReduced] = useState(false);
  const [open, setOpen] = useState(false), [wholePhoto, setWholePhoto] = useState(false);
  const [dimensions, setDimensions] = useState<Record<string, Dimensions>>({});
  const [viewport, setViewport] = useState<Dimensions>(() => ({width: window.innerWidth, height: window.innerHeight}));
  const root = useRef<HTMLElement>(null), dialog = useRef<HTMLDialogElement>(null);
  const expand = useRef<HTMLButtonElement>(null), close = useRef<HTMLButtonElement>(null);
  const request = useRef(0), busy = useRef(false), direction = useRef(1), retry = useRef<number | null>(null);
  const gesture = useRef<{x: number; y: number; id: number} | null>(null);
  const headingId = useId();
  const safeIndex = Math.min(index, Math.max(0, photos.length - 1));
  const current = photos[safeIndex];
  const chapters = useMemo(() => photos.reduce<Chapter[]>((all, photo, position) => {
    const name = photo.room?.trim() || 'Fotografias', previous = all[all.length - 1];
    if (previous?.name === name) previous.end = position;
    else all.push({name, start: position, end: position});
    return all;
  }, []), [photos]);
  const activeChapter = chapters.find(chapter => safeIndex >= chapter.start && safeIndex <= chapter.end);

  function rememberDimensions(image: HTMLImageElement, url: string) {
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height) return;
    setDimensions(previous => previous[url]?.width === width && previous[url]?.height === height ? previous : {...previous, [url]: {width, height}});
  }
  function framing(photo: Photograph, inDialog: boolean) {
    if (!inDialog) return (photo.width||0)<(photo.height||0)?'contained':'cover';
    // Decoded dimensions take precedence over metadata, including for older listings.
    const size = dimensions[photo.url] || (photo.width && photo.height ? {width: photo.width, height: photo.height} : null);
    // Unknown or undersized files stay in their original framing, never enlarged to cover.
    if (!size || Math.max(viewport.width / size.width, viewport.height / size.height) > 1) return 'original';
    return wholePhoto ? 'contained' : 'cover';
  }

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {setReduced(preference.matches); if (preference.matches) setPlaying(false);};
    update(); preference.addEventListener('change', update);
    const onHide = () => {if (document.hidden) setPlaying(false);};
    document.addEventListener('visibilitychange', onHide);
    return () => {preference.removeEventListener('change', update); document.removeEventListener('visibilitychange', onHide); request.current++;};
  }, []);

  useEffect(() => {
    const measure = () => setViewport({width: window.innerWidth, height: window.innerHeight});
    window.addEventListener('resize', measure); measure();
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    request.current++; busy.current = false; retry.current = null;
    setIndex(0); setIncoming(null); setLoading(false); setError(''); setInitialFailed(false); setPlaying(false);
  }, [photoKey]);

  // Adjacent stops are preloaded rather than downloading the complete gallery at once.
  useEffect(() => {
    for (const next of [safeIndex - 1, safeIndex + 1]) {
      if (!photos[next]) continue;
      const image = new Image(); image.src = photos[next].url;
      decodePhoto(image).catch(() => undefined);
    }
  }, [safeIndex, photoKey]);

  const go = useCallback((next: number, automatic = false) => {
    if (busy.current || !photos.length) return;
    const position = (next + photos.length) % photos.length;
    if (position === safeIndex) return;
    if (!automatic) setPlaying(false);
    busy.current = true; retry.current = position; direction.current = next < safeIndex ? -1 : 1;
    setError(''); setLoading(true); setIncoming(position);
  }, [photos.length, safeIndex]);

  useLayoutEffect(() => {
    if (incoming === null || !root.current) return;
    const version = ++request.current;
    const incomingElements = [...root.current.querySelectorAll<HTMLImageElement>('.pg-photo-incoming')];
    const outgoingElements = [...root.current.querySelectorAll<HTMLImageElement>('.pg-photo-current')];
    let timeline: gsap.core.Timeline | undefined, cancelled = false;
    Promise.all(incomingElements.map(image => decodePhoto(image))).then(() => {
      if (cancelled || version !== request.current) return;
      setLoading(false);
      const finish = () => {
        if (cancelled || version !== request.current) return;
        setIndex(incoming); setIncoming(null); setInitialFailed(false); setInitialReady(true);
        busy.current = false; retry.current = null;
      };
      if (reduced) {finish(); return;}
      // Native-sized photos only dissolve; even a small scale tween would enlarge their pixels.
      // Larger photographs retain a subtle directional move without additional zoom.
      timeline = gsap.timeline({onComplete: finish, defaults: {ease: 'sine.inOut'}});
      timeline.fromTo(incomingElements, {opacity: 0, x: (_position, element: HTMLImageElement) => element.closest('.pg-frame-original') ? 0 : direction.current * 5},
        {opacity: 1, x: 0, duration: 1.1}, 0);
      timeline.fromTo(outgoingElements, {x: 0},
        {x: (_position, element: HTMLImageElement) => element.closest('.pg-frame-original') ? 0 : direction.current * -3, duration: 1.1}, 0);
    }).catch(() => {
      if (cancelled || version !== request.current) return;
      setLoading(false); setIncoming(null); setPlaying(false); busy.current = false;
      setError('Esta fotografia não carregou. A imagem anterior foi mantida.');
    });
    return () => {cancelled = true; timeline?.kill(); gsap.set(outgoingElements, {clearProps: 'transform'});};
  }, [incoming, reduced]);

  useEffect(() => {
    if (!playing || reduced || busy.current || photos.length < 2) return;
    if (safeIndex === photos.length - 1) {setPlaying(false); return;}
    const timer = window.setTimeout(() => go(safeIndex + 1, true), 6200);
    return () => clearTimeout(timer);
  }, [playing, reduced, safeIndex, incoming, loading, photos.length, go]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; close.current?.focus();
    return () => {document.body.style.overflow = previousOverflow;};
  }, [open]);

  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>('.pg-chapters button[aria-current="step"]').forEach(button => {
      const rail = button.parentElement;
      if (!rail) return;
      const item = button.getBoundingClientRect(), bounds = rail.getBoundingClientRect();
      const offset = item.left < bounds.left ? item.left - bounds.left : item.right > bounds.right ? item.right - bounds.right : 0;
      if (offset) rail.scrollBy({left: offset, behavior: reduced ? 'instant' : 'smooth'});
    });
  }, [activeChapter?.start, open, reduced]);

  function openTour() {if (!busy.current) {setPlaying(false); setOpen(true); dialog.current?.showModal();}}
  function closeTour() {setPlaying(false); dialog.current?.close();}
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight') {event.preventDefault(); go(safeIndex + 1);}
    if (event.key === 'ArrowLeft') {event.preventDefault(); go(safeIndex - 1);}
    if (event.key === 'Home') {event.preventDefault(); go(0);}
    if (event.key === 'End') {event.preventDefault(); go(photos.length - 1);}
  }
  function startGesture(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
    gesture.current = {x: event.clientX, y: event.clientY, id: event.pointerId};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function endGesture(event: PointerEvent<HTMLDivElement>) {
    const start = gesture.current; gesture.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) go(safeIndex + (dx < 0 ? 1 : -1));
  }
  function retryPhoto() {
    if (retry.current !== null && retry.current !== safeIndex) {go(retry.current); return;}
    setError(''); setInitialFailed(false); setInitialReady(false);
    root.current?.querySelectorAll<HTMLImageElement>('.pg-photo-current').forEach(image => {
      const source = image.src; image.removeAttribute('src'); image.src = source;
    });
  }
  function togglePlaying() {
    if (!playing && safeIndex === photos.length - 1) go(0, true);
    setPlaying(value => !value);
  }
  if (!current) return <div className="pg-empty">Adicione fotografias para visualizar o percurso.</div>;

  const controls = <div className="pg-controls">
    <button type="button" aria-label="Foto anterior" onClick={() => go(safeIndex - 1)} disabled={photos.length < 2 || loading || incoming !== null}><ArrowLeft size={19}/></button>
    <span aria-live={playing ? 'off' : 'polite'}>{String(safeIndex + 1).padStart(2, '0')} <i>/</i> {String(photos.length).padStart(2, '0')}</span>
    <button type="button" aria-label="Próxima foto" onClick={() => go(safeIndex + 1)} disabled={photos.length < 2 || loading || incoming !== null}><ArrowRight size={19}/></button>
  </div>;
  const originalFraming = framing(current, true) === 'original';
  const stage = (inDialog = false) => <div className="pg-stage"
    onPointerDown={startGesture} onPointerUp={endGesture} onPointerCancel={() => {gesture.current = null;}}>
    <div className={`pg-image-frame pg-frame-${framing(current, inDialog)}`}><img className={`pg-photo pg-photo-current${initialFailed ? ' pg-photo-failed' : ''}`} src={current.url}
      alt={current.caption || title} fetchPriority="high" draggable={false}
      onLoad={event => {rememberDimensions(event.currentTarget, current.url); setInitialReady(true); setInitialFailed(false);}}
      onError={() => {setInitialReady(false); setInitialFailed(true); setPlaying(false); setError('Não foi possível carregar esta fotografia. Tente novamente ou escolha outra imagem.');}}/></div>
    {incoming !== null && photos[incoming] && <div key={photos[incoming].url} className={`pg-image-frame pg-frame-incoming pg-frame-${framing(photos[incoming], inDialog)}`}>
      <img className="pg-photo pg-photo-incoming" src={photos[incoming].url} alt="" aria-hidden="true" draggable={false} onLoad={event => rememberDimensions(event.currentTarget, photos[incoming].url)}/>
    </div>}
    {!initialReady && incoming === null && !initialFailed && <span className="pg-loading" role="status">Carregando fotografia…</span>}
    {initialFailed && incoming === null && <div className="pg-unavailable"><span>Fotografia indisponível</span><button type="button" onClick={retryPhoto}><RotateCcw size={16}/>Tentar novamente</button></div>}
    <div className="pg-caption"><div className="pg-caption-copy" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">{current.room && <span className="pg-room">{current.room}</span>}<span>{current.caption || title}</span></div>{controls}</div>
    {loading && <span className="pg-loading" role="status">Preparando próxima fotografia…</span>}
  </div>;
  const chapterNavigation = (inDialog = false) => chapters.length > 1 && <nav className={`pg-chapters${inDialog ? ' pg-chapters-dark' : ''}`} aria-label="Ambientes do percurso">
    {chapters.map((chapter, position) => <button type="button" key={chapter.start} onClick={() => go(chapter.start)} disabled={loading || incoming !== null}
      aria-current={activeChapter === chapter ? 'step' : undefined}><span>{String(position + 1).padStart(2, '0')}</span>{chapter.name}</button>)}
  </nav>;
  const playback = () => photos.length > 1 && !reduced && <button type="button" className="pg-playback" onClick={togglePlaying}
    disabled={loading || incoming !== null} aria-label={playing ? 'Pausar apresentação' : 'Reproduzir apresentação'} aria-pressed={playing}>
    {playing ? <Pause size={15}/> : <Play size={15}/>}<span>{playing ? 'Pausar' : 'Percurso automático'}</span>
  </button>;
  const errorNotice = () => error && <div className="pg-error" role="alert"><span>{error}</span><button type="button" onClick={retryPhoto}>Tentar novamente</button></div>;

  return <section ref={root} className="property-gallery" aria-label={'Fotografias de ' + title} onKeyDown={onKeyDown}>
    {stage()}
    <div className="pg-toolbar"><span>Percurso fotográfico <i>·</i> {photos.length} {photos.length === 1 ? 'imagem' : 'imagens'}</span><div>
      {playback()}<button ref={expand} className="pg-expand" type="button" aria-label="Ampliar" disabled={loading || incoming !== null} onClick={openTour}><Maximize2 size={15}/>Explorar em tela cheia</button>
    </div></div>
    {chapterNavigation()}
    {photos.length > 1 && <div className="pg-thumbnails" aria-label="Escolher fotografia">
      {photos.map((photo, position) => <button type="button" key={photo.url + position} onClick={() => go(position)} disabled={loading || incoming !== null}
        aria-label={'Ver foto ' + (position + 1) + ': ' + photo.caption} aria-current={safeIndex === position ? 'true' : undefined}>
        <img src={photo.url} alt="" loading="lazy" draggable={false}/><span>{String(position + 1).padStart(2, '0')}</span>
      </button>)}
    </div>}
    {!open && errorNotice()}
    <dialog ref={dialog} className="pg-dialog" aria-labelledby={headingId} onCancel={() => setPlaying(false)}
      onClose={() => {setOpen(false); setPlaying(false); expand.current?.focus({preventScroll: true});}}>
      {open && <>
        <div className="pg-tour-header"><div><span>EME SELECT <i>/</i> PERCURSO FOTOGRÁFICO</span><h2 id={headingId}>{title}</h2></div>
          <button ref={close} className="pg-close" type="button" aria-label="Fechar galeria" onClick={closeTour}><X size={23}/></button>
        </div>
        {stage(true)}
        {error && <div className="pg-tour-error">{errorNotice()}</div>}
        <footer className="pg-tour-footer">{chapterNavigation(true)}
          <div className="pg-tour-actions"><span className="pg-tour-hint">Arraste para avançar<span className="pg-keyboard-hint"> <i>·</i> Use as setas do teclado</span></span><div>
            {playback()}{originalFraming ? <span className="pg-original-framing"><Expand size={15}/>Enquadramento original</span> : <button type="button" onClick={() => setWholePhoto(value => !value)} aria-pressed={wholePhoto}><Expand size={15}/>{wholePhoto ? 'Preencher tela' : 'Foto inteira'}</button>}
          </div></div>
          <div className="pg-progress" aria-hidden="true"><span style={{transform: `scaleX(${(safeIndex + 1) / photos.length})`}}/></div>
        </footer>
      </>}
    </dialog>
  </section>;
}
