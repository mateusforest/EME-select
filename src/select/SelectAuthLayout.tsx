import type {ReactNode,KeyboardEvent} from 'react';
import {ArrowLeft,CalendarDays,House,UserRound} from 'lucide-react';
import './select-auth.css';

export const selectGoldMark='/assets/access/select-gold-m.png';
function ReservedIcon(){return <svg width="31" height="42" viewBox="0 0 31 42" fill="none" aria-hidden="true"><path d="M2 40V16a13.5 13.5 0 0 1 27 0v24H2Z"/><path d="M16 3v37M22 5v35M2 40h27"/><path d="M12 23h1"/></svg>;}

export default function SelectAuthLayout({mode,busy=false,onModeChange,children}:{mode:'login'|'signup'|'pending';busy?:boolean;onModeChange?:(signup:boolean)=>void;children:ReactNode}){
 function tabKeys(event:KeyboardEvent<HTMLButtonElement>){
  if(event.ctrlKey||event.metaKey||event.altKey||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||busy)return;
  event.preventDefault();const next=event.key==='End'?true:event.key==='Home'?false:mode==='login';onModeChange?.(next);
  event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(next?'#select-signup-tab':'#select-login-tab')?.focus();
 }
 return <div className={'sa-page sa-page--'+mode}>
  <a className="sa-logo" href="/" aria-label="EME Select · voltar ao site"><img src={selectGoldMark} alt="" width="40" height="32"/></a>
  <a className="sa-back" href="/"><ArrowLeft size={17} strokeWidth={1.5}/><span>Voltar ao site</span></a>
  <aside className="sa-story" aria-label="Conheça o Acesso Select">
   <img className="sa-scene" src="/assets/access/select-gateway.png" alt="" width="1254" height="1254" fetchPriority="high" decoding="async"/>
   <div className="sa-story-copy"><p className="sa-eyebrow"><img src={selectGoldMark} alt="" width="18" height="15"/>ACESSO SELECT</p><h2>Veja além<br/>do catálogo.</h2><p className="sa-story-description">Uma seleção reservada. Novos lugares.<br className="sa-desktop-break"/> Possibilidades que chegam até você.</p></div>
   <div className="sa-scene-note sa-scene-note--reserved" aria-hidden="true"><ReservedIcon/><div><strong>Seleção reservada</strong><span>Imóveis além do catálogo</span></div></div>
   <div className="sa-scene-note sa-scene-note--first" aria-hidden="true"><i/><div><strong>Em primeira mão</strong><span>Lançamentos para descobrir</span></div></div>
   <ul className="sa-benefits"><li><House/><span>Imóveis exclusivos</span></li><li><CalendarDays/><span>Acesso antecipado</span></li><li><UserRound/><span>Seleção para você</span></li></ul>
  </aside>
  <main className="sa-form-column"><section className="sa-card" aria-label={mode==='pending'?'Sua solicitação':'Seu Acesso Select'}>
   {mode!=='pending'&&<div className="sa-tabs" role="tablist" aria-label="Entrar ou criar conta"><button id="select-login-tab" type="button" role="tab" aria-selected={mode==='login'} aria-controls="select-auth-panel" tabIndex={mode==='login'?0:-1} disabled={busy} onKeyDown={tabKeys} onClick={()=>onModeChange?.(false)}>Entrar</button><button id="select-signup-tab" type="button" role="tab" aria-selected={mode==='signup'} aria-controls="select-auth-panel" tabIndex={mode==='signup'?0:-1} disabled={busy} onKeyDown={tabKeys} onClick={()=>onModeChange?.(true)}>Criar conta</button></div>}
   <div id="select-auth-panel" role={mode==='pending'?undefined:'tabpanel'} aria-labelledby={mode==='pending'?undefined:mode==='signup'?'select-signup-tab':'select-login-tab'}>{children}</div>
   <footer className="sa-card-footer">Clientes, proprietários e equipe.<br/>Um acesso, seu espaço.</footer>
  </section></main>
 </div>;
}
