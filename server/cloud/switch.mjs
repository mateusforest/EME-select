import {randomUUID,createHash} from 'node:crypto';
import {rankSwitchInvestors} from '../../shared/switch-matching.mjs';
import {rankSwitchUpgradeTargets} from '../../shared/switch-trades.mjs';
import {switchIntake,switchRevision} from '../../shared/switch-intake.mjs';
import {validateSwitchPartnerImport,matchSwitchDemand} from '../../shared/switch-partners.mjs';
import {allRecords} from '../../shared/staff-inventory.mjs';

const error = (status,message) => {throw Object.assign(new Error(message),{status});};
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const digest = value => createHash('sha256').update(value).digest('hex');
const db = 'eme_switch_requests';
const partnerDb = 'eme_switch_partner_offers';
const offerColumns = 'id,partner,ref,title,city,property_type,price_cents,offer_url,available,authorization_confirmed,updated_at';
const columns = 'id,kind,name,phone,city,property_type,asking_cents,target_city,target_budget_cents,notes,source,status,owner_id,contact_opt_in,updates_opt_in,ownership_reviewed,sharing_authorized,funds_verified,demand_reviewed,min_acceptable_cents,review_note,version,created_at,updated_at';

export function attachCloudSwitch({client,rate,portfolio}) {
  const {rest,request}=client;
  const rows = async (filter='') => allRecords(rest,db+'?select='+columns+'&order=created_at.desc,id'+filter);
  async function publicHandle(path,req,body,send) {
    if(path!=='/api/public/switch')return false;
    if(req.method!=='POST')error(405,'Envie o formulário para iniciar.');
    // rate-limit per IP e global. O digest evita gravar IP na tabela do produto.
    const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
    await rate('switch:ip:'+digest(ip),8);
    await rate('switch:global',300);
    if (Buffer.byteLength(JSON.stringify(body||{}))>8000) error(413,'Reduza o tamanho do formulário.');
    const item=switchIntake(body);
    const payload={
      id:randomUUID(),request_id:item.requestId,kind:item.kind,name:item.name,phone:item.phone,
      city:item.city,property_type:item.propertyType,asking_cents:item.askingCents,
      target_city:item.targetCity,target_budget_cents:item.targetBudgetCents,notes:item.notes,
      contact_opt_in:item.contactConsent,updates_opt_in:item.updatesOptIn,privacy_accepted:item.privacyAccepted,
      consent_version:item.consentVersion,consent_recorded_at:new Date().toISOString(),
      source:item.source,status:'new'
    };
    // A única chave de idempotência é o request_id; requests duplicados não viram novas fichas.
    await request('/rest/v1/'+db+'?on_conflict=request_id',{
      method:'POST',body:payload,headers:{Prefer:'resolution=ignore-duplicates,return=minimal'}
    });
    send(201,{received:true,requestId:item.requestId});
    return true;
  }
  async function handle(path,req,user,body,send) {
    if(path!=='/api/switch'&&path!=='/api/switch/matches'&&path!=='/api/switch/partners'&&path!=='/api/switch/partners/import'&&!/^\/api\/switch\/[a-f0-9-]{36}$/.test(path))return false;
    if(!user?.active||user.must_change||!['admin','corretor'].includes(user.role))error(403,'Acesso indisponível.');
    if(path==='/api/switch'&&req.method==='GET') {
      const mine=user.role==='admin'?'':'&owner_id=eq.'+user.id;
      send(200,{requests:await rows(mine),admin:user.role==='admin'});
      return true;
    }
    if(path==='/api/switch/partners'&&req.method==='GET'){
      if(user.role!=='admin')error(403,'Somente a gestão acessa a carteira de parceiros.');
      send(200,{offers:[...await allRecords(rest,partnerDb+'?select='+offerColumns+'&order=updated_at.desc,id'),...(portfolio?await portfolio.offers():[])]});
      return true;
    }
    if(path==='/api/switch/partners/import'&&req.method==='POST'){
      if(user.role!=='admin')error(403,'Somente a gestão importa ofertas de parceiros.');
      await rate('switch:import:'+user.id,30);
      const input=validateSwitchPartnerImport(body);
      // Importações são substituições por chave (parceiro, referência): atualiza valor e disponibilidade.
      // Uma oferta ausente de um novo lote NÃO é apagada — o parceiro precisa enviar available=false.
      const records=input.offers.map(offer=>({
        id:randomUUID(),partner:input.partner,ref:offer.ref,title:offer.title,city:offer.city,
        property_type:offer.propertyType,price_cents:offer.priceCents,offer_url:offer.url,
        available:offer.available,authorization_confirmed:true,reviewed_by:user.id,updated_at:new Date().toISOString()
      }));
      // Não alterar o id de um registro pré-existente em reimportações.
      // Upsert faz merge; os vínculos são por (partner, ref), não por UUID arbitrário.
      const existing=await allRecords(rest,partnerDb+'?select=id,partner,ref&partner=eq.'+encodeURIComponent(input.partner)+'&order=id');
      const oldIds=new Map(existing.map(e=>[e.ref,e.id]));
      for(const record of records)if(oldIds.has(record.ref))record.id=oldIds.get(record.ref);
      await request('/rest/v1/'+partnerDb+'?on_conflict=partner,ref',{
        method:'POST',body:records,headers:{Prefer:'resolution=merge-duplicates,return=minimal'}
      });
      send(200,{imported:records.length,partner:input.partner});
      return true;
    }
    if(path==='/api/switch/matches'&&req.method==='GET'){
      if(user.role!=='admin')error(403,'Somente a gestão pode consultar os cruzamentos de perfis.');
      const loaded=await rows('');
      const requests=portfolio?(await Promise.all(loaded.map(portfolio.checkDemand))).filter(Boolean):loaded;
      const investors=requests.filter(r=>r.kind==='invest'&&r.status==='qualified').map(r=>({
        id:r.id,active:true,alertsOptIn:r.updates_opt_in===true,fundsVerified:r.funds_verified===true,
        cities:[r.city],propertyTypes:[r.property_type],maxPurchaseCents:Number(r.asking_cents)
      }));
      const investorMatches=requests.filter(r=>['sell','swap'].includes(r.kind)&&r.status==='qualified').flatMap(r=>
        rankSwitchInvestors({
          id:r.id,city:r.city,propertyType:r.property_type,status:'available',
          ownershipReviewed:r.ownership_reviewed===true,sharingAuthorized:r.sharing_authorized===true,
          minAcceptableCents:r.min_acceptable_cents==null?0:Number(r.min_acceptable_cents),
          referencePriceCents:r.asking_cents==null?null:Number(r.asking_cents)
        },investors,{limit:20}).map(match=>({...match,kind:'investor'}))
      );
      const offers=[...await allRecords(rest,partnerDb+'?select='+offerColumns+'&available=is.true&order=updated_at.desc,id'),...(portfolio?await portfolio.offers():[])];
      const partnerMatches=matchSwitchDemand(requests,offers,{limit:200});
      const internalOffers=requests.filter(r=>['sell','swap'].includes(r.kind)&&r.status==='qualified'&&r.ownership_reviewed&&r.sharing_authorized&&Number(r.min_acceptable_cents)>=1000000)
        .map(r=>({id:r.id,partner:'EME Select',ref:r.id,city:r.city,property_type:r.property_type,price_cents:r.min_acceptable_cents,available:true,authorization_confirmed:true}));
      const purchaseMatches=matchSwitchDemand(requests.filter(r=>r.kind==='buy'),internalOffers,{limit:200}).map(m=>({...m,kind:'internal-offer'}));
      const results=[...investorMatches,...rankSwitchUpgradeTargets(requests,{limit:200}),...partnerMatches,...purchaseMatches];
      results.sort((a,b)=>b.score-a.score);
      send(200,{matches:results.slice(0,200),total:results.length,reviewRequired:true});
      return true;
    }
    const id=path.replace('/api/switch/','');
    if(!uuid.test(id)||req.method!=='PATCH')error(405,'Ação indisponível.');
    const found=await rest(db+'?id=eq.'+id+'&select='+columns);
    const prior=found[0];
    if(!prior||user.role!=='admin'&&prior.owner_id!==user.id)error(404,'Ficha não encontrada.');
    const changes=switchRevision(body,prior,user.role==='admin');
    if(Object.hasOwn(changes,'owner_id')&&changes.owner_id!==null){
      const members=await rest('eme_profiles?id=eq.'+changes.owner_id+'&select=id,active,role,must_change');
      if(!members[0]?.active||members[0].must_change||!['admin','corretor'].includes(members[0].role))error(400,'Selecione um membro ativo da equipe.');
    }
    const updated=await rest(db+'?id=eq.'+id+'&version=eq.'+prior.version+
      (user.role==='admin'?'':'&owner_id=eq.'+user.id),'PATCH',{
      ...changes,reviewed_by:user.id,version:prior.version+1,updated_at:new Date().toISOString()
    });
    if(!updated.length)error(409,'A ficha mudou. Atualize antes de salvar.');
    send(200,{request:updated[0]});
    return true;
  }
  return {publicHandle,handle};
}
