import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {emptyBuyer,buyerProfile,buyerIntake,buyerReadiness,matchBuyer,profileForLead} from '../shared/buyer-qualification.mjs';
import {buyerMessageDraft} from '../shared/buyer-messages.mjs';
import {attachCloudLeads} from '../server/cloud/leads.mjs';
import {requestBuyerAnalysis} from '../server/buyer-ai.mjs';
import {createPortalApi} from '../server/portal-api.mjs';
const profile=()=>({...emptyBuyer(),operation:'comprar',city:'Vacaria',propertyType:'Casa',budgetMax:600000,bedrooms:3,timeline:'quarter',contactPermission:'granted'});
const input=()=>({requestId:randomUUID(),name:'Contato de teste',phone:'54999991234',channel:'referral',sourceDetail:'Indicação de teste',message:'Procuro casa em Vacaria.',contactPermission:'unknown'});
test('qualification uses declared preferences, preserves unknowns and respects contact refusal',()=>{
 assert.equal(buyerIntake(input()).data.phone,'5554999991234');assert.equal(buyerIntake(input()).data.consentVersion,undefined);assert.equal(buyerIntake(input()).data.qualification.profile.whatsappUpdates,'unknown');assert.throws(()=>buyerIntake({...input(),email:'invalido'}));assert.throws(()=>buyerProfile({...profile(),emailUpdates:true}));
 assert.throws(()=>buyerIntake({...input(),assigneeId:randomUUID()}));assert.throws(()=>buyerProfile({...profile(),income:10000}));assert.throws(()=>buyerProfile({...profile(),budgetMax:Infinity}));
 const lead={status:'new',data:{intent:'contact'},next_contact_at:null};
 assert.equal(buyerReadiness(profile(),lead).complete,5);assert.equal(buyerReadiness(emptyBuyer(),lead).complete,0);
 assert.equal(buyerReadiness({...profile(),contactPermission:'declined'},{...lead,next_contact_at:'2020-01-01'}).priority,0);
 assert.equal(profileForLead({data:{consentVersion:'select-contact-2026-10'}}).contactPermission,'granted');
 const property={id:randomUUID(),title:'Casa',location:'Centro · Vacaria · RS',type:'Casa',operation:'comprar',price:550000,bedrooms:3,isIllustrative:false};
 const catalog=[property,{...property,id:'expensive',price:700000},{...property,id:'wrong-city',location:'Nova Vacaria'},{...property,id:'illustrative',isIllustrative:true},{...property,id:'missing-price',price:null},{...property,id:'small',bedrooms:2}];
 assert.deepEqual(matchBuyer(profile(),catalog).matches.map(p=>p.id),[property.id]);assert.equal(matchBuyer(emptyBuyer(),catalog).total,0);
});
test('AI is a reviewable draft, drops unsupported facts and handles provider failure',async()=>{
 let sent;const conversation='Quero comprar casa em Vacaria, até 600 mil.';
 const result={profile:{...profile(),bedrooms:5},summary:'Busca de casa em Vacaria.',questions:['Em qual prazo?'],evidence:[{field:'operation',quote:'comprar'},{field:'propertyType',quote:'casa'},{field:'city',quote:'Vacaria'},{field:'budgetMax',quote:'até 600 mil'},{field:'bedrooms',quote:'cinco quartos'}]};for(const k of ['email','contactPermission','whatsappUpdates','emailUpdates'])delete result.profile[k];
 const fetcher=async(url,opts)=>{sent=JSON.parse(opts.body);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]})};};
 const draft=await requestBuyerAnalysis({apiKey:'not-a-real-key',model:'configured-model',conversation,fetcher});
 assert.equal(draft.profile.bedrooms,null);assert.equal(draft.profile.timeline,'');assert.equal(draft.profile.city,'Vacaria');assert.equal(draft.profile.contactPermission,'unknown');assert.equal(draft.needsReview,true);assert.equal(sent.store,false);assert.equal(sent.input,conversation);assert.equal(sent.tools,undefined);
 await assert.rejects(requestBuyerAnalysis({apiKey:'test',model:'test',conversation,fetcher:async()=>({ok:false,status:429})}),/limite/);
});
test('manual intake and qualification persist with duplicates, version checks and staff isolation',async t=>{
 const api=createPortalApi({dbPath:':memory:',env:{}}),server=http.createServer(api.handle);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;t.after(async()=>{await new Promise(r=>server.close(r));api.close();});
 const admin={},broker={},other={},anon={},password='Buyer-testing-2026!';
 async function call(who,path,body,method=body?'POST':'GET'){const res=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,Cookie:who.cookie||'','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(res.headers.get('set-cookie'))who.cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,data:await res.json()};}
 await call(admin,'/auth/setup',{name:'Gestão',email:'admin@example.test',password});
 for(const [who,email] of [[broker,'broker@example.test'],[other,'other@example.test']]){await call(admin,'/users',{name:'Corretor teste',email,password,role:'corretor'});await call(who,'/auth/login',{email,password});await call(who,'/auth/password',{currentPassword:password,newPassword:password+'2'});}
 const body=input(),created=await call(broker,'/leads/intake',body);assert.equal(created.status,201,JSON.stringify(created));const id=created.data.id;
 assert.equal((await call(anon,'/leads/tools')).status,401);assert.equal((await call(broker,'/leads/tools')).data.aiReady,false);
 assert.equal((await call(broker,'/leads/intake',body)).data.id,id);assert.equal((await call(broker,'/leads/intake',{...body,requestId:randomUUID()})).data.duplicate,true);assert.equal((await call(broker,'/leads')).data.leads.length,1);
 assert.equal((await call(other,'/leads/'+id+'/qualification')).status,404);assert.equal((await call(other,'/leads/'+id+'/qualification',{version:1,profile:profile()},'PATCH')).status,404);
 assert.equal((await call(broker,'/leads/'+id+'/qualification',{version:1,profile:profile()},'PATCH')).status,200);
 assert.equal((await call(broker,'/leads/'+id+'/qualification',{version:1,profile:profile()},'PATCH')).status,409);
 const saved=(await call(broker,'/leads/'+id+'/qualification')).data;assert.equal(saved.profile.city,'Vacaria');assert.equal(saved.profile.emailUpdates,'unknown');assert.equal(saved.matches.length,0);assert.equal(saved.readiness.label,'Busca definida');
 const row=(await call(admin,'/leads')).data.leads[0];assert.equal(row.data.qualification.profile.budgetMax,600000);assert.equal(row.events.some(e=>e.action==='qualified'),true);
 assert.equal((await call(broker,'/leads/'+id+'/analyze',{version:row.version,conversation:'Quero uma casa em Vacaria.'})).status,503);
});
test('SQL activation is repeatable and protects manual intake, consent and qualification on the server',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
 for(const name of ['20260914_portal.sql','20261012_leads.sql','20261026_buyer_qualification.sql','20261026_buyer_qualification.sql'])await db.exec(readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 const admin=randomUUID(),a=randomUUID(),b=randomUUID();for(const id of [admin,a,b])await db.query('insert into auth.users values($1)',[id]);await db.query('select public.eme_bootstrap($1,$2,$3)',[admin,'Gestão','admin@example.test']);
 for(const [id,name]of [[a,'A'],[b,'B']])await db.query("insert into public.eme_profiles(id,name,email,role) values($1,$2,$3,'corretor')",[id,name,name+'@example.test']);
 for(const [token,id]of [['admin',admin],['broker',a],['other',b]])await db.query("insert into public.eme_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[token,id]);
 const body=buyerIntake(input()),receive=(token,id=body.requestId)=>db.query('select public.eme_intake_lead($1,$2,$3,$4) result',[token,id,'a'.repeat(64),JSON.stringify(body.data)]),save=(token,version,p=profile())=>db.query('select public.eme_qualify_lead($1,$2,$3,$4)',[token,body.requestId,version,JSON.stringify(p)]);
 await db.exec('set role anon');await assert.rejects(receive('broker'),/permission denied/);await db.exec('reset role;set role service_role');
 assert.equal((await receive('broker')).rows[0].result.id,body.requestId);assert.equal((await receive('broker',randomUUID())).rows[0].result.duplicate,true);await assert.rejects(receive('other',randomUUID()),/FORBIDDEN/);
 await assert.rejects(save('other',1),/FORBIDDEN/);await assert.rejects(save('broker',1,{...profile(),income:10000}),/LEAD_INVALID/);await assert.rejects(save('broker',1,{...profile(),emailUpdates:'yes'}),/LEAD_INVALID/);await save('broker',1);await assert.rejects(save('broker',1),/STALE_VERSION/);
 const row=(await db.query('select * from public.eme_leads where id=$1',[body.requestId])).rows[0];assert.equal(row.assignee_id,a);assert.equal(row.data.qualification.profile.contactPermission,'granted');assert.equal(row.version,2);
 await db.query('update public.eme_leads set assignee_id=$1 where id=$2',[b,body.requestId]);await assert.rejects(save('broker',2),/FORBIDDEN/);await save('other',2,{...profile(),contactPermission:'declined'});
 assert.equal((await db.query('select count(*)::int n from public.eme_leads')).rows[0].n,1);
});

test('message drafts require permission, keep access approval explicit and never invent matches',()=>{
 const lead={status:'new',data:{name:'Contato de teste'}},base={kind:'selection',profile:profile(),lead,origin:'https://example.test'};
 assert.equal(buyerMessageDraft(base),'');
 assert.equal(buyerMessageDraft({...base,kind:'discovery',profile:emptyBuyer()}),'');
 assert.equal(buyerMessageDraft({...base,kind:'access',profile:{...profile(),contactPermission:'declined'}}),'');
 assert.equal(buyerMessageDraft({...base,kind:'followup',lead:{...lead,status:'lost'}}),'');
 assert.match(buyerMessageDraft({...base,kind:'access'}),/analisa o cadastro antes de liberar/);
 assert.match(buyerMessageDraft({...base,matches:[{id:'real-id',title:'Casa de teste',price:500000}]}),/example.test\/imovel\/real-id/);
});

test('cloud matching excludes private and archived listings and uses the effective offer price',async()=>{
 const user={id:randomUUID(),role:'corretor',active:true,must_change:false},id=randomUUID();
 const published={id:'public',title:'Casa',location:'Vacaria · RS',operation:'comprar',type:'Casa',price:650000,bedrooms:3,isIllustrative:false};
 const rows=[{published,access:{visibility:'public'}},{published:{...published,id:'reserved'},access:{visibility:'reserved'}},{published:{...published,id:'individual'},access:{visibility:'individual'}},{published:{...published,id:'archived'},archived:true},{published:{...published,id:'scheduled'},access:{visibility:'reserved',publicAt:'2099-01-01T00:00:00Z'}}];
 let ready=true,body,status;
 const client={rest:async path=>{
  if(path.startsWith('eme_lead_settings?'))return ready?[{qualification_version:1}]:[{}];
  if(path.startsWith('eme_leads?')){assert.ok(path.includes('&assignee_id=eq.'+user.id));return [{id,version:1,status:'new',data:{qualification:{profile:profile()}}}];}
  if(path.startsWith('eme_cases?')){assert.match(path,/data->archived/);assert.match(path,/data->>deletedAt=is.null/);return rows;}
  throw Error(path);
 }};
 const service=attachCloudLeads({client,hashOf:()=>'',priceProperties:async items=>items.map(p=>({...p,price:550000}))});
 await service.handle('/api/leads/'+id+'/qualification',{method:'GET'},user,null,(s,b)=>{status=s;body=b;});
 assert.equal(status,200);assert.deepEqual(body.matches.map(p=>p.id),['public']);assert.equal(body.matches[0].price,550000);
 ready=false;await assert.rejects(service.handle('/api/leads/'+id+'/qualification',{method:'GET'},user,null,()=>{}),e=>e.status===503);
});
