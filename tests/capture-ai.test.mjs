import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {requestCapture,validateCapture} from '../server/capture-ai.mjs';
import {attachCloudIntelligence} from '../server/cloud/intelligence.mjs';
import {captureValue} from '../shared/capture.mjs';

const docId=randomUUID(),photoId=randomUUID();
const result=()=>({summary:'Dados encontrados nos materiais.',fields:[{key:'area',value:'152.5',sourceId:docId,reference:'Página 1, área privativa',confidence:'high'}],findings:[{status:'missing',title:'Data da certidão',detail:'Conferir a emissão e o escopo do documento.',sourceId:docId}],pending:['Conferência pela equipe.']});
const response=answer=>({ok:true,json:async()=>({id:'response-test',status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(answer)}]}]})});

test('capture sends selected PDF and images, keeps explicit references and never approves',async()=>{
 const bytes=await sharp({create:{width:1600,height:900,channels:3,background:'#345'}}).png().toBuffer();
 const documents=[{id:docId,filename:'matricula.pdf',mimeType:'application/pdf',contentBase64:Buffer.from('%PDF-1.4 test').toString('base64')}];
 let payload;
 const answer=await requestCapture({apiKey:'fake',model:'gpt-6-astra',property:{title:'Casa'},documents,photos:[{id:photoId,bytes}],context:'Relato de teste',fetcher:async(_url,options)=>{payload=JSON.parse(options.body);return response(result());}});
 assert.equal(payload.store,false);assert.equal(payload.tools,undefined);assert.equal(payload.text.format.strict,true);
 const contents=payload.input[0].content;
 assert.equal(contents.filter(c=>c.type==='input_file').length,1);assert.equal(contents.find(c=>c.type==='input_file').file_data,'data:application/pdf;base64,'+documents[0].contentBase64);
 const image=contents.find(c=>c.type==='input_image');const metadata=await sharp(Buffer.from(image.image_url.split(',')[1],'base64')).metadata();assert.equal(metadata.width,960);
 assert.equal(answer.result.kind,'capture');assert.equal(answer.result.recommendation,'acao_sugerida');assert.equal(captureValue('area',answer.result.fields[0].value),152.5);
 assert.match(payload.instructions,/nenhuma consulta externa/);assert.match(payload.instructions,/Não atribua nota/);
});

test('capture rejects foreign sources, numerical guesses from photos, invalid fields and malformed results',()=>{
 const docs=[{id:docId}],photos=[{id:photoId}];
 const invalid=[null,{...result(),fields:[null]},{...result(),fields:[{...result().fields[0],sourceId:randomUUID()}]},{...result(),fields:[{...result().fields[0],sourceId:'photo:'+photoId}]},{...result(),fields:[...result().fields,...result().fields]},{...result(),fields:[{...result().fields[0],key:'authorizationStatus',value:'Recebida'}]},{...result(),fields:[{...result().fields[0],value:'152,5'}]},{...result(),findings:[null]}];
 for(const value of invalid)assert.throws(()=>validateCapture(value,docs,photos),error=>error.status===502);
 assert.equal(validateCapture({...result(),published:true},docs,photos).published,undefined);
 for(const [key,value] of [['price','-1'],['bedrooms','2.5'],['yearBuilt','9999'],['ownerName','Pessoa privada']])assert.throws(()=>captureValue(key,value));
});

test('cloud capture scopes documents to the case and records results without changing the listing',async()=>{
 const caseId=randomUUID(),user={id:randomUUID(),role:'corretor'},runs=[];let payload,providerCalls=0,documentQueries=0,deny=false,missing=false;
 const client={request:async()=>{throw Error('No photo storage expected');},rest:async path=>{
  if(path.startsWith('eme_ai_settings?'))return [{version:0,enabled:true,model:'gpt-6-astra',secret:''}];
  if(path.startsWith('eme_operations_files?')){documentQueries++;assert.match(path,new RegExp('property_id=eq.'+caseId));assert.match(path,new RegExp('id=in.\\('+docId+'\\)'));return missing?[]:[{id:docId,filename:'material.pdf',mime_type:'application/pdf',content_base64:Buffer.from('%PDF-test').toString('base64')}];}
  if(path.startsWith('eme_ai_runs?select='))return runs.map(r=>({id:r.id,case_id:caseId,case_version:7,status:r.status,data:r}));
  if(path.startsWith('eme_ai_runs?id='))return [];
  if(path.startsWith('eme_cases?'))return [];
  throw Error(path);
 },rpc:async(name,body)=>{if(name==='eme_limit')return true;assert.equal(name,'eme_ai_write','extraction must never call the case mutation RPC');if(body.p_action==='begin')return {inserted:true};assert.equal(body.p_action,'finish');runs.unshift(body.p_data);}};
 const service=attachCloudIntelligence({client,hashOf:()=>'',caseFor:async(id,actor)=>{assert.equal(id,caseId);assert.equal(actor,user);if(deny)throw Object.assign(Error('Sem acesso'),{status:404});return {id:caseId,version:7,data:{draft:{title:'Casa',ownerName:'SECRET_OWNER',privateAddress:'SECRET_ADDRESS'},photos:[]}};},env:{OPENAI_API_KEY:'fake',EME_AI_ENCRYPTION_KEY:randomBytes(32).toString('hex')},fetcher:async(_url,options)=>{providerCalls++;payload=JSON.parse(options.body);return response(result());}});
 const input=()=>({requestId:randomUUID(),caseId,caseVersion:7,task:'documentos',capture:true,context:'',documentIds:[docId]});
 const handle=body=>service.handle('/api/intelligence/analyses',{method:'POST'},{},user,body,()=>{});
 await handle(input());assert.equal(providerCalls,1);assert.equal(runs[0].status,'completed');assert.equal(runs[0].result.fields[0].sourceId,docId);assert.ok(!JSON.stringify(payload).includes('SECRET_OWNER'));assert.ok(!JSON.stringify(payload).includes('SECRET_ADDRESS'));
 await assert.rejects(handle({...input(),caseVersion:6}),error=>error.status===409);
 await assert.rejects(handle({...input(),documentIds:[docId,docId]}),error=>error.status===400);
 deny=true;await assert.rejects(handle(input()),error=>error.status===404);assert.equal(documentQueries,1);deny=false;
 missing=true;await assert.rejects(handle(input()),error=>error.status===404);assert.equal(providerCalls,1);assert.equal(runs[0].status,'failed');
});
