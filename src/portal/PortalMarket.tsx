import {useEffect,useState} from 'react';
import {ExternalLink,TrendingUp,X} from 'lucide-react';

const series=[{id:432,label:'Selic meta',unit:'ao ano'},{id:13522,label:'IPCA',unit:'12 meses'}];
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const endpoint=(id:number)=>{
  const end=today(),start=new Date(end+'T12:00:00Z');start.setUTCFullYear(start.getUTCFullYear()-1);
  const br=(iso:string)=>iso.split('-').reverse().join('/');
  return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${id}/dados?formato=json&dataInicial=${br(start.toISOString().slice(0,10))}&dataFinal=${br(end)}`;
};
type Quote={value:number;date:string};
export default function PortalMarket(){
  const [quotes,setQuotes]=useState<Record<number,Quote>>({}),[pending,setPending]=useState(true),[expanded,setExpanded]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    const timer=setTimeout(()=>controller.abort(),10000);
    void Promise.all(series.map(async series=>{
      try{
        const response=await fetch(endpoint(series.id),{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
        if(!response.ok)return;
        const data=await response.json();
        const valid=Array.isArray(data)?data.filter(item=>typeof item?.data==='string'&&/^\d{2}\/\d{2}\/\d{4}$/.test(item.data)&&item.data.split('/').reverse().join('-')<=today()):[];
        valid.sort((a,b)=>a.data.split('/').reverse().join('-').localeCompare(b.data.split('/').reverse().join('-')));
        const item=valid.at(-1);
        if(!item||typeof item.valor!=='string'||!item.valor.trim()||!Number.isFinite(Number(item.valor))||!/^\d{2}\/\d{2}\/\d{4}$/.test(item.data))return;
        if(active)setQuotes(previous=>({...previous,[series.id]:{value:Number(item.valor),date:item.data}}));
      }catch{/* Keep unavailable values explicit; never substitute a fictional rate. */}
    })).finally(()=>{clearTimeout(timer);if(active)setPending(false);});
    return()=>{active=false;clearTimeout(timer);controller.abort();};
  },[]);
  useEffect(()=>{if(!expanded)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setExpanded(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[expanded]);
  return <div className="sh-market"><button className="sh-market-trigger" aria-label="Indicadores do mercado e fontes" aria-expanded={expanded} aria-controls="sh-market-details" onClick={()=>setExpanded(value=>!value)}><TrendingUp size={17}/>{series.map(series=><span key={series.id}><small>{series.label}{series.id===13522?' · 12m':''}</small><strong>{quotes[series.id]?quotes[series.id].value.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%':pending?'Consultando…':'Indisponível'}</strong></span>)}</button>{expanded&&<section className="sh-market-details" id="sh-market-details" aria-label="Referências dos indicadores"><div><strong>Referências do mercado</strong><button className="ps-icon" aria-label="Fechar indicadores" onClick={()=>setExpanded(false)}><X size={16}/></button></div><p>Última observação disponível no Banco Central.</p>{series.map(series=><a key={series.id} href={endpoint(series.id)} target="_blank" rel="noreferrer"><span><strong>{series.label} · {series.unit}</strong><small>{quotes[series.id]?'Referência: '+quotes[series.id].date:'Consulta indisponível nesta sessão'}</small></span><ExternalLink size={14}/></a>)}<p>Indicadores de contexto. A taxa do financiamento é definida por você no simulador.</p></section>}</div>;
}
