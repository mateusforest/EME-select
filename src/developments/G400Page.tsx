import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Box, ImageIcon, Maximize, Minus, Plus, RotateCcw, Share2 } from 'lucide-react';
import { whatsappUrl } from '../data';
import { G400_ASSETS, G400_ROUTE, g400UnitsOnFloor, type G400GalleryId } from './g400';
import type { Lighting } from './moradas';
import type { ModelControls } from './DevelopmentModel';
import G400Scene from './G400Scene';
import { g400Views, type G400View } from './g400Projection';
import G400Gallery from './G400Gallery';
import './development.css';
import './g400.css';
const G400Model=lazy(()=>import('./G400Model'));
type GallerySelection={id:G400GalleryId;index:number;unit?:string};

export default function G400Page(){
  const [floor,setFloor]=useState(3),[showFloor,setShowFloor]=useState(false);
  const [view,setView]=useState<G400View>('left'),[displayedView,setDisplayedView]=useState<G400View>('left');
  const [lighting,setLighting]=useState<Lighting>('day');
  const [mode,setMode]=useState<'image'|'model'>('image');
  const [gallery,setGallery]=useState<GallerySelection|null>(null);
  const [zoom,setZoom]=useState(1),[toolsOpen,setToolsOpen]=useState(true);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[notice,setNotice]=useState('');
  const pageRef=useRef<HTMLElement>(null),controls=useRef<ModelControls|null>(null);
  const selectedUnits=g400UnitsOnFloor(floor);
  const openGallery=(id:G400GalleryId,index=0,unit?:string)=>setGallery({id,index,unit});
  const selectFloor=(value:number)=>{setFloor(value);setShowFloor(true);setToolsOpen(true);};
  const contact=whatsappUrl(`Olá! Gostaria de conhecer o G400 — Geraldo Andreola, da Yclodema, em Vacaria. Estou explorando o ${floor}º andar. Podemos confirmar plantas e disponibilidade?`);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);},[notice]);
  function reset(){setView('left');setZoom(1);setShowFloor(false);controls.current?.reset();}
  function changeZoom(direction:number){if(mode==='model')controls.current?.zoom(direction);else setZoom(value=>Math.max(1,Math.min(1.6,value+direction*.15)));}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await pageRef.current?.requestFullscreen();}catch{setNotice('Use a opção de tela cheia do navegador para ampliar a experiência.');}}
  async function share(){try{await navigator.clipboard.writeText(`${location.origin}/${G400_ROUTE}`);setNotice('Link do G400 copiado.');}catch{setNotice('Compartilhe o endereço desta página.');}}
  return <main id="conteudo" className={`development-page g400-page development-page--${mode}`} ref={pageRef}>
    <div className={`development-stage development-stage--${lighting}`} data-testid="g400-stage">
      {mode==='image'?<G400Scene view={view} floor={showFloor?floor:null} lighting={lighting} zoom={zoom} onSelect={selectFloor} onGallery={openGallery} onViewChange={setDisplayedView}/>:<Suspense fallback={<div className="development-loading" role="status">Preparando a maquete…</div>}><G400Model ref={controls} floor={showFloor?floor:null} lighting={lighting} onSelectFloor={selectFloor} onReady={()=>setReady(true)} onFail={()=>setFailed(true)}/></Suspense>}
      {mode==='model'&&!ready&&!failed&&<div className="development-loading" role="status">Preparando a maquete…</div>}
      {mode==='model'&&failed&&<div className="development-model-error"><h2>Explore pelas imagens.</h2><p>A maquete não pôde ser aberta neste navegador.</p><button className="primary-button" onClick={()=>setMode('image')}>Voltar ao cenário <ArrowRight size={16}/></button></div>}
    </div>
    <div className="development-veil" aria-hidden="true"/>
    <section className="development-intro" aria-labelledby="development-title">
      <a className="development-back" href="#/"><ArrowLeft size={13}/> Voltar à coleção</a>
      <p className="eyebrow"><span className="tiny-rule"/> Yclodema · Vacaria, RS</p>
      <h1 id="development-title"><span className="g400-name"><img src={G400_ASSETS+'logo.svg'} alt=""/><span className="g400-logo-accessible">G400</span><span>Geraldo Andreola</span></span><em>A cidade.{' '}<br/>Seu novo horizonte.</em></h1>
      <p>Apartamentos de 2 e 3 suítes, coberturas duplex e triplex. Um novo olhar para viver na Avenida Moreira Paz.</p>
      <div className="development-view-switch" role="group" aria-label="Visualização do empreendimento"><button aria-pressed={mode==='image'} onClick={()=>setMode('image')}><ImageIcon size={14}/> Cenário</button><button aria-pressed={mode==='model'} disabled={mode==='model'} onClick={()=>{setMode('model');setReady(false);setFailed(false);}}><Box size={15}/> Explorar em 3D</button></div>
      <span className="development-model-note">{mode==='model'?'Maquete conceitual · arraste para girar':'Cenário conceitual · explore os pontos do edifício'}</span>
      {mode==='image'&&<nav className="g400-view-navigation" aria-label="Ângulos do edifício"><span>Contorne o G400</span><div>{(['left','front','right'] as const).map(id=><button key={id} aria-label={`Ver ${g400Views[id].label.toLowerCase()}`} aria-pressed={displayedView===id} onClick={()=>{setZoom(1);setView(id);}}>{id==='left'&&<ArrowLeft size={12}/>} {g400Views[id].label} {id==='right'&&<ArrowRight size={12}/>}</button>)}</div><small aria-live="polite">{g400Views[displayedView].label} · selecione os andares na fachada</small></nav>}
      <button className="g400-location" onClick={()=>openGallery('facades',1)}>Av. Moreira Paz, 400 <ArrowUpRight size={12}/><small>Esquina com a Rua João Borges Pinto</small></button>
    </section>
    <button className="development-panel-toggle" aria-expanded={toolsOpen} aria-controls="g400-floor-panel" onClick={()=>setToolsOpen(value=>!value)}>{toolsOpen?'Recolher andares e plantas':'Explorar andares e plantas'} {toolsOpen?<Minus size={14}/>:<Plus size={14}/>}</button>
    {toolsOpen&&<aside className="development-panel" id="g400-floor-panel" aria-label="Andares e plantas do G400">
      <div className="development-panel-heading"><h2>Escolha seu andar</h2><button aria-label="Compartilhar empreendimento" onClick={share}><Share2 size={15}/></button></div>
      <div className="development-floors g400-floors" role="group" aria-label="Andares">{[1,2,3,4,5,6,7].map(level=><button key={level} aria-label={`${level}º andar${level===7?' e coberturas':''}`} aria-pressed={floor===level} onClick={()=>selectFloor(level)}><span>{level}<small>º</small></span>{level===7&&<span className="g400-floor-roof">Coberturas</span>}</button>)}</div>
      <div className="development-floor-detail" aria-live="polite"><h3>{floor===7?'7º andar · Coberturas':`${floor}º andar · Apartamentos`}</h3><span>Disponibilidade a confirmar</span></div>
      <div className="g400-unit-list" aria-label="Unidades no projeto">{selectedUnits.map(({unit,plan,planIndex})=><button key={unit} onClick={()=>openGallery('plans',planIndex,unit)} aria-label={`Ver planta da unidade ${unit}`}><span><strong>{unit} <small>· {plan.title}</small></strong><span>{plan.area} m² <i>·</i> {plan.suites} suítes</span></span><ArrowUpRight size={15}/></button>)}</div>
      <p className="g400-project-note">Numeração e áreas conforme as plantas comerciais. Consulte as condições atuais.</p>
      <button className="development-primary" onClick={()=>openGallery('interiors')}>Conhecer os interiores <ArrowUpRight size={17}/></button>
      <button className="development-plan-link" onClick={()=>openGallery('plans')}>Todas as plantas <ArrowRight size={13}/></button>
      <button className="development-plan-link" onClick={()=>openGallery('infrastructure')}>Lazer e infraestrutura <ArrowRight size={13}/></button>
      <a className="development-consult" href={contact} target="_blank" rel="noreferrer">Consultar a EME <ArrowUpRight size={13}/></a>
      <small className="development-disclaimer">Perspectivas ilustrativas. Plantas e características sujeitas ao projeto e memorial da incorporadora.</small>
    </aside>}
    <div className="development-bottom">
      <div className="development-navigation"><p className="eyebrow">G400 / Explore o empreendimento</p><div role="group" aria-label="Áreas do empreendimento"><button onClick={reset}>Visão geral</button><button onClick={()=>openGallery('facades')}>Fachadas</button><button onClick={()=>openGallery('interiors')}>Interiores</button><button onClick={()=>openGallery('leisure')}>Lazer</button></div></div>
      <div className="development-lighting" role="group" aria-label="Luz do cenário"><span>Luz do cenário<small>Simulação visual</small></span>{([{id:'day',label:'Dia'},{id:'sunset',label:'Entardecer'},{id:'night',label:'Noite'}] as const).map(item=><button key={item.id} aria-pressed={lighting===item.id} onClick={()=>setLighting(item.id)}>{item.label}</button>)}</div>
      <div className="development-controls"><div><button aria-label="Restaurar visão geral" onClick={reset}><RotateCcw size={14}/></button><button aria-label="Alternar tela cheia" onClick={fullscreen}><Maximize size={14}/><span>Visão ampla</span></button><button aria-label="Afastar cenário" onClick={()=>changeZoom(-1)}><Minus size={16}/></button><button aria-label="Aproximar cenário" onClick={()=>changeZoom(1)}><Plus size={16}/></button></div><small>{mode==='model'?'Arraste para girar. Clique para explorar.':'Clique no edifício para explorar os pavimentos.'}</small></div>
    </div>
    <p className="development-footnote">Cenário e marcações de pavimentos conceituais. Galerias: perspectivas e plantas da Yclodema.</p>
    {notice&&<div className="development-notice" role="status">{notice}</div>}
    {gallery&&<G400Gallery key={`${gallery.id}-${gallery.index}-${gallery.unit||''}`} id={gallery.id} initialIndex={gallery.index} unit={gallery.unit} onClose={()=>setGallery(null)}/>}
  </main>;
}
