import {catalogDefaults} from './catalog.js';
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function searchFilters(query,regions=[]){
 let text=normalize(query);const filters={...catalogDefaults};
 const types=[[/\bcasas?\b/g,'Casa'],[/\b(apartamentos?|aptos?)\b/g,'Apartamento'],[/\bterrenos?\b/g,'Terreno'],[/\b(comercial|salas? comerciais)\b/g,'Comercial']];
 for(const [pattern,type]of types)if(pattern.test(text)){filters.type=type;text=text.replace(pattern,' ');break;}
 for(const region of [...regions].sort((a,b)=>b.name.length-a.name.length)){const name=normalize(region.name);if(text.includes(name)){filters.region=region.id;text=text.replaceAll(name,' ');break;}}
 if(/\b(alugar|aluguel|locacao)\b/.test(text)){filters.operation='alugar';text=text.replace(/\b(alugar|aluguel|locacao)\b/g,' ');}
 else if(/\b(comprar|compra|venda)\b/.test(text)){filters.operation='comprar';text=text.replace(/\b(comprar|compra|venda)\b/g,' ');}
 text=text.replace(/\bate\s*(?:r\$\s*)?([\d.,]+)\s*(milhoes|milhao|mil)?\b/g,(_,amount,unit)=>{filters.max=String(Number(amount.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'))*(unit==='mil'?1000:unit?1000000:1));return ' ';});
 text=text.replace(/\b(\d+)\s*(quartos?|dormitorios?|vagas?)\b/g,(_,number,kind)=>{filters[kind.startsWith('vaga')?'parking':'beds']=number;return ' ';});
 filters.q=text.replace(/\b(oi|ola|bom|boa|dia|tarde|noite|tudo|bem|eu|preciso|precisando|quero|queria|gostaria|estou|procurando|procuro|busco|buscar|encontrar|me|mostre|mostrar|opcoes|imoveis|imovel|uma|um|uns|umas|de|da|do|das|dos|em|na|no|nas|nos|para|por|favor|que|tenha|com|e|o|a|os|as)\b/g,' ').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
 return filters;
}
