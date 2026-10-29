import {randomUUID} from 'node:crypto';
import {allRecords} from '../../shared/staff-inventory.mjs';
import {propertyRecordsQuery} from '../../shared/portal-content.mjs';
import {publicAccess} from '../select-access.mjs';
import {profileForLead} from '../../shared/buyer-qualification.mjs';
import {switchPhone} from '../../shared/switch-intake.mjs';

const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const uuid=/^[a-f0-9-]{36}$/i;
const cityOf=location=>String(location||'').split(/[·,|]/).map(s=>s.trim()).filter(s=>s&&!/^[A-Z]{2}$/.test(s)).at(-1)?.replace(/\s*[-/]\s*[A-Z]{2}$/,'').trim()||'';
const typeOf=value=>/terreno|lote/i.test(value)?'Terreno':/apartamento|cobertura/i.test(value)?'Apartamento':/comercial|loja|sala|galpão/i.test(value)?'Comercial':/casa|cabana/i.test(value)?'Casa':value;

export function attachSwitchPortfolio({client,priceProperties=async rows=>rows}){
  const {rest,request}=client;
  async function offers(id){
    const rows=await allRecords(rest,'eme_cases?select=id,data&data->published=not.is.null&order=id'+propertyRecordsQuery+(id?'&id=eq.'+id:''));
    const visible=rows.filter(r=>publicAccess(r)&&r.data.published?.operation==='comprar'&&r.data.published?.isIllustrative===false);
    const priced=await priceProperties(visible.map(r=>r.data.published));
    return priced.filter(p=>Number.isFinite(p.price)&&p.price>=10000).map(p=>({
      id:p.id,partner:'Carteira EME Select',ref:p.id,title:p.title,city:cityOf(p.location),
      property_type:typeOf(p.type),price_cents:Math.round(p.price*100),offer_url:'https://www.emeselect.com/imovel/'+p.id,
      available:true,authorization_confirmed:true,source_kind:'partner_offer',catalog:true,
      // Snapshot read from the current published portfolio, never a copied listing.
      updated_at:new Date().toISOString()
    })).filter(p=>p.city&&p.property_type&&Number.isSafeInteger(p.price_cents));
  }
  async function resolve(id){
    if(!uuid.test(id))return null;
    const [partner]=await rest('eme_switch_partner_offers?id=eq.'+id+'&select=*');
    return partner||(await offers(id))[0]||null;
  }
  function leadCandidate(lead){
    if(['won','lost','archived'].includes(lead.status))return null;
    let p;try{p=profileForLead(lead);}catch{return null;}
    if(p.operation!=='comprar'||p.contactPermission!=='granted'||!p.city||!p.propertyType||!p.budgetMax||p.budgetMax<10000)return null;
    let phone;try{phone=switchPhone(lead.data.phone);}catch{return null;}
    return {id:lead.id,name:lead.data.name,phone,city:p.city,property_type:p.propertyType,asking_cents:Math.round(p.budgetMax*100),owner_id:lead.assignee_id||null};
  }
  async function checkDemand(demand){
    if(!demand||!String(demand.source||'').startsWith('crm:'))return demand;
    const id=demand.source.slice(4);if(!uuid.test(id))return null;
    const [lead]=await rest('eme_leads?id=eq.'+id+'&select=id,data,status,assignee_id');
    const current=lead&&leadCandidate(lead);
    // A changed search or revoked permission requires a new review, not stale matching.
    return current&&['phone','city','property_type','asking_cents'].every(k=>String(current[k])===String(demand[k]))?demand:null;
  }
  async function handle(path,req,user,body,send){
    if(!['/api/switch/portfolio','/api/switch/portfolio/leads'].includes(path))return false;
    if(!user?.active||user.must_change||user.role!=='admin')fail(403,'Somente a gestão conecta a carteira e os contatos.');
    if(path==='/api/switch/portfolio'&&req.method==='GET'){
      const [catalog,leads,linked]=await Promise.all([offers(),allRecords(rest,'eme_leads?select=id,data,status,assignee_id&order=id'),allRecords(rest,'eme_switch_requests?select=request_id&order=id')]);
      const ids=new Set(linked.map(r=>r.request_id));
      send(200,{catalog,leads:leads.map(leadCandidate).filter(Boolean).filter(r=>!ids.has(r.id))});return true;
    }
    if(path==='/api/switch/portfolio/leads'&&req.method==='POST'){
      if(!uuid.test(body?.leadId||'')||body?.reviewConfirmed!==true)fail(400,'Selecione um contato e confirme a revisão de finalidade com ele.');
      const [lead]=await rest('eme_leads?id=eq.'+body.leadId+'&select=id,data,status,assignee_id');
      const candidate=lead&&leadCandidate(lead);
      if(!candidate)fail(409,'Revise o perfil de compra e a autorização de contato no funil antes de conectar.');
      await request('/rest/v1/eme_switch_requests?on_conflict=request_id',{
        method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:{
          id:randomUUID(),request_id:lead.id,kind:'buy',name:candidate.name,phone:candidate.phone,
          city:candidate.city,property_type:candidate.property_type,asking_cents:candidate.asking_cents,
          owner_id:candidate.owner_id,source:'crm:'+lead.id,status:'reviewing',
          contact_opt_in:true,updates_opt_in:false,privacy_accepted:true,demand_reviewed:false,
          // Existing evidence is not relabeled as acceptance of the public Switch form.
          consent_version:lead.data.consentVersion||null,consent_recorded_at:null,
          review_note:'Conexão ao Switch revisada pela gestão. Confirmar demanda antes de qualificar.',reviewed_by:user.id
        }
      });
      send(201,{connected:true});return true;
    }
    fail(405,'Operação indisponível.');
  }
  return {offers,resolve,handle,checkDemand};
}
