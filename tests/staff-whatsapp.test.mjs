import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {attachStaffWhatsApp} from '../server/cloud/staff-whatsapp.mjs';
test('staff channel validates token, session and pilot recipients before accessing storage',async()=>{
 const channel=attachStaffWhatsApp({client:{rpc:()=>{throw Error('unexpected storage access');}},env:{EME_STAFF_WHATSAPP_ENABLED:'true',EME_STAFF_WHATSAPP_TOKEN:'a'.repeat(64)}});
 const path='/api/integrations/staff-whatsapp/message';
 await assert.rejects(channel.bridge(path,{method:'POST',headers:{}},{},()=>{}),e=>e.status===401);
 await assert.rejects(channel.bridge(path,{method:'POST',headers:{authorization:'Bearer '+'a'.repeat(64)}},{phone:'5554999999999',sessionId:'eme-oficial-8029'},()=>{}),e=>e.status===403);
});
test('cloud SQL: ownership, expiring single-use codes, deduplication, consent, revocation and RLS',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table eme_profiles(id uuid primary key,active boolean,must_change boolean,role text);
 create table eme_sessions(token_hash text,user_id uuid,expires_at timestamptz,last_seen timestamptz);
 create function eme_limit(text,integer) returns void language sql as 'select';
 insert into eme_profiles values('00000000-0000-0000-0000-000000000001',true,false,'corretor'),('00000000-0000-0000-0000-000000000002',true,false,'corretor');
 insert into eme_sessions values('s1','00000000-0000-0000-0000-000000000001',now()+interval '1 hour',now()),('s2','00000000-0000-0000-0000-000000000002',now()+interval '1 hour',now());`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261109_staff_whatsapp.sql',import.meta.url),'utf8'));
 const account=async(session,action,phone='',hash='')=>(await db.query('select eme_staff_wa_account($1,$2,$3,$4) as r',[session,action,phone,hash])).rows[0].r;
 let seq=0;const message=async(text,id=String(++seq),code='')=>(await db.query('select eme_staff_wa_message($1,$2,$3,$4,$5) as r',['5554984007919',id,text,text,code])).rows[0].r;
 assert.match((await message('EQUIPE')).reply,/vincule/);
 await assert.rejects(account('invalid','code','5554984007919','a'.repeat(64)),/UNAUTHORIZED/);
 await account('s1','code','5554984007919','a'.repeat(64));
 assert.match((await message('VINCULAR 1234567890abcdef',undefined,'x')).reply,/inválido/);
 assert.match((await message('VINCULAR 1234567890abcdef',undefined,'a'.repeat(64))).reply,/foi vinculado/);
 assert.match((await message('VINCULAR 1234567890abcdef',undefined,'a'.repeat(64))).reply,/inválido/);
 await account('s2','code','5554984007919','b'.repeat(64));
 assert.match((await message('VINCULAR 1234567890abcdef',undefined,'b'.repeat(64))).reply,/outra conta/);
 await message('Preciso cadastrar um imóvel de teste');
 assert.equal((await account('s1','snapshot')).requests.length,0);
 const confirmed=await message('SIM','confirmation');
 assert.ok(confirmed.reference);
 assert.deepEqual(await message('SIM','confirmation'),confirmed);
 await assert.rejects(message('changed','confirmation'),/FORBIDDEN/);
 assert.equal((await account('s1','snapshot')).requests.length,1);
 assert.equal((await account('s2','snapshot')).requests.length,0);
 await message('SIM');assert.equal((await account('s1','snapshot')).requests.length,1);
 await db.exec("update eme_profiles set active=false where id='00000000-0000-0000-0000-000000000001'");
 assert.match((await message('EQUIPE')).reply,/vincule/);
 await db.exec("update eme_profiles set active=true;update eme_staff_wa_codes set expires_at=now()-interval '1 minute'");
 assert.match((await message('VINCULAR 1234567890abcdef',undefined,'b'.repeat(64))).reply,/inválido/);
 await account('s1','unlink');assert.equal((await account('s1','snapshot')).links.length,0);
 await db.exec('set role anon');await assert.rejects(db.query('select * from eme_staff_wa_links'),/permission denied/);
 await assert.rejects(account('s1','snapshot'),/permission denied/);
 }finally{await db.close();}
});
