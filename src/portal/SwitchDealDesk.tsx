import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {ArrowUpRight,CheckCircle2,Copy,FileSignature,RefreshCw} from 'lucide-react';
import {api} from './api';
import {switchDealQuote} from '../../shared/switch-deals.mjs';
import type {SwitchProfessional} from './SwitchProfessionalRoster';

type Match={kind:string;assetId:string;investorId:string};
type Request={id:string;name:string;kind:string;asking_cents:number;min_acceptable_cents:number|null;city:string;property_type:string};
type Partner={id:string;title:string;price_cents:number};
type Deal={id:string;public_ref:string;source_kind:string;source_id:string;demand_id:string;teaser_city:string;teaser_type:string;sale_price_cents:number;brokerage_bps:number;switch_share_bps:number;status:string;recipient_name:string;recipient_business:string;recipient_creci:string;recipient_phone:string;contract_reference:string;actual_sale_cents:number|null;received_cents:number;version:number;created_at:string};
const money=(v:number)=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const pct=(bps:number)=>(bps/100).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
const labels:Record<string,string>={prepared:'Aguardando interesse',acknowledged:'Interesse recebido',contracted:'Contrato conferido',introduced:'Conexão autorizada',closed:'Venda registrada',paid:'Comissão recebida',cancelled:'Cancelada'};
const draftEmpty={sourceKind:'partner_offer',sourceId:'',demandId:'',professionalId:'',salePrice:'',brokeragePct:'5',switchSharePct:'30'};
export default function SwitchDealDesk({matches,requests,offers,professionals}:{matches:Match[];requests:Request[];offers:Partner[];professionals:SwitchProfessional[]}){
 const [draft,setDraft]=useState(draftEmpty),[deals,setDeals]=useState<Deal[]>([]);
 const [link,setLink]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [contract,setContract]=useState(''),[license,setLicense]=useState(false),[actual,setActual]=useState(''),[received,setReceived]=useState('');
 const quote=useMemo(()=>{try{return switchDealQuote({
  salePriceCents:Math.round(Number(draft.salePrice)*100),
  brokerageBps:Math.round(Number(draft.brokeragePct)*100),
  switchShareBps:Math.round(Number(draft.switchSharePct)*100)
 });}catch{return null;}},[draft]);
 async function refresh(){
   try{const data=await api<{deals:Deal[]}>('/switch/deals');setDeals(data.deals);}catch(e){setError((e as Error).message);}
 }
 useEffect(()=>{void refresh();},[]);
 function select(match:Match){
   const partner=offers.find(o=>o.id===match.assetId),asset=requests.find(r=>r.id===match.assetId);
   if(!partner&&!asset)return;
   setDraft({...draftEmpty,sourceKind:partner?'partner_offer':'switch_request',sourceId:match.assetId,demandId:match.investorId,
    salePrice:String((partner?partner.price_cents:Math.max(asset!.asking_cents,asset!.min_acceptable_cents||0))/100)});
   setLink('');setNotice('');setError('');
   document.getElementById('sx-create-invite')?.scrollIntoView({block:'nearest',behavior:'smooth'});
 }
 async function create(event:FormEvent){
   event.preventDefault();if(busy||!quote)return;
   setBusy(true);setError('');setNotice('');setLink('');
   try{
    const result=await api<{deal:Deal;invitePath:string;queued?:boolean;notice?:string}>('/switch/deals','POST',{
      sourceKind:draft.sourceKind,sourceId:draft.sourceId,demandId:draft.demandId,
      ...(draft.professionalId?{professionalId:draft.professionalId}:{}),
      salePriceCents:quote.salePriceCents,brokerageBps:quote.brokerageBps,
      switchShareBps:quote.switchShareBps,expiresDays:7
    });
    setLink(location.origin+result.invitePath);
    setNotice(result.notice||'Convite gerado. Nenhum contato foi divulgado.');
    await refresh();
   }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function advance(deal:Deal,action:string){
   if(busy)return;setBusy(true);setError('');setNotice('');
   try{
    const data:Record<string,unknown>={version:deal.version,action};
    if(action==='contract'){data.contractReference=contract;data.licenseChecked=license;}
    if(action==='close')data.actualSaleCents=Math.round(Number(actual)*100);
    if(action==='paid')data.receivedCents=Math.round(Number(received)*100);
    await api('/switch/deals/'+deal.id,'PATCH',data);
    setNotice('Etapa registrada. O histórico permanece no servidor.');
    setContract('');setLicense(false);setActual('');setReceived('');
    await refresh();
   }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="ps-card sx-deal-desk">
  <div className="sx-match-heading">
   <div><span className="ps-overline">M SWITCH / RESULTADO COMERCIAL</span><h2>Condições antes da conexão</h2>
    <p>Apresente uma oportunidade sem revelar nomes, contatos ou a referência original. Mostre a simulação da divisão da comissão; o interessado manifesta ciência, depois a equipe revisa CRECI e contrato antes de qualquer introdução.</p></div>
   <button className="ps-button" type="button" onClick={()=>void refresh()}><RefreshCw size={15}/>Atualizar</button>
  </div>
  <details className="sx-partner-import"><summary><ArrowUpRight size={16}/> Selecionar combinação verificada para preparar proposta</summary>
   <div className="sx-deal-matches">
    {matches.length===0?<p className="sx-info">Nenhuma combinação qualificada disponível.</p>:matches.map((m,index)=>{
     const a=offers.find(o=>o.id===m.assetId)||requests.find(r=>r.id===m.assetId);
     const b=requests.find(r=>r.id===m.investorId);
     return <button key={m.assetId+'-'+m.investorId+'-'+index} className="ps-button" onClick={()=>select(m)}>
      {('title' in (a||{})?(a as Partner).title:(a as Request|undefined)?.city||'Imóvel')+' → '+(b?.kind==='invest'?'Investidor':'Comprador')+' qualificado'}</button>;
    })}
   </div>
  </details>
  <form id="sx-create-invite" className="sx-editor" onSubmit={create}>
   <div className="sx-fields">
    <label>Origem<select value={draft.sourceKind} onChange={e=>setDraft(d=>({...d,sourceKind:e.target.value,sourceId:''}))}><option value="partner_offer">Carteira autorizada</option><option value="switch_request">Imóvel de proprietário</option></select></label>
    <label>Imóvel / oferta<select required value={draft.sourceId} onChange={e=>{const source=offers.find(x=>x.id===e.target.value)||requests.find(x=>x.id===e.target.value);const cents=source?('price_cents' in source?source.price_cents:source.asking_cents):0;setDraft(d=>({...d,sourceId:e.target.value,salePrice:cents?String(cents/100):''}));}}>
      <option value="">Selecione</option>{draft.sourceKind==='partner_offer'?offers.map(o=><option key={o.id} value={o.id}>{o.title}</option>):requests.filter(r=>['sell','swap'].includes(r.kind)).map(r=><option key={r.id} value={r.id}>{r.city} · {r.name}</option>)}</select></label>
    <label>Comprador / investidor interessado<select required value={draft.demandId} onChange={e=>setDraft(d=>({...d,demandId:e.target.value}))}><option value="">Selecione</option>{requests.filter(r=>['buy','swap','invest'].includes(r.kind)).map(r=><option key={r.id} value={r.id}>{r.name} · {r.city}</option>)}</select></label>
    <label>Valor comercial de referência (R$)<input required type="number" min="10000" step="1000" value={draft.salePrice} onChange={e=>setDraft(d=>({...d,salePrice:e.target.value}))}/></label>
    <label>Corretagem estimada (%)<input required type="number" min=".01" max="10" step=".01" value={draft.brokeragePct} onChange={e=>setDraft(d=>({...d,brokeragePct:e.target.value}))}/></label>
    <label>Participação M Switch sobre a corretagem (%)<input required type="number" min=".01" max="100" step=".01" value={draft.switchSharePct} onChange={e=>setDraft(d=>({...d,switchSharePct:e.target.value}))}/></label>
   </div>
   <label>Enviar convite a um profissional habilitado e com opt-in (opcional)<select value={draft.professionalId} onChange={e=>setDraft(d=>({...d,professionalId:e.target.value}))}>
     <option value="">Somente gerar link privado</option>{professionals.filter(p=>p.status==='verified'&&p.whatsapp_opt_in).map(p=><option key={p.id} value={p.id}>{p.name} · {p.city} · {p.property_type}</option>)}
    </select></label>
   {quote&&<div className="sx-fee-preview"><span>Corretagem bruta estimada <strong>{money(quote.grossCommissionCents)}</strong></span><span>M Switch ({pct(quote.switchShareBps)} da comissão) <strong>{money(quote.switchShareCents)}</strong></span><span>Parceiro <strong>{money(quote.partnerShareCents)}</strong></span></div>}
   <p className="sx-info">Estimativa, não cobrança. As partes precisam ter habilitação e instrumento escrito de participação antes de serem apresentadas; o preço final e o recebimento real podem mudar.</p>
   <button className="ps-button ps-button--primary" disabled={busy||!quote||!draft.sourceId||!draft.demandId}>Gerar convite com condições <FileSignature size={16}/></button>
   {link&&<div className="sx-link"><label>Link privado gerado — copie agora<input readOnly aria-label="Link de convite" value={link}/></label><button type="button" className="ps-button" onClick={()=>{void navigator.clipboard.writeText(link).then(()=>setNotice('Link copiado.')).catch(()=>setError('Copie o endereço manualmente.'));}}><Copy size={15}/>Copiar</button></div>}
  </form>
  <div className="sx-deal-list"><h3>Oportunidades comerciais · {deals.length}</h3>{deals.length===0?<p className="sx-info">Nenhuma condição comercial gerada ainda.</p>:deals.map(deal=>{
   const q=switchDealQuote({salePriceCents:Number(deal.sale_price_cents),brokerageBps:deal.brokerage_bps,switchShareBps:deal.switch_share_bps});
   return <article key={deal.id} className="sx-deal-row">
    <div><span className="ps-overline">REFERÊNCIA {deal.public_ref}</span><h4>{deal.teaser_type} · {deal.teaser_city}</h4>
    <p>Venda referência {money(Number(deal.sale_price_cents))} · Comissão {pct(deal.brokerage_bps)} · Participação M Switch {pct(deal.switch_share_bps)} ({money(q.switchShareCents)} estimados)</p>
    <p><strong>{labels[deal.status]||deal.status}</strong>{deal.recipient_name?' · Interessado: '+deal.recipient_name:''}</p>
    {deal.recipient_creci&&<p>CRECI informado para conferência: {deal.recipient_creci}</p>}
    {deal.status==='contracted'&&<p>Contrato informado: {deal.contract_reference}</p>}
    {deal.status==='paid'&&<p>Recebimento declarado: {money(Number(deal.received_cents))}</p>}
    </div>
    <div className="sx-deal-actions">
     {deal.status==='acknowledged'&&<><label>Referência do contrato escrito assinado<input value={contract} onChange={e=>setContract(e.target.value)} placeholder="Arquivo/assinatura verificados"/></label><label className="sx-check"><input type="checkbox" checked={license} onChange={e=>setLicense(e.target.checked)}/> Conferi CRECI e condições assinadas</label><button className="ps-button" disabled={busy||!license||contract.length<8} onClick={()=>void advance(deal,'contract')}>Registrar contrato conferido</button></>}
     {deal.status==='contracted'&&<button className="ps-button" disabled={busy} onClick={()=>void advance(deal,'introduce')}>Autorizar conexão de partes <CheckCircle2 size={15}/></button>}
     {deal.status==='introduced'&&<><label>Valor efetivo do negócio (R$)<input type="number" min="10000" step="1000" value={actual} onChange={e=>setActual(e.target.value)}/></label><button className="ps-button" disabled={busy||!actual} onClick={()=>void advance(deal,'close')}>Registrar fechamento</button></>}
     {deal.status==='closed'&&<><label>Participação recebida (R$)<input type="number" min="0" step=".01" value={received} onChange={e=>setReceived(e.target.value)}/></label><button className="ps-button" disabled={busy||!received} onClick={()=>void advance(deal,'paid')}>Registrar recebimento comprovado</button></>}
     {!['paid','cancelled'].includes(deal.status)&&<button type="button" className="ps-text-button" disabled={busy} onClick={()=>void advance(deal,'cancel')}>Cancelar oportunidade</button>}
    </div>
   </article>;
  })}</div>
  {notice&&<p role="status" className="sx-info">{notice}</p>}{error&&<p role="alert" className="pt-error">{error}</p>}
 </section>;
}
