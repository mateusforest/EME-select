import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createPortalApi} from '../server/portal-api.mjs';
import {attachCloudOperations} from '../server/cloud/operations.mjs';
import {emptyOperations} from '../shared/operations.mjs';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV1sAAAAASUVORK5CYII=','base64');

test('operations HTTP: persistent real records, portfolio isolation, custody, rent accounting and private files',async t=>{
  mkdirSync('tmp',{recursive:true});const dbPath=join(mkdtempSync(resolve('tmp/operations-api-')),'portal.sqlite');
  let clock=Date.parse('2026-09-16T15:00:00Z');
  let api=createPortalApi({dbPath,now:()=>clock});
  const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const origin='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(done=>server.close(done));api.close();});
  const admin={},broker={},outsider={},anonymous={},password='Operations-Test-Only-2026!';
  let adminId,brokerId,otherId,propertyId,otherPropertyId,ticketId,visitId,leaseId,documentId,latest;
  const request=async(who,path,body,method=body?'POST':'GET',headers={})=>{
    const response=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:who.cookie||'',...headers},...(body?{body:JSON.stringify(body)}:{})});
    if(response.headers.get('set-cookie'))who.cookie=response.headers.get('set-cookie').split(';')[0];
    return {status:response.status,body:response.headers.get('content-type')?.includes('application/json')?await response.json():Buffer.from(await response.arrayBuffer()),headers:response.headers};
  };
  const refresh=async()=>{const response=await request(admin,'/operations');assert.equal(response.status,200,JSON.stringify(response.body));latest=response.body;return latest;};
  const envelope=(type,data,version=latest.version,requestId=randomUUID())=>({version,requestId,command:{type,data}});
  const execute=async(type,data,who=admin,status=200)=>{
    const response=await request(who,'/operations/commands',envelope(type,data));
    assert.equal(response.status,status,`${type}: ${JSON.stringify(response.body)}`);
    if(response.status===200)await refresh();return response;
  };
  const ticket=(property=propertyId,assignee=brokerId)=>({propertyId:property,title:'Visita solicitada pelo interessado',contactName:'Interessado de teste',contactPhone:'54900000000',channel:'whatsapp',status:'new',assigneeId:assignee,priority:'normal',nextContactAt:'2026-09-17T12:00:00Z',notes:'Contato externo registrado no teste controlado.'});
  const visit=(property=propertyId,person=brokerId,start='2026-09-16T14:00:00Z',end='2026-09-16T15:00:00Z')=>({propertyId:property,brokerId:person,visitorName:'Visitante de teste',visitorPhone:'54900000000',startAt:start,endAt:end,notes:'Agendamento solicitado para conferência da equipe.'});
  const lease=()=>({propertyId,ownerName:'Proprietário de teste',ownerPhone:'54900000001',tenantName:'Locatário de teste',tenantPhone:'54900000002',startDate:'2026-09-01',endDate:'2026-12-31',rentCents:420000,managementBps:800,dueDay:10,status:'active',notes:'Contrato de teste; valores operacionais manuais.'});
  const upload=(extra={})=>({propertyId,title:'Autorização privada de teste',category:'authorization',filename:'autorizacao-privada.png',mimeType:'image/png',contentBase64:png.toString('base64'),expiresOn:'2026-12-31',...extra});
  await t.test('authentication, first-password gate and empty real state',async()=>{
    assert.equal((await request(anonymous,'/operations')).status,401);
    assert.equal((await request(anonymous,'/operations/commands',{version:0,requestId:randomUUID(),command:{type:'ticket.save',data:{}}})).status,401);
    adminId=(await request(admin,'/auth/setup',{name:'Admin Operações',email:'operations@example.test',password})).body.user.id;
    brokerId=(await request(admin,'/users',{name:'Corretor responsável',email:'broker@example.test',password,role:'corretor'})).body.user.id;
    otherId=(await request(admin,'/users',{name:'Outro corretor',email:'other@example.test',password,role:'corretor'})).body.user.id;
    await request(broker,'/auth/login',{email:'broker@example.test',password});
    assert.equal((await request(broker,'/operations')).status,403);
    await request(broker,'/auth/password',{currentPassword:password,newPassword:password+'2'});
    await request(outsider,'/auth/login',{email:'other@example.test',password});await request(outsider,'/auth/password',{currentPassword:password,newPassword:password+'2'});
    const read=await request(admin,'/operations');latest=read.body;assert.equal(read.status,200,JSON.stringify(read.body));
    assert.match(read.headers.get('cache-control'),/no-store/);
    assert.equal(latest.version,0);assert.deepEqual(latest.state,{version:1,tickets:[],visits:[],leases:[],documents:[],reviews:[]});
    propertyId=(await request(admin,'/evaluations',{title:'Casa da carteira um',city:'Porto Alegre',type:'Casa',operation:'Venda e locação',assigneeId:brokerId})).body.evaluation.id;
    otherPropertyId=(await request(admin,'/evaluations',{title:'Apartamento da carteira dois',city:'Caxias do Sul',type:'Apartamento',operation:'Venda',assigneeId:otherId})).body.evaluation.id;
    await refresh();
  });
  await t.test('ticket writes persist once; forged fields, reused keys and stale submissions fail',async()=>{
    const input=envelope('ticket.save',ticket());
    let response=await request(broker,'/operations/commands',input);assert.equal(response.status,200,JSON.stringify(response.body));await refresh();
    ticketId=latest.state.tickets[0].id;const version=latest.version;
    response=await request(broker,'/operations/commands',input);assert.equal(response.status,200);await refresh();assert.equal(latest.version,version);assert.equal(latest.state.tickets.length,1);
    assert.equal((await request(broker,'/operations/commands',{...input,command:{type:'ticket.save',data:{...input.command.data,title:'Payload alterado'}}})).status,409);
    assert.equal((await request(admin,'/operations/commands',input)).status,409);
    assert.equal((await request(admin,'/operations/commands',envelope('ticket.save',ticket(),0))).status,409);
    assert.equal((await request(admin,'/operations/commands',{...envelope('ticket.save',ticket()),state:{tickets:[]}})).status,400);
    await execute('ticket.save',{...ticket(),id:ticketId,createdBy:otherId});
    assert.equal(latest.state.tickets.find(item=>item.id===ticketId).createdBy,brokerId);
    assert.equal((await request(admin,'/operations/commands',envelope('ticket.save',ticket()),'POST',{Origin:'https://untrusted.invalid'})).status,403);
    await execute('ticket.message',{id:ticketId,direction:'received',body:'Contato recebido fora do portal e registrado para acompanhamento.',occurredAt:'2026-09-16T11:00:00Z'},broker);
    assert.equal(latest.state.tickets[0].messages.length,1);
    assert.equal(latest.state.tickets[0].messages[0].createdBy,brokerId);
  });
  await t.test('portfolio filtering covers records, property metadata and audit; brokers cannot choose foreign ownership',async()=>{
    await execute('ticket.save',ticket(otherPropertyId,otherId));
    const own=(await request(broker,'/operations')).body,foreign=(await request(outsider,'/operations')).body;
    assert.deepEqual(own.state.tickets.map(item=>item.id),[ticketId]);
    assert.equal(foreign.state.tickets.length,1);assert.notEqual(foreign.state.tickets[0].id,ticketId);
    assert.ok(!own.properties.some(property=>property.id===otherPropertyId));
    assert.ok(!JSON.stringify(foreign.history).includes(ticketId));
    await execute('ticket.save',ticket(otherPropertyId,brokerId),broker,403);
    await execute('ticket.save',ticket(propertyId,otherId),broker,403);
    await execute('ticket.message',{id:ticketId,direction:'internal',body:'Tentativa de acesso indevido.',occurredAt:'2026-09-16T11:00:00Z'},outsider,403);
  });
  await t.test('same-version concurrent mutations cannot silently overwrite each other',async()=>{
    const version=latest.version;
    const results=await Promise.all([request(admin,'/operations/commands',envelope('ticket.save',{...ticket(),title:'Primeira concorrente'},version)),request(admin,'/operations/commands',envelope('ticket.save',{...ticket(),title:'Segunda concorrente'},version))]);
    assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);await refresh();assert.equal(latest.version,version+1);
  });
  await t.test('the agenda prevents property or broker overlaps and keys require explicit admin authorization and return',async()=>{
    await execute('visit.save',visit(),broker);visitId=latest.state.visits[0].id;
    await execute('visit.save',visit(propertyId,otherId),admin,409);
    await execute('visit.save',visit(otherPropertyId,brokerId),admin,409);
    await execute('visit.confirm',{id:visitId},broker,403);
    await execute('key.pickup',{id:visitId,custodianName:'Visitante autorizado',identityReference:'Referência interna 001',occurredAt:'2026-09-16T11:00:00Z',notes:'Registro de teste.'},broker,400);
    await execute('key.request',{id:visitId},broker);
    await execute('key.authorize',{id:visitId,returnDueAt:'2026-09-16T16:00:00Z',notes:'Autorização conferida pela EME.'},admin,400);
    await execute('visit.confirm',{id:visitId});
    await execute('key.authorize',{id:visitId,returnDueAt:'2026-09-16T16:00:00Z',notes:'Autorização conferida pela EME.'},broker,403);
    await execute('key.authorize',{id:visitId,returnDueAt:'2026-09-16T16:00:00Z',notes:'Autorização conferida pela EME.'});
    clock=Date.parse('2026-09-16T15:10:00Z');
    await execute('key.pickup',{id:visitId,custodianName:'Visitante autorizado',identityReference:'Referência interna 001',occurredAt:'2026-09-16T15:10:00Z',notes:'Entrega manual registrada.'},broker);
    assert.equal(latest.state.visits[0].key.status,'out');assert.equal(latest.state.visits[0].key.authorizedBy,adminId);
    await execute('visit.cancel',{id:visitId,reason:'Tentativa com chave em custódia.'},admin,400);
    await execute('visit.complete',{id:visitId,notes:'Tentativa antes da devolução.'},broker,400);
    clock=Date.parse('2026-09-16T15:20:00Z');
    await execute('key.return',{id:visitId,occurredAt:'2026-09-16T13:00:00Z',notes:'Horário incorreto.'},broker,400);
    await execute('key.return',{id:visitId,occurredAt:'2026-09-16T15:20:00Z',notes:'Chave devolvida e conferida.'},broker);
    await execute('visit.complete',{id:visitId,notes:'Visita encerrada com retorno das chaves.'},broker);
    assert.equal(latest.state.visits[0].status,'completed');assert.equal(latest.state.visits[0].key.status,'returned');
  });
  await t.test('rental competencies freeze exact fee/owner amounts, generate once and keep receipts separate from company finance',async()=>{
    await execute('lease.save',lease());leaseId=latest.state.leases[0].id;
    await execute('lease.save',lease(),admin,409);
    await execute('lease.generate',{id:leaseId,month:'2026-09'});
    const charge=latest.state.leases[0].charges[0];assert.equal(charge.rentCents,420000);assert.equal(charge.feeCents,33600);assert.equal(charge.ownerDueCents,386400);
    await execute('lease.generate',{id:leaseId,month:'2026-09'});assert.equal(latest.state.leases[0].charges.length,1);
    await execute('lease.repass',{id:leaseId,chargeId:charge.id,occurredAt:'2026-09-16T14:00:00Z',notes:'Registro antes de receber.'},admin,400);
    await execute('lease.receive',{id:leaseId,chargeId:charge.id,occurredAt:'2026-09-16T14:00:00Z',notes:'Recebimento integral conferido.'});
    await execute('lease.repass',{id:leaseId,chargeId:charge.id,occurredAt:'2026-09-16T15:00:00Z',notes:'Repasse manual conferido.'});
    assert.equal(latest.state.leases[0].charges[0].status,'repassed');
    await execute('lease.generate',{id:leaseId,month:'2026-10',rentCents:123456});
    const october=latest.state.leases[0].charges.find(item=>item.month==='2026-10');assert.equal(october.feeCents,9876);assert.equal(october.ownerDueCents,113580);
    await execute('lease.maintenance',{id:leaseId,title:'Conferir vedação',description:'Solicitação de teste documentada.',status:'open',estimatedCostCents:12500,actualCostCents:null,notes:'Orçamento ainda não aprovado.'});
    await execute('lease.inspection',{id:leaseId,kind:'periodic',scheduledAt:'2026-09-18T14:00:00Z',completedAt:null,result:'pending',notes:'Vistoria programada.'});
    assert.equal(latest.state.leases[0].maintenance.length,1);assert.equal(latest.state.leases[0].inspections.length,1);
    assert.equal((await request(admin,'/finance')).body.state.entries.length,0);
    await execute('lease.end',{id:leaseId,reason:'Encerramento autorizado no teste.'},broker,403);
  });
  await t.test('files are private, versioned, reviewed only by admins and never serialized into snapshots or public listing data',async()=>{
    await execute('document.upload',upload({contentBase64:Buffer.from('<script>alert(1)</script>').toString('base64')}),admin,400);
    await execute('document.upload',upload(),broker);documentId=latest.state.documents[0].id;
    const download='/operations/documents/'+documentId+'/content';
    const file=await request(broker,download);assert.equal(file.status,200);assert.deepEqual(file.body,png);assert.match(file.headers.get('content-disposition'),/^attachment/);assert.match(file.headers.get('cache-control'),/private.*no-store/);assert.equal(file.headers.get('x-content-type-options'),'nosniff');
    assert.ok([401,404].includes((await request(anonymous,download)).status));assert.equal((await request(outsider,download)).status,404);
    assert.equal(JSON.stringify(latest).includes(png.toString('base64')),false);assert.equal(JSON.stringify(latest).includes('contentBase64'),false);
    await execute('document.review',{id:documentId,status:'approved',notes:'Revisão operacional humana registrada.'},broker,403);
    await execute('document.review',{id:documentId,status:'approved',notes:'Revisão operacional humana registrada.'});
    await execute('document.upload',upload({previousId:documentId,title:'Autorização revisada'}),broker);
    assert.equal(latest.state.documents.length,2);assert.equal(latest.state.documents.find(item=>item.previousId===documentId).version,2);
    await execute('document.upload',upload({propertyId:otherPropertyId,previousId:documentId}),admin,400);
    const published=await request(anonymous,'/public/properties');assert.equal(JSON.stringify(published.body).includes('autorizacao-privada.png'),false);
  });
  await t.test('quality evidence is restricted to management and incomplete notes cannot pretend to be a complete evaluation',async()=>{
    const review={brokerId,periodStart:'2026-09-01',periodEnd:'2026-09-16',scores:{communication:4,followup:4,reliability:5,presentation:4},evidence:'Atendimento e visita conferidos pelo gestor no período.',actionPlan:'Combinar retorno após a visita e registrar próximos passos.',status:'complete'};
    await execute('review.save',review,broker,403);
    await execute('review.save',{...review,scores:{...review.scores,followup:null}},admin,400);
    await execute('review.save',review);
    assert.equal(latest.state.reviews.length,1);
    const brokerView=(await request(broker,'/operations')).body;assert.deepEqual(brokerView.state.reviews,[]);assert.equal(JSON.stringify(brokerView).includes(review.evidence),false);
  });
  await t.test('restart preserves operations and reassignment immediately revokes former broker document/ticket access',async()=>{
    const expected=structuredClone(latest);api.close();api=createPortalApi({dbPath,now:()=>clock});
    await refresh();assert.deepEqual(latest,expected);
    const current=(await request(admin,'/evaluations/'+propertyId)).body.evaluation;
    assert.equal((await request(admin,'/evaluations/'+propertyId,{version:current.version,assigneeId:otherId,stage:current.stage,note:'Reatribuição da carteira para testar a revogação.'},'PATCH')).status,200);
    const previous=(await request(broker,'/operations')).body;
    assert.ok(!previous.state.tickets.some(item=>item.id===ticketId));assert.ok(!previous.state.documents.some(item=>item.id===documentId));
    assert.equal((await request(broker,'/operations/documents/'+documentId+'/content')).status,404);
    assert.equal((await request(outsider,'/operations/documents/'+documentId+'/content')).status,200);
    await execute('ticket.message',{id:ticketId,direction:'internal',body:'Tentativa após perder a atribuição.',occurredAt:'2026-09-16T15:00:00Z'},broker,403);
  });
});

