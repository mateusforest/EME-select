import test from 'node:test';import assert from 'node:assert/strict';
import {draft,curation,reviseCuration,decision,changed,listingBlockers,publicProperty} from '../server/cloud/domain.mjs';
import {readCuration,curationSnapshot,LEGACY_POLICY,SELECT_POLICY} from '../server/curation-policy.mjs';
const admin={name:'Equipe de teste',role:'admin'},broker={name:'Corretor de teste',role:'corretor'};
test('cloud curation cannot approve missing evidence or broker sign-offs',()=>{
 const data={stage:'Recebido',type:'Casa'};const c=curation(data);assert.equal(c.score,null);assert.equal(c.policy,SELECT_POLICY);assert.equal(c.criteria.length,5);assert.equal(c.checks.length,6);
 assert.throws(()=>decision(data,{version:1,action:'submit',reason:'Revisão registrada pelo responsável.'},broker));
 const body={version:1,criteria:c.criteria.map(c=>({key:c.key,score:5,note:'Fonte e condição verificadas no teste.'})),checks:c.checks.map(c=>({key:c.key,state:'Conferido',note:'Fonte, data e escopo conferidos no teste.'})),pending:''};
 assert.throws(()=>reviseCuration(data,body,broker));let reviewed=reviseCuration(data,body,admin);assert.equal(curation(reviewed).score,100);assert.equal(reviewed.curation.policy,SELECT_POLICY);
 reviewed=decision(reviewed,{version:2,action:'submit',reason:'Encaminhado para decisão humana.'},broker);
 assert.throws(()=>decision(reviewed,{version:3,action:'approve',reason:'Todas as evidências foram verificadas.',acknowledged:true},broker));
 reviewed=decision(reviewed,{version:3,action:'approve',reason:'Todas as evidências foram verificadas.',acknowledged:true},admin);assert.equal(reviewed.stage,'Entrada aprovada');
 assert.ok(curation(changed(reviewed)).blockers.length);assert.equal(changed({...reviewed,published:{id:'x'}}).published,null);
});

function complete(type='Casa',scores=[5,5,5,5,5]) {
 const data={type,stage:'Em avaliação'},c=curation(data);
 return reviseCuration(data,{version:1,criteria:c.criteria.map((v,i)=>({key:v.key,score:scores[i],note:'Evidência de teste identificada e datada.'})),checks:c.checks.map(v=>({key:v.key,state:'Conferido',note:'Conferência humana de teste, com fonte, data e escopo.'})),pending:''},admin);
}
const submit=data=>decision(data,{version:1,action:'submit',reason:'Encaminhamento para decisão humana.'},admin);

test('Select V2 enforces quality floors, threshold, unknowns and every human gate',()=>{
 assert.equal(curation(complete('Casa',[4,4,4,4,4])).score,80);
 assert.throws(()=>submit(complete('Casa',[4,4,4,4,4])),/85\/100/);
 const floor=complete('Casa',[3,5,5,5,5]);assert.equal(curation(floor).score,90);assert.throws(()=>submit(floor),/mínimo 4\/5/);
 const acceptable=complete('Casa',[4,5,4,4,4]);assert.equal(curation(acceptable).score,85);assert.equal(submit(acceptable).stage,'Aguardando decisão');
 const missing=complete();missing.curation.criteria[1].score=null;missing.curation.criteria[1].note='';assert.equal(curation(missing).score,null);assert.equal(curation(missing).coverage,4);assert.throws(()=>submit(missing),/sem nota/);
 for(const check of acceptable.curation.checks){const data=structuredClone(acceptable);data.curation.checks.find(c=>c.key===check.key).state='Pendente';assert.throws(()=>submit(data),/conferência humana pendente/);}
 const pending=complete();pending.curation.pending='Divergência material ainda não resolvida.';assert.throws(()=>submit(pending),/pendências/);
 assert.deepEqual(curation({...acceptable,price:100000}).criteria,curation({...acceptable,price:10000000}).criteria);
 const inflated=complete('Casa',[4,4,4,4,4]);inflated.curation.criteria[0].weight=200;inflated.curation.criteria[0].minimum=0;assert.equal(curation(inflated).score,80);assert.throws(()=>submit(inflated));
 const unknownPolicy=complete();unknownPolicy.curation.policy='unrecognized';assert.equal(curation(unknownPolicy).score,null);assert.throws(()=>submit(unknownPolicy),/Política/);
 assert.equal(curation({type:'Tipo novo',stage:'Recebido'}).score,null);assert.match(curation({type:'Tipo novo'}).blockers.join(' '),/tipologia atendida/);
});

