import {buyerProfile} from './buyer-qualification.mjs';

export const buyerMessageKinds={discovery:'Entender a busca',selection:'Apresentar opções',followup:'Retomar a conversa',access:'Convidar para o Acesso Select'};

// Drafts for an existing, authorized conversation. No transport or send is performed.
export function buyerMessageDraft({kind,profile,lead,matches=[],origin}){
 const p=buyerProfile(profile);
 if(p.contactPermission!=='granted'||['won','lost'].includes(lead.status))return '';
 const hello='Olá, '+String(lead.data.name).trim().split(/\s+/)[0]+'!';
 if(kind==='discovery'){
  const questions=[!p.operation&&'Você procura comprar ou alugar?',!p.city&&'Em qual cidade ou região?',!p.propertyType&&'Qual tipo de imóvel procura?',p.budgetMax===null&&'Qual faixa de valor faz sentido para você? Se ainda estiver definindo, tudo bem.',!p.timeline&&'Tem algum prazo em mente?'].filter(Boolean).slice(0,2);
  return hello+' Aqui é da EME Select. Quero entender o que faz sentido para a sua busca. '+(questions.join(' ')||'O que não pode faltar no seu próximo imóvel?');
 }
 if(kind==='followup')return hello+' Aqui é da EME Select. Podemos retomar a sua busca'+(p.city?' em '+p.city:'')+'? Gostaria de saber se as suas preferências continuam as mesmas ou se algo mudou. Se preferir pausar o atendimento, é só me avisar.';
 if(kind==='access')return hello+' Você pode solicitar seu Acesso Select para organizar sua seleção e acompanhar oportunidades. A equipe analisa o cadastro antes de liberar o acesso reservado. Solicite aqui: '+origin+'/acesso-select?criar=1';
 if(kind==='selection'){
  if(!matches.length)return '';
  const options=matches.slice(0,3).map(item=>item.title+' — '+(item.price>0?item.price.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}):'Valor a consultar')+'\n'+origin+'/imovel/'+encodeURIComponent(item.id));
  return hello+' Separei estas opções do catálogo para sua busca'+(p.operation?' de '+(p.operation==='comprar'?'compra':'locação'):'')+(p.city?' em '+p.city:'')+':\n\n'+options.join('\n\n')+'\n\nAlguma combina com o que você procura? Antes de uma visita, confirmamos disponibilidade e detalhes com a equipe.';
 }
 return '';
}
