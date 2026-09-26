import { useId } from 'react';
import type { Lighting } from './moradas';
import { g400FloorRegions, g400WindowPanes } from './g400Projection';
export default function G400Overlay({floor,lighting,onSelect}:{floor:number|null;lighting:Lighting;onSelect:(floor:number)=>void}){
  const id=useId().replaceAll(':','');
  const selected=g400FloorRegions.find(region=>region.floor===floor);
  return <svg className="development-scene-overlay g400-scene-overlay" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" aria-label="Exploração ilustrativa dos pavimentos do G400">
    <defs><linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stopColor="#b19064" stopOpacity=".25"/><stop offset=".6" stopColor="#f7d3a2" stopOpacity=".7"/><stop offset="1" stopColor="#d2a169" stopOpacity=".48"/></linearGradient></defs>
    <g className="g400-window-lights" data-testid="g400-window-lights" style={{opacity:lighting==='night'?1:lighting==='sunset'?.38:0}} aria-hidden="true">{g400WindowPanes.map((pane,index)=><polygon key={index} points={pane.points} fill={`url(#${id}-glass)`} opacity={pane.brightness}/>)}</g>
    {g400FloorRegions.map(region=><polygon key={region.floor} className="development-floor-hit" points={region.points} role="button" tabIndex={0} aria-label={`Explorar ${region.floor}º andar no cenário`} onClick={()=>onSelect(region.floor)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(region.floor);}}}/>)}
    {selected&&<g data-testid="g400-floor-band" data-floor={floor} className="g400-floor-selection" aria-hidden="true"><polygon points={selected.points}/><path d={selected.edge}/></g>}
  </svg>;
}
