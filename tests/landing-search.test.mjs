import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedSearch,propertyPhotos} from '../src/landing/published-search.mjs';
const home={id:'one',isIllustrative:false,type:'Casa',location:'Jardim América · Vacaria',price:1690000,area:173.1,bedrooms:3,parking:2,operation:'comprar',locationProfile:'bairro',tags:[],description:'Sala integrada'};
const search=(properties,criteria=[],unverified=[])=>publishedSearch(properties,{criteria,unverified});
test('only public nonillustrative listings are eligible',()=>{assert.deepEqual(search([home,{...home,id:'demo',isIllustrative:true}],['Casas']).matches.map(p=>p.id),['one']);});
test('combines type, location, budget and bedroom requirements',()=>{
 assert.equal(search([home],['Casas'],['Localização: Vacaria','Até R$ 2.000.000','3 quartos']).matches.length,1);
 for(const constraint of ['Localização: Torres','Até R$ 1.000.000','4 quartos','Aluguel'])assert.equal(search([home],['Casas'],[constraint]).matches.length,0,constraint);
});
test('commercial subtypes do not return houses or other commercial uses',()=>{
 const stock=[home,{...home,id:'shop',type:'Loja'},{...home,id:'office',type:'Sala comercial'}];
 assert.deepEqual(search(stock,['Comercial','Loja']).matches.map(p=>p.id),['shop']);
});
test('honors excluded types, excluded cities and condominium scope',()=>{
 assert.equal(search([home],['Excluir: casas']).matches.length,0);
 assert.equal(search([home],['Casas'],['Excluir localização: Vacaria']).matches.length,0);
 assert.equal(search([home],['Casas','Em condomínio']).matches.length,0);
 assert.equal(search([{...home,locationProfile:'condominio'}],['Casas','Em condomínio']).matches.length,1);
});
test('missing numerical data never satisfies a numerical requirement',()=>{
 assert.equal(search([{...home,bedrooms:null}],['Casas'],['3 quartos']).matches.length,0);
 assert.equal(search([{...home,price:null}],['Casas'],['Até R$ 2.000.000']).matches.length,0);
});
test('unsupported preferences stay explicit instead of fabricating matches',()=>{
 const result=search([home],['Casas'],['Com piscina']);assert.deepEqual(result.pending,['Com piscina']);
 assert.equal(search([home],[],[]).understood,false);
});
test('public gallery selects facade and rejects arbitrary URLs',()=>{
 const photos=propertyPhotos({...home,images:[{url:'/api/photos/111-aaa',caption:'lavanderia'},{url:'javascript:alert(1)',caption:'fachada'},{url:'/api/photos/222-bbb',caption:'Fachada'}]});
 assert.deepEqual(photos.map(p=>p.url),['/api/photos/222-bbb','/api/photos/111-aaa']);
});
