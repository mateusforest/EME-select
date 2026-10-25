import {createHash} from 'node:crypto';
import {fail} from './cloud/domain.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const analyticsSections=['hero','collection','opportunities','team','owners','contact','curation','innovation','ideas','access','selection','chat','whatsapp','financing'];
const pages=['home','catalog','opportunities','region','property','innovation'];
export const analyticsDay=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function analyticsInput(body){
 if(!body||!uuid.test(body.session)||!Array.isArray(body.events)||!body.events.length||body.events.length>20)fail(400,'Medição inválida.');
 const device=['mobile','tablet','desktop'].includes(body.device)?body.device:'desktop';const source=['direct','google','instagram','facebook','whatsapp','other'].includes(body.source)?body.source:'other';
 return {session:body.session,device,source,events:body.events.map(e=>{if(!e||!uuid.test(e.id)||!['page_view','property_click','section_view','section_click'].includes(e.type)||!pages.includes(e.page))fail(400,'Evento inválido.');if(e.type.startsWith('section_')&&!analyticsSections.includes(e.section))fail(400,'Seção inválida.');if((e.type==='property_click'||e.page==='property')&&!uuid.test(e.propertyId))fail(400,'Imóvel inválido.');return {id:e.id,type:e.type,page:e.page,...(e.propertyId&&uuid.test(e.propertyId)?{propertyId:e.propertyId}:{}),...(analyticsSections.includes(e.section)?{section:e.section}:{})};})};
}
export function analyticsBucket(input,date=new Date()){
 const day=analyticsDay(date),hash=createHash('sha256').update(day+':'+input.session).digest('hex'),shard=parseInt(hash.slice(0,2),16)%16;
 const raw=createHash('sha256').update('eme-site-analytics:'+day+':'+shard).digest('hex');return {id:raw.slice(0,8)+'-'+raw.slice(8,12)+'-4'+raw.slice(13,16)+'-8'+raw.slice(17,20)+'-'+raw.slice(20,32),day,session:hash.slice(0,24)};
}
const increment=(map,key)=>map[key]=(map[key]||0)+1;
export function mergeAnalytics(previous,input,bucket,catalog,date=new Date()){
 const data=previous?structuredClone(previous):{kind:'site_analytics',day:bucket.day,startedAt:date.toISOString(),sessions:[],receipts:[],visits:0,pageViews:0,pages:{},properties:{},sections:{},devices:{},sources:{},hours:{},limited:false};
 const receipts=new Set(data.receipts);let changed=false;
 for(const e of input.events){if(receipts.has(e.id))continue;if(e.propertyId&&!catalog.has(e.propertyId))continue;changed=true;receipts.add(e.id);
  if(!data.sessions.includes(bucket.session)){if(data.sessions.length<1000){data.sessions.push(bucket.session);data.visits++;increment(data.devices,input.device);increment(data.sources,input.source);}else data.limited=true;}
  if(e.type==='page_view'){data.pageViews++;increment(data.pages,e.page);increment(data.hours,new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:'America/Sao_Paulo'}).format(date));}
  if(e.propertyId){if(data.properties[e.propertyId]||Object.keys(data.properties).length<100){const p=data.properties[e.propertyId]||(data.properties[e.propertyId]={id:e.propertyId,title:String(catalog.get(e.propertyId)||'Imóvel').slice(0,120),views:0,clicks:0,contacts:0});if(e.type==='page_view'&&e.page==='property')p.views++;if(e.type==='property_click')p.clicks++;if(e.type==='section_click'&&['contact','whatsapp'].includes(e.section))p.contacts++;}else data.limited=true;}
  if(e.section){const s=data.sections[e.section]||(data.sections[e.section]={id:e.section,views:0,clicks:0});if(e.type==='section_view')s.views++;if(e.type==='section_click')s.clicks++;}
 }
 data.receipts=[...receipts].slice(-600);data.updatedAt=date.toISOString();return {data,changed};
}
export function analyticsReport(rows,leads,days,now=new Date()){
 const to=analyticsDay(now),from=analyticsDay(new Date(now.getTime()-(days-1)*86400000));const data={from,to,days,startedAt:null,visits:0,pageViews:0,landingViews:0,propertyViews:0,leads:leads.length,leadStatus:{},pages:{},properties:{},sections:{},devices:{},sources:{},daily:{},limited:false};
 for(let i=days-1;i>=0;i--){const d=analyticsDay(new Date(now.getTime()-i*86400000));data.daily[d]={day:d,visits:0,pageViews:0,leads:0};}
 for(const row of rows){const r=row.data||row;if(r.day<from||r.day>to)continue;if(!data.startedAt||r.startedAt<data.startedAt)data.startedAt=r.startedAt;data.visits+=r.visits;data.pageViews+=r.pageViews;data.landingViews+=r.pages.home||0;data.propertyViews+=r.pages.property||0;data.limited ||= r.limited;data.daily[r.day].visits+=r.visits;data.daily[r.day].pageViews+=r.pageViews;
  for(const key of ['pages','devices','sources'])for(const [k,v]of Object.entries(r[key]))data[key][k]=(data[key][k]||0)+v;
  for(const key of ['properties','sections'])for(const [k,v]of Object.entries(r[key])){const existing=data[key][k]||(data[key][k]={...v,views:0,clicks:0,...(key==='properties'?{contacts:0,leads:0}:{})});existing.views+=v.views;existing.clicks+=v.clicks;if(key==='properties')existing.contacts+=v.contacts;}
 }
 for(const lead of leads){increment(data.leadStatus,lead.status);const day=analyticsDay(new Date(lead.created_at));if(data.daily[day])data.daily[day].leads++;if(lead.property_id){const p=data.properties[lead.property_id]||(data.properties[lead.property_id]={id:lead.property_id,title:'Imóvel sem navegação registrada no período',views:0,clicks:0,contacts:0,leads:0});p.leads++;}}
 return {...data,properties:Object.values(data.properties).sort((a,b)=>b.views-a.views||b.leads-a.leads),sections:Object.values(data.sections).sort((a,b)=>b.clicks-a.clicks),daily:Object.values(data.daily)};
}
export function createAnalytics({store,rate,now=()=>new Date()}){
 return {
  async publicHandle(path,req,body,send){if(path!=='/api/public/analytics')return false;if(req.method!=='POST')fail(405,'Método inválido.');if(/bot|crawler|spider|headless/i.test(String(req.headers['user-agent']||''))||req.headers.dnt==='1'||req.headers['sec-gpc']==='1'){send(202,{received:false});return true;}const input=analyticsInput(body);await rate(req);const date=now();await store.record(input,date);send(202,{received:true});return true;},
  async handle(path,req,user,send){if(path!=='/api/analytics')return false;if(user?.role!=='admin'||user.active===false||user.must_change)fail(403,'Área exclusiva da administração.');if(req.method!=='GET')fail(405,'Método inválido.');const days=Number(new URL(req.url,'https://emeselect.com').searchParams.get('days')||30);if(![7,30,90].includes(days))fail(400,'Escolha um período válido.');send(200,await store.report(days,now()));return true;}
 };
}
