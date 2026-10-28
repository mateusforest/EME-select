import {useEffect,useState} from 'react';
import {Check,RefreshCw,ShieldCheck,PauseCircle} from 'lucide-react';
import {api} from './api';
export type SwitchProfessional={id:string;name:string;business:string;creci:string;phone:string;city:string;property_type:string;
  whatsapp_opt_in:boolean;status:'pending'|'verified'|'paused'|'rejected';version:number;created_at:string};
export default function SwitchProfessionalRoster({changed}:{changed:(rows:SwitchProfessional[])=>void}){
 const [rows,setRows]=useState<SwitchProfessional[]>([]),[ready,setReady]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState('');
 async function load(){
  try{const data=await api<{professionals:SwitchProfessional[];automatedWhatsAppReady:boolean}>('/switch/professionals');setRows(data.professionals);setReady(data.automatedWhatsAppReady);changed(data.professionals);}
  catch(e){setError((e as Error).message);}
 }
 useEffect(()=>{void load();},[]);
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
  <a className="ps-text-button" href="/switch/profissionais" target="_blank" rel="noreferrer">Abrir inscrição profissional ↗︎</a>
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
