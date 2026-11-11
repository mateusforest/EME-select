import test from 'node:test';
import assert from 'node:assert/strict';
import {validateGroupObservation,requestGroupObservation} from '../server/group-observer.mjs';
import {attachUnifiedChannel} from '../server/cloud/unified-channel.mjs';
const messages=[{id:'m1',phone:'555499902688',text:'Precisamos das fotos da casa para preparar o cadastro.'}];
test('observer keeps only sourced notes and suppresses claims of executing actions',()=>{
 const note={kind:'pendencia',summary:'Faltam fotos da casa.',sourceId:'m1',quote:'Precisamos das fotos da casa'};
 const result=validateGroupObservation({reply:'Cadastrei o imóvel.',notes:[note,{...note,sourceId:'invented'},{...note,quote:'A visita está confirmada'}]},messages);
 assert.equal(result.reply,'');assert.deepEqual(result.notes,[note]);
 assert.throws(()=>validateGroupObservation({reply:'https://example.com',notes:[]},messages));
});
test('observer provider call has no tools, does not store responses and treats conversation as data',async()=>{
 const fetcher=async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.tools,undefined);assert.match(body.instructions,/NÃO execute/);assert.equal(body.text.format.strict,true);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({reply:'Quem consegue separar as fotos?',notes:[]})}]}]})};};
 const result=await requestGroupObservation({apiKey:'test',model:'test-model',messages,fetcher});assert.match(result.reply,/fotos/);
});
test('observer endpoint never enters registration or private conversation persistence',async()=>{
 let observed=0;const client={rest:async path=>path.startsWith('eme_staff_wa_links')?[{user_id:'u'}]:[{id:'u',active:true,role:'corretor'}],rpc:async()=>{throw Error('Must not execute registrations');}};
 const bridge=attachUnifiedChannel({client,ai:{groupObservation:async()=>{observed++;return {reply:'',notes:[]};}},env:{EME_STAFF_WHATSAPP_ENABLED:'true',EME_STAFF_WHATSAPP_TOKEN:'x'.repeat(64)}}).bridge;
 const body={phone:'555499902688',sessionId:'eme-oficial-8029',groupId:'120363430024608861@g.us',messageId:'m1',text:'SIM',observe:true,messages,notes:[]};
 const req={method:'POST',headers:{authorization:'Bearer '+'x'.repeat(64)}};await bridge('/api/integrations/eme-channel/message',req,body,()=>{});assert.equal(observed,1);
 await assert.rejects(bridge('/api/integrations/eme-channel/message',req,{...body,messages:[{...messages[0],phone:'outsider'}]},()=>{}),e=>e.status===400);
});
