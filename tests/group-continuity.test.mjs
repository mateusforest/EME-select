import test from 'node:test';import assert from 'node:assert/strict';
import {advanceChannel} from '../server/cloud/unified-channel.mjs';
test('initial photo is retained and a question cannot become the property title',async()=>{
 let state={},received=0,saved=0;const u={id:'actor',name:'Mateus'};
 const tools={actor:async()=>u,receiveMaterial:async()=>{received++;return {id:'photo',filename:'foto.webp'};},materials:async()=>[],execute:async()=>{saved++;}};
 const ai={channelFieldHelp:async()=>({reply:'Sugiro um título provisório: Imóvel em destaque.',suggestedTitle:'Imóvel em destaque'})};
 const send=async(text,media)=>{const r=await advanceChannel({state,phone:'555499902688',text,event:'test',tools,ai,media,support:async()=>({reply:''})});state=r.state;return r.result;};
 await send('cadastre esse imovel no portal',{mime:'image/webp',content:'test'});assert.equal(received,1);assert.deepEqual(state.flow.materialIds,['photo']);
 const reply=await send('Qual tua sugestão?');assert.match(reply.reply,/Sugiro/);assert.equal(state.flow.values.title,undefined);assert.equal(state.flow.step,0);
 await send('SIM');assert.equal(state.flow.values.title,'Imóvel em destaque');assert.equal(state.flow.step,1);assert.equal(saved,0);
});
