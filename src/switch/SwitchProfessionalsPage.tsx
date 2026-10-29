import {SWITCH_CONSENT_VERSION,switchConsentText} from '../../shared/switch-consent.mjs';
import {useState,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,CheckCircle2,ShieldCheck} from 'lucide-react';
import './switch.css';
export default function SwitchProfessionalsPage(){
 const isOptOut=/^\/switch\/sair\/[a-zA-Z0-9_-]{43}\/?$/.test(location.pathname);
 const token=location.pathname.split('/').pop()||'';
 const [name,setName]=useState(''),[business,setBusiness]=useState(''),[creci,setCreci]=useState('');
 const [phone,setPhone]=useState(''),[city,setCity]=useState('Vacaria'),[propertyType,setPropertyType]=useState('Casa');
 const [optIn,setOptIn]=useState(false),[privacy,setPrivacy]=useState(false);
 const [requestId]=useState(()=>crypto.randomUUID());
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 async function submit(event:FormEvent){
  event.preventDefault();if(busy)return;setBusy(true);setError('');
  try{
   const url=isOptOut?'/api/public/switch/professionals/stop':'/api/public/switch/professionals';
   const response=await fetch(url,{method:'POST',credentials:'same-origin',
     headers:{'Content-Type':'application/json'},body:JSON.stringify(isOptOut?{token}:{
      requestId,name,business,creci,phone,city,propertyType,whatsappOptIn:optIn,privacyAccepted:privacy,consentVersion:SWITCH_CONSENT_VERSION
     })});
   const result=await response.json().catch(()=>({error:'Falha ao processar.'}));
   if(!response.ok)throw Error(result.error||'Não foi possível finalizar.');
   setDone(true);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <main className="sw-page"><header className="sw-header">
  <a href="/" className="sw-brand"><span>M</span><span>SELECT<small>SWITCH</small></span></a>
  <a href="/switch" className="sw-back"><ArrowLeft size={16}/>M Switch</a>
 </header><div className="sw-shell sw-invite-shell">
  <section className="sw-intro"><span className="sw-eyebrow">M SELECT / REDE DE OPORTUNIDADES</span>
   <h1>{isOptOut?'Você controla seus avisos.':'Receba oportunidades com condições claras.'}</h1>
   <p>{isOptOut?'Você pode interromper o recebimento de novos convites pelo WhatsApp.':'Profissionais do mercado podem receber oportunidades relevantes conforme sua área de atuação. Antes de qualquer contato comercial entre as partes, apresentamos condições de remuneração, verificamos o CRECI e exigimos acordo escrito.'}</p>
   <p className="sw-fine">Cadastro gratuito. Não há garantia de oportunidades, exclusividade ou fechamento de negócio.</p>
  </section>
  <section className="sw-card">{done?<div className="sw-success" role="status"><CheckCircle2 size={40}/><h2>{isOptOut?'Avisos interrompidos.':'Cadastro recebido.'}</h2><p>{isOptOut?'Seu pedido foi registrado. Nenhum novo convite será enviado por esta inscrição.':'Vamos conferir seus dados profissionais antes de habilitar convites. Nenhum número de cliente é divulgado nesta etapa.'}</p><a href="/switch" className="sw-submit">Voltar</a></div>:
   <form className="sw-form" onSubmit={submit}>
    <span className="sw-eyebrow">{isOptOut?'GERENCIAR COMUNICAÇÕES':'CADASTRO PROFISSIONAL'}</span>
    <h2>{isOptOut?'Interromper avisos':'Sua atuação, suas oportunidades.'}</h2>
    {isOptOut?<p>Confirme para cancelar os avisos vinculados a este link. Para outros assuntos, utilize os canais de atendimento da M Select.</p>:
    <><div className="sw-two">
      <label>Nome completo<input required minLength={3} maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
      <label>WhatsApp com DDD<input required type="tel" maxLength={25} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
      <label>CRECI para conferência<input required minLength={4} maxLength={40} value={creci} onChange={e=>setCreci(e.target.value)} placeholder="RS 12345"/></label>
      <label>Imobiliária / empresa (opcional)<input maxLength={100} value={business} onChange={e=>setBusiness(e.target.value)}/></label>
      <label>Cidade de atuação<input required minLength={2} maxLength={100} value={city} onChange={e=>setCity(e.target.value)}/></label>
      <label>Tipo de imóvel<select value={propertyType} onChange={e=>setPropertyType(e.target.value)}><option>Casa</option><option>Apartamento</option><option>Terreno</option><option>Comercial</option><option>Área rural</option><option>Outro</option></select></label>
    </div><div className="sw-consents">
      <label><input type="checkbox" required checked={optIn} onChange={e=>setOptIn(e.target.checked)}/><span>{switchConsentText.professional}</span></label>
      <label><input type="checkbox" required checked={privacy} onChange={e=>setPrivacy(e.target.checked)}/><span>{switchConsentText.professionalPrivacy}</span></label>
    </div></>}
    {error&&<p className="sw-error" role="alert">{error}</p>}
    <button type="submit" className="sw-submit" disabled={busy}>{busy?'Processando…':isOptOut?'Interromper mensagens':'Solicitar participação na rede'}<ArrowRight size={17}/></button>
    <small className="sw-disclaimer"><ShieldCheck size={13}/> O atendimento e a introdução comercial estão sujeitos à verificação humana e às regras profissionais.</small>
   </form>}</section>
 </div></main>;
}
