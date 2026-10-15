import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createPortalApi} from '../server/portal-api.mjs';
import {attachCloudFinance} from '../server/cloud/finance.mjs';
import {attachFinance} from '../server/finance.mjs';
import {peopleRecordId} from '../server/people.mjs';
import {developmentRecordId} from '../shared/development.mjs';
import {emptyFinance,financeReport} from '../shared/finance.mjs';

test('finance HTTP: private persistent ledger, optimistic writes, repeat protection and real cash settlement',async t=>{
  mkdirSync('tmp',{recursive:true});const dbPath=join(mkdtempSync(resolve('tmp/finance-api-')),'portal.sqlite');
  let api=createPortalApi({dbPath,now:()=>Date.parse('2026-09-16T15:00:00Z')});
  const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const origin='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(done=>server.close(done));api.close();});
  const admin={},broker={},anonymous={},password='Finance-Test-Only-2026!';
  const request=async(who,path,body,method=body?'POST':'GET',headers={})=>{
    const response=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:who.cookie||'',...headers},...(body?{body:JSON.stringify(body)}:{})});
    if(response.headers.get('set-cookie'))who.cookie=response.headers.get('set-cookie').split(';')[0];
    return {status:response.status,body:await response.json(),headers:response.headers};
  };
  let latest,accountId,entryId;
  const command=(type,data,version=latest.version,requestId=randomUUID())=>({version,requestId,command:{type,data}});
  const execute=async body=>{const result=await request(admin,'/finance/commands',body);if(result.status===200)latest=result.body;return result;};
  const report=()=>financeReport(latest.state,{from:'2026-09-01',to:'2026-09-30',asOf:'2026-09-16'});
  await t.test('only administrators access finance and no demonstration money is seeded',async()=>{
    assert.equal((await request(anonymous,'/finance')).status,401);
    await request(admin,'/auth/setup',{name:'Admin Financeiro',email:'finance@example.test',password});
    await request(admin,'/auth/logout',{});
    assert.equal((await request(admin,'/finance')).status,401);
    assert.equal((await request(admin,'/auth/login',{email:'finance@example.test',password})).status,200);
    await request(admin,'/users',{name:'Corretor Financeiro',email:'broker@example.test',password,role:'corretor'});
    await request(broker,'/auth/login',{email:'broker@example.test',password});
    assert.equal((await request(broker,'/finance')).status,403);
    await request(broker,'/auth/password',{currentPassword:password,newPassword:password+'2'});
    assert.equal((await request(broker,'/finance')).status,403);
    assert.equal((await request(broker,'/finance/commands',{version:0,requestId:randomUUID(),command:{type:'settings.save',data:{reserveBps:1000}}})).status,403);
    const read=await request(admin,'/finance');latest=read.body;
    assert.equal(read.status,200);assert.match(read.headers.get('cache-control'),/no-store/);
    assert.equal(latest.version,0);assert.deepEqual(latest.state,emptyFinance());assert.equal(latest.history.length,0);
    assert.equal(latest.members.length,2);assert.ok(latest.members.every(member=>!('email'in member)));assert.deepEqual(latest.properties,[]);
    assert.equal(report().cash.balanceCents,0);
  });
  await t.test('manual account opening balance persists, retry is idempotent and reused request cannot be changed',async()=>{
    const input=command('account.save',{name:'Conta principal',kind:'bank',bankName:'Cadastro manual',openingDate:'2026-09-01',openingBalanceCents:100000});
    assert.equal((await execute(input)).status,200);accountId=latest.state.accounts[0].id;
    assert.equal(latest.version,1);assert.equal(report().cash.availableCents,100000);
    assert.equal((await execute(input)).status,200);assert.equal(latest.version,1);assert.equal(latest.state.accounts.length,1);
    assert.equal((await execute({...input,command:{...input.command,data:{...input.command.data,name:'Outro nome'}}})).status,409);
    assert.equal((await execute(command('account.save',{name:'Conta desatualizada',kind:'cash',openingDate:'2026-09-01',openingBalanceCents:0},0))).status,409);
    assert.equal((await request(admin,'/finance/commands',command('settings.save',{reserveBps:1000}),'POST',{Origin:'https://untrusted.invalid'})).status,403);
    assert.equal((await request(admin,'/finance/commands',{...input,state:{accounts:[]}})).status,400);
    const replay={...input,command:{data:Object.fromEntries(Object.entries(input.command.data).reverse()),type:input.command.type}};
    assert.equal((await execute(replay)).status,200);assert.equal(latest.history.length,1);
  });
  await t.test('two same-version submissions cannot both commit',async()=>{
    const v=latest.version;
    const changes=await Promise.all([execute(command('settings.save',{cashTargetCents:200000},v)),execute(command('settings.save',{initialInvestmentCents:500000},v))]);
    assert.deepEqual(changes.map(item=>item.status).sort(),[200,409]);
    latest=(await request(admin,'/finance')).body;assert.equal(latest.version,v+1);assert.equal(latest.history.length,2);
  });
  await t.test('forecast is not cash; settlement credits once and cancellation removes its effect',async()=>{
    assert.equal((await execute(command('entry.save',{description:'Honorários de venda',category:'sale_fee',amountCents:10000,recognition:'forecast',competenceDate:'2026-09-16',dueDate:'2026-09-16',behavior:'variable'}))).status,200);
    entryId=latest.state.entries[0].id;
    assert.equal(report().cash.balanceCents,100000);assert.equal(report().dre.automatic.revenueCents,0);
    const settlement=command('entry.settle',{id:entryId,accountId,settledDate:'2026-09-16'});
    assert.equal((await execute(settlement)).status,200);assert.equal(report().cash.balanceCents,110000);assert.equal(report().dre.automatic.revenueCents,10000);
    assert.equal((await execute(settlement)).status,200);assert.equal(report().cash.balanceCents,110000);
    assert.equal((await execute(command('entry.cancel',{id:entryId,reason:'Recebimento lançado por engano'}))).status,200);
    assert.equal(report().cash.balanceCents,100000);assert.equal(report().dre.automatic.revenueCents,0);
    assert.equal(latest.state.entries.find(entry=>entry.id===entryId).status,'cancelled');
    assert.equal((await execute(command('entry.save',{description:'Valor inválido',category:'sale_fee',amountCents:0.5,recognition:'recognized',competenceDate:'2026-09-16',dueDate:'2026-09-16',behavior:'variable'}))).status,400);
  });
  await t.test('owner plan commits all partners once, reserves profit and persists net payment with tax payable',async()=>{
    assert.equal((await execute(command('settings.save',{cashTargetCents:0}))).status,200);
    for(const name of ['Sócio A','Sócio B']) assert.equal((await execute(command('partner.save',{name,shareBps:5000}))).status,200);
    assert.equal((await execute(command('entry.save',{description:'Honorários confirmados',category:'sale_fee',amountCents:20000,recognition:'recognized',competenceDate:'2026-09-16',dueDate:'2026-09-16',settleNow:true,accountId,settledDate:'2026-09-16'}))).status,200);
    const plan=command('distribution.plan',{from:'2026-09-01',to:'2026-09-30',dueDate:'2026-09-16',reason:'Deliberação testada pela API'});
    const beforeVersion=latest.version;
    assert.equal((await execute(plan)).status,200);
    const owners=latest.state.entries.filter(e=>e.category==='partner_distribution');
    assert.equal(owners.length,2);assert.deepEqual(owners.map(e=>e.amountCents),[10000,10000]);
    assert.equal(latest.version,beforeVersion+1);assert.equal(report().cash.balanceCents,120000);
    assert.equal((await execute(plan)).status,200);assert.equal(latest.version,beforeVersion+1);
    assert.equal(latest.state.entries.filter(e=>e.category==='partner_distribution').length,2);
    const payment=command('entry.settle',{id:owners[0].id,accountId,settledDate:'2026-09-16',withholdingCents:1000,withholdingDueDate:'2026-09-30'});
    assert.equal((await execute(payment)).status,200);assert.equal(report().cash.balanceCents,111000);
    assert.equal(report().dre.combined.netProfitCents,20000);
    assert.equal(latest.state.entries.filter(e=>e.sourceEntryId===owners[0].id).length,1);
    assert.equal((await execute(payment)).status,200);assert.equal(report().cash.balanceCents,111000);
    assert.equal(latest.state.entries.filter(e=>e.sourceEntryId===owners[0].id).length,1);
  });
  await t.test('ledger survives restart, audit is separate from team history and cannot be overwritten',async()=>{
    const expected=structuredClone(latest);api.close();api=createPortalApi({dbPath,now:()=>Date.parse('2026-09-16T15:00:00Z')});
    latest=(await request(admin,'/finance')).body;assert.deepEqual(latest,expected);
    const db=new DatabaseSync(dbPath);try{
      assert.equal(db.prepare('PRAGMA user_version').get().user_version,4);
      assert.equal(db.prepare("SELECT COUNT(*) n FROM audit WHERE action LIKE 'entry.%' OR action LIKE 'account.%'").get().n,0);
      assert.equal(db.prepare('SELECT COUNT(*) n FROM finance_audit').get().n,latest.version);
      assert.throws(()=>db.prepare("UPDATE finance_audit SET action='altered'").run(),/append-only/);
      assert.throws(()=>db.prepare('DELETE FROM finance_receipts').run(),/immutable/);
    }finally{db.close();}
  });
});

