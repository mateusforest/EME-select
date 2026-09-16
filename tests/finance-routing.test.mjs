import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {createCloudApi} from '../server/cloud/api.mjs';
import {emptyFinance} from '../shared/finance.mjs';

test('cloud HTTP routing authenticates finance before reading the ledger and preserves its admin boundary',async t=>{
  const profiles=[{id:randomUUID(),name:'Administrador teste',email:'admin@example.invalid',role:'admin',active:true,must_change:false},{id:randomUUID(),name:'Corretor teste',email:'broker@example.invalid',role:'corretor',active:true,must_change:false}];
  const sessions=new Map(),receipts=new Map(),history=[];let ledger={version:0,data:emptyFinance(),updated_at:new Date().toISOString()},reads=0,writes=0;
  const reject=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const client={
    request:async(path,{body})=>{
      if(path!=='/auth/v1/token?grant_type=password')throw Error('Unexpected auth operation');
      const user=profiles.find(profile=>profile.email===body.email);
      if(!user||body.password!=='Finance-routing-test-only!')reject(401,'Dados inválidos.');
      return {user:{id:user.id}};
    },
    rest:async(path,method='GET',body)=>{
      if(path==='eme_sessions'&&method==='POST'){sessions.set(body.token_hash,{...body,last_seen:new Date().toISOString()});return [body];}
      if(path.startsWith('eme_sessions?token_hash=eq.')){
        const token=path.split('token_hash=eq.')[1].split('&')[0],session=sessions.get(token);
        if(method==='DELETE'){sessions.delete(token);return null;}
        if(method==='PATCH'){if(session)Object.assign(session,body);return session?[session]:[];}
        return session?[{...session,eme_profiles:profiles.find(profile=>profile.id===session.user_id)}]:[];
      }
      if(path.startsWith('eme_profiles?id=eq.'))return profiles.filter(profile=>profile.id===path.split('id=eq.')[1]);
      if(path.startsWith('eme_profiles?'))return profiles;
      if(path.startsWith('eme_finance_state?')){reads++;return [ledger];}
      if(path.startsWith('eme_finance_receipts?')){const receipt=receipts.get(path.split('request_id=eq.')[1].split('&')[0]);return receipt?[receipt]:[];}
      if(path.startsWith('eme_finance_audit?'))return history;
      if(path.startsWith('eme_cases?'))return [];
      throw Error('Unexpected private data request: '+path);
    },
    rpc:async(name,body)=>{
      if(name==='eme_limit')return null;
      assert.equal(name,'eme_save_finance');
      const actor=profiles.find(profile=>profile.id===sessions.get(body.p_session)?.user_id);
      assert.equal(actor?.role,'admin');assert.equal(actor.active,true);assert.equal(body.p_version,ledger.version);
      ledger={version:ledger.version+1,data:body.p_data,updated_at:new Date().toISOString()};writes++;
      receipts.set(body.p_request_id,{actor_id:actor.id,payload_hash:body.p_payload_hash});
      history.push({id:writes,action:body.p_command.type,state_version:ledger.version,created_at:ledger.updated_at,eme_profiles:{name:actor.name}});
      return ledger;
    },
  };
  let api;const server=http.createServer((req,res)=>api.handle(req,res));
  await new Promise(done=>server.listen(0,'127.0.0.1',done));t.after(()=>new Promise(done=>server.close(done)));
  const host='127.0.0.1:'+server.address().port,origin='http://'+host;api=createCloudApi({env:{EME_TEST_HOST:host},client});
  const admin={},broker={},anonymous={};
  async function request(who,path,body,headers={},method=body?'POST':'GET'){
    const response=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:who.cookie||'',...headers},...(body?{body:JSON.stringify(body)}:{})});
    if(response.headers.get('set-cookie'))who.cookie=response.headers.get('set-cookie').split(';')[0];
    return {status:response.status,body:await response.json(),headers:response.headers};
  }
  const command={version:0,requestId:randomUUID(),command:{type:'settings.save',data:{cashTargetCents:250000}}};
  assert.equal((await request(anonymous,'/finance')).status,401);assert.equal(reads,0);
  assert.equal((await request(anonymous,'/finance/commands',command)).status,401);assert.equal(writes,0);
  const login=await request(admin,'/auth/login',{email:profiles[0].email,password:'Finance-routing-test-only!'});
  assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict; Secure/);
  const adminToken=admin.cookie.split('=')[1];assert.equal(sessions.get(hash(adminToken)).user_id,profiles[0].id);
  const initial=await request(admin,'/finance');assert.equal(initial.status,200);assert.deepEqual(initial.body.state,emptyFinance());assert.match(initial.headers.get('cache-control'),/private, no-store/);
  await request(broker,'/auth/login',{email:profiles[1].email,password:'Finance-routing-test-only!'});
  const priorReads=reads;
  assert.equal((await request(broker,'/finance')).status,403);
  assert.equal((await request(broker,'/finance/commands',command)).status,403);assert.equal(reads,priorReads);assert.equal(writes,0);
  assert.equal((await request(admin,'/finance/commands',command,{Origin:'https://untrusted.invalid'})).status,403);
  assert.equal((await request(admin,'/finance/commands',command,{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await request(admin,'/finance/commands',command,{},'PATCH')).status,405);assert.equal(writes,0);
  const saved=await request(admin,'/finance/commands',command);assert.equal(saved.status,200);assert.equal(saved.body.version,1);assert.equal(saved.body.state.settings.cashTargetCents,250000);assert.equal(writes,1);
  assert.equal((await request(admin,'/finance/commands',command)).status,200);assert.equal(writes,1);
  profiles[0].must_change=true;assert.equal((await request(admin,'/finance')).status,403);
  profiles[0].must_change=false;profiles[0].active=false;assert.equal((await request(admin,'/finance')).status,401);assert.equal(writes,1);
});
