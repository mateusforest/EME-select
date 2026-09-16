import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {emptyFinance} from '../shared/finance.mjs';

test('finance Postgres boundary: admin authorization, atomic versioning, replay and immutable audit', async t => {
  const db=new PGlite();t.after(()=>db.close());
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
  await db.exec(readFileSync(new URL('../supabase/migrations/20260914_portal.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20260916_finance.sql',import.meta.url),'utf8'));
  const admin='00000000-0000-4000-8000-000000000001',broker='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
  for(const id of [admin,broker,other])await db.query('insert into auth.users values($1)',[id]);
  await db.query('select public.eme_bootstrap($1,$2,$3)',[admin,'Admin financeiro','finance@example.invalid']);
  await db.query("insert into public.eme_profiles(id,name,email,role) values($1,'Corretor','broker@example.invalid','corretor'),($2,'Outro admin','other@example.invalid','admin')",[broker,other]);
  for(const [token,id]of [['admin',admin],['broker',broker],['other',other]])await db.query("insert into public.eme_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[token,id]);
  const initial=emptyFinance(),one={...initial,accounts:[{id:'00000000-0000-4000-8000-000000000101',name:'Banco manual',openingBalanceCents:100000}]};
  const firstId='00000000-0000-4000-8000-000000000201',secondId='00000000-0000-4000-8000-000000000202';
  const command={type:'account.save',data:one.accounts[0]};
  const save=(session='admin',version=0,requestId=firstId,data=one,body=command,hash='a'.repeat(64))=>db.query('select * from public.eme_save_finance($1,$2,$3,$4,$5,$6,$7,$8)',[session,version,requestId,hash,JSON.stringify(body),JSON.stringify(data),'b'.repeat(64),'c'.repeat(64)]);
  const count=async table=>(await db.query('select count(*)::int n from public.'+table)).rows[0].n;
  await t.test('empty database matches domain and no financial data is publicly available',async()=>{
    assert.deepEqual((await db.query("select data from public.eme_finance_state where id='company'")).rows[0].data,initial);
    const rls=(await db.query("select relname,relrowsecurity from pg_class where relname in ('eme_finance_state','eme_finance_audit','eme_finance_receipts')")).rows;
    assert.equal(rls.length,3);assert.ok(rls.every(row=>row.relrowsecurity));
    for(const role of ['anon','authenticated']){
      await db.exec('set role '+role);
      for(const table of ['eme_finance_state','eme_finance_audit','eme_finance_receipts'])await assert.rejects(db.query('select * from public.'+table),/permission denied/);
      await assert.rejects(db.query("select nextval('public.eme_finance_audit_id_seq')"),/permission denied/);
      await assert.rejects(save(),/permission denied/);await db.exec('reset role');
    }
  });
  await t.test('RPC validates real admin session rather than trusting service access',async()=>{
    await db.exec('set role service_role');
    await assert.rejects(save('missing'),/UNAUTHORIZED/);
    await assert.rejects(save('broker'),/FORBIDDEN/);
    const results=await Promise.all([save(),save()]);assert.ok(results.every(result=>Number(result.rows[0].version)===1));
    assert.equal(await count('eme_finance_audit'),1);assert.equal(await count('eme_finance_receipts'),1);
    await db.exec('reset role');
  });
  await t.test('same request is idempotent even with stale version, while altered or other actor reuse fails',async()=>{
    assert.equal(Number((await save()).rows[0].version),1);
    assert.equal(Number((await save('admin',0,firstId,null)).rows[0].version),1);
    await assert.rejects(save('admin',0,firstId,one,{...command,data:{...command.data,name:'Outro'}}),/FINANCE_REQUEST_REUSED/);
    await assert.rejects(save('other'),/FINANCE_REQUEST_REUSED/);
    await assert.rejects(save('admin',0,secondId),/STALE_VERSION/);
    assert.equal(await count('eme_finance_audit'),1);
  });
  await t.test('state and receipt are atomic; malformed state does not advance the ledger',async()=>{
    await assert.rejects(save('admin',1,secondId,{...one,entries:{}}),/FINANCE_INVALID_STATE/);
    await assert.rejects(save('admin',1,secondId,{...one,notes:'x'.repeat(2_000_000)}),/FINANCE_INVALID_STATE/);
    assert.equal(await count('eme_finance_receipts'),1);
    const results=await Promise.allSettled([save('admin',1,secondId),save('admin',1,'00000000-0000-4000-8000-000000000203')]);
    assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(results.filter(result=>result.status==='rejected'&&/STALE_VERSION/.test(result.reason.message)).length,1);
    assert.equal(await count('eme_finance_audit'),2);
  });
  await t.test('application service cannot modify audit or replay receipts',async()=>{
    await db.exec('set role service_role');
    for(const table of ['eme_finance_audit','eme_finance_receipts']){
      await assert.rejects(db.query('delete from public.'+table),/permission denied/);
      await assert.rejects(db.query('update public.'+table+' set state_version=999'),/permission denied/);
    }
    await assert.rejects(db.query("delete from public.eme_finance_state where id='company'"),/permission denied/);
    await db.exec('reset role');
  });
  await t.test('expired, idle, password-reset and revoked administrators cannot write',async()=>{
    const next='00000000-0000-4000-8000-000000000204';
    await db.query("update public.eme_sessions set expires_at=now()-interval '1 minute' where token_hash='admin'");
    await assert.rejects(save('admin',2,next),/UNAUTHORIZED/);
    await db.query("update public.eme_sessions set expires_at=now()+interval '1 hour',last_seen=now()-interval '31 minutes' where token_hash='admin'");
    await assert.rejects(save('admin',2,next),/UNAUTHORIZED/);
    await db.query("update public.eme_sessions set last_seen=now() where token_hash='admin'");
    await db.query('update public.eme_profiles set must_change=true where id=$1',[admin]);
    await assert.rejects(save('admin',2,next),/UNAUTHORIZED/);
    await db.query('update public.eme_profiles set must_change=false,active=false where id=$1',[admin]);
    await assert.rejects(save('admin',2,next),/UNAUTHORIZED/);
    assert.equal(await count('eme_finance_audit'),2);
  });
});
