import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Box, Check, ChevronLeft, ChevronRight, ImageIcon, Maximize, Minus, Plus, RotateCcw, Share2 } from 'lucide-react';
import { Dialog } from '../ui';
import { whatsappUrl } from '../data';
import { ASSETS, floorState, floors, galleries, MORADAS_ROUTE, units, type GalleryId, type Lighting, type Place, type TowerId } from './moradas';
import SceneOverlay from './SceneOverlay';
import type { ModelControls } from './DevelopmentModel';
import './development.css';

const DevelopmentModel = lazy(() => import('./DevelopmentModel'));

export default function DevelopmentPage() {
  const [tower, setTower] = useState<TowerId>('a');
  const [floor, setFloor] = useState(6);
  const [lighting, setLighting] = useState<Lighting>('sunset');
  const [place, setPlace] = useState<Place>('floors');
  const [mode, setMode] = useState<'image' | 'model'>('image');
  const [gallery, setGallery] = useState<GalleryId | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(true);
  const pageRef = useRef<HTMLElement>(null);
  const controls = useRef<ModelControls | null>(null);
  const media = gallery ? galleries[gallery] : null;
  const visibleFloors = floors.filter(level => !onlyAvailable || floorState(tower, level) === 'available');
  const selectedUnits = units.filter(unit => unit.tower === tower && unit.floor === floor);
  const openGallery = (id: GalleryId) => { setGallery(id); setImageIndex(0); };
  const selectFloor = (level: number, selectedTower = tower) => { setTower(selectedTower); setFloor(level); setPlace('floors'); };
  const contact = whatsappUrl(`Olá! Gostaria de conhecer o Moradas da Serra, da DeVille, em Vacaria. Estou explorando a torre ${tower === 'a' ? '1' : '2'}, ${floor}º andar na apresentação conceitual. Podemos confirmar as plantas e a disponibilidade?`);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { setPhotoFailed(false); }, [gallery, imageIndex]);
  useEffect(() => { document.documentElement.dataset.developmentView = mode; return () => { delete document.documentElement.dataset.developmentView; }; }, [mode]);
  function choosePlace(next: Place) {
    setPlace(next);
    if (next === 'leisure') openGallery('leisure');
    if (next === 'surroundings') openGallery('entrance');
    if (next === 'overview') { setZoom(1); controls.current?.reset(); }
  }
  function changeZoom(direction: number) { if (mode === 'model') controls.current?.zoom(direction); else setZoom(value => Math.max(1, Math.min(1.7, value + direction * .15))); }
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await pageRef.current?.requestFullscreen(); }
    catch { setNotice('Use a opção de tela cheia do seu navegador para ampliar a experiência.'); }
  }
  async function share() {
    try { await navigator.clipboard.writeText(`${location.origin}/${MORADAS_ROUTE}`); setNotice('Link do empreendimento copiado.'); }
    catch { setNotice('Você pode compartilhar o endereço desta página.'); }
  }
  function startModel() { setMode('model'); setReady(false); setModelFailed(false); }
  return <main id="conteudo" className={`development-page development-page--${mode}`} ref={pageRef}>
    <div className={`development-stage development-stage--${lighting}`} data-testid="development-stage">
      {mode === 'image' ? <div className="development-image-world" style={{ transform: `scale(${zoom})` }}>
        <img src={`${ASSETS}hero.webp`} alt="Reconstrução visual conceitual das duas torres do Moradas da Serra, com áreas de convivência" fetchPriority="high" />
        <SceneOverlay tower={tower} floor={floor} lighting={lighting} showFloor={place === 'floors'} />
        <div className="development-hotspots">
          <button className="development-hotspot development-hotspot--court" onClick={() => openGallery('court')}><span>Quadra <ArrowUpRight size={12} /></span><i><Plus size={16} /></i></button>
          <button className="development-hotspot development-hotspot--entrance" onClick={() => openGallery('entrance')}><span>Acesso <ArrowUpRight size={12} /></span><i><Plus size={16} /></i></button>
          <button className="development-hotspot development-hotspot--leisure" onClick={() => openGallery('leisure')}><span>Lazer <ArrowUpRight size={12} /></span><i><Plus size={16} /></i></button>
        </div>
      </div> : <Suspense fallback={<div className="development-loading" role="status">Preparando a maquete 3D…</div>}><DevelopmentModel ref={controls} tower={tower} floor={floor} lighting={lighting} onSelectFloor={selectFloor} onArea={openGallery} onReady={() => setReady(true)} onFail={() => { setModelFailed(true); setReady(false); }} /></Suspense>}
      {mode === 'model' && !ready && !modelFailed && <div className="development-loading" role="status">Preparando a maquete 3D…</div>}
      {mode === 'model' && modelFailed && <div className="development-model-error"><h2>A vista ilustrada continua disponível.</h2><p>Este navegador não conseguiu abrir a maquete 3D.</p><button className="primary-button" onClick={() => setMode('image')}>Voltar à apresentação <ArrowRight size={16} /></button></div>}
    </div>
    <div className="development-veil" aria-hidden="true" />
    <section className="development-intro" aria-labelledby="development-title">
      <a className="development-back" href="#/"><ArrowLeft size={13} /> Voltar à coleção</a>
      <p className="eyebrow"><span className="tiny-rule" /> DeVille · Vacaria, RS</p>
      <h1 id="development-title">Moradas da Serra.<em>Seu lugar, por<br />outro ângulo.</em></h1>
      <p>Explore as torres, os andares e cada possibilidade.</p>
      <div className="development-view-switch" role="group" aria-label="Visualização do empreendimento">
        <button aria-pressed={mode === 'image'} onClick={() => setMode('image')}><ImageIcon size={14} /> Apresentação</button>
        <button aria-pressed={mode === 'model'} onClick={startModel} disabled={mode === 'model'}><Box size={15} /> Explorar em 3D</button>
      </div>
      <span className="development-model-note">{mode === 'model' ? 'Maquete conceitual · gire para descobrir' : 'Uma experiência EME Select · estudo de apresentação'}</span>
    </section>
    <button className="development-panel-toggle" aria-expanded={toolsOpen} aria-controls="development-floor-panel" onClick={() => setToolsOpen(value => !value)}>{toolsOpen ? 'Recolher andares' : 'Escolher andar'} {toolsOpen ? <Minus size={14} /> : <Plus size={14} />}</button>
    {toolsOpen && <aside className="development-panel" id="development-floor-panel" aria-label="Escolher torre e andar">
      <div className="development-panel-heading"><h2>Escolha seu andar</h2><button aria-label="Compartilhar empreendimento" onClick={share}><Share2 size={15} /></button></div>
      <div className="development-towers" role="group" aria-label="Torres">{(['a', 'b'] as const).map((id, index) => <button key={id} aria-pressed={tower === id} onClick={() => { setTower(id); setPlace('floors'); }}>Torre {index + 1}</button>)}</div>
      <label className="development-stock-filter"><input type="checkbox" checked={onlyAvailable} onChange={event => setOnlyAvailable(event.target.checked)} /> Só disponibilidade confirmada</label>
      <div className="development-floors" role="group" aria-label="Andares">
        {visibleFloors.map(level => { const state = floorState(tower, level); return <button key={level} disabled={state === 'unavailable'} aria-pressed={floor === level && place === 'floors'} onClick={() => selectFloor(level)} aria-label={`${level}º andar, ${state === 'unknown' ? 'disponibilidade a confirmar' : state === 'available' ? 'com unidades disponíveis' : 'sem unidades disponíveis'}`}><span>{level}<small>º andar</small></span><span className={`development-stock-dot development-stock-dot--${state}`} /><ChevronRight size={14} /></button>; })}
        {!visibleFloors.length && <p className="development-stock-empty">O estoque ainda não foi confirmado pela incorporadora. Desmarque o filtro para explorar os andares.</p>}
      </div>
      <div className="development-floor-detail" aria-live="polite"><h3>Torre {tower === 'a' ? '1' : '2'} · {floor}º andar</h3><span>Disponibilidade a confirmar</span></div>
      {selectedUnits.length > 0 ? <div className="development-unit-list">{selectedUnits.map(unit => <button key={unit.id} disabled={unit.status === 'sold' || unit.status === 'reserved'} onClick={() => openGallery('plans')}>{unit.label}<small>{unit.typology}</small></button>)}</div> : <p className="development-stock-note">Consulte quais plantas e unidades estão disponíveis neste andar.</p>}
      <button className="development-primary" onClick={() => openGallery('interiors')}>Conhecer os interiores <ArrowUpRight size={17} /></button>
      <button className="development-plan-link" onClick={() => openGallery('plans')}>Ver tipologias e plantas <ArrowRight size={13} /></button>
      <a className="development-consult" href={contact} target="_blank" rel="noopener noreferrer">Consultar a EME <ArrowUpRight size={13} /></a>
      <small className="development-disclaimer">Numeração e implantação conceituais. Confirme o projeto e o estoque com a equipe.</small>
    </aside>}
    <div className="development-bottom">
      <div className="development-navigation"><p className="eyebrow">01 / Explore o empreendimento</p><div role="group" aria-label="Áreas do empreendimento">{([{ id: 'overview', label: 'Visão geral' }, { id: 'floors', label: 'Andares' }, { id: 'leisure', label: 'Lazer' }, { id: 'surroundings', label: 'Fachadas' }] as const).map(item => <button key={item.id} aria-pressed={place === item.id} onClick={() => choosePlace(item.id)}>{item.label}</button>)}</div></div>
      <div className="development-lighting" role="group" aria-label="Luz do cenário"><span>Luz do cenário<small>Simulação visual</small></span>{([{ id: 'day', label: 'Dia' }, { id: 'sunset', label: 'Entardecer' }, { id: 'night', label: 'Noite' }] as const).map(item => <button key={item.id} aria-pressed={lighting === item.id} onClick={() => setLighting(item.id)}>{item.label}</button>)}</div>
      <div className="development-controls"><div><button aria-label="Restaurar visão geral" onClick={() => { setZoom(1); controls.current?.reset(); }}><RotateCcw size={14} /></button><button onClick={fullscreen} aria-label="Alternar tela cheia"><Maximize size={14} /><span>Visão ampla</span></button><button aria-label="Afastar cenário" onClick={() => changeZoom(-1)}><Minus size={16} /></button><button aria-label="Aproximar cenário" onClick={() => changeZoom(1)}><Plus size={16} /></button></div><small>{mode === 'model' ? 'Arraste para girar. Clique em um andar.' : 'Ative o 3D para girar e explorar.'}</small></div>
    </div>
    <p className="development-footnote">Estudo visual · Arquitetura e disponibilidade sujeitas à validação da incorporadora.</p>
    {notice && <div className="development-notice" role="status"><Check size={14} />{notice}</div>}
    {media && <Dialog title={media.title} onClose={() => setGallery(null)} wide><div className="development-gallery" onKeyDown={event => { if (event.key === 'ArrowRight') setImageIndex(value => (value + 1) % media.images.length); if (event.key === 'ArrowLeft') setImageIndex(value => (value - 1 + media.images.length) % media.images.length); }}>
      <div className={`development-gallery-image${gallery === 'plans' ? ' is-plan' : ''}`}>
        {!photoFailed ? <img key={media.images[imageIndex].file} src={`${ASSETS}${media.images[imageIndex].file}`} alt={media.images[imageIndex].caption} onError={() => setPhotoFailed(true)} /> : <p>Não foi possível carregar esta imagem. Selecione outra imagem ou tente novamente.</p>}
        {media.images.length > 1 && <><button className="gallery-prev" aria-label="Imagem anterior" onClick={() => setImageIndex(value => (value - 1 + media.images.length) % media.images.length)}><ChevronLeft size={22} /></button><button className="gallery-next" aria-label="Próxima imagem" onClick={() => setImageIndex(value => (value + 1) % media.images.length)}><ChevronRight size={22} /></button></>}
      </div>
      <div className="development-gallery-caption" aria-live="polite"><strong>{media.images[imageIndex].caption}</strong><span>{String(imageIndex + 1).padStart(2, '0')} / {String(media.images.length).padStart(2, '0')}</span></div>
      {media.images.length > 1 && <div className="development-thumbnails" aria-label="Escolher imagem">{media.images.map((item, index) => <button key={item.file} aria-label={item.caption} aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)}><img src={`${ASSETS}${item.file}`} alt="" loading="lazy" /></button>)}</div>}
      <p className="small-copy">{media.note}</p><a className="primary-button" href={contact} target="_blank" rel="noopener noreferrer">Conversar sobre o empreendimento <ArrowUpRight size={16} /></a>
    </div></Dialog>}
  </main>;
}
