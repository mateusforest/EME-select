import test from 'node:test';import assert from 'node:assert/strict';import sharp from 'sharp';import {decodeMaterial,propertyDraft,attachChannelMaterials} from '../server/cloud/channel-materials.mjs';import {advanceChannel} from '../server/cloud/unified-channel.mjs';
test('material formats validated by content, converted images, private downloads checked',async()=>{
 const bytes=await sharp({create:{width:800,height:600,channels:3,background:'#123456'}}).png().toBuffer();const image=await decodeMaterial({mime:'image/png',name:'foto.png',content:bytes.toString('base64')});assert.equal(image.mime_type,'image/webp');assert.equal(image.metadata.width,800);
 await assert.rejects(decodeMaterial({mime:'image/jpeg',content:Buffer.from('not an image').toString('base64')}),/imagem/);await assert.rejects(decodeMaterial({mime:'application/pdf',content:Buffer.from('not pdf').toString('base64')}),/PDF/);await assert.rejects(decodeMaterial({mime:'application/octet-stream',content:'YWJj'}),/Formato/);await assert.rejects(decodeMaterial({mime:'text/plain',content:Buffer.alloc(2000001,65).toString('base64')}),/2 MB/);
 assert.equal(propertyDraft({title:'Casa',city:'Vacaria',type:'Casa',operation:'Venda',owner:'',extracted:{price:450000,bedrooms:3}}).price,450000);
 const endpoint=attachChannelMaterials({client:{rest:()=>{throw Error('must not read');}},caseFor:async()=>{throw Object.assign(Error('Forbidden'),{status:403});}});
 await assert.rejects(endpoint.handle('/api/listings/00000000-0000-4000-8000-000000000001/whatsapp-materials',{method:'GET'},{},{role:'corretor'},()=>{}),e=>e.status===403);
});
test('numbered registration, long text extraction, media, review and explicit confirmation',async()=>{
 const u={id:'user',name:'User',active:true,role:'admin'};let state={},saved=0,received=0;const tools={actor:async()=>u,materials:async()=>[],receiveMaterial:async()=>({id:'file',filename:'foto.webp'}),prepare:async()=>({}),execute:async()=>{saved++;return {reference:'property'};},discard:async()=>{}};
 const ai={channelCapture:async()=>({result:{fields:[{key:'title',value:'Casa de teste'},{key:'city',value:'Vacaria'},{key:'price',value:'450000'},{key:'bedrooms',value:'3'}],pending:[]}})};
 const send=async(text,media)=>{const r=await advanceChannel({state,phone:'555499902688',text,event:'e'+received++,tools,ai,support:async()=>({reply:''}),media});state=r.state;return r.result;};
 await send('CADASTRO');await send('1');assert.equal(state.flow.kind,'property');await send('Tipo: casa\nFinalidade: venda\nCidade: Vacaria\nValor: 450 mil. Informações completas do imóvel.');assert.equal(state.flow.values.extracted.price,450000);assert.equal(state.flow.step,4);await send('PULAR');assert.equal(state.flow.materialsOpen,true);
 await send('[Arquivo recebido]',{mime:'image/png'});assert.deepEqual(state.flow.materialIds,['file']);await send('1');assert.equal(state.flow.confirm,true);assert.equal(saved,0);await send('[Arquivo recebido]',{mime:'image/png'});assert.equal(state.flow.confirm,false);await send('1');await send('1');assert.equal(saved,1);assert.equal(state.flow,null);
});
import {propertyPrice,planSummary} from '../server/cloud/channel-tools.mjs';
test('property price accepts Brazilian currency and explicit unknown, and reaches listing draft',()=>{
 assert.equal(propertyPrice('R$ 450.000,50'),450000.5);assert.equal(propertyPrice('450 mil'),450000);assert.equal(propertyPrice('1,5 milhão'),1500000);assert.equal(propertyPrice('a definir'),null);assert.throws(()=>propertyPrice('-50'));assert.throws(()=>propertyPrice('zero'));
 assert.equal(propertyDraft({title:'Casa',city:'Vacaria',type:'Casa',operation:'Venda',price:450000}).price,450000);
 assert.match(planSummary({values:{price:450000}}),/450.000/);assert.match(planSummary({values:{price:null}}),/A definir/);
});
