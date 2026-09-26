import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import type { Lighting } from './moradas';
import { G400_ASSETS, type G400GalleryId } from './g400';
import { g400Views, type G400View } from './g400Projection';
import G400Overlay from './G400Overlay';
const order:G400View[]=['left','front','right'];
const imageFile=(view:G400View)=>view==='left'?'hero.webp':`scene-${view}.svg`;
interface Props {view:G400View;floor:number|null;lighting:Lighting;zoom:number;onSelect:(floor:number)=>void;onGallery:(id:G400GalleryId,index?:number)=>void;onViewChange:(view:G400View)=>void}
export default function G400Scene({view,floor,lighting,zoom,onSelect,onGallery,onViewChange}:Props){
 const [current,setCurrent]=useState<G400View>('left'),[moving,setMoving]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const currentRef=useRef<G400View>('left'),layers=useRef<Partial<Record<G400View,HTMLDivElement>>>({});
 const callback=useRef(onViewChange);callback.current=onViewChange;
 useEffect(()=>{
   let cancelled=false;const animations:Animation[]=[];let timer:ReturnType<typeof setTimeout>|undefined;
   async function change(){
     const start=currentRef.current;if(view===start){setMoving(false);setFailed(false);return;}
     setFailed(false);setMoving(true);
     const from=order.indexOf(start),to=order.indexOf(view),direction=Math.sign(to-from);
     const steps=order.slice(Math.min(from,to),Math.max(from,to)+1);if(direction<0)steps.reverse();steps.shift();
     try{
       // Decode every intermediate view before moving, so the facade never goes blank.
       await Promise.all(steps.map(next=>{
         const image=layers.current[next]!.querySelector('img')!;
         if(attempt&&image.complete&&!image.naturalWidth)image.src=G400_ASSETS+imageFile(next)+`?retry=${attempt}`;
         return image.decode();
       }));if(cancelled)return;
       const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
       for(const next of reduce?[view]:steps){
         if(cancelled)return;
         const previous=currentRef.current,out=layers.current[previous]!,incoming=layers.current[next]!;
         if(!reduce){
           const options={duration:1100,easing:'cubic-bezier(.45,0,.2,1)',fill:'forwards' as const};
           const a=out.animate([{opacity:1,transform:'translateX(0) scale(1) rotateY(0deg)'},{opacity:0,transform:`translateX(${-direction*45}px) scale(.98) rotateY(${-direction*5}deg)`}],options);
           const b=incoming.animate([{opacity:0,transform:`translateX(${direction*45}px) scale(1.025) rotateY(${direction*5}deg)`},{opacity:1,transform:'translateX(0) scale(1) rotateY(0deg)'}],options);
           animations.push(a,b);await Promise.all([a.finished,b.finished]);if(cancelled)return;
         }
         currentRef.current=next;setCurrent(next);callback.current(next);
         await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));if(cancelled)return;
         animations.splice(0).forEach(animation=>animation.cancel());
         if(next!==view)await new Promise<void>(resolve=>{timer=setTimeout(resolve,220);});
       }
     }catch{if(!cancelled)setFailed(true);}finally{if(!cancelled)setMoving(false);}
   }
   void change();return()=>{cancelled=true;if(timer)clearTimeout(timer);animations.forEach(animation=>animation.cancel());};
 },[view,attempt]);
 return <div className="g400-scene" data-testid="g400-scene" data-view={current} data-moving={moving} aria-busy={moving}>
 {order.map(id=><div key={id} ref={node=>{if(node)layers.current[id]=node;}} className="g400-view-layer" data-active={id===current} data-view={id} aria-hidden={id!==current} inert={id!==current||moving}>
 <div className="development-image-world" style={{transform:`scale(${zoom})`}}>
 <img src={G400_ASSETS+imageFile(id)} alt={`G400 · ${g400Views[id].label} · perspectiva do empreendimento`} fetchPriority={id==='left'?'high':'low'}/>
 <G400Overlay key={`${id}-${moving}`} view={id} floor={id===current?floor:null} lighting={lighting} onSelect={onSelect} interactive={id===current&&!moving}/>
 <div className="development-hotspots">
 <button className="development-hotspot g400-hotspot-roof" onClick={()=>onGallery('leisure',4)}><span>Rooftop <ArrowUpRight size={12}/></span><i><Plus size={16}/></i></button>
 <button className="development-hotspot g400-hotspot-interiors" onClick={()=>onGallery('interiors',2)}><span>Interiores <ArrowUpRight size={12}/></span><i><Plus size={16}/></i></button>
 <button className="development-hotspot g400-hotspot-leisure" onClick={()=>onGallery('leisure',1)}><span>Lazer <ArrowUpRight size={12}/></span><i><Plus size={16}/></i></button>
 </div></div></div>)}
 {failed&&<p className="g400-view-error" role="alert">Não foi possível carregar esta vista. <button onClick={()=>setAttempt(value=>value+1)}>Tentar novamente</button></p>}
 </div>;
}
