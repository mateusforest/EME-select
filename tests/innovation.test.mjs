import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {innovationInput} from '../server/innovation.mjs';
import {attachLocalInnovation} from '../server/innovation-local.mjs';
import {attachCloudInnovation} from '../server/cloud/innovation.mjs';
import {internalKinds,propertyRecordsQuery} from '../shared/portal-content.mjs';
import {analyticsInput} from '../server/analytics.mjs';
import http from 'node:http';
import {createPortalApi} from '../server/portal-api.mjs';
const entry=()=>({requestId:randomUUID(),name:'Teste de integração',email:'teste@example.com',front:'Outra possibilidade',idea:'Uma apresentação de teste para validar o recebimento privado das ideias.',url:'https://example.com/apresentacao',consent:true});
const request=(method='POST',url='/api/public/innovation')=>({method,url,headers:{},socket:{remoteAddress:'127.0.0.1'}});
test('rejects absent consent, invalid fronts, extra permissions and unsafe presentation URLs',()=>{
 for(const change of [{consent:false},{email:'inválido'},{front:'administrador'},{idea:'curta'},{url:'javascript:alert(1)'},{url:'https://user:password@example.com'},{role:'admin'}])assert.throws(()=>innovationInput({...entry(),...change}),{status:400});
 assert.equal(innovationInput({...entry(),url:''}).url,'');
});
test('local receipt is private, idempotent, versioned and removable without retaining contact data',async()=>{
 const db=new DatabaseSync(':memory:'),audit=[],api=attachLocalInnovation({db,transaction:fn=>fn(),consume:()=>{},audit:(...args)=>audit.push(args)});
 try{
  let response;const send=(status,value)=>response={status,value};const input=entry(),req=request();
  await api.publicHandle('/api/public/innovation',req,input,send);assert.deepEqual(response,{status:201,value:{reference:input.requestId}});
  await api.publicHandle('/api/public/innovation',req,input,send);assert.equal(db.prepare('SELECT count(*) AS n FROM innovation_submissions').get().n,1);
  await assert.rejects(api.publicHandle('/api/public/innovation',req,{...input,name:'Outro nome'},send),{status:409});
  await assert.rejects(api.publicHandle('/api/public/innovation',request('GET'),null,send),{status:405});
  await assert.rejects(api.handle('/api/innovation',request('GET','/api/innovation'),{role:'corretor'},null,send),{status:403});
  const admin={id:randomUUID(),role:'admin'};
  await api.handle('/api/innovation',request('GET','/api/innovation'),admin,null,send);assert.equal(response.value.ideas[0].email,input.email);
  const endpoint='/api/innovation/'+input.requestId;
  await api.handle(endpoint,request('PATCH',endpoint),admin,{version:1,status:'reviewing'},send);
  await assert.rejects(api.handle(endpoint,request('PATCH',endpoint),admin,{version:1,status:'archived'},send),{status:409});
  await api.handle(endpoint,request('PATCH',endpoint),admin,{version:2,status:'deleted'},send);
  const stored=db.prepare('SELECT data FROM innovation_submissions').get().data;assert.equal(stored.includes(input.email),false);assert.equal(stored.includes(input.idea),false);
  await api.handle('/api/innovation',request('GET','/api/innovation'),admin,null,send);assert.equal(response.value.ideas.length,0);assert.equal(audit.length,2);
 }finally{db.close();}
});
test('cloud receipt uses private internal records and rate limits, with safe duplicate retries',async()=>{
 const rows=new Map(),limits=[];const client={rpc:async(name,args)=>{limits.push([name,args]);},rest:async(query,method,body)=>{
  if(query.startsWith('eme_profiles?'))return [{id:'admin'}];
  if(query==='eme_cases'&&method==='POST'){rows.set(body.id,{...body,version:1});return [body];}
  if(query.startsWith('eme_cases?id=eq.'))return rows.has(query.slice(16,52))?[rows.get(query.slice(16,52))]:[];
  throw Error('Unexpected query '+query);
 }};
 const api=attachCloudInnovation({client,save:async()=>{}}),input=entry();let result;
 await api.publicHandle('/api/public/innovation',request(),input,(status,value)=>result=value);
 await api.publicHandle('/api/public/innovation',request(),input,()=>{});
 assert.equal(rows.size,1);assert.deepEqual(result,{reference:input.requestId});assert.equal(limits.length,4);
 assert.equal([...rows.values()][0].data.kind,'innovation_submission');
 assert.ok(internalKinds.includes('innovation_submission'));assert.ok(propertyRecordsQuery.includes('innovation_submission'));
});
test('analytics accepts innovation navigation without collecting idea or contact text',()=>{
 const data=analyticsInput({session:randomUUID(),events:[{id:randomUUID(),type:'page_view',page:'innovation',email:'private@example.com'},{id:randomUUID(),type:'section_click',page:'innovation',section:'ideas',idea:'private content'}]});
 assert.equal(JSON.stringify(data).includes('private'),false);
});
test('HTTP receipt reaches the administrative inbox and never the public catalogue',async t=>{
 const api=createPortalApi({dbPath:':memory:',env:{}}),server=http.createServer((req,res)=>api.handle(req,res));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));api.close();});
 const origin='http://127.0.0.1:'+server.address().port;
 const call=(path,method='GET',body,cookie='')=>fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})});
 const input=entry(),sent=await call('/public/innovation','POST',input);assert.equal(sent.status,201);assert.equal((await sent.json()).reference,input.requestId);
 assert.equal((await call('/innovation')).status,401);
 const setup=await call('/auth/setup','POST',{name:'Admin local',email:'admin@example.test',password:randomUUID()+'aA!'});assert.equal(setup.status,201);
 const cookie=setup.headers.get('set-cookie').split(';')[0],inbox=await call('/innovation','GET',null,cookie);assert.equal(inbox.status,200);assert.equal((await inbox.json()).ideas[0].email,input.email);
 const catalogue=await call('/public/properties');assert.equal(JSON.stringify(await catalogue.json()).includes(input.email),false);
 assert.equal((await call('/evaluations','GET',null,cookie).then(r=>r.json())).evaluations.length,0);
});
