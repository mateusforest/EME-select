import { useId, useState } from 'react';
import type { Lighting } from './moradas';
import { g400Regions,g400Panes,g400Views,type G400View } from './g400Projection';
export default function G400Overlay({floor,lighting,onSelect,view='left',interactive=true}:{floor:number|null;lighting:Lighting;onSelect:(floor:number)=>void;view?:G400View;interactive?:boolean}){
 const id=useId().replaceAll(':',''),[hover,setHover]=useState<number|null>(null),projection=g400Views[view];
 const regions=g400Regions(view),active=hover??floor;
 return <svg className="development-scene-overlay g400-scene-overlay" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" role="group" aria-label={`Selecionar andar · ${projection.label}`}>
 <defs>
 <radialGradient id={`${id}-glow`}><stop stopColor="#ffe3a7" stopOpacity=".7"/><stop offset=".35" stopColor="#ffc875" stopOpacity=".24"/><stop offset="1" stopColor="#ffbd64" stopOpacity="0"/></radialGradient>
 <linearGradient id={`${id}-pane`} x2="0" y2="1"><stop stopColor="#fff2c8"/><stop offset="1" stopColor="#e9a957"/></linearGradient>
 </defs>
 <g transform={`translate(${projection.x} ${projection.y}) scale(${projection.width/projection.sourceWidth} ${projection.height/projection.sourceHeight})`}>
 <g className="development-scene-lights g400-window-lights" data-testid="g400-window-lights" data-lighting={lighting} aria-hidden="true">
 {g400Panes(view).filter(p=>p.lit).map((p,i)=><g key={i} opacity={p.brightness}><ellipse cx={p.x} cy={p.y} rx={p.w*1.6} ry={p.h*1.5} fill={`url(#${id}-glow)`}/><polygon points={p.points} fill={`url(#${id}-pane)`}/><path d={`M ${p.x},${p.y-p.h/2} v ${p.h}`} stroke="#8e795d" strokeWidth="1" opacity=".65"/></g>)}
 </g>
 {active&&<polygon className="development-floor-band" data-testid="g400-floor-band" data-floor={active} points={regions[active-1].points} aria-hidden="true"/>}
 {interactive&&regions.map(region=><polygon key={region.floor} className="development-floor-hit" data-floor={region.floor} points={region.points} role="button" tabIndex={0} aria-label={`Explorar ${region.floor}º andar no cenário`} aria-pressed={floor===region.floor} onMouseEnter={()=>setHover(region.floor)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(region.floor)} onBlur={()=>setHover(null)} onClick={()=>onSelect(region.floor)} onKeyDown={e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();onSelect(region.floor);}}}><title>{region.floor}º andar</title></polygon>)}
 </g></svg>;
}
