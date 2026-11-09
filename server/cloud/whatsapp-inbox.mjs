import {timingSafeEqual} from 'node:crypto';
import {fail} from './domain.mjs';
export function attachWhatsAppInbox({client,hashOf,env=process.env}){
 return {
 async bridge(path,req,body,send){
  if(path!=='/api/integrations/whatsapp-inbox')return false;
  if(env.EME_STAFF_WHATSAPP_ENABLED!=='true'||req.method!=='POST')fail(404,'Canal indisponível.');
  const expected=Buffer.from(env.EME_STAFF_WHATSAPP_TOKEN||''),actual=Buffer.from(String(req.headers.authorization||'').replace(/^Bearer /,''));
  if(expected.length<32||actual.length!==expected.length||!timingSafeEqual(expected,actual))fail(401,'Integração não autorizada.');
  if(body?.sessionId!=='eme-oficial-8029'||!['sync','control','claim','ack'].includes(body?.action))fail(403,'Operação não autorizada.');
  send(200,await client.rpc('eme_inbox_bridge',{p_action:body.action,p_data:body.data||{}}));return true;
 },
 async handle(path,req,user,body,send){
  if(!path.startsWith('/api/whatsapp-inbox'))return false;
  if(env.EME_STAFF_WHATSAPP_ENABLED!=='true')fail(404,'Canal indisponível.');
  if(user?.role!=='admin'||!user.active||user.must_change)fail(403,'A caixa de atendimento está disponível para a administração neste teste.');
  const url=new URL(req.url,'https://www.emeselect.com');
  if(path==='/api/whatsapp-inbox'&&req.method==='GET'){send(200,await client.rpc('eme_inbox_user',{p_session:hashOf(req),p_action:'list'}));return true;}
  if(path==='/api/whatsapp-inbox/messages'&&req.method==='GET'){send(200,await client.rpc('eme_inbox_user',{p_session:hashOf(req),p_action:'messages',p_phone:url.searchParams.get('phone')||''}));return true;}
  const action=path.split('/').at(-1);
  if(req.method==='POST'&&['send','mode','cancel'].includes(action)){
   if(!body||typeof body.phone!=='string')fail(400,'Selecione uma conversa.');
   if(action==='send'&&(typeof body.text!=='string'||!body.text.trim()||body.text.length>4000))fail(400,'Escreva uma mensagem de até 4.000 caracteres.');
   if(['send','cancel'].includes(action)&&!/^[a-f0-9-]{36}$/.test(body.id||''))fail(400,'Referência inválida.');
   send(200,await client.rpc('eme_inbox_user',{p_session:hashOf(req),p_action:action,p_phone:body.phone,...(body.id?{p_id:body.id}:{}),p_text:body.text||'',p_mode:body.mode||''}));return true;
  }
  fail(405,'Operação indisponível.');
 }
 };
}
