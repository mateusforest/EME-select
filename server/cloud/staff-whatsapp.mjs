import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
import {fail} from './domain.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const phones=['555499902688','5554984007919','5554981037089'];
const normalizePhone=value=>{const n=String(value||'').replace(/\D/g,'');return n==='555481037089'?'5554981037089':n;};
export function attachStaffWhatsApp({client,hashOf,env=process.env}){
 const enabled=()=>env.EME_STAFF_WHATSAPP_ENABLED==='true';
 return {
  async bridge(path,req,body,send){
   if(path!=='/api/integrations/staff-whatsapp/message')return false;
   if(!enabled()||req.method!=='POST')fail(404,'Canal indisponível.');
   const expected=Buffer.from(env.EME_STAFF_WHATSAPP_TOKEN||''),actual=Buffer.from(String(req.headers.authorization||'').replace(/^Bearer /,''));
   if(expected.length<32||actual.length!==expected.length||!timingSafeEqual(expected,actual))fail(401,'Integração não autorizada.');
   if(!body||!phones.includes(body.phone)||body.sessionId!=='eme-oficial-8029')fail(403,'Contato ou sessão fora do teste autorizado.');
   if(typeof body.text!=='string'||!body.text.trim()||body.text.length>1500||typeof body.messageId!=='string'||!body.messageId||body.messageId.length>150)fail(400,'Mensagem inválida.');
   const match=body.text.trim().toLowerCase().match(/^vincular ([a-f0-9]{16})$/);
   send(200,await client.rpc('eme_staff_wa_message',{p_phone:body.phone,p_message_id:body.messageId,p_text:body.text.trim(),p_content_hash:hash(body.text),p_code_hash:match?hash(match[1]):''}));return true;
  },
  async handle(path,req,user,body,send){
   if(!path.startsWith('/api/staff-whatsapp'))return false;
   if(!enabled())fail(404,'Canal indisponível.');
   if(!user?.active||user.must_change)fail(403,'Entre com uma conta ativa da equipe.');
   const p_session=hashOf(req);
   if(path==='/api/staff-whatsapp'&&req.method==='GET'){
    send(200,{enabled:true,...await client.rpc('eme_staff_wa_dashboard',{p_session})});return true;
   }
   if(path==='/api/staff-whatsapp/link'&&req.method==='POST'){
    const phone=normalizePhone(body?.phone);
    if(!phones.includes(phone))fail(400,'Use um contato autorizado para o teste, com 55 e DDD.');
    const code=randomBytes(8).toString('hex');
    await client.rpc('eme_staff_wa_account',{p_session,p_action:'code',p_phone:phone,p_hash:hash(code)});
    send(200,{command:'VINCULAR '+code,expiresInMinutes:10});return true;
   }
   if(path==='/api/staff-whatsapp/unlink'&&req.method==='POST'){
    await client.rpc('eme_staff_wa_account',{p_session,p_action:'unlink'});send(200,{ok:true});return true;
   }
   fail(405,'Operação indisponível.');
  }
 };
}
