import {useEffect,useState} from 'react';
import {Check,RefreshCw,ShieldCheck,PauseCircle} from 'lucide-react';
import {api} from './api';
export type SwitchProfessional={id:string;name:string;business:string;creci:string;phone:string;city:string;property_type:string;
  whatsapp_opt_in:boolean;status:'pending'|'verified'|'paused'|'rejected';version:number;created_at:string};
export default function SwitchProfessionalRoster({changed}:{changed:(rows:SwitchProfessional[])=>void}){
 const [rows,setRows]=useState<SwitchProfessional[]>([]),[ready,setReady]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[autopilot,setAutopilot]=useState('');
 const [delivery,setDelivery]=useState<Record<string,number>>({});
 async function load(){
  try{const [data,outbox]=await Promise.all([api<{professionals:SwitchProfessional[];automatedWhatsAppReady:boolean}>('/switch/professionals'),api<{summary:Record<string,number>}>('/switch/outbox')]);setRows(data.professionals);setReady(data.automatedWhatsAppReady);changed(data.professionals);setDelivery(outbox.summary);}
  catch(e){setError((e as Error).message);}
 }
 useEffect(()=>{void load();},[]);
 async function runAuto(){
  setBusy('autopilot');setError('');setAutopilot('');
  try{
   const result=await api<{generated:{enabled:boolean;created:number;skipped?:number};deliveries:{submitted:number;failed:number;ready:boolean}}>('/switch/autopilot/run','POST',{});
   setAutopilot(result.generated.enabled?
     result.generated.created+' oportunidades preparadas, '+result.deliveries.submitted+' convites submetidos à Meta. Entrega ainda não confirmada.':
     'A criação automática está desativada. Configure as condições e credenciais privadas no servidor para habilitá-la.');
   await load();
  }catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 async function decide(row:SwitchProfessional,status:'verified'|'paused'|'rejected'){
  setBusy(row.id);setError('');
  try{await api('/switch/professionals/'+row.id,'PATCH',{status,version:row.version,licenseChecked:status==='verified'});await load();}
  catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 return <section className="ps-card sx-pro-roster">
  <div className="sx-match-heading"><div><span className="ps-overline">REDE DE PROFISSIONAIS / OPT-IN</span><h2>Quem recebe oportunidades</h2><p>Cadastro por iniciativa do profissional. A gestão confere o CRECI e habilita convites. O telefone só é usado para comunicar oportunidades após autorização.</p></div>
   <button type="button" className="ps-button" onClick={()=>void load()}><RefreshCw size={15}/>Atualizar</button>
  </div>
  <p className="sx-info">Canal automático oficial: <strong>{ready?'Configurado para envio de template':'Desativado / sem configuração completa'}</strong>. Nenhuma mensagem é disparada quando desativado.</p>
  <p className="sx-info">Fila WhatsApp: {delivery.pending||0} aguardando · {delivery.submitted||0} submetidas à Meta · {delivery.failed||0} falhas · {delivery.skipped||0} ignoradas. Submissão não garante entrega.</p>
  <div className="sx-actions"><a className="ps-text-button" href="/switch/profissionais" target="_blank" rel="noreferrer">Abrir inscrição profissional ↗︎</a><button type="button" className="ps-button" disabled={busy==='autopilot'} onClick={()=>void runAuto()}>{busy==='autopilot'?'Verificando…':'Executar motor comercial agora'}</button></div>
  {autopilot&&<p className="sx-info" role="status">{autopilot}</p>}
  {!rows.length?<p className="sx-info">Nenhum profissional inscrito. Divulgação do formulário é aberta a profissionais habilitados que queiram receber oportunidades; não exige contato prévio com cada empresa.</p>:
   <div className="sx-pro-list">{rows.map(row=><article key={row.id}>
    <strong>{row.name}</strong><small>{row.city} · {row.property_type} · CRECI informado: {row.creci}</small>
    <small>{row.status==='pending'?'Aguardando conferência':row.status==='verified'?'Verificado para convites':row.status==='paused'?'Avisos interrompidos':'Não habilitado'}</small>
    {row.status==='pending'&&<button className="ps-button" disabled={busy===row.id} type="button" onClick={()=>void decide(row,'verified')}><Check size={15}/>Conferi CRECI e habilitar</button>}
    {row.status==='verified'&&<button className="ps-text-button" disabled={busy===row.id} type="button" onClick={()=>void decide(row,'paused')}><PauseCircle size={15}/>Pausar alertas</button>}
   </article>)}</div>}
  {error&&<p className="pt-error" role="alert">{error}</p>}
  <p className="sx-info"><ShieldCheck size={13}/> A equipe deve efetivamente conferir a inscrição no conselho e autorização de mensagens antes de habilitar. Cadastro não comprova CRECI.</p>
 </section>;
}
