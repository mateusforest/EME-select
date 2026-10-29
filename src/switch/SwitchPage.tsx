import {SWITCH_CONSENT_VERSION,switchConsentText} from '../../shared/switch-consent.mjs';
import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight,ArrowUpRight,CheckCircle2,House,Repeat2,TrendingUp,ShieldCheck} from 'lucide-react';
import SwitchHeader from './SwitchHeader';
import './switch.css';
import './switch-refinement.css';

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
  useEffect(()=>{document.title='M Switch — Novas possibilidades | EME Select';},[]);
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
    <a className="sw-skip" href="#switch-form">Ir para o formulário</a>
    <SwitchHeader/>
    <div className="sw-shell">
      <section className="sw-intro">
        <span className="sw-eyebrow"><Repeat2 size={16}/> M SWITCH · CONEXÕES IMOBILIÁRIAS</span>
        <h1>Seu próximo imóvel.<br/><em>Um novo caminho.</em></h1>
        <p>O que você tem e o que procura podem se conectar. Encontramos possibilidades de compra, venda e troca, com a atenção da EME em cada etapa.</p>
        <figure className="sw-scene"><img src="/assets/experience/hero-casas-detail.webp" width="1536" height="1024" alt="Arquitetura contemporânea em tons claros"/><figcaption>Cenário conceitual · novas possibilidades</figcaption></figure>
        <div className="sw-benefits"><span><Repeat2 size={17}/>Trocar</span><span><House size={17}/>Comprar e vender</span><span><TrendingUp size={17}/>Investir</span></div>
        <a className="sw-professional-link" href="/switch/profissionais">É corretor ou parceiro? Conheça a rede<ArrowUpRight size={16}/></a>
      </section>
      <section className="sw-card" id="switch-form" aria-label="Solicitar análise M Switch">
        {sent?<div className="sw-success" role="status"><CheckCircle2 size={40}/><span className="sw-eyebrow">SOLICITAÇÃO RECEBIDA</span><h2>Agora temos um ponto de partida.</h2><p>Sua ficha foi encaminhada à equipe M Select. Vamos analisar seu interesse e entrar em contato pelos dados informados. O envio não constitui proposta ou compromisso de compra.</p><button type="button" className="sw-submit" onClick={()=>{setForm(empty);setKind('swap');setSent(false);}}>Enviar outra solicitação<ArrowRight size={17}/></button></div>:<>
          <div className="sw-card-head"><span>VAMOS ENTENDER SEU MOMENTO</span><h2>Qual é o seu próximo passo?</h2><p>Conte um pouco sobre você. A equipe cuida da conexão.</p></div>
          {import.meta.env.VITE_SWITCH_VISUAL_PREVIEW&&<p className="sw-preview-note">Prévia local · cadastros e envios desativados</p>}
          <div className="sw-kinds" role="group" aria-label="Tipo de operação">{kinds.map(item=><button type="button" key={item.id} aria-pressed={kind===item.id} className={kind===item.id?'is-active':''} onClick={()=>setKind(item.id)}><strong>{item.name}</strong><small>{item.detail}</small></button>)}</div>
          <form className="sw-form" onSubmit={submit}>
            <div className="sw-two">
              <label>Seu nome<input required maxLength={100} autoComplete="name" value={form.name} onChange={e=>change('name',e.target.value)} placeholder="Nome completo"/></label>
              <label>WhatsApp com DDD<input required type="tel" inputMode="tel" maxLength={25} autoComplete="tel" value={form.phone} onChange={e=>change('phone',e.target.value)} placeholder="(54) 99999-9999"/></label>
              <label>{kind==='invest'?'Cidade onde deseja investir':kind==='buy'?'Cidade onde deseja comprar':'Cidade do seu imóvel'}<input required maxLength={100} value={form.city} onChange={e=>change('city',e.target.value)} placeholder="Cidade / estado"/></label>
              <label>Tipo de imóvel<select required value={form.propertyType} onChange={e=>change('propertyType',e.target.value)}><option>Casa</option><option>Apartamento</option><option>Terreno</option><option>Comercial</option><option>Área rural</option><option>Outro</option></select></label>
              <label>{label}<input required type="number" min="10000" max="10000000000" step="0.01" inputMode="decimal" value={form.asking} onChange={e=>change('asking',e.target.value)} placeholder="Ex.: 450000"/></label>
              {kind==='swap'&&<label>Onde deseja comprar?<input maxLength={100} value={form.targetCity} onChange={e=>change('targetCity',e.target.value)} placeholder="Cidade ou região desejada"/></label>}
              {kind==='swap'&&<label>Orçamento do imóvel desejado (R$)<input type="number" min="10000" max="10000000000" step="0.01" inputMode="decimal" value={form.targetBudget} onChange={e=>change('targetBudget',e.target.value)} placeholder="Ex.: 700000"/></label>}
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
    <section className="sw-process" aria-label="Como funciona"><div><span className="sw-eyebrow">CONEXÕES COM CRITÉRIO</span><h2>Possibilidades reais.<br/>Pessoas por perto.</h2></div><ol><li><span>01</span><div><h3>Você conta.</h3><p>Entendemos seu imóvel, sua busca e o seu momento.</p></div></li><li><span>02</span><div><h3>A gente conecta.</h3><p>Cruzamos interesses com a carteira e oportunidades de parceiros.</p></div></li><li><span>03</span><div><h3>Decidimos juntos.</h3><p>Um consultor confere as condições e acompanha os próximos passos.</p></div></li></ol></section>
    <p className="sw-safety"><ShieldCheck size={19}/>As conexões dependem de análise e autorização. Não há garantia de venda, permuta ou crédito.</p>
    <footer className="sw-footer">EME SELECT <span>Qualidade em cada escolha. Transparência em cada passo.</span><a href="/">Voltar ao site<ArrowUpRight size={14}/></a></footer>
  </main>;
}
