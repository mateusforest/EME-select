import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID,createHash} from 'node:crypto';
import {createPortalApi} from '../server/portal-api.mjs';
import {createCloudApi} from '../server/cloud/api.mjs';
import {initialRegions,internalKinds} from '../shared/portal-content.mjs';
import {accessChange} from '../server/access-management.mjs';

for(const backend of ['local','cloud'])test(backend+': administrative documents and public editorial settings stay separated',async t=>{
 const rows=new Map(),profiles=[{id:randomUUID(),name:'Admin',role:'admin',active:true,must_change:false},{id:randomUUID(),name:'Broker',role:'corretor',active:true,must_change:false}],tokens=['a'.repeat(43),'b'.repeat(43)];
 const digest=v=>createHash('sha256').update(v).digest('hex'),revoked=new Set();
 const client={rest:async(path,method='GET',body)=>{
  if(path.startsWith('eme_sessions?')){const i=tokens.findIndex(t=>path.includes(digest(t)));return i<0||revoked.has(profiles[i].id)?[]:[{eme_profiles:profiles[i],expires_at:new Date(Date.now()+3600000).toISOString(),last_seen:new Date().toISOString()}];}
  if(path.startsWith('eme_profiles?')){const id=path.match(/id=eq.([a-f0-9-]{36})/)?.[1];const found=id?profiles.filter(p=>p.id===id):profiles;if(method==='PATCH')for(const profile of found)Object.assign(profile,body);return structuredClone(found);}
  if(path==='eme_audit'&&method==='POST'){assert.equal(JSON.stringify(body).includes('contentBase64'),false);return [];}
  if(path.startsWith('eme_cases?')){
   const id=path.match(/(?:\?|&)id=eq.([a-f0-9-]{36})/)?.[1];if(id)return rows.has(id)?[structuredClone(rows.get(id))]:[];
   if(path.includes('kind=eq.company_document'))return [...rows.values()].filter(r=>r.data.kind==='company_document').map(r=>({id:r.id,version:r.version,document:r.data.document}));
   if(path.includes('published=not.is.null'))return [];
   if(path.includes('kind.not.in.'))return [...rows.values()].filter(r=>!internalKinds.includes(r.data.kind));
   return [...rows.values()];
  }
  throw Error('Unexpected '+method+' '+path);
 },rpc:async(name,p)=>{
  if(name==='eme_limit')return;
  if(name==='eme_set_active'){const actor=profiles[tokens.findIndex(t=>digest(t)===p.p_session)],member=profiles.find(u=>u.id===p.p_id);assert.ok(actor.active&&actor.role==='admin'&&actor.id!==member.id);if(member.role==='admin'&&!p.p_active)assert.ok(profiles.filter(u=>u.active&&u.role==='admin').length>1);member.active=p.p_active;if(!p.p_active)revoked.add(member.id);return;}
  assert.equal(name,'eme_save_case');assert.equal(p.p_session,digest(tokens[0]));
  const old=rows.get(p.p_id);if((old?.version||0)!==p.p_version){const e=Error('stale');e.status=409;throw e;}
  const row={id:p.p_id,version:(old?.version||0)+1,assignee_id:p.p_assignee,data:structuredClone(p.p_data)};rows.set(row.id,row);return structuredClone(row);
 },request:async()=>{throw Error('No external service expected');}};
 let app;const server=http.createServer((req,res)=>app.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const host='127.0.0.1:'+server.address().port,origin='http://'+host;
 app=backend==='local'?createPortalApi({dbPath:':memory:'}):createCloudApi({env:{EME_TEST_HOST:host},client});t.after(async()=>{await new Promise(r=>server.close(r));app.close?.();});
 const admin={cookie:backend==='cloud'?'eme_cloud_session='+tokens[0]:''},broker={cookie:backend==='cloud'?'eme_cloud_session='+tokens[1]:''},anon={};
 async function req(who,path,body,method=body?'POST':'GET'){const res=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,Cookie:who.cookie||'','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(res.headers.get('set-cookie'))who.cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,body:res.headers.get('content-type')?.includes('application/json')?await res.json():Buffer.from(await res.arrayBuffer()),headers:res.headers};}
 if(backend==='local'){const password='Admin-test-only-2026!';await req(admin,'/auth/setup',{name:'Admin',email:'admin@example.test',password});await req(admin,'/users',{name:'Broker',email:'broker@example.test',password,role:'corretor'});await req(broker,'/auth/login',{email:'broker@example.test',password});await req(broker,'/auth/password',{currentPassword:password,newPassword:password+'2'});}
 assert.equal((await req(anon,'/company-documents')).status,401);assert.equal((await req(broker,'/company-documents')).status,403);
 const upload={id:randomUUID(),title:'Contrato interno teste',category:'Contratos',expiresOn:null,previousId:null,filename:'contrato.pdf',mimeType:'application/pdf',contentBase64:Buffer.from('%PDF-1.4\nCompany-private-content-test\n%%EOF').toString('base64')};
 assert.equal((await req(broker,'/company-documents',upload)).status,403);
 const created=await req(admin,'/company-documents',upload);assert.equal(created.status,201,JSON.stringify(created.body));
 assert.equal((await req(admin,'/company-documents',upload)).status,200,'same request cannot duplicate file');
 const listed=(await req(admin,'/company-documents')).body.documents;assert.equal(listed.length,1);assert.equal(JSON.stringify(listed).includes(upload.contentBase64),false);
 const path='/company-documents/'+upload.id+'/content';assert.equal((await req(anon,path)).status,401);assert.equal((await req(broker,path)).status,403);
 const downloaded=await req(admin,path);assert.equal(downloaded.status,200);assert.match(downloaded.headers.get('content-disposition'),/^attachment/);assert.match(downloaded.body.toString(),/Company-private-content/);
 assert.equal((await req(admin,'/listings/'+upload.id)).status,404);assert.equal((await req(admin,'/listings')).body.listings.length,0);assert.deepEqual((await req(anon,'/public/properties')).body.properties,[]);
 assert.equal((await req(admin,'/company-documents/'+upload.id,{version:0,archived:true},'PATCH')).status,409);
 assert.equal((await req(admin,'/company-documents/'+upload.id,{version:1,archived:true},'PATCH')).status,200);
 const next=await req(admin,'/company-documents',{...upload,id:randomUUID(),previousId:upload.id});assert.equal(next.status,201);assert.equal(next.body.document.edition,2);
 let site=(await req(admin,'/site-content')).body;assert.equal(site.config.regions.length,2);assert.equal((await req(broker,'/site-content')).status,403);
 site.config.regions[0].intro='Uma nova apresentação publicada.';site.config.regions[1].enabled=false;site.config.opportunityIds=[];
 let saved=await req(admin,'/site-content',{version:site.version,config:site.config},'PATCH');assert.equal(saved.status,200,JSON.stringify(saved.body));
 assert.equal((await req(admin,'/site-content',{version:site.version,config:site.config},'PATCH')).status,409);
 const published=(await req(anon,'/public/site-content')).body;assert.equal(published.regions.length,1);assert.equal(published.regions[0].intro,site.config.regions[0].intro);assert.deepEqual(published.opportunityIds,[]);assert.equal(JSON.stringify(published).includes('Company-private'),false);
 const invalid={...site.config,opportunityIds:[randomUUID()]};assert.equal((await req(admin,'/site-content',{version:saved.body.version,config:invalid},'PATCH')).status,400);
 const injected={...site.config,regions:[{...initialRegions[0],source:'javascript:alert(1)'}]};assert.equal((await req(admin,'/site-content',{version:saved.body.version,config:injected},'PATCH')).status,400);
 const cleared=await req(admin,'/site-content',{version:saved.body.version,config:{...site.config,regions:[],regionAssignments:{}}},'PATCH');
 assert.equal(cleared.status,200);assert.deepEqual((await req(anon,'/public/site-content')).body.regions,[]);
 const display={mode:'fixed',personId:'eae00000-0000-4000-8000-000000000102'};
 assert.equal((await req(broker,'/site-consultants',{version:cleared.body.version,consultantDisplay:display},'PATCH')).status,403);
 assert.equal((await req(admin,'/site-consultants',{version:cleared.body.version,consultantDisplay:{mode:'fixed',personId:'eae00000-0000-4000-8000-000000000100'}},'PATCH')).status,400,'non-consultant cannot be selected');
 const contact=await req(admin,'/site-consultants',{version:cleared.body.version,consultantDisplay:display},'PATCH');assert.equal(contact.status,200,JSON.stringify(contact.body));
 assert.deepEqual((await req(anon,'/public/site-content')).body.consultantDisplay,display);assert.deepEqual(contact.body.config.regions,[],'contact-only changes preserve removed regions');
 assert.equal((await req(admin,'/site-consultants',{version:cleared.body.version,consultantDisplay:display},'PATCH')).status,409);
 const createdListing=await req(admin,'/listings',{draft:{title:'Excluir no teste',city:'Vacaria',type:'Casa',environment:'urbano',locationProfile:'',condominium:'',operation:'comprar'}});assert.equal(createdListing.status,201,JSON.stringify(createdListing.body));
 const listing=createdListing.body,deletePath='/listings/'+listing.id+'/delete';
 assert.ok([403,404].includes((await req(broker,deletePath,{version:listing.version,confirmed:true})).status));
 assert.equal((await req(admin,deletePath,{version:listing.version,confirmed:false})).status,400);
 assert.equal((await req(admin,deletePath,{version:0,confirmed:true})).status,409);
 assert.equal((await req(admin,deletePath,{version:listing.version,confirmed:true})).status,200);
 assert.equal((await req(admin,'/listings')).body.listings.some(l=>l.id===listing.id),false);
 assert.equal((await req(admin,'/evaluations')).body.evaluations.some(l=>l.id===listing.id),false);
 assert.equal((await req(admin,'/listings/'+listing.id)).status,404);
 assert.equal((await req(admin,'/listings/'+listing.id+'/archive',{version:listing.version+1,archived:false,confirmed:true})).status,404);



 if(backend==='cloud'){
  const id=randomUUID(),draft={title:'Imóvel para arquivar',city:'Vacaria',type:'Casa',operation:'comprar',features:'',reasons:'',description:''};
  rows.set(id,{id,version:1,assignee_id:profiles[1].id,data:{title:draft.title,draft,photos:[],published:{id,title:draft.title},stage:'Recebido'}});
  const endpoint='/listings/'+id+'/archive',body={version:1,archived:true,confirmed:true};
  assert.equal((await req(broker,endpoint,body)).status,403);
  assert.equal((await req(admin,endpoint,{...body,version:0})).status,409);
  assert.equal((await req(admin,endpoint,{...body,confirmed:false})).status,400);
  assert.equal((await req(admin,endpoint,body)).status,200);
  assert.equal(rows.get(id).data.archived,true);assert.equal(rows.get(id).data.published,null);
  assert.equal((await req(admin,'/listings/'+id+'/publish',{version:2,confirmed:true,reviewMode:'simplified'})).status,409);
  assert.equal((await req(admin,endpoint,{version:2,archived:false,confirmed:true})).status,200);
  assert.equal(rows.get(id).data.archived,false);assert.equal(rows.get(id).data.published,null);assert.deepEqual(rows.get(id).data.draft,draft);
 }
 {
  const users=(await req(admin,'/users')).body.users,member=users.find(u=>u.role==='corretor'),owner=users.find(u=>u.role==='admin');
  const body={name:'Broker Updated',role:'admin',active:true,expected:{name:member.name,role:member.role,active:member.active}};
  assert.equal((await req(broker,'/users/'+member.id,body,'PATCH')).status,403);
  assert.equal((await req(admin,'/users/'+member.id,body,'PATCH')).status,200);
  assert.equal((await req(broker,'/site-content')).status,401,'permission changes revoke previous sessions');
  assert.equal((await req(admin,'/users/'+member.id,body,'PATCH')).status,409,'stale edits rejected');
  assert.equal((await req(admin,'/users/'+owner.id,{role:'corretor'},'PATCH')).status,400,'self-demotion rejected');
 }
});
test('access validation rejects escalation fields and self-suspension',()=>{
 const actor={id:'owner',role:'admin'},member={id:'owner',name:'Owner',role:'admin',active:true};
 assert.throws(()=>accessChange(actor,member,{active:false}),/própria conta/);
 assert.throws(()=>accessChange(actor,member,{role:'other'}),/permissão/);
 assert.throws(()=>accessChange(actor,member,{password:'bad'}));
});
