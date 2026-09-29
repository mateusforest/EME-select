import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Maximize,Minimize,Menu,X,RotateCcw,Share2,Plus,Minus,EyeOff,Building2,DoorOpen,Info} from 'lucide-react';
import G400Scene from '../developments/G400Scene';
import {G400_ASSETS,g400Galleries,g400UnitsOnFloor,type G400GalleryId,type G400Image} from '../developments/g400';
import {g400Views,type G400View} from '../developments/g400Projection';
import {defaultScene,sceneAssets,sceneRooms} from '../../shared/spatial-scene.mjs';
import {readPresentation} from './config';
import '../developments/development.css';
import '../developments/g400.css';
import '../developments/g400-residence.css';
import './presentation.css';
const loadModel=()=>import('../developments/G400ApartmentModel');
const Model=lazy(loadModel);
type Mode='building'|'gallery'|'model';
type Gallery={images:G400Image[];title:string;note:string;plan?:boolean};

export default function Presentation(){
 const [hash,setHash]=useState(location.hash);
 useEffect(()=>{const changed=()=>setHash(location.hash);window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);
 return <PresentationView key={hash}/>;
}
function PresentationView(){
 const [input]=useState(()=>{try{return {config:/\/cenario\/?$/.test(location.pathname)?readPresentation(location.hash):null,error:''};}catch{return {config:null,error:'Este link está incompleto ou inválido. Peça uma nova apresentação à equipe EME.'};}});
 const scene=input.config?.scene||defaultScene(),title=input.config?.title||'G400 · Geraldo Andreola';
 const initialMode:Mode=input.config?(scene.mode==='tipo5'?'model':'gallery'):'building';
 const initialGallery:Gallery={title:'Percurso do projeto',note:'Perspectivas ilustrativas do G400 · Yclodema. Consulte o memorial aprovado.',images:scene.assets.map(id=>{const a=sceneAssets.find(a=>a.id===id)!;return {file:a.file,caption:a.label};})};
 const [mode,setMode]=useState<Mode>(initialMode),[gallery,setGallery]=useState(initialGallery),[index,setIndex]=useState(0);
 const [floor,setFloor]=useState<number|null>(null),[panel,setPanel]=useState<'floors'|'rooms'|'info'|null>(null),[clean,setClean]=useState(false);
 const [view,setView]=useState<G400View>('left'),[shown,setShown]=useState<G400View>('left'),[zoom,setZoom]=useState(1),[scale,setScale]=useState(1);
 const [hour,setHour]=useState(scene.hour),[room,setRoom]=useState(scene.room),[inside,setInside]=useState(false),[reset,setReset]=useState(0);
 const [modelStarted,setModelStarted]=useState(initialMode==='model');
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[full,setFull]=useState(false),[notice,setNotice]=useState(''),[imageFailed,setImageFailed]=useState(false);
 const host=useRef<HTMLElement>(null),menu=useRef<HTMLButtonElement>(null),drawer=useRef<HTMLElement>(null);
 const lighting=hour>=20?'night':hour>=17?'sunset':'day';
 useEffect(()=>{document.title=title+' · EME Spatial';const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[title]);
 useEffect(()=>{const fn=()=>setFull(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',fn);return()=>document.removeEventListener('fullscreenchange',fn);},[]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),5500);return()=>clearTimeout(timer);},[notice]);
 useEffect(()=>{if(panel)drawer.current?.querySelector<HTMLButtonElement>('button')?.focus();},[panel]);
 useEffect(()=>{setImageFailed(false);},[gallery,index]);
 function closePanel(){setPanel(null);menu.current?.focus();}
 function selectFloor(n:number){setFloor(n);setClean(false);setPanel('floors');}
 function openGallery(id:G400GalleryId,i=0){setGallery({...g400Galleries[id],plan:id==='plans'||id==='infrastructure'});setIndex(i);setScale(1);setMode('gallery');setPanel(null);}
 function enterModel(){setModelStarted(true);setMode('model');setInside(false);setPanel(null);}
 function changeImage(n:number){setIndex(i=>(i+n+gallery.images.length)%gallery.images.length);setScale(1);}
 function restart(){setMode(initialMode);setGallery(initialGallery);setIndex(0);setView('left');setZoom(1);setScale(1);setFloor(null);setInside(false);setHour(scene.hour);setRoom(scene.room);setReset(v=>v+1);setPanel(null);setClean(false);}
 async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(host.current?.requestFullscreen)await host.current.requestFullscreen();else throw Error();}catch{setNotice('A apresentação já ocupa a janela. Neste navegador, use a opção de tela cheia do próprio navegador.');}}
 async function share(){try{await navigator.clipboard.writeText(location.href);setNotice('Link da apresentação copiado.');}catch{setNotice('Copie o endereço da barra do navegador para compartilhar.');}}
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.target instanceof Element&&e.target.closest('input,select,textarea'))return;if(e.key==='Escape'){if(panel){e.preventDefault();closePanel();}else setClean(false);}if(e.key.toLowerCase()==='h'){setClean(v=>!v);setPanel(null);}if(e.key.toLowerCase()==='f'){e.preventDefault();void fullscreen();}if(e.key==='ArrowRight'&&mode==='gallery'){e.preventDefault();changeImage(1);}if(e.key==='ArrowLeft'&&mode==='gallery'){e.preventDefault();changeImage(-1);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[mode,gallery,panel]);
 if(input.error)return <main className="sp-show sp-error"><h1>Apresentação indisponível</h1><p>{input.error}</p><a href="/apresentar/g400">Abrir apresentação do G400</a></main>;
 return <main ref={host} className={`sp-show${clean?' sp-show--clean':''}`} data-mode={mode}>
  <div className={`sp-stage development-stage development-stage--${lighting}`}>
   {(mode==='building'||mode==='model'&&!ready)&&<G400Scene complete view={view} floor={floor} lighting={lighting} zoom={zoom} onSelect={selectFloor} onGallery={openGallery} onViewChange={setShown} onRequestView={setView} onZoom={d=>setZoom(z=>Math.max(1,Math.min(1.9,z+d*.12)))}/>}
   {mode==='gallery'&&<div className={`sp-photo${gallery.plan?' sp-photo--plan':''}`} tabIndex={0} aria-label="Imagem da apresentação, use as setas para navegar" style={{overflow:scale>1?'auto':'hidden'}}>{!imageFailed?<img key={gallery.images[index].file} src={G400_ASSETS+gallery.images[index].file} alt={gallery.images[index].caption} style={{width:scale>1?`${scale*100}%`:undefined,height:scale>1?`${scale*100}%`:undefined,maxWidth:'none'}} onError={()=>setImageFailed(true)}/>:<p role="alert">Não foi possível carregar esta imagem. Selecione outra vista.</p>}</div>}
   {modelStarted&&!failed&&<div className="sp-model-layer" aria-hidden={mode!=='model'||!ready} inert={mode!=='model'||!ready} data-visible={mode==='model'&&ready}><Suspense fallback={null}><Model active={mode==='model'} room={room} inside={inside} hour={hour} finish={scene.finish} reset={reset} onEnter={()=>setInside(true)} onSelect={setRoom} onReady={()=>setReady(true)} onFail={()=>setFailed(true)}/></Suspense></div>}
   {mode==='model'&&!ready&&!failed&&<div className="sp-preparing" role="status">Preparando a unidade 305…<button onClick={()=>setMode('building')}>Voltar ao edifício</button></div>}
   {mode==='model'&&failed&&<div className="sp-loading" role="alert"><p>O 3D não está disponível neste dispositivo.</p><button onClick={()=>openGallery('interiors')}>Ver imagens dos interiores</button></div>}
  </div>
  {!clean&&<><header className="sp-top"><div><span>EME SPATIAL</span><h1>{title}</h1>{mode==='model'&&<span className="sp-model-label">Unidade 305 · Tipo 5 · piloto conceitual</span>}</div><div><button onClick={share} aria-label="Copiar link da apresentação"><Share2/></button><button onClick={fullscreen} aria-label={full?'Sair da tela cheia':'Entrar em tela cheia'}>{full?<Minimize/>:<Maximize/>}<span>{full?'Sair':'Tela cheia'}</span></button></div></header>
  <nav className="sp-dock" aria-label="Controles da apresentação">
   <button onClick={()=>{setMode('building');setPanel(null);}} aria-pressed={mode==='building'}><Building2/><span>Edifício</span></button>
   <button ref={menu} aria-expanded={panel===(mode==='model'?'rooms':'floors')} onClick={()=>setPanel(p=>p?null:mode==='model'?'rooms':'floors')}><Menu/><span>{mode==='model'?'Ambientes':'Andares'}</span></button>
   <button onClick={()=>openGallery('interiors')}>Interiores</button><button onClick={()=>openGallery('leisure')}>Lazer</button><button onClick={()=>openGallery('plans',mode==='model'?4:0)}>Plantas</button>
   {mode==='model'?<button disabled={!ready||failed} onClick={()=>setInside(v=>!v)}><DoorOpen/><span>{inside?'Vista completa':'Caminhar'}</span></button>:<button onPointerEnter={()=>{void loadModel();}} onFocus={()=>{void loadModel();}} onClick={enterModel}><DoorOpen/><span>Visitar Tipo 5</span></button>}
   <button onClick={restart} aria-label="Reiniciar apresentação"><RotateCcw/></button><button onClick={()=>{setClean(true);setPanel(null);}} aria-label="Ocultar controles"><EyeOff/></button><button onClick={()=>setPanel(p=>p==='info'?null:'info')} aria-label="Ajuda e informações"><Info/></button>
  </nav>
  <div className="sp-context">
   {mode==='building'&&<div className="sp-pills" aria-label="Perspectivas">{(['left','front','right'] as const).map(v=><button key={v} aria-pressed={shown===v} onClick={()=>{setView(v);setZoom(1);}}>{g400Views[v].label}</button>)}</div>}
   {mode==='gallery'&&<div className="sp-pills"><button onClick={()=>changeImage(-1)} aria-label="Imagem anterior"><ArrowLeft/></button><span>{gallery.images[index].caption} · {index+1}/{gallery.images.length}</span><button onClick={()=>changeImage(1)} aria-label="Próxima imagem"><ArrowRight/></button>{gallery.plan&&<><button disabled={scale<=1} onClick={()=>setScale(s=>Math.max(1,s-.5))} aria-label="Reduzir planta"><Minus/></button><button disabled={scale>=3} onClick={()=>setScale(s=>Math.min(3,s+.5))} aria-label="Ampliar planta"><Plus/></button></>}</div>}
   {mode!=='gallery'&&<label className="sp-light">Luz<select aria-label="Luz da apresentação" value={hour} onChange={e=>setHour(Number(e.target.value))}><option value={14}>Dia</option><option value={18}>Entardecer</option><option value={21}>Noite</option>{![14,18,21].includes(hour)&&<option value={hour}>{hour}h</option>}</select></label>}
  </div></>}
  {clean&&<button className="sp-reveal" aria-label="Mostrar controles" onClick={()=>setClean(false)}><Menu/><span>Controles</span></button>}
  {panel&&!clean&&<aside ref={drawer} className="sp-drawer" aria-label={panel==='floors'?'Andares e unidades':panel==='rooms'?'Ambientes do apartamento':'Como apresentar'}><div className="sp-drawer-title"><h2>{panel==='floors'?'Escolha seu andar':panel==='rooms'?'Por onde vamos?':'Pronto para apresentar'}</h2><button onClick={closePanel} aria-label="Fechar painel"><X/></button></div>
   {panel==='floors'&&<><div className="sp-floor-grid">{[1,2,3,4,5,6,7].map(n=><button key={n} aria-pressed={floor===n} onClick={()=>{setFloor(n);setMode('building');}}>{n}º andar</button>)}</div><h3>{floor||3}º andar · unidades</h3>{g400UnitsOnFloor(floor||3).map(({unit,plan})=><button className="sp-unit" key={unit} onClick={()=>{if(unit==='305'){enterModel();}else{setGallery({title:'Unidade '+unit,note:g400Galleries.plans.note,plan:true,images:[{file:`planta-${plan.id}.webp`,caption:`Unidade ${unit} · ${plan.title} · ${plan.area} m²`}]});setIndex(0);setScale(1);setMode('gallery');setPanel(null);}}}><span><strong>{unit} · {plan.title}</strong><small>{plan.area} m² · {plan.suites} suítes</small></span><span>{unit==='305'?'Caminhar':'Ver planta'} →</span></button>)}<p>Disponibilidade a confirmar. Plantas e perspectivas ilustrativas.</p><button onClick={()=>openGallery('infrastructure')}>Infraestrutura e garagens →</button></>}
   {panel==='rooms'&&<>{sceneRooms.map(r=><button className="sp-unit" key={r.id} aria-pressed={room===r.id} onClick={()=>{setRoom(r.id);setInside(true);setPanel(null);}}>{r.label}<ArrowRight/></button>)}<p>Toque no piso para caminhar. Arraste para olhar. No computador, use W, A, S, D ou as setas com o cenário em foco.</p></>}
   {panel==='info'&&<><p>Use <strong>Tela cheia</strong> para apresentar na TV, notebook ou tela touch. Toque em um andar para explorar as unidades.</p><p><strong>H</strong> recolhe os controles. <strong>F</strong> alterna a tela cheia. As setas mudam as imagens. Esc fecha o painel ou restaura os controles.</p><p>O Tipo 5 é um piloto 3D conceitual. O apartamento 305 segue a distribuição da planta Tipo 5, com janelas foscas e corte ilustrativo do terceiro andar. As demais unidades abrem suas plantas. Imagens, medidas e acabamentos devem ser conferidos com o projeto aprovado.</p><p>Este link é de visualização e pode ser aberto por quem o receber. A edição do projeto permanece no portal EME.</p></>}
  </aside>}
  {notice&&<div className="sp-notice" role="status">{notice}</div>}
 </main>;
}
