import {SWITCH_CONSENT_VERSION,switchConsentText} from '../../shared/switch-consent.mjs';
import {useState,type FormEvent} from 'react';
import {ArrowRight,CheckCircle2,House,Repeat2,TrendingUp} from 'lucide-react';
import './switch.css';

type Kind = 'swap' | 'sell' | 'buy' | 'invest';
type SwitchForm = {
  name:string;phone:string;city:string;propertyType:string;asking:string;
  targetCity:string;targetBudget:string;notes:string;contactConsent:boolean;
  updatesOptIn:boolean;privacyAccepted:boolean;website:string;
};
const kinds:{id:Kind;name:string;detail:string}[]=[
  {id:'swap',name:'Quero trocar',detail:'Tenho um imóvel e procuro outro.'},
  {id:'sell',name:'Quero vender',detail:'Quero avaliar possibilidades de venda.'},
  {id:'buy',name:'Quero comprar',detail:'Busco um imóvel para comprar.'},
  {id:'invest',name:'Quero investir',detail:'Busco oportunidades para analisar.'}
];
const empty:SwitchForm={name:'',phone:'',city:'Vacaria',propertyType:'Casa',asking:'',
  targetCity:'',targetBudget:'',notes:'',contactConsent:false,updatesOptIn:false,privacyAccepted:false,website:''};