test('cloud adapter uses private RPC and replays successful commands without applying them again',async()=>{
  const admin={id:'00000000-0000-4000-8000-000000000001',name:'Administrador',role:'admin',active:true,must_change:false};
  let current={version:0,data:emptyFinance(),updated_at:'2026-09-16T12:00:00Z'},savedCalls=0;const receipts=new Map();
  const client={rest:async path=>{
    if(path.startsWith('eme_finance_state?'))return [current];
    if(path.startsWith('eme_finance_receipts?')){const requestId=path.split('request_id=eq.')[1].split('&')[0];return receipts.has(requestId)?[receipts.get(requestId)]:[];}
    if(path.startsWith('eme_finance_audit?'))return [];
    if(path.startsWith('eme_profiles?'))return [admin];
    if(path.startsWith('eme_cases?'))return [{id:'00000000-0000-4000-8000-000000000050',title:'Imóvel real'}];
    throw Error('Unexpected table '+path);
  },rpc:async(name,data)=>{
    assert.equal(name,'eme_save_finance');assert.equal(data.p_session,'hashed-session');
    if(receipts.has(data.p_request_id))return current;
    if(data.p_version!==current.version){const error=new Error('STALE_VERSION');error.status=409;throw error;}
    current={version:current.version+1,data:data.p_data,updated_at:'2026-09-16T13:00:00Z'};
    receipts.set(data.p_request_id,{payload_hash:data.p_payload_hash,actor_id:admin.id});savedCalls++;return current;
  }};
  const finance=attachCloudFinance({client,hashOf:()=> 'hashed-session'});let result;
  const invoke=async(body,user=admin)=>finance.handle('/api/finance/commands',{method:'POST'},{},user,body,(status,value)=>{result={status,...value};});
  const body={version:0,requestId:randomUUID(),command:{type:'settings.save',data:{reserveBps:1500}}};
  await assert.rejects(invoke(body,{...admin,role:'corretor'}),error=>error.status===403);
  await invoke(body);assert.equal(savedCalls,1);assert.equal(result.state.settings.reserveBps,1500);assert.equal(result.properties[0].title,'Imóvel real');
  await invoke(body);assert.equal(savedCalls,1);assert.equal(result.version,1);
  await assert.rejects(invoke({...body,command:{type:'settings.save',data:{reserveBps:2000}}}),error=>error.status===409);
  await assert.rejects(invoke({...body,requestId:randomUUID()}),error=>error.status===409);
});

