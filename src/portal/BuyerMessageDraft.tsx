import {useState} from 'react';
import {Copy,MessageCircle} from 'lucide-react';
import {buyerMessageDraft,buyerMessageKinds} from '../../shared/buyer-messages.mjs';
import type {BuyerProfile} from '../../shared/buyer-qualification.mjs';

export default function BuyerMessageDraft({profile,lead,matches}:{profile:BuyerProfile;lead:any;matches:any[]}){
 const [kind,setKind]=useState('discovery'),[text,setText]=useState(''),[copied,setCopied]=useState(false),[error,setError]=useState('');
 const allowed=profile.contactPermission==='granted'&&!['won','lost'].includes(lead.status);
 function prepare(value:string){setKind(value);setText(buyerMessageDraft({kind:value,profile,lead,matches,origin:window.location.origin}));setCopied(false);setError('');}
 return <details className="buyer-message-draft"><summary><MessageCircle size={16}/> Preparar próximo contato</summary><p>Rascunho para a conversa em andamento. Revise, copie e envie pelo canal combinado. Copiar não registra um envio nem ativa uma sequência.</p>{!allowed?<p className="buyer-permission">{profile.contactPermission==='declined'?'Contato suspenso. Respeite a preferência registrada.':profile.contactPermission!=='granted'?'Confirme e registre a autorização de atendimento antes de preparar uma abordagem.':'Este atendimento está encerrado.'}</p>:<><label>Objetivo<select value={kind} onChange={e=>prepare(e.target.value)}>{Object.entries(buyerMessageKinds).map(([value,label])=><option value={value} key={value} disabled={value==='selection'&&!matches.length}>{label}</option>)}</select></label><button type="button" className="ps-button" onClick={()=>prepare(kind)}>Preparar rascunho</button>{text&&<><label>Mensagem para revisar<textarea rows={7} value={text} onChange={e=>{setText(e.target.value);setCopied(false);}}/></label><button type="button" className="ps-button" onClick={async()=>{try{await navigator.clipboard.writeText(text);setCopied(true);}catch{setError('Selecione o texto acima para copiar.');}}}><Copy size={15}/>{copied?'Copiado':'Copiar mensagem'}</button>{error&&<p role="status">{error}</p>}</>}</>}</details>;
}
