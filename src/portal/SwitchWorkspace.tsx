import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {ArrowUpRight,Check,RefreshCw,Search,ShieldCheck,Sparkles} from 'lucide-react';
import {api,type TeamUser,type Assignee} from './api';
import SwitchPartnerImport from './SwitchPartnerImport';
import SwitchProfessionalRoster,{type SwitchProfessional} from './SwitchProfessionalRoster';
import SwitchReadinessPanel from './SwitchReadinessPanel';
import SwitchDealDesk from './SwitchDealDesk';
import './switch-workspace.css';

type Kind='sell'|'swap'|'buy'|'invest';
type Status='new'|'reviewing'|'qualified'|'negotiating'|'closed'|'archived';
type Request = {
  id:string;kind:Kind;name:string;phone:string;city:string;property_type:string;
  asking_cents:number;target_city:string;target_budget_cents:number|null;
  notes:string;source:string;status:Status;owner_id:string|null;contact_opt_in:boolean;
  updates_opt_in:boolean;ownership_reviewed:boolean;sharing_authorized:boolean;
  funds_verified:boolean;demand_reviewed:boolean;min_acceptable_cents:number|null;review_note:string;version:number;created_at:string;
};
type PartnerOffer={id:string;partner:string;ref:string;title:string;city:string;property_type:string;price_cents:number;offer_url:string;available:boolean};
type Match = {kind:'investor'|'upgrade-target'|'partner-offer'|'internal-offer';assetId:string;investorId:string;score:number;stage:string;requiresBrokerReview:boolean;reasons:string[];flags:string[]};
type Snapshot={requests:Request[];admin:boolean};
const statuses:Record<Status,string>={new:'Nova entrada',reviewing:'Em análise',qualified:'Qualificada',negotiating:'Em negociação',closed:'Concluída',archived:'Arquivada'};
const kinds:Record<Kind,string>={sell:'Venda',swap:'Troca / upgrade',buy:'Compra',invest:'Investimento'};
const brl=(value:number|null|undefined)=>value==null?'Não informado':(value/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
function SwitchEditor({item,admin,members,done}:{item:Request;admin:boolean;members:Assignee[];done:(value:Request)=>void}){
 const [status,setStatus]=useState<Status>(item.status),[ownerId,setOwnerId]=useState(item.owner_id||'');
 const [reviewed,setReviewed]=useState(item.ownership_reviewed),[share,setShare]=useState(item.sharing_authorized);
 const [verified,setVerified]=useState(item.funds_verified),[demandReviewed,setDemandReviewed]=useState(item.demand_reviewed);
 const [minimum,setMinimum]=useState(item.min_acceptable_cents!=null?String(item.min_acceptable_cents/100):'');
 const [note,setNote]=useState(item.review_note||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{
   const minimumCents=minimum.trim()?Math.round(Number(minimum)*100):null;
   if(admin&&['sell','swap'].includes(item.kind)&&minimumCents!==null&&(!Number.isSafeInteger(minimumCents)||minimumCents<10000_00))throw Error('Informe o valor mínimo em reais, a partir de R$ 10 mil.');
   const payload={version:item.version,status,note,...(admin?{
     ownerId:ownerId||null,...(item.kind==='invest'?{fundsVerified:verified}:item.kind==='buy'?{demandReviewed}:{ownershipReviewed:reviewed,sharingAuthorized:share,minAcceptableCents:minimumCents})
   }: {})};
   const response=await api<{request:Request}>('/switch/'+item.id,'PATCH',payload);
   done(response.request);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <form className="sx-editor" onSubmit={submit}>
   <div className="sx-description"><strong>{item.name} · {kinds[item.kind]}</strong><span>{item.city} · {item.property_type} · {brl(item.asking_cents)}</span><p>{item.notes||'Sem observações.'}</p>{item.target_city&&<p>Procura em {item.target_city}{item.target_budget_cents?' · '+brl(item.target_budget_cents):''}</p>}
    <small>Recebida em {new Date(item.created_at).toLocaleString('pt-BR')} · Origem: {item.source}</small>
    <div><span>{item.contact_opt_in?'Contato solicitado':'Contato não autorizado'}</span><span>{item.updates_opt_in?' · Avisos autorizados':' · Sem autorização para avisos'}</span></div>
   </div>
   <div className="sx-fields">
    <label>Etapa<select value={status} onChange={e=>setStatus(e.target.value as Status)}>{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    {admin&&<label>Responsável<select value={ownerId} onChange={e=>setOwnerId(e.target.value)}><option value="">Fila da gestão</option>{members.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label>}
   </div>
   {admin&&<fieldset className="sx-verification"><legend><ShieldCheck size={15}/> Conferências da gestão</legend>
    {item.kind==='invest'?<label><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/> Capacidade declarada e identidade revisadas pela equipe</label>:item.kind==='buy'?<label><input type="checkbox" checked={demandReviewed} onChange={e=>setDemandReviewed(e.target.checked)}/> Confirmei diretamente com o comprador a intenção atual, o orçamento declarado e a forma de pagamento. Não constitui aprovação de crédito.</label>:<>
      <label><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/> Titularidade e situação do imóvel revisadas</label>
      <label><input type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)}/> Autorização específica de apresentação a investidores confirmada</label>
      <label>Valor mínimo aceito pelo proprietário (R$)<input type="number" min="10000" max="10000000000" step="1000" value={minimum} onChange={e=>setMinimum(e.target.value)} placeholder="Confirme com o proprietário"/></label>
    </>}
   </fieldset>}
   <label>Nota interna da equipe<textarea rows={3} maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Próximo passo, revisão, ressalvas…"/></label>
   {error&&<p className="pt-error" role="alert">{error}</p>}
   <button className="ps-button ps-button--primary" disabled={busy}>{busy?'Salvando…':'Salvar ficha'}<Check size={15}/></button>
   <p className="sx-info">Qualificar uma ficha não envia mensagens nem constitui oferta. A seleção de investidores exige revisão humana.</p>
 </form>;
}
export default function SwitchWorkspace({user}:{user:TeamUser}){
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[members,setMembers]=useState<Assignee[]>([]);
 const [offers,setOffers]=useState<PartnerOffer[]>([]);
 const [professionals,setProfessionals]=useState<SwitchProfessional[]>([]);
 const [matches,setMatches]=useState<Match[]>([]),[loading,setLoading]=useState(true),[matching,setMatching]=useState(false);
 const [selected,setSelected]=useState(''),[query,setQuery]=useState(''),[kind,setKind]=useState('all'),[error,setError]=useState('');
 async function load(){
  setLoading(true);setError('');
  try{
   const data=await api<Snapshot>('/switch');
   setSnapshot(data);setSelected(current=>data.requests.some(r=>r.id===current)?current:data.requests[0]?.id||'');
   if(user.role==='admin') {
    const people=await api<{members:Assignee[]}>('/assignees');
    setMembers(people.members);
    const inventory=await api<{offers:PartnerOffer[]}>('/switch/partners');
    setOffers(inventory.offers);
    const found=await api<{matches:Match[]}>('/switch/matches');
    setMatches(found.matches);
   }
  }catch(e){setError((e as Error).message);}finally{setLoading(false);}
 }
 useEffect(()=>{void load();},[]);
 const requests=snapshot?.requests||[];
 const visible=useMemo(()=>requests.filter(r=>(kind==='all'||r.kind===kind)&&
  (r.name+' '+r.city+' '+r.property_type+' '+r.phone).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))),[requests,kind,query]);
 const current=visible.find(r=>r.id===selected)||visible[0]||null;
 async function findMatches(){
  setMatching(true);setError('');
  try{const result=await api<{matches:Match[]}>('/switch/matches');setMatches(result.matches);}
  catch(e){setError((e as Error).message);}finally{setMatching(false);}
 }
 return <div className="sx-workspace">
   <div className="sx-actions"><a className="ps-button" href="/switch" target="_blank" rel="noreferrer">Abrir captação pública<ArrowUpRight size={16}/></a><button className="ps-button" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/>Atualizar</button></div>
   {error&&<p className="pt-error" role="alert">{error}</p>}
   <div className="sx-stats">{[
    ['Solicitações',requests.length],['Novas',requests.filter(r=>r.status==='new').length],
    ['Qualificadas',requests.filter(r=>r.status==='qualified').length],['Em negociação',requests.filter(r=>r.status==='negotiating').length]
   ].map(([label,value])=><div className="ps-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
   <div className="sx-main">
    <section className="ps-card sx-list"><div className="sx-filters"><label><Search size={16}/><input aria-label="Buscar solicitações" placeholder="Nome, região, tipo…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Filtrar operação" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">Todas</option><option value="swap">Trocas</option><option value="sell">Vendas</option><option value="buy">Compradores</option><option value="invest">Investidores</option></select></div>
     {loading&&!snapshot?<p role="status">Carregando solicitações…</p>:visible.length===0?<p className="sx-info">Nenhuma solicitação nesta seleção. Compartilhe o link de captação para receber as primeiras entradas.</p>:<div className="sx-items">{visible.map(r=><button type="button" key={r.id} className={'sx-item'+(r.id===current?.id?' is-active':'')} onClick={()=>setSelected(r.id)}><span><strong>{r.name}</strong><small>{kinds[r.kind]} · {r.city}</small></span><span className="sx-item-end"><b>{brl(r.asking_cents)}</b><small>{statuses[r.status]}</small></span></button>)}</div>}
    </section>
    <section className="ps-card sx-detail">{current?<SwitchEditor key={current.id+'-'+current.version} item={current} admin={user.role==='admin'} members={members} done={item=>{setSnapshot(s=>s?{...s,requests:s.requests.map(r=>r.id===item.id?item:r)}:s);void findMatches();}}/>:<p className="sx-info">Selecione uma solicitação para acompanhar.</p>}</section>
   </div>
   {user.role==='admin'&&<section className="ps-card sx-partner-card"><span className="ps-overline">OFERTA EM ESCALA</span><h2>Parceiros e inventário compartilhado</h2><p className="sx-info">{offers.length} ofertas de parceiros no painel, {offers.filter(o=>o.available).length} disponíveis conforme última atualização. A disponibilidade precisa ser reconfirmada em cada negociação.</p><SwitchPartnerImport onImported={()=>{void load();}}/></section>}
   {user.role==='admin'&&<SwitchReadinessPanel/>}
   {user.role==='admin'&&<SwitchProfessionalRoster changed={setProfessionals}/>}
   {user.role==='admin'&&<SwitchDealDesk matches={matches} requests={requests} offers={offers} professionals={professionals}/>}
   {user.role==='admin'&&<section className="ps-card sx-matches">
    <div className="sx-match-heading"><div><span className="ps-overline">M SWITCH / INTELIGÊNCIA COMERCIAL</span><h2>Cruzamentos de oportunidades</h2><p>Combinações sugeridas com base em cidade, tipo e orçamento. Apenas fichas qualificadas e autorizadas entram no cálculo.</p></div><button className="ps-button ps-button--primary" onClick={()=>void findMatches()} disabled={matching}>{matching?'Calculando…':'Cruzar investidores'}<Sparkles size={16}/></button></div>
    {!matches.length?<p className="sx-info">Nenhuma combinação disponível agora. Qualifique imóveis, pedidos de troca e investidores para gerar candidatos automaticamente; cada oportunidade exige análise humana.</p>:<div className="sx-match-grid">{matches.map(m=>{const asset=requests.find(x=>x.id===m.assetId),external=offers.find(x=>x.id===m.assetId),investor=requests.find(x=>x.id===m.investorId);return <article key={m.assetId+'-'+m.investorId}><span className="ps-overline">{m.kind==='investor'?'INVESTIDOR':m.kind==='upgrade-target'?'UPGRADE / DESTINO':m.kind==='partner-offer'?'CARTEIRA PARCEIRA':'COMPRA / IMÓVEL'} · CANDIDATO · {m.score}/100</span><h3>{external?.title||asset?.name||'Imóvel'} ↔ {investor?.name||(m.kind==='investor'?'Investidor':'Comprador')}</h3><p>{external?.city||asset?.city} · {external?.property_type||asset?.property_type} · Valor: {brl(external?.price_cents||asset?.min_acceptable_cents)}</p><p>{m.kind==='investor'?'Investidor:':'Comprador interessado:'} {investor?.city} · Orçamento informado: {brl(m.kind==='investor'||m.kind==='partner-offer'&&investor?.kind!=='swap'||m.kind==='internal-offer'?investor?.asking_cents:investor?.target_budget_cents)}</p>{m.flags.map(f=><small key={f}>{f}</small>)}{external&&<a className="ps-text-button" href={external.offer_url} target="_blank" rel="noreferrer">Conferir anúncio do parceiro<ArrowUpRight size={14}/></a>}<strong>Revisar antes de apresentar.</strong></article>;})}</div>}
   </section>}
 </div>;
}
