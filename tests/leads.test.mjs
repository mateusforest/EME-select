import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createPortalApi} from '../server/portal-api.mjs';
import {leadInput,leadUpdate} from '../shared/leads.mjs';
import {leadHash} from '../server/leads.mjs';
const input=(extra={})=>({requestId:randomUUID(),name:'Pessoa de teste',phone:'(54) 99999-0000',message:'Quero saber mais sobre o imóvel.',interest:'Casa em Vacaria',consent:true,source:{page:'/#/colecao',origin:'instagram',medium:'social',campaign:'lancamento'},...extra});

test('lead input validates consent, private identity, origins and follow-up',()=>{
 assert.equal(leadInput(input()).data.phone,'5554999990000');
 for(const change of [{consent:false},{phone:'123'},{propertyId:'fake'},{requestId:'fake'},{source:{page:'https://external.test'}},{website:'bot'},{assigneeId:randomUUID()},{status:'won'},{visit:{date:'2026-02-30'}}])assert.throws(()=>leadInput(input(change)),e=>e.status===400);
 assert.throws(()=>leadUpdate({version:1,status:'in_progress',note:'',assigneeId:null}),/próximo contato/);
});

test('real HTTP leads persist, merge repeats, route and isolate broker access',async t=>{
 let clock=Date.parse('2026-10-12T13:00:00Z');const api=createPortalApi({dbPath:':memory:',now:()=>clock});const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;t.after(async()=>{await new Promise(r=>server.close(r));api.close();});
 const admin={},broker={},other={},anonymous={},password='Test-Leads-Only-2026!';
 async function req(who,path,body,method=body?'POST':'GET',headers={}){const r=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:who.cookie||'',...headers},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))who.cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,body:await r.json()};}
 const setup=await req(admin,'/auth/setup',{name:'Admin',email:'admin@example.test',password});assert.equal(setup.status,201);
 const brokerId=(await req(admin,'/users',{name:'Broker',email:'broker@example.test',role:'corretor',password})).body.user.id;
 const otherId=(await req(admin,'/users',{name:'Other',email:'other@example.test',role:'corretor',password})).body.user.id;
 for(const [who,email] of [[broker,'broker@example.test'],[other,'other@example.test']]){await req(who,'/auth/login',{email,password});await req(who,'/auth/password',{currentPassword:password,newPassword:password+'2'});}
 const body=input();assert.equal((await req(anonymous,'/leads')).status,401);assert.equal((await req(anonymous,'/public/leads',body,'POST',{Origin:'https://other.test'})).status,403);
 const first=await req(anonymous,'/public/leads',body);assert.equal(first.status,201,JSON.stringify(first));assert.deepEqual(first.body,{reference:body.requestId,received:true});
 assert.equal((await req(anonymous,'/public/leads',body)).status,201);
 assert.equal((await req(anonymous,'/public/leads',{...body,name:'Alterado'})).status,409);
 let snapshot=(await req(admin,'/leads')).body;assert.equal(snapshot.leads.length,1);assert.equal(snapshot.leads[0].events.length,1);assert.equal(snapshot.leads[0].assignee_id,null);assert.equal((await req(broker,'/leads')).body.leads.length,0);
 const again=input({message:'Quero combinar uma visita.'});assert.equal((await req(anonymous,'/public/leads',again)).status,201);snapshot=(await req(admin,'/leads')).body;assert.equal(snapshot.leads.length,1);assert.equal(snapshot.leads[0].events.length,2);
 let lead=snapshot.leads[0],update={version:lead.version,status:'new',assigneeId:brokerId,nextContactAt:null,note:'Atribuído ao corretor.'};
 assert.equal((await req(broker,'/leads/'+lead.id,update,'PATCH')).status,403);
 let result=await req(admin,'/leads/'+lead.id,update,'PATCH');assert.equal(result.status,200);assert.equal((await req(admin,'/leads/'+lead.id,update,'PATCH')).status,409);
 lead=(await req(broker,'/leads')).body.leads[0];assert.equal(lead.assignee_id,brokerId);assert.equal(lead.events.length,3);
 assert.equal((await req(broker,'/leads/'+lead.id,{...update,version:lead.version,assigneeId:otherId},'PATCH')).status,403);
 result=await req(broker,'/leads/'+lead.id,{...update,version:lead.version,status:'in_progress',nextContactAt:'2026-10-13T13:00:00Z',note:'Cliente atendido; retorno combinado.'},'PATCH');assert.equal(result.status,200);assert.ok(result.body.leads[0].first_contact_at);
 lead=result.body.leads[0];await req(admin,'/leads/'+lead.id,{...update,version:lead.version,assigneeId:otherId},'PATCH');assert.equal((await req(broker,'/leads')).body.leads.length,0);assert.equal((await req(other,'/leads')).body.leads[0].events.length,5);
 snapshot=(await req(admin,'/leads')).body;const routing={version:snapshot.settings.version,mode:'round_robin',brokers:[brokerId,otherId]};assert.equal((await req(broker,'/leads/settings',routing)).status,403);assert.equal((await req(admin,'/leads/settings',routing)).status,200);
 clock+=16*60000;
 const a=input({phone:'54999990001'}),b=input({phone:'54999990002'});await Promise.all([req(anonymous,'/public/leads',a),req(anonymous,'/public/leads',b)]);snapshot=(await req(admin,'/leads')).body;assert.deepEqual(new Set(snapshot.leads.filter(l=>[a.requestId,b.requestId].includes(l.id)).map(l=>l.assignee_id)),new Set([brokerId,otherId]));
 const unpublished=input({propertyId:randomUUID(),phone:'54999990003'});assert.equal((await req(anonymous,'/public/leads',unpublished)).status,400);
 await req(admin,'/users/'+brokerId,{active:false},'PATCH');assert.equal((await req(broker,'/leads')).status,401);
 assert.equal(JSON.stringify((await req(anonymous,'/public/properties')).body).includes('Pessoa de teste'),false);
});