function cents(value:string) {
  if(!value.trim())return null;
  const amount=Number(value);
  return Number.isFinite(amount)&&amount>0?Math.round(amount*100):null;
}
export default function SwitchPage(){
  const [kind,setKind]=useState<Kind>('swap'),[form,setForm]=useState<SwitchForm>(empty);
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[sent,setSent]=useState(false);
  const change=(key:keyof SwitchForm,value:string|boolean)=>setForm(current=>({...current,[key]:value}));
  const label=['invest','buy'].includes(kind)?'Orçamento máximo previsto (R$)':'Valor aproximado do seu imóvel (R$)';
  async function submit(e:FormEvent){
    e.preventDefault();if(busy)return;
    setBusy(true);setError('');
    try{
      const response=await fetch('/api/public/switch',{method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({requestId,kind,name:form.name,phone:form.phone,city:form.city,propertyType:form.propertyType,
          askingCents:cents(form.asking),targetCity:form.targetCity,
          targetBudgetCents:cents(form.targetBudget),notes:form.notes,
          contactConsent:form.contactConsent,updatesOptIn:form.updatesOptIn,
          privacyAccepted:form.privacyAccepted,consentVersion:SWITCH_CONSENT_VERSION,website:form.website,
          source:'switch-web'+(new URLSearchParams(location.search).get('utm_source')?.replace(/[^a-zA-Z0-9 _.:-]/g,'').slice(0,40)?':'+new URLSearchParams(location.search).get('utm_source')!.replace(/[^a-zA-Z0-9 _.:-]/g,'').slice(0,40):'')})});
      const data=await response.json().catch(()=>({error:'Não foi possível confirmar o recebimento.'}));
      if(!response.ok)throw new Error(data.error||'Não foi possível enviar. Tente novamente.');
      setSent(true);setRequestId(crypto.randomUUID());
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  return <main className="sw-page">
    <header className="sw-header"><a href="/" className="sw-brand" aria-label="M Select · início"><span>M</span><span>SELECT<small>SWITCH</small></span></a><a className="sw-back" href="/switch/profissionais">Sou profissional · receber oportunidades <ArrowRight size={15}/></a></header>
    <div className="sw-shell">
      <section className="sw-intro">
        <span className="sw-eyebrow">M SELECT / NOVAS POSSIBILIDADES</span>
        <h1>Seu próximo imóvel pode começar pelo que você já tem.</h1>
        <p>Conte o que você possui ou procura. Nossa equipe analisa possibilidades de venda, troca e investimento e conecta interesses compatíveis.</p>
        <div className="sw-benefits"><span><Repeat2 size={17}/>Trocas estruturadas</span><span><House size={17}/>Venda com estratégia</span><span><TrendingUp size={17}/>Rede de investidores</span></div>
        <p className="sw-fine">As combinações são sugestões sujeitas a análise documental, avaliação e negociação. Não garantimos ofertas, preço, venda ou crédito.</p>
      </section>
      <section className="sw-card" aria-label="Solicitar análise M Switch">
        {sent?<div className="sw-success" role="status"><CheckCircle2 size={40}/><span className="sw-eyebrow">SOLICITAÇÃO RECEBIDA</span><h2>Agora temos um ponto de partida.</h2><p>Sua ficha foi encaminhada à equipe M Select. Vamos analisar seu interesse e entrar em contato pelos dados informados. O envio não constitui proposta ou compromisso de compra.</p><button type="button" className="sw-submit" onClick={()=>{setForm(empty);setKind('swap');setSent(false);}}>Enviar outra solicitação<ArrowRight size={17}/></button></div>:<>
          <div className="sw-card-head"><span>01 / SUA OPORTUNIDADE</span><h2>Como podemos ajudar?</h2></div>
          <div className="sw-kinds" role="group" aria-label="Tipo de operação">{kinds.map(item=><button type="button" key={item.id} aria-pressed={kind===item.id} className={kind===item.id?'is-active':''} onClick={()=>setKind(item.id)}><strong>{item.name}</strong><small>{item.detail}</small></button>)}</div>
          <form className="sw-form" onSubmit={submit}>
            <div className="sw-two">
              <label>Seu nome<input required maxLength={100} autoComplete="name" value={form.name} onChange={e=>change('name',e.target.value)} placeholder="Nome completo"/></label>
              <label>WhatsApp com DDD<input required type="tel" inputMode="tel" maxLength={25} autoComplete="tel" value={form.phone} onChange={e=>change('phone',e.target.value)} placeholder="(54) 99999-9999"/></label>
              <label>{kind==='invest'?'Cidade onde deseja investir':kind==='buy'?'Cidade onde deseja comprar':'Cidade do seu imóvel'}<input required maxLength={100} value={form.city} onChange={e=>change('city',e.target.value)} placeholder="Cidade / estado"/></label>
              <label>Tipo de imóvel<select required value={form.propertyType} onChange={e=>change('propertyType',e.target.value)}><option>Casa</option><option>Apartamento</option><option>Terreno</option><option>Comercial</option><option>Área rural</option><option>Outro</option></select></label>
              <label>{label}<input required type="number" min="10000" max="10000000000" step="1000" inputMode="numeric" value={form.asking} onChange={e=>change('asking',e.target.value)} placeholder="Ex.: 450000"/></label>
              {kind==='swap'&&<label>Onde deseja comprar?<input maxLength={100} value={form.targetCity} onChange={e=>change('targetCity',e.target.value)} placeholder="Cidade ou região desejada"/></label>}
              {kind==='swap'&&<label>Orçamento do imóvel desejado (R$)<input type="number" min="10000" max="10000000000" step="1000" value={form.targetBudget} onChange={e=>change('targetBudget',e.target.value)} placeholder="Ex.: 700000"/></label>}
            </div>
            <label>O que você procura? <small>Opcional</small><textarea rows={3} maxLength={1200} value={form.notes} onChange={e=>change('notes',e.target.value)} placeholder={kind==='invest'?'Região, prazo, tipo de oportunidade…':kind==='buy'?'Bairros, dormitórios, condições e prazo para comprar…':'Fale um pouco sobre a situação e os objetivos da negociação…'}/></label>
            <details className="sw-data-note"><summary>Como usamos seus dados</summary><p>Nome, telefone, informações do imóvel e sua intenção de negociação são utilizados para organizar o atendimento e analisar compatibilidades. O acesso é restrito à equipe responsável. Não compartilhamos seu imóvel ou contato com investidores sem conferência e autorização específicas. Avisos de novas oportunidades são opcionais e podem ser cancelados pelo canal de atendimento da M Select. Você pode solicitar acesso, revisão ou exclusão de dados pelos canais de contato do site.</p></details>
            <div className="sw-consents">
              <label><input type="checkbox" required checked={form.privacyAccepted} onChange={e=>change('privacyAccepted',e.target.checked)}/><span>{switchConsentText.privacy}</span></label>
              <label><input type="checkbox" required checked={form.contactConsent} onChange={e=>change('contactConsent',e.target.checked)}/><span>{switchConsentText.contact}</span></label>
              <label><input type="checkbox" checked={form.updatesOptIn} onChange={e=>change('updatesOptIn',e.target.checked)}/><span>{switchConsentText.updates}</span></label>
            </div>
            <div className="sw-honeypot" aria-hidden="true"><label>Site<input tabIndex={-1} autoComplete="off" value={form.website} onChange={e=>change('website',e.target.value)}/></label></div>
            {error&&<p className="sw-error" role="alert">{error}</p>}
            <button type="submit" className="sw-submit" disabled={busy}>{busy?'Enviando…':'Solicitar análise'}<ArrowRight size={18}/></button>
            <small className="sw-disclaimer">Sem compromisso de negociação. Nenhum imóvel será anunciado ou compartilhado com investidores sem revisão e autorização.</small>
          </form>
        </>}
      </section>
    </div>
    <footer className="sw-footer">M SELECT <span>Uma oportunidade começa com uma boa conexão.</span></footer>
  </main>;
}
