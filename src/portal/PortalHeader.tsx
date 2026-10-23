import {useEffect,useState,type MouseEvent} from 'react';
import {Calculator,ChevronRight,Menu,RefreshCw} from 'lucide-react';
import type {TeamUser} from './api';
import PortalMarket from './PortalMarket';

type Props={user:TeamUser;pageLabel:string;mobile:boolean;loading:boolean;onMenu:()=>void;onRefresh:()=>void;onCalculator:()=>void;onAccount:()=>void;onHome:(event:MouseEvent<HTMLAnchorElement>)=>void};
export default function PortalHeader({user,pageLabel,mobile,loading,onMenu,onRefresh,onCalculator,onAccount,onHome}:Props){
  const [now,setNow]=useState(()=>new Date());
  useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer);},[]);
  return <header className="ps-topbar sh-header">
    <a className="sh-brand" href="/portalselect" onClick={onHome} aria-label="EME Select · início"><span className="sh-brand-mark"><img src="/assets/experience/brand-monogram-transparent.webp" alt=""/></span><span><strong>EME SELECT</strong><small>{user.role==='admin'?'ADMINISTRAÇÃO':'PORTAL DO CORRETOR'}</small></span></a>
    <div className="sh-context"><div className="ps-breadcrumb"><button className="ps-icon ps-mobile-toggle" aria-label="Abrir navegação" aria-expanded={mobile} onClick={onMenu}><Menu size={20}/></button><span>Meu portal</span><ChevronRight size={12}/><strong>{pageLabel}</strong></div><time dateTime={now.toISOString()}>{now.toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Sao_Paulo'})}</time></div>
    <div className="ps-topbar-actions"><PortalMarket/><span className="sh-clock"><small>Vacaria · RS</small><strong>{now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'})}</strong></span><button className="sh-calculator" aria-label="Abrir simulador de financiamento" title="Financiamento rápido" onClick={onCalculator}><Calculator size={18}/><span>Simular</span></button><button className="ps-icon sh-refresh" aria-label="Atualizar dados" title="Atualizar dados" disabled={loading} onClick={onRefresh}><RefreshCw size={17}/></button><button className="sh-profile" aria-label={'Minha conta · '+user.name} title={user.name+' · Minha conta'} onClick={onAccount}>{user.name.split(' ').slice(0,2).map(n=>n[0]).join('')}</button></div>
  </header>;
}
