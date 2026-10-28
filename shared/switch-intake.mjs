// M Switch: validar entradas públicas antes de persistir. Não é avaliação ou proposta.
export const switchKinds = Object.freeze(['sell','swap','invest']);
export const switchStatuses = Object.freeze(['new','reviewing','qualified','negotiating','closed','archived']);
const matchId = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const fail = message => { throw Object.assign(new Error(message), {status:400}); };
const t = (value, label, min, max) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail('Confira '+label+'.');
  return value.trim();
};
export function switchCents(value, label, required = false) {
  if (value == null || value === '') {if (required) fail('Informe '+label+'.'); return null;}
  if (!Number.isSafeInteger(value) || value < 1000000 || value > 1000000000000) fail('Confira '+label+' (valor em centavos).');
  return value;
}
export function switchPhone(value) {
  const digits = t(value,'o WhatsApp',10,25).replace(/\D/g,'');
  const normalized = /^[1-9]{2}9?\d{8}$/.test(digits) ? '55'+digits : digits;
  if (!/^55[1-9]{2}9?\d{8}$/.test(normalized)) fail('Informe WhatsApp brasileiro com DDD.');
  return normalized;
}
export function switchIntake(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Solicitação inválida.');
  const allowed=['requestId','kind','name','phone','city','propertyType','askingCents','targetCity','targetBudgetCents','notes','contactConsent','updatesOptIn','privacyAccepted','website','source'];
  if (Object.keys(body).some(x => !allowed.includes(x)) || body.website) fail('Solicitação inválida.');
  if (typeof body.requestId !== 'string' || !matchId.test(body.requestId)) fail('Referência de envio inválida.');
  if (!switchKinds.includes(body.kind)) fail('Tipo de operação inválido.');
  if (body.privacyAccepted !== true || body.contactConsent !== true) fail('Confirme a política e a autorização para responder sua solicitação.');
  if (typeof body.updatesOptIn !== 'boolean') fail('Confira suas preferências de contato.');
  const source = body.source == null ? 'site' : t(body.source,'a origem',2,80);
  if (!/^[\p{L}\p{N} _:/.-]+$/u.test(source)) fail('Origem inválida.');
  return {
    requestId:body.requestId.toLowerCase(),
    kind:body.kind,
    name:t(body.name,'o nome',2,100),
    phone:switchPhone(body.phone),
    city:t(body.city,'a cidade',2,100),
    propertyType:t(body.propertyType,'o tipo de imóvel',2,60),
    askingCents:switchCents(body.askingCents,'o valor aproximado',true),
    targetCity:body.kind==='invest' ? '' : t(body.targetCity||'','a cidade desejada',0,100),
    targetBudgetCents:body.kind==='invest' ? null : switchCents(body.targetBudgetCents,'o orçamento de destino'),
    notes:t(body.notes||'','as observações',0,1200),
    contactConsent:true,updatesOptIn:body.updatesOptIn,privacyAccepted:true,source
  };
}
export function switchRevision(body, prior, isAdmin) {
  if (!body || typeof body!=='object' || Array.isArray(body)) fail('Alteração inválida.');
  const allowed=['version','status','ownerId','ownershipReviewed','sharingAuthorized','fundsVerified','minAcceptableCents','note'];
  if (Object.keys(body).some(x=>!allowed.includes(x))) fail('Campos inválidos.');
  if (!Number.isSafeInteger(body.version) || body.version!==prior.version) throw Object.assign(new Error('A ficha mudou. Atualize antes de salvar.'),{status:409});
  if (body.status!==undefined && !switchStatuses.includes(body.status)) fail('Etapa inválida.');
  if (!isAdmin && ['ownerId','ownershipReviewed','sharingAuthorized','fundsVerified','minAcceptableCents'].some(k=>Object.hasOwn(body,k))) throw Object.assign(new Error('A revisão documental e financeira exige a gestão.'),{status:403});
  const out = {};
  if (body.status!==undefined) out.status=body.status;
  if (body.ownerId!==undefined) {
    if (body.ownerId!==null && (typeof body.ownerId!=='string'||!matchId.test(body.ownerId))) fail('Responsável inválido.');
    out.owner_id=body.ownerId;
  }
  if (body.ownershipReviewed!==undefined) {
    if (typeof body.ownershipReviewed!=='boolean'||prior.kind==='invest') fail('Revisão inválida.');
    out.ownership_reviewed=body.ownershipReviewed;
  }
  if (body.sharingAuthorized!==undefined) {
    if (typeof body.sharingAuthorized!=='boolean'||prior.kind==='invest') fail('Autorização inválida.');
    out.sharing_authorized=body.sharingAuthorized;
  }
  if (body.fundsVerified!==undefined) {
    if (typeof body.fundsVerified!=='boolean'||prior.kind!=='invest') fail('Conferência financeira inválida.');
    out.funds_verified=body.fundsVerified;
  }
  if (body.minAcceptableCents!==undefined) {
    if (prior.kind==='invest') fail('O valor mínimo só se aplica ao imóvel.');
    out.min_acceptable_cents=switchCents(body.minAcceptableCents,'o mínimo aceito');
  }
  if (body.note!==undefined)out.review_note=t(body.note,'a nota interna',0,1000);
  if (!Object.keys(out).length) fail('Nenhuma alteração informada.');
  if (out.status==='qualified') {
    if (prior.kind==='invest' && !(out.funds_verified ?? prior.funds_verified)) fail('Confirme a verificação do investidor antes de qualificar.');
    if (prior.kind!=='invest' && (!(out.ownership_reviewed??prior.ownership_reviewed)||!(out.sharing_authorized??prior.sharing_authorized)||!(out.min_acceptable_cents??prior.min_acceptable_cents))) fail('Confira titularidade, autorização e mínimo aceito antes de qualificar.');
  }
  return out;
}
