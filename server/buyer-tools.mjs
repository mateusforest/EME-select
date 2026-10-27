import {buyerIntake,buyerProfile,buyerReadiness,matchBuyer,profileForLead} from '../shared/buyer-qualification.mjs';
import {leadFail,leadId} from '../shared/leads.mjs';
import {createHash} from 'node:crypto';
export function createBuyerTools({store,ai}){
 return async function handle(path,req,user,body,send){
  const match=path.match(/^\/api\/leads\/([a-f0-9-]{36})\/(qualification|analyze)$/);
  if(!match&&!['/api/leads/tools','/api/leads/intake'].includes(path))return false;
  if(!user?.active||user.must_change||!['admin','corretor'].includes(user.role))leadFail(403,'Acesso não permitido.');
  if(path==='/api/leads/tools'&&req.method==='GET'){let settings;try{settings=await ai?.studioStatus(user);}catch{settings=null;}send(200,{storageReady:await store.buyerReady(),aiReady:!!(settings?.configured&&settings.enabled),automaticWhatsApp:false,automaticInstagram:false,automaticEmail:false});return true;}
  if(!await store.buyerReady())leadFail(503,'A captação e qualificação aguardam a ativação do banco de dados. O acompanhamento atual continua disponível.');
  if(path==='/api/leads/intake'&&req.method==='POST'){
   const input=buyerIntake(body),hash=createHash('sha256').update(JSON.stringify(input.data)).digest('hex');
   const result=await store.buyerCreate(req,user,input,hash);send(201,result);return true;
  }
  if(!match)leadFail(405,'Operação indisponível.');
  const id=leadId(match[1]),lead=await store.buyerLead(user,id);
  if(match[2]==='qualification'&&req.method==='GET'){
   const profile=profileForLead(lead);send(200,{profile,reviewedAt:lead.data.qualification?.reviewedAt||null,readiness:buyerReadiness(profile,lead),...matchBuyer(profile,await store.buyerCatalog())});return true;
  }
  if(!body||!Number.isInteger(body.version)||body.version!==lead.version)leadFail(409,'O contato mudou. Atualize antes de continuar.');
  if(match[2]==='qualification'&&req.method==='PATCH'){
   if(Object.keys(body).some(k=>!['version','profile'].includes(k)))leadFail(400,'Confira os campos da qualificação.');
   await store.buyerSave(req,user,id,body.version,buyerProfile(body.profile));send(200,{saved:true});return true;
  }
  if(match[2]==='analyze'&&req.method==='POST'){
   if(Object.keys(body).some(k=>!['version','conversation'].includes(k))||typeof body.conversation!=='string'||body.conversation.trim().length<15||body.conversation.length>8000)leadFail(400,'Use de 15 a 8.000 caracteres da conversa sobre a busca.');
   if(!ai)leadFail(503,'A conexão da IA ainda não está disponível.');
   const result=await ai.qualifyBuyer(user,body.conversation.trim());
   const latest=await store.buyerLead(user,id);if(latest.version!==lead.version)leadFail(409,'O contato mudou durante a análise. Atualize a ficha.');
   send(200,result);return true;
  }
  leadFail(405,'Operação indisponível.');
 };
}
