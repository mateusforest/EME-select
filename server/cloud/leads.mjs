import {leadFail} from '../../shared/leads.mjs';
import {createLeads} from '../leads.mjs';
import {createHash} from 'node:crypto';
import {propertyRecordsQuery} from '../../shared/portal-content.mjs';
import {publicAccess} from '../select-access.mjs';
import {allRecords} from '../../shared/staff-inventory.mjs';
export function attachCloudLeads({client,hashOf,ai,priceProperties=async rows=>rows}){
 const {rest,rpc}=client;
 const store={
  buyerReady:async()=>Number((await rest('eme_lead_settings?id=eq.company&select=*'))[0]?.qualification_version)>=1,
  buyerLead:async(user,id)=>{const row=(await rest('eme_leads?id=eq.'+id+(user.role==='admin'?'':'&assignee_id=eq.'+user.id)))[0];if(!row)leadFail(404,'Contato não encontrado.');return row;},
  buyerCatalog:async()=>priceProperties((await allRecords(rest,'eme_cases?select=id,data->published,data->access,data->archived,data->deletedAt&data->published=not.is.null&order=id'+propertyRecordsQuery)).filter(r=>publicAccess({data:r})).map(r=>r.published).filter(Boolean)),
  buyerSave:(req,_user,id,version,profile)=>rpc('eme_qualify_lead',{p_session:hashOf(req),p_id:id,p_version:version,p_profile:profile}),
  buyerCreate:async(req,user,input,hash)=>{await rpc('eme_limit',{p_key:'buyer-intake:'+user.id,p_max:60});return rpc('eme_intake_lead',{p_session:hashOf(req),p_id:input.requestId,p_hash:hash,p_data:input.data});},
  receive:(input,fingerprint)=>rpc('eme_receive_lead',{p_id:input.requestId,p_hash:fingerprint,p_property:input.propertyId,p_data:input.data}),
  snapshot:async (user,personal=false)=>{const filter=user.role==='admin'&&!personal?'':'&assignee_id=eq.'+user.id;const [leads,members,settings]=await Promise.all([rest('eme_leads?select=*&order=updated_at.desc&limit=500'+filter),rest('eme_profiles?select=id,name,email,role,active,must_change&order=name'+(user.role==='admin'?'':'&id=eq.'+user.id)),user.role==='admin'?rest('eme_lead_settings?id=eq.company&select=*'):[]]);const ids=leads.map(l=>l.id);const events=ids.length?await rest('eme_lead_events?select=id,lead_id,actor_id,action,detail,created_at,eme_leads!inner(assignee_id)&order=created_at.desc&limit=2000'+(user.role==='admin'?'':'&eme_leads.assignee_id=eq.'+user.id)):[];return {leads:leads.map(l=>({...l,events:events.filter(e=>e.lead_id===l.id)})),members,settings:settings[0]?{version:settings[0].version,mode:settings[0].mode,brokers:settings[0].brokers,weights:settings[0].weights||{},weightedAvailable:Object.hasOwn(settings[0],'weights'),adminBrokersAvailable:settings[0].admin_brokers_enabled===true}:null,limit:500};},
  update:(req,_user,id,value)=>rpc('eme_update_lead',{p_session:hashOf(req),p_id:id,p_version:value.version,p_status:value.status,p_assignee:value.assigneeId,p_next:value.nextContactAt,p_note:value.note}),
  settings:async(req,_user,value)=>{const current=(await rest('eme_lead_settings?id=eq.company&select=*'))[0];const ready=!!current&&Object.hasOwn(current,'weights');if(value.mode==='weighted'&&!ready)leadFail(503,'A distribuição por percentuais aguarda a atualização do banco de dados. Execute o SQL de ativação antes de salvar esta regra.');return rpc(ready?'eme_route_leads_v2':'eme_route_leads',{p_session:hashOf(req),p_version:value.version,p_mode:value.mode,p_brokers:value.brokers,...(ready?{p_weights:value.weights}:{})});},
 };
 return createLeads({store,ai,rate:async req=>{const ip=createHash('sha256').update(String(req.headers['x-forwarded-for']||'unknown').split(',')[0]).digest('hex');await rpc('eme_limit',{p_key:'lead:'+ip,p_max:8});await rpc('eme_limit',{p_key:'lead:total',p_max:200});}});
}
