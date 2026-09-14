import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createPortalApi } from '../server/portal-api.mjs';

test('local portal: authenticated storage, permissions, audit and concurrency', async t => {
  mkdirSync('tmp',{recursive:true});
  const folder=mkdtempSync(resolve('tmp/portal-api-test-'));
  const dbPath=join(folder,'portal.sqlite');
  let clock=Date.now();
  let api=createPortalApi({dbPath,now:()=>clock});
  const server=http.createServer((req,res)=>api.handle(req,res));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));api.close();});
  const owner={cookie:''}, broker={cookie:''}, other={cookie:''}, anonymous={cookie:''};
  const initial='OnlyForTesting-2026-A!';
  const changed='OnlyForTesting-2026-B!';
  async function request(client,path,method='GET',body,extra={}){
    const response=await fetch(origin+'/api'+path,{method,headers:{...(method!=='GET'?{'Content-Type':'application/json',Origin:origin}:{}),...(client.cookie?{Cookie:client.cookie}:{}),...extra},...(method!=='GET'?{body:JSON.stringify(body??{})}:{})});
    const setCookie=response.headers.get('set-cookie');
    if(setCookie)client.cookie=setCookie.split(';')[0];
    return {status:response.status,body:await response.json(),headers:response.headers};
  }
  let ownerId,brokerId,otherId,caseId;
  await t.test('no default credentials and setup can run only once',async()=>{
    assert.equal((await request(anonymous,'/evaluations')).status,401);
    assert.equal((await request(anonymous,'/auth/session')).body.needsSetup,true);
    assert.equal((await request(anonymous,'/auth/setup','POST',{name:'Owner',email:'owner@example.test',password:initial},{Origin:'https://malicious.example'})).status,403);
    const response=await request(owner,'/auth/setup','POST',{name:'Owner Test',email:'owner@example.test',password:initial});
    assert.equal(response.status,201);ownerId=response.body.user.id;
    assert.match(response.headers.get('set-cookie'),/HttpOnly/);
    assert.match(response.headers.get('set-cookie'),/SameSite=Strict/);
    assert.equal((await request(anonymous,'/auth/setup','POST',{name:'Intruder',email:'other@example.test',password:initial})).status,409);
  });
  await t.test('accounts are server-controlled and initial password must change',async()=>{
    const first=await request(owner,'/users','POST',{name:'Broker One',email:'broker@example.test',password:initial,role:'corretor'});
    assert.equal(first.status,201);brokerId=first.body.user.id;
    const second=await request(owner,'/users','POST',{name:'Broker Two',email:'other@example.test',password:initial,role:'corretor'});
    assert.equal(second.status,201);otherId=second.body.user.id;
    assert.equal((await request(broker,'/auth/login','POST',{email:'broker@example.test',password:initial})).status,200);
    assert.equal((await request(broker,'/evaluations')).status,403);
    assert.equal((await request(broker,'/auth/password','POST',{currentPassword:initial,newPassword:changed})).status,200);
    assert.equal((await request(broker,'/users')).status,403);
    assert.equal((await request(broker,'/users','POST',{name:'Bad',email:'bad@example.test',password:initial,role:'admin'})).status,403);
    await request(other,'/auth/login','POST',{email:'other@example.test',password:initial});
    await request(other,'/auth/password','POST',{currentPassword:initial,newPassword:changed});
  });
  await t.test('new records are empty of fabricated scores and assigned by policy',async()=>{
    const data={title:'Casa de teste',city:'Caxias do Sul',type:'Casa',operation:'Venda',owner:'Solicitante de teste',assigneeId:brokerId};
    assert.equal((await request(broker,'/evaluations','POST',{...data,assigneeId:otherId})).status,403);
    assert.equal((await request(owner,'/evaluations','POST',{...data,stage:'Entrada aprovada'})).status,400);
    const result=await request(owner,'/evaluations','POST',data);
    assert.equal(result.status,201);caseId=result.body.evaluation.id;
    assert.equal(result.body.evaluation.stage,'Recebido');
    assert.equal(result.body.evaluation.scores,undefined);
    assert.equal(result.body.history.length,1);
    assert.equal(result.body.history[0].author,'Owner Test');
    assert.equal((await request(broker,'/evaluations')).body.evaluations.length,1);
    assert.equal((await request(other,'/evaluations')).body.evaluations.length,0);
    assert.equal((await request(other,'/evaluations/'+caseId)).status,404);
    assert.equal((await request(other,'/evaluations/'+caseId,'PATCH',{version:1,note:'Should not work'})).status,404);
  });
  await t.test('audit survives changes, stale updates fail and approval cannot be forged',async()=>{
    assert.equal((await request(broker,'/evaluations/'+caseId,'PATCH',{version:1,stage:'Entrada aprovada',note:'Pretend approval'})).status,400);
    assert.equal((await request(broker,'/evaluations/'+caseId,'PATCH',{version:1,note:'Changed author',actor:'Intruder'})).status,400);
    const updated=await request(broker,'/evaluations/'+caseId,'PATCH',{version:1,stage:'Em avaliação',note:'Primeira leitura registrada.'});
    assert.equal(updated.status,200);assert.equal(updated.body.evaluation.version,2);
    assert.equal(updated.body.history[0].author,'Broker One');
    const conflict=await request(owner,'/evaluations/'+caseId,'PATCH',{version:1,note:'Old concurrent edit'});
    assert.equal(conflict.status,409);
    assert.equal((await request(owner,'/evaluations/'+caseId)).body.history.length,2);
    assert.equal((await request(owner,'/evaluations/'+caseId,'PATCH',{version:2,note:'Missing origin'}, {Origin:''})).status,403);
  });
  await t.test('data and sessions persist across database reconnection',async()=>{
    api.close();api=createPortalApi({dbPath,now:()=>clock});
    const result=await request(broker,'/evaluations/'+caseId);
    assert.equal(result.status,200);assert.equal(result.body.history.length,2);
    const database=new DatabaseSync(dbPath,{readOnly:true});
    const row=database.prepare('SELECT password_hash FROM users WHERE id=?').get(ownerId);
    assert.notEqual(row.password_hash,initial);assert.equal(row.password_hash.includes(initial),false);
    assert.equal(JSON.stringify(database.prepare('SELECT * FROM audit').all()).includes(initial),false);
    const token=owner.cookie.split('=')[1];assert.equal(database.prepare('SELECT COUNT(*) AS n FROM sessions WHERE token_hash=?').get(token).n,0);
    database.close();
  });
  await t.test('suspension revokes sessions and active owner cannot suspend self',async()=>{
    assert.equal((await request(owner,'/users/'+ownerId,'PATCH',{active:false})).status,400);
    assert.equal((await request(owner,'/users/'+brokerId,'PATCH',{active:false})).status,200);
    assert.equal((await request(broker,'/evaluations/'+caseId)).status,401);
    assert.equal((await request(broker,'/auth/login','POST',{email:'broker@example.test',password:changed})).status,401);
    assert.equal((await request(owner,'/evaluations/'+caseId)).status,200);
    assert.equal((await request(owner,'/users/'+brokerId,'PATCH',{active:true})).status,200);
  });
  await t.test('password rotation revokes earlier sessions and idle expiry is server-side',async()=>{
    const ownerSecond={cookie:''};
    await request(ownerSecond,'/auth/login','POST',{email:'owner@example.test',password:initial});
    assert.equal((await request(owner,'/auth/password','POST',{currentPassword:initial,newPassword:changed})).status,200);
    assert.equal((await request(ownerSecond,'/evaluations')).status,401);
    clock+=31*60*1000;
    assert.equal((await request(owner,'/evaluations')).status,401);
    await request(owner,'/auth/login','POST',{email:'owner@example.test',password:changed});
    const old={cookie:owner.cookie};
    await request(owner,'/auth/logout','POST');
    assert.equal((await request(old,'/evaluations')).status,401);
  });
  await t.test('login attempts are rate limited and errors do not expose account state',async()=>{
    for(let i=0;i<8;i++){const result=await request(anonymous,'/auth/login','POST',{email:'absent@example.test',password:'wrong'});assert.equal(result.status,401);assert.equal(result.body.error,'E-mail ou senha inválidos.');}
    assert.equal((await request(anonymous,'/auth/login','POST',{email:'absent@example.test',password:'wrong'})).status,429);
  });
});

