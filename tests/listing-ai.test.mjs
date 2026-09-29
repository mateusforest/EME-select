import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {randomBytes,randomUUID} from 'node:crypto';
import {requestListingPreparation,validateListingPreparation} from '../server/listing-ai.mjs';
import {createIntelligence} from '../server/intelligence.mjs';
const ids=[randomUUID(),randomUUID()];
const result=()=>({summary:'Fotos organizadas para revisão.',description:'Casa com cozinha e área social registradas nas fotografias. A apresentação reúne os ambientes identificados para conhecer o imóvel.',features:['Cozinha'],highlights:['Área social'],pending:['Conferir informações com o responsável.'],photos:[{id:ids[1],room:'Área social',caption:'Sala de estar',observation:''},{id:ids[0],room:'Cozinha',caption:'Cozinha',observation:''}]});
test('vision sends every actual image and validates complete ordered results',async()=>{
 const bytes=await sharp({create:{width:870,height:652,channels:3,background:'#445544'}}).png().toBuffer();let payload;
 const photos=ids.map(id=>({id,bytes}));
 const answer=await requestListingPreparation({apiKey:'test',model:'gpt-6-astra',property:{title:'Casa'},photos,fetcher:async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result())}]}]})};}});
 assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);assert.equal(payload.tools,undefined);
 const content=payload.input[0].content,images=content.filter(c=>c.type==='input_image');assert.equal(images.length,2);
 for(const image of images){const meta=await sharp(Buffer.from(image.image_url.split(',')[1],'base64')).metadata();assert.equal(meta.width,870);assert.equal(meta.format,'jpeg');assert.equal(meta.exif,undefined);}
 assert.deepEqual(answer.result.photos.map(p=>p.id),[ids[1],ids[0]]);assert.equal(answer.result.recommendation,'acao_sugerida');
 for(const photos of [[result().photos[0]], [result().photos[0],result().photos[0]], [{...result().photos[0],id:randomUUID()},result().photos[1]]])assert.throws(()=>validateListingPreparation({...result(),photos},ids.map(id=>({id}))),/galeria original/);
 await assert.rejects(requestListingPreparation({apiKey:'test',model:'x',property:{},photos,fetcher:async()=>({ok:false,status:429})}),/limite de uso/);
});
test('preparation is scoped, recorded and stale results are not approval',async()=>{
 const bytes=await sharp({create:{width:600,height:400,channels:3,background:'#aaa'}}).png().toBuffer();
 const user={id:randomUUID(),role:'admin'},caseId=randomUUID(),requestId=randomUUID();let recorded,loaded=0,answer;
 const store={caseFor:async()=>({id:caseId,version:7,data:{title:'Casa',draft:{ownerName:'SECRET',privateAddress:'PRIVATE',description:''},photos:ids.map(id=>({id}))}}),find:async()=>null,settings:async()=>({version:0}),rate:async()=>{},begin:async()=>true,photoInputs:async(id,actor)=>{assert.equal(id,caseId);assert.equal(actor,user);loaded++;return ids.map(id=>({id,bytes}));},finish:async(req,u,id,data)=>{recorded={...data,id,stale:true};},runs:async()=>[recorded],properties:async()=>[]};
 const service=createIntelligence({store,encryptionKey:randomBytes(32),env:{OPENAI_API_KEY:'fake'},fetcher:async(url,opts)=>{assert.ok(!opts.body.includes('SECRET'));assert.ok(!opts.body.includes('PRIVATE'));return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result())}]}]})};}});
 const body={requestId,caseId,caseVersion:7,task:'atendimento',context:'',prepareListing:true};
 await service.handle('/api/intelligence/analyses',{method:'POST'},{},user,body,(status,value)=>{answer=value;});
 assert.equal(loaded,1);assert.equal(recorded.status,'completed');assert.equal(answer.runs[0].stale,true);assert.equal(recorded.result.recommendation,'acao_sugerida');
 await assert.rejects(service.handle('/api/intelligence/analyses',{method:'POST'},{},user,{...body,caseVersion:6},()=>{}),/mudou/);assert.equal(loaded,1);
 await assert.rejects(service.handle('/api/intelligence/analyses',{method:'POST'},{},user,{...body,task:'checklist'},()=>{}),/inválida/);
});
