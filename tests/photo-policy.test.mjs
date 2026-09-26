import test from 'node:test';
import assert from 'node:assert/strict';
import {PHOTO_MIN_LONG_EDGE,PHOTO_MIN_SHORT_EDGE,photoQualityIssue,photoPublicationIssues} from '../shared/photo-policy.mjs';
import {listingBlockers,publicProperty} from '../server/cloud/domain.mjs';

const valid={width:2000,height:1200,caption:'Sala com vista para o mar',room:'Área social'};
test('quality policy checks both edges and requires trustworthy decoded dimensions',()=>{
 assert.equal(PHOTO_MIN_LONG_EDGE,2000);assert.equal(PHOTO_MIN_SHORT_EDGE,1200);
 assert.equal(photoQualityIssue(valid),null);
 assert.equal(photoQualityIssue({width:1200,height:2000}),null);
 for(const size of [{width:1999,height:1200},{width:2000,height:1199},{width:870,height:652}])assert.match(photoQualityIssue(size),/2000 px.*1200 px/);
 for(const size of [{},{width:2000},{width:0,height:1200},{width:Infinity,height:1200},{width:2000,height:NaN},{width:2000.5,height:1200}])assert.match(photoQualityIssue(size),/verificar suas dimensões/);
});
test('publication requires caption, group and resolution while accepting uncropped portraits',()=>{
 assert.deepEqual(photoPublicationIssues([valid]),[]);
 assert.equal(photoPublicationIssues([]).length,1);
 assert.match(photoPublicationIssues([{...valid,caption:'  a  ',room:' '}]).join(' '),/3 caracteres.*grupo do percurso/);
 assert.deepEqual(photoPublicationIssues([{...valid,width:1200,height:2000}]),[]);
 assert.deepEqual(photoPublicationIssues([valid,{...valid,width:1200,height:2000}]),[]);
 assert.deepEqual(photoPublicationIssues([{...valid,width:2000,height:2000}]),[]);
 assert.ok(photoPublicationIssues([{caption:'Sala',room:'Área social'}]).some(message=>message.includes('dimensões')));
});
test('cloud publication also blocks small approved photos and exposes only presentation metadata',()=>{
 const draft={title:'Apartamento',type:'Apartamento',environment:'litoral',condominium:'',city:'Cidade · SC',neighborhood:'Centro',operation:'comprar',price:300000,area:116,description:'Descrição de referência com dados de teste para a validação editorial das fotografias do imóvel.',features:'Vista para o mar',reasons:'Ambientes integrados\nIluminação natural',privateAddress:'Dado privado'};
 const data={draft,stage:'Entrada aprovada',photos:[{...valid,id:'photo-test'}]};
 assert.deepEqual(listingBlockers(data),[]);
 assert.match(listingBlockers({...data,photos:[{...valid,width:870,height:652}]}).join(' '),/870 × 652/);
 assert.match(listingBlockers({...data,photos:[{caption:'Sala',room:'Área social'}]}).join(' '),/dimensões/);
 const result=publicProperty({id:'case-test',data:{...data,photos:[{...data.photos[0],privateSource:'confidential'}]}});
 assert.deepEqual(result.images,[{url:'/api/photos/photo-test',caption:valid.caption,room:valid.room,width:2000,height:1200}]);
 assert.equal(result.privateAddress,undefined);
});
