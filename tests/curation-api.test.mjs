import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createPortalApi } from '../server/portal-api.mjs';
import { readCuration, LEGACY_POLICY, SELECT_POLICY } from '../server/curation-policy.mjs';

test('curation: evidence, review gates, decisions, revisions and migration',async t=>{
  mkdirSync('tmp',{recursive:true});const dbPath=join(mkdtempSync(resolve('tmp/curation-test-')),'portal.sqlite');
  let api=createPortalApi({dbPath});
  const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const origin='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(r=>server.close(r));api.close();});
  const admin={},broker={},outsider={};const password='Test-Only-Curation-2026!';let data,brokerId;
  async function req(who,path,body,method=body?'POST':'GET') {
    const res=await fetch(origin+'/api'+path,{method,headers:{Cookie:who.cookie||'',Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    if(res.headers.get('set-cookie'))who.cookie=res.headers.get('set-cookie').split(';')[0];
    return {status:res.status,body:await res.json()};
  }
  function payload(value=data) {return {version:value.evaluation.version,criteria:value.curation.criteria.map(({key,score,note})=>({key,score,note})),checks:value.curation.checks.map(({key,state,note})=>({key,state,note})),pending:value.curation.pending};}
  const route=suffix=>'/evaluations/'+data.evaluation.id+suffix;
  async function update(body,who=admin){const res=await req(who,route('/curation'),body);assert.equal(res.status,200,JSON.stringify(res.body));data=res.body;return data;}
  async function decide(action,who=admin,extra={}){return req(who,route('/decision'),{version:data.evaluation.version,action,reason:'Revisão documentada para o teste controlado.',...extra});}
  await t.test('existing schema migrates without changing accounts or evaluations',async()=>{
    await req(admin,'/auth/setup',{name:'Admin Teste',email:'admin@example.test',password});
    brokerId=(await req(admin,'/users',{name:'Corretor Teste',email:'broker@example.test',password,role:'corretor'})).body.user.id;
    await req(broker,'/auth/login',{email:'broker@example.test',password});await req(broker,'/auth/password',{currentPassword:password,newPassword:password+'2'});
    await req(admin,'/users',{name:'Outro Teste',email:'other@example.test',password,role:'corretor'});
    await req(outsider,'/auth/login',{email:'other@example.test',password});await req(outsider,'/auth/password',{currentPassword:password,newPassword:password+'2'});
    data=(await req(admin,'/evaluations',{title:'Terreno de teste',city:'Caxias do Sul',type:'Terreno urbano',operation:'Venda',assigneeId:brokerId})).body;
    api.close();const old=new DatabaseSync(dbPath);old.exec('DROP TABLE curation; PRAGMA user_version=1;');const before=old.prepare('SELECT count(*) n FROM users').get().n;old.close();api=createPortalApi({dbPath});
    const check=new DatabaseSync(dbPath,{readOnly:true});assert.equal(check.prepare('PRAGMA user_version').get().user_version,4);assert.equal(check.prepare('SELECT count(*) n FROM users').get().n,before);check.close();
    const read=await req(broker,route(''));assert.equal(read.status,200);data=read.body;assert.equal(data.curation.score,null);assert.equal(data.curation.criteria[0].label,'Condição do terreno e conservação');assert.equal(data.evaluation.version,1);assert.equal(data.curation.policy,SELECT_POLICY);assert.equal(data.curation.criteria.length,5);assert.equal(data.curation.checks.length,6);
    assert.deepEqual(data.curation,readCuration({type:'Terreno urbano',stage:'Recebido'}));
  });
  await t.test('server rejects forged scores, invalid notes and foreign portfolios',async()=>{
    assert.equal((await req(outsider,route(''))).status,404);
    assert.equal((await req(outsider,route('/curation'),payload())).status,404);
    assert.equal((await req(admin,route('/curation'),{...payload(),score:100})).status,400);
    assert.equal((await req(admin,route('/curation'),{...payload(),policy:LEGACY_POLICY})).status,400);
    const p=payload();p.criteria[0].score=5;p.criteria[0].note='';assert.equal((await req(admin,route('/curation'),p)).status,400);
    p.criteria[0].note='Referência datada de teste.';p.criteria[0].score=5.5;assert.equal((await req(admin,route('/curation'),p)).status,400);
    assert.equal((await decide('submit')).status,409);
  });
  await t.test('high score never bypasses documentary review; broker cannot sign off',async()=>{
    const p=payload();p.criteria=p.criteria.map(c=>({...c,score:5,note:'Fonte de teste observada em 14/09/2026.'}));
    await update(p,broker);assert.equal(data.curation.score,100);assert.equal(data.curation.blockers.length,6);assert.equal(data.curation.coverage,5);
    const stored=new DatabaseSync(dbPath,{readOnly:true});const saved=JSON.parse(stored.prepare('SELECT data FROM curation WHERE evaluation_id=?').get(data.evaluation.id).data);stored.close();assert.equal(saved.policy,SELECT_POLICY);assert.equal(saved.family,'land');assert.deepEqual(data.curation,readCuration({saved,type:'Terreno urbano',stage:data.evaluation.stage}));
    assert.equal((await decide('submit',broker)).status,409);
    const checks=payload();checks.checks=checks.checks.map(c=>({...c,state:'Conferido',note:'Responsável de teste, fonte de teste, 14/09/2026; escopo conferido.'}));
    assert.equal((await req(broker,route('/curation'),checks)).status,403);
    const stale={...checks,version:1};assert.equal((await req(admin,route('/curation'),stale)).status,409);
    await update(checks);assert.equal(data.curation.blockers.length,0);
    assert.equal(data.curation.checks[0].author,'Admin Teste');
  });
  await t.test('minimum dimension and unresolved issues block the queue',async()=>{
    const p=payload();p.criteria[0].score=3;await update(p);assert.equal(data.curation.score,90);assert.equal((await decide('submit')).status,409);
    const below=payload();below.criteria=below.criteria.map(c=>({...c,score:4}));await update(below);assert.equal(data.curation.score,80);assert.equal((await decide('submit')).status,409);
    p.version=data.evaluation.version;p.criteria[0].score=5;p.pending='Conferir divergência de área';await update(p);assert.equal((await decide('submit')).status,409);
    const complete=payload();complete.pending='';await update(complete);
  });
  await t.test('approval requires review stage, admin and human acknowledgement',async()=>{
    assert.equal((await decide('approve',admin,{acknowledged:true})).status,409);
    const queued=await decide('submit',broker);assert.equal(queued.status,200);data=queued.body;
    assert.equal((await decide('approve',broker,{acknowledged:true})).status,403);
    assert.equal((await decide('approve')).status,400);
    assert.equal((await req(admin,route(''),{version:data.evaluation.version,stage:'Em avaliação',note:'Bypass attempt'},'PATCH')).status,409);
    const approved=await decide('approve',admin,{acknowledged:true});assert.equal(approved.status,200);data=approved.body;
    assert.equal(data.evaluation.stage,'Entrada aprovada');assert.equal(data.curation.locked,true);assert.equal(data.history[0].author,'Admin Teste');assert.match(data.history[0].detail,/sem publicação automática/);assert.match(data.history[0].detail,/EME-select-v2-pilot/);
    assert.equal((await req(admin,route('/curation'),payload())).status,409);assert.equal((await decide('approve',admin,{acknowledged:true})).status,409);
  });
  await t.test('reopening preserves history and requires fresh sign-offs',async()=>{
    const historyCount=data.history.length;const reopened=await decide('reopen');assert.equal(reopened.status,200);data=reopened.body;
    assert.equal(data.evaluation.stage,'Em avaliação');assert.equal(data.history.length,historyCount+1);assert.equal(data.curation.checks.every(c=>c.state==='Em revisão'),true);assert.equal((await decide('submit')).status,409);
    const rejected=await decide('reject');assert.equal(rejected.status,200);data=rejected.body;assert.equal(data.evaluation.stage,'Não selecionado');
    api.close();api=createPortalApi({dbPath});const restored=await req(admin,route(''));assert.equal(restored.body.history.length,data.history.length);assert.equal(restored.body.curation.score,100);
  });
  await t.test('existing four-criterion decisions keep the old policy and score after reopening',async()=>{
    data=(await req(admin,'/evaluations',{title:'Casa histórica de teste',city:'Caxias do Sul',type:'Casa',operation:'Venda',assigneeId:brokerId})).body;
    const oldPolicy=readCuration({saved:{policy:LEGACY_POLICY},type:'Casa'});
    const oldSnapshot={criteria:oldPolicy.criteria.map(c=>({key:c.key,score:4,note:'Referência histórica datada, preservada para teste.'})),checks:oldPolicy.checks.map(c=>({key:c.key,state:'Conferido',note:'Conferência histórica de teste com fonte e escopo.',author:'Responsável anterior',date:'2026-09-14T10:00:00.000Z'})),pending:''};
    const fixture=new DatabaseSync(dbPath);fixture.prepare('INSERT INTO curation VALUES (?,?)').run(data.evaluation.id,JSON.stringify(oldSnapshot));fixture.prepare("UPDATE evaluations SET stage='Entrada aprovada' WHERE id=?").run(data.evaluation.id);fixture.close();
    data=(await req(admin,route(''))).body;assert.equal(data.curation.policy,LEGACY_POLICY);assert.equal(data.curation.score,80);assert.equal(data.curation.criteria.length,4);assert.equal(data.curation.checks.length,4);assert.equal(data.curation.locked,true);
    const reopened=await decide('reopen');assert.equal(reopened.status,200);data=reopened.body;assert.equal(data.curation.policy,LEGACY_POLICY);assert.equal(data.curation.score,80);assert.ok(data.curation.checks.every(c=>c.state==='Em revisão'));assert.match(data.history[0].detail,/EME-piloto-01/);
    const p=payload();p.checks=p.checks.map(c=>({...c,state:'Conferido'}));await update(p);assert.equal(data.curation.score,80);assert.equal(data.curation.blockers.length,0);
    const queued=await decide('submit');assert.equal(queued.status,200);data=queued.body;const approved=await decide('approve',admin,{acknowledged:true});assert.equal(approved.status,200);data=approved.body;
    const stored=new DatabaseSync(dbPath,{readOnly:true});const saved=JSON.parse(stored.prepare('SELECT data FROM curation WHERE evaluation_id=?').get(data.evaluation.id).data);stored.close();assert.equal(saved.policy,LEGACY_POLICY);assert.equal(saved.criteria.length,4);assert.equal(data.curation.score,80);
  });
});