test('cloud snapshot and private download scope use the current broker assignment',async()=>{
  const broker={id:randomUUID(),name:'Corretor um',role:'corretor',active:true,must_change:false},other={id:randomUUID(),name:'Corretor dois',role:'corretor',active:true,must_change:false};
  const property= randomUUID(),foreign=randomUUID(),documentId=randomUUID(),queries=[];
  const state={...emptyOperations(),tickets:[{id:randomUUID(),propertyId:property},{id:randomUUID(),propertyId:foreign}],documents:[{id:documentId,propertyId:property}],reviews:[{id:randomUUID(),evidence:'Parecer privado da gestão'}]};
  const client={rest:async path=>{
    queries.push(path);
    if(path.startsWith('eme_operations_state?'))return [{version:3,data:state,updated_at:'2026-09-16T12:00:00Z'}];
    if(path.startsWith('eme_profiles?'))return [broker,other];
    if(path.startsWith('eme_cases?'))return [{id:property,assignee_id:broker.id,title:'Carteira um'},{id:foreign,assignee_id:other.id,title:'Carteira dois'}];
    if(path.startsWith('eme_operations_audit?'))return [{id:1,property_id:property,action:'ticket.save',eme_profiles:{name:broker.name}},{id:2,property_id:foreign,action:'ticket.save',eme_profiles:{name:other.name}},{id:3,property_id:null,action:'review.save',eme_profiles:{name:'Admin'}}];
    if(path.startsWith('eme_operations_files?')){
      assert.match(path,/eme_cases!inner\(assignee_id\)/);
      if(path.includes('eme_cases.assignee_id=eq.'+other.id))return [];
      assert.ok(path.includes('eme_cases.assignee_id=eq.'+broker.id));
      return [{id:documentId,property_id:property,filename:'privado.png',mime_type:'image/png',size_bytes:png.length,content_base64:png.toString('base64')}];
    }
    throw Error('Unexpected table '+path);
  },rpc:async()=>{throw Error('Read-only test unexpectedly called RPC');}};
  const adapter=attachCloudOperations({client,hashOf:()=> 'session'});let snapshot;
  await adapter.handle('/api/operations',{method:'GET'},{},broker,null,(status,value)=>{assert.equal(status,200);snapshot=value;});
  assert.equal(snapshot.state.tickets.length,1);assert.equal(snapshot.properties.length,1);assert.equal(snapshot.members.length,1);assert.equal(snapshot.history.length,1);assert.deepEqual(snapshot.state.reviews,[]);
  assert.ok(queries.some(path=>path.startsWith('eme_cases?')&&path.includes('assignee_id=eq.'+broker.id)));
  let written=false;const res={writeHead:(status,headers)=>{written=true;assert.equal(status,200);assert.match(headers['Cache-Control'],/private.*no-store/);},end:body=>assert.deepEqual(body,png)};
  const path='/api/operations/documents/'+documentId+'/content';
  await assert.rejects(adapter.handle(path,{method:'GET'},res,other,null,()=>{}),error=>error.status===404);assert.equal(written,false);
  await adapter.handle(path,{method:'GET'},res,broker,null,()=>{});assert.equal(written,true);
});

