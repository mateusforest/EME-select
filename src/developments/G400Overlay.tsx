import { useId, useState } from 'react';
import { G400_ASSETS } from './g400';
import type { Lighting } from './moradas';
import { g400Regions,g400Panes,g400Views,type G400View } from './g400Projection';
export default function G400Overlay({floor,lighting,onSelect,view='left',interactive=true,native=false}:{floor:number|null;lighting:Lighting;onSelect:(floor:number)=>void;view?:G400View;interactive?:boolean;native?:boolean}){
 const id=useId().replaceAll(':',''),[hover,setHover]=useState<number|null>(null),projection=g400Views[view];
 const regions=g400Regions(view),active=hover??floor;
 return <svg className="development-scene-overlay g400-scene-overlay" viewBox={native?`0 0 ${projection.sourceWidth} ${projection.sourceHeight}`:'0 0 1672 941'} preserveAspectRatio="xMidYMid slice" role="group" aria-label={`Selecionar andar · ${projection.label}`}>
 <defs>
 <linearGradient id={`${id}-pane`} x2="0" y2="1"><stop stopColor="#d7a464" stopOpacity=".5"/><stop offset=".38" stopColor="#ffe9b5"/><stop offset="1" stopColor="#d49c53" stopOpacity=".65"/></linearGradient>
 {floor&&<clipPath id={`${id}-floor`}><path d={regions[floor-1].path}/></clipPath>}
 </defs>
 <g transform={native?undefined:`translate(${projection.x} ${projection.y}) scale(${projection.width/projection.sourceWidth} ${projection.height/projection.sourceHeight})`}>
 {floor&&<g key={floor} className="g400-floor-reveal" aria-hidden="true">
   <path className="g400-floor-isolation" fillRule="evenodd" d={`M-2000,-2000H4000V4000H-2000Z ${regions[floor-1].path}`}/>
   <image href={G400_ASSETS+projection.file} width={projection.sourceWidth} height={projection.sourceHeight} clipPath={`url(#${id}-floor)`} className="g400-floor-texture"/>
 </g>}
 <g className="development-scene-lights g400-window-lights" data-testid="g400-window-lights" data-lighting={lighting} aria-hidden="true">
 {g400Panes(view).filter(p=>p.lit).map((p,i)=><polygon key={i} points={p.points} fill={`url(#${id}-pane)`} opacity={p.brightness}/>)}
 </g>
 {active&&<path className="development-floor-band" data-testid="g400-floor-band" data-floor={active} d={regions[active-1].path} aria-hidden="true"/>}
 {interactive&&regions.map(region=><path key={region.floor} className="development-floor-hit" data-floor={region.floor} d={region.path} role="button" tabIndex={0} aria-label={`Explorar ${region.floor}º andar no cenário`} aria-pressed={floor===region.floor} onMouseEnter={()=>setHover(region.floor)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(region.floor)} onBlur={()=>setHover(null)} onClick={()=>onSelect(region.floor)} onKeyDown={e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();onSelect(region.floor);}}}><title>{region.floor}º andar</title></path>)}
 </g></svg>;
}
