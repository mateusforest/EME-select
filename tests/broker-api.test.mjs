import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createPortalApi} from '../server/portal-api.mjs';
test('broker HTTP: isolated portfolios and commissions with real sessions, persisted agreements and replay protection',async t=>{
 mkdirSync('tmp',{recursive:true});const dbPath=join(mkdtempSync(resolve('tmp/broker-api-')),'portal.sqlite');
 const api=createPortalApi({dbPath,now:()=>Date.parse('2026-10-12T18:00:00Z')});const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(done=>server.listen(0,'127.0.0.1',done));t.after(async()=>{await new Promise(done=>server.close(done));api.close();});
 const origin='http://127.0.0.1:'+server.address().port,password='Broker-Test-Only-2026!',admin={},one={},two={},anon={};
 async function request(who,path,body,method=body?'POST':'GET'){
  const response=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:who.cookie||''},...(body?{body:JSON.stringify(body)}:{})});if(response.headers.get('set-cookie'))who.cookie=response.headers.get('set-cookie').split(';')[0];return {status:response.status,body:await response.json()};
 }
 assert.equal((await request(anon,'/broker/commissions')).status,401);
 await request(admin,'/auth/setup',{name:'Gestão Select',email:'admin@broker.test',password});
 for(const [who,name] of [[one,'Primeiro'],[two,'Segundo']]){await request(admin,'/users',{name:name+' Corretor',email:name+'@broker.test',password,role:'corretor'});await request(who,'/auth/login',{email:name+'@broker.test',password});assert.equal((await request(who,'/broker/commissions')).status,403);await request(who,'/auth/password',{currentPassword:password,newPassword:password+'2'});}
 const finance=(await request(admin,'/finance')).body;const first=finance.members.find(m=>m.name==='Primeiro Corretor'),second=finance.members.find(m=>m.name==='Segundo Corretor');
 const property=(await request(admin,'/evaluations',{title:'Imóvel teste de carteira',city:'Porto Alegre',type:'Casa',operation:'Venda',owner:'Pessoa de teste',assigneeId:first.id})).body.evaluation;
 assert.ok(property.id);
 let version=finance.version;
 async function command(type,data){const payload={version,requestId:randomUUID(),command:{type,data}};const response=await request(admin,'/finance/commands',payload);assert.equal(response.status,200,JSON.stringify(response.body));version=response.body.version;return {response,payload};}
 await command('broker.origin',{propertyId:property.id,captorId:second.id,reason:'Indicação original preservada'});
 const saved=await command('broker.save',{propertyId:property.id,captorId:second.id,model:'Captação e venda',feeCents:100000,participants:[{brokerId:first.id,role:'Venda',bps:3000},{brokerId:second.id,role:'Captação',bps:2000}],terms:'Honorários recebidos e contrato aprovado'});
 const mine=(await request(one,'/broker/commissions?brokerId='+second.id)).body;
 assert.equal(mine.totals.potentialCents,30000);assert.equal(mine.portfolio[0].captor,'Segundo Corretor');assert.equal(mine.portfolio[0].responsible,'Primeiro Corretor');assert.ok(!JSON.stringify(mine).includes(second.id));
 const other=(await request(two,'/broker/commissions')).body;assert.equal(other.totals.potentialCents,20000);assert.equal(other.portfolio.length,0);
 assert.equal((await request(one,'/finance')).status,403);assert.equal((await request(one,'/finance/commands',saved.payload)).status,403);assert.equal((await request(one,'/broker/commissions',{})).status,405);
 const closed=await command('broker.close',{id:saved.response.body.state.brokerAgreements[0].id,actualFeeCents:200000,competenceDate:'2026-10-12',dueDate:'2026-10-20',note:'Fechamento de teste'});
 assert.equal((await request(admin,'/finance/commands',closed.payload)).body.version,version);
 const after=(await request(one,'/broker/commissions')).body;assert.equal(after.entries.length,1);assert.equal(after.totals.potentialCents,0);assert.equal(after.totals.receivableCents,60000);assert.equal(after.totals.receivedCents,0);
 const reassigned=await request(admin,'/evaluations/'+property.id,{version:property.version,stage:'Recebido',assigneeId:second.id,note:'Responsável alterado mantendo a origem da captação'},'PATCH');assert.equal(reassigned.status,200);
 assert.equal((await request(one,'/broker/commissions')).body.portfolio.length,0);const transferred=(await request(two,'/broker/commissions')).body;assert.equal(transferred.portfolio[0].captor,'Segundo Corretor');assert.equal(transferred.portfolio[0].responsible,'Segundo Corretor');
});
