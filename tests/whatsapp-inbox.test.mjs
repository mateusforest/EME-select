import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {PGlite} from '@electric-sql/pglite';
import {attachWhatsAppInbox} from '../server/cloud/whatsapp-inbox.mjs';
test('inbox rejects anonymous bridge and non-admin accounts',async()=>{const a=attachWhatsAppInbox({client:{},hashOf:()=>'',env:{EME_STAFF_WHATSAPP_ENABLED:'true',EME_STAFF_WHATSAPP_TOKEN:'a'.repeat(64)}});await assert.rejects(a.bridge('/api/integrations/whatsapp-inbox',{method:'POST',headers:{}},{},()=>{}),e=>e.status===401);await assert.rejects(a.handle('/api/whatsapp-inbox',{method:'GET'},{role:'corretor',active:true},null,()=>{}),e=>e.status===403);});
test('inbox queue: test scope, private history, idempotent sends, single claim, human takeover and cancellation',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table eme_profiles(id uuid primary key,name text,role text,active boolean,must_change boolean);
 create table eme_sessions(token_hash text,user_id uuid,expires_at timestamptz,last_seen timestamptz);
 create table eme_staff_wa_links(phone text,user_id uuid);
 create function eme_limit(text,integer) returns void language sql as 'select';
 insert into eme_profiles values('00000000-0000-0000-0000-000000000001','Admin','admin',true,false),('00000000-0000-0000-0000-000000000002','Broker','corretor',true,false);
 insert into eme_sessions values('admin','00000000-0000-0000-0000-000000000001',now()+interval '1 hour',now()),('broker','00000000-0000-0000-0000-000000000002',now()+interval '1 hour',now());`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261109_whatsapp_inbox.sql',import.meta.url),'utf8'));
 const user=async(action,phone='5554981037089',id=null,text='',mode='',session='admin')=>(await db.query('select eme_inbox_user($1,$2,$3,$4,$5,$6) as r',[session,action,phone,id,text,mode])).rows[0].r;
 const bridge=async(action,data={})=>(await db.query('select eme_inbox_bridge($1,$2) as r',[action,data])).rows[0].r;
 assert.equal((await user('list')).contacts.length,3);
 await assert.rejects(user('list','',null,'','','broker'),/FORBIDDEN/);
 await assert.rejects(user('list','',null,'','','no-session'),/UNAUTHORIZED/);
 const id='00000000-0000-0000-0000-000000000011';
 await assert.rejects(user('send','5554999999999',id,'Hello'),/FORBIDDEN/);
 await user('send','5554981037089',id,'Teste');await user('send','5554981037089',id,'Teste');
 await assert.rejects(user('send','5554981037089',id,'changed'),/FORBIDDEN/);
 assert.equal((await user('messages')).outbox.length,1);assert.equal((await bridge('control',{phone:'5554981037089'})).mode,'human');
 assert.equal(await bridge('claim'),null);
 await bridge('sync',{connected:true,messages:[]});const job=await bridge('claim');assert.equal(job.id,id);assert.equal(await bridge('claim'),null);
 await bridge('ack',{id,status:'uncertain'});assert.equal(await bridge('claim'),null);
 await assert.rejects(user('mode','5554981037089',null,'','auto'),/FORBIDDEN/);
 await bridge('sync',{connected:true,messages:[{id:job.message_key,phone:job.phone,from_me:true,body:'Teste',status:'DELIVERED',sent_at:new Date().toISOString()}]});
 assert.equal((await user('messages')).outbox.length,0);assert.equal((await user('messages')).messages.length,1);
 await user('mode','5554981037089',null,'','auto');assert.equal((await bridge('control',{phone:'5554981037089'})).mode,'auto');
 const cancelId='00000000-0000-0000-0000-000000000012';await user('send','5554981037089',cancelId,'Cancelled');assert.equal((await user('cancel','5554981037089',cancelId)).ok,true);assert.equal(await bridge('claim'),null);
 await db.exec('set role anon');await assert.rejects(db.query('select * from eme_inbox_messages'),/permission denied/);await assert.rejects(bridge('claim'),/permission denied/);
 }finally{await db.close();}
});
