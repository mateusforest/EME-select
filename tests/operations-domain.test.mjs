import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {emptyOperations,applyOperationsCommand,visibleOperations,operationsMetrics} from '../shared/operations.mjs';
const adminId=randomUUID(),brokerId=randomUUID(),otherId=randomUUID(),propertyId=randomUUID(),otherProperty=randomUUID();
const context={actorId:adminId,role:'admin',now:'2026-09-16T14:00:00.000Z',members:[{id:adminId,name:'Admin',role:'admin',active:true},{id:brokerId,name:'Corretor',role:'corretor',active:true},{id:otherId,name:'Outro',role:'corretor',active:true}],properties:[{id:propertyId,title:'Primeiro',assigneeId:brokerId},{id:otherProperty,title:'Segundo',assigneeId:otherId}]};
const broker={...context,role:'corretor',actorId:brokerId};
const command=(state,type,data,ctx=context)=>applyOperationsCommand(state,{type,data},ctx);
const visit=(state,data={},ctx=context)=>command(state,'visit.save',{propertyId,brokerId,visitorName:'Visitante real',visitorPhone:'54991578029',startAt:'2026-09-16T15:00:00Z',endAt:'2026-09-16T16:00:00Z',notes:'Visita agendada pela equipe.',...data},ctx);
const lease=(state,data={})=>command(state,'lease.save',{propertyId,ownerName:'Proprietário real',ownerPhone:'54991578029',tenantName:'Locatário real',tenantPhone:'54991578029',startDate:'2026-09-01',endDate:'2027-08-31',rentCents:420000,managementBps:800,dueDay:10,...data});

