import {useEffect,useState} from 'react';
import {RefreshCw,ShieldAlert,ShieldCheck} from 'lucide-react';
import {api} from './api';

type Check={label:string;key:string;ready:boolean};
type Status={
 checks:Check[];
 workflow:{
  databaseReady:boolean;crmReady:boolean;whatsappConfigured:boolean;
  inboundWebhookEnabled:boolean;schedulerSecretConfigured:boolean;
  autopilotEnabled:boolean;commercialContractReviewed:boolean;
  providerTemplateApproved:boolean
 };
 pilotCanBeTested:boolean;needsHumanSignoff:string[];note:string;
};
export default function SwitchReadinessPanel(){
 const [result,setResult]=useState<Status|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function refresh(){
  setLoading(true);setError('');
  try{setResult(await api<Status>('/switch/readiness'));}
  catch(e){setError((e as Error).message);}
  finally{setLoading(false);}
 }
 useEffect(()=>{void refresh();},[]);
 const checks=result?.workflow;
 const rows=checks?[
  {name:'Banco de dados',ready:checks.databaseReady,detail:'Tabelas de entrada, propostas, profissionais e fila'},
  {name:'Webhook de entrada',ready:checks.inboundWebhookEnabled,detail:'Recebimento de respostas no canal'},
  {name:'WhatsApp (configuração)',ready:checks.whatsappConfigured,detail:'Credenciais e modelo informados, sem comprovação de aprovação'},
  {name:'Rotina agendada',ready:checks.schedulerSecretConfigured,detail:'CRON_SECRET presente no servidor'},
  {name:'Autopiloto',ready:checks.autopilotEnabled,detail:'Gatilhos explicitamente liberados'},
 ]:[];
 return <section className="ps-card sx-readiness" aria-label="Prontidão M Switch">
  <div className="sx-match-heading"><div><span className="ps-overline">M SWITCH / ATIVAÇÃO CONTROLADA</span><h2>Estado técnico da operação</h2><p>O código compilado não significa que o banco, a Meta e os contratos estão prontos. Aqui estão os bloqueios reais.</p></div>
   <button className="ps-button" disabled={loading} onClick={()=>void refresh()}><RefreshCw size={15}/>{loading?'Conferindo…':'Verificar'}</button>
  </div>
  {error&&<p role="alert" className="pt-error">{error}</p>}
  {result&&<><div className="sx-readiness-grid">{rows.map(row=><article key={row.name}>
    <span>{row.ready?<ShieldCheck size={17}/>:<ShieldAlert size={17}/>}<strong>{row.name}</strong></span>
    <b>{row.ready?'Configurado':'Pendente'}</b>
    <small>{row.detail}</small>
   </article>)}</div>
   <details className="sx-partner-import"><summary>Checagens das tabelas</summary><div className="sx-readiness-tables">{result.checks.map(check=><p key={check.key}>{check.ready?'✓':'✕'} {check.label}</p>)}</div></details>
   <p className="sx-info"><strong>Validação humana pendente:</strong> regularidade profissional, contratos, autorização do imóvel e aprovação do template na Meta. Este painel não certifica esses pontos.</p>
  </>}
 </section>;
}
