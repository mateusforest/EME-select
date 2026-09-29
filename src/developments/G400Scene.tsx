import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Plus } from 'lucide-react';
import type { Lighting } from './moradas';
import { G400_ASSETS, type G400GalleryId } from './g400';
import { g400FloorCenter, g400Views, type G400View } from './g400Projection';
import G400Overlay from './G400Overlay';
const order:G400View[]=['left','front','right'];
const imageFile=(view:G400View)=>view==='left'?'hero.webp':`scene-${view}.svg`;
interface Props {complete?:boolean;view:G400View;floor:number|null;lighting:Lighting;zoom:number;onSelect:(floor:number)=>void;onGallery:(id:G400GalleryId,index?:number)=>void;onViewChange:(view:G400View)=>void;onRequestView:(view:G400View)=>void;onZoom:(direction:number)=>void}
export default function G400Scene({complete=false,view,floor,lighting,zoom,onSelect,onGallery,onViewChange,onRequestView,onZoom}:Props){
 const host=useRef<HTMLDivElement>(null),gesture=useRef<{x:number;y:number;dragged:boolean}|null>(null),suppressClick=useRef(false);
 const file=(id:G400View)=>complete?g400Views[id].file:imageFile(id);
 const zoomCallback=useRef(onZoom);zoomCallback.current=onZoom;
 useEffect(()=>{const node=host.current!;const wheel=(e:WheelEvent)=>{if(e.target instanceof Element&&e.target.closest('button'))return;e.preventDefault();zoomCallback.current(e.deltaY<0?1:-1);};node.addEventListener('wheel',wheel,{passive:false});return()=>node.removeEventListener('wheel',wheel);},[]);
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
         if(attempt&&image.complete&&!image.naturalWidth)image.src=G400_ASSETS+file(next)+`?retry=${attempt}`;
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
 },[view,attempt,complete]);
 return <div ref={host} className={`g400-scene${complete?" g400-scene--complete":""}`} data-testid="g400-scene" data-view={current} data-moving={moving} data-floor-focused={floor||''} data-zoom={zoom.toFixed(2)} aria-busy={moving}
 onPointerDown={e=>{if(e.button!==0||e.target instanceof Element&&e.target.closest('button'))return;gesture.current={x:e.clientX,y:e.clientY,dragged:false};suppressClick.current=false;}}
 onPointerMove={e=>{const g=gesture.current;if(!g)return;if(Math.hypot(e.clientX-g.x,e.clientY-g.y)>12){g.dragged=true;suppressClick.current=true;}}}
 onPointerUp={e=>{const g=gesture.current;gesture.current=null;if(!g||!g.dragged)return;const dx=e.clientX-g.x,dy=e.clientY-g.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2){const next=order[Math.max(0,Math.min(2,order.indexOf(current)+(dx<0?1:-1)))];onRequestView(next);}}}
 onPointerCancel={()=>{gesture.current=null;suppressClick.current=true;}}
 onClickCapture={e=>{if(suppressClick.current){e.preventDefault();e.stopPropagation();suppressClick.current=false;}}}>
 {order.map(id=>{const projection=g400Views[id],aspect=projection.sourceWidth/projection.sourceHeight,center=floor?g400FloorCenter(id,floor):null;
 const origin=center?(complete?`${(center.x/100*1672-projection.x)/projection.width*100}% ${(center.y/100*941-projection.y)/projection.height*100}%`:`${center.x}% ${center.y}%`):undefined;
 const anchors=complete&&id!=='left'?(id==='front'?[[50,27],[12,58],[80,85]]:[[65,29],[10,60],[82,85]]):null;
 const anchor=(index:number)=>anchors?{left:`clamp(68px, ${anchors[index][0]}%, calc(100% - 68px))`,top:`${anchors[index][1]}%`}:undefined;
 return <div key={id} ref={node=>{if(node)layers.current[id]=node;}} className="g400-view-layer" data-active={id===current} data-view={id} aria-hidden={id!==current} inert={id!==current||moving}>
 {complete&&<div className="g400-facade-backdrop" aria-hidden="true" style={{backgroundImage:`url("${G400_ASSETS+file(id)}")`}}/>}
 <div className="development-image-world" style={{...(complete?{width:`min(100vw, ${aspect*100}dvh)`,height:`min(100dvh, ${100/aspect}vw)`,inset:'auto',left:'50%',top:'50%',translate:'-50% -50%'}:{}),transform:`scale(${Math.min(2.1,zoom*(floor?1.12:1))})`,transformOrigin:origin}}>
 <img draggable={false} data-facade={id} src={G400_ASSETS+file(id)} alt={`G400 · ${g400Views[id].label} · perspectiva do empreendimento`} fetchPriority={id==='left'?'high':'low'}/>
 <G400Overlay native={complete} key={`${id}-${moving}`} view={id} floor={id===current?floor:null} lighting={lighting} onSelect={onSelect} interactive={id===current&&!moving}/>
 <div className="development-hotspots">
 <button style={anchor(0)} className="development-hotspot g400-hotspot-roof" onClick={()=>onGallery('leisure',4)}><span>Rooftop <ArrowUpRight size={12}/></span><i><Plus size={16}/></i></button>
 <button style={anchor(1)} className="development-hotspot g400-hotspot-interiors" onClick={()=>onGallery('interiors',2)}><span>Interiores <ArrowUpRight size={12}/></span><i><Plus size={16}/></i></button>
 <button style={anchor(2)} className="development-hotspot g400-hotspot-leisure" onClick={()=>onGallery('leisure',1)}><span>Lazer <ArrowUpRight size={12}/></span><i><Plus size={16}/></i></button>
 </div></div></div>;})}
 {failed&&<p className="g400-view-error" role="alert">Não foi possível carregar esta vista. <button onClick={()=>setAttempt(value=>value+1)}>Tentar novamente</button></p>}
 </div>;
}
