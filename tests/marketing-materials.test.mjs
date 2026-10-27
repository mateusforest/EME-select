import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createPortalApi} from '../server/portal-api.mjs';
import {attachCloudMaterials} from '../server/cloud/marketing-materials.mjs';
import {createMaterialsApi,materialSignature} from '../server/marketing-materials.mjs';
import {materialMaxBytes} from '../shared/marketing-materials.mjs';

test('materials: authenticated upload, links, shared library, scoped edits, archive, conflicts and content',async t=>{
 const api=createPortalApi({dbPath:':memory:',env:{}}),server=http.createServer(api.handle);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;t.after(async()=>{await new Promise(r=>server.close(r));api.close();});
 const admin={},broker={},anon={},password='Materials-test-2026!';
 async function req(actor,path,method='GET',body,headers={}){const res=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:actor.cookie||'',...headers},...(body===undefined?{}:{body:Buffer.isBuffer(body)?body:JSON.stringify(body)})});if(res.headers.get('set-cookie'))actor.cookie=res.headers.get('set-cookie').split(';')[0];return {status:res.status,body:res.headers.get('content-type')?.includes('application/json')?await res.json():Buffer.from(await res.arrayBuffer()),headers:res.headers};}
 const first=await req(admin,'/auth/setup','POST',{name:'Admin Teste',email:'materials-admin@example.test',password});assert.equal(first.status,201);
 const second=await req(admin,'/users','POST',{name:'Corretor Teste',email:'materials-broker@example.test',password,role:'corretor'});assert.equal(second.status,201);
 await req(broker,'/auth/login','POST',{email:'materials-broker@example.test',password});assert.equal((await req(broker,'/marketing-materials')).status,403);
 await req(broker,'/auth/password','POST',{currentPassword:password,newPassword:password+'new'});
 const listing=await req(admin,'/listings','POST',{draft:{title:'Imóvel de teste',city:'Vacaria',type:'Casa',operation:'comprar',environment:'urbano',condominium:''}});assert.equal(listing.status,201,JSON.stringify(listing.body));const propertyId=listing.body.id;
 assert.equal((await req(anon,'/marketing-materials')).status,401);
 const bytes=Buffer.from('%PDF-1.7\nMaterial autorizado para teste\n%%EOF');
 const input={title:'Apresentação do imóvel',category:'Apresentação',notes:'Uso interno de teste.',propertyId,brokerId:second.body.user.id,filename:'apresentacao.pdf',mimeType:'application/pdf',sizeBytes:bytes.length};
 assert.equal((await req(admin,'/marketing-materials/uploads','POST',{...input,propertyId:randomUUID()})).status,400);
 assert.equal((await req(admin,'/marketing-materials/uploads','POST',{...input,brokerId:randomUUID()})).status,400);
 assert.equal((await req(admin,'/marketing-materials/uploads','POST',{...input,sizeBytes:materialMaxBytes+1})).status,400);
 assert.equal((await req(admin,'/marketing-materials/uploads','POST',{...input,mimeType:'text/html'})).status,400);
 const start=await req(admin,'/marketing-materials/uploads','POST',input);assert.equal(start.status,201);const id=start.body.id,path='/marketing-materials/'+id;
 assert.equal((await req(admin,'/marketing-materials')).body.materials.length,0);
 assert.equal((await req(admin,path+'/complete','POST',{})).status,409);
 assert.equal((await req(anon,path+'/upload','POST',bytes,{'Content-Type':'application/pdf'})).status,401);
 assert.equal((await req(broker,path+'/upload','POST',bytes,{'Content-Type':'application/pdf'})).status,404);
 assert.equal((await req(admin,path+'/upload','POST',bytes,{'Content-Type':'application/pdf',Origin:'https://evil.test'})).status,403);
 assert.equal((await req(admin,path+'/upload','POST',Buffer.alloc(bytes.length,65),{'Content-Type':'application/pdf'})).status,400);
 assert.equal((await req(admin,path+'/upload','POST',bytes,{'Content-Type':'application/pdf'})).status,200);
 const complete=await req(admin,path+'/complete','POST',{});assert.equal(complete.status,200);assert.equal(complete.body.version,2);
 assert.equal((await req(admin,path+'/complete','POST',{})).body.version,2);
 assert.equal((await req(admin,path+'/upload','POST',bytes,{'Content-Type':'application/pdf'})).status,409);
 const list=await req(broker,'/marketing-materials');assert.equal(list.body.materials.length,1);assert.equal(list.body.materials[0].canEdit,false);assert.equal(list.body.properties.length,1);
 const file=await req(broker,path+'/file?download=1');assert.deepEqual(file.body,bytes);assert.match(file.headers.get('content-disposition'),/attachment/);
 const range=await req(broker,path+'/file','GET',undefined,{Range:'bytes=0-4'});assert.equal(range.status,206);assert.equal(range.body.toString(),'%PDF-');
 assert.equal((await req(anon,path+'/file')).status,401);
 const patch={version:2,title:'Novo título',category:'Apresentação',notes:'',propertyId:null,brokerId:null};
 assert.equal((await req(broker,path,'PATCH',patch)).status,403);
 const edit=await req(admin,path,'PATCH',patch);assert.equal(edit.status,200);assert.equal(edit.body.propertyId,null);
 assert.equal((await req(admin,path,'PATCH',patch)).status,409);
 const archive=await req(admin,path+'/archive','PATCH',{version:3,archived:true});assert.equal(archive.body.archived,true);
 assert.equal((await req(admin,path+'/archive','PATCH',{version:4,archived:false})).body.archived,false);
 const own=await req(broker,'/marketing-materials/uploads','POST',{...input,brokerId:second.body.user.id,propertyId:null});assert.equal(own.status,201);
 assert.equal((await req(broker,'/marketing-materials/uploads','POST',{...input,brokerId:first.body.user.id})).status,403);
 // Videos beyond the JSON request limit are streamed through their dedicated endpoint.
 const video=Buffer.alloc(4*1024*1024);video.writeUInt32BE(24,0);video.write('ftypisom',4);
 const videoStart=await req(broker,'/marketing-materials/uploads','POST',{...input,propertyId:null,brokerId:second.body.user.id,filename:'video.mp4',mimeType:'video/mp4',sizeBytes:video.length});const videoPath='/marketing-materials/'+videoStart.body.id;
 assert.equal((await req(broker,videoPath+'/upload','POST',video,{'Content-Type':'video/mp4'})).status,200);assert.equal((await req(broker,videoPath+'/complete','POST',{})).status,200);
});

