import test from 'node:test';import assert from 'node:assert/strict';
import {draft,curation,reviseCuration,decision,changed,listingBlockers,publicProperty} from '../server/cloud/domain.mjs';
const admin={name:'Equipe de teste',role:'admin'},broker={name:'Corretor de teste',role:'corretor'};
test('cloud curation cannot approve missing evidence or broker sign-offs',()=>{
 const data={stage:'Recebido'};const c=curation(data);assert.equal(c.score,null);
 assert.throws(()=>decision(data,{version:1,action:'submit',reason:'Revisão registrada pelo responsável.'},broker));
 const body={version:1,criteria:c.criteria.map(c=>({key:c.key,score:4,note:'Fonte e condição verificadas no teste.'})),checks:c.checks.map(c=>({key:c.key,state:'Conferido',note:'Fonte, data e escopo conferidos no teste.'})),pending:''};
 assert.throws(()=>reviseCuration(data,body,broker));let reviewed=reviseCuration(data,body,admin);assert.equal(curation(reviewed).score,80);
 reviewed=decision(reviewed,{version:2,action:'submit',reason:'Encaminhado para decisão humana.'},broker);
 assert.throws(()=>decision(reviewed,{version:3,action:'approve',reason:'Todas as evidências foram verificadas.',acknowledged:true},broker));
 reviewed=decision(reviewed,{version:3,action:'approve',reason:'Todas as evidências foram verificadas.',acknowledged:true},admin);assert.equal(reviewed.stage,'Entrada aprovada');
 assert.ok(curation(changed(reviewed)).blockers.length);assert.equal(changed({...reviewed,published:{id:'x'}}).published,null);
});
test('public snapshot excludes private owner and internal address',()=>{
 const d=draft({title:'Casa de teste',city:'Cidade RS',neighborhood:'Bairro',privateAddress:'CONFIDENTIAL',ownerName:'PRIVATE OWNER',ownerContact:'PRIVATE CONTACT',type:'Casa',environment:'urbano',operation:'comprar',condominium:'',price:500000,area:100,description:'Uma descrição de teste completa com informações observadas sobre os ambientes e condições do imóvel.',reasons:'Boa distribuição',features:'Jardim'});
 const row={id:'id',data:{draft:d,stage:'Entrada aprovada',photos:[{id:'photo',caption:'Jardim'}]}};assert.deepEqual(listingBlockers(row.data),[]);const json=JSON.stringify(publicProperty(row));assert.ok(!json.includes('PRIVATE')&&!json.includes('CONFIDENTIAL'));assert.throws(()=>draft({...d,price:-1}));
});
