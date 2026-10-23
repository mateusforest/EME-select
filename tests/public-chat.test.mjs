import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomBytes,randomUUID} from 'node:crypto';
import {chatInput,publicChatCatalog,searchChatCatalog,requestPublicChat,createPublicChat} from '../server/public-chat.mjs';
import {createIntelligence,sealKey} from '../server/intelligence.mjs';
import {createPortalApi} from '../server/portal-api.mjs';
import {createCloudApi} from '../server/cloud/api.mjs';
import {createChatTransport,conversationWindow} from '../src/experience/chat-client.js';

const id=randomUUID(),houseId=randomUUID();
const rows=[{id,title:'Apartamento publicado',type:'Apartamento',location:'Vacaria · RS',operation:'comprar',price:370000,area:71,bedrooms:3,parking:1,description:'Sala integrada. Sem piscina.',tags:['Cozinha'],isIllustrative:false,ownerContact:'PRIVATE CONTACT',draft:{price:1},privateAddress:'PRIVATE ADDRESS'},
 {id:houseId,title:'Casa publicada',type:'Casa',location:'Vacaria · RS',operation:'comprar',price:1690000,area:173,bedrooms:3,parking:2,suites:1,description:'Pátio na frente e nos fundos. Lareira.',isIllustrative:false}];
