import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogDefaults,catalogFromQuery,catalogHash,selectCatalog} from '../src/experience/catalog.js';
const regions=[{id:'vacaria',stateId:'rs'},{id:'praia-de-palmas',stateId:'sc'}];
const properties=[
 {id:'house',title:'Casa com pátio',description:'Sala com lareira',type:'Casa',group:'Casa',location:'Jardim América · Vacaria, RS',regionId:'vacaria',operation:'comprar',area:170,bedrooms:3,parking:2,searchFacts:{price:1690000}},
 {id:'flat',title:'Apartamento',description:'Sala integrada',type:'Apartamento',group:'Apartamento',location:'Vacaria, RS',regionId:'vacaria',operation:'comprar',area:71,bedrooms:3,parking:1,searchFacts:{price:370000}},
 {id:'shop',title:'Sala comercial',type:'Sala comercial',group:'Comercial',location:'Praia de Palmas, SC',regionId:'praia-de-palmas',operation:'alugar',area:45,searchFacts:{price:2000}},
 {id:'unknown',title:'Casa',type:'Casa',group:'Casa',location:'Vacaria, RS',regionId:'vacaria',operation:'comprar',searchFacts:{price:200000}}
];
const select=extra=>selectCatalog(properties,{...catalogDefaults,...extra},new Set(['flat']),regions).map(p=>p.id);
test('all filters combine without accepting missing measurements',()=>assert.deepEqual(select({q:'patio lareira',state:'rs',region:'vacaria',type:'Casa',min:'1000000',max:'1700000',area:'100',beds:'3',parking:'2',operation:'comprar'}),['house']));
test('commercial group, purpose and state use live inventory fields',()=>assert.deepEqual(select({state:'sc',type:'Comercial',operation:'alugar'}),['shop']));
test('favorites and price ordering do not mutate original collection',()=>{assert.deepEqual(select({saved:true}),['flat']);assert.deepEqual(select({sort:'price-asc'}),['shop','unknown','flat','house']);assert.equal(properties[0].id,'house');});
test('empty results do not relax filters or include unknown areas',()=>{assert.deepEqual(select({max:'1000'}),[]);assert.deepEqual(select({type:'Casa',area:'1',max:'500000'}),[]);});
test('shared URL round-trips combined search and favorites',()=>{const filters={...catalogDefaults,q:'pátio & jardim',type:'Casa',min:'0',max:'1690000',region:'vacaria',saved:true,sort:'area-desc'};assert.deepEqual(catalogFromQuery(catalogHash(filters).split('?')[1]),filters);assert.equal(catalogHash(catalogDefaults),'#/colecao');});
test('invalid URL values cannot inject numbers or sorting behavior',()=>{const value=catalogFromQuery('min=-1&max=NaN&area=Infinity&quartos=x&ordem=evil&finalidade=evil');assert.equal(value.min,'');assert.equal(value.max,'');assert.equal(value.area,'');assert.equal(value.sort,'selection');assert.equal(value.operation,'');});
