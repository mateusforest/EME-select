import {randomUUID,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {switchProfessionalEnrollment,switchProfessionalReview,switchSendEligibility} from '../../shared/switch-professionals.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const digest=value=>createHash('sha256').update(value).digest('hex');
const proTable='eme_switch_professionals';
const outboxTable='eme_switch_outbox';
const inviteTable='eme_switch_deal_invites';
const proFields='id,name,business,creci,phone,city,property_type,whatsapp_opt_in,status,verified_at,created_at,version';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function switchProToken(env,scope,id){
 const key=env.SWITCH_INVITE_SECRET||'';
 if(key.length<32)fail(503,'Ative a chave privada da M Switch antes de disponibilizar convites automáticos.');
 return createHmac('sha256',key).update('eme-switch:'+scope+':'+id).digest('base64url');
}
const matches=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
export function whatsappSwitchReady(env){
 return env.SWITCH_WHATSAPP_ENABLED==='true'&&
   typeof env.WHATSAPP_ACCESS_TOKEN==='string'&&env.WHATSAPP_ACCESS_TOKEN.length>20&&
   /^\d{5,30}$/.test(env.WHATSAPP_PHONE_NUMBER_ID||'')&&
   /^v\d{1,3}\.0$/.test(env.WHATSAPP_GRAPH_VERSION||'')&&
   /^[a-z0-9_]{3,80}$/.test(env.SWITCH_WHATSAPP_TEMPLATE||'')&&
   (env.SWITCH_INVITE_SECRET||'').length>=32;
}
export async function sendSwitchWhatsAppTemplate(env,{phone,city,inviteUrl,optoutUrl},fetcher=fetch){
 if(!whatsappSwitchReady(env))fail(503,'A integração Meta M Switch não está pronta.');
 const payload={
   messaging_product:'whatsapp',to:phone,type:'template',
   template:{name:env.SWITCH_WHATSAPP_TEMPLATE,language:{code:'pt_BR'},
     components:[{type:'body',parameters:[
       {type:'text',text:city},{type:'text',text:inviteUrl},{type:'text',text:optoutUrl}
     ]}]
   }
 };
 const response=await fetcher('https://graph.facebook.com/'+env.WHATSAPP_GRAPH_VERSION+'/'+env.WHATSAPP_PHONE_NUMBER_ID+'/messages',{
   method:'POST',headers:{Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN,'Content-Type':'application/json'},
   body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)fail(502,'A Meta não confirmou o envio do modelo. Confira credenciais, template aprovado e destino.');
 const data=await response.json();
 if(!data.messages?.[0]?.id)fail(502,'A Meta não retornou identificador de envio.');
 return {messageId:data.messages[0].id}; // enviado à Meta, ainda não entregue ao destinatário.
}
export function attachCloudSwitchProfessionals({client,rate,env=process.env,fetcher=fetch,autoMatch}){
 const {rest,request}=client;
 async function publicHandle(path,req,body,send){
   if(path==='/api/public/switch/professionals'&&req.method==='POST'){
     const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
     await rate('switch:pro-ip:'+digest(ip),5);
     const entry=switchProfessionalEnrollment(body);
     const id=randomUUID();
     const unsubscribeToken=switchProToken(env,'stop',id);
     const record={id,request_id:entry.requestId,name:entry.name,business:entry.business,
       creci:entry.creci,phone:entry.phone,city:entry.city,property_type:entry.propertyType,
       whatsapp_opt_in:true,privacy_accepted:true,optout_token_hash:digest(unsubscribeToken),
       status:'pending',version:1};
     try{
       await request('/rest/v1/'+proTable+'?on_conflict=request_id',{
         method:'POST',body:record,headers:{Prefer:'resolution=ignore-duplicates,return=minimal'}
       });
     }catch(e){
       if(e.status===409)fail(409,'Este telefone já consta de nossa rede. Entre em contato para ajustar preferências.');
       throw e;
     }
     send(201,{received:true,notice:'Cadastro enviado para verificação do CRECI. Nenhum contato de compradores foi compartilhado.'});
     return true;
   }
   if(path==='/api/public/switch/professionals/stop'&&req.method==='POST'){
     const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
     await rate('switch:pro-stop:'+digest(ip),10);
     if(!body||typeof body.token!=='string'||!/^[a-zA-Z0-9_-]{43}$/.test(body.token))fail(400,'Token inválido.');
     await rest(proTable+'?optout_token_hash=eq.'+digest(body.token),'PATCH',{
       status:'paused',whatsapp_opt_in:false,updated_at:new Date().toISOString()
     });
     send(200,{ok:true,notice:'Recebimento de oportunidades desativado, se a referência for válida.'});
     return true;
   }
   return false;
 }
 async function handle(path,req,user,body,send){
   if(path==='/api/switch/autopilot/run'){
     if(!user?.active||user.must_change||user.role!=='admin')fail(403,'Somente a gestão pode executar a automação.');
     if(req.method!=='POST')fail(405,'Operação indisponível.');
     await rate('switch:autopilot:'+user.id,10);
     const generated=typeof autoMatch==='function'?await autoMatch():{enabled:false,created:0};
     const deliveries=await dispatchPending();
     send(200,{generated,deliveries});
     return true;
   }
   const m=path.match(/^\/api\/switch\/professionals(?:\/([a-f0-9-]{36}))?$/);
   if(!m)return false;
   if(!user?.active||user.must_change||user.role!=='admin')fail(403,'Apenas a gestão pode consultar os profissionais.');
   if(!m[1]&&req.method==='GET'){
     const rows=await rest(proTable+'?select='+proFields+'&order=created_at.desc&limit=500');
     send(200,{professionals:rows,automatedWhatsAppReady:whatsappSwitchReady(env)});
     return true;
   }
   if(m[1]&&req.method==='PATCH'){
     const [prior]=await rest(proTable+'?id=eq.'+m[1]+'&select='+proFields+',version');
     if(!prior)fail(404,'Profissional não encontrado.');
     const input=switchProfessionalReview(body,prior);
     const result=await rest(proTable+'?id=eq.'+m[1]+'&version=eq.'+body.version,'PATCH',{
       ...input,version:prior.version+1,verified_by:user.id,
       ...(input.status==='verified'?{verified_at:new Date().toISOString()}:{}),updated_at:new Date().toISOString()
     });
     if(!result.length)fail(409,'Recarregue o cadastro.');
     send(200,{professional:result[0]});
     return true;
   }
   fail(405,'Operação indisponível.');
 }
 async function dispatchPending(dealId=null){
   if(!whatsappSwitchReady(env))return {ready:false,processed:0,submitted:0,skipped:0,failed:0};
   if(dealId!==null&&!uuid.test(dealId))fail(400,'Oportunidade inválida.');
   // Não há disparo para uma lista fria: só convites já preparados e vinculados a perfil verificado/opt-in.
   const jobs=await rest(outboxTable+'?status=eq.pending&select=*&order=created_at.asc&limit='+(dealId?1:5)+(dealId?'&deal_id=eq.'+dealId:''));
   let submitted=0,skipped=0,failed=0;
   for(const job of jobs){
     const [deal]=await rest(inviteTable+'?id=eq.'+job.deal_id+'&select=id,teaser_city,teaser_type,status,expires_at');
     const [pro]=await rest(proTable+'?id=eq.'+job.professional_id+'&select=id,phone,city,property_type,whatsapp_opt_in,status');
     if(!switchSendEligibility(pro,deal)||pro.phone!==job.phone){
       const claim=await rest(outboxTable+'?id=eq.'+job.id+'&status=eq.pending','PATCH',{status:'skipped',updated_at:new Date().toISOString()});
       if(claim.length)skipped++;
       continue;
     }
     const claimed=await rest(outboxTable+'?id=eq.'+job.id+'&status=eq.pending','PATCH',{status:'sending',attempts:job.attempts+1,updated_at:new Date().toISOString()});
     if(!claimed.length)continue; // outra execução já reservou
     const token=switchProToken(env,'deal',deal.id);
     const stop=switchProToken(env,'stop',pro.id);
     try{
       const result=await sendSwitchWhatsAppTemplate(env,{
         phone:pro.phone,city:deal.teaser_city,
         inviteUrl:'https://www.emeselect.com/switch/convite/'+token,
         optoutUrl:'https://www.emeselect.com/switch/sair/'+stop
       },fetcher);
       await rest(outboxTable+'?id=eq.'+job.id+'&status=eq.sending','PATCH',{
         status:'submitted',provider_message_id:result.messageId,updated_at:new Date().toISOString()
       });
       submitted++;
     }catch(e){
       // Não repetir automaticamente após falha ambígua da API para evitar envio duplicado.
       await rest(outboxTable+'?id=eq.'+job.id+'&status=eq.sending','PATCH',{
         status:'failed',error_detail:'Falha no envio Meta; revisar credenciais, template e status do contato.',updated_at:new Date().toISOString()
       });
       failed++;
     }
   }
   return {ready:true,processed:submitted+skipped+failed,submitted,skipped,failed,deliveryConfirmed:false};
 }
 async function cronHandle(path,req,send){
   if(path!=='/api/switch/cron')return false;
   const secret=env.CRON_SECRET||'',provided=String(req.headers.authorization||'');
   if(req.method!=='GET'||secret.length<20||!matches('Bearer '+secret,provided))fail(403,'Execução não autorizada.');
   const generated=typeof autoMatch==='function'?await autoMatch():{enabled:false,created:0};
   const result=await dispatchPending();
   send(200,{...result,generated});
   return true;
 }
 return {publicHandle,handle,cronHandle,dispatchDeal:id=>dispatchPending(id)};
}