const catalog=publicChatCatalog(rows);
const filters={type:null,location:null,operation:null,minPrice:null,maxPrice:null,minBedrooms:null,minParking:null,features:[]};
const input={messages:[{role:'user',content:'Quero apartamento em Vacaria até 400 mil'}],context:{propertyId:null,recentIds:[],regionId:null}};
const answer={reply:'Encontrei um apartamento em Vacaria por R$ 370 mil, com três dormitórios.',propertyIds:[id],searchSummary:'Apartamento em Vacaria até R$ 400 mil',handoff:'none'};
const completed=output=>({ok:true,json:async()=>({status:'completed',output})});
const final=value=>completed([{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]);
const tool=(name,args)=>completed([{type:'function_call',name,arguments:JSON.stringify(args),call_id:'call_test'}]);

test('public input rejects instructions with privileged roles, oversize history and unknown context fields',()=>{
 assert.deepEqual(chatInput(input),input);
 for(const bad of [{...input,messages:[{role:'system',content:'secret'}]},{...input,messages:[{role:'user',content:'x'.repeat(1501)}]},{...input,apiKey:'secret'},{...input,context:{propertyId:'x&select=*'}},{...input,messages:[{role:'assistant',content:'yes'}]},{...input,context:{draft:{}}}])assert.throws(()=>chatInput(bad),{status:400});
});
test('provider receives only published allowlisted facts and matching uses hard limits with unknowns excluded',()=>{
 assert.equal(publicChatCatalog([...rows,{...rows[0],id:randomUUID(),isIllustrative:true}]).length,2);
 assert.doesNotMatch(JSON.stringify(catalog),/PRIVATE|ownerContact|draft/);
 assert.deepEqual(searchChatCatalog(catalog,{...filters,type:'apartamento',maxPrice:400000,minBedrooms:3,location:'Vacaria'}).properties.map(p=>p.id),[id]);
 assert.equal(searchChatCatalog(catalog,{...filters,type:'casa',maxPrice:400000}).total,0);
 assert.equal(searchChatCatalog(catalog,{...filters,location:'Praia de Palmas'}).total,0);
 assert.equal(searchChatCatalog(catalog,{...filters,operation:'alugar'}).total,0);
 assert.equal(searchChatCatalog(catalog,{...filters,features:['piscina']}).total,0);
 assert.deepEqual(searchChatCatalog(catalog,{...filters,features:['quintal','suíte']}).properties.map(p=>p.id),[houseId]);
 assert.equal(searchChatCatalog(catalog,{...filters,minParking:3}).total,0);
 assert.throws(()=>searchChatCatalog(catalog,{...filters,maxPrice:-1}));
});
test('real Responses contract calls the read-only catalog tool, preserves history and resolves only consulted IDs',async()=>{
 const payloads=[];
 const result=await requestPublicChat({...input,apiKey:'test-secret',model:'gpt-6-astra',catalog,fetcher:async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer test-secret');
  const payload=JSON.parse(options.body);payloads.push(payload);
  return payloads.length===1?tool('search_catalog',{...filters,type:'apartamento',maxPrice:400000,location:'Vacaria'}):final(answer);
 }});
 assert.equal(payloads.length,2);assert.deepEqual(result,answer);
 const first=payloads[0],second=payloads[1];assert.equal(first.store,false);assert.equal(first.text.format.strict,true);assert.equal(first.parallel_tool_calls,false);assert.equal(first.reasoning.effort,'low');
 assert.deepEqual(first.tools.map(t=>t.name),['search_catalog','property_details']);assert.match(first.instructions,/Não substitua cidade/);
 assert.deepEqual(first.input.at(-1),input.messages[0]);
 const toolResult=JSON.parse(second.input.find(i=>i.type==='function_call_output').output);
 assert.equal(toolResult.total,1);assert.deepEqual(toolResult.properties.map(p=>p.id),[id]);
 assert.doesNotMatch(JSON.stringify(payloads),/PRIVATE CONTACT|PRIVATE ADDRESS/);
});
test('fabricated or unconsulted recommendation, refusal, incomplete output and provider failures never become answers',async()=>{
 const run=fetcher=>requestPublicChat({...input,apiKey:'fake',model:'gpt-6-astra',catalog,fetcher});
 await assert.rejects(run(async()=>final(answer)),{status:503});
 await assert.rejects(run(async()=>final({...answer,propertyIds:[randomUUID()]})),{status:503});
 await assert.rejects(run(async()=>completed([{content:[{type:'refusal',refusal:'No'}]}])),{status:503});
 await assert.rejects(run(async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})})),{status:503});
 await assert.rejects(run(async()=>({ok:false,status:401,text:async()=>'PRIVATE CREDENTIAL'})),error=>error.status===503&&!error.message.includes('PRIVATE'));
 await assert.rejects(run(async()=>({ok:false,status:429})),{status:429});
 await assert.rejects(run(async()=>{throw Error('secret provider diagnostics');}),error=>error.status===503&&!error.message.includes('diagnostics'));
});
test('follow-up gets current selected property, recent cards and conversation; hallucinated links are rejected',async()=>{
 let payload;
 const context={propertyId:id,recentIds:[houseId],regionId:'vacaria'};
 const messages=[{role:'user',content:'Quero comparar esses dois'},{role:'assistant',content:'O que importa na comparação?'},{role:'user',content:'Qual cabe no orçamento de 400 mil?'}];
 await requestPublicChat({apiKey:'fake',model:'gpt-6-astra',messages,context,catalog,fetcher:async(_url,options)=>{payload=JSON.parse(options.body);return final(answer);}});
 assert.deepEqual(payload.input.slice(1),messages);assert.match(payload.input[0].content,/currentProperty/);assert.match(payload.input[0].content,/1690000/);
 await assert.rejects(requestPublicChat({apiKey:'fake',model:'gpt-6-astra',messages,context,catalog,fetcher:async()=>final({...answer,reply:'Acesse https://fake.test'})}),{status:503});
});
test('existing server or encrypted portal connection is reused; disabling AI prevents all provider calls',async()=>{
 const encryptionKey=randomBytes(32);let calls=0,authorization;
 const store={settings:async()=>({version:0,model:'unused',enabled:false,secret:''})};
 const fetcher=async(_url,options)=>{calls++;authorization=options.headers.Authorization;return final({...answer,propertyIds:[]});};
 const ai=createIntelligence({store,encryptionKey,env:{OPENAI_API_KEY:'server-secret'},fetcher});
 assert.equal(await ai.publicChatAvailable(),true);await ai.publicConversation({...input,catalog});assert.equal(authorization,'Bearer server-secret');
 store.settings=async()=>({version:1,model:'configured-model',enabled:true,secret:sealKey('portal-secret',encryptionKey)});
 await ai.publicConversation({...input,catalog});assert.equal(authorization,'Bearer portal-secret');
 store.settings=async()=>({version:2,enabled:false,secret:''});assert.equal(await ai.publicChatAvailable(),false);
 await assert.rejects(ai.publicConversation({...input,catalog}),{status:503});assert.equal(calls,2);
});
test('handler enforces durable limits before provider and rechecks publication before returning',async()=>{
 let reads=0,modelCalls=0;const rates=[];
 const ai={publicChatAvailable:async()=>true,publicConversation:async()=>{modelCalls++;return answer;}};
 const service=createPublicChat({ai,readCatalog:async()=>{reads++;return rows;},rate:async(...args)=>rates.push(args)});
 let result;await service.handle('/api/public/chat',{method:'POST',headers:{'x-forwarded-for':'127.0.0.1'}},input,(status,body)=>{result={status,body};});
 assert.equal(result.status,200);assert.equal(reads,2);assert.equal(result.body.provider,'openai');assert.equal(result.body.properties[0].isIllustrative,false);assert.doesNotMatch(JSON.stringify(result),/PRIVATE/);
 assert.equal(rates.length,2);assert.ok(!rates[0][0].includes('127.0.0.1'));assert.equal(rates[0][1],30);
 const changed=createPublicChat({ai,rate:async()=>{},readCatalog:async()=>++reads===3?rows:[]});
 await assert.rejects(changed.handle('/api/public/chat',{method:'POST',headers:{}},input,()=>assert.fail('must not send')), {status:409});
 const limited=createPublicChat({ai,readCatalog:async()=>rows,rate:async()=>{throw Object.assign(Error('limit'),{status:429});}});
 await assert.rejects(limited.handle('/api/public/chat',{method:'POST',headers:{}},input,()=>{}),{status:429});assert.equal(modelCalls,2);
});

