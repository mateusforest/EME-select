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
 const photoBlockers=item.blockers.filter(text=>/foto|resolução/i.test(text));
 const contentBlockers=item.blockers.filter(text=>!/foto|resolução|curadoria/i.test(text));
 const approved=item.stage==='Entrada aprovada';
 const recommended=item.photos.filter(photo=>!photoPublicationIssue(photo)&&photoQualityIssue(photo)).length;
 async function openCuration(){setLoading(true);setError('');try{setDetail(await api<CaseDetails>('/evaluations/'+item.id));}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 async function refresh(updated:CaseDetails){setDetail(updated);setLoading(true);setError('');try{onRefresh(await api<Listing>('/listings/'+item.id));}catch(e){setError('A decisão foi salva, mas não foi possível atualizar o anúncio. Clique em Atualizar conferência antes de publicar.');}finally{setLoading(false);}}
 async function reload(){setLoading(true);setError('');try{onRefresh(await api<Listing>('/listings/'+item.id));setDetail(await api<CaseDetails>('/evaluations/'+item.id));}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 return <section className="ps-card pl-publish">
  <span className="ps-overline">REVISAR E PUBLICAR</span><h2>{item.published?'Seu anúncio está publicado.':'Vamos colocar seu anúncio no ar.'}</h2>
  <p className="pc-help">Confira os três pontos abaixo. Você pode concluir a curadoria nesta tela e publicar em seguida.</p>
  {dirty?<div className="pl-pending" role="status"><strong>Salve as alterações no botão acima.</strong><p>A conferência abaixo usa a última versão salva.</p></div>:<>
   <div className="pl-publication-checks">
    <div><strong>{!contentBlockers.length&&<Check size={17}/>}Dados e apresentação</strong>{contentBlockers.length?<><ul>{contentBlockers.map(text=><li key={text}>{text}</li>)}</ul><button className="ps-text-button" onClick={()=>onStep(/descr|diferenc/i.test(contentBlockers[0])?2:1)}>Completar informações<ArrowRight size={16}/></button></>:<p>Informações necessárias preenchidas.</p>}</div>
    <div><strong>{!photoBlockers.length&&<Check size={17}/>}Fotografias</strong>{photoBlockers.length?<><p>{item.photos.length?'Algumas fotos precisam ser substituídas ou revistas.':'Adicione pelo menos uma foto do imóvel.'}</p><details><summary>Ver o que ajustar ({photoBlockers.length})</summary><ul>{photoBlockers.map(text=><li key={text}>{text}</li>)}</ul></details><button className="ps-text-button" onClick={()=>onStep(3)}>Revisar fotos<ArrowRight size={16}/></button></>:<p>{item.photos.length} {item.photos.length===1?'foto pronta':'fotos prontas'} para o site. Legendas e grupos são opcionais.</p>}{recommended>0&&<small>Fotos de maior definição podem melhorar a apresentação. Isso não impede a publicação.</small>}</div>
    <div><strong>{approved&&<Check size={17}/>}Curadoria</strong><p>{approved?'Entrada aprovada.':'Falta concluir a avaliação e a aprovação de entrada.'}</p>{!detail&&<button className="ps-button" disabled={busy||loading} onClick={openCuration}>{loading?'Abrindo…':approved?'Consultar curadoria':'Concluir curadoria aqui'}<ArrowRight size={16}/></button>}</div>
   </div>
   {detail&&<div className="pl-inline-curation"><CurationPanel key={item.id} detail={detail} user={user} onSaved={refresh}/></div>}
  </>}
  {error&&<div role="alert" className="pt-error">{error}<button className="ps-button" disabled={dirty||loading||busy} onClick={reload}>Atualizar conferência</button></div>}
  <div className="pl-publication-final">
   <a className="ps-button" href={'/portalselect/previa/'+item.id} target="_blank" rel="noopener noreferrer">Conferir prévia salva<ExternalLink size={15}/></a>
   {user.role==='admin'?<>{!item.published&&<label className="pl-confirm"><input type="checkbox" checked={confirmed} disabled={dirty||busy||loading} onChange={e=>onConfirm(e.target.checked)}/><span>Revisei o anúncio e confirmo a autorização para divulgar estas informações e fotografias.</span></label>}
   <button className="ps-button ps-button--primary" disabled={busy||loading||!!error||dirty||(!item.published&&(!confirmed||!!item.blockers.length))} onClick={()=>onPublish(item.published?'unpublish':'publish')}>{busy?'Aguarde…':item.published?'Retirar do catálogo':'Publicar anúncio'}</button>
   {!item.published&&<p className="pc-help" role="status">{dirty?'Salve as alterações para continuar.':item.blockers.length?'Conclua os pontos indicados acima para liberar a publicação.':!confirmed?'Tudo pronto. Confirme a autorização acima e publique.':'Tudo pronto para publicar.'}</p>}</>:<p className="pc-help">Depois da curadoria, um administrador confirma a autorização e publica o anúncio.</p>}
   {item.published&&<a className="ps-text-button" href={'/#/imovel/'+item.id} target="_blank" rel="noopener noreferrer">Abrir anúncio<ExternalLink size={15}/></a>}
  </div>
  <details className="pl-publication-note"><summary>O que acontece se eu alterar o anúncio?</summary><p>Alterar dados ou fotos retira a versão publicada e exige nova conferência da curadoria. A prévia sempre usa a versão salva.</p></details>
 </section>;
}