test('cloud retry crossing a commit reaches the locked receipt check instead of failing early',async()=>{
  const admin={id:'00000000-0000-4000-8000-000000000001',role:'admin',active:true,must_change:false};
  const current={version:1,data:{...emptyFinance(),settings:{...emptyFinance().settings,reserveBps:1500}},updated_at:'2026-09-16T12:00:00Z'};
  let receiptCalls=0,rpcCalls=0,result;
  const client={rest:async path=>{
    if(path.startsWith('eme_finance_receipts?')){receiptCalls++;return [];}
    if(path.startsWith('eme_finance_state?'))return [current];
    if(path.startsWith('eme_profiles?'))return [admin];
    if(path.startsWith('eme_cases?')||path.startsWith('eme_finance_audit?'))return [];
    throw Error('Unexpected table');
  },rpc:async(name,input)=>{rpcCalls++;assert.equal(input.p_version,0);assert.equal(input.p_data,null);return current;}};
  await attachCloudFinance({client,hashOf:()=> 'session'}).handle('/api/finance/commands',{method:'POST'},{},admin,{version:0,requestId:randomUUID(),command:{type:'settings.save',data:{reserveBps:1500}}},(status,value)=>{result={status,...value};});
  assert.equal(receiptCalls,1);assert.equal(rpcCalls,1);assert.equal(result.status,200);assert.equal(result.version,1);assert.equal(result.state.settings.reserveBps,1500);
});