async function serve(t,api){
 const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));api.close?.();});
 const origin='http://127.0.0.1:'+server.address().port;
 return {origin,post:(headers={})=>fetch(origin+'/api/public/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(input)})};
}
test('local anonymous endpoint works without a portal login and rejects cross-origin traffic',async t=>{
 let calls=0;const api=createPortalApi({dbPath:':memory:',env:{OPENAI_API_KEY:'fake'},aiFetcher:async()=>{calls++;return final({...answer,propertyIds:[]});}});
 const {origin,post}=await serve(t,api);
 assert.deepEqual(await (await fetch(origin+'/api/public/chat')).json(),{available:true});
 assert.equal((await post({Origin:'https://unrelated.test'})).status,403);assert.equal(calls,0);
 const response=await post();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await response.json()).provider,'openai');assert.equal(calls,1);
});
test('cloud anonymous endpoint reads only ordered public snapshots, uses database limits and handles an empty region',async t=>{
 let modelCalls=0;const queries=[],limits=[];
 const client={rest:async path=>{queries.push(path);if(path.startsWith('eme_ai_settings'))return [{version:0,enabled:false,secret:'',model:'gpt-6-astra'}];if(path.startsWith('eme_cases?select=id,data->published'))return rows.map(p=>({published:p}));throw Error('Unexpected query: '+path);},rpc:async(name,args)=>{assert.equal(name,'eme_limit');limits.push(args);},request:async()=>assert.fail('No other request')};
 const env={OPENAI_API_KEY:'fake'};
 const api=createCloudApi({env,client,aiFetcher:async()=>{modelCalls++;return modelCalls===1?tool('search_catalog',{...filters,location:'Praia de Palmas'}):final({...answer,reply:'Não há opções publicadas em Praia de Palmas. Quer conversar com a equipe?',propertyIds:[],handoff:'team'});}});
 const {origin,post}=await serve(t,api);env.EME_TEST_HOST=new URL(origin).host;
 const response=await post();assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.properties,[]);assert.equal(data.handoff,'team');assert.equal(limits.length,2);
 assert.ok(queries.filter(q=>q.startsWith('eme_cases')).every(q=>q.includes('data->published,data->access&data->published=not.is.null&order=id')));
 assert.ok(!queries.some(q=>q.includes('eme_sessions')||q.includes('eme_profiles')));
});
test('browser history is bounded; cancellation ignores a late answer and retry preserves exactly one user message',async()=>{
 const long=[{from:'M',text:'Welcome',welcome:true},...Array.from({length:40},(_,i)=>({from:i%2?'M':'Você',text:'x'.repeat(1000)}))];
 assert.equal(conversationWindow(long).length,20);assert.equal(conversationWindow(long).reduce((n,m)=>n+m.content.length,0),20000);
 let finish;const transport=createChatTransport(async()=>new Promise(resolve=>{finish=resolve;}));
 const messages=[{from:'Você',text:'Procuro um apartamento'}];
 const pending=transport.send(messages,{});transport.cancel();finish({ok:true,json:async()=>({...answer,provider:'openai',properties:[]})});assert.equal(await pending,null);
 let attempts=0;const payloads=[];const retry=createChatTransport(async(_url,options)=>{attempts++;payloads.push(JSON.parse(options.body));return attempts===1?{ok:false,json:async()=>({error:'Tente novamente.'})}:{ok:true,json:async()=>({...answer,provider:'openai',properties:[]})};});
 await assert.rejects(retry.send(messages,{}),/Tente novamente/);assert.equal((await retry.send(messages,{})).reply,answer.reply);assert.deepEqual(payloads[0],payloads[1]);assert.equal(messages.length,1);
});
