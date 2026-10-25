import {fail} from './domain.mjs';
export function createClient(env=process.env,fetcher=fetch){
 const url=env.SUPABASE_URL,secret=env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEY,pub=env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!secret||!pub)throw Error('Supabase configuration missing');
 async function request(path,{method='GET',body,publicKey=false,raw=false,headers={}}={}){
  const key=publicKey?pub:secret;
  const response=await fetcher(url+path,{method,headers:{apikey:key,...(!publicKey&&key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),...(body!==undefined&&!raw?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:raw?body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  if(!response.ok){let error={};try{error=await response.json();}catch{}error.code=error.code||error.error_code;const message=error.message||error.msg||'';
   const authFailure=(status,text,code,retryAfter)=>{throw Object.assign(new Error(text),{status,code,...(retryAfter?{retryAfter}:{})});};
   if(path.startsWith('/auth/')){
    if(error.code==='over_email_send_rate_limit'||/email rate limit/i.test(message))authFailure(429,'O serviço de confirmação atingiu o limite de envio de e-mails. Seu acesso não depende de aprovação da administração. Aguarde até uma hora antes de reenviar a confirmação.', 'confirmation_limit',3600);
    if(error.code==='email_address_not_authorized')authFailure(503,'O envio de confirmação para novos clientes ainda precisa ser configurado pela EME. Não é uma restrição da sua conta.','confirmation_unavailable');
    if(error.code==='email_not_confirmed')authFailure(403,'Confirme seu e-mail para entrar. Confira também o spam ou solicite uma nova confirmação.','email_unconfirmed');
    if(error.code==='signup_disabled')authFailure(503,'O cadastro está temporariamente indisponível. A equipe precisa revisar a configuração do Acesso Select.','signup_unavailable');
    if(error.code==='unexpected_failure'&&/mail|smtp/i.test(message))authFailure(503,'Não foi possível enviar o e-mail de confirmação. A EME precisa revisar o serviço de envio.','confirmation_unavailable');
   }
   if(message.includes('RATE_LIMIT')||response.status===429)authFailure(429,'Muitas tentativas em pouco tempo. Aguarde 15 minutos antes de tentar novamente.','attempt_limit',900);
   if(message.includes('LEAD_REQUEST_REUSED'))fail(409,'Esta referência de contato já foi usada.');
   if(message.includes('LEAD_'))fail(400,'Confira o interesse, o responsável e os dados do lead.');
   if(message.includes('STALE_VERSION'))fail(409,'O cadastro mudou. Reabra antes de continuar.');
   if(message.includes('ALREADY_CONFIGURED'))fail(409,'O administrador inicial já foi configurado.');
   if(message.includes('UNAUTHORIZED'))fail(401,'Entre novamente.');
   if(message.includes('FORBIDDEN'))fail(403,'Acesso não permitido.');
   if(message.includes('LAST_ADMIN'))fail(400,'Mantenha um administrador ativo.');
   if(path.startsWith('/auth/'))fail(response.status===400||response.status===422?400:401,'Confira e-mail, senha e as condições de acesso.');
   if(error.code==='23505')fail(409,'Este registro já existe.');
   fail(503,'Não foi possível concluir a operação no servidor. Tente novamente.');
  }
  if(raw&&method==='GET')return response;
  if(response.status===204)return null;const value=await response.text();return value?JSON.parse(value):null;
 }
 const rest=(path,method='GET',body)=>request('/rest/v1/'+path,{method,body,headers:{Prefer:'return=representation'}});
 const rpc=(name,body)=>request('/rest/v1/rpc/'+name,{method:'POST',body});
 return {request,rest,rpc};
}
