import {useEffect,useState} from 'react';
import {ArrowUpRight,Link2,RefreshCw} from 'lucide-react';
import {api} from './api';
type Lead={id:string;name:string;city:string;property_type:string;asking_cents:number};
type Catalog={id:string;title:string;city:string;price_cents:number;offer_url:string};
export default function SwitchPortfolio({onConnected}:{onConnected:()=>void}){
 const [catalog,setCatalog]=useState<Catalog[]>([]),[leads,setLeads]=useState<Lead[]>([]);
 const [selected,setSelected]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){try{const result=await api<{catalog:Catalog[];leads:Lead[]}>('/switch/portfolio');setCatalog(result.catalog);setLeads(result.leads);}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();},[]);
 async function connect(){setBusy(true);setError('');setNotice('');try{await api('/switch/portfolio/leads','POST',{leadId:selected,reviewConfirmed:confirmed});setNotice('Contato conectado em análise. Confira a intenção e as condições antes de qualificar.');setSelected('');setConfirmed(false);await load();onConnected();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="ps-card sx-portfolio">
  <div className="sx-match-heading"><div><span className="ps-overline">SUA CARTEIRA, CONECTADA</span><h2>Imóveis e contatos da EME</h2><p>O Switch consulta os anúncios públicos de venda com valor informado. Reservados, arquivados e imóveis sem preço ficam fora dos envios automáticos.</p></div><button className="ps-button" onClick={()=>void load()}><RefreshCw size={16}/>Atualizar</button></div>
  {error&&<p className="pt-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <details className="sx-partner-import"><summary>{catalog.length} imóveis da carteira disponíveis para cruzamento</summary><div className="sx-portfolio-items">{catalog.map(p=><a key={p.id} href={p.offer_url} target="_blank" rel="noreferrer"><span>{p.title}<small>{p.city} · {(p.price_cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</small></span><ArrowUpRight size={16}/></a>)}{!catalog.length&&<p>Nenhum anúncio público de venda com preço disponível neste momento.</p>}</div></details>
  <details className="sx-partner-import"><summary><Link2 size={16}/>Conectar um contato do funil</summary><div className="sx-fields">
   <label>Contato com perfil de compra e autorização<select value={selected} onChange={e=>{setSelected(e.target.value);setConfirmed(false);}}><option value="">Selecione um contato</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name} · {l.city} · {l.property_type}</option>)}</select></label>
   {!leads.length&&<p className="sx-info">Nenhum contato elegível ainda. Complete região, tipo, orçamento e autorização em Leads e entradas.</p>}
   <label className="sx-import-consent"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Confirmei com esta pessoa o uso de seu perfil para buscar conexões no M Switch.</label>
   <button className="ps-button ps-button--primary" disabled={!selected||!confirmed||busy} onClick={()=>void connect()}>{busy?'Conectando…':'Conectar para revisão'}<Link2 size={16}/></button>
  </div><p className="sx-info">O responsável permanece o mesmo. A conexão não habilita avisos de novidades nem altera a distribuição de leads.</p></details>
 </section>;
}
