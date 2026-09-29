import { lazy, Suspense, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Box, ChevronLeft, ChevronRight, DoorOpen, Layers, Maximize, RotateCcw, Sun, Moon, Map } from 'lucide-react';
import { Dialog } from '../ui';
import { whatsappUrl } from '../data';
import { G400_ASSETS, g400Plans } from './g400';
import { g400Residences } from './g400Residences';
import './g400-residence.css';

const ApartmentModel=lazy(()=>import('./G400ApartmentModel'));
type View='plan'|'model'|'original';
export default function G400Residence({unit,start3d=false,initialHour=14,onClose}:{unit:string;start3d?:boolean;initialHour?:number;onClose:()=>void}){
  const plan=g400Plans.find(p=>p.units.includes(unit))!;
  const layout=g400Residences[plan.id],pilot=plan.id==='tipo-5';
  const [view,setView]=useState<View>(pilot&&start3d?'model':'plan');
  const [levelIndex,setLevelIndex]=useState(0),[roomId,setRoomId]=useState(layout.levels[0].rooms[0].id);
  const [inside,setInside]=useState(false),[hour,setHour]=useState(initialHour),[reset,setReset]=useState(0);
  const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[enlarged,setEnlarged]=useState(false),[imageFailed,setImageFailed]=useState(false);
  const level=layout.levels[levelIndex],room=level.rooms.find(r=>r.id===roomId)||level.rooms[0],roomIndex=level.rooms.indexOf(room);
  const image=G400_ASSETS+`planta-${plan.id}.webp`;
  const contact=whatsappUrl(`Olá! Estou explorando a unidade ${unit} do G400, ${plan.title}, ${plan.area} m² e ${plan.suites} suítes. Gostaria de confirmar a disponibilidade e conhecer os detalhes.`);
  function changeView(next:View){setView(next);setEnlarged(false);if(next==='model'){setReady(false);setFailed(false);}}
  function changeLevel(index:number){setLevelIndex(index);setRoomId(layout.levels[index].rooms[0].id);setEnlarged(false);}
  function moveRoom(direction:number){setRoomId(level.rooms[(roomIndex+direction+level.rooms.length)%level.rooms.length].id);}
  return <Dialog title={`G400 · Unidade ${unit}`} onClose={onClose} wide className="g400-residence">
    <div className="residence-topline"><button onClick={onClose}><ArrowLeft size={14}/> Voltar ao {unit[0]}º andar</button><span>Yclodema <i/> Geraldo Andreola</span></div>
    <div className="residence-layout">
      <section className="residence-visual" aria-label={`Exploração da unidade ${unit}`}>
        <div className="residence-viewbar" role="group" aria-label="Forma de explorar a unidade">
          <button aria-pressed={view==='plan'} onClick={()=>changeView('plan')}><Map size={16}/> Planta interativa</button>
          {pilot&&<button aria-pressed={view==='model'} onClick={()=>{if(view!=='model')changeView('model');}}><Box size={16}/> Visita 3D <small>Piloto</small></button>}
          <button aria-pressed={view==='original'} onClick={()=>changeView('original')}><Maximize size={15}/><span>Prancha original</span></button>
        </div>
        {layout.levels.length>1&&view!=='original'&&<div className="residence-levels" role="group" aria-label="Níveis da unidade">{layout.levels.map((l,i)=><button key={l.name} aria-pressed={levelIndex===i} onClick={()=>changeLevel(i)}><Layers size={13}/>{l.name}</button>)}</div>}
        <div className={`residence-viewport residence-viewport--${view}${enlarged?' is-enlarged':''}`}>
          {view==='plan'&&<>
            <div className="residence-plan-canvas" style={{aspectRatio:`${level.crop[2]} / ${level.crop[3]}`,width:`min(100%, calc((var(--viewer-height) - 66px) * ${level.crop[2]/level.crop[3]}))`}}>
              <svg viewBox={level.crop.join(' ')} role="img" aria-label={`${plan.title} · ${level.name} · planta ilustrativa`}><image href={image} width="1920" height={layout.height} onError={()=>setImageFailed(true)}/></svg>
              {level.rooms.map((r,i)=><button key={r.id} className="residence-room-pin" aria-label={`Explorar ${r.name}`} aria-pressed={room.id===r.id} onClick={()=>setRoomId(r.id)} style={{left:`${(r.x-level.crop[0])/level.crop[2]*100}%`,top:`${(r.y-level.crop[1])/level.crop[3]*100}%`}}><span>{String(i+1).padStart(2,'0')}</span></button>)}
            </div>
            {imageFailed&&<p className="residence-load">A planta não carregou. <button onClick={()=>{setImageFailed(false);changeView('original');}}>Abrir prancha original</button></p>}
            <p className="residence-plan-hint">Selecione os pontos para conhecer cada ambiente.</p>
          </>}
          {view==='original'&&<><img src={image} alt={`${plan.title} · ${plan.area} m² privativos · ${plan.suites} suítes`} onError={()=>setImageFailed(true)}/>{imageFailed&&<p className="residence-load">Não foi possível carregar a prancha.</p>}</>}
          {view==='model'&&<>
            {!failed&&<Suspense fallback={<div className="residence-load" role="status">Preparando seu próximo espaço…</div>}><ApartmentModel room={room.id} inside={inside} hour={hour} reset={reset} onSelect={setRoomId} onReady={()=>setReady(true)} onFail={()=>setFailed(true)}/></Suspense>}
            {!ready&&!failed&&<div className="residence-load" role="status">Preparando a visita 3D…</div>}
            {failed&&<div className="residence-load"><h3>Continue pela planta.</h3><p>A visita 3D não está disponível neste navegador.</p><button onClick={()=>changeView('plan')}>Explorar a planta <ArrowRight size={16}/></button></div>}
            {ready&&!failed&&<>
              <div className="residence-model-tools" role="group" aria-label="Controles da visita"><button aria-pressed={!inside} onClick={()=>setInside(false)}><Layers size={15}/> Visão aberta</button><button aria-pressed={inside} onClick={()=>setInside(true)}><DoorOpen size={15}/> Dentro do ambiente</button><button aria-label="Restaurar câmera do apartamento" onClick={()=>setReset(v=>v+1)}><RotateCcw size={15}/></button></div>
              <span className="residence-model-hint">{inside?'Arraste para olhar ao redor · use os ambientes para se deslocar':'Arraste para girar · role para aproximar'}</span>
            </>}
          </>}
        </div>
        {view==='original'?<div className="residence-sourcebar"><span>Prancha comercial · Yclodema</span><button aria-pressed={enlarged} onClick={()=>setEnlarged(v=>!v)}><Maximize size={14}/>{enlarged?'Ajustar à janela':'Ampliar prancha'}</button></div>:<div className="residence-room-bar" aria-live="polite"><span className="residence-room-number">{String(roomIndex+1).padStart(2,'0')}</span><div><strong>{room.name}</strong><small>{level.name} · {roomIndex+1} de {level.rooms.length} ambientes</small></div><div className="residence-room-arrows"><button aria-label="Ambiente anterior" onClick={()=>moveRoom(-1)}><ChevronLeft size={18}/></button><button aria-label="Próximo ambiente" onClick={()=>moveRoom(1)}><ChevronRight size={18}/></button></div></div>}
        {view==='model'&&ready&&!failed&&<div className="residence-light"><Sun size={16}/><label htmlFor="g400-interior-hour">Luz do ambiente <small>Simulação visual</small></label><input id="g400-interior-hour" type="range" min="8" max="20" step="1" value={hour} onChange={e=>setHour(Number(e.target.value))} aria-valuetext={`${hour} horas, simulação visual`}/><output htmlFor="g400-interior-hour">{hour}:00</output><Moon size={14}/></div>}
      </section>
      <aside className="residence-detail">
        <p className="residence-eyebrow">Uma nova perspectiva de morar</p>
        <h3>{plan.title==='Tipo 5'?'Seu espaço.\nSeu ritmo.':plan.title.startsWith('Tipo')?'Um lugar para\nchamar de seu.':'Mais espaço\npara viver.'}</h3>
        <div className="residence-facts"><div><strong>{plan.area}<small> m²</small></strong><span>área privativa</span></div><div><strong>{plan.suites}</strong><span>suítes</span></div><div><strong>{layout.levels.length}</strong><span>{layout.levels.length===1?'nível':'níveis'}</span></div></div>
        <div className="residence-detail-heading"><span>{plan.title} · Unidade {unit}</span><small>Disponibilidade a confirmar</small></div>
        <nav className="residence-rooms" aria-label="Ambientes da unidade">{level.rooms.map((r,i)=><button key={r.id} aria-pressed={room.id===r.id} onClick={()=>{setRoomId(r.id);if(view==='original')changeView('plan');}}><span>{String(i+1).padStart(2,'0')}</span>{r.name}<ArrowUpRight size={13}/></button>)}</nav>
        <p className="residence-room-description">{room.description}</p>
        {pilot&&view!=='model'&&<button className="residence-primary" onClick={()=>changeView('model')}><Box size={17}/> Entrar na visita 3D <ArrowRight size={17}/></button>}
        <a className="residence-contact" href={contact} target="_blank" rel="noreferrer">Conversar sobre esta unidade <ArrowUpRight size={15}/></a>
      </aside>
    </div>
    <p className="residence-note">{view==='model'?'Reconstrução conceitual a partir da planta. Medidas, alturas e mobiliário estimados; entorno neutro, sem representar a vista real da unidade. Luz ilustrativa.':'Plantas comerciais ilustrativas da Yclodema. Consulte o projeto e o memorial para medidas, acabamentos e equipamentos.'}</p>
  </Dialog>;
}
