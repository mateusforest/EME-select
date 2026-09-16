import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const WHATSAPP_CALLBACK = 'https://www.emeselect.com/api/webhooks/whatsapp';
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const hash = value => createHash('sha256').update(value).digest('hex');
const same = (left, right) => { const a=Buffer.from(left), b=Buffer.from(right); return a.length===b.length && timingSafeEqual(a,b); };
const text = (value, limit=4096) => typeof value==='string' ? value.slice(0,limit) : '';
export function whatsappConfiguration(env) {
  const fields = [
    ['WHATSAPP_ACCESS_TOKEN','Credencial da Cloud API',Boolean(env.WHATSAPP_ACCESS_TOKEN)],
    ['WHATSAPP_PHONE_NUMBER_ID','Identificador do número',/^\d{5,30}$/.test(env.WHATSAPP_PHONE_NUMBER_ID||'')],
    ['WHATSAPP_BUSINESS_ACCOUNT_ID','Conta empresarial do WhatsApp',/^\d{5,30}$/.test(env.WHATSAPP_BUSINESS_ACCOUNT_ID||'')],
    ['META_APP_SECRET','Segredo do aplicativo Meta',Boolean(env.META_APP_SECRET?.length>=16)],
    ['WHATSAPP_VERIFY_TOKEN','Token de verificação do recebimento',Boolean(env.WHATSAPP_VERIFY_TOKEN?.length>=32)],
    ['WHATSAPP_GRAPH_VERSION','Versão da API indicada pela Meta',/^v\d{1,3}\.0$/.test(env.WHATSAPP_GRAPH_VERSION||'')],
  ].map(([name,label,configured])=>({name,label,configured}));
  return {fields,configured:fields.every(field=>field.configured),enabled:env.WHATSAPP_WEBHOOK_ENABLED==='true',callbackUrl:WHATSAPP_CALLBACK,expectedNumber:env.WHATSAPP_EXPECTED_NUMBER||'5554991578029',automaticReplies:false};
}

export function extractWhatsAppEvents(payload, env) {
  if(payload?.object!=='whatsapp_business_account'||!Array.isArray(payload.entry)||payload.entry.length>100)fail(400,'Evento inválido.');
  const events=[];
  for(const entry of payload.entry){
    if(String(entry.id)!==env.WHATSAPP_BUSINESS_ACCOUNT_ID)fail(403,'Conta não autorizada.');
    if(!Array.isArray(entry.changes)||entry.changes.length>100)fail(400,'Evento inválido.');
    for(const change of entry.changes){
      const value=change.value;
      if(change.field!=='messages')continue;
      if(!value||value.messaging_product!=='whatsapp'||String(value.metadata?.phone_number_id)!==env.WHATSAPP_PHONE_NUMBER_ID)fail(403,'Número não autorizado.');
      const messages=value.messages||[], statuses=value.statuses||[];
      if(!Array.isArray(messages)||!Array.isArray(statuses)||messages.length+statuses.length>100)fail(400,'Evento inválido.');
      for(const [kind,items] of [['message',messages],['status',statuses]])for(const item of items){
        if(typeof item.id!=='string'||!item.id||item.id.length>300||!/^\d{1,14}$/.test(String(item.timestamp)))fail(400,'Evento inválido.');
        const milliseconds=Number(item.timestamp)*1000;if(!Number.isFinite(milliseconds)||milliseconds>8640000000000000)fail(400,'Data inválida.');
        const media=item[item.type];
        const details=kind==='message'?{type:text(item.type,40),text:text(item.text?.body||item.button?.text||item.interactive?.button_reply?.title||item.interactive?.list_reply?.title||media?.caption),name:text(value.contacts?.find(contact=>contact.wa_id===item.from)?.profile?.name,160),mediaId:text(media?.id,200)}:{status:text(item.status,40),errors:(Array.isArray(item.errors)?item.errors:[]).slice(0,5).map(error=>({code:error.code,title:text(error.title,160)}))};
        const identity=[entry.id,value.metadata.phone_number_id,kind,item.id,...(kind==='status'?[item.status,item.timestamp]:[])].join(':');
        events.push({event_key:hash(identity),kind,message_id:item.id,phone_number_id:value.metadata.phone_number_id,contact_phone:text(kind==='message'?item.from:item.recipient_id,32),occurred_at:new Date(milliseconds).toISOString(),data:details});
      }
      if(!messages.length&&!statuses.length)events.push({event_key:hash(JSON.stringify(change)),kind:'notification',message_id:'',phone_number_id:value.metadata.phone_number_id,contact_phone:'',occurred_at:new Date().toISOString(),data:{type:'notification',errors:(Array.isArray(value.errors)?value.errors:[]).slice(0,5).map(error=>({code:error.code,title:text(error.title,160)}))}});
      if(events.length>100)fail(413,'Muitos eventos.');
    }
  }
  return [...new Map(events.map(event=>[event.event_key,event])).values()];
}

