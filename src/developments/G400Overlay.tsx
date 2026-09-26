import { useId, useState } from 'react';
import type { Lighting } from './moradas';
import { g400Regions,g400Panes,g400Views,type G400View } from './g400Projection';
export default function G400Overlay({floor,lighting,onSelect,view='left',interactive=true}:{floor:number|null;lighting:Lighting;onSelect:(floor:number)=>void;view?:G400View;interactive?:boolean}){
 const id=useId().replaceAll(':',''),[hover,setHover]=useState<number|null>(null),projection=g400Views[view];
 const regions=g400Regions(view),active=hover??floor;
 return <svg className="development-scene-overlay g400-scene-overlay" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" role="group" aria-label={`Selecionar andar · ${projection.label}`}>
 <defs>
 <linearGradient id={`${id}-pane`} x2="0" y2="1"><stop stopColor="#d7a464" stopOpacity=".5"/><stop offset=".38" stopColor="#ffe9b5"/><stop offset="1" stopColor="#d49c53" stopOpacity=".65"/></linearGradient>
 </defs>
 <g transform={`translate(${projection.x} ${projection.y}) scale(${projection.width/projection.sourceWidth} ${projection.height/projection.sourceHeight})`}>
 <g className="development-scene-lights g400-window-lights" data-testid="g400-window-lights" data-lighting={lighting} aria-hidden="true">
 {g400Panes(view).filter(p=>p.lit).map((p,i)=><polygon key={i} points={p.points} fill={`url(#${id}-pane)`} opacity={p.brightness}/>)}
 </g>
 {active&&<path className="development-floor-band" data-testid="g400-floor-band" data-floor={active} d={regions[active-1].path} aria-hidden="true"/>}
 {interactive&&regions.map(region=><path key={region.floor} className="development-floor-hit" data-floor={region.floor} d={region.path} role="button" tabIndex={0} aria-label={`Explorar ${region.floor}º andar no cenário`} aria-pressed={floor===region.floor} onMouseEnter={()=>setHover(region.floor)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(region.floor)} onBlur={()=>setHover(null)} onClick={()=>onSelect(region.floor)} onKeyDown={e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();onSelect(region.floor);}}}><title>{region.floor}º andar</title></path>)}
 </g></svg>;
}
