import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createCloudApi} from '../server/cloud/api.mjs';
test('cloud final OK records approval atomically without completing documentary checks',async t=>{
 const id='00000000-0000-4000-8000-000000000010',token='a'.repeat(43),brokerToken='b'.repeat(43),hash=v=>createHash('sha256').update(v).digest('hex');
 const admin={id:'00000000-0000-4000-8000-000000000001',name:'Admin',role:'admin',active:true,must_change:false},broker={...admin,id:'00000000-0000-4000-8000-000000000002',role:'corretor'};
 let row={id,version:3,assignee_id:broker.id,data:{stage:'Em avaliação',draft:{title:'Casa',city:'Vacaria',neighborhood:'Centro',type:'Casa',environment:'urbano',operation:'comprar',price:200000,area:90,description:'Descrição do imóvel com informações suficientes para conferir a apresentação antes de autorizar a publicação.',features:'',reasons:'',privateAddress:'SEGREDO'},photos:[{id:'00000000-0000-4000-8000-000000000030',width:870,height:652,caption:'',room:''}],published:null}},writes=0;
 const client={request:async()=>{throw Error('Unexpected storage');},rest:async path=>{
  if(path.startsWith('eme_sessions?'))return [{eme_profiles:path.includes(hash(brokerToken))?broker:admin,expires_at:new Date(Date.now()+3600000).toISOString(),last_seen:new Date().toISOString()}];
  if(path.startsWith('eme_cases?'))return [structuredClone(row)];
  throw Error(path);
 },rpc:async(name,body)=>{assert.equal(name,'eme_save_case');assert.equal(body.p_version,row.version);assert.match(body.p_detail,/simplificada/);row={...row,version:row.version+1,data:body.p_data};writes++;return structuredClone(row);}};
 let api;const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const host='127.0.0.1:'+server.address().port,origin='http://'+host;api=createCloudApi({env:{EME_TEST_HOST:host},client});
 async function publish(body,session=token){const res=await fetch(origin+'/api/listings/'+id+'/publish',{method:'POST',headers:{Origin:origin,Cookie:'eme_cloud_session='+session,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:res.status,body:await res.json()};}
 const body={version:3,confirmed:true,reviewMode:'simplified'};
 assert.equal((await publish({...body,confirmed:false})).status,400);assert.equal((await publish({...body,version:2})).status,409);assert.equal((await publish(body,brokerToken)).status,403);assert.equal(writes,0);
 const response=await publish(body);assert.equal(response.status,200,JSON.stringify(response.body));assert.equal(response.body.published,true);assert.equal(row.data.stage,'Entrada aprovada');assert.equal(row.data.curation,undefined);assert.equal(row.data.published.privateAddress,undefined);assert.equal(row.data.published.images[0].width,870);assert.equal(writes,1);
 row.data.draft={...row.data.draft,price:null,area:null,neighborhood:'',description:'',reasons:''};row.data.photos=[];row.data.published=null;row.data.stage='Em avaliação';
 const minimal=await publish({...body,version:row.version});
 assert.equal(minimal.status,200,JSON.stringify(minimal.body));assert.equal(minimal.body.published,true);assert.deepEqual(minimal.body.blockers,[]);
 assert.equal(row.data.published.location,'Vacaria');assert.equal(row.data.published.image,'/assets/property-placeholder.svg');assert.deepEqual(row.data.published.images,[]);

});
