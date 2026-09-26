import {useEffect,useId,useRef,useState} from 'react';
import type {Draft,Listing} from './listingModel';
const states='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const seeds=[['Vacaria','RS'],['Balneário Camboriú','SC'],['Itapema','SC']];
const split=(text:string)=>{const match=text.match(/^(.*?)\s*[·,–-]\s*([A-Z]{2})$/);return match?[match[1].trim(),match[2]]:[text,''];};
export default function LocationFields({draft,items,onPatch}:{draft:Draft;items:Listing[];onPatch:(patch:Partial<Draft>)=>void}){
 const id=useId(),[status,setStatus]=useState('');const latest=useRef(draft);latest.current=draft;
 const [city,uf]=split(draft.city),cities=[...new Map([...seeds,...items.map(i=>split(i.draft.city))].filter(([name])=>name).map(pair=>[pair.join(' · '),pair])).values()];
 useEffect(()=>{
  const cep=(draft.postalCode||'').replace(/\D/g,'');setStatus('');if(cep.length!==8)return;
  const controller=new AbortController();const before={...latest.current};
  const timer=setTimeout(async()=>{setStatus('Consultando CEP…');try{const response=await fetch('https://viacep.com.br/ws/'+cep+'/json/',{signal:controller.signal});if(!response.ok)throw Error();const data=await response.json();if(data.erro||!data.localidade||!states.includes(data.uf)){setStatus('CEP não encontrado. Você pode preencher o endereço manualmente.');return;}if(controller.signal.aborted)return;
   const patch:Partial<Draft>={};const current=latest.current;
   if(current.city===before.city)patch.city=data.localidade+' · '+data.uf;
   if(current.neighborhood===before.neighborhood&&data.bairro)patch.neighborhood=data.bairro;
   if(current.privateAddress===before.privateAddress)patch.privateAddress=[data.logradouro,data.bairro,data.localidade+' · '+data.uf,'CEP '+cep.slice(0,5)+'-'+cep.slice(5)].filter(Boolean).join(', ');
   onPatch(patch);setStatus('Endereço encontrado. Confira e acrescente o número e complemento no endereço privado.');
  }catch{if(!controller.signal.aborted)setStatus('Não foi possível consultar o CEP. Preencha manualmente ou tente novamente.');}},450);
  return()=>{clearTimeout(timer);controller.abort();};
 },[draft.postalCode]);
 return <><label>CEP · consulta de endereço<input inputMode="numeric" autoComplete="postal-code" maxLength={9} value={draft.postalCode||''} placeholder="00000-000" onChange={e=>onPatch({postalCode:e.target.value.replace(/\D/g,'').slice(0,8).replace(/^(\d{5})(\d)/,'$1-$2')})}/><small>{status||'O endereço completo fica reservado à equipe.'}</small></label>
 <label>Cidade<input aria-label="Cidade" required list={id+'-cities'} autoComplete="address-level2" value={city} onChange={e=>{const match=cities.find(([name])=>name.toLowerCase()===e.target.value.toLowerCase());const state=match?.[1]||uf;onPatch({city:e.target.value+(state?' · '+state:'')});}}/><datalist id={id+'-cities'}>{cities.map(([name,state])=><option key={name+state} value={name}>{state}</option>)}</datalist></label>
 <label>Estado<select aria-label="Estado" value={uf} onChange={e=>onPatch({city:city+(e.target.value?' · '+e.target.value:'')})}><option value="">Selecione</option>{states.map(state=><option key={state}>{state}</option>)}</select></label>
 <label>Bairro ou região pública<input aria-label="Bairro ou região pública" list={id+'-districts'} value={draft.neighborhood} onChange={e=>onPatch({neighborhood:e.target.value})}/><datalist id={id+'-districts'}>{[...new Set([...(city==='Itapema'?['Meia Praia','Centro']:[]),...items.filter(i=>split(i.draft.city)[0]===city).map(i=>i.draft.neighborhood)])].filter(Boolean).map(name=><option key={name}>{name}</option>)}</datalist></label></>;
}
