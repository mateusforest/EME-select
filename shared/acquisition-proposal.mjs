export const proposalKind = 'acquisition_proposal';
export const proposalLimits = {clientName:120,title:100,location:140,eyebrow:90,unit:40,block:40,intro:220,features:160,developer:100,included:1600,expenses:1600,advisorName:100,advisorContact:180,notes:1600,photoCaption:160};
export const proposalMoney = value => Number(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const cents = value => Math.round(Number(value) * 100);
export function proposalDefaults(listing, user, today = new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})) {
 const d = listing?.draft || {};
 return {propertyId:listing?.id||'',clientName:'',title:d.title||'',location:[d.neighborhood,d.city].filter(Boolean).join(' · '),eyebrow:[d.type,d.city].filter(Boolean).join(' / '),unit:'',block:'',intro:'Uma proposta personalizada para o seu próximo lugar.',features:[d.area?d.area+' m²':'',d.bedrooms?d.bedrooms+' dormitórios':''].filter(Boolean).join(' · '),developer:'',photoId:listing?.photos?.[0]?.id||'',photoCaption:'Imagem do imóvel',proposedPrice:d.price||0,advertisedPrice:d.price||0,issuedOn:today,validUntil:'',validTime:'18:00',payments:[{label:'Entrada / sinal',note:'',amount:0},{label:'Saldo',note:'',amount:0}],included:'',expenses:'',advisorName:user.name,advisorContact:user.email,notes:'Disponibilidade e condições sujeitas à confirmação e ao aceite das partes.'};
}
export function validateProposal(input) {
 const fail = message => {throw Object.assign(new Error(message),{status:400});};
 if(!input || typeof input!=='object' || Array.isArray(input)) fail('Confira a proposta.');
 const allowed=[...Object.keys(proposalLimits),'propertyId','photoId','proposedPrice','advertisedPrice','issuedOn','validUntil','validTime','payments'];
 if(Object.keys(input).some(k=>!allowed.includes(k)))fail('Campos de proposta não permitidos.');
 const value={};
 for(const [key,max]of Object.entries(proposalLimits)){
  if(typeof input[key]!=='string'||input[key].trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input[key]))fail('Revise o campo '+key+' (até '+max+' caracteres).');
  value[key]=input[key].trim();
 }
 for(const key of ['clientName','title','advisorName','advisorContact','included'])if(!value[key])fail('Preencha cliente, imóvel, atendimento e o que está contemplado.');
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
 if(!uuid.test(input.propertyId)||input.photoId&&!uuid.test(input.photoId))fail('Selecione um imóvel e uma foto da carteira.');
 value.propertyId=input.propertyId;value.photoId=input.photoId||'';
 for(const key of ['proposedPrice','advertisedPrice']){
  const n=input[key];if(typeof n!=='number'||!Number.isFinite(n)||n<=0||n>1e12||Math.abs(n*100-cents(n))>.001)fail('Informe valores positivos com até duas casas decimais.');value[key]=n;
 }
 for(const key of ['issuedOn','validUntil']){const date=input[key];if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)fail('Informe datas válidas de emissão e validade.');value[key]=date;}
 if(value.validUntil<value.issuedOn)fail('A validade deve ser igual ou posterior à emissão.');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.validTime))fail('Informe o horário de validade.');value.validTime=input.validTime;
 if(!Array.isArray(input.payments)||!input.payments.length||input.payments.length>8)fail('Use de uma a oito etapas de pagamento.');
 value.payments=input.payments.map(p=>{
  if(!p||Object.keys(p).some(k=>!['label','note','amount'].includes(k))||typeof p.label!=='string'||!p.label.trim()||p.label.length>80||typeof p.note!=='string'||p.note.length>500||typeof p.amount!=='number'||!Number.isFinite(p.amount)||p.amount<=0||p.amount>1e12||Math.abs(p.amount*100-cents(p.amount))>.001)fail('Confira título, condição e valor de cada pagamento.');
  return {label:p.label.trim(),note:p.note.trim(),amount:p.amount};
 });
 if(value.payments.reduce((total,p)=>total+cents(p.amount),0)!==cents(value.proposedPrice))fail('A soma dos pagamentos deve corresponder exatamente ao valor da proposta.');
 return value;
}
