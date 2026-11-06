import MoradasFloorHover from './MoradasFloorHover';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,BedDouble,Box,Maximize,Trees,X} from 'lucide-react';
import './featured-development.css';

const spatialUrl=import.meta.env.DEV && import.meta.env.VITE_SPATIAL_PREVIEW_URL || 'https://www.emespatial.com/apresentar/moradas-da-serra';
const contactUrl='https://wa.me/5554991578029?text='+encodeURIComponent('Olá! Gostaria de conhecer o Moradas da Serra, da DeVille, em Vacaria. Podemos conversar sobre plantas e disponibilidade?');

export default function FeaturedDevelopment(){
  const [active,setActive]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [slow,setSlow]=useState(false);
  const [notice,setNotice]=useState('');
  const viewer=useRef<HTMLDivElement>(null);
  const launch=useRef<HTMLButtonElement>(null);
  const close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(active)close.current?.focus({preventScroll:true});},[active]);
  useEffect(()=>{
    if(!active||loaded)return;
    const timer=window.setTimeout(()=>setSlow(true),15000);
    return()=>window.clearTimeout(timer);
  },[active,loaded]);
  function stop(){setActive(false);setLoaded(false);setSlow(false);setNotice('');requestAnimationFrame(()=>launch.current?.focus({preventScroll:true}));}
  async function expand(){
    try{if(document.fullscreenElement)await document.exitFullscreen();else await viewer.current?.requestFullscreen();}
    catch{setNotice('Para ampliar, use “Abrir no EME Spatial”.');}
  }
  return <div className={`moradas-feature${active?' moradas-feature--active':''}`}>
    <div className="moradas-feature__layout">
      <div className="moradas-feature__copy">
        <p className="moradas-feature__eyebrow">Empreendimento em destaque</p>
        <h2>Moradas da Serra</h2>
        <p className="moradas-feature__location">DeVille · Vacaria, RS</p>
        <p className="moradas-feature__description">Um novo olhar sobre o seu próximo lugar. Conheça o empreendimento e explore cada perspectiva.</p>
        <ul className="moradas-feature__facts"><li><BedDouble size={22} aria-hidden="true"/>2 e 3 dormitórios</li><li><Trees size={22} aria-hidden="true"/>Lazer e convivência</li></ul>
        <a className="moradas-feature__cta" href={contactUrl} target="_blank" rel="noopener noreferrer">Quero conhecer <ArrowRight size={20} aria-hidden="true"/></a>
        <p className="moradas-feature__signature">Uma seleção EME Select</p>
      </div>
      <div className="moradas-feature__viewer" ref={viewer}>
        {active?<>
          <div className="moradas-feature__toolbar"><span><Box size={18} aria-hidden="true"/>Moradas da Serra · EME Spatial</span><div><a href={spatialUrl} target="_blank" rel="noopener noreferrer">Abrir no EME Spatial <ArrowUpRight size={16}/></a><button type="button" onClick={expand} aria-label="Ampliar experiência"><Maximize size={18}/></button><button ref={close} type="button" onClick={stop} aria-label="Fechar experiência 3D"><X size={20}/></button></div></div>
          {!loaded&&<p className="moradas-feature__loading" role="status">{slow?'O carregamento está demorando. Você também pode abrir a experiência no EME Spatial.':'Carregando a experiência do EME Spatial…'}</p>}
          <iframe title="Experiência interativa do Moradas da Serra no EME Spatial" src={spatialUrl} allow="fullscreen" allowFullScreen onLoad={()=>setLoaded(true)} />
          <p className="moradas-feature__hint">Na apresentação, selecione “Explorar em 3D” para girar e aproximar a maquete. <span role="status">{notice}</span></p>
        </>:<>
          <img className="moradas-feature__preview" src="/assets/developments/moradas-da-serra/hero.webp" alt="Prévia conceitual das duas torres do Moradas da Serra e suas áreas de convivência" width="1672" height="941" loading="lazy"/>
          <MoradasFloorHover onSelect={()=>setActive(true)}/>
          <span className="moradas-feature__badge"><Box size={22} aria-hidden="true"/>Experiência 3D</span>
          <a className="moradas-feature__expand" href={spatialUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir Moradas da Serra no EME Spatial em nova aba"><Maximize size={20}/></a>
          <div className="moradas-feature__preview-action"><button className="moradas-feature__cta" ref={launch} type="button" onClick={()=>setActive(true)}><Box size={23} aria-hidden="true"/>Explorar em 3D</button><p>Gire, aproxime e descubra o projeto</p></div>
          <div className="moradas-feature__caption"><span>Prévia conceitual</span><span>EME Spatial</span></div>
        </>}
      </div>
    </div>
    <div className="moradas-feature__footer"><span>Arquitetura para conhecer de perto.</span><a href={spatialUrl} target="_blank" rel="noopener noreferrer">Ver detalhes do empreendimento <ArrowUpRight size={18} aria-hidden="true"/></a></div>
  </div>;
}
