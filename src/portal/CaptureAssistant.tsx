import {useEffect,useRef,useState} from 'react';
import {FileText,Upload,Sparkles,Check,ArrowUpRight} from 'lucide-react';
import {api,ApiError,type CaseDetails} from './api';
import type {Draft,Listing} from './listingModel';
import {captureFields,captureValue} from '../../shared/capture.mjs';
import './capture.css';
type Material={id:string;propertyId:string;title:string;filename:string;status:string};
type OperationSnapshot={version:number;state:{documents:Material[]}};
type Suggestion={key:keyof Draft;value:string;sourceId:string;reference:string;confidence:'high'|'medium'|'low'};
type Capture={kind:'capture';summary:string;fields:Suggestion[];findings:{status:'observed'|'missing'|'conflict';title:string;detail:string;sourceId:string}[];pending:string[]};
type Run={id:string;caseId:string;caseVersion:number;status:string;error?:string;stale?:boolean;result?:Capture};
export default function CaptureAssistant({item,draft,dirty,busy,onEnsureSaved,onApply,onPhotos,onBusy}:{item:Listing|null;draft:Draft;dirty:boolean;busy:boolean;onEnsureSaved:()=>Promise<Listing>;onApply:(patch:Partial<Draft>)=>void;onPhotos:()=>void;onBusy:(value:boolean)=>void}){
 const [open,setOpen]=useState(false),[documents,setDocuments]=useState<Material[]>([]),[selectedDocs,setSelectedDocs]=useState<string[]>([]),[context,setContext]=useState(''),[result,setResult]=useState<Capture|null>(null),[selected,setSelected]=useState<string[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[working,setWorking]=useState(false),[analyzedVersion,setAnalyzedVersion]=useState<number|null>(null);
 const input=useRef<HTMLInputElement>(null),retryUpload=useRef<{key:string;requestId:string;version:number;command:unknown}|null>(null),retryAnalysis=useRef<Record<string,unknown>|null>(null);
 const locked=busy||working;
 async function loadMaterials(id:string){const snapshot=await api<OperationSnapshot>('/operations');setDocuments(snapshot.state.documents.filter(d=>d.propertyId===id));return snapshot;}
 useEffect(()=>{if(!open||!item)return;let live=true;loadMaterials(item.id).then(()=>Promise.all([api<{runs:Run[]}>('/intelligence'),api<CaseDetails>('/evaluations/'+item.id)])).then(([{runs},detail])=>{if(!live)return;const run=runs.find(r=>r.caseId===item.id&&r.status==='completed'&&r.result?.kind==='capture');if(run&&!run.stale){setResult(run.result!);setAnalyzedVersion(run.caseVersion===detail.evaluation.version?item.version:-1);setSelected([]);}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[open,item?.id]);
 async function upload(files:File[]){if(!files.length)return;setWorking(true);onBusy(true);setError('');setNotice('');try{
  for(const file of files)if(file.size>2*1024*1024||!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Use PDF, PNG, JPEG ou WebP de até 2 MB por documento.');
  const current=await onEnsureSaved();let snapshot=await loadMaterials(current.id);const added:string[]=[];
  for(const file of files){setNotice('Salvando documento: '+file.name);const contentBase64=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Não foi possível ler '+file.name));reader.readAsDataURL(file);});
   const key=current.id+':'+file.name+':'+contentBase64;
   if(retryUpload.current?.key!==key)retryUpload.current={key,requestId:crypto.randomUUID(),version:snapshot.version,command:{type:'document.upload',data:{propertyId:current.id,title:file.name.slice(0,160),category:'other',expiresOn:null,previousId:null,filename:file.name,mimeType:file.type,contentBase64}}};
   const request=retryUpload.current,previous=new Set(snapshot.state.documents.map(d=>d.id));
   snapshot=await api<OperationSnapshot>('/operations/commands','POST',{requestId:request.requestId,version:request.version,command:request.command});retryUpload.current=null;
   for(const d of snapshot.state.documents)if(d.propertyId===current.id&&!previous.has(d.id))added.push(d.id);
  }
  setDocuments(snapshot.state.documents.filter(d=>d.propertyId===current.id));setSelectedDocs(old=>[...new Set([...old,...added])].slice(0,5));setNotice('Documentos privados salvos na ficha. Selecione até cinco para analisar.');
 }catch(e){if(e instanceof ApiError&&e.status===409)retryUpload.current=null;setError((e as Error).message+' Os envios concluídos foram preservados.');}finally{setWorking(false);onBusy(false);if(input.current)input.current.value='';}}
 async function analyze(){setWorking(true);onBusy(true);setError('');setNotice('');setResult(null);try{
  const current=await onEnsureSaved(),detail=await api<CaseDetails>('/evaluations/'+current.id);
  const body={caseId:current.id,caseVersion:detail.evaluation.version,task:'documentos',context,capture:true,documentIds:selectedDocs};
  const key=JSON.stringify(body);if(retryAnalysis.current?.key!==key)retryAnalysis.current={key,...body,requestId:crypto.randomUUID()};
  const {key:_key,...request}=retryAnalysis.current;
  setNotice('Lendo materiais e preparando os campos para sua revisão…');
  const response=await api<{runs:Run[]}>('/intelligence/analyses','POST',request);const run=response.runs.find(r=>r.id===request.requestId);
  if(!run||run.status!=='completed'||!run.result) {retryAnalysis.current=null;throw Error(run?.error||'A extração não foi concluída.');}
  if(run.stale)throw Error('A ficha mudou durante a análise. Reabra o imóvel antes de aplicar sugestões.');
  setResult(run.result);setAnalyzedVersion(current.version);setSelected(run.result.fields.filter(f=>f.confidence==='high'&&(current.draft[f.key]===''||current.draft[f.key]===null)).map(f=>f.key));retryAnalysis.current=null;setNotice('Confira as sugestões. Nenhum campo foi alterado automaticamente.');
 }catch(e){setError((e as Error).message);}finally{setWorking(false);onBusy(false);}}
 function apply(){if(!result)return;const patch:Partial<Draft>={};for(const field of result.fields)if(selected.includes(field.key))Object.assign(patch,{[field.key]:captureValue(field.key,field.value)});onApply(patch);setSelected([]);setNotice('Sugestões aplicadas ao rascunho. Salve a ficha para registrar.');}
 const stale=analyzedVersion!==null&&item?.version!==analyzedVersion;
 const sourceName=(id:string)=>documents.find(d=>d.id===id)?.title||(id==='context'?'Relato informado':id==='cadastro'?'Ficha atual':id.startsWith('photo:')?'Fotografia do imóvel':'Material da ficha');
 return <section className="ps-card cap-assistant"><div className="cap-heading"><div><span className="ps-overline">CAPTAÇÃO ASSISTIDA</span><h3>Comece pelo que você já tem.</h3><p>Anexe materiais, extraia os dados e revise o que será usado no cadastro.</p></div><button type="button" className="ps-button" disabled={locked} aria-expanded={open} onClick={()=>setOpen(!open)}><Sparkles size={16}/>{open?'Recolher materiais':'Abrir materiais e assistente'}</button></div>
 {open&&<div className="cap-content"><div className="cap-actions"><button type="button" className="ps-button" disabled={locked} onClick={onPhotos}>Adicionar fotos do imóvel</button><label className={'ps-button cap-upload'+(locked?' is-disabled':'')}><Upload size={16}/>Anexar documentos<input ref={input} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" multiple disabled={locked} onChange={e=>void upload(Array.from(e.target.files||[]))}/></label></div><p className="pc-help">Título e cidade abrem a ficha. Documentos ficam privados e também aparecem em Documentos. Até 2 MB por arquivo.</p>
 {!!documents.length&&<div className="cap-materials"><strong>Documentos desta ficha · selecione até cinco</strong>{documents.map(d=><div key={d.id}><label><input type="checkbox" disabled={locked||!selectedDocs.includes(d.id)&&selectedDocs.length>=5} checked={selectedDocs.includes(d.id)} onChange={e=>setSelectedDocs(old=>e.target.checked?[...old,d.id]:old.filter(id=>id!==d.id))}/><FileText size={15}/><span>{d.title}<small>Privado · {d.status==='approved'?'Conferido pela equipe':'Aguardando conferência'}</small></span></label><a href={'/api/operations/documents/'+d.id+'/content'} target="_blank" rel="noreferrer" aria-label={'Abrir documento '+d.title}><ArrowUpRight size={16}/></a></div>)}</div>}
 <label className="cap-context">O que você já sabe?<textarea rows={3} maxLength={6000} disabled={locked} value={context} onChange={e=>setContext(e.target.value)} placeholder="Cole as informações recebidas: localização, áreas, valores e características. Aponte o que precisa ser confirmado."/></label>
 <p className="cap-disclosure">Ao analisar, as fotos da ficha, os documentos selecionados e este relato são enviados à OpenAI. A extração sugere dados e aponta divergências; não consulta débitos, multas ou cartórios e não aprova a documentação.</p>
 <button type="button" className="ps-button ps-button--primary" disabled={locked||(!selectedDocs.length&&!item?.photos.length&&!context.trim())} onClick={()=>void analyze()}><Sparkles size={16}/>{working?'Processando…':'Extrair dados e apontar pendências'}</button>
 {error&&<p className="pt-error" role="alert">{error}</p>}{notice&&<p className="pc-help" role="status">{notice}</p>}
 {result&&<section className="cap-review"><h3>Confira antes de aplicar.</h3><p>{result.summary}</p>{stale&&<p className="pt-error">A ficha foi salva depois desta análise. Analise novamente para aplicar sugestões.</p>}{result.fields.length?<div className="cap-suggestions">{result.fields.map(f=><label key={f.key}><input type="checkbox" disabled={locked||stale} checked={selected.includes(f.key)} onChange={e=>setSelected(old=>e.target.checked?[...old,f.key]:old.filter(key=>key!==f.key))}/><span><strong>{captureFields[f.key]}</strong><b>{f.value}</b><small>Atual: {String(draft[f.key]??'')||'Não informado'} · Confiança de leitura: {({high:'alta',medium:'média',low:'baixa'})[f.confidence]}</small><small>{sourceName(f.sourceId)} · {f.reference}</small></span></label>)}</div>:<p>Nenhum campo adicional pôde ser extraído com referência suficiente.</p>}
 {!!result.fields.length&&<button type="button" className="ps-button ps-button--primary" disabled={locked||stale||!selected.length} onClick={apply}><Check size={16}/>Aplicar {selected.length} sugestões ao rascunho</button>}{dirty&&<p className="pc-help">O rascunho tem alterações para salvar.</p>}
 {(result.findings.length>0||result.pending.length>0)&&<details className="cap-findings" open><summary>Pontos para conferir · uso interno</summary>{result.findings.map((f,i)=><article key={i}><strong>{f.status==='conflict'?'Divergência':f.status==='missing'?'Falta informação':'Consta no material'} · {f.title}</strong><p>{f.detail}</p><small>{sourceName(f.sourceId)}</small></article>)}{!!result.pending.length&&<ul>{result.pending.map((p,i)=><li key={i}>{p}</li>)}</ul>}</details>}</section>}
 </div>}</section>;
}
