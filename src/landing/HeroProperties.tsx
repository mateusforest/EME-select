import {useEffect,useState} from 'react';
import {ArrowRight,ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import type {Property} from '../data';
export default function HeroProperties({items}:{items:Property[]}){
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[focused,setFocused]=useState(false),[moving,setMoving]=useState(false);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{
  if(items.length<2||paused||focused||reduced)return;
  let swap:ReturnType<typeof setTimeout>|undefined;
  const timer=setInterval(()=>{if(document.hidden)return;setMoving(true);swap=setTimeout(()=>{setIndex(i=>(i+1)%items.length);setMoving(false);},1000);},6500);
  return()=>{clearInterval(timer);if(swap)clearTimeout(swap);};
 },[items.length,paused,focused,reduced]);
 if(!items.length)return null;
 const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
 const move=(step:number)=>{setMoving(false);setPaused(true);setIndex(i=>(i+step+items.length)%items.length);};
 return <div className="pfh-carousel pfh-depth-carousel" role="region" aria-label="Imóveis em destaque" aria-roledescription="carrossel" onFocusCapture={()=>{setMoving(false);setFocused(true);}} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setFocused(false);}}>
  <div className={'pfh-card-stack'+(moving?' is-advancing':'')}>
  {Array.from({length:Math.min(3,items.length)},(_,depth)=>{
   const p=items[(index+depth)%items.length],old=(p as Property & {originalPrice?:number}).originalPrice;
   return <a key={p.id} className={'pfh-hero-property pfh-depth-card pfh-depth-'+depth} aria-hidden={depth!==0||undefined} tabIndex={depth===0?0:-1} href={'#/imovel/'+p.id}><img src={p.image} alt={depth===0?p.title:''} fetchPriority={depth===0?'high':'auto'}/><span className="pfh-hero-tag">EM DESTAQUE</span><div><p>{p.location}</p><h2>{p.title}</h2><span>{[p.area?`${p.area.toLocaleString('pt-BR')} m²`:null,p.bedrooms?`${p.bedrooms} dormitórios`:null,p.parking?`${p.parking} ${p.parking===1?'vaga':'vagas'}`:null].filter(Boolean).join(' · ')}</span><div className="pfh-carousel-price">{old&&old>p.price?<del className="pfh-old-price">{money(old)}</del>:null}<strong>{p.price>0?money(p.price)+(p.operation==='alugar'?' / mês':''):'Consulte o valor'}<ArrowRight size={22}/></strong></div></div></a>;
  })}
  </div>
  {items.length>1&&<div className="pfh-carousel-controls"><span>{String(index+1).padStart(2,'0')} / {String(items.length).padStart(2,'0')}</span><button type="button" onClick={()=>move(-1)} aria-label="Imóvel anterior"><ChevronLeft size={17}/></button><button type="button" onClick={()=>{setMoving(false);setPaused(!paused);}} aria-label={paused?'Retomar alternância':'Pausar alternância'} disabled={reduced}>{paused?<Play size={15}/>:<Pause size={15}/>}</button><button type="button" onClick={()=>move(1)} aria-label="Próximo imóvel"><ChevronRight size={17}/></button></div>}
 </div>;
}
