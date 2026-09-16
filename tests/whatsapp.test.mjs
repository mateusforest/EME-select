import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createWhatsApp,extractWhatsAppEvents} from '../server/whatsapp.mjs';
import {createPortalApi} from '../server/portal-api.mjs';
import {attachCloudWhatsApp} from '../server/cloud/whatsapp.mjs';
const env={WHATSAPP_ACCESS_TOKEN:'private-test-token',WHATSAPP_PHONE_NUMBER_ID:'123456',WHATSAPP_BUSINESS_ACCOUNT_ID:'987654',META_APP_SECRET:'test-meta-secret-123456789',WHATSAPP_VERIFY_TOKEN:'test-verify-token-12345678901234567890',WHATSAPP_GRAPH_VERSION:'v25.0',WHATSAPP_WEBHOOK_ENABLED:'true'};
const payload=()=>({object:'whatsapp_business_account',entry:[{id:env.WHATSAPP_BUSINESS_ACCOUNT_ID,changes:[{field:'messages',value:{messaging_product:'whatsapp',metadata:{phone_number_id:env.WHATSAPP_PHONE_NUMBER_ID},contacts:[{wa_id:'5554000000000',profile:{name:'Pessoa fictícia'}}],messages:[{id:'wamid.test-1',from:'5554000000000',timestamp:'1789560000',type:'text',text:{body:'Gostaria de avaliar meu imóvel.'}}]}}]}]});
const fixture=()=>{const events=new Map();let ready=true,broken=false;const service=createWhatsApp({env,store:{ready:async()=>ready,ingest:async rows=>{if(broken)throw Error('storage failed');rows.forEach(row=>{if(!events.has(row.event_key))events.set(row.event_key,row);});},list:async()=>[...events.values()]}});return{service,events,setReady:value=>ready=value,setBroken:value=>broken=value};};
function incoming(value=payload(),override={}){const raw=typeof value==='string'?value:JSON.stringify(value);return{method:'POST',url:'https://www.emeselect.com/api/webhooks/whatsapp',headers:new Headers({'content-type':'application/json','x-hub-signature-256':'sha256='+createHmac('sha256',env.META_APP_SECRET).update(raw).digest('hex')}),body:[Buffer.from(raw)],...override};}
test('webhook validates challenge and never confirms setup without durable storage',async()=>{
 const f=fixture(),url='https://www.emeselect.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=1234&hub.verify_token=';
 assert.equal((await f.service.webhook({method:'GET',url:url+'wrong'})).status,403);
 let reply=await f.service.webhook({method:'GET',url:url+env.WHATSAPP_VERIFY_TOKEN});assert.equal(reply.status,200);assert.equal(await reply.text(),'1234');
 f.setReady(false);assert.equal((await f.service.webhook({method:'GET',url:url+env.WHATSAPP_VERIFY_TOKEN})).status,503);
});
test('signed deliveries are durable and idempotent; forged, foreign and oversized events fail closed',async()=>{
 const f=fixture();assert.equal((await f.service.webhook(incoming())).status,200);assert.equal((await f.service.webhook(incoming())).status,200);assert.equal(f.events.size,1);
 const record=[...f.events.values()][0];assert.equal(record.data.text,'Gostaria de avaliar meu imóvel.');assert.ok(!JSON.stringify(record).includes(env.META_APP_SECRET));
 const forged=incoming();forged.body=[Buffer.from(JSON.stringify(payload())+' ')];assert.equal((await f.service.webhook(forged)).status,403);
 const foreign=payload();foreign.entry[0].id='111111';assert.equal((await f.service.webhook(incoming(foreign))).status,403);
 const otherPhone=payload();otherPhone.entry[0].changes[0].value.metadata.phone_number_id='111111';assert.equal((await f.service.webhook(incoming(otherPhone))).status,403);
 assert.equal((await f.service.webhook(incoming('{broken'))).status,400);
 assert.equal((await f.service.webhook(incoming(' '.repeat(256*1024+1)))).status,413);
 f.setBroken(true);assert.equal((await f.service.webhook(incoming())).status,503);
 assert.equal(f.events.size,1);
});
test('status and media events preserve distinct delivery states without downloading media',()=>{
 const body=payload(),value=body.entry[0].changes[0].value;
 value.messages=[{id:'media-1',from:'5554000000000',timestamp:'1789560000',type:'image',image:{id:'media-reference',caption:'Sala'}}];
 value.statuses=[{id:'outgoing-1',recipient_id:'5554000000000',timestamp:'1789560001',status:'delivered'},{id:'outgoing-1',recipient_id:'5554000000000',timestamp:'1789560002',status:'read'}];
 const events=extractWhatsAppEvents(body,env);assert.equal(events.length,3);assert.equal(new Set(events.map(row=>row.event_key)).size,3);assert.equal(events[0].data.mediaId,'media-reference');assert.equal(events[0].data.text,'Sala');
});
test('setup is administrative, exposes only configuration flags, and never sends messages',async()=>{
 let calls=[];const service=createWhatsApp({env,store:{ready:async()=>true,list:async()=>[]},fetcher:async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>url.includes('/phone_numbers')?{data:[{id:env.WHATSAPP_PHONE_NUMBER_ID}]}:{id:env.WHATSAPP_PHONE_NUMBER_ID,display_phone_number:'+55 54 99157-8029',verified_name:'EME'}};}});
 await assert.rejects(service.handle('/api/whatsapp/connection',{method:'GET'},null,{role:'corretor'},null,()=>{}),/administradores/);
 const status=await service.status();assert.equal(status.automaticReplies,false);assert.equal(status.receivingReady,true);for(const secret of [env.WHATSAPP_ACCESS_TOKEN,env.META_APP_SECRET,env.WHATSAPP_VERIFY_TOKEN])assert.ok(!JSON.stringify(status).includes(secret));
 let result;await service.handle('/api/whatsapp/connection/test',{method:'POST'},null,{role:'admin'},null,(_status,value)=>result=value);assert.match(result.message,/Nenhuma mensagem/);assert.equal(calls.length,2);assert.ok(calls.every(call=>!call.options.method&&!call.url.includes('/messages')));
 const disabled=createWhatsApp({env:{...env,WHATSAPP_WEBHOOK_ENABLED:'false'},store:{ready:async()=>{throw Error('must not touch storage');}}});assert.equal((await disabled.webhook(incoming())).status,503);
});
test('Cloud inbox uses server-only storage and duplicate-ignore inserts',async()=>{
 let request;const service=attachCloudWhatsApp({env,client:{rest:async path=>{assert.match(path,/eme_whatsapp_events/);return[];},request:async(...args)=>request=args}});
 assert.equal((await service.webhook(incoming())).status,200);assert.equal(request[0],'/rest/v1/eme_whatsapp_events?on_conflict=event_key');assert.equal(request[1].headers.Prefer,'resolution=ignore-duplicates,return=minimal');
});
test('inbox migration restricts all client roles and permits only server reads and inserts',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create table public.eme_operations_state(id text);');await db.exec(readFileSync(new URL('../supabase/migrations/20260916_whatsapp.sql',import.meta.url),'utf8'));
 assert.equal((await db.query("select relrowsecurity from pg_class where relname='eme_whatsapp_events'")).rows[0].relrowsecurity,true);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from public.eme_whatsapp_events'),/permission denied/);await db.exec('reset role');}
 await db.exec('set role service_role');await db.query('select * from public.eme_whatsapp_events');await assert.rejects(db.exec('delete from public.eme_whatsapp_events'),/permission denied/);
});
test('local HTTP reception bypasses browser origin only for signed callbacks; inbox still requires login',async t=>{
 const previous=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));Object.assign(process.env,env);
 const app=createPortalApi({dbPath:':memory:'}),server=createServer((req,res)=>app.handle(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));app.close();for(const[key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}});
 const event=incoming();assert.equal((await fetch(base+'/api/webhooks/whatsapp',{method:'POST',headers:event.headers,body:Buffer.concat(event.body)})).status,200);
 assert.equal((await fetch(base+'/api/whatsapp/inbox')).status,401);
 const setup=await fetch(base+'/api/auth/setup',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({name:'Admin de teste',email:'whatsapp@example.test',password:'Secret-local-only-2026!'})});assert.equal(setup.status,201);const cookie=setup.headers.get('set-cookie').split(';')[0];
 const inbox=await fetch(base+'/api/whatsapp/inbox',{headers:{Cookie:cookie}});assert.equal(inbox.status,200);assert.equal((await inbox.json()).events.length,1);
 assert.equal((await fetch(base+'/api/whatsapp/connection/test',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{}'})).status,403);
});
