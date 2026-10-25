import test from 'node:test';
import assert from 'node:assert/strict';
import {searchFilters} from '../src/experience/search-query.js';
import {selectCatalog,catalogHash,catalogFromQuery} from '../src/experience/catalog.js';
const regions=[{id:'vacaria',name:'Vacaria',stateId:'rs'},{id:'praia-de-palmas',name:'Praia de Palmas',stateId:'sc'}];
test('spoken greeting becomes property criteria, not a literal full-text phrase',()=>{
 const filters=searchFilters('Oi tudo bem Eu preciso de uma casa em Vacaria',regions);
 assert.equal(filters.q,'');assert.equal(filters.type,'Casa');assert.equal(filters.region,'vacaria');
 const items=[{id:'a',type:'Casa',regionId:'vacaria',searchFacts:{price:700000}},{id:'b',type:'Apartamento',regionId:'vacaria',searchFacts:{price:400000}}];assert.deepEqual(selectCatalog(items,filters).map(p=>p.id),['a']);
});
test('budget, rooms, purpose and features survive spoken search and URL reload',()=>{
 const filters=searchFilters('Quero comprar uma casa em Vacaria até 1,5 milhão com 3 quartos e 2 vagas com piscina',regions);
 assert.equal(filters.max,'1500000');assert.equal(filters.beds,'3');assert.equal(filters.parking,'2');assert.equal(filters.q,'piscina');assert.equal(filters.operation,'comprar');
 assert.deepEqual(catalogFromQuery(catalogHash(filters).split('?')[1]),filters);
 assert.equal(searchFilters('Apartamento até 400 mil',regions).max,'400000');
 assert.equal(searchFilters('Casa até R$ 800.000',regions).max,'800000');
 assert.equal(searchFilters('terreno em cidade inexistente',regions).q,'cidade inexistente');
});
