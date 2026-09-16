import { useEffect, useState, type FormEvent } from 'react';
import { Check, ClipboardCheck, ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react';
import { api, type CaseDetails, type TeamUser } from './api';

export default function CurationPanel({detail,user,onSaved}:{detail:CaseDetails;user:TeamUser;onSaved:(data:CaseDetails)=>void}) {
  const c=detail.curation;
  const [criteria,setCriteria]=useState(c.criteria),[checks,setChecks]=useState(c.checks),[pending,setPending]=useState(c.pending);
  const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [reason,setReason]=useState(''),[ack,setAck]=useState(false),[choice,setChoice]=useState('');
  useEffect(()=>{setCriteria(c.criteria);setChecks(c.checks);setPending(c.pending);setDirty(false);setChoice('');setReason('');setAck(false);},[detail.evaluation.version]);
  const admin=user.role==='admin';
  async function save(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try {
      const data=await api<CaseDetails>('/evaluations/'+detail.evaluation.id+'/curation','POST',{version:detail.evaluation.version,criteria:criteria.map(({key,score,note})=>({key,score,note})),checks:checks.map(({key,state,note})=>({key,state,note})),pending});
      onSaved(data);setMessage('Curadoria salva com autor, data e evidências no histórico.');
    } catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function decide(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');setMessage('');
    try {
      const data=await api<CaseDetails>('/evaluations/'+detail.evaluation.id+'/decision','POST',{version:detail.evaluation.version,action:choice,reason,acknowledged:ack});
      onSaved(data);setMessage(choice==='reopen'?'Decisão reaberta. As conferências precisam ser revistas.':'Etapa registrada: '+data.evaluation.stage+'.');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  const choose=(value:string)=>{setChoice(value);setReason('');setAck(false);setError('');};
  return <div className="pc-panel">
    <div className="pc-summary"><div><span className="ps-overline">CURADORIA · {c.legacy?'RÉGUA ANTERIOR':'SELECT V2'}</span><h3>Evidências antes da decisão.</h3><p>{c.legacy?'Qualidade e mercado, conforme a política preservada deste dossiê.':'Qualidade do imóvel, sem faixa mínima de preço. Mercado e documentação são conferidos separadamente.'} Avaliação preenchida pela equipe. Consulte a Central de IA para análises e pendências; a decisão final continua sendo humana.</p></div><div className="pc-score"><strong>{c.score??'—'}<small>/100</small></strong><span>{c.coverage}/{c.criteria.length} dimensões preenchidas</span></div></div>
    <p className="pc-policy">{c.policy} · {c.legacy?'Corte piloto de 80/100 e mínimo 3/5 por dimensão. As notas existentes permanecem nesta política, inclusive após reabertura.':`${c.familyLabel}: corte piloto de 85/100; condição e função com mínimo 4/5, demais dimensões com mínimo 3/5.`} Régua em calibração; não é padrão certificado de mercado. A nota considera a última versão salva.</p>
    <p className="pc-help">O preenchimento conta notas acompanhadas de referência textual. Não mede cobertura das evidências nem certeza sobre o imóvel. Informação desconhecida deve ficar sem nota.</p>
    {c.locked&&<div className="ps-note"><ShieldCheck size={19}/><p>Decisão registrada: <strong>{detail.evaluation.stage}</strong>. O dossiê está preservado. Uma nova análise exige reabertura pelo administrador.</p></div>}
    <form className="ps-form" onSubmit={save}>
      <fieldset disabled={busy||c.locked} className="pc-fieldset">
      <section><div className="pc-section-title"><ClipboardCheck size={18}/><h3>{c.legacy?'Qualidade e mercado · política anterior':'Qualidade do imóvel'}</h3></div><p className="pc-help">{c.legacy?'0 crítica · 1 inadequada · 2 abaixo do padrão · 3 atende · 4 boa · 5 superior. Use “Não verificado” quando faltar evidência.':'0 incompatível · 1 comprometido · 2 insuficiente · 3 funcional · 4 superior · 5 excepcional. Use “Não verificado” quando faltar evidência. Para 4 ou 5, descreva o que supera o nível funcional; compare imóveis do mesmo tipo e uso.'}</p>
      <div className="pc-criteria">{criteria.map((item,index)=><div className="pc-criterion" key={item.key}><div className="pc-criterion-head"><strong>{item.label}</strong><span>Peso {item.weight}% · piso {item.minimum}/5</span></div><p>{item.help}</p>{item.anchors.length>0&&<details><summary>Critérios para cada nota de 0 a 5</summary><ol start={0}>{item.anchors.map((anchor,n)=><li key={n}><strong>{n}/5:</strong> {anchor}</li>)}</ol></details>}<label>Nota · {item.label}<select value={item.score??''} onChange={e=>{setCriteria(criteria.map((v,i)=>i===index?{...v,score:e.target.value===''?null:Number(e.target.value)}:v));setDirty(true);}}><option value="">Não verificado</option>{[0,1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5</option>)}</select></label>{item.score!==null&&item.anchors[item.score]&&<p className="pc-help" aria-live="polite"><strong>{item.score}/5:</strong> {item.anchors[item.score]}</p>}<label>Evidência · {item.label}<textarea rows={3} maxLength={1800} minLength={item.score===null?0:10} required={item.score!==null} placeholder="Descreva o observado, fonte, data, escopo e limitações. Diferencie declaração de conferência." value={item.note} onChange={e=>{setCriteria(criteria.map((v,i)=>i===index?{...v,note:e.target.value}:v));setDirty(true);}}/></label></div>)}</div></section>
      <section className="pc-checks"><div className="pc-section-title"><ShieldCheck size={18}/><h3>Conferências humanas para a entrada</h3></div><p className="pc-help">Uma nota alta não compensa uma conferência pendente. Registre escopo, fonte, data e responsável. Esta etapa guarda referências textuais, sem consulta automática; documentos de suporte devem permanecer no repositório privado da equipe. Somente o administrador conclui uma conferência.</p>
      {checks.map((item,index)=><div key={item.key} className="pc-check"><label>{item.label}<span className="pc-help">{item.help}</span><select disabled={!admin&&item.state==='Conferido'} value={item.state} onChange={e=>{setChecks(checks.map((v,i)=>i===index?{...v,state:e.target.value}:v));setDirty(true);}}><option>Pendente</option><option>Em revisão</option><option disabled={!admin}>Conferido</option></select></label><label>Referência · {item.label}<textarea rows={2} disabled={!admin&&item.state==='Conferido'} maxLength={1800} required={item.state==='Conferido'} minLength={item.state==='Conferido'?10:0} value={item.note} onChange={e=>{setChecks(checks.map((v,i)=>i===index?{...v,note:e.target.value}:v));setDirty(true);}}/></label>{item.author&&<small>Último registro: {item.author} · {item.date&&new Date(item.date).toLocaleString('pt-BR')}</small>}</div>)}
      <label>Pendências abertas<textarea rows={3} maxLength={3000} placeholder="O que precisa ser resolvido antes da entrada? Deixe vazio somente se não houver pendências registradas." value={pending} onChange={e=>{setPending(e.target.value);setDirty(true);}}/></label></section>
      </fieldset>
      {!c.locked&&<div className="pc-save"><button className="ps-button ps-button--primary" disabled={busy||!dirty}><Check size={16}/>{busy?'Salvando…':'Salvar curadoria'}</button><small>{dirty?'Há alterações ainda não salvas.':'Última versão salva no servidor.'}</small></div>}
    </form>
    <section className="pc-decision"><span className="ps-overline">DECISÃO HUMANA</span><h3>{c.locked?'Decisão preservada':c.blockers.length?'O que falta para decidir':'Dossiê pronto para revisão'}</h3>
    {!c.locked&&(c.blockers.length?<ul>{c.blockers.map(b=><li key={b}>{b}</li>)}</ul>:<p>Os requisitos registrados foram preenchidos. O administrador ainda precisa revisar as fontes e decidir.</p>)}
    <p className="pc-help">A entrada aprovada é uma decisão interna. Não publica o imóvel, não garante ausência de ônus ou processos e não substitui a análise do responsável jurídico.</p>
    <div className="pc-actions">{c.locked?admin&&<button className="ps-button" disabled={busy} onClick={()=>choose('reopen')}><RotateCcw size={16}/>Reabrir avaliação</button>:<>
    {detail.evaluation.stage!=='Aguardando decisão'&&<button className="ps-button ps-button--primary" disabled={busy||dirty||!!c.blockers.length} onClick={()=>choose('submit')}>Encaminhar para decisão<ArrowRight size={16}/></button>}
    {admin&&<><button className="ps-button ps-button--primary" disabled={busy||dirty||!!c.blockers.length||detail.evaluation.stage!=='Aguardando decisão'} onClick={()=>choose('approve')}>Aprovar entrada</button><button className="ps-button" disabled={busy||dirty} onClick={()=>choose('adjust')}>Solicitar ajustes</button><button className="ps-text-button" disabled={busy||dirty} onClick={()=>choose('reject')}>Não selecionar</button></>}
    </>}</div>
    {choice&&<form className="ps-form pc-confirm" onSubmit={decide}><h4>{({submit:'Encaminhar para revisão final',approve:'Confirmar entrada na carteira',adjust:'Registrar ajustes necessários',reject:'Registrar não seleção',reopen:'Reabrir e revisar as conferências'} as Record<string,string>)[choice]}</h4><label>Motivo da decisão<textarea rows={3} minLength={10} maxLength={3000} required value={reason} onChange={e=>setReason(e.target.value)}/></label>{choice==='approve'&&<label className="pc-ack"><input type="checkbox" checked={ack} required onChange={e=>setAck(e.target.checked)}/><span>Revisei as evidências e as conferências responsáveis. Confirmo o uso da régua piloto nesta decisão interna.</span></label>}<div className="pc-actions"><button className="ps-button ps-button--primary" disabled={busy||dirty||reason.trim().length<10||(choice==='approve'&&!ack)}>{busy?'Registrando…':'Confirmar decisão'}</button><button className="ps-text-button" type="button" disabled={busy} onClick={()=>setChoice('')}>Cancelar</button></div></form>}
    </section>
    {error&&<div className="pt-error" role="alert">{error}<p>Se outra pessoa alterou o dossiê, copie seu texto antes de fechar e reabrir para obter a versão atual.</p></div>}{message&&<p className="pc-success" role="status">{message}</p>}
  </div>;
}
