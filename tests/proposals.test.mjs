import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {createPortalApi} from '../server/portal-api.mjs';
import {createCloudApi} from '../server/cloud/api.mjs';
import {proposalDefaults,validateProposal} from '../shared/acquisition-proposal.mjs';
import {allRecords} from '../shared/staff-inventory.mjs';
import {internalKinds} from '../shared/portal-content.mjs';
const valid=()=>({...proposalDefaults({id:randomUUID(),draft:{title:'Terreno de teste',city:'Vacaria',price:275000}},{name:'Consultor de teste',email:'teste@example.test'},'2026-10-25'),clientName:'Cliente de demonstração',validUntil:'2026-10-30',included:'Aquisição do terreno. Área e matrícula serão conferidas.',payments:[{label:'Entrada',note:'No aceite.',amount:55000},{label:'Saldo',note:'Na escritura.',amount:220000}]});
test('commercial validation keeps amounts exact, dates valid and input bounded',()=>{
 assert.equal(validateProposal(valid()).proposedPrice,275000);
 for(const change of [{proposedPrice:275001},{validUntil:'2026-02-30'},{validUntil:'2026-10-24'},{clientName:''},{payments:[]},{payments:[{label:'Saldo',note:'',amount:Infinity}]},{photoId:'../private'},{published:true},{included:'x'.repeat(1601)},{advertisedPrice:12.001}])assert.throws(()=>validateProposal({...valid(),...change}),{status:400});
});
test('staff inventory fetches beyond database response limits',async()=>{
 const data=Array.from({length:1201},(_,id)=>({id}));const offsets=[];
 const result=await allRecords(async query=>{const n=Number(new URLSearchParams(query.split('?')[1]).get('offset'));offsets.push(n);return data.slice(n,n+500);},'eme_cases?order=id');
 assert.equal(result.length,1201);assert.deepEqual(offsets,[0,500,1000]);assert.ok(internalKinds.includes('acquisition_proposal'));
});
test('shared inventory and private proposals work through authenticated local routes',async t=>{
 const api=createPortalApi({dbPath:':memory:',env:{}}),server=http.createServer(api.handle);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(r=>server.close(r));api.close();});
 const admin={},broker={},other={},anon={},password='Proposal-test-only-2026!';
 async function call(who,path,body,method=body?'POST':'GET'){const r=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,Cookie:who.cookie||'','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(r.headers.get('set-cookie'))who.cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,data:await r.json()};}
 await call(admin,'/auth/setup',{name:'Admin teste',email:'admin@example.test',password});
 for(const [who,email]of [[broker,'broker@example.test'],[other,'other@example.test']]){await call(admin,'/users',{name:'Corretor de teste',email,password,role:'corretor'});await call(who,'/auth/login',{email,password});await call(who,'/auth/password',{currentPassword:password,newPassword:password+'2'});}
 const d={title:'Imóvel de toda a equipe',city:'Vacaria',type:'Casa',environment:'urbano',locationProfile:'cidade',condominium:'',operation:'comprar',price:275000,ownerName:'Contato reservado',ownerContact:'privado',privateAddress:'Endereço privado'};
 // Use a valid public location profile from the domain rather than a test-only bypass.
 const {profilesFor}=await import('../shared/locations.mjs');d.locationProfile=profilesFor('urbano')[0].value;
 const created=await call(admin,'/listings',{draft:d});assert.equal(created.status,201,JSON.stringify(created));const listing=created.data;
 const inventory=await call(broker,'/listings');assert.equal(inventory.data.listings.length,1);assert.equal(inventory.data.listings[0].canEdit,false);assert.equal(inventory.data.listings[0].draft.ownerName,'');assert.equal((await call(broker,'/listings/'+listing.id)).status,200);assert.equal((await call(anon,'/listings')).status,401);
 assert.equal((await call(broker,'/listings/'+listing.id,{version:listing.version,draft:d,photos:[]},'PATCH')).status,404);
 assert.equal((await call(broker,'/evaluations/'+listing.id)).status,404,'private dossier remains assigned');
 const proposal={...valid(),propertyId:listing.id},id=randomUUID(),endpoint='/proposals/'+id;
 const saved=await call(broker,endpoint,{version:0,proposal});assert.equal(saved.status,201,JSON.stringify(saved));assert.equal(saved.data.version,1);
 assert.equal((await call(broker,endpoint,{version:0,proposal})).status,409);
 assert.equal((await call(anon,endpoint)).status,401);assert.equal((await call(other,endpoint)).status,404);assert.equal((await call(other,'/proposals')).data.proposals.length,0);assert.equal((await call(admin,'/proposals')).data.proposals.length,1);
 assert.equal((await call(broker,'/listings')).data.listings.length,1,'proposals never enter the inventory');assert.equal((await call(anon,'/public/properties')).data.properties.length,0);
 assert.equal((await call(broker,endpoint,{version:1,proposal:{...proposal,photoId:randomUUID()}})).status,400);
 assert.equal((await call(broker,endpoint+'/archive',{version:1,archived:true})).data.archived,true);
 assert.equal((await call(broker,endpoint+'/archive',{version:2,archived:false})).data.archived,false);
 const archived=await call(admin,'/listings/'+listing.id+'/archive',{version:listing.version,archived:true,confirmed:true});assert.equal(archived.status,200);
 assert.equal((await call(broker,endpoint,{version:3,proposal})).status,409);
 assert.equal((await call(admin,'/listings/'+listing.id+'/delete',{version:(await call(admin,'/listings/'+listing.id)).data.version,confirmed:true})).status,200);
 assert.equal((await call(broker,'/listings')).data.listings.length,0);
});
test('cloud routes share the staff portfolio but isolate proposals and mutation access',async t=>{
 const user={id:randomUUID(),name:'Corretor teste',email:'broker@example.test',role:'corretor',active:true,must_change:false};
 const owner=randomUUID(),itemId=randomUUID(),rows=new Map([[itemId,{id:itemId,assignee_id:owner,version:1,data:{title:'Casa da equipe',city:'Vacaria',stage:'Recebido',draft:{title:'Casa da equipe',city:'Vacaria',features:'',reasons:'',ownerName:'Privado'},photos:[]}}]]);let savedCalls=0;
 const client={
  async rest(query,method='GET',body){const url=new URL('https://test/'+query),p=url.searchParams;
   if(url.pathname==='/eme_sessions')return method==='GET'?[{eme_profiles:user,expires_at:new Date(Date.now()+600000).toISOString(),last_seen:new Date().toISOString()}]:[];
   if(url.pathname==='/eme_profiles')return [user,{id:owner,name:'Gestão'}];
   if(url.pathname==='/eme_cases'){let out=[...rows.values()];if(p.has('id'))out=out.filter(r=>r.id===p.get('id').slice(3));if(p.has('data->>kind'))out=out.filter(r=>r.data.kind===p.get('data->>kind').slice(3));if(p.has('or'))out=out.filter(r=>!internalKinds.includes(r.data.kind));if(p.has('assignee_id'))out=out.filter(r=>r.assignee_id===p.get('assignee_id').slice(3));return out.slice(Number(p.get('offset')||0),Number(p.get('offset')||0)+Number(p.get('limit')||1000));}
   return [];
  },
  async rpc(name,args){assert.equal(name,'eme_save_case');savedCalls++;assert.equal(args.p_assignee,user.id);const row={id:args.p_id,version:args.p_version+1,assignee_id:args.p_assignee,data:args.p_data};rows.set(row.id,row);return row;},request:async()=>{throw Error('Unexpected request');},
 };
 const env={},api=createCloudApi({client,env}),server=http.createServer(api.handle);await new Promise(r=>server.listen(0,'127.0.0.1',r));env.EME_TEST_HOST='127.0.0.1:'+server.address().port;t.after(()=>new Promise(r=>server.close(r)));
 async function call(path,body,method=body?'POST':'GET'){const res=await fetch('http://127.0.0.1:'+server.address().port+'/api'+path,{method,headers:{Origin:'http://'+env.EME_TEST_HOST,Cookie:'eme_cloud_session='+'a'.repeat(43),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,data:await res.json()};}
 const portfolio=await call('/listings');assert.equal(portfolio.status,200);assert.equal(portfolio.data.listings[0].draft.ownerName,'');assert.equal((await call('/listings/'+itemId)).status,200);assert.equal((await call('/listings/'+itemId,{version:1,draft:{}},'PATCH')).status,404);
 const result=await call('/proposals/'+randomUUID(),{version:0,proposal:{...valid(),propertyId:itemId}});assert.equal(result.status,201,JSON.stringify(result));assert.equal(savedCalls,1);assert.equal((await call('/proposals')).data.proposals.length,1);assert.equal((await call('/listings')).data.listings.length,1);
});
