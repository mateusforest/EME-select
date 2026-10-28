const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const t=(value,label,min,max)=>typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max?value.trim():fail('Confira '+label+'.');
export function switchProfessionalEnrollment(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['requestId','name','phone','creci','business','city','propertyType','whatsappOptIn','privacyAccepted','website'].includes(k)))fail('Cadastro inválido.');
 if(body.website)fail('Não foi possível validar o envio.');
 if(typeof body.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.requestId))fail('Referência de envio inválida.');
 if(body.whatsappOptIn!==true||body.privacyAccepted!==true)fail('Confirme que deseja receber convites M Select no WhatsApp e o tratamento de dados.');
 const digits=t(body.phone,'o telefone',10,25).replace(/\D/g,'');
 const phone=digits.length===11||digits.length===10?'55'+digits:digits;
 if(!/^55[1-9]{2}9?\d{8}$/.test(phone))fail('Informe WhatsApp com DDD.');
 const creci=t(body.creci,'o CRECI',4,40).toUpperCase();
 if(!/^[\p{L}\p{N} .\/-]+$/u.test(creci))fail('Confira a inscrição profissional.');
 return {
  requestId:body.requestId.toLowerCase(),name:t(body.name,'o nome',3,100),
  phone,creci,business:t(body.business||'','a empresa',0,100),
  city:t(body.city,'a cidade de atuação',2,100),
  propertyType:t(body.propertyType,'o tipo de imóvel',2,60),
  whatsappOptIn:true,privacyAccepted:true
 };
}
export function switchProfessionalReview(body,prior){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['status','version','licenseChecked'].includes(k)))fail('Revisão inválida.');
 if(!Number.isInteger(body.version)||body.version!==prior.version)fail('Cadastro mudou; atualize a ficha.',409);
 if(!['verified','paused','rejected'].includes(body.status))fail('Etapa inválida.');
 if(body.status==='verified'&&body.licenseChecked!==true)fail('Confirme a verificação profissional antes de habilitar alertas.');
 if(prior.whatsapp_opt_in!==true&&body.status==='verified')fail('Sem autorização para alertas.');
 return {status:body.status};
}
export function switchSendEligibility(pro,deal){
 if(!pro||!deal||pro.status!=='verified'||pro.whatsapp_opt_in!==true||
    deal.status!=='prepared'||Date.parse(deal.expires_at)<=Date.now())return false;
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 return normalize(pro.city)===normalize(deal.teaser_city)&&normalize(pro.property_type)===normalize(deal.teaser_type);
}
