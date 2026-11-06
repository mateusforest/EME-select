// Snapshot 04/11/2026; mirrored from EME Spatial.
export type MoradasStatus='available'|'reserved'|'negotiation'|'unavailable'|'sold';
export const stockDate='04/11/2026';
export const statusLabels:Record<MoradasStatus,string>={available:'Disponível',reserved:'Reservada',negotiation:'Em negociação',unavailable:'Indisponível',sold:'Vendida'};
const prices:Record<number,number>={101:296507,201:299608,202:386451,203:293408,204:325456,302:388373,304:326580,604:331749,704:333815,804:335883};
const exceptions:Record<number,MoradasStatus>={104:'reserved',303:'negotiation',404:'negotiation',701:'negotiation',501:'unavailable',504:'unavailable'};
export const moradasUnits=Array.from({length:8},(_,i)=>Array.from({length:4},(_,j)=>{
 const number=(i+1)*100+j+1;return {number,floor:i+1,type:j+1,area:[53.97,70.82,52.56,56.21][j],bedrooms:j===1?3:2,price:prices[number],status:(prices[number]?'available':exceptions[number]||'sold') as MoradasStatus};
})).flat();
export function floorStatus(floor:number):MoradasStatus{const units=moradasUnits.filter(u=>u.floor===floor);return units.some(u=>u.status==='available')?'available':units.some(u=>['reserved','negotiation'].includes(u.status))?'negotiation':'sold';}