test('local finance uses current urban and rural listings while preserving evaluation identities',t=>{
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY,name TEXT,role TEXT,active INTEGER,must_change INTEGER);
    CREATE TABLE evaluations(id TEXT PRIMARY KEY,title TEXT,city TEXT,type TEXT,assignee_id TEXT);
    CREATE TABLE listings(id TEXT PRIMARY KEY,data TEXT);`);
  const admin={id:randomUUID(),name:'Admin',role:'admin',active:1,must_change:0};
  db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(admin.id,admin.name,admin.role,1,0);
  const urban=randomUUID(),rural=randomUUID(),legacy=randomUUID();
  const add=(id,title,type,draft)=>{
    db.prepare('INSERT INTO evaluations VALUES(?,?,?,?,?)').run(id,title,'Cidade anterior',type,admin.id);
    if(draft)db.prepare('INSERT INTO listings VALUES(?,?)').run(id,JSON.stringify(draft));
  };
  add(urban,'Título antigo da avaliação','Casa',{title:'Casa urbana atualizada',city:'Vacaria',type:'Casa',ownerContact:'não deve sair no catálogo'});
  add(rural,'Outra avaliação antiga','Terra agrícola',{title:'Fazenda cadastrada',city:'Bom Jesus',type:'Terra agrícola'});
  add(legacy,'Avaliação histórica sem anúncio','Terreno urbano');
  let response;
  const finance=attachFinance({db,stamp:()=> '2026-09-16T15:00:00Z',send:(_res,status,value)=>{response={status,...value};},transaction:fn=>{
    db.exec('BEGIN');try{fn();db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}
  }});
  const read=()=>finance.handle('/api/finance',{method:'GET'},{},admin);
  read();
  assert.deepEqual(response.properties.map(p=>[p.id,p.title,p.source]),[
    [urban,'Casa urbana atualizada','listing'],[rural,'Fazenda cadastrada','listing'],[legacy,'Avaliação histórica sem anúncio','evaluation'],
  ]);
  assert.equal(response.properties.find(p=>p.id===rural).type,'Terra agrícola');
  assert.equal(response.properties.find(p=>p.id===urban).city,'Vacaria');
  assert.ok(response.properties.every(p=>!('ownerContact'in p)&&!('data'in p)));
  const submit=propertyId=>finance.handle('/api/finance/commands',{method:'POST'},{},admin,{version:response.version,requestId:randomUUID(),command:{type:'entry.save',data:{description:'Honorários cadastrados',category:'sale_fee',amountCents:10000,recognition:'forecast',competenceDate:'2026-09-16',dueDate:'2026-09-30',propertyId}}});
  for(const propertyId of [urban,rural,legacy])submit(propertyId);
  assert.deepEqual(response.state.entries.map(e=>e.propertyId),[urban,rural,legacy]);
  const version=response.version;
  assert.throws(()=>submit(randomUUID()),/Imóvel: selecione um cadastro/);
  read();assert.equal(response.version,version);
  assert.throws(()=>finance.handle('/api/finance',{method:'GET'},{},{...admin,role:'corretor'}),error=>error.status===403);
});

test('cloud finance shares the listing catalog across reads and writes and excludes special records',async()=>{
  const admin={id:randomUUID(),name:'Admin',role:'admin',active:true,must_change:false};
  const urban=randomUUID(),rural=randomUUID(),legacy=randomUUID(),directory=randomUUID(),development=randomUUID();
  const rows=[
    {id:urban,title:'Avaliação antiga',listingTitle:'Casa urbana atualizada',listingCity:'Vacaria',listingType:'Casa',assignee_id:admin.id},
    {id:rural,title:'Nome antigo rural',listingTitle:'Fazenda cadastrada',listingCity:'Bom Jesus',listingType:'Terra agrícola',assignee_id:admin.id},
    {id:legacy,title:'Avaliação histórica sem anúncio',listingTitle:null,type:'Terreno urbano',city:'Vacaria',assignee_id:admin.id},
    {id:peopleRecordId,title:'Pessoas'}, {id:developmentRecordId,title:'Empreendimento'},
    {id:directory,title:'Outro diretório',kind:'directory'}, {id:development,title:'Outro empreendimento',kind:'development'},
  ];
  let state={version:0,data:emptyFinance(),updated_at:'2026-09-16T15:00:00Z'},writes=0,reads=0,response;
  const client={rest:async path=>{
    reads++;
    if(path.startsWith('eme_profiles?'))return [admin];
    if(path.startsWith('eme_cases?')){assert.ok(path.includes('listingTitle:data->draft->>title'));assert.ok(path.includes('&id=neq.'+developmentRecordId));return rows;}
    if(path.startsWith('eme_finance_state?'))return [state];
    if(path.startsWith('eme_finance_audit?')||path.startsWith('eme_finance_receipts?'))return [];
    throw Error('Unexpected request '+path);
  },rpc:async(name,body)=>{assert.equal(name,'eme_save_finance');writes++;state={...state,version:state.version+1,data:body.p_data};return state;}};
  const finance=attachCloudFinance({client,hashOf:()=> 'session'});
  const invoke=(path,body,user=admin)=>finance.handle(path,{method:body?'POST':'GET'},{},user,body,(status,value)=>{response={status,...value};});
  await assert.rejects(invoke('/api/finance',undefined,{...admin,role:'corretor'}),error=>error.status===403);
  assert.equal(reads,0);
  await invoke('/api/finance');
  assert.deepEqual(response.properties.map(p=>[p.id,p.title,p.source]),[
    [urban,'Casa urbana atualizada','listing'],[rural,'Fazenda cadastrada','listing'],[legacy,'Avaliação histórica sem anúncio','evaluation'],
  ]);
  const submit=propertyId=>invoke('/api/finance/commands',{version:state.version,requestId:randomUUID(),command:{type:'entry.save',data:{description:'Honorários cadastrados',category:'sale_fee',amountCents:10000,recognition:'forecast',competenceDate:'2026-09-16',dueDate:'2026-09-30',propertyId}}});
  for(const propertyId of [urban,rural,legacy])await submit(propertyId);
  assert.deepEqual(response.state.entries.map(e=>e.propertyId),[urban,rural,legacy]);
  for(const propertyId of [peopleRecordId,developmentRecordId,directory,development,randomUUID()])await assert.rejects(submit(propertyId),/Imóvel: selecione um cadastro/);
  assert.equal(writes,3);assert.equal(state.version,3);
});
