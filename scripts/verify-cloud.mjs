import http from 'node:http';import{readFileSync}from'node:fs';import{parseEnv}from'node:util';import{randomUUID,randomBytes}from'node:crypto';import assert from'node:assert/strict';import sharp from'sharp';
import{createCloudApi}from'../server/cloud/api.mjs';import{createClient}from'../server/cloud/client.mjs';
const env={...process.env,...parseEnv(readFileSync(process.env.EME_ENV_FILE||'C:/Users/mateu/Downloads/EME-Select/.env.local','utf8'))};
const client=createClient(env),suffix=randomUUID(),mail='eme-test-'+suffix+'@example.com',pass='Test-only-'+randomBytes(20).toString('hex');
if((await client.rest('eme_profiles?select=id&limit=1')).length)throw Error('This setup test requires an empty portal; no existing accounts changed.');
env.EME_ADMIN_EMAIL=mail;env.EME_BOOTSTRAP_TOKEN=randomBytes(32).toString('hex');
let app;const server=http.createServer((req,res)=>app.handle(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));env.EME_TEST_HOST='127.0.0.1:'+server.address().port;const origin='http://'+env.EME_TEST_HOST;app=createCloudApi({env});
const authIds=[],caseIds=[],photoIds=[];const admin={},broker={},other={},anonymous={};
async function req(actor,path,method='GET',body){const response=await fetch(origin+'/api'+path,{method,headers:{...(actor.cookie?{Cookie:actor.cookie}:{}),...(method!=='GET'?{Origin:origin,'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const cookie=response.headers.get('set-cookie');if(cookie)actor.cookie=cookie.split(';')[0];const raw=await response.arrayBuffer();return {status:response.status,body:response.headers.get('content-type')?.includes('json')?JSON.parse(Buffer.from(raw)):Buffer.from(raw)};}
const ok=async(actor,path,method,body)=>{const r=await req(actor,path,method,body);assert.ok(r.status>=200&&r.status<300,JSON.stringify({path,status:r.status,error:r.body.error}));return r.body;};
try{
 assert.equal((await req(anonymous,'/auth/setup','POST',{email:mail,name:'TEST ADMIN',password:pass,activationToken:'wrong'})).status,403);
 const a=await ok(admin,'/auth/setup','POST',{email:mail,name:'TEST ADMIN',password:pass,activationToken:env.EME_BOOTSTRAP_TOKEN});authIds.push(a.user.id);
 for(const [actor,name]of [[broker,'BROKER'],[other,'OTHER']]){const address=name.toLowerCase()+'-'+suffix+'@example.com';const u=await ok(admin,'/users','POST',{name:'TEST '+name,email:address,password:pass,role:'corretor'});authIds.push(u.user.id);actor.id=u.user.id;await ok(actor,'/auth/login','POST',{email:address,password:pass});assert.equal((await req(actor,'/listings')).status,403);await ok(actor,'/auth/password','POST',{currentPassword:pass,newPassword:pass+'new'});}
 const d={title:'IMÓVEL FICTÍCIO DE TESTE',city:'Caxias do Sul RS',neighborhood:'Bairro teste',privateAddress:'PRIVATE ADDRESS',ownerName:'PRIVATE OWNER',ownerContact:'PRIVATE CONTACT',type:'Casa',environment:'urbano',condominium:'',operation:'comprar',price:550000,area:120,description:'Imóvel fictício para validar o cadastro no portal. Apresentação de teste sem oferta comercial e sem dados de clientes reais.',features:'Jardim',reasons:'Planta funcional'};
 let item=await ok(admin,'/listings','POST',{draft:d});caseIds.push(item.id);assert.equal((await req(other,'/listings/'+item.id)).status,404);
 let detail=await ok(admin,'/evaluations/'+item.id);detail=await ok(admin,'/evaluations/'+item.id,'PATCH',{version:detail.evaluation.version,assigneeId:broker.id,note:'Carteira de teste atribuída ao corretor.'});item=await ok(broker,'/listings/'+item.id);
 const content='data:image/jpeg;base64,'+(await sharp({create:{width:900,height:600,channels:3,background:'#163b31'}}).jpeg().toBuffer()).toString('base64');
 for(const caption of ['Sala de teste','Jardim de teste']){item=await ok(broker,'/listings/'+item.id+'/photos','POST',{version:item.version,content,caption});photoIds.push(item.photos.at(-1).id);}
 assert.equal((await req(anonymous,'/photos/'+photoIds[0])).status,404);
 const stale=item.version;item=await ok(broker,'/listings/'+item.id,'PATCH',{version:item.version,draft:d,photos:item.photos.map(({id,caption})=>({id,caption})).reverse()});assert.equal((await req(broker,'/listings/'+item.id,'PATCH',{version:stale,draft:d,photos:[]})).status,409);
 detail=await ok(admin,'/evaluations/'+item.id);const review={version:detail.evaluation.version,criteria:detail.curation.criteria.map(c=>({key:c.key,score:4,note:'Fonte fictícia registrada para o teste.'})),checks:detail.curation.checks.map(c=>({key:c.key,state:'Conferido',note:'Conferência fictícia de fluxo no ambiente de teste.'})),pending:''};assert.equal((await req(broker,'/evaluations/'+item.id+'/curation','POST',review)).status,403);
 detail=await ok(admin,'/evaluations/'+item.id+'/curation','POST',review);detail=await ok(broker,'/evaluations/'+item.id+'/decision','POST',{version:detail.evaluation.version,action:'submit',reason:'Encaminhamento fictício para revisão.'});detail=await ok(admin,'/evaluations/'+item.id+'/decision','POST',{version:detail.evaluation.version,action:'approve',reason:'Aprovação fictícia após conferência de teste.',acknowledged:true});
 item=await ok(admin,'/listings/'+item.id);item=await ok(admin,'/listings/'+item.id+'/publish','POST',{version:item.version,confirmed:true});const catalog=await ok(anonymous,'/public/properties');assert.equal(catalog.properties.length,1);assert.ok(!JSON.stringify(catalog).includes('PRIVATE'));assert.equal((await req(anonymous,'/photos/'+photoIds[0])).status,200);
 item=await ok(admin,'/listings/'+item.id+'/unpublish','POST',{version:item.version,confirmed:true});assert.equal((await req(anonymous,'/photos/'+photoIds[0])).status,404);
 await ok(admin,'/users/'+broker.id,'PATCH',{active:false});assert.equal((await req(broker,'/listings')).status,401);
 for(const table of ['eme_profiles','eme_cases','eme_sessions','eme_audit']){const response=await fetch(env.SUPABASE_URL+'/rest/v1/'+table+'?select=*',{headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY}});assert.ok([401,403].includes(response.status));await response.body?.cancel();}
 console.log('Cloud integration passed: activation, auth, mandatory password change, ownership, photos, concurrent editing, curation, publication, privacy, revocation and RLS.');
}finally{
 // Delete only fixture IDs created by this run, never pre-existing rows.
 for(const id of caseIds){await client.rest('eme_audit?case_id=eq.'+id,'DELETE');await client.rest('eme_cases?id=eq.'+id,'DELETE');}
 if(photoIds.length)await client.request('/storage/v1/object/eme-property-photos',{method:'DELETE',body:{prefixes:photoIds.map(id=>id+'.webp')}});
 for(const id of authIds){await client.rest('eme_sessions?user_id=eq.'+id,'DELETE');await client.rest('eme_audit?actor_id=eq.'+id,'DELETE');}
 for(const id of authIds){await client.rest('eme_profiles?id=eq.'+id,'DELETE');await client.request('/auth/v1/admin/users/'+id,{method:'DELETE'});}
 server.close();console.log('Only this run’s fixture records were removed.');
}