test('file signatures reject executable content disguised as creative or video',()=>{
 for(const mime of ['image/jpeg','image/png','image/webp','application/pdf','video/mp4','video/webm','video/quicktime','application/zip'])assert.equal(materialSignature(Buffer.from('<script>invalid file</script>'),mime),false);
 assert.equal(materialSignature(Buffer.from([137,80,78,71,13,10,26,10]),'image/png'),true);
});

test('cloud upload uses private signed storage, validates actual bytes and guards stale writes',async()=>{
 const user={id:randomUUID(),name:'Admin',role:'admin',active:true},rows=new Map(),calls=[],bytes=Buffer.from('%PDF-1.7\n%%EOF');
 const client={async rest(path,method='GET',body){calls.push({path,method,body});if(path.startsWith('eme_cases?'))return [];if(path.startsWith('eme_profiles?'))return [user];if(path.includes('created_by=eq.'))return [];if(method==='POST'){rows.set(body.id,body);return [body];}const id=path.match(/id=eq\.([a-f0-9-]+)/)?.[1];if(id){const row=rows.get(id);if(method==='PATCH'){if(Number(path.match(/version=eq\.(\d+)/)[1])!==row.version)return [];const next={...row,...body};rows.set(id,next);return [next];}return row?[row]:[];}return [...rows.values()].filter(r=>r.status==='ready');},async request(path,options={}){calls.push({path,...options});if(path.includes('/upload/sign/'))return {url:'/object/upload/sign/eme-marketing-materials/test?token=test'};if(path.includes('/object/info/'))return {metadata:{size:bytes.length,mimetype:'application/pdf'}};if(path.includes('/object/authenticated/'))return new Response(bytes,{status:206});if(path.includes('/object/sign/'))return {signedURL:'/object/sign/eme-marketing-materials/test?token=test'};throw Error(path);}};
 const api=attachCloudMaterials({client,env:{SUPABASE_URL:'https://example.supabase.co'}});let response;const send=(status,body)=>{response={status,body};};
 const input={title:'Arquivo geral',category:'Institucional',notes:'',propertyId:null,brokerId:null,filename:'arquivo.pdf',mimeType:'application/pdf',sizeBytes:bytes.length};
 await api.handle('/api/marketing-materials/uploads',{method:'POST'},null,user,input,send);const id=response.body.id;assert.equal(response.body.upload.method,'PUT');assert.match(response.body.upload.url,/^https:\/\/example.supabase.co\/storage\/v1\/object\/upload\/sign\//);
 const complete='/api/marketing-materials/'+id+'/complete';await api.handle(complete,{method:'POST'},null,user,{},send);assert.equal(response.body.version,2);assert(calls.some(c=>c.headers?.Range==='bytes=0-511'));
 await assert.rejects(api.handle('/api/marketing-materials/'+id,{method:'PATCH'},null,user,{version:1,title:'Old',category:'Outros',notes:'',propertyId:null,brokerId:null},send),e=>e.status===409);
 let redirect;await api.handle('/api/marketing-materials/'+id+'/file',{method:'GET',url:'/api/marketing-materials/'+id+'/file?download=1'},{writeHead:(status,headers)=>{redirect={status,headers};},end(){}},user,null,send);assert.equal(redirect.status,302);assert.match(redirect.headers.Location,/download=arquivo.pdf/);assert(calls.some(c=>c.body?.expiresIn===300));
});

test('unfinished uploads cannot become visible with wrong size or wrong MIME',async()=>{
 const user={id:randomUUID(),role:'admin',active:true},row={id:randomUUID(),created_by:null,status:'uploading',size_bytes:20,mime_type:'application/pdf',created_at:new Date().toISOString()};row.created_by=user.id;
 const api=createMaterialsApi({store:{read:async()=>row},storage:{inspect:async()=>({size:21,mime:'text/html',head:Buffer.from('%PDF-1.7')})}});
 await assert.rejects(api.handle('/api/marketing-materials/'+row.id+'/complete',{method:'POST'},null,user,{},()=>{}),e=>e.status===400);
 await assert.rejects(api.handle('/api/marketing-materials',{method:'GET'},null,{...user,role:'customer'},null,()=>{}),e=>e.status===401);
});

test('migration is repeatable and keeps table and storage private even with broad existing policies',async()=>{
 const db=new PGlite();try{await db.exec("create role anon;create role authenticated;create role service_role;create table public.eme_cases(id uuid primary key);create table public.eme_profiles(id uuid primary key);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated;grant select on storage.objects to anon,authenticated;create policy broad on storage.objects for select to anon,authenticated using(true);insert into storage.objects values('eme-marketing-materials'),('other');");const sql=readFileSync(new URL('../supabase/migrations/20261026_marketing_materials.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);assert.equal((await db.query("select public from storage.buckets where id='eme-marketing-materials'")).rows[0].public,false);assert.equal((await db.query("select has_table_privilege('anon','public.eme_marketing_materials','select') as allowed")).rows[0].allowed,false);await db.exec('set role authenticated');assert.deepEqual((await db.query('select * from storage.objects')).rows,[{bucket_id:'other'}]);await assert.rejects(db.query('select * from public.eme_marketing_materials'));}finally{await db.close();}
});
