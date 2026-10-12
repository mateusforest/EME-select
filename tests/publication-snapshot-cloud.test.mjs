import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {createCloudApi} from '../server/cloud/api.mjs';
import {draft,publicProperty,listing} from '../server/cloud/domain.mjs';

test('cloud publication survives draft removal and curation; old photos are revoked only after a new publication',async t=>{
 const id=randomUUID(),photoId=randomUUID(),token='a'.repeat(43),brokerToken='b'.repeat(43),hash=value=>createHash('sha256').update(value).digest('hex');
 const admin={id:randomUUID(),name:'Admin',role:'admin',active:true,must_change:false},broker={...admin,id:randomUUID(),role:'corretor'};
 let row={id,version:1,assignee_id:broker.id,data:{stage:'Entrada aprovada',draft:draft({title:'Casa em teste',city:'Vacaria',type:'Casa',environment:'urbano',condominium:'',operation:'comprar',price:500000,privateAddress:'PRIVATE_ADDRESS'}),photos:[{id:photoId,width:1200,height:800,caption:'Sala',room:'Área social'}]}};
 // JSONB changes object key order. It must not create a false "update pending".
 const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reorder(item)])):value;
 row.data.published=reorder(JSON.parse(JSON.stringify(publicProperty(row))));
 assert.equal(listing(row).hasUnpublishedChanges,false);
 let storageReads=0;
 const client={rest:async path=>{
  if(path.startsWith('eme_sessions?'))return [{eme_profiles:path.includes(hash(brokerToken))?broker:admin,expires_at:new Date(Date.now()+3600000).toISOString(),last_seen:new Date().toISOString()}];
  if(path.startsWith('eme_profiles?'))return [admin,broker];
  if(path.startsWith('eme_audit?'))return [];
  if(path.startsWith('eme_cases?select=id,data->published'))return row.data.published?[{id,published:row.data.published}]:[];
  if(path.startsWith('eme_cases?data->photos='))return row.data.photos.some(p=>p.id===photoId)?[structuredClone(row)]:[];
  if(path.startsWith('eme_cases?data->published->images='))return row.data.published?.images.some(p=>p.url==='/api/photos/'+photoId)?[structuredClone(row)]:[];
  if(path==='eme_cases?id=eq.'+id)return [structuredClone(row)];
  throw Error(path);
 },rpc:async(name,body)=>{assert.equal(name,'eme_save_case');assert.equal(body.p_version,row.version);row={...row,version:row.version+1,data:body.p_data};return structuredClone(row);},request:async path=>{assert.equal(path,'/storage/v1/object/authenticated/eme-property-photos/'+photoId+'.webp');storageReads++;return {arrayBuffer:async()=>Buffer.from('retained-photo')};}};
 let api;const server=http.createServer((req,res)=>api.handle(req,res));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const host='127.0.0.1:'+server.address().port,origin='http://'+host;api=createCloudApi({env:{EME_TEST_HOST:host},client});
 async function request(path,body,session=token,method=body?'POST':'GET'){const res=await fetch(origin+'/api'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:session?'eme_cloud_session='+session:''},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,body:res.headers.get('content-type')?.includes('application/json')?await res.json():await res.text()};}
 const patch={version:row.version,draft:{...row.data.draft,price:550000},photos:[]};
 assert.equal((await request('/listings/'+id,patch,brokerToken,'PATCH')).status,403);
 const edited=await request('/listings/'+id,patch,token,'PATCH');assert.equal(edited.status,200);assert.equal(edited.body.published,true);assert.equal(edited.body.hasUnpublishedChanges,true);
 const live=(await request('/public/properties',null,'')).body.properties[0];assert.equal(live.price,500000);assert.equal(live.images.length,1);assert.equal(live.privateAddress,undefined);
 assert.equal((await request('/photos/'+photoId,null,'')).body,'retained-photo');
 assert.equal((await request('/photos/'+photoId+'?original=1',null,'')).status,404);assert.equal(storageReads,1);
 const rejected=await request('/evaluations/'+id+'/decision',{version:row.version,action:'reject',reason:'Curadoria requer nova avaliação da equipe.'});assert.equal(rejected.status,200);assert.equal(row.data.stage,'Não selecionado');
 assert.equal((await request('/public/properties',null,'')).body.properties.length,1);
 const published=await request('/listings/'+id+'/publish',{version:row.version,confirmed:true,reviewMode:'simplified'});assert.equal(published.status,200);assert.equal(published.body.hasUnpublishedChanges,false);assert.equal(row.data.stage,'Não selecionado');
 assert.equal((await request('/photos/'+photoId,null,'')).status,404);assert.equal((await request('/public/properties',null,'')).body.properties[0].price,550000);
 const withdrawn=await request('/listings/'+id+'/unpublish',{version:row.version});assert.equal(withdrawn.status,200);assert.equal((await request('/public/properties',null,'')).body.properties.length,0);
});
