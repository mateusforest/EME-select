import {type MouseEvent} from 'react';
import {Calculator,ChevronRight,Menu,RefreshCw} from 'lucide-react';
import type {TeamUser} from './api';

type Props={user:TeamUser;pageLabel:string;mobile:boolean;loading:boolean;onMenu:()=>void;onRefresh:()=>void;onCalculator:()=>void;onAccount:()=>void;onHome:(event:MouseEvent<HTMLAnchorElement>)=>void};
export default function PortalHeader({user,pageLabel,mobile,loading,onMenu,onRefresh,onCalculator,onAccount,onHome}:Props){
  return <header className="ps-topbar sh-header">
    <a className="sh-brand" href="/acesso-select/equipe" onClick={onHome} aria-label="EME Select · início"><span className="sh-brand-mark"><img src="/assets/experience/brand-monogram-transparent.webp" alt=""/></span><span><strong>EME SELECT</strong><small>{user.role==='admin'?'ADMINISTRAÇÃO':'PORTAL DO CORRETOR'}</small></span></a>
    <div className="sh-context"><div className="ps-breadcrumb"><button className="ps-icon ps-mobile-toggle" aria-label="Abrir navegação" aria-expanded={mobile} onClick={onMenu}><Menu size={20}/></button><span>Meu portal</span><ChevronRight size={12}/><strong>{pageLabel}</strong></div></div>
    <div className="ps-topbar-actions"><button className="sh-calculator" aria-label="Abrir simulador de financiamento" title="Financiamento rápido" onClick={onCalculator}><Calculator size={18}/><span>Simular</span></button><button className="ps-icon sh-refresh" aria-label="Atualizar dados" title="Atualizar dados" disabled={loading} onClick={onRefresh}><RefreshCw size={17}/></button><button className="sh-profile" aria-label={'Minha conta · '+user.name} title={user.name+' · Minha conta'} onClick={onAccount}>{user.name.split(' ').slice(0,2).map(n=>n[0]).join('')}</button></div>
  </header>;
}
