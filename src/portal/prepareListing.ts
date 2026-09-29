import {api,type CaseDetails} from './api';
import type {Listing} from './listingModel';
export type Preparation={summary:string;description:string;features:string[];highlights:string[];pending:string[];photos:{id:string;room:string;caption:string;observation:string}[]};
export async function prepareListing(item:Listing){
 const dossier=await api<CaseDetails>('/evaluations/'+item.id),requestId=crypto.randomUUID();
 const response=await api<{runs:{id:string;status:string;stale?:boolean;error?:string;result?:Preparation}[]}>('/intelligence/analyses','POST',{requestId,caseId:item.id,caseVersion:dossier.evaluation.version,task:'atendimento',context:'Organizar fotos e preparar o anúncio para o OK final.',prepareListing:true});
 const run=response.runs.find(r=>r.id===requestId);
 if(run?.stale)throw Error('O cadastro mudou durante a análise. Reabra o imóvel antes de preparar novamente.');
 if(!run?.result||run.status!=='completed')throw Error(run?.error||'A preparação não foi concluída. As fotos continuam salvas.');
 const result=run.result;
 if(!Array.isArray(result.photos)||result.photos.length!==item.photos.length||new Set(result.photos.map(p=>p.id)).size!==item.photos.length)throw Error('A organização ficou incompleta. A galeria original foi preservada.');
 const photos=result.photos.map(p=>{const original=item.photos.find(photo=>photo.id===p.id);if(!original)throw Error('A galeria mudou. Reabra o cadastro.');return {id:p.id,room:original.room||p.room,caption:original.caption||p.caption};});
 // Keep the operator's existing editorial text. New drafts are filled automatically.
 const draft={...item.draft,description:item.draft.description.trim()?item.draft.description:result.description,features:item.draft.features.trim()?item.draft.features:result.features.join('\n'),reasons:item.draft.reasons.trim()?item.draft.reasons:result.highlights.join('\n')};
 const listing=await api<Listing>('/listings/'+item.id,'PATCH',{version:item.version,draft,photos});
 return {listing,result};
}
