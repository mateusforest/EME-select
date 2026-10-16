import {MessageCircle,ArrowUpRight,MapPin} from 'lucide-react';
import {Dialog} from './ui';
import {selectTeam,teamContact} from './TeamProfiles';
import type {Property} from './data';
export const publishedAddress:Record<string,string>={'87809ebd-12ed-4c69-967b-483ebe0209a8':'Rua Gonçalves Viana, 660 · Jardim América · Vacaria, RS'};
export default function PropertyContact({property,onClose}:{property:Property;onClose:()=>void}){
 const person=selectTeam[1];
 return <Dialog title="Vamos conversar sobre este imóvel" onClose={onClose} className="select-contact-dialog"><div className="select-property-contact"><img src={person.photo} alt={person.name} width="120" height="120"/><p className="select-overline">Seu contato na EME Select</p><h3>{person.name}</h3><p>{person.role}</p><div className="select-contact-property"><strong>{property.title}</strong><span><MapPin size={14}/>{property.location}</span></div><p>Tire suas dúvidas, conheça os detalhes e converse sobre os próximos passos.</p><a className="select-contact" href={teamContact(person,`Olá, Douglas! Tenho interesse no imóvel ${property.title}. https://www.emeselect.com/#/imovel/${encodeURIComponent(property.id)}`)} target="_blank" rel="noopener noreferrer"><MessageCircle size={20}/>Conversar no WhatsApp<ArrowUpRight size={18}/></a><span className="select-phone">(54) 98400-7919</span></div></Dialog>;
}
export function PropertyLocation({property}:{property:Property}){
 const address=publishedAddress[property.id];const query=address||property.location;const url='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query);
 return <div className="select-location-panel"><MapPin size={30}/><p className="select-overline">{address?'Endereço do imóvel':'Bairro e região'}</p><h3>{query}</h3>{address?<iframe title="Mapa da localização do imóvel" src={'https://maps.google.com/maps?q='+encodeURIComponent(address)+'&output=embed'} loading="lazy" referrerPolicy="no-referrer-when-downgrade"/>:<p>Converse com a equipe para conhecer o endereço e combinar sua visita.</p>}<a className="select-contact" href={url} target="_blank" rel="noopener noreferrer">{address?'Abrir rota no mapa':'Explorar a região'}<ArrowUpRight size={18}/></a></div>;
}
