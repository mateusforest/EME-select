import {useEffect,useState} from 'react';
import {api} from './api';
type Material={id:string;filename:string;mime_type:string;created_at:string};
export default function WhatsAppMaterials({caseId}:{caseId:string}){
 const [source,setSource]=useState('');const [files,setFiles]=useState<Material[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;api<{materials:Material[];sourceText:string}>('/listings/'+caseId+'/whatsapp-materials').then(r=>{if(active){setFiles(r.materials);setSource(r.sourceText);}}).catch(()=>{if(active)setError('Não foi possível carregar os materiais recebidos pelo WhatsApp.');});return()=>{active=false;};},[caseId]);
 if(!files.length&&!error&&!source)return null;
 return <section className="ps-card"><h3>Materiais recebidos pelo WhatsApp</h3><p>Arquivos privados vinculados a este imóvel. Dados extraídos precisam de revisão.</p>{error&&<p role="alert">{error}</p>}<details><summary>Texto original recebido</summary><p style={{whiteSpace:'pre-wrap'}}>{source||'Nenhum texto adicional.'}</p></details><ul>{files.map(f=><li key={f.id}><a href={'/api/listings/'+caseId+'/whatsapp-materials/'+f.id} download>{f.filename}</a> · {new Date(f.created_at).toLocaleDateString('pt-BR')}</li>)}</ul></section>;
}
