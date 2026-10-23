import {randomUUID} from 'node:crypto';
import {fail} from './cloud/domain.mjs';
export const publicAccess=(row,now=Date.now())=>!row.data.access||row.data.access.visibility==='public'||!!row.data.access.publicAt&&Date.parse(row.data.access.publicAt)<=now;
export const canRead=(row,id,now=Date.now())=>publicAccess(row,now)||!!id&&(row.data.access?.visibility==='reserved'||row.data.access?.allowed?.includes(id)||row.data.access?.owners?.includes(id));
const uuid=/^[a-f0-9-]{36}$/;
const clean=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const cookie='eme_select_token';
export function createSelectAccess({client,rate,staffSession,openStaffSession,saveCase}){
 const {rest,request}=client;
 const token=req=>(String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookie+'='))||'').slice(cookie.length+1);
 const setToken=(res,t,seconds=3600)=>res.setHeader('Set-Cookie',`${cookie}=${t}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`);
 async function identity(req){const t=token(req);if(!t||t.length>8192)return null;try{return await request('/auth/v1/user',{publicKey:true,headers:{Authorization:'Bearer '+t}});}catch{return null;}}
 async function rows(){return rest('eme_cases?select=*&data->published=not.is.null');}
 async function account(id){let row=(await rest('eme_cases?id=eq.'+id))[0];if(row&&row.data.kind!=='select_account')fail(403,'Conta indisponível.');return row;}
 async function persist(row,data){if(Buffer.byteLength(JSON.stringify(data))>135000)fail(400,'Seu histórico atingiu o limite deste espaço. Entre em contato com a equipe.');const saved=await rest('eme_cases?id=eq.'+row.id+'&version=eq.'+row.version,'PATCH',{data,version:row.version+1,updated_at:new Date().toISOString()});if(!saved?.length)fail(409,'Seu espaço mudou. Recarregue antes de salvar.');return saved[0];}
 async function ensureAccount(u){let row=await account(u.id);if(row)return row;const admin=(await rest('eme_profiles?role=eq.admin&active=eq.true&select=id&limit=1'))[0];if(!admin)fail(503,'Cadastro temporariamente indisponível.');return (await rest('eme_cases','POST',{id:u.id,assignee_id:admin.id,data:{kind:'select_account',name:clean(u.user_metadata?.name,80)||'Meu Select',email:u.email,favorites:[],search:{},whatsapp:false,phone:'',events:[],consentHistory:[]}}))[0];}
 async function handle(path,req,res,body,send){
  if(!path.startsWith('/api/select/'))return false;
  const staff=await staffSession(req);
  if(path==='/api/select/session'&&req.method==='GET'){const u=staff||await identity(req);send(200,{user:u?{id:u.id,name:u.name||clean(u.user_metadata?.name,80),staff:!!staff}:null});return true;}
  if(path==='/api/select/register'&&req.method==='POST'){
   await rate('select-register:'+String(req.headers['x-forwarded-for']||'unknown'),5);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email||'')||typeof body.password!=='string'||body.password.length<12||body.password.length>128||!clean(body.name,80))fail(400,'Informe nome, e-mail e senha com pelo menos 12 caracteres.');
   const result=await request('/auth/v1/signup',{method:'POST',publicKey:true,body:{email:body.email.trim().toLowerCase(),password:body.password,data:{name:clean(body.name,80)}}});
   if(result.access_token)setToken(res,result.access_token,result.expires_in||3600);
   send(200,{authenticated:!!result.access_token,message:result.access_token?'Acesso criado.':'Confira seu e-mail para confirmar o cadastro. Se já possui conta, entre com sua senha.'});return true;
  }
  if(path==='/api/select/login'&&req.method==='POST'){
   await rate('select-login:'+String(req.headers['x-forwarded-for']||'unknown'),15);
   if(typeof body.email!=='string'||typeof body.password!=='string'||body.email.length>180||body.password.length>128)fail(400,'Confira seus dados.');
   const result=await request('/auth/v1/token?grant_type=password',{method:'POST',publicKey:true,body:{email:body.email.trim().toLowerCase(),password:body.password}});
   const member=(await rest('eme_profiles?id=eq.'+result.user.id))[0];
   if(member){if(!member.active)fail(403,'Acesso desativado.');await openStaffSession(req,res,member.id);send(200,{staff:true});return true;}
   setToken(res,result.access_token,result.expires_in||3600);send(200,{staff:false});return true;
  }
  if(path==='/api/select/admin'&&staff?.role==='admin'&&!staff.must_change){
   if(req.method==='GET'){send(200,{accounts:(await rest('eme_cases?data->>kind=eq.select_account')).map(r=>({id:r.id,version:r.version,...r.data})),properties:(await rows()).map(r=>({id:r.id,version:r.version,title:r.data.published.title,access:r.data.access||{visibility:'public',allowed:[],owners:[]}}))});return true;}
   if(req.method==='POST'){
    if(body.action==='access'){
     const row=(await rows()).find(r=>r.id===body.id);if(!row||row.version!==body.version)fail(409,'Recarregue o imóvel.');
     if(!['public','reserved','individual'].includes(body.visibility))fail(400,'Visibilidade inválida.');
     const ids=(await rest('eme_cases?data->>kind=eq.select_account&select=id')).map(r=>r.id);
     for(const key of ['allowed','owners'])if(!Array.isArray(body[key])||body[key].length>100||body[key].some(id=>!ids.includes(id)))fail(400,'Selecione contas existentes.');
     if(body.publicAt&&(!Number.isFinite(Date.parse(body.publicAt))||Date.parse(body.publicAt)<=Date.now()))fail(400,'Escolha uma data futura.');
     await saveCase(req,row,{...row.data,access:{visibility:body.visibility,allowed:body.allowed,owners:body.owners,publicAt:body.publicAt||null}},'Acesso Select atualizado','Visibilidade e vínculos revisados pela administração.');
    }else if(body.action==='owner-update'){
     const row=(await rows()).find(r=>r.id===body.id);if(!row||row.version!==body.version)fail(409,'Recarregue o imóvel.');
     if(!['note','proposal','contact','document'].includes(body.type)||!clean(body.text,3000))fail(400,'Informe o tipo e o conteúdo.');
     const update={id:randomUUID(),type:body.type,text:clean(body.text,3000),at:new Date().toISOString(),author:staff.name};
     if(body.type==='document'){
      if(typeof body.file!=='string'||body.file.length>2700000||!/^data:application\/pdf;base64,[A-Za-z0-9+/]+=*$/.test(body.file))fail(400,'Envie um PDF de até 2 MB.');
      const bytes=Buffer.from(body.file.split(',')[1],'base64');if(bytes.subarray(0,5).toString()!=='%PDF-')fail(400,'PDF inválido.');
      try{await request('/storage/v1/bucket',{method:'POST',body:{id:'eme-select-documents',name:'eme-select-documents',public:false,file_size_limit:2000000,allowed_mime_types:['application/pdf']}});}catch{}const bucket=await request('/storage/v1/bucket/eme-select-documents');if(bucket.public!==false)fail(503,'Armazenamento privado indisponível.');await request('/storage/v1/object/eme-select-documents/'+update.id+'.pdf',{method:'POST',raw:true,body:bytes,headers:{'Content-Type':'application/pdf','x-upsert':'false'}});
     }
     await saveCase(req,row,{...row.data,ownerUpdates:[...(row.data.ownerUpdates||[]),update]},'Acompanhamento compartilhado','Informação disponibilizada aos proprietários vinculados.');
    }else if(body.action==='reply'){
     const row=await account(body.id);if(!row||row.version!==body.version)fail(409,'Recarregue a conversa.');if(!clean(body.message,3000))fail(400,'Escreva uma mensagem.');
     await persist(row,{...row.data,events:[...row.data.events,{id:randomUUID(),type:'reply',text:clean(body.message,3000),at:new Date().toISOString(),author:staff.name}]});
    }else fail(400,'Ação indisponível.');send(200,{ok:true});return true;
   }
  }
  if(path==='/api/select/logout'&&req.method==='POST'){try{if(token(req))await request('/auth/v1/logout',{method:'POST',publicKey:true,headers:{Authorization:'Bearer '+token(req)}});}finally{setToken(res,'',0);}send(200,{ok:true});return true;}
  const u=await identity(req);if(!u)fail(401,'Entre no Acesso Select.');if(!u.email_confirmed_at)fail(403,'Confirme seu e-mail antes de continuar.');
  const row=await ensureAccount(u),inventory=await rows(),visible=inventory.filter(r=>canRead(r,u.id)),owned=inventory.filter(r=>r.data.access?.owners?.includes(u.id));
  const documentMatch=path.match(/^\/api\/select\/documents\/([a-f0-9-]{36})$/);
  if(documentMatch&&req.method==='GET'){
   if(!owned.some(r=>(r.data.ownerUpdates||[]).some(e=>e.id===documentMatch[1]&&e.type==='document')))fail(404,'Documento não disponível para esta conta.');
   const response=await request('/storage/v1/object/authenticated/eme-select-documents/'+documentMatch[1]+'.pdf',{raw:true});res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition','attachment; filename="documento-select.pdf"');res.end(Buffer.from(await response.arrayBuffer()));return true;
  }

  if(path==='/api/select/me'&&req.method==='GET'){
   const requests=owned.length?(await rest('eme_cases?data->>kind=eq.select_account&select=data')).flatMap(r=>r.data.events||[]):[];
   send(200,{user:{id:u.id,name:row.data.name,email:u.email},version:row.version,profile:row.data,properties:visible.map(r=>({...r.data.published,reserved:!publicAccess(r),publicAt:r.data.access?.publicAt||null})),owned:owned.map(r=>({property:r.data.published,status:publicAccess(r)?'Público':'Acesso restrito',updates:r.data.ownerUpdates||[],documents:(r.data.ownerUpdates||[]).filter(e=>e.type==='document'),proposals:(r.data.ownerUpdates||[]).filter(e=>e.type==='proposal'),visits:requests.filter(e=>e.type==='visit'&&e.propertyId===r.id).map(e=>({id:e.id,at:e.at,status:e.status})),contacts:(r.data.ownerUpdates||[]).filter(e=>e.type==='contact'),performance:null})),integrations:{whatsapp:false,availability:false,analytics:false}});return true;
  }
  if(path==='/api/select/me'&&req.method==='PATCH'){
   if(body.version!==row.version)fail(409,'Recarregue seu espaço antes de salvar.');
   const data=structuredClone(row.data);
   if(body.favorites!==undefined){if(!Array.isArray(body.favorites)||body.favorites.length>100||body.favorites.some(id=>!visible.some(r=>r.id===id)))fail(400,'Seleção inválida.');data.favorites=[...new Set(body.favorites)];}
   if(body.search!==undefined){data.search={};for(const key of ['region','type','max','beds'])data.search[key]=clean(body.search?.[key],100);}
   if(body.whatsapp!==undefined){if(typeof body.whatsapp!=='boolean')fail(400,'Preferência inválida.');data.phone=clean(body.phone,30);if(body.whatsapp&&!/^\+?[\d ()-]{10,25}$/.test(data.phone))fail(400,'Informe seu WhatsApp com DDD.');data.whatsapp=body.whatsapp;data.consentHistory=[...(data.consentHistory||[]),{channel:'whatsapp',enabled:body.whatsapp,at:new Date().toISOString(),purpose:'Novidades de imóveis e acompanhamento solicitado'}];}
   await persist(row,data);send(200,{ok:true});return true;
  }
  if(path==='/api/select/requests'&&req.method==='POST'){
   await rate('select-request:'+u.id,20);if(!['visit','message','alert'].includes(body.type))fail(400,'Solicitação inválida.');
   if(body.propertyId&&!visible.some(r=>r.id===body.propertyId))fail(404,'Imóvel indisponível.');
   if(body.type==='visit'&&(!body.propertyId||!clean(body.text,3000)))fail(400,'Informe o imóvel e sua preferência de horário.');
   if(body.type==='alert'&&body.authorized!==true)fail(400,'Autorize o alerta para salvar.');
   if(!clean(body.text,3000))fail(400,'Escreva sua solicitação.');
   await persist(row,{...row.data,events:[...row.data.events,{id:randomUUID(),type:body.type,text:clean(body.text,3000),propertyId:body.propertyId||null,status:'Recebido pela equipe',at:new Date().toISOString(),authorized:body.type==='alert'}]});
   send(201,{message:body.type==='visit'?'Solicitação recebida. A equipe verificará a disponibilidade; a visita ainda não está confirmada.':'Solicitação salva no seu espaço.'});return true;
  }
  fail(404,'Operação indisponível.');
 }
 return {handle,identity};
}
