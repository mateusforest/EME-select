import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {switchDealQuote,switchOfferDraft,switchOfferTeaser,switchOfferAcceptance,switchDealTransition} from '../../shared/switch-deals.mjs';
import {switchProToken} from './switch-professionals.mjs';
import {switchSendEligibility} from '../../shared/switch-professionals.mjs';
const err=(status,message)=>{throw Object.assign(new Error(message),{status});};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const tokenFormat=/^[a-zA-Z0-9_-]{43}$/;
const hash=value=>createHash('sha256').update(value).digest('hex');
const table='eme_switch_deal_invites';
const selected='id,public_ref,source_kind,source_id,demand_id,teaser_city,teaser_type,sale_price_cents,brokerage_bps,switch_share_bps,status,recipient_name,recipient_phone,recipient_creci,recipient_business,recipient_marketing_opt_in,acknowledged_at,contract_reference,license_checked,signed_confirmed_at,actual_sale_cents,received_cents,created_by,version,created_at,expires_at';
export function attachCloudSwitchDeals({client,rate,env=process.env,notifyNow}){
 const {rest,rpc}=client;
 async function publicHandle(path,req,body,send){
   const match=path.match(/^\/api\/public\/switch\/offers\/([a-zA-Z0-9_-]{43})(?:\/(interest))?$/);
   if(!match)return false;
   const token=match[1],hashToken=hash(token),interest=match[2]==='interest';
   if((interest&&req.method!=='POST')||(!interest&&req.method!=='GET'))err(405,'Método indisponível.');
   const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
   await rate('switch:invite-ip:'+hash(ip),interest?10:40);
   const [row]=await rest(table+'?token_hash=eq.'+hashToken+'&select='+selected);
   if(!row||row.status==='cancelled'||(row.status==='prepared'&&Date.parse(row.expires_at)<=Date.now()))err(404,'Convite indisponível ou expirado.');
   if(!interest){
     send(200,{offer:switchOfferTeaser(row)});
     return true;
   }
   if(row.status!=='prepared')err(409,'Esta manifestação já foi registrada ou o convite encerrou.');
   const accepted=switchOfferAcceptance(body);
   try{
     await rpc('eme_switch_acknowledge',{
       p_token_hash:hashToken,p_name:accepted.name,p_phone:accepted.phone,
       p_creci:accepted.creci,p_business:accepted.business,p_marketing_opt_in:accepted.marketingOptIn
     });
   }catch(e){
     // Não vazar erros do banco nem distinguir token válido de token expirado.
     if(String(e.message||'').includes('DEAL_NOT_AVAILABLE'))err(409,'Este convite já foi respondido ou expirou.');
     throw e;
   }
   send(200,{registered:true,notice:'Interesse registrado para conferência da equipe. Não há liberação de contatos sem contrato e autorização.'});
   return true;
 }
 async function handle(path,req,user,body,send){
   const match=path.match(/^\/api\/switch\/deals(?:\/([a-f0-9-]{36}))?$/);
   if(!match)return false;
   if(!user?.active||user.must_change||user.role!=='admin')err(403,'Apenas a gestão acompanha condições comerciais.');
   if(!match[1]&&req.method==='GET'){
     const rows=await rest(table+'?select='+selected+'&order=created_at.desc&limit=200');
     send(200,{deals:rows.map(row=>({...row,quote:switchDealQuote({salePriceCents:Number(row.sale_price_cents),brokerageBps:row.brokerage_bps,switchShareBps:row.switch_share_bps})}))});
     return true;
   }
   if(!match[1]&&req.method==='POST'){
     await rate('switch:deals:'+user.id,50);
     const [source,target]=await Promise.all([
       rest((body?.sourceKind==='partner_offer'?'eme_switch_partner_offers':'eme_switch_requests')+'?id=eq.'+encodeURIComponent(String(body?.sourceId||''))+'&select=*'),
       rest('eme_switch_requests?id=eq.'+encodeURIComponent(String(body?.demandId||''))+'&select=*')
     ]);
     const offer=source[0],demand=target[0];
     const {professionalId,...requestInput}=body||{};
     const draft=switchOfferDraft(requestInput,offer,demand);
     const wantedCity=demand.kind==='swap'?demand.target_city:demand.city;
     const wantedMax=Number(demand.kind==='swap'?demand.target_budget_cents:demand.asking_cents);
     const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
     if(normalize(offer.city)!==normalize(wantedCity)||normalize(offer.property_type)!==normalize(demand.property_type)||
       !Number.isSafeInteger(wantedMax)||wantedMax<draft.salePriceCents)err(409,'Confirme cidade, tipo, orçamento e condições desta combinação.');
     let professional=null;
     if(professionalId!==undefined){
       if(typeof professionalId!=='string'||!uuid.test(professionalId))err(400,'Profissional inválido.');
       const [found]=await rest('eme_switch_professionals?id=eq.'+professionalId+'&select=id,phone,city,property_type,status,whatsapp_opt_in');
       professional=found;
       if(!professional||!switchSendEligibility(professional,{
         status:'prepared',expires_at:new Date(Date.now()+86400000).toISOString(),teaser_city:offer.city,teaser_type:offer.property_type
       }))err(403,'Profissional não verificado, sem opt-in ou fora da área da oportunidade.');
       if((env.SWITCH_INVITE_SECRET||'').length<32)err(503,'Ative a chave de convites antes de preparar um envio automático.');
     }
     const dealId=randomUUID();
     const token=professional?switchProToken(env,'deal',dealId):randomBytes(32).toString('base64url');
     const reference=randomBytes(6).toString('hex').toUpperCase();
     const entry={
       id:dealId,token_hash:hash(token),public_ref:reference,
       source_kind:draft.sourceKind,source_id:draft.sourceId,demand_id:draft.demandId,
       teaser_city:offer.city,teaser_type:offer.property_type,
       sale_price_cents:draft.salePriceCents,brokerage_bps:draft.brokerageBps,
       switch_share_bps:draft.switchShareBps,expires_at:new Date(Date.now()+draft.expiresDays*86400000).toISOString(),
       created_by:user.id,status:'prepared'
     };
     const rows=await rest(table,'POST',entry);
     let queued=false;
     if(professional){
       try{
         await rest('eme_switch_outbox','POST',{
           id:randomUUID(),deal_id:dealId,professional_id:professional.id,phone:professional.phone,status:'pending'
         });
         queued=true;
       }catch(e){
         // O convite já foi criado. Não inventar sucesso do envio nem excluir registros auditáveis.
         console.error('M Switch outbox creation failed:',e?.code||e?.name||'error');
       }
     }
     let notification={ready:false,submitted:0};
     if(queued&&typeof notifyNow==='function'){
       try{notification=await notifyNow(dealId);}catch(e){console.error('M Switch notify failed:',e?.name||'error');}
     }
     send(201,{deal:rows[0],invitePath:'/switch/convite/'+token,queued,
       notifiedToMeta:notification.submitted>0,
       notice:notification.submitted>0?'Convite submetido à Meta. Entrega ao destino ainda precisa ser confirmada.':queued?'Convite registrado na fila; envio depende da configuração da Meta.':'Link individual pronto; nenhum WhatsApp foi enviado.'});
     return true;
   }
   if(match[1]&&req.method==='PATCH'){
     if(!uuid.test(match[1])||!body||typeof body!=='object'||Array.isArray(body)||
       Object.keys(body).some(k=>!['version','action','contractReference','licenseChecked','actualSaleCents','receivedCents'].includes(k)))err(400,'Revisão inválida.');
     const [row]=await rest(table+'?id=eq.'+match[1]+'&select='+selected);
     if(!row)err(404,'Oportunidade não encontrada.');
     if(!Number.isSafeInteger(body.version)||body.version!==row.version)err(409,'A oportunidade mudou. Atualize antes de continuar.');
     const transition=switchDealTransition(row,body.action,body);
     const updates={...transition,version:row.version+1,updated_by:user.id,updated_at:new Date().toISOString()};
     if(body.action==='contract'){
       updates.contract_reference=body.contractReference.trim();
       updates.license_checked=true;
       updates.signed_confirmed_at=new Date().toISOString();
     }
     if(body.action==='close')updates.actual_sale_cents=body.actualSaleCents;
     if(body.action==='paid'){
       const actualCommission=Math.round(Number(row.actual_sale_cents)*row.brokerage_bps/10000);
       const expectedShare=Math.round(actualCommission*row.switch_share_bps/10000);
       if(body.receivedCents>expectedShare)err(400,'Recebimento acima da participação calculada. Revise o contrato.');
       updates.received_cents=body.receivedCents;
     }
     const rows=await rest(table+'?id=eq.'+row.id+'&version=eq.'+row.version,'PATCH',updates);
     if(!rows.length)err(409,'A oportunidade mudou. Atualize antes de continuar.');
     send(200,{deal:rows[0]});
     return true;
   }
   err(405,'Operação indisponível.');
 }
 return {handle,publicHandle};
}
