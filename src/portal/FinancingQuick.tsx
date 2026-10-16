import {useEffect,useRef,useState} from 'react';
import {ArrowDownRight, Calculator, X} from 'lucide-react';
import {calculateFinancing} from '../../shared/financing.mjs';

const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export default function FinancingQuick({open,onClose}:{open:boolean;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [price,setPrice]=useState('500000'),[entry,setEntry]=useState('100000'),[months,setMonths]=useState('360'),[rate,setRate]=useState('12'),[system,setSystem]=useState<'SAC'|'PRICE'>('SAC');
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement as HTMLElement, overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';dialog.current?.showModal();
    return()=>{dialog.current?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
  },[open]);
  const result=[price,entry,months,rate].some(v=>!v.trim())?null:calculateFinancing({price:Number(price),downPayment:Number(entry),months:Number(months),annualRate:Number(rate),system});
  return <dialog ref={dialog} className="sq-dialog" aria-labelledby="sq-title" onCancel={e=>{e.preventDefault();onClose();}}>
    <div className="sq-heading"><span className="sq-symbol"><Calculator size={22}/></span><div><span className="ps-overline">FERRAMENTAS SELECT</span><h2 id="sq-title">Financiamento rápido</h2></div><button className="ps-icon" aria-label="Fechar simulador" onClick={onClose}><X size={20}/></button></div>
    <p className="sq-intro">Uma primeira conta para a conversa com o cliente. Ajuste os valores e compare as parcelas.</p>
    <div className="sq-layout"><div className="sq-inputs">
      <div className="sq-fields"><label>Valor do imóvel (R$)<input type="number" inputMode="decimal" min="1" max="10000000000" step="0.01" value={price} onChange={e=>setPrice(e.target.value)}/></label><label>Entrada (R$)<input type="number" inputMode="decimal" min="0" step="0.01" value={entry} onChange={e=>setEntry(e.target.value)}/></label><label>Prazo (meses)<input type="number" inputMode="numeric" min="1" max="480" step="1" value={months} onChange={e=>setMonths(e.target.value)}/></label><label>Taxa efetiva anual (%)<input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={rate} onChange={e=>setRate(e.target.value)}/></label></div>
      <fieldset className="sq-system"><legend>Sistema de amortização</legend><div>{(['SAC','PRICE'] as const).map(value=><button key={value} type="button" aria-pressed={system===value} onClick={()=>setSystem(value)}><strong>{value==='PRICE'?'Price':'SAC'}</strong><span>{value==='SAC'?'Parcelas decrescentes':'Prestação base constante'}</span></button>)}</div></fieldset>
      <p className="sq-help">Os valores iniciais são exemplos. A taxa é informada por você e convertida para a taxa mensal equivalente.</p>
    </div><div className="sq-result" aria-live="polite" aria-atomic="true">{result?<><span className="sq-result-label">PRIMEIRA PARCELA ESTIMADA</span><strong className="sq-main-value">{money(result.first)}</strong><span className="sq-last"><ArrowDownRight size={15}/>Última: {money(result.last)}</span><dl><div><dt>Valor financiado</dt><dd>{money(result.principal)}</dd></div><div><dt>Juros no período</dt><dd>{money(result.interest)}</dd></div><div><dt>Soma das parcelas</dt><dd>{money(result.total)}</dd></div><div><dt>Total com a entrada</dt><dd>{money(result.total+Math.round(Number(entry)*100))}</dd></div></dl><small>{Number(months)} meses · {(result.monthlyRate*100).toLocaleString('pt-BR',{maximumFractionDigits:4})}% ao mês</small></>:<div className="sq-invalid" role="status"><Calculator size={28}/><h3>Vamos ajustar os valores.</h3><p>Informe um imóvel com valor maior que a entrada, prazo inteiro de 1 a 480 meses e taxa anual de 0% a 100%.</p></div>}</div></div>
    <p className="sq-disclaimer">Estimativa sem seguros, tarifas, indexadores ou CET. Não é proposta de crédito e não gera lançamentos no financeiro.</p>
  </dialog>;
}