test('cloud retry crossing a commit delegates to the locked receipt check without recomputing a mutation',async()=>{
  const actor={id:randomUUID(),name:'Admin teste',role:'admin',active:true,must_change:false},propertyId=randomUUID();let calls=0,result;
  const current={version:1,data:emptyOperations(),updated_at:'2026-09-16T12:00:00Z'};
  const client={rest:async path=>{
    if(path.startsWith('eme_operations_state?'))return [current];
    if(path.startsWith('eme_profiles?'))return [actor];
    if(path.startsWith('eme_cases?'))return [{id:propertyId,title:'Imóvel registrado',assignee_id:actor.id}];
    if(path.startsWith('eme_operations_receipts?')||path.startsWith('eme_operations_audit?'))return [];
    throw Error('Unexpected table '+path);
  },rpc:async(name,input)=>{calls++;assert.equal(name,'eme_save_operations');assert.equal(input.p_session,'hashed-session');assert.equal(input.p_version,0);assert.equal(input.p_property_id,propertyId);assert.equal(input.p_data,null);return current;}};
  await attachCloudOperations({client,hashOf:()=> 'hashed-session'}).handle('/api/operations/commands',{method:'POST'},{},actor,{version:0,requestId:randomUUID(),command:{type:'ticket.save',data:{propertyId,title:'Mesmo envio repetido',contactName:'Contato',assigneeId:actor.id,status:'closed'}}},(status,value)=>{result={status,...value};});
  assert.equal(calls,1);assert.equal(result.status,200);assert.equal(result.version,1);
});
