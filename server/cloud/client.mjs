import {fail} from './domain.mjs';
export function createClient(env=process.env,fetcher=fetch){
 const url=env.SUPABASE_URL,secret=env.SUPABASE_SERVICE_ROLE_KEY||env.SUPABASE_SECRET_KEY,pub=env.VITE_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!secret||!pub)throw Error('Supabase configuration missing');
 async function request(path,{method='GET',body,publicKey=false,raw=false,headers={}}={}){
  const key=publicKey?pub:secret;
  const response=await fetcher(url+path,{method,headers:{apikey:key,...(!publicKey&&key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),...(body!==undefined&&!raw?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:raw?body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  if(!response.ok){let error={};try{error=await response.json();}catch{}const message=error.message||error.msg||'';
   if(message.includes('RATE_LIMIT')||response.status===429)fail(429,'Muitas tentativas. Aguarde antes de tentar novamente.');
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
