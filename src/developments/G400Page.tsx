import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, DoorOpen, Maximize, Minus, Plus, RotateCcw, Share2 } from 'lucide-react';
import { whatsappUrl } from '../data';
import { G400_ASSETS, G400_ROUTE, g400UnitsOnFloor, type G400GalleryId } from './g400';
import type { Lighting } from './moradas';
import { g400Residences } from './g400Residences';
import G400Scene from './G400Scene';
import { g400Views, type G400View } from './g400Projection';
import G400Gallery from './G400Gallery';
import './development.css';
import './g400.css';
const G400Residence=lazy(()=>import('./G400Residence'));
type GallerySelection={id:G400GalleryId;index:number;unit?:string};

export default function G400Page(){
  const [floor,setFloor]=useState(3),[showFloor,setShowFloor]=useState(false);
  const [view,setView]=useState<G400View>('left'),[displayedView,setDisplayedView]=useState<G400View>('left');
  const [lighting,setLighting]=useState<Lighting>('day');
  const [gallery,setGallery]=useState<GallerySelection|null>(null);
  const [residence,setResidence]=useState<{unit:string;start3d?:boolean}|null>(null);
  const [zoom,setZoom]=useState(1),[toolsOpen,setToolsOpen]=useState(true);
  const [notice,setNotice]=useState('');
  const pageRef=useRef<HTMLElement>(null);
  const selectedUnits=g400UnitsOnFloor(floor);
  const openGallery=(id:G400GalleryId,index=0,unit?:string)=>setGallery({id,index,unit});
  const selectFloor=(value:number)=>{setFloor(value);setShowFloor(true);setToolsOpen(true);};
  const contact=whatsappUrl(`Olá! Gostaria de conhecer o G400 — Geraldo Andreola, da Yclodema, em Vacaria. Estou explorando o ${floor}º andar. Podemos confirmar plantas e disponibilidade?`);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);},[notice]);
  function reset(){setView('left');setZoom(1);setShowFloor(false);}
  function changeZoom(direction:number){setZoom(value=>Math.max(1,Math.min(1.9,value+direction*.12)));}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await pageRef.current?.requestFullscreen();}catch{setNotice('Use a opção de tela cheia do navegador para ampliar a experiência.');}}
  async function share(){try{await navigator.clipboard.writeText(`${location.origin}/${G400_ROUTE}`);setNotice('Link do G400 copiado.');}catch{setNotice('Compartilhe o endereço desta página.');}}
  return <main id="conteudo" className={`development-page g400-page development-page--image${showFloor?' g400-floor-selected':''}`} ref={pageRef}>
    <div className={`development-stage development-stage--${lighting}`} data-testid="g400-stage">
      <G400Scene view={view} floor={showFloor?floor:null} lighting={lighting} zoom={zoom} onSelect={selectFloor} onGallery={openGallery} onViewChange={setDisplayedView} onRequestView={setView} onZoom={changeZoom}/>
    </div>
    <div className="development-veil" aria-hidden="true"/>
    <section className="development-intro" aria-labelledby="development-title">
      <a className="development-back" href="#/"><ArrowLeft size={13}/> Voltar à coleção</a>
      <p className="eyebrow"><span className="tiny-rule"/> Yclodema · Vacaria, RS</p>
      <h1 id="development-title"><span className="g400-name"><img src={G400_ASSETS+'logo.svg'} alt=""/><span className="g400-logo-accessible">G400</span><span>Geraldo Andreola</span></span><em>A cidade.{' '}<br/>Seu novo horizonte.</em></h1>
      <p>Apartamentos de 2 e 3 suítes, coberturas duplex e triplex. Um novo olhar para viver na Avenida Moreira Paz.</p>
      <nav className="g400-view-navigation" aria-label="Ângulos do edifício"><span>Seu olhar, novas perspectivas</span><div>{(['left','front','right'] as const).map(id=><button key={id} aria-label={`Ver ${g400Views[id].label.toLowerCase()}`} aria-pressed={displayedView===id} onClick={()=>{setZoom(1);setView(id);}}>{id==='left'&&<ArrowLeft size={12}/>} {g400Views[id].label} {id==='right'&&<ArrowRight size={12}/>}</button>)}</div><small aria-live="polite">Arraste para mudar de lado · role para aproximar</small></nav>
      <button className="g400-location" onClick={()=>openGallery('facades',1)}>Av. Moreira Paz, 400 <ArrowUpRight size={12}/><small>Esquina com a Rua João Borges Pinto</small></button>
    </section>
    <button className="development-panel-toggle" aria-expanded={toolsOpen} aria-controls="g400-floor-panel" onClick={()=>setToolsOpen(value=>!value)}>{toolsOpen?'Recolher andares e plantas':'Explorar andares e plantas'} {toolsOpen?<Minus size={14}/>:<Plus size={14}/>}</button>
    {toolsOpen&&<aside className="development-panel" id="g400-floor-panel" aria-label="Andares e plantas do G400">
      <div className="development-panel-heading"><h2>Escolha seu andar</h2><button aria-label="Compartilhar empreendimento" onClick={share}><Share2 size={15}/></button></div>
      <div className="development-floors g400-floors" role="group" aria-label="Andares">{[1,2,3,4,5,6,7].map(level=><button key={level} aria-label={`${level}º andar${level===7?' e coberturas':''}`} aria-pressed={floor===level} onClick={()=>selectFloor(level)}><span>{level}<small>º</small></span>{level===7&&<span className="g400-floor-roof">Coberturas</span>}</button>)}</div>
      <div className="development-floor-detail" aria-live="polite"><h3>{floor===7?'7º andar · Coberturas':`${floor}º andar · Apartamentos`}</h3><span>Disponibilidade a confirmar</span></div>
      <div key={floor} className="g400-unit-list" aria-label="Unidades no projeto">{selectedUnits.map(({unit,plan})=><button key={unit} onClick={()=>setResidence({unit,start3d:plan.id==='tipo-5'})} aria-label={`Explorar unidade ${unit}`}><svg className="g400-unit-preview" viewBox={g400Residences[plan.id].levels[0].crop.join(' ')} aria-hidden="true"><image href={G400_ASSETS+`planta-${plan.id}.webp`} width="1920" height={g400Residences[plan.id].height}/></svg><span><strong>{unit} <small>· {plan.title}</small></strong><span>{plan.area} m² <i>·</i> {plan.suites} suítes{plan.id==='tipo-5'&&<small className="g400-visit-badge">Entrar e caminhar</small>}</span></span><ArrowUpRight size={15}/></button>)}</div>
      <p className="g400-project-note">Numeração e áreas conforme as plantas comerciais. Consulte as condições atuais.</p>
      <button className="development-primary g400-visit-entry" onClick={()=>{const pilotUnit=floor<=5?`${floor}05`:'305';selectFloor(Number(pilotUnit[0]));setResidence({unit:pilotUnit,start3d:true});}}><span>Visitar um apartamento<small>Tipo 5 · entre e explore os ambientes</small></span><DoorOpen size={18}/></button>
      <button className="development-primary" onClick={()=>openGallery('interiors')}>Conhecer os interiores <ArrowUpRight size={17}/></button>
      <button className="development-plan-link" onClick={()=>openGallery('plans')}>Todas as plantas <ArrowRight size={13}/></button>
      <button className="development-plan-link" onClick={()=>openGallery('infrastructure')}>Lazer e infraestrutura <ArrowRight size={13}/></button>
      <a className="development-consult" href={contact} target="_blank" rel="noreferrer">Consultar a EME <ArrowUpRight size={13}/></a>
      <small className="development-disclaimer">Perspectivas ilustrativas. Plantas e características sujeitas ao projeto e memorial da incorporadora.</small>
    </aside>}
    <div className="development-bottom">
      <div className="development-navigation"><p className="eyebrow">G400 / Explore o empreendimento</p><div role="group" aria-label="Áreas do empreendimento"><button onClick={reset}>Visão geral</button><button onClick={()=>openGallery('facades')}>Fachadas</button><button onClick={()=>openGallery('interiors')}>Interiores</button><button onClick={()=>openGallery('leisure')}>Lazer</button></div></div>
      <div className="development-lighting" role="group" aria-label="Luz do cenário"><span>Luz do cenário<small>Simulação visual</small></span>{([{id:'day',label:'Dia'},{id:'sunset',label:'Entardecer'},{id:'night',label:'Noite'}] as const).map(item=><button key={item.id} aria-pressed={lighting===item.id} onClick={()=>setLighting(item.id)}>{item.label}</button>)}</div>
      <div className="development-controls"><div><a className="g400-presentation-link" href="/apresentar/g400" target="_blank" rel="noreferrer"><Maximize size={14}/> Apresentar</a><button aria-label="Restaurar visão geral" onClick={reset}><RotateCcw size={14}/></button><button aria-label="Alternar tela cheia" onClick={fullscreen}><Maximize size={14}/><span>Visão ampla</span></button><button aria-label="Afastar cenário" onClick={()=>changeZoom(-1)}><Minus size={16}/></button><button aria-label="Aproximar cenário" onClick={()=>changeZoom(1)}><Plus size={16}/></button></div><small>{showFloor?`${floor}º andar em destaque · escolha sua unidade`:'Toque em um andar para descobrir os apartamentos.'}</small></div>
    </div>
    <p className="development-footnote">Cenário e marcações de pavimentos conceituais. Galerias: perspectivas e plantas da Yclodema.</p>
    {notice&&<div className="development-notice" role="status">{notice}</div>}
    {gallery&&<G400Gallery key={`${gallery.id}-${gallery.index}-${gallery.unit||''}`} id={gallery.id} initialIndex={gallery.index} unit={gallery.unit} onClose={()=>setGallery(null)}/>}
    {residence&&<Suspense fallback={<div className="development-notice" role="status">Abrindo o apartamento…</div>}><G400Residence key={residence.unit} unit={residence.unit} start3d={residence.start3d} initialHour={lighting==='night'?20:lighting==='sunset'?18:14} onClose={()=>setResidence(null)}/></Suspense>}
  </main>;
}
