import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{PGlite}from'@electric-sql/pglite';
test('Postgres migration: RLS, ownership, atomic versioning, audit and revocation',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");
 await db.exec(readFileSync(new URL('../supabase/migrations/20260914_portal.sql',import.meta.url),'utf8'));
 await db.exec(readFileSync(new URL('../supabase/migrations/20260915_submissions.sql',import.meta.url),'utf8'));
 const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'];
 for(const id of ids)await db.query('insert into auth.users values($1)',[id]);
 await db.query('select public.eme_bootstrap($1,$2,$3)',[ids[0],'Admin teste','admin@example.invalid']);
 await assert.rejects(db.query('select public.eme_bootstrap($1,$2,$3)',[ids[1],'Segundo','other@example.invalid']));
 await db.query("insert into public.eme_sessions(token_hash,user_id,expires_at) values('admin',$1,now()+interval '1 hour')",[ids[0]]);
 await db.query('select public.eme_add_member($1,$2,$3,$4,$5)',['admin',ids[1],'Broker teste','broker@example.invalid','corretor']);
 await db.query('update public.eme_profiles set must_change=false where id=$1',[ids[1]]);
 await db.query("insert into public.eme_sessions(token_hash,user_id,expires_at) values('broker',$1,now()+interval '1 hour')",[ids[1]]);
 const caseId='00000000-0000-4000-8000-000000000010',data={stage:'Em avaliação',published:null};
 const save=(session,version,body,assigned=ids[0])=>db.query('select * from public.eme_save_case($1,$2,$3,$4,$5,$6,$7)',[session,caseId,version,JSON.stringify(body),assigned,'Teste','Registro de teste']);
 await save('admin',0,data);await assert.rejects(save('broker',1,data));await save('admin',1,data,ids[1]);await assert.rejects(save('broker',1,data,ids[1]));
 await save('broker',2,data,ids[1]);await assert.rejects(save('broker',3,{...data,stage:'Entrada aprovada'},ids[1]));await save('admin',3,{...data,stage:'Entrada aprovada'},ids[1]);
 assert.equal((await db.query('select count(*)::int n from public.eme_audit where case_id=$1',[caseId])).rows[0].n,4);
 await db.exec('set role anon');await assert.rejects(db.query('select * from public.eme_cases'));await assert.rejects(save('admin',4,data));await db.exec('reset role');
 await db.query('select public.eme_set_active($1,$2,$3)',['admin',ids[1],false]);assert.equal((await db.query("select count(*)::int n from public.eme_sessions where token_hash='broker'")).rows[0].n,0);
 const submitted='00000000-0000-4000-8000-000000000099';const received={title:'Recebido',submissionHash:'same',stage:'Entrada aprovada',published:{unsafe:true}};
 await db.query('select public.eme_receive_submission($1,$2)',[submitted,JSON.stringify(received)]);
 await db.query('select public.eme_receive_submission($1,$2)',[submitted,JSON.stringify(received)]);
 const actual=(await db.query('select data from public.eme_cases where id=$1',[submitted])).rows[0].data;
 assert.equal(actual.stage,'Recebido');assert.equal(actual.published,null);assert.deepEqual(actual.photos,[]);
 assert.equal((await db.query('select count(*)::int n from public.eme_audit where case_id=$1',[submitted])).rows[0].n,1);
 await db.exec('set role anon');await assert.rejects(db.query('select public.eme_receive_submission($1,$2)',[submitted,'{}']));await db.exec('reset role');
 assert.equal((await db.query("select public from storage.buckets where id='eme-property-photos'")).rows[0].public,false);
 }finally{await db.close();}
});
