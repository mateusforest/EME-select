import {useState} from 'react';
import {ArrowUpRight,MessageCircle,MapPin} from 'lucide-react';
import {Dialog} from './ui';
import {whatsappUrl} from './data';

import {selectTeam} from './team-profiles';
export {selectTeam} from './team-profiles';
type TeamPerson=typeof selectTeam[number];
export function teamContact(person:TeamPerson,message:string){return person.phone?'https://wa.me/'+person.phone+'?text='+encodeURIComponent(message):whatsappUrl(message);}
export function TeamProfile({person,onClose}:{person:TeamPerson;onClose:()=>void}){
 return <Dialog title="Conheça nossa equipe" onClose={onClose} wide className="select-profile-dialog"><div className="select-profile"><div className="select-profile-visual"><span className="select-overline">Pessoas que fazem a EME</span><img src={person.photo} alt={person.name}/><span>Proximidade em cada escolha.</span></div><div className="select-profile-story"><p className="select-overline">{person.role}</p><h3>{person.name}</h3>{person.registration&&<p className="select-registration">{person.registration}</p>}<p>{person.bio}</p><div className="select-specialties">{person.specialties.map(s=><span key={s}>{s}</span>)}</div><p className="select-profile-region"><MapPin size={16}/>{person.id==='fabricio'?'Vacaria e Porto Alegre · RS':'Vacaria · Rio Grande do Sul'}</p><a className="select-contact" href={teamContact(person,'Olá! Conheci seu perfil na EME Select e gostaria de conversar.')} target="_blank" rel="noopener noreferrer"><MessageCircle size={19}/>{person.phone?'Conversar pelo WhatsApp':'Conversar com a EME'}<ArrowUpRight size={18}/></a></div></div></Dialog>;
}
export default function TeamProfiles(){
 const [person,setPerson]=useState<TeamPerson|null>(null);
 return <><div className="select-team-heading"><p className="select-overline">Nossa equipe</p><h2>Visões que se completam.<br/>Pessoas que se aproximam.</h2><p>Tecnologia, experiência comercial e cuidado em cada etapa da sua escolha.</p></div><div className="select-team-grid">{selectTeam.map(p=><button className="select-team-card" key={p.id} onClick={()=>setPerson(p)} aria-haspopup="dialog" aria-label={'Conhecer '+p.name}><span className={'select-team-photo select-team-photo--'+p.id}><img src={p.photo} alt="" width="320" height="320" loading="lazy"/></span><span className="select-team-role">{p.role}</span><strong>{p.name}</strong><span className="select-team-summary">{p.specialties.join(' · ')}</span>{p.registration&&<small>{p.registration}</small>}<span className="select-team-open">Conheça o perfil <ArrowUpRight size={18}/></span></button>)}</div>{person&&<TeamProfile person={person} onClose={()=>setPerson(null)}/>}</>;
}
