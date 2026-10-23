import test from 'node:test';
import assert from 'node:assert/strict';
import {opportunityDefaults,opportunitiesFromQuery,opportunitiesHash,selectOpportunities} from '../src/experience/opportunities.js';

const properties=[
 {id:'house',type:'Casa',group:'Casa',regionId:'vacaria',operation:'comprar',searchFacts:{price:1000000}},
 {id:'apartment',type:'Apartamento',group:'Apartamento',regionId:'vacaria',operation:'comprar',searchFacts:{price:370000}},
 {id:'office',type:'Sala comercial',group:'Comercial',regionId:'praia-de-palmas',operation:'alugar',searchFacts:{price:2500}}
];

test('shared and return links preserve opportunity filters, order and commercial groups',()=>{
 const filters={type:'Comercial',region:'praia-de-palmas',sort:'price-asc'};
 const hash=opportunitiesHash(filters);
 assert.match(hash,/^#\/oportunidades\?/);
 const restored=opportunitiesFromQuery(hash.split('?')[1]);
 assert.deepEqual(restored,filters);
 assert.deepEqual(selectOpportunities(properties,restored).map(p=>p.id),['office']);
});
test('selection ordering remains stable and value sorting does not change the source inventory',()=>{
 assert.deepEqual(selectOpportunities(properties,opportunityDefaults).map(p=>p.id),['house','apartment','office']);
 assert.deepEqual(selectOpportunities(properties,{...opportunityDefaults,region:'vacaria',sort:'price-asc'}).map(p=>p.id),['apartment','house']);
 assert.deepEqual(properties.map(p=>p.id),['house','apartment','office']);
});
test('empty or unmatched inventory never produces a substitute offer',()=>{
 assert.deepEqual(selectOpportunities([],opportunityDefaults),[]);
 assert.deepEqual(selectOpportunities(properties,{...opportunityDefaults,type:'Terreno'}),[]);
});
test('links omit defaults and cannot smuggle unrelated catalog filters into opportunities',()=>{
 assert.equal(opportunitiesHash(opportunityDefaults),'#/oportunidades');
 assert.deepEqual(opportunitiesFromQuery('min=999999999&salvos=1&ordem=unknown'),opportunityDefaults);
});
