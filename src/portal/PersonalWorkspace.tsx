import {useEffect,useState} from 'react';
import {api,type TeamUser,type LiveEvaluation} from './api';
import type {Listing} from './listingModel';
import {BrokerToday,BrokerCommissions} from './BrokerWorkspace';
import LeadsWorkspace from './LeadsWorkspace';
export default function PersonalWorkspace({user,onNavigate,onCapture}:{user:TeamUser;onNavigate:(page:string)=>void;onCapture:()=>void}){
 const [tab,setTab]=useState('Meu dia'),[items,setItems]=useState<LiveEvaluation[]>([]),[listings,setListings]=useState<Listing[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{Promise.all([api<{evaluations:LiveEvaluation[]}>('/evaluations'),api<{listings:Listing[]}>('/listings')]).then(([e,l])=>{const own=e.evaluations.filter(p=>p.assignee_id===user.id);setItems(own);setListings(l.listings.filter(p=>own.some(i=>i.id===p.id)));}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[user.id]);
 function go(page:string){if(page==='leads')setTab('Meus leads');else if(page==='comissoes')setTab('Minhas comissões');else onNavigate(page);}
 return <div className="personal-workspace"><section className="ps-card"><p>Uma conta, duas responsabilidades. Aqui você acompanha seus atendimentos e participações. A administração da empresa continua disponível no mesmo menu.</p><nav className="broker-tabs" aria-label="Minha atuação">{['Meu dia','Meus leads','Minhas comissões'].map(t=><button key={t} className={'ps-button'+(tab===t?' ps-button--primary':'')} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}<button className="ps-text-button" onClick={()=>onNavigate('hoje')}>Visão da empresa</button></nav></section>{tab==='Meus leads'?<LeadsWorkspace user={user} personalOnly/>:tab==='Minhas comissões'?<BrokerCommissions user={user} personalOnly/>:loading?<p role="status">Carregando sua atuação…</p>:error?<p role="alert">{error}</p>:<BrokerToday personalId={user.id} items={items} listings={listings} onNavigate={go} onCapture={onCapture}/>}</div>;
}