test('all typologies use shared weights and guidance; changed families need new scores',()=>{
 const profiles=[['Casa',[25,25,20,20,10]],['Casa em condomínio',[25,25,20,20,10]],['Apartamento',[25,25,20,20,10]],['Compacto',[25,25,20,20,10]],['Cabana',[25,25,20,20,10]],['Sala comercial',[25,25,20,20,10]],['Loja',[25,25,20,20,10]],['Edifício corporativo',[25,25,20,20,10]],['Galpão',[25,30,15,20,10]],['Pavilhão',[25,30,15,20,10]],['Centro de distribuição',[25,30,15,20,10]],['Terreno urbano',[25,25,20,15,15]],['Lote em condomínio',[25,25,20,15,15]],['Terra agrícola',[25,25,15,25,10]]];
 for(const [type,weights] of profiles){const data=complete(type);const c=curation(data);assert.deepEqual(c,readCuration({saved:data.curation,type,stage:data.stage}));assert.deepEqual(c.criteria.map(c=>c.weight),weights);assert.ok(c.criteria.every(c=>c.anchors.length===6&&c.help.length>30));assert.equal(c.score,100);assert.equal(c.blockers.length,0);}
 const retyped={...complete('Casa'),type:'Galpão'};const c=curation(retyped);assert.equal(c.score,null);assert.ok(c.criteria.every(c=>c.score===null));assert.ok(c.checks.every(c=>c.state==='Em revisão'));assert.throws(()=>submit(retyped),/família/);
});

test('legacy policy and scores remain auditable through updates, decisions and reopening',()=>{
 const initial=readCuration({saved:{policy:LEGACY_POLICY},type:'Casa'});
 const saved={criteria:initial.criteria.map(c=>({key:c.key,score:4,note:'Evidência histórica de teste identificada.'})),checks:initial.checks.map(c=>({key:c.key,state:'Conferido',note:'Conferência histórica com fonte e data.',author:'Responsável anterior',date:'2026-09-14T10:00:00.000Z'})),pending:''};
 let data={type:'Casa',stage:'Em avaliação',curation:saved};assert.equal(curation(data).policy,LEGACY_POLICY);assert.equal(curation(data).score,80);assert.equal(curation(data).criteria.length,4);assert.equal(curation(data).checks.length,4);
 data=submit(data);assert.equal(data.curation.policy,LEGACY_POLICY);data=decision(data,{version:2,action:'approve',reason:'Decisão sob a política anterior.',acknowledged:true},admin);assert.equal(curation(data).score,80);assert.equal(curation(data).locked,true);
 assert.throws(()=>reviseCuration(data,{version:3},admin),/Reabra/);
 data=decision(data,{version:3,action:'reopen',reason:'Revisão humana deliberada do dossiê.'},admin);assert.equal(data.curation.policy,LEGACY_POLICY);assert.equal(curation(data).score,80);assert.ok(curation(data).checks.every(c=>c.state==='Em revisão'));
 const current=curation(data);const payload={version:4,criteria:current.criteria.map(({key,score,note})=>({key,score,note})),checks:current.checks.map(({key,state,note})=>({key,state,note})),pending:''};
 data=reviseCuration(data,payload,admin);assert.equal(data.curation.policy,LEGACY_POLICY);assert.equal(curation(data).score,80);assert.throws(()=>reviseCuration(data,{...payload,policy:SELECT_POLICY},admin),/Campos/);
 const oldBlank={criteria:initial.criteria.map(c=>({key:c.key,score:null,note:''}))};assert.equal(readCuration({saved:oldBlank,type:'Casa'}).policy,LEGACY_POLICY);assert.equal(readCuration({saved:{},type:'Casa'}).policy,SELECT_POLICY);
 assert.equal(curationSnapshot(curation(data)).policy,LEGACY_POLICY);
});
test('public snapshot excludes private owner and internal address',()=>{
 const d=draft({title:'Casa de teste',city:'Cidade RS',neighborhood:'Bairro',privateAddress:'CONFIDENTIAL',ownerName:'PRIVATE OWNER',ownerContact:'PRIVATE CONTACT',type:'Casa',environment:'urbano',operation:'comprar',condominium:'',price:500000,area:100,description:'Uma descrição de teste completa com informações observadas sobre os ambientes e condições do imóvel.',reasons:'Boa distribuição\nIntegração dos ambientes com o jardim',features:'Jardim'});
 const row={id:'id',data:{draft:d,stage:'Entrada aprovada',photos:[{id:'photo',caption:'Jardim',width:2400,height:1600,room:'Área social'}]}};assert.deepEqual(listingBlockers(row.data),[]);const json=JSON.stringify(publicProperty(row));assert.ok(!json.includes('PRIVATE')&&!json.includes('CONFIDENTIAL'));assert.throws(()=>draft({...d,price:-1}));
});
