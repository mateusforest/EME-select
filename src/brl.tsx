import {useEffect,useState} from 'react';
export const formatBRL=(value:number|null)=>value==null?'':value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export function parseBRL(value:string):number|null {if(!value.trim())return null;const clean=value.replace(/R\$|\s/g,'');const number=Number(clean.includes(',')?clean.replace(/\./g,'').replace(',','.'):clean);return Number.isFinite(number)?number:null;}
export function CurrencyInput({value,onChange,label,required=false,allowNegative=false}:{value:number|null;onChange:(value:number|null)=>void;label?:string;required?:boolean;allowNegative?:boolean}){
 const [text,setText]=useState(formatBRL(value)),[focused,setFocused]=useState(false);
 useEffect(()=>{if(!focused)setText(formatBRL(value));},[value,focused]);
 return <input aria-label={label} type="text" inputMode="decimal" required={required} value={text} placeholder="R$ 0,00" maxLength={22} onFocus={e=>{setFocused(true);e.currentTarget.select();}} onChange={e=>{const raw=e.target.value.replace(allowNegative?/[^\d,.\-]/g:/[^\d,.]/g,'');setText(raw);onChange(parseBRL(raw));}} onBlur={()=>{setFocused(false);setText(formatBRL(value));}}/>;
}
