import {useState} from 'react';
import {Sparkles,Check} from 'lucide-react';
import {api,type CaseDetails} from './api';
import type {Draft,Listing} from './listingModel';
type Suggestion={draftReply:string;strengths:string[];nextActions:string[];pending:string[]};
export default function EditorialAssistant({item,dirty,onApply}:{item:Listing|null;dirty:boolean;onApply:(patch:Partial<Draft>)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[suggestion,setSuggestion]=useState<Suggestion|null>(null);
 async function generate(){if(!item)return;setBusy(true);setError('');setSuggestion(null);try{
  const dossier=await api<CaseDetails>('/evaluations/'+item.id);const requestId=crypto.randomUUID();
  const response=await api<{runs:{id:string;result:Suggestion}[]}>('/intelligence/analyses','POST',{requestId,caseId:item.id,caseVersion:dossier.evaluation.version,task:'atendimento',context:'Preparar apresentação editorial do anúncio para revisão da equipe.',editorial:true});
  const result=response.runs.find(run=>run.id===requestId)?.result;if(!result)throw Error('A sugestão não ficou disponível. Consulte o histórico da Central de IA.');setSuggestion(result);
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="pl-ai-preview"><h3>Assistente de apresentação</h3><p>A IA organiza a descrição salva, extrai características objetivas e sugere diferenciais. Confira as informações antes de aplicar. Nesta etapa, a análise usa os textos da ficha, sem analisar fotografias.</p><button type="button" className="ps-button" disabled={busy||dirty||!item} onClick={generate}><Sparkles size={17}/>{busy?'Preparando sugestões…':'Sugerir apresentação com IA'}</button>{(dirty||!item)&&<small> Salve a ficha para analisar a versão atual.</small>}{error&&<p role="alert" className="pt-error">{error}</p>}{suggestion&&<><h4>Descrição sugerida</h4><p>{suggestion.draftReply}</p><h4>Características · o que o imóvel tem</h4><ul>{suggestion.strengths.map((line,i)=><li key={i}>{line}</li>)}</ul><h4>Diferenciais · o que merece destaque</h4><ul>{suggestion.nextActions.map((line,i)=><li key={i}>{line}</li>)}</ul>{suggestion.pending.length>0&&<><h4>Pontos para conferir</h4><ul>{suggestion.pending.map((line,i)=><li key={i}>{line}</li>)}</ul></>}<div className="pl-ai-actions"><button type="button" className="ps-button ps-button--primary" disabled={dirty} onClick={()=>{onApply({description:suggestion.draftReply,features:suggestion.strengths.join('\n'),reasons:suggestion.nextActions.join('\n')});setSuggestion(null);}}><Check size={16}/>Aplicar ao rascunho para revisar</button><button type="button" className="ps-button" onClick={()=>setSuggestion(null)}>Descartar sugestão</button></div></>}</div>;
}
