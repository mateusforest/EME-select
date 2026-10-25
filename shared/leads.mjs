export const leadStatuses={new:'Novo',in_progress:'Em atendimento',waiting:'Aguardando retorno',visit:'Visita em negociação',won:'Concluído',lost:'Encerrado sem negócio'};
export const routingModes={manual:'Fila da gestão',property:'Responsável pelo imóvel',round_robin:'Rodízio entre corretores',weighted:'Percentual por corretor'};
export const leadConsentVersion='select-contact-2026-10';
export function leadFail(status,message){throw Object.assign(new Error(message),{status});}
export function leadId(value){if(typeof value!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value))leadFail(400,'Referência inválida.');return value.toLowerCase();}
const text=(v,min,max,label)=>{if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)leadFail(400,'Confira '+label+'.');return v.trim();};
export function leadPhone(value){let digits=text(value,8,24,'o telefone').replace(/\D/g,'');if([10,11].includes(digits.length))digits='55'+digits;if(!/^55[1-9]{2}\d{8,9}$/.test(digits))leadFail(400,'Informe telefone brasileiro com DDD.');return digits;}
export function leadInput(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['requestId','name','phone','message','interest','propertyId','source','intent','visit','consent','website'].includes(k)))leadFail(400,'Solicitação inválida.');
 if(body.website)leadFail(400,'Não foi possível validar o envio.');if(body.consent!==true)leadFail(400,'Autorize o contato para enviar.');
 const source=body.source||{};if(typeof source!=='object'||Array.isArray(source)||Object.keys(source).some(k=>!['page','campaign','medium','origin'].includes(k)))leadFail(400,'Origem inválida.');
 const page=text(source.page||'/',1,300,'a página de origem');if(!page.startsWith('/')||page.startsWith('//')||/[\r\n]/.test(page))leadFail(400,'Página de origem inválida.');
 const intent=body.intent||'contact';if(!['contact','visit'].includes(intent))leadFail(400,'Interesse inválido.');
 const visit=body.visit||{};if(typeof visit!=='object'||Array.isArray(visit)||Object.keys(visit).some(k=>!['date','period','time'].includes(k)))leadFail(400,'Preferência de visita inválida.');
 const date=visit.date||'',period=visit.period||'',time=visit.time||'';
 if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))leadFail(400,'Data de visita inválida.');
 if(!['','Manhã','Tarde'].includes(period)||time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))leadFail(400,'Horário de visita inválido.');
 return {requestId:leadId(body.requestId),propertyId:body.propertyId?leadId(body.propertyId):null,data:{name:text(body.name,2,100,'seu nome'),phone:leadPhone(body.phone),message:text(body.message||'',0,1500,'a mensagem'),interest:text(body.interest||'Conversa com a EME Select',2,400,'o interesse'),intent,visit:{date,period,time},source:{page,campaign:text(source.campaign||'',0,150,'a campanha'),medium:text(source.medium||'',0,100,'o canal'),origin:text(source.origin||'',0,100,'a origem')},consentVersion:leadConsentVersion}};
}
export function leadUpdate(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['version','status','assigneeId','nextContactAt','note'].includes(k))||!Number.isSafeInteger(body.version)||body.version<1)leadFail(400,'Atualize a ficha antes de salvar.');
 if(!Object.hasOwn(leadStatuses,body.status))leadFail(400,'Etapa inválida.');
 const next=body.nextContactAt||null;if(next&&(typeof next!=='string'||!/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(next)||!Number.isFinite(Date.parse(next))))leadFail(400,'Próximo contato inválido.');
 if(!['new','won','lost'].includes(body.status)&&!next)leadFail(400,'Defina o próximo contato para este atendimento.');
 return {version:body.version,status:body.status,assigneeId:body.assigneeId?leadId(body.assigneeId):null,nextContactAt:next?new Date(next).toISOString():null,note:text(body.note||'',0,2000,'a observação')};
}
export function routingInput(body){if(!body||Object.keys(body).some(k=>!['version','mode','brokers','weights'].includes(k))||!Number.isSafeInteger(body.version)||body.version<0||!Object.hasOwn(routingModes,body.mode)||!Array.isArray(body.brokers)||body.brokers.length>100)leadFail(400,'Regra de distribuição inválida.');const brokers=body.brokers.map(leadId);if(new Set(brokers).size!==brokers.length||['round_robin','weighted'].includes(body.mode)&&!brokers.length)leadFail(400,'Escolha os corretores do rodízio.');const weights=body.weights??{};if(!weights||typeof weights!=='object'||Array.isArray(weights)||Object.keys(weights).some(id=>!brokers.includes(id)))leadFail(400,'Percentuais inválidos.');if(body.mode==='weighted'&&(Object.keys(weights).length!==brokers.length||brokers.some(id=>!Number.isInteger(weights[id])||weights[id]<0||weights[id]>100)||Object.values(weights).reduce((a,b)=>a+b,0)!==100))leadFail(400,'Os percentuais devem somar 100%.');return {version:body.version,mode:body.mode,brokers,weights:body.mode==='weighted'?weights:{}};}
