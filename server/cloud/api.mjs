import {submission} from '../submission.mjs';
import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import sharp from 'sharp';
import {createClient} from './client.mjs';
import {attachCloudFinance} from './finance.mjs';
import {attachCloudIntelligence} from './intelligence.mjs';
import {attachCloudOperations} from './operations.mjs';
import {fail,fields,text,types,closed,admin,checkVersion,draft,curation,reviseCuration,decision,changed,listingBlockers,publicProperty,listing,evaluation,newCase} from './domain.mjs';
const digest=v=>createHash('sha256').update(v).digest('hex');
const cookieName='eme_cloud_session';
const safe=u=>({id:u.id,name:u.name,email:u.email,role:u.role,active:u.active,mustChangePassword:u.must_change});
const email=v=>{const s=text(v,5,180).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))fail(400,'E-mail inválido.');return s;};
const password=v=>{if(typeof v!=='string'||v.length<12||v.length>128)fail(400,'Use uma senha de 12 a 128 caracteres.');return v;};
const syncDraft=(data,d)=>({...data,draft:d,title:d.title,city:d.city,type:d.type,owner:d.ownerName,operation:d.operation==='comprar'?'Venda':'Locação'});
export function createCloudApi({env=process.env,client=createClient(env)}={}){
 const {rest,rpc,request}=client;
 const members=()=>rest('eme_profiles?select=id,name,email,role,active,must_change&order=created_at');
 const tokenOf=req=>(String(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))||'').slice(cookieName.length+1);
 const hashOf=req=>digest(tokenOf(req));
 const finance=attachCloudFinance({client,hashOf});
 const intelligence=attachCloudIntelligence({client,hashOf,caseFor,env});
 const operations=attachCloudOperations({client,hashOf});
 function setCookie(res,token,expired=false){res.setHeader('Set-Cookie',`${cookieName}=${token}; Path=/api; HttpOnly; SameSite=Strict; Secure; Max-Age=${expired?0:28800}`);}
 async function session(req){const token=tokenOf(req);if(!/^[\w-]{43}$/.test(token))return null;const rows=await rest('eme_sessions?token_hash=eq.'+digest(token)+'&select=*,eme_profiles(*)');const row=rows[0];if(!row||!row.eme_profiles.active||Date.parse(row.expires_at)<Date.now()||Date.parse(row.last_seen)<Date.now()-1800000)return null;await rest('eme_sessions?token_hash=eq.'+digest(token),'PATCH',{last_seen:new Date().toISOString()});return row.eme_profiles;}
 async function openSession(req,res,id){await rest('eme_sessions?token_hash=eq.'+hashOf(req),'DELETE');const token=randomBytes(32).toString('base64url');await rest('eme_sessions','POST',{token_hash:digest(token),user_id:id,expires_at:new Date(Date.now()+28800000).toISOString()});setCookie(res,token);}
 async function caseFor(id,u){const row=(await rest('eme_cases?id=eq.'+id))[0];if(!row||u.role!=='admin'&&row.assignee_id!==u.id)fail(404,'Imóvel não encontrado.');return row;}
 async function save(req,row,data,action,detail,assignee=row.assignee_id){const result=await rpc('eme_save_case',{p_session:hashOf(req),p_id:row.id,p_version:row.version||0,p_data:data,p_assignee:assignee,p_action:action,p_detail:detail});return Array.isArray(result)?result[0]:result;}
 async function details(row){const [people,history]=await Promise.all([members(),rest('eme_audit?case_id=eq.'+row.id+'&select=id,action,detail,created_at,eme_profiles(name)&order=id.desc')]);return {evaluation:evaluation(row,people),curation:curation(row.data),history:history.map(h=>({...h,author:h.action==='Envio pelo site'?'Site EME Select':h.eme_profiles?.name||'Equipe',eme_profiles:undefined}))};}
 async function createAuth(name,address,secret){const result=await request('/auth/v1/admin/users',{method:'POST',body:{email:address,password:secret,email_confirm:true,user_metadata:{name}}});return result.user||result;}
 async function deleteUnlinkedAuth(id){try{await request('/auth/v1/admin/users/'+id,{method:'DELETE'});}catch{console.error('Unlinked auth account requires administrator review');}}
 async function credentials(address,secret){return request('/auth/v1/token?grant_type=password',{method:'POST',publicKey:true,body:{email:address,password:secret}});}
 const rate=(key,max)=>rpc('eme_limit',{p_key:key,p_max:max});
 async function handle(req,res){
  const send=(status,value)=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));};
  res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  try{
   const path=new URL(req.url,'https://www.emeselect.com').pathname;
   const allowed=['www.emeselect.com','emeselect.com',env.VERCEL_URL,env.VERCEL_PROJECT_PRODUCTION_URL,...(env.EME_TEST_HOST?[env.EME_TEST_HOST]:[])].filter(Boolean);
   if(!allowed.includes(req.headers.host))fail(403,'Host não permitido.');if(!['GET','POST','PATCH'].includes(req.method))fail(405,'Método não permitido.');
   if(req.method!=='GET'&&(![`https://${req.headers.host}`,...(env.EME_TEST_HOST===req.headers.host?[`http://${req.headers.host}`]:[])].includes(req.headers.origin)||req.headers['sec-fetch-site']==='cross-site'))fail(403,'Origem não permitida.');
   let body=null;if(req.method!=='GET'){if(!String(req.headers['content-type']).startsWith('application/json'))fail(415,'Envie JSON.');if(req.body!==undefined){body=typeof req.body==='string'?JSON.parse(req.body):req.body;if(Buffer.byteLength(JSON.stringify(body))>3000000)fail(413,'Arquivo grande demais.');}else{let size=0;const chunks=[];for await(const part of req){size+=part.length;if(size>3000000)fail(413,'Arquivo grande demais.');chunks.push(part);}try{body=JSON.parse(Buffer.concat(chunks));}catch{fail(400,'Solicitação inválida.');}}}
   if(path==='/api/public/properties'&&req.method==='GET'){const rows=await rest('eme_cases?select=id,data->published&data->>stage=eq.Entrada%20aprovada&data->published=not.is.null');return send(200,{properties:rows.map(r=>r.published).filter(Boolean)});}
   if(path==='/api/public/submissions'&&req.method==='POST'){
    if(Buffer.byteLength(JSON.stringify(body))>16000)fail(413,'Reduza o tamanho das informações.');
    await rate('submission-ip:'+digest(String(req.headers['x-forwarded-for']||'unknown').split(',')[0]),6);await rate('submission-total',100);
    const entry=submission(body);entry.data.submissionHash=digest(JSON.stringify(entry.data));
    const reference=await rpc('eme_receive_submission',{p_id:entry.id,p_data:entry.data});return send(201,{reference});
   }
   let user=await session(req);
   const photoMatch=path.match(/^\/api\/photos\/([a-f0-9-]{36})$/);
   if(photoMatch&&req.method==='GET'){
    const rows=await rest('eme_cases?data->photos=cs.'+encodeURIComponent(JSON.stringify([{id:photoMatch[1]}])));const row=rows[0];if(!row)fail(404,'Foto não encontrada.');const isPublic=row.data.stage==='Entrada aprovada'&&row.data.published?.images.some(p=>p.url==='/api/photos/'+photoMatch[1]);if(!isPublic&&(!user||user.must_change||user.role!=='admin'&&user.id!==row.assignee_id))fail(404,'Foto não encontrada.');
    const response=await request('/storage/v1/object/authenticated/eme-property-photos/'+photoMatch[1]+'.webp',{raw:true});const bytes=Buffer.from(await response.arrayBuffer());res.setHeader('Content-Type','image/webp');res.end(bytes);return;
   }
   if(path==='/api/auth/session'&&req.method==='GET'){const exists=await rest('eme_profiles?select=id&limit=1');return send(200,{user:user?safe(user):null,needsSetup:exists.length===0,cloud:true,requiresActivation:true});}
   if(path==='/api/auth/setup'&&req.method==='POST'){
    fields(body,['email','name','password','activationToken']);await rate('bootstrap',10);const expected=env.EME_BOOTSTRAP_TOKEN||'',provided=String(body.activationToken||'');if(!expected||Buffer.byteLength(provided)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(provided),Buffer.from(expected)))fail(403,'Use o código privado de ativação fornecido ao responsável.');
    const address=email(body.email),name=text(body.name,2,80),secret=password(body.password);if(!env.EME_ADMIN_EMAIL||address!==env.EME_ADMIN_EMAIL.toLowerCase())fail(403,'Use o e-mail autorizado para a ativação.');if((await rest('eme_profiles?select=id&limit=1')).length)fail(409,'O portal já foi configurado.');
    const created=await createAuth(name,address,secret);try{await rpc('eme_bootstrap',{p_id:created.id,p_name:name,p_email:address});}catch(e){await deleteUnlinkedAuth(created.id);throw e;}await openSession(req,res,created.id);return send(201,{user:safe((await rest('eme_profiles?id=eq.'+created.id))[0])});
   }
   if(path==='/api/auth/login'&&req.method==='POST'){
    fields(body,['email','password']);const address=email(body.email);if(typeof body.password!=='string'||body.password.length>128)fail(400,'Confira a senha.');await rate('login:'+digest(address),8);await rate('login-ip:'+digest(String(req.headers['x-forwarded-for']||'unknown').split(',')[0]),40);
    const result=await credentials(address,body.password);const profile=(await rest('eme_profiles?id=eq.'+result.user.id))[0];if(!profile?.active)fail(401,'Conta sem acesso à equipe.');await openSession(req,res,profile.id);return send(200,{user:safe(profile)});
   }
   if(!user)fail(401,'Entre na sua conta.');
   if(path==='/api/auth/logout'&&req.method==='POST'){await rest('eme_sessions?token_hash=eq.'+hashOf(req),'DELETE');setCookie(res,'',true);return send(200,{ok:true});}
   if(path==='/api/auth/password'&&req.method==='POST'){
    fields(body,['currentPassword','newPassword']);password(body.newPassword);await rate('password:'+user.id,8);await credentials(user.email,body.currentPassword);await request('/auth/v1/admin/users/'+user.id,{method:'PUT',body:{password:body.newPassword}});await rest('eme_profiles?id=eq.'+user.id,'PATCH',{must_change:false});await rest('eme_sessions?user_id=eq.'+user.id,'DELETE');await openSession(req,res,user.id);return send(200,{user:safe({...user,must_change:false})});
   }
   if(user.must_change)fail(403,'Atualize sua senha inicial.');
   if(await finance.handle(path,req,res,user,body,send))return;
   if(await intelligence.handle(path,req,res,user,body,send))return;
   if(await operations.handle(path,req,res,user,body,send))return;
   if(path==='/api/assignees'&&req.method==='GET'){const people=(await members()).filter(p=>p.active&&(user.role==='admin'||p.id===user.id)).map(({id,name,role})=>({id,name,role}));return send(200,{members:people});}
   if(path==='/api/users'){
    admin(user);if(req.method==='GET')return send(200,{users:(await members()).map(safe)});
    if(req.method==='POST'){fields(body,['name','email','password','role']);await rate('members:'+user.id,20);const name=text(body.name,2,80),address=email(body.email);if(!['admin','corretor'].includes(body.role))fail(400,'Perfil inválido.');const created=await createAuth(name,address,password(body.password));try{await rpc('eme_add_member',{p_session:hashOf(req),p_id:created.id,p_name:name,p_email:address,p_role:body.role});}catch(e){await deleteUnlinkedAuth(created.id);throw e;}return send(201,{user:safe((await rest('eme_profiles?id=eq.'+created.id))[0])});}
   }
   const memberMatch=path.match(/^\/api\/users\/([a-f0-9-]{36})$/);if(memberMatch&&req.method==='PATCH'){admin(user);fields(body,['active']);if(typeof body.active!=='boolean')fail(400,'Situação inválida.');await rpc('eme_set_active',{p_session:hashOf(req),p_id:memberMatch[1],p_active:body.active});return send(200,{ok:true});}
   if(['/api/evaluations','/api/listings'].includes(path)){
    if(req.method==='GET'){const rows=await rest('eme_cases?order=updated_at.desc'+(user.role==='admin'?'':'&assignee_id=eq.'+user.id));if(path.endsWith('listings'))return send(200,{listings:rows.filter(r=>r.data.draft).map(listing)});const people=await members();return send(200,{evaluations:rows.map(r=>evaluation(r,people))});}
    if(req.method==='POST'){await rate('create-case:'+user.id,100);let row,assignee=user.id,data;
     if(path.endsWith('listings')){fields(body,['draft','evaluationId']);const d=draft(body.draft);if(body.evaluationId){row=await caseFor(text(body.evaluationId,36,36),user);if(row.data.draft)fail(409,'Já existe anúncio para esta avaliação.');if(closed.includes(row.data.stage))admin(user);assignee=row.assignee_id;data=changed(syncDraft(row.data,d));}else{row=newCase({});data=changed(syncDraft(row.data,d));}}
     else{fields(body,['title','city','type','operation','owner','assigneeId']);if(!types.includes(body.type)||!['Venda','Locação','Venda e locação'].includes(body.operation))fail(400,'Tipo ou finalidade inválidos.');assignee=body.assigneeId||user.id;row=newCase({title:text(body.title,1,120),city:text(body.city,1,120),owner:text(body.owner||'',0,120),type:body.type,operation:body.operation});data=row.data;}
     const saved=await save(req,row,data,'Cadastro criado','Recebido pela equipe para avaliação.',assignee);return send(201,path.endsWith('listings')?listing(saved):await details(saved));
    }
   }
   const match=path.match(/^\/api\/(evaluations|listings)\/([a-f0-9-]{36})(?:\/(curation|decision|photos|publish|unpublish))?$/);if(!match)fail(404,'Operação não encontrada.');let row=await caseFor(match[2],user);const action=match[3];if(match[1]==='listings'&&!row.data.draft)fail(404,'Anúncio não encontrado.');
   if(req.method==='GET'&&!action)return send(200,match[1]==='listings'?listing(row):await details(row));checkVersion(row,body);let data=structuredClone(row.data),label='Cadastro atualizado',note='Revisão registrada.',assignee=row.assignee_id;
   if(match[1]==='evaluations'){
    if(action==='curation'&&req.method==='POST'){data=reviseCuration(data,body,user);label='Curadoria revisada';note=JSON.stringify(data.curation);}
    else if(action==='decision'&&req.method==='POST'){const reviewed=curation(data);data=decision(data,body,user);label=data.stage;note=body.reason+'\nRégua: '+reviewed.policy+'. Nota: '+(reviewed.score??'incompleta')+'.'+(body.action==='approve'?' Revisão humana confirmada. Entrada interna; sem publicação automática.':'');}
    else if(!action&&req.method==='PATCH'){fields(body,['version','stage','note','assigneeId']);if([...closed,'Aguardando decisão'].includes(data.stage))fail(409,'Use o fluxo de decisão da curadoria.');if(body.stage&&!['Recebido','Em avaliação','Ajustes solicitados'].includes(body.stage))fail(400,'Etapa inválida.');assignee=body.assigneeId||assignee;if(assignee!==row.assignee_id)admin(user);data.stage=body.stage||data.stage;data.published=null;note=text(body.note,5,3000);}
    else fail(405,'Operação indisponível.');
   }else{
    if(closed.includes(data.stage)||['publish','unpublish'].includes(action))admin(user);
    if(!action&&req.method==='PATCH'){fields(body,['version','draft','photos']);const d=draft(body.draft);if(!Array.isArray(body.photos)||body.photos.length>20||new Set(body.photos.map(p=>p?.id)).size!==body.photos.length)fail(400,'Galeria inválida.');const photos=body.photos.map(p=>{fields(p,['id','caption','room']);const original=data.photos.find(x=>x.id===p.id);if(!original)fail(400,'Foto não pertence ao cadastro.');return {...original,caption:text(p.caption,0,180),room:text(p.room??'',0,60)};});data=changed({...syncDraft(data,d),photos});}
    else if(action==='publish'&&req.method==='POST'){fields(body,['version','confirmed']);if(body.confirmed!==true)fail(400,'Confirme a autorização de divulgação.');const errors=listingBlockers(data);if(errors.length)fail(409,errors.join(' '));data.published=publicProperty(row);label='Anúncio publicado';note='Administrador confirmou revisão e autorização de divulgação.';}
    else if(action==='unpublish'&&req.method==='POST'){fields(body,['version','confirmed']);data.published=null;label='Anúncio retirado';}
    else if(action==='photos'&&req.method==='POST'){
     fields(body,['version','content','caption','room']);const caption=text(body.caption||'',0,180),room=text(body.room??'',0,60);await rate('photo:'+user.id,100);if(data.photos.length>=20)fail(400,'Limite de 20 fotos.');if(typeof body.content!=='string'||body.content.length>2800000||!/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(body.content))fail(400,'Prepare a imagem antes do envio.');const bytes=Buffer.from(body.content.split(',')[1],'base64');let output;try{const image=sharp(bytes,{limitInputPixels:20000000,failOn:'warning'});const m=await image.metadata();if(m.pages>1||!['webp','jpeg','png'].includes(m.format)||Math.max(m.width,m.height)<600||Math.min(m.width,m.height)<200)fail(400,'Fotografia inválida ou pequena demais.');output=await image.rotate().resize({width:3200,height:3200,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer({resolveWithObject:true});}catch(e){if(e.status)throw e;fail(400,'Não foi possível preparar a foto.');}if(output.data.length>3000000)fail(400,'Reduza o tamanho da foto.');const id=randomUUID();await request('/storage/v1/object/eme-property-photos/'+id+'.webp',{method:'POST',raw:true,body:output.data,headers:{'Content-Type':'image/webp','x-upsert':'false'}});data=changed({...data,photos:[...data.photos,{id,width:output.info.width,height:output.info.height,caption,room}]});try{row=await save(req,row,data,'Fotografia adicionada','Nova fotografia recebida. Curadoria requer nova conferência.');}catch(e){try{await request('/storage/v1/object/eme-property-photos',{method:'DELETE',body:{prefixes:[id+'.webp']}});}catch{console.error('Private orphan photo requires cleanup');}throw e;}return send(201,listing(row));
    }else fail(405,'Operação indisponível.');
   }
   row=await save(req,row,data,label,note,assignee);return send(200,match[1]==='listings'?listing(row):await details(row));
  }catch(e){if(!e.status)console.error('Cloud portal failure:',e.name);send(e.status||503,{error:e.status?e.message:'Não foi possível concluir a operação. Tente novamente.'});}
 }
 return {handle};
}
