import type { Lighting } from './moradas';

// All coordinates share the panoramic asset's exact 1672 × 941 projection.
// Bands are navigation markers on a conceptual scene, not surveyed floor boundaries.
const levels = [
  {floor:1,points:'555,561 731,517 1094,586 1094,613 731,555 555,595'},
  {floor:2,points:'555,524 731,476 1094,550 1094,585 731,516 555,560'},
  {floor:3,points:'555,486 731,433 1094,513 1094,549 731,475 555,523'},
  {floor:4,points:'555,448 731,390 1094,475 1094,512 731,432 555,485'},
  {floor:5,points:'555,410 731,347 1094,437 1094,474 731,389 555,447'},
  {floor:6,points:'555,370 731,304 1094,398 1094,436 731,346 555,409'},
  {floor:7,points:'555,341 731,192 1094,331 1094,397 731,303 555,369'},
];
export default function G400Overlay({floor,lighting,onSelect}:{floor:number|null;lighting:Lighting;onSelect:(floor:number)=>void}){
  return <svg className="development-scene-overlay g400-scene-overlay" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" aria-label="Exploração ilustrativa dos pavimentos do G400">
    <g className="g400-window-lights" style={{opacity:lighting==='night'?.65:lighting==='sunset'?.24:0}} aria-hidden="true">{Array.from({length:7},(_,i)=><g key={i}><path d={`M 748 ${535-i*42} l 64 14 v -24 l -64 -16 Z`} fill="#ffd394"/><path d={`M 678 ${539-i*39} l 43 -11 v -23 l -43 15 Z`} fill="#ffe5b2"/>{i%2===0&&<path d={`M 954 ${570-i*38} l 27 5 v -26 l -27 -6 Z`} fill="#ffce80"/>}</g>)}</g>
    {levels.map(level=><polygon key={level.floor} className="development-floor-hit" points={level.points} role="button" tabIndex={0} aria-label={`Explorar ${level.floor}º andar no cenário`} onClick={()=>onSelect(level.floor)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(level.floor);}}}/>)}
    {floor&&<polygon data-testid="g400-floor-band" data-floor={floor} className="development-floor-band" points={levels.find(level=>level.floor===floor)?.points}/>}
  </svg>;
}
