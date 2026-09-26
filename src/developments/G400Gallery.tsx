import { useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Maximize, Minus } from 'lucide-react';
import { Dialog } from '../ui';
import { whatsappUrl } from '../data';
import DecodedImage from './DecodedImage';
import { G400_ASSETS, g400Galleries, type G400GalleryId } from './g400';

export default function G400Gallery({ id, initialIndex, unit, onClose }: { id:G400GalleryId; initialIndex:number; unit?:string; onClose:()=>void }) {
  const media=g400Galleries[id];
  const [index,setIndex]=useState(initialIndex);
  const [enlarged,setEnlarged]=useState(false);
  const item=media.images[index];
  const isPlan=id==='plans'||id==='infrastructure';
  function move(direction:number){setIndex(value=>(value+direction+media.images.length)%media.images.length);setEnlarged(false);}
  const contact=whatsappUrl(`Olá! Gostaria de conhecer o G400 — Geraldo Andreola, da Yclodema. Tenho interesse em ${item.caption}${unit&&index===initialIndex?`, unidade ${unit}`:''}. Podemos confirmar as informações e a disponibilidade?`);
  return <Dialog title={media.title} onClose={onClose} wide className="g400-dialog"><div className="development-gallery" onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();move(1);}if(event.key==='ArrowLeft'){event.preventDefault();move(-1);}}}>
    <div className={`development-gallery-image${isPlan?' is-plan':''}${enlarged?' g400-plan-enlarged':''}`}>
      <DecodedImage src={G400_ASSETS+item.file} alt={item.caption}/>
      {!enlarged&&media.images.length>1&&<><button className="gallery-prev" aria-label="Imagem anterior" onClick={()=>move(-1)}><ChevronLeft size={22}/></button><button className="gallery-next" aria-label="Próxima imagem" onClick={()=>move(1)}><ChevronRight size={22}/></button></>}
    </div>
    <div className="development-gallery-caption" aria-live="polite"><strong>{item.caption}</strong><span>{String(index+1).padStart(2,'0')} / {String(media.images.length).padStart(2,'0')}</span></div>
    {isPlan&&<button className="text-link g400-enlarge-plan" aria-pressed={enlarged} onClick={()=>setEnlarged(value=>!value)}>{enlarged?<Minus size={15}/>:<Maximize size={15}/>} {enlarged?'Ajustar planta à janela':'Ampliar para ler os detalhes'}</button>}
    <div className="development-thumbnails" aria-label="Escolher imagem">{media.images.map((image,i)=><button key={image.file} aria-label={image.caption} aria-pressed={i===index} onClick={()=>{setIndex(i);setEnlarged(false);}}><img src={G400_ASSETS+image.file} alt="" loading="lazy"/></button>)}</div>
    <p className="small-copy">{media.note}</p><a className="primary-button" href={contact} target="_blank" rel="noreferrer">Conversar sobre o G400 <ArrowUpRight size={16}/></a>
  </div></Dialog>;
}
