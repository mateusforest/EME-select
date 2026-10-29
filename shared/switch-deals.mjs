// M Switch — proposta comercial de divisão de corretagem (não é contrato eletrônico).
// Todas as quantias monetárias são inteiros em centavos; bps=1/100 de ponto percentual.
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const integer=(value,label,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max?value:fail('Confira '+label+'.');
export const switchDealStates=['prepared','acknowledged','contracted','introduced','closed','paid','cancelled'];
export function switchDealQuote(input){
 if(!input||typeof input!=='object')fail('Simulação inválida.');
 const price=integer(input.salePriceCents,'o valor referencial',1_000_000,1_000_000_000_000);
 const brokerageBps=integer(input.brokerageBps,'a comissão de corretagem (bps)',1,1000);
 const shareBps=integer(input.switchShareBps,'o percentual M Switch (bps)',1,10000);
 // Arredondar uma vez por parcela. Os números são uma estimativa comercial, não faturamento realizado.
 const grossCommissionCents=Math.round(price*brokerageBps/10000);
 const switchShareCents=Math.round(grossCommissionCents*shareBps/10000);
 return {
  salePriceCents:price,brokerageBps,switchShareBps:shareBps,
  grossCommissionCents,switchShareCents,
  partnerShareCents:grossCommissionCents-switchShareCents,
  contingent:true,requiresSignedAgreement:true,
  description:'Projeção sobre o valor de referência. Remuneração somente conforme contrato escrito, operação concretizada e valores efetivamente recebidos.'
 };
}
export function switchOfferDraft(input,source,target) {
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['sourceKind','sourceId','demandId','salePriceCents','brokerageBps','switchShareBps','expiresDays'].includes(k)))fail('Proposta inválida.');
 if(!['switch_request','partner_offer'].includes(input.sourceKind))fail('Origem inválida.');
 if(!source||!target||!['buy','swap','invest'].includes(target.kind)||target.status!=='qualified')fail('A demanda deve estar qualificada.');
 if(target.kind==='buy'&&target.demand_reviewed!==true)fail('A intenção e o orçamento do comprador devem ser confirmados pela gestão.');
 if(target.id===source.id)fail('Selecione duas partes distintas.');
 if(input.sourceKind==='switch_request'){
   if(!['sell','swap'].includes(source.kind)||source.status!=='qualified'||!source.ownership_reviewed||!source.sharing_authorized)fail('Revise o imóvel e a autorização do proprietário.');
 } else if(source.available!==true||source.authorization_confirmed!==true)fail('A oferta do parceiro precisa estar autorizada e disponível.');
 const quote=switchDealQuote(input);
 const floor=Number(input.sourceKind==='partner_offer'?source.price_cents:source.min_acceptable_cents);
 if(!Number.isSafeInteger(floor)||quote.salePriceCents<floor)fail('Valor sugerido inferior à referência mínima revisada.');
 const days=integer(input.expiresDays??7,'o prazo',1,14);
 return {...quote,sourceKind:input.sourceKind,sourceId:source.id,demandId:target.id,expiresDays:days};
}
export function switchOfferTeaser(deal){
 // Somente dados comerciais sem identificador do comprador, vendedor ou vínculo público com oferta original.
 return {
   reference:deal.public_ref,
   city:deal.teaser_city,
   propertyType:deal.teaser_type,
   opportunity:'Possível conexão comercial sujeita à análise e confirmação.',
   estimatedSaleCents:deal.sale_price_cents,
   brokerageBps:deal.brokerage_bps,
   switchShareBps:deal.switch_share_bps,
   quoted:switchDealQuote({salePriceCents:Number(deal.sale_price_cents),brokerageBps:deal.brokerage_bps,switchShareBps:deal.switch_share_bps}),
   disclaimer:'Esta apresentação não identifica as partes e não constitui autorização de divulgação, oferta vinculante nem contrato de corretagem. Os termos comerciais dependem de acordo escrito entre profissionais/empresas habilitados.',
   validUntil:deal.expires_at,
   state:deal.status==='prepared'?'pending':deal.status==='acknowledged'?'registered':'closed'
 };
}
export function switchOfferAcceptance(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['name','phone','creci','business','acknowledge','privacyAccepted','marketingOptIn'].includes(k)))fail('Formulário inválido.');
 const name=typeof body.name==='string'?body.name.trim():'';
 const business=typeof body.business==='string'?body.business.trim():'';
 const creci=typeof body.creci==='string'?body.creci.trim().toUpperCase():'';
 const digits=typeof body.phone==='string'?body.phone.replace(/\D/g,''):'';
 const phone=digits.length===11?'55'+digits:digits;
 if(name.length<3||name.length>100||business.length>100)fail('Nome ou empresa inválidos.');
 if(creci.length<4||creci.length>40||!/^[\p{L}\p{N} .\/-]+$/u.test(creci))fail('Informe inscrição profissional para conferência.');
 if(!/^55[1-9]{2}9?\d{8}$/.test(phone))fail('Informe telefone com DDD.');
 if(body.acknowledge!==true||body.privacyAccepted!==true)fail('Confirme ciência das condições e tratamento de dados.');
 if(typeof body.marketingOptIn!=='boolean')fail('Preferências de contato inválidas.');
 return {name,business,creci,phone,marketingOptIn:body.marketingOptIn};
}
export function switchDealTransition(deal,action,details={}){
 const next={contract:'contracted',introduce:'introduced',close:'closed',paid:'paid',cancel:'cancelled'}[action];
 if(!next)fail('Etapa inválida.');
 const expected={contract:'acknowledged',introduce:'contracted',close:'introduced',paid:'closed'};
 if(action!=='cancel'&&deal.status!==expected[action])fail('Conclua a etapa anterior antes de avançar.',409);
 if(action==='cancel'&&['paid','cancelled'].includes(deal.status))fail('Esta oportunidade não pode ser cancelada.',409);
 if(action==='contract'){
  if(typeof details.contractReference!=='string'||details.contractReference.trim().length<8||details.contractReference.length>160)fail('Referência do contrato assinado é obrigatória.');
  if(details.licenseChecked!==true)fail('É necessário confirmar a habilitação profissional.');
 }
 if(action==='close'){
  if(!Number.isSafeInteger(details.actualSaleCents)||details.actualSaleCents<1_000_000)fail('Registre o valor real fechado.');
 }
 if(action==='paid'){
  if(!Number.isSafeInteger(details.receivedCents)||details.receivedCents<0)fail('Informe o valor realmente recebido.');
  if(details.receivedCents===0)fail('Não marque como pago sem recebimento.');
 }
 return {status:next};
}