test('empty operations never fabricates activity or quality indicators',()=>{const state=emptyOperations(),metrics=operationsMetrics(state,context.now);assert.deepEqual(metrics.brokers,[]);assert.ok(Object.values(metrics.totals).every(value=>value===0));assert.equal(state.version,1);});
test('live property assignment and human administrator gate privileged actions',()=>{
 let state=visit(emptyOperations(),{},broker);
 assert.throws(()=>visit(state,{propertyId:otherProperty},broker),/carteira/);
 assert.throws(()=>command(state,'visit.confirm',{id:state.visits[0].id},broker),/administrador/);
 assert.throws(()=>command(state,'key.authorize',{id:state.visits[0].id,returnDueAt:'2026-09-16T17:00:00Z',notes:'Autorização registrada'},broker),/administrador/);
 const shifted={...broker,properties:context.properties.map(item=>({...item,assigneeId:otherId}))};
 assert.deepEqual(visibleOperations(state,shifted).visits,[]);
 assert.throws(()=>command(state,'visit.cancel',{id:state.visits[0].id,reason:'Cancelamento solicitado'},shifted),/carteira/);
});
test('same unit OR same broker blocks overlapping active visits; adjacent appointments are valid',()=>{
 let state=visit(emptyOperations());
 assert.throws(()=>visit(state,{brokerId:otherId}),/nesse horário/);
 assert.throws(()=>visit(state,{propertyId:otherProperty}),/nesse horário/);
 state=visit(state,{propertyId:otherProperty,startAt:'2026-09-16T16:00:00Z',endAt:'2026-09-16T17:00:00Z'});
 assert.equal(state.visits.length,2);
 assert.throws(()=>visit(state,{startAt:'2026-09-16T15:00:00Z',endAt:'2026-09-16T15:00:10Z'}),/minuto/);
});
test('key custody requires explicit human approval and return before cancellation or completion',()=>{
 let state=visit(emptyOperations()),id=state.visits[0].id;
 assert.throws(()=>command(state,'key.pickup',{id,custodianName:'Visitante',identityReference:'Documento conferido',occurredAt:context.now},broker),/autorização/);
 state=command(state,'visit.confirm',{id});state=command(state,'key.request',{id},broker);
 state=command(state,'key.authorize',{id,returnDueAt:'2026-09-16T17:00:00Z',notes:'Retirada conferida pessoalmente na EME.'});
 state=command(state,'key.pickup',{id,custodianName:'Visitante',identityReference:'Conferência interna 001',occurredAt:'2026-09-16T14:00:00Z',notes:'Entregue pessoalmente'},broker);
 assert.equal(operationsMetrics(state,'2026-09-16T18:00:00Z').totals.overdueKeys,1);
 assert.throws(()=>command(state,'visit.cancel',{id,reason:'Desistência'},broker),/devolução/);
 assert.throws(()=>command(state,'visit.save',{id,notes:'Alteração'},broker),/custódia/);
 const later={...broker,now:'2026-09-16T16:30:00Z'};
 assert.throws(()=>command(state,'key.return',{id,occurredAt:'2026-09-16T13:59:00Z',notes:'Devolução'},later),/anteceder/);
 state=command(state,'key.return',{id,occurredAt:later.now,notes:'Chave devolvida e conferida'},later);
 state=command(state,'visit.complete',{id,notes:'Visita realizada com acompanhamento'},later);
 assert.equal(state.visits[0].key.status,'returned');assert.equal(state.visits[0].status,'completed');
});
test('editing a confirmed appointment revokes its confirmation and key authorization',()=>{
 let state=visit(emptyOperations()),id=state.visits[0].id;state=command(state,'visit.confirm',{id});state=command(state,'key.request',{id});state=command(state,'key.authorize',{id,returnDueAt:'2026-09-16T17:00:00Z',notes:'Autorizado após conferência'});
 state=command(state,'visit.save',{id,startAt:'2026-09-16T16:00:00Z',endAt:'2026-09-16T17:00:00Z'});
 assert.equal(state.visits[0].status,'requested');assert.equal(state.visits[0].key.status,'none');assert.equal(state.visits[0].key.authorizedBy,null);
});
test('manual contact history preserves authorship and unknown quality stays unknown',()=>{
 let state=command(emptyOperations(),'ticket.save',{propertyId,title:'Solicitação de visita',contactName:'Contato',contactPhone:'54991578029',assigneeId:brokerId,nextContactAt:'2026-09-15T12:00:00Z',status:'in_progress'},broker);
 const original=structuredClone(state);state=command(state,'ticket.message',{id:state.tickets[0].id,direction:'received',body:'Cliente informou preferência de horário.',occurredAt:context.now,createdBy:otherId},broker);
 assert.equal(state.tickets[0].messages[0].createdBy,brokerId);assert.deepEqual(original.tickets[0].messages,[]);assert.equal(operationsMetrics(state,context.now).brokers[0].overdueFollowups,1);
 state=command(state,'review.save',{brokerId,periodStart:'2026-09-01',periodEnd:'2026-09-16',scores:{communication:null},evidence:'',actionPlan:'',status:'draft'});
 assert.equal(state.reviews[0].scores.communication,null);assert.equal(visibleOperations(state,broker).reviews.length,0);
 assert.throws(()=>command(state,'review.save',{id:state.reviews[0].id,status:'complete'}),/quatro notas/);
});
test('lease monthly fees round exactly, generating twice cannot duplicate or rewrite an issued period',()=>{
 let state=lease(emptyOperations()),id=state.leases[0].id;
 state=command(state,'lease.generate',{id,month:'2026-09'});state=command(state,'lease.generate',{id,month:'2026-09',rentCents:1});
 assert.equal(state.leases[0].charges.length,1);assert.equal(state.leases[0].charges[0].feeCents,33600);assert.equal(state.leases[0].charges[0].ownerDueCents,386400);
 state=command(state,'lease.save',{id,rentCents:450000});assert.equal(state.leases[0].charges[0].rentCents,420000);
 assert.throws(()=>lease(state),/contrato ativo/);assert.throws(()=>command(state,'lease.generate',{id,month:'2028-01'}),/vigência/);
 const chargeId=state.leases[0].charges[0].id;
 assert.throws(()=>command(state,'lease.repass',{id,chargeId,occurredAt:context.now,notes:'Comprovante'}),/recebimento/);
 state=command(state,'lease.receive',{id,chargeId,occurredAt:context.now,notes:'Recebimento manual conferido'});
 assert.throws(()=>command(state,'lease.receive',{id,chargeId,occurredAt:context.now,notes:'Repetido'}),/aberto/);
 state=command(state,'lease.repass',{id,chargeId,occurredAt:context.now,notes:'Repasse manual conferido'});assert.equal(state.leases[0].charges[0].status,'repassed');
});
test('document versions are append-only and approval is never inherited by a replacement',()=>{
 const file={filename:'autorizacao.pdf',mimeType:'application/pdf',sizeBytes:300,sha256:'a'.repeat(64)},ctx={...broker,file};
 let state=command(emptyOperations(),'document.upload',{propertyId,title:'Autorização',category:'authorization'},ctx);
 const original=state.documents[0];state=command(state,'document.review',{id:original.id,status:'approved',notes:'Conferido manualmente com o proprietário.'});
 state=command(state,'document.upload',{propertyId,title:'Autorização atualizada',category:'authorization',previousId:original.id},ctx);
 assert.equal(state.documents[0].status,'approved');assert.equal(state.documents[1].version,2);assert.equal(state.documents[1].status,'pending');
 assert.throws(()=>command(state,'document.upload',{propertyId,title:'Versão concorrente',category:'authorization',previousId:original.id},ctx),/mais recente/);
 assert.throws(()=>command(state,'document.review',{id:original.id,status:'approved',notes:'Conferido'},broker),/administrador/);
 assert.ok(!JSON.stringify(state).includes('contentBase64'));
});
test('maintenance and inspections keep actual evidence instead of fabricated completion',()=>{
 let state=lease(emptyOperations()),id=state.leases[0].id;
 state=command(state,'lease.maintenance',{id,title:'Revisão hidráulica',description:'Solicitação recebida do locatário.',estimatedCostCents:50000,status:'open'});
 assert.equal(state.leases[0].maintenance[0].actualCostCents,null);assert.equal(operationsMetrics(state,context.now).totals.openMaintenance,1);
 assert.throws(()=>command(state,'lease.inspection',{id,kind:'entry',scheduledAt:context.now,result:'adequate',notes:'Conferido'}),/quando/);
 state=command(state,'lease.inspection',{id,kind:'entry',scheduledAt:context.now,completedAt:context.now,result:'action_required',notes:'Pendência hidráulica registrada em vistoria.'});
 assert.equal(state.leases[0].inspections[0].result,'action_required');
});
