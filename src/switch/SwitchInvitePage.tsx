import {useEffect,useState,type FormEvent} from 'react';
import {CheckCircle2,ShieldCheck} from 'lucide-react';
import './switch.css';
import './switch-refinement.css';
import SwitchHeader from './SwitchHeader';
type Offer={
 reference:string;city:string;propertyType:string;opportunity:string;estimatedSaleCents:number;
 brokerageBps:number;switchShareBps:number;
 quoted:{grossCommissionCents:number;switchShareCents:number;partnerShareCents:number};
 disclaimer:string;validUntil:string;state:string;
};
const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
export default function SwitchInvitePage(){
 const token=location.pathname.split('/').pop()||'';
 const [offer,setOffer]=useState<Offer|null>(null),[name,setName]=useState(''),[phone,setPhone]=useState('');
 const [creci,setCreci]=useState(''),[business,setBusiness]=useState('');
 const [ack,setAck]=useState(false),[privacy,setPrivacy]=useState(false),[marketing,setMarketing]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false);
 useEffect(()=>{let live=true;fetch('/api/public/switch/offers/'+encodeURIComponent(token),{cache:'no-store'})
   .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Convite indisponível.');return data.offer as Offer;})
   .then(d=>{if(live)setOffer(d);}).catch(e=>{if(live)setError(e.message);});
   return()=>{live=false;};},[token]);
 const submit=async(event:FormEvent)=>{
   event.preventDefault();if(!offer||busy)return;setBusy(true);setError('');
   try{
    const response=await fetch('/api/public/switch/offers/'+encodeURIComponent(token)+'/interest',{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,phone,creci,business,acknowledge:ack,privacyAccepted:privacy,marketingOptIn:marketing})
    });
    const result=await response.json().catch(()=>({error:'Falha ao registrar.'}));
    if(!response.ok)throw Error(result.error||'Não foi possível registrar interesse.');
    setSuccess(true);
    history.replaceState(null,'','/switch/convite/registrado');
   }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 };
 return <main className="sw-page">
  <SwitchHeader/>
  <div className="sw-shell sw-invite-shell">
   <section className="sw-intro"><span className="sw-eyebrow">M SWITCH / OPORTUNIDADE COMERCIAL</span>
     <h1>Uma oportunidade. Condições claras.</h1>
     <p>Conheça o contexto e a simulação de remuneração antes de manifestar interesse. A identidade das partes permanece protegida até a conferência profissional e o acordo formal.</p>
     <p className="sw-fine">Atenção: não é uma oferta vinculante nem contrato eletrônico de corretagem. Os percentuais precisam ser confirmados em instrumento escrito entre profissionais e empresas habilitados.</p>
   </section>
   <section className="sw-card" aria-label="Condições de oportunidade">
     {success?<div className="sw-success" role="status"><CheckCircle2 size={42}/><h2>Interesse registrado.</h2><p>A equipe M Select poderá revisar sua inscrição profissional e encaminhar condições para formalização. Nenhum contato de comprador ou proprietário é liberado automaticamente.</p><a className="sw-submit" href="/switch">Voltar à M Switch</a></div>:
      !offer?<p role="status">{error||'Conferindo convite…'}</p>:<>
       <span className="sw-eyebrow">REFERÊNCIA {offer.reference}</span>
       <h2>{offer.propertyType} · {offer.city}</h2>
       <p>Oportunidade indicativa · Valor de referência {money(offer.estimatedSaleCents)}</p>
       <div className="sw-quote">
        <div><span>Corretagem estimada</span><strong>{(offer.brokerageBps/100).toLocaleString('pt-BR')}% · {money(offer.quoted.grossCommissionCents)}</strong></div>
        <div><span>Participação M Switch na corretagem</span><strong>{(offer.switchShareBps/100).toLocaleString('pt-BR')}% · {money(offer.quoted.switchShareCents)}</strong></div>
        <div><span>Parcela estimada para o parceiro</span><strong>{money(offer.quoted.partnerShareCents)}</strong></div>
       </div>
       <p className="sw-fine">{offer.disclaimer} Valor da comissão sujeito ao contrato e ao efetivo fechamento da operação. Nenhuma cobrança é efetuada nesta etapa.</p>
       {offer.state!=='pending'?<p className="sw-error">Esta oportunidade já recebeu uma manifestação ou foi encerrada.</p>:
       <form className="sw-form" onSubmit={submit}>
        <div className="sw-two">
         <label>Nome completo<input required minLength={3} maxLength={100} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>
         <label>WhatsApp com DDD<input required maxLength={25} type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label>
         <label>Inscrição CRECI para conferência<input required minLength={4} maxLength={40} value={creci} onChange={e=>setCreci(e.target.value)} placeholder="UF / número"/></label>
         <label>Imobiliária (opcional)<input maxLength={100} value={business} onChange={e=>setBusiness(e.target.value)}/></label>
        </div>
        <div className="sw-consents">
         <label><input type="checkbox" required checked={ack} onChange={e=>setAck(e.target.checked)}/><span>Li os valores indicativos, a divisão de corretagem e compreendo que será necessário um contrato escrito específico, com habilitação profissional conferida, antes de qualquer apresentação de contatos.</span></label>
         <label><input type="checkbox" required checked={privacy} onChange={e=>setPrivacy(e.target.checked)}/><span>Autorizo o tratamento das informações acima para analisar meu interesse e conferir minha habilitação profissional.</span></label>
         <label><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/><span>Quero receber oportunidades comerciais futuras. Opcional.</span></label>
        </div>
        {error&&<p role="alert" className="sw-error">{error}</p>}
        <button className="sw-submit" disabled={busy}>{busy?'Registrando…':'Registrar interesse e revisar condições'}<ShieldCheck size={17}/></button>
        <small className="sw-disclaimer">A manifestação não libera contatos e não substitui assinatura contratual.</small>
       </form>}
      </>}
   </section>
  </div>
 </main>;
}
