import {useEffect,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {whatsappUrl} from './data';
import './people.css';
export interface PublicPerson {id:string;name:string;role:string;bio:string;photoUrl:string;registration:string}
export default function PeopleSection(){
 const [people,setPeople]=useState<PublicPerson[]>([]);
 useEffect(()=>{const controller=new AbortController();fetch('/api/public/people',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(r=>setPeople(r.people||[])).catch(()=>{});return()=>controller.abort();},[]);
 return <section className="eme-people" id="quem-faz-a-eme" aria-labelledby="eme-people-title"><div className="eme-people-inner"><div className="eme-people-intro"><div><span className="eyebrow">Pessoas por trás de cada escolha</span><h2 id="eme-people-title">Quem faz a EME.</h2></div><p>Conhecer o seu momento. Entender o que importa. Acompanhar cada escolha com atenção e proximidade.</p></div>{people.length>0&&<div className={'eme-people-grid'+(people.length===1?' is-single':'')}>{people.map(person=><article key={person.id} className="eme-person"><div className="eme-person-photo"><img src={person.photoUrl} alt={person.name} loading="lazy" width="800" height="1000"/></div><div className="eme-person-content"><header className="eme-person-heading"><h3>{person.name}</h3><p className="eme-person-role">{person.role}</p></header>{person.bio&&<p className="eme-person-bio">{person.bio}</p>}{person.registration&&<small className="eme-person-registration">{person.registration}</small>}</div></article>)}</div>}<a className="text-link" href={whatsappUrl('Olá! Gostaria de conversar com a EME Select.')} target="_blank" rel="noopener noreferrer">Converse com a EME <ArrowUpRight size={17}/></a></div></section>;
}
