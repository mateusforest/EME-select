import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {attachCloudSwitch} from '../server/cloud/switch.mjs';
import {attachCloudSwitchProfessionals} from '../server/cloud/switch-professionals.mjs';
import {attachCloudSwitchDeals} from '../server/cloud/switch-deals.mjs';
import {SWITCH_CONSENT_VERSION} from '../shared/switch-consent.mjs';

const migrations=['20261028_switch_pilot.sql','20261029_switch_launch_evidence.sql'].map(name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
const bundle=readFileSync(new URL('../docs/sql/ATIVAR-M-SWITCH.sql',import.meta.url),'utf8');
const preflight=readFileSync(new URL('../docs/sql/VERIFICAR-M-SWITCH.sql',import.meta.url),'utf8');
const admin={id:randomUUID(),role:'admin',active:true,must_change:false};
const env={SWITCH_INVITE_SECRET:'synthetic-secret-used-only-in-local-tests',SWITCH_WHATSAPP_ENABLED:'false',SWITCH_AUTOPILOT_ENABLED:'false'};
const intake=(extra={})=>({requestId:randomUUID(),kind:'buy',name:'Pessoa Sintética',phone:'(54) 99999-9999',city:'Vacaria',propertyType:'Casa',askingCents:50000000,contactConsent:true,privacyAccepted:true,updatesOptIn:false,consentVersion:SWITCH_CONSENT_VERSION,...extra});

// Test-only PostgREST adapter: real SQL, constraints, roles and triggers in PGlite.
// It has no network transport, live credentials or provider access.
function clientFor(db){
 async function rest(path,method='GET',body){
  const [table,query='']=path.split('?');
  assert.match(table,/^eme_(switch_[a-z_]+|profiles)$/);
  const params=new URLSearchParams(query),values=[],where=[];
  for(const [key,value] of params){
   if(['select','order','limit','offset','on_conflict'].includes(key))continue;
   assert.match(key,/^[a-z_]+$/);assert.ok(value.startsWith('eq.'));
   values.push(value.slice(3));where.push(`${key}=$${values.length}`);
  }
  const clause=where.length?' where '+where.join(' and '):'';
  if(method==='GET')return (await db.query(`select * from public.${table}${clause}`,values)).rows.map(row=>({...row,...('version' in row?{version:Number(row.version)}:{})}));
  const keys=Object.keys(body);for(const key of keys)assert.match(key,/^[a-z_]+$/);
  if(method==='POST'){
   const conflict=params.has('on_conflict')?' on conflict (request_id) do nothing':'';
   return (await db.query(`insert into public.${table} (${keys.join(',')}) values (${keys.map((_,i)=>'$'+(i+1)).join(',')})${conflict} returning *`,Object.values(body))).rows;
  }
  assert.equal(method,'PATCH');
  const assignments=keys.map(key=>{values.push(body[key]);return `${key}=$${values.length}`;});
  return (await db.query(`update public.${table} set ${assignments.join(',')}${clause} returning *`,values)).rows;
 }
 return {rest,request:(path,{method,body})=>rest(path.replace('/rest/v1/',''),method,body),
  rpc:async(name,body)=>{assert.equal(name,'eme_switch_acknowledge');return (await db.query('select public.eme_switch_acknowledge($1,$2,$3,$4,$5,$6)',Object.values(body))).rows;}};
}

test('dry-run M Switch: migrations, isolation, consent and first deal without network',async t=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
   create table public.eme_profiles(id uuid primary key);
   create table public.eme_launch_sentinel(id integer primary key, note text);
   insert into public.eme_launch_sentinel values(1,'existing M Select untouched');
   grant select on public.eme_launch_sentinel to authenticated;`);
  await db.query('insert into public.eme_profiles values($1)',[admin.id]);
  const before=await db.exec(preflight);
  assert.equal(before.find(result=>result.rows?.[0]?.preflight)?.rows[0].preflight.profile_dependency_present,true);
  await db.exec(bundle);
  // Applying the additive extension again must preserve existing state.
  await db.exec(migrations[1]);
  const checked=await db.exec(preflight);
  assert.ok(checked.find(result=>result.rows?.[0]?.preflight).rows[0].preflight.tables_and_grants.every(row=>row.exists&&row.rls));
  const tables=(await db.query("select relname,relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relkind='r' and relname like 'eme_switch_%'")).rows;
  assert.equal(tables.length,8);assert.ok(tables.every(row=>row.relrowsecurity));
  await t.test('anon and authenticated cannot read/write/truncate module tables or call RPC',async()=>{
   for(const role of ['anon','authenticated']){
    await db.exec(`set role ${role}`);
    for(const {relname:table} of tables){
     for(const statement of [`select * from public.${table}`,`insert into public.${table} default values`,`update public.${table} set id=default`,`delete from public.${table}`,`truncate public.${table}`])
      await assert.rejects(db.exec(statement),e=>e.code==='42501');
    }
    await assert.rejects(db.query('select public.eme_switch_acknowledge($1,$2,$3,$4,$5,$6)',['a'.repeat(64),'Synthetic','5554999999999','RS 12345','',false]),e=>e.code==='42501');
    await db.exec('reset role');
   }
   assert.deepEqual((await db.query('select * from public.eme_launch_sentinel')).rows,[{id:1,note:'existing M Select untouched'}]);
   assert.equal((await db.query("select has_table_privilege('authenticated','public.eme_launch_sentinel','select') as allowed")).rows[0].allowed,true);
  });
  await db.exec('set role service_role');
  const client=clientFor(db),rate=async()=>{},service=attachCloudSwitch({client,rate});
  const pros=attachCloudSwitchProfessionals({client,rate,env,fetcher:()=>assert.fail('No messages allowed in dry-run')});
  const deals=attachCloudSwitchDeals({client,rate,env});
  let response;const send=(status,data)=>{response={status,data};};
  const post={method:'POST',headers:{}};
  const buyer=intake(),seller=intake({kind:'sell',requestId:randomUUID(),phone:'(54) 98888-7777'});
  let buyerId,sellerId;
  await t.test('consent version, timestamps, optional choice and idempotency persist atomically',async()=>{
   await assert.rejects(service.publicHandle('/api/public/switch',post,{...buyer,consentVersion:'old'},send),e=>e.status===400);
   await assert.rejects(service.publicHandle('/api/public/switch',post,{...buyer,contactConsent:false},send),e=>e.status===400);
   for(const item of [buyer,buyer,seller])await service.publicHandle('/api/public/switch',post,item,send);
   const rows=(await db.query('select * from public.eme_switch_requests')).rows;assert.equal(rows.length,2);
   buyerId=rows.find(row=>row.kind==='buy').id;sellerId=rows.find(row=>row.kind==='sell').id;
   const receipt=(await db.query('select * from public.eme_switch_consent_events where subject_id=$1',[buyerId])).rows;
   assert.equal(receipt.length,1);assert.equal(receipt[0].consent_version,SWITCH_CONSENT_VERSION);
   assert.equal(receipt[0].purposes.opportunities_whatsapp,false);assert.equal(receipt[0].purposes.response_whatsapp,true);
   assert.ok(rows[0].consent_recorded_at);
   await assert.rejects(db.query('update public.eme_switch_requests set consent_version=$1,version=version+1 where id=$2',['fabricated',buyerId]),/IMMUTABLE/);
   await assert.rejects(db.exec('delete from public.eme_switch_consent_events'),e=>e.code==='42501');
   await assert.rejects(db.exec("insert into public.eme_switch_consent_events(subject_table,subject_id,event,purposes,source) values('eme_switch_requests',gen_random_uuid(),'captured','{}','fake')"),e=>e.code==='42501');
  });
  await t.test('professional opt-out creates one new audit event and duplicate submission cannot re-enable it',async()=>{
   const entry={requestId:randomUUID(),name:'Corretor Sintético',phone:'(54) 97777-6666',creci:'RS TESTE',business:'',city:'Vacaria',propertyType:'Casa',whatsappOptIn:true,privacyAccepted:true,consentVersion:SWITCH_CONSENT_VERSION};
   await pros.publicHandle('/api/public/switch/professionals',post,entry,send);
   await db.exec("update public.eme_switch_professionals set whatsapp_opt_in=false,status='paused'");
   await pros.publicHandle('/api/public/switch/professionals',post,entry,send);
   const [pro]=(await db.query('select * from public.eme_switch_professionals')).rows;
   assert.equal(pro.whatsapp_opt_in,false);
   const audit=(await db.query('select * from public.eme_switch_consent_events where subject_id=$1 order by id',[pro.id])).rows;
   assert.deepEqual(audit.map(row=>row.purposes.opportunities_whatsapp),[true,false]);
   assert.equal((await pros.dispatchDeal(randomUUID())).ready,false);
  });
  await t.test('first deal requires reviewed demand, authorization, contract, closing and receipt evidence',async()=>{
   await service.handle('/api/switch/'+buyerId,{method:'PATCH'},admin,{version:1,status:'qualified',demandReviewed:true},send);
   await service.handle('/api/switch/'+sellerId,{method:'PATCH'},admin,{version:1,status:'qualified',ownershipReviewed:true,sharingAuthorized:true,minAcceptableCents:45000000},send);
   const draft={sourceKind:'switch_request',sourceId:sellerId,demandId:buyerId,salePriceCents:50000000,brokerageBps:500,switchShareBps:3000};
   await assert.rejects(deals.handle('/api/switch/deals',post,{...admin,role:'corretor'},draft,send),e=>e.status===403);
   await deals.handle('/api/switch/deals',post,admin,draft,send);
   const id=response.data.deal.id,token=response.data.invitePath.split('/').pop();
   assert.equal(response.data.notifiedToMeta,false);
   const patch=async(action,details={})=>{const [row]=await client.rest('eme_switch_deal_invites?id=eq.'+id);return deals.handle('/api/switch/deals/'+id,{method:'PATCH'},admin,{version:row.version,action,...details},send);};
   await assert.rejects(patch('introduce'),e=>e.status===409);
   await deals.publicHandle('/api/public/switch/offers/'+token+'/interest',post,{name:'Corretor Sintético',phone:'(54) 96666-5555',creci:'RS TESTE',business:'',acknowledge:true,privacyAccepted:true,marketingOptIn:false},send);
   await assert.rejects(patch('contract',{contractReference:'',licenseChecked:true}),e=>e.status===400);
   await patch('contract',{contractReference:'synthetic-contract-001',licenseChecked:true});
   await db.query('update public.eme_switch_requests set sharing_authorized=false,version=version+1 where id=$1',[sellerId]);
   await assert.rejects(patch('introduce'),e=>e.status===400);
   await db.query('update public.eme_switch_requests set sharing_authorized=true,version=version+1 where id=$1',[sellerId]);
   await patch('introduce');
   await assert.rejects(patch('close',{actualSaleCents:50000000}),e=>e.status===400);
   await patch('close',{actualSaleCents:50000000,closingReference:'synthetic-closing-001'});
   await assert.rejects(patch('paid',{receivedCents:750000}),e=>e.status===400);
   await assert.rejects(patch('paid',{receivedCents:1,paymentReference:'synthetic-receipt-001'}),e=>e.status===400);
   await assert.rejects(db.query("update public.eme_switch_deal_invites set status='paid',received_cents=750000,version=version+1 where id=$1",[id]),/PAYMENT_EVIDENCE_REQUIRED/);
   await patch('paid',{receivedCents:750000,paymentReference:'synthetic-receipt-001'});
   const [paid]=await client.rest('eme_switch_deal_invites?id=eq.'+id);
   assert.equal(paid.status,'paid');assert.equal(paid.payment_reference,'synthetic-receipt-001');
   assert.equal((await db.query('select count(*)::integer as n from public.eme_switch_outbox')).rows[0].n,0);
   assert.deepEqual((await db.query('select new_status from public.eme_switch_deal_audit where deal_id=$1 order by id',[id])).rows.map(row=>row.new_status),['prepared','acknowledged','contracted','introduced','closed','paid']);
  });
  await db.exec('reset role');
  await t.test('RLS still blocks rows even if a browser role receives an accidental grant',async()=>{
   await db.exec('begin; grant select,insert,update,delete on public.eme_switch_requests to authenticated; set local role authenticated;');
   assert.equal((await db.query('select * from public.eme_switch_requests')).rows.length,0);
   assert.equal((await db.query('update public.eme_switch_requests set version=version+1 returning id')).rows.length,0);
   assert.equal((await db.query('delete from public.eme_switch_requests returning id')).rows.length,0);
   await assert.rejects(db.query(`insert into public.eme_switch_requests(id,request_id,kind,name,phone,city,property_type,asking_cents,contact_opt_in,privacy_accepted)
    values($1,$2,'buy','Synthetic denied','5554999999999','Vacaria','Casa',50000000,true,true)`,[randomUUID(),randomUUID()]),e=>e.code==='42501');
   await db.exec('rollback');
  });
 }finally{await db.close();}
});
