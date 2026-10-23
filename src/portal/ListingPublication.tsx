import {confirmAction} from '../notices';
import {useState} from 'react';
import {ArrowRight,Check,ExternalLink} from 'lucide-react';
import {api,type CaseDetails,type TeamUser} from './api';
import CurationPanel from './CurationPanel';
import type {Listing} from './listingModel';
import {photoQualityIssue,photoPublicationIssue} from '../../shared/photo-policy.mjs';

export default function ListingPublication({item,user,dirty,busy,confirmed,onConfirm,onRefresh,onStep,onPublish}:{
 item:Listing;user:TeamUser;dirty:boolean;busy:boolean;confirmed:boolean;
 onConfirm:(value:boolean)=>void;onRefresh:(value:Listing)=>void;onStep:(step:number)=>void;onPublish:(action:'publish'|'unpublish')=>void;
}) {
 const [detail,setDetail]=useState<CaseDetails|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const blockers=item.blockers;
 const photoBlockers=blockers.filter(text=>/foto|resolução/i.test(text));
 const contentBlockers=blockers.filter(text=>!/foto|resolução|curadoria/i.test(text));
 const approved=item.published;
 const recommended=item.photos.filter(photo=>!photoPublicationIssue(photo)&&photoQualityIssue(photo)).length;
 async function openCuration(){setLoading(true);setError('');try{setDetail(await api<CaseDetails>('/evaluations/'+item.id));}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 async function refresh(updated:CaseDetails){setDetail(updated);setLoading(true);setError('');try{onRefresh(await api<Listing>('/listings/'+item.id));}catch(e){setError('A decisão foi salva, mas não foi possível atualizar o anúncio. Clique em Atualizar conferência antes de publicar.');}finally{setLoading(false);}}
 async function reload(){setLoading(true);setError('');try{onRefresh(await api<Listing>('/listings/'+item.id));setDetail(await api<CaseDetails>('/evaluations/'+item.id));}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 return <section className="ps-card pl-publish">
  <span className="ps-overline">REVISAR E PUBLICAR</span><h2>{item.published?(item.hasUnpublishedChanges?'Atualização pronta para sua revisão.':'Seu anúncio está no ar.'):'Confira e publique.'}</h2>
  <p className="pc-help">A prévia mostra o rascunho salvo. Seu OK publica esta versão; a curadoria pode continuar separadamente. Quando há um anúncio no ar, ele permanece disponível durante a edição.</p>
  {dirty?<div className="pl-pending" role="status"><strong>Salve as alterações no botão acima.</strong><p>A conferência abaixo usa a última versão salva.</p></div>:<>
   <div className="pl-publication-checks">
    <div><strong>{!contentBlockers.length&&<Check size={17}/>}Dados e apresentação</strong>{contentBlockers.length?<><ul>{contentBlockers.map(text=><li key={text}>{text}</li>)}</ul><button className="ps-text-button" onClick={()=>onStep(/descr|diferenc/i.test(contentBlockers[0])?2:1)}>Completar informações<ArrowRight size={16}/></button></>:<p>Informações necessárias preenchidas.</p>}</div>
    <div><strong>{!photoBlockers.length&&<Check size={17}/>}Fotografias</strong>{photoBlockers.length?<><p>{item.photos.length?'Algumas fotos precisam ser substituídas ou revistas.':'Adicione pelo menos uma foto do imóvel.'}</p><details><summary>Ver o que ajustar ({photoBlockers.length})</summary><ul>{photoBlockers.map(text=><li key={text}>{text}</li>)}</ul></details><button className="ps-text-button" onClick={()=>onStep(3)}>Revisar fotos<ArrowRight size={16}/></button></>:<p>{item.photos.length ? `${item.photos.length} foto(s) para o site.` : 'Sem fotos por enquanto. Você pode adicioná-las depois.'} Legendas e grupos são opcionais.</p>}{recommended>0&&<small>Fotos de maior definição podem melhorar a apresentação. Isso não impede a publicação.</small>}</div>
    <div><strong>Seu OK final</strong><p>{approved?'Publicação aprovada pela equipe.':'A apresentação fica pronta para sua conferência. Confirme abaixo para aprovar e publicar.'}</p><details><summary>Curadoria e documentação · acompanhamento opcional</summary>{!detail&&<button className="ps-button" disabled={busy||loading} onClick={openCuration}>{loading?'Abrindo…':'Consultar avaliação'}<ArrowRight size={16}/></button>}{detail&&<CurationPanel key={item.id} detail={detail} user={user} onSaved={refresh}/>}</details></div>
   </div>

  </>}
  {error&&<div role="alert" className="pt-error">{error}<button className="ps-button" disabled={dirty||loading||busy} onClick={reload}>Atualizar conferência</button></div>}
  <div className="pl-publication-final">
   <a className="ps-button" href={'/acesso-select/equipe/previa/'+item.id} target="_blank" rel="noopener noreferrer">Conferir prévia salva<ExternalLink size={15}/></a>
   {user.role==='admin'?<>{(!item.published||item.hasUnpublishedChanges)&&<label className="pl-confirm"><input type="checkbox" checked={confirmed} disabled={dirty||busy||loading} onChange={e=>onConfirm(e.target.checked)}/><span>Revisei o anúncio e confirmo a autorização para divulgar estas informações e fotografias.</span></label>}
   <div className="pl-publish-actions">{(!item.published||item.hasUnpublishedChanges)&&<button className="ps-button ps-button--primary" disabled={busy||loading||!!error||dirty||!confirmed||!!blockers.length} onClick={()=>onPublish('publish')}>{busy?'Aguarde…':item.published?'Aprovar e publicar atualização':'Aprovar e publicar'}</button>}{item.published&&<button className="ps-text-button pl-secondary-withdraw" disabled={busy||loading||dirty} onClick={async()=>{if(await confirmAction('Retirar este anúncio do site? O cadastro e os materiais serão preservados.'))onPublish('unpublish');}}>Retirar anúncio do site</button>}</div>
   {(!item.published||item.hasUnpublishedChanges)&&<p className="pc-help" role="status">{dirty?'Salve as alterações para continuar.':blockers.length?'Conclua os pontos indicados acima para liberar a publicação.':!confirmed?'Tudo pronto. Confirme a autorização acima e publique.':'Tudo pronto para publicar.'}</p>}</>:<p className="pc-help">Um administrador confere a prévia e dá o OK final para publicar.</p>}
   {item.published&&<a className="ps-text-button" href={'/#/imovel/'+item.id} target="_blank" rel="noopener noreferrer">Abrir anúncio<ExternalLink size={15}/></a>}
  </div>
  <details className="pl-publication-note"><summary>O que acontece se eu alterar o anúncio?</summary><p>Alterações ficam no rascunho. A versão aprovada e suas fotos continuam no site até você publicar a atualização. Reabrir ou revisar a curadoria também preserva o anúncio. Para tirá-lo do ar, use Retirar anúncio do site.</p></details>
 </section>;
}