test('Postgres lead migration enforces role boundaries, atomic routing, immutable events and replay',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
 await db.exec(readFileSync(new URL('../supabase/migrations/20260914_portal.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20261012_leads.sql',import.meta.url),'utf8'));
 const admin=randomUUID(),broker=randomUUID(),other=randomUUID(),property=randomUUID();for(const id of [admin,broker,other])await db.query('insert into auth.users values($1)',[id]);await db.query('select public.eme_bootstrap($1,$2,$3)',[admin,'Admin','admin@example.test']);
 for(const [id,name] of [[broker,'Broker'],[other,'Other']])await db.query("insert into public.eme_profiles(id,name,email,role) values($1,$2,$3,'corretor')",[id,name,name+'@example.test']);
 for(const [token,id] of [['admin',admin],['broker',broker],['other',other]])await db.query("insert into public.eme_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[token,id]);
 await db.query('insert into public.eme_cases(id,assignee_id,data) values($1,$2,$3)',[property,broker,JSON.stringify({published:{id:property,title:'Casa'},stage:'Em avaliação'})]);
 const received=(body)=>{const v=leadInput(body);return db.query('select public.eme_receive_lead($1,$2,$3,$4)',[v.requestId,leadHash({propertyId:v.propertyId,data:v.data}),v.propertyId,JSON.stringify(v.data)]);};
 const body=input({propertyId:property});
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(received(body),/permission denied/);for(const table of ['eme_leads','eme_lead_events','eme_lead_settings','eme_lead_receipts'])await assert.rejects(db.query('select * from public.'+table),/permission denied/);await db.exec('reset role');}
 await db.exec('set role service_role');await received(body);await received(body);let rows=(await db.query('select * from public.eme_leads')).rows;assert.equal(rows.length,1);assert.equal(rows[0].assignee_id,broker);assert.equal((await db.query('select * from public.eme_lead_events')).rows.length,1);
 await assert.rejects(received({...body,name:'Alterado'}),/LEAD_REQUEST_REUSED/);
 await received(input({propertyId:property}));assert.equal((await db.query('select * from public.eme_leads')).rows.length,1);assert.equal((await db.query('select * from public.eme_lead_events')).rows.length,2);
 const update=(token,version,assignee=broker)=>db.query('select public.eme_update_lead($1,$2,$3,$4,$5,$6,$7)',[token,body.requestId,version,'in_progress',assignee,'2026-11-01T12:00:00Z','Atendimento registrado.']);
 await assert.rejects(update('other',2),/FORBIDDEN/);await assert.rejects(update('broker',2,other),/FORBIDDEN/);await update('broker',2);await assert.rejects(update('broker',2),/STALE_VERSION/);
 await update('admin',3,other);await assert.rejects(update('broker',4),/FORBIDDEN/);
 await assert.rejects(db.query('delete from public.eme_lead_events'),/permission denied/);await assert.rejects(db.query("update public.eme_lead_events set action='fake'"),/permission denied/);
 const route=(token,version,brokers)=>db.query('select public.eme_route_leads($1,$2,$3,$4)',[token,version,'round_robin',brokers]);
 await assert.rejects(route('broker',0,[broker,other]),/FORBIDDEN/);await assert.rejects(route('admin',0,[admin]),/LEAD_ROUTING_INVALID/);await route('admin',0,[broker,other]);await assert.rejects(route('admin',0,[broker,other]),/STALE_VERSION/);
 const a=input({phone:'54999990001'}),b=input({phone:'54999990002'});await Promise.all([received(a),received(b)]);rows=(await db.query('select * from public.eme_leads where id in($1,$2)',[a.requestId,b.requestId])).rows;assert.deepEqual(new Set(rows.map(r=>r.assignee_id)),new Set([broker,other]));
 await db.exec('reset role');await db.query('update public.eme_profiles set active=false where id=$1',[broker]);await db.exec('set role service_role');await assert.rejects(update('broker',4),/UNAUTHORIZED/);
 const c=input({phone:'54999990003'});await received(c);assert.equal((await db.query('select assignee_id from public.eme_leads where id=$1',[c.requestId])).rows[0].assignee_id,other);
 await assert.rejects(received(input({propertyId:randomUUID()})),/LEAD_PROPERTY_UNAVAILABLE/);
});
