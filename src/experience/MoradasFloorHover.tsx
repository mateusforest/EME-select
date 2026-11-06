import type {CSSProperties} from 'react';
import {facadeCalibration,floorOutline,floorColors} from './moradas-floor-geometry';
import {floorStatus} from './moradas-stock';
export default function MoradasFloorHover({onSelect}:{onSelect:(tower:'a'|'b',floor:number)=>void}){
 return <svg className="moradas-floor-hover" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" aria-label="Explorar andares do Moradas da Serra">{(['a','b'] as const).flatMap(id=>Array.from({length:facadeCalibration[id].levels},(_,i)=>{
  const floor=i+1;
  const status=id==='b'?'sold':floorStatus(floor)==='available'?'available':floorStatus(floor)==='negotiation'?'negotiation':'sold';
  const label=status==='available'?'Há unidades disponíveis':status==='negotiation'?'Reservado ou em negociação':'Sem unidades disponíveis';
  return <polygon key={id+floor} data-status={status} style={{'--floor-color':floorColors[status]} as CSSProperties} points={floorOutline(id,floor)} tabIndex={0} role="button" aria-label={`Explorar Torre ${id.toUpperCase()}, ${floor}º andar. ${label}`} onClick={()=>onSelect(id,floor)} onKeyDown={e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();onSelect(id,floor);}}}><title>Torre {id.toUpperCase()} · {floor}º andar · {label}</title></polygon>;
 }))}</svg>;
}