export function createWhatsApp({store,env=process.env,fetcher=fetch,rate=async()=>{}}){
  async function status(){const configuration=whatsappConfiguration(env);const storageReady=await store.ready();return {...configuration,storageReady,receivingReady:configuration.configured&&configuration.enabled&&storageReady};}
  async function checkConnection(){
    const config=whatsappConfiguration(env);
    if(!config.configured)fail(400,'Complete as credenciais na hospedagem antes de testar.');
    const get=async path=>{let response;try{response=await fetcher('https://graph.facebook.com/'+env.WHATSAPP_GRAPH_VERSION+'/'+path,{headers:{Authorization:'Bearer '+env.WHATSAPP_ACCESS_TOKEN},signal:AbortSignal.timeout(15000)});}catch{fail(502,'A Meta não respondeu. Tente novamente.');}if(!response.ok)fail(502,'A Meta recusou a consulta. Confira token, permissões, conta e número.');return response.json();};
    const phone=await get(env.WHATSAPP_PHONE_NUMBER_ID+'?fields=id,display_phone_number,verified_name');
    const account=await get(env.WHATSAPP_BUSINESS_ACCOUNT_ID+'/phone_numbers?fields=id&limit=100');
    if(String(phone.id)!==env.WHATSAPP_PHONE_NUMBER_ID||!account.data?.some(item=>String(item.id)===env.WHATSAPP_PHONE_NUMBER_ID))fail(409,'O número não pertence à conta empresarial configurada.');
    if(String(phone.display_phone_number).replace(/\D/g,'')!==config.expectedNumber.replace(/\D/g,''))fail(409,'O número retornado pela Meta difere do número esperado da EME. Confira a configuração.');
    return {checkedAt:new Date().toISOString(),name:text(phone.verified_name,160),number:text(phone.display_phone_number,40),message:'Credencial, conta e número conferidos. Nenhuma mensagem foi enviada.'};
  }
  async function webhook({method,url,headers,body}){
    const reply=(status,value)=>new Response(value,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    try{
      if(!['GET','POST'].includes(method))return reply(405,'Método não permitido.');
      const configuration=whatsappConfiguration(env);
      if(!configuration.configured||!configuration.enabled)return reply(503,'Recebimento ainda não ativado.');
      if(method==='GET'){
        const params=new URL(url).searchParams;
        if(params.get('hub.mode')!=='subscribe'||!same(params.get('hub.verify_token')||'',env.WHATSAPP_VERIFY_TOKEN))return reply(403,'Verificação recusada.');
        const challenge=params.get('hub.challenge');if(!challenge||challenge.length>512)return reply(400,'Desafio inválido.');
        if(!await store.ready())return reply(503,'Recebimento ainda não ativado.');
        return reply(200,challenge);
      }
      if(!String(headers.get('content-type')).toLowerCase().startsWith('application/json'))return reply(415,'Envie JSON.');
      const signature=headers.get('x-hub-signature-256')||'';
      if(!/^sha256=[a-f0-9]{64}$/.test(signature))return reply(403,'Assinatura inválida.');
      const chunks=[];let size=0;for await(const chunk of body||[]){size+=chunk.length;if(size>256*1024)return reply(413,'Evento grande demais.');chunks.push(Buffer.from(chunk));}
      const raw=Buffer.concat(chunks), expected='sha256='+createHmac('sha256',env.META_APP_SECRET).update(raw).digest('hex');
      if(!same(signature,expected))return reply(403,'Assinatura inválida.');
      let payload;try{payload=JSON.parse(raw.toString('utf8'));}catch{return reply(400,'JSON inválido.');}
      const events=extractWhatsAppEvents(payload,env);
      // Acknowledge only after durable storage. Failures must remain retryable by Meta.
      if(!await store.ready())return reply(503,'Recebimento ainda não ativado.');
      if(events.length)await store.ingest(events);
      return reply(200,'EVENT_RECEIVED');
    }catch(error){return reply(error.status||503,error.status?error.message:'Não foi possível registrar o evento.');}
  }
  async function handle(path,req,_res,user,_body,send){
    if(!path.startsWith('/api/whatsapp/'))return false;
    if(user.role!=='admin')fail(403,'Somente administradores acessam a conexão e a entrada do WhatsApp.');
    if(path==='/api/whatsapp/connection'&&req.method==='GET'){send(200,await status());return true;}
    if(path==='/api/whatsapp/inbox'&&req.method==='GET'){if(!await store.ready())fail(503,'Ative a tabela de recebimento antes de consultar mensagens.');send(200,{events:await store.list()});return true;}
    if(path==='/api/whatsapp/connection/test'&&req.method==='POST'){await rate(user);send(200,await checkConnection());return true;}
    fail(404,'Operação não encontrada.');
  }
  return {handle,status,webhook};
}
