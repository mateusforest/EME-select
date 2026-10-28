import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {matchSwitchDemand} from '../../shared/switch-partners.mjs';
import {switchDealQuote} from '../../shared/switch-deals.mjs';
import {switchProToken} from './switch-professionals.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const nonnegative=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
const key=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
export function switchAutopilotSettings(env){
 const brokerage=Number(env.SWITCH_DEFAULT_BROKERAGE_BPS);
 const share=Number(env.SWITCH_DEFAULT_SHARE_BPS);
 const enabled=env.SWITCH_AUTOPILOT_ENABLED==='true' &&
   (env.SWITCH_INVITE_SECRET||'').length>=32 &&
   env.SWITCH_WHATSAPP_ENABLED==='true' &&
   nonnegative(brokerage,1,1000)&&nonnegative(share,1,10000);
 return {enabled,brokerageBps:brokerage,switchShareBps:share};
}
export function attachSwitchAutopilot({client,env=process.env}){
 const {rest,request}=client;
 async function run(){
   const cfg=switchAutopilotSettings(env);
   if(!cfg.enabled)return {enabled:false,created:0,reason:'Automação de propostas desativada.'};
   const [requests,offers,professionals]=await Promise.all([
     rest('eme_switch_requests?select=id,kind,status,city,property_type,asking_cents,target_city,target_budget_cents&status=eq.qualified&order=created_at.desc&limit=200'),
     rest('eme_switch_partner_offers?select=id,partner,ref,title,city,property_type,price_cents,available,authorization_confirmed,updated_at&available=is.true&authorization_confirmed=is.true&order=updated_at.desc&limit=300'),
     rest('eme_switch_professionals?select=id,city,property_type,phone,status,whatsapp_opt_in&status=eq.verified&whatsapp_opt_in=is.true&order=created_at.asc&limit=200')
   ]);
   // Não automatizar imóveis sem autorização, sem atualização recente ou sem demanda qualificada.
   const fresh=offers.filter(o=>Date.now()-Date.parse(o.updated_at)<7*86400000);
   const matches=matchSwitchDemand(requests.filter(r=>['buy','swap','invest'].includes(r.kind)),fresh,{limit:100});
   let created=0,skipped=0;
   const booked=new Set();
   for(const candidate of matches){
     if(created>=3)break; // máximo três convites por ciclo, não faz spam de rede.
     const offer=fresh.find(o=>o.id===candidate.assetId);
     const demand=requests.find(r=>r.id===candidate.investorId);
     if(!offer||!demand)continue;
     const pool=professionals.filter(p=>!booked.has(p.id)&&key(p.city)===key(offer.city)&&key(p.property_type)===key(offer.property_type));
     let pro=null;
     for(const potential of pool){
       // Limite de um convite por profissional nas últimas 24 horas, mesmo se ele tiver outras oportunidades.
       const recent=await rest('eme_switch_outbox?professional_id=eq.'+potential.id+
         '&created_at=gte.'+encodeURIComponent(new Date(Date.now()-86400000).toISOString())+
         '&select=id&limit=1');
       if(!recent.length){pro=potential;break;}
     }
     if(!pro){skipped++;continue;}
     const price=Number(offer.price_cents);
     if(!Number.isSafeInteger(price)||price<1000000)continue;
     const quote=switchDealQuote({salePriceCents:price,brokerageBps:cfg.brokerageBps,switchShareBps:cfg.switchShareBps});
     const id=randomUUID(),token=switchProToken(env,'deal',id);
     const record={
       id,token_hash:sha(token),public_ref:randomBytes(6).toString('hex').toUpperCase(),
       source_kind:'partner_offer',source_id:offer.id,demand_id:demand.id,
       teaser_city:offer.city,teaser_type:offer.property_type,
       sale_price_cents:quote.salePriceCents,brokerage_bps:quote.brokerageBps,
       switch_share_bps:quote.switchShareBps,status:'prepared',origin:'autopilot',
       created_by:null,expires_at:new Date(Date.now()+7*86400000).toISOString()
     };
     // Evita duplicação de um mesmo casal demanda/oferta mesmo com jobs concorrentes.
     const inserted=await request('/rest/v1/eme_switch_deal_invites?on_conflict=source_kind,source_id,demand_id',{
       method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:record
     });
     if(!inserted?.length){skipped++;continue;}
     await rest('eme_switch_outbox','POST',{
       id:randomUUID(),deal_id:id,professional_id:pro.id,phone:pro.phone,status:'pending'
     });
     booked.add(pro.id);created++;
   }
   return {enabled:true,created,skipped};
 }
 return {run};
}
