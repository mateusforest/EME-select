import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

const empty=()=>({version:1,tickets:[],visits:[],leases:[],documents:[],reviews:[]});
const admin='00000000-0000-4000-8000-000000000001',broker='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
const property='00000000-0000-4000-8000-000000000010',foreignProperty='00000000-0000-4000-8000-000000000011';
const ticketId='00000000-0000-4000-8000-000000000101';
const createdAt='2026-09-16T12:00:00Z';
const ticket={id:ticketId,propertyId:property,title:'Atendimento privado',contactName:'Contato de teste',contactPhone:'54900000000',channel:'phone',status:'new',assigneeId:broker,priority:'normal',nextContactAt:null,notes:'Registro privado de teste.',messages:[],createdAt,updatedAt:createdAt,createdBy:broker};

test('operations PostgreSQL boundary protects portfolios, files, admin actions and atomic command receipts',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);');
  await db.exec(readFileSync(new URL('../supabase/migrations/20260914_portal.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20260916_operations.sql',import.meta.url),'utf8'));
  for(const id of [admin,broker,other])await db.query('insert into auth.users values($1)',[id]);
  await db.query('select public.eme_bootstrap($1,$2,$3)',[admin,'Admin operações','admin@example.invalid']);
  await db.query("insert into public.eme_profiles(id,name,email,role) values($1,'Corretor um','broker@example.invalid','corretor'),($2,'Corretor dois','other@example.invalid','corretor')",[broker,other]);
  for(const [token,id]of [['admin',admin],['broker',broker],['other',other]])await db.query("insert into public.eme_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[token,id]);
  await db.query("insert into public.eme_cases(id,assignee_id,data) values($1,$2,'{\"title\":\"Carteira um\"}'),($3,$4,'{\"title\":\"Carteira dois\"}')",[property,broker,foreignProperty,other]);
  let current=empty(),version=0;
  const baseCommand={type:'ticket.save',data:{propertyId:property,title:ticket.title,contactName:ticket.contactName,contactPhone:ticket.contactPhone,channel:ticket.channel,status:ticket.status,assigneeId:broker,priority:'normal',nextContactAt:null,notes:ticket.notes}};
  const count=async table=>(await db.query('select count(*)::int n from public.'+table)).rows[0].n;
  const save=({session='broker',revision=version,id=randomUUID(),command=baseCommand,data={...current,tickets:[ticket]},propertyId=property,file=null,hash='a'.repeat(64)}={})=>db.query('select * from public.eme_save_operations($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[session,revision,id,hash,JSON.stringify(command),data===null?null:JSON.stringify(data),propertyId,file===null?null:JSON.stringify(file),'b'.repeat(64),'c'.repeat(64)]);
  const refresh=async()=>{const row=(await db.query("select version,data from public.eme_operations_state where id='company'")).rows[0];current=row.data;version=Number(row.version);};
  await t.test('every operations table and RPC is private to the backend',async()=>{
    assert.deepEqual((await db.query("select data from public.eme_operations_state where id='company'")).rows[0].data,empty());
    const tables=['eme_operations_state','eme_operations_audit','eme_operations_receipts','eme_operations_files'];
    const rls=(await db.query("select relname,relrowsecurity from pg_class where relname in ('eme_operations_state','eme_operations_audit','eme_operations_receipts','eme_operations_files')")).rows;
    assert.equal(rls.length,4);assert.ok(rls.every(row=>row.relrowsecurity));
    for(const role of ['anon','authenticated']){
      await db.exec('set role '+role);
      for(const table of tables)await assert.rejects(db.query('select * from public.'+table),/permission denied/);
      await assert.rejects(save(),/permission denied/);await db.exec('reset role');
    }
  });
  const firstId=randomUUID();
  await t.test('a real current session and current case assignment are mandatory even with a service connection',async()=>{
    await db.exec('set role service_role');
    await assert.rejects(save({session:'missing'}),/UNAUTHORIZED/);
    await assert.rejects(save({session:'other'}),/FORBIDDEN|NOT_FOUND/);
    const results=await Promise.all([save({id:firstId}),save({id:firstId})]);
    assert.ok(results.every(result=>Number(result.rows[0].version)===1));
    await db.exec('reset role');await refresh();assert.equal(version,1);assert.equal(await count('eme_operations_audit'),1);
  });
  await t.test('stale retries are idempotent while changed payloads and another actor cannot reuse a receipt',async()=>{
    assert.equal(Number((await save({id:firstId,revision:0,data:null})).rows[0].version),1);
    await assert.rejects(save({id:firstId,revision:0,hash:'d'.repeat(64)}),/REQUEST_REUSED/);
    await assert.rejects(save({id:firstId,revision:0,session:'admin'}),/REQUEST_REUSED/);
    await assert.rejects(save({revision:0}),/STALE_VERSION/);
    assert.equal(await count('eme_operations_receipts'),1);
  });
  await t.test('a broker cannot smuggle another portfolio or management review through the proposed state',async()=>{
    const foreign={...ticket,id:randomUUID(),propertyId:foreignProperty,assigneeId:other};
    await assert.rejects(save({data:{...current,tickets:[ticket,foreign]}}),/FORBIDDEN|SCOPE|INVALID/);
    await assert.rejects(save({propertyId:foreignProperty}),/FORBIDDEN|NOT_FOUND/);
    await assert.rejects(save({data:{...current,reviews:[{id:randomUUID(),brokerId:other,evidence:'Conteúdo privado da gestão'}]}}),/FORBIDDEN|SCOPE|INVALID/);
    for(const type of ['visit.confirm','key.authorize','document.review','lease.end','review.save'])await assert.rejects(save({command:{type,data:{id:ticketId}},data:current}),/FORBIDDEN/);
    assert.equal(await count('eme_operations_audit'),1);
  });
  await t.test('atomic version checking admits one concurrent change and never commits malformed state',async()=>{
    await assert.rejects(save({data:{...current,visits:{}}}),/INVALID/);
    const next={...current,tickets:[{...ticket,title:'Título atualizado'}]};
    const command={type:'ticket.save',data:{...baseCommand.data,id:ticketId,title:'Título atualizado'}};
    const results=await Promise.allSettled([save({data:next,command}),save({data:next,command})]);
    assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(results.filter(result=>result.status==='rejected'&&/STALE_VERSION/.test(result.reason.message)).length,1);
    await refresh();assert.equal(version,2);assert.equal(await count('eme_operations_audit'),2);
  });
  await t.test('private file insertion is atomic with metadata and no browser role can read its bytes',async()=>{
    const bytes=Buffer.from('%PDF-1.4\nprivate test document\n%%EOF');
    const documentId=randomUUID(),sha256=createHash('sha256').update(bytes).digest('hex');
    const file={id:documentId,propertyId:property,filename:'private.pdf',mimeType:'application/pdf',sizeBytes:bytes.length,sha256,contentBase64:bytes.toString('base64')};
    const document={id:documentId,propertyId:property,title:'Documento privado',category:'authorization',filename:file.filename,mimeType:file.mimeType,sizeBytes:file.sizeBytes,sha256,version:1,previousId:null,expiresOn:null,status:'pending',reviewNotes:'',reviewedAt:null,reviewedBy:null,createdAt,updatedAt:createdAt,createdBy:broker};
    const data={...current,documents:[document]},command={type:'document.upload',data:{propertyId:property,title:document.title,category:document.category,filename:file.filename,mimeType:file.mimeType,sizeBytes:file.sizeBytes,sha256}};
    await assert.rejects(save({data,command,file:{...file,propertyId:foreignProperty}}),/FORBIDDEN|SCOPE|INVALID/);
    await save({data,command,file});await refresh();assert.equal(current.documents[0].id,documentId);assert.equal(await count('eme_operations_files'),1);
    const audit=(await db.query('select command from public.eme_operations_audit')).rows;
    assert.equal(JSON.stringify(audit).includes(file.contentBase64),false);
    for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from public.eme_operations_files'),/permission denied/);await db.exec('reset role');}
  });
  await t.test('broker ticket updates cannot erase or forge the recorded message history',async()=>{
    const saved=current.tickets[0],message={id:randomUUID(),direction:'internal',body:'Registro legítimo acrescentado.',occurredAt:createdAt,createdAt,createdBy:broker};
    const command={type:'ticket.message',data:{id:ticketId,direction:message.direction,body:message.body,occurredAt:createdAt}};
    await assert.rejects(save({command,data:{...current,tickets:[{...saved,messages:[{...message,createdBy:other}]}]}}),/FORBIDDEN/);
    await save({command,data:{...current,tickets:[{...saved,messages:[message]}]}});await refresh();
    const withHistory=current.tickets[0];
    await assert.rejects(save({command:{type:'ticket.save',data:{...baseCommand.data,id:ticketId}},data:{...current,tickets:[{...withHistory,messages:[]}]}}),/FORBIDDEN|HISTORY_IMMUTABLE/);
    await assert.rejects(save({command,data:{...current,tickets:[{...withHistory,messages:[{...message,body:'Histórico alterado.'},{...message,id:randomUUID()}]}]}}),/FORBIDDEN|HISTORY_IMMUTABLE/);
  });
  await t.test('a broker cannot reset outstanding or returned key custody by editing the visit through the RPC',async()=>{
    const id=randomUUID(),key={status:'out',authorizedAt:createdAt,authorizedBy:admin,returnDueAt:'2026-09-16T18:00:00Z',pickedUpAt:'2026-09-16T14:00:00Z',returnedAt:null,custodianName:'Custódia registrada',identityReference:'Referência interna',notes:'Entrega conferida.'};
    const visit={id,propertyId:property,brokerId:broker,visitorName:'Visitante teste',visitorPhone:'',startAt:'2026-09-16T14:00:00Z',endAt:'2026-09-16T15:00:00Z',status:'confirmed',notes:'Agendamento com custódia.',cancelReason:null,key,createdAt,updatedAt:createdAt,createdBy:admin};
    await save({session:'admin',command:{type:'visit.save',data:{id,propertyId:property}},data:{...current,visits:[visit]}});await refresh();
    const cleared={status:'none',authorizedAt:null,authorizedBy:null,returnDueAt:null,pickedUpAt:null,returnedAt:null,custodianName:'',identityReference:'',notes:''};
    const command={type:'visit.save',data:{id,propertyId:property}};
    await assert.rejects(save({command,data:{...current,visits:[{...visit,status:'requested',key:cleared}]}}),/FORBIDDEN/);
    const returned={...visit,key:{...key,status:'returned',returnedAt:'2026-09-16T15:00:00Z'}};
    await save({session:'admin',command:{type:'key.return',data:{id}},data:{...current,visits:[returned]}});await refresh();
    await assert.rejects(save({command,data:{...current,visits:[{...returned,status:'requested',key:cleared}]}}),/FORBIDDEN/);
  });
  await t.test('audit, receipts and private file versions cannot be overwritten by the service role',async()=>{
    await db.exec('set role service_role');
    for(const table of ['eme_operations_audit','eme_operations_receipts','eme_operations_files']){
      await assert.rejects(db.query('delete from public.'+table),/permission denied/);
    }
    await assert.rejects(db.query('update public.eme_operations_audit set state_version=999'),/permission denied/);
    await assert.rejects(db.query("delete from public.eme_operations_state where id='company'"),/permission denied/);
    await db.exec('reset role');
  });
  await t.test('reassignment, password reset, expiry and suspension revoke subsequent mutations',async()=>{
    await db.query('update public.eme_cases set assignee_id=$1 where id=$2',[other,property]);
    await assert.rejects(save(),/FORBIDDEN|NOT_FOUND/);
    await db.query('update public.eme_cases set assignee_id=$1 where id=$2',[broker,property]);
    await db.query('update public.eme_profiles set must_change=true where id=$1',[broker]);await assert.rejects(save(),/UNAUTHORIZED/);
    await db.query('update public.eme_profiles set must_change=false where id=$1',[broker]);
    await db.query("update public.eme_sessions set expires_at=now()-interval '1 minute' where token_hash='broker'");await assert.rejects(save(),/UNAUTHORIZED/);
    await db.query("update public.eme_sessions set expires_at=now()+interval '1 hour' where token_hash='broker'");
    await db.query('update public.eme_profiles set active=false where id=$1',[broker]);await assert.rejects(save(),/UNAUTHORIZED/);
  });
});
