import {draft,fields,text,fail,types} from './cloud/domain.mjs';
export function submission(input){
 fields(input,['requestId','name','phone','relationship','city','neighborhood','type','operation','environment','area','price','description','occupancy','documents','consent','website']);
 if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestId||''))fail(400,'Reabra o formulário para iniciar o envio.');
 if(input.website||input.consent!==true)fail(400,'Confirme a autorização de contato.');
 const name=text(input.name,2,100),phone=text(input.phone,10,24),city=text(input.city,2,120);
 let digits=phone.replace(/\D/g,'');if(digits.startsWith('55')&&digits.length>11)digits=digits.slice(2);if(!/^[1-9]{2}\d{8,9}$/.test(digits))fail(400,'Informe um telefone com DDD.');
 if(!['Proprietário','Representante','Corretor'].includes(input.relationship)||!types.includes(input.type))fail(400,'Confira seu vínculo e o tipo do imóvel.');
 const d=draft({title:input.type+' em '+city,city,type:input.type,operation:input.operation,environment:input.environment,condominium:input.type==='Casa em condomínio'?'horizontal':'',neighborhood:text(input.neighborhood??'',0,120),area:input.area??null,price:input.price??null,description:text(input.description??'',0,1500),ownerName:name,ownerContact:phone,requesterRole:input.relationship,occupancy:text(input.occupancy??'',0,120),documentationStatus:'Pendente',authorizationStatus:'Pendente',sourceName:'Formulário do site EME Select',sourceNotes:'Declaração do solicitante sobre documentos: '+text(input.documents??'',0,1000)+'. Autorizou contato sobre esta solicitação; não constitui autorização de anúncio.'});
 return {id:input.requestId.toLowerCase(),data:{title:d.title,city:d.city,type:d.type,operation:d.operation==='comprar'?'Venda':'Locação',owner:name,draft:d,stage:'Recebido',photos:[],published:null,curation:{pending:'Confirmar disponibilidade, vínculo do solicitante, características, autorização de anúncio e documentação.'}}};
}
