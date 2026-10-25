import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import http from 'node:http';
import {analyticsInput,analyticsBucket,analyticsDay,mergeAnalytics,analyticsReport,createAnalytics} from '../server/analytics.mjs';
import {attachCloudAnalytics} from '../server/cloud/analytics.mjs';
import {createCloudApi} from '../server/cloud/api.mjs';
import {internalKinds,propertyRecordsQuery} from '../shared/portal-content.mjs';
const now=new Date('2026-10-24T15:00:00Z'),property=randomUUID(),catalog=new Map([[property,'Casa publicada']]);
const event=(type='page_view',extra={})=>({id:randomUUID(),type,page:'home',...extra});
const input=(events=[event()])=>analyticsInput({session:randomUUID(),device:'mobile',source:'instagram',events});

test('analytics accepts only fixed categories and omits personal data',()=>{
 const data=analyticsInput({...input(),email:'private@example.test',ip:'127.0.0.1',search:'private query',events:[{...event(),message:'private message',url:'https://x.test/?phone=1'}]});
 assert.equal(JSON.stringify(data).includes('private'),false);
 assert.throws(()=>analyticsInput({...data,events:[event('section_click',{section:'arbitrary text'})]}),{status:400});
 assert.throws(()=>analyticsInput({...data,events:[event('page_view',{page:'admin'})]}),{status:400});
 assert.throws(()=>analyticsInput({...data,events:[event('property_click',{propertyId:'wrong'})]}),{status:400});
 assert.throws(()=>analyticsInput({...data,events:Array.from({length:21},()=>event())}),{status:400});
});

test('daily shards rotate session hashes at Brasília midnight and stay deterministic',()=>{
 const data=input(),before=new Date('2026-10-24T02:59:59Z'),after=new Date('2026-10-24T03:00:00Z');
 assert.equal(analyticsDay(before),'2026-10-23');assert.equal(analyticsDay(after),'2026-10-24');
 assert.deepEqual(analyticsBucket(data,after),analyticsBucket(data,after));
 assert.notEqual(analyticsBucket(data,before).session,analyticsBucket(data,after).session);
 assert.notEqual(analyticsBucket(data,after).session,data.session);
});

test('views, opening clicks, contact intent and delivered leads remain distinct',()=>{
 const data=input([event(),event('property_click',{propertyId:property}),event('page_view',{page:'property',propertyId:property}),event('section_click',{page:'property',propertyId:property,section:'whatsapp'}),event('section_view',{section:'team'})]),bucket=analyticsBucket(data,now);
 const first=mergeAnalytics(null,data,bucket,catalog,now);assert.equal(first.data.visits,1);assert.equal(first.data.pageViews,2);assert.equal(first.data.properties[property].views,1);assert.equal(first.data.properties[property].clicks,1);assert.equal(first.data.properties[property].contacts,1);
 assert.equal(mergeAnalytics(first.data,data,bucket,catalog,now).changed,false);
 const unknown=mergeAnalytics(first.data,input([event('page_view',{page:'property',propertyId:randomUUID()})]),bucket,catalog,now);assert.equal(unknown.changed,false);
 const report=analyticsReport([first.data],[{property_id:property,status:'new',created_at:now.toISOString()}],7,now);
 assert.equal(report.daily.length,7);assert.equal(report.visits,1);assert.equal(report.leads,1);assert.equal(report.landingViews,1);assert.equal(report.propertyViews,1);assert.equal(report.properties[0].leads,1);assert.equal(report.sections.find(s=>s.id==='team').views,1);
 assert.equal(report.sessions,undefined);assert.equal(report.receipts,undefined);
 const empty=analyticsReport([],[],30,now);assert.equal(empty.startedAt,null);assert.equal(empty.pageViews,0);assert.equal(empty.daily.length,30);
});

test('aggregation stays below the private storage record limit and flags incomplete dimensions',()=>{
 const data=input(),bucket=analyticsBucket(data,now);let value=mergeAnalytics(null,data,bucket,catalog,now).data;
 value.sessions=Array.from({length:1000},()=>randomUUID().replaceAll('-','').slice(0,24));value.receipts=Array.from({length:600},randomUUID);
 const many=new Map(Array.from({length:110},()=>[randomUUID(),'字'.repeat(120)]));
 for(const [id] of many)value=mergeAnalytics(value,input([event('property_click',{propertyId:id})]),bucket,many,now).data;
 assert.equal(value.limited,true);assert.equal(value.sessions.length,1000);assert.equal(value.receipts.length,600);assert.equal(Object.keys(value.properties).length,100);assert.ok(Buffer.byteLength(JSON.stringify(value))<135000);
});

test('collection filters exclude metric buckets and all private kinds',()=>{
 assert.ok(internalKinds.includes('site_analytics'));assert.ok(propertyRecordsQuery.includes('site_analytics'));
});

test('public measurement honors privacy headers and admin report rejects other roles',async()=>{
 let calls=0;const service=createAnalytics({store:{record:async()=>calls++,report:async()=>({})},rate:async()=>{},now:()=>now});const send=()=>{};
 for(const headers of [{dnt:'1'},{'sec-gpc':'1'},{'user-agent':'Googlebot'}])await service.publicHandle('/api/public/analytics',{method:'POST',headers},input(),send);
 assert.equal(calls,0);
 await service.publicHandle('/api/public/analytics',{method:'POST',headers:{}},input(),send);assert.equal(calls,1);
 for(const user of [null,{role:'corretor'},{role:'customer'},{role:'admin',active:false},{role:'admin',must_change:true}])await assert.rejects(service.handle('/api/analytics',{method:'GET',url:'/api/analytics'},user,send),{status:403});
 await assert.rejects(service.handle('/api/analytics',{method:'GET',url:'/api/analytics?days=999'},{role:'admin'},send),{status:400});
});

test('cloud collector ignores unpublished JSON nulls, retries conflicts and excludes reserved properties',async()=>{
 const records=new Map(),reserved=randomUUID();let conflict=true,pruned=false;const client={rpc:async()=>true,rest:async(path,method='GET',body)=>{
  if(path.includes('published=not.is.null')){assert.ok(path.includes('data->>published=not.is.null'));assert.ok(path.includes(propertyRecordsQuery));assert.ok(path.includes('order=id'));return [{id:randomUUID(),published:null},{id:randomUUID()},{id:randomUUID(),published:false},{id:property,published:{title:'Public property'}},{id:reserved,published:{title:'Private'},access:{visibility:'reserved'}}];}
  if(path.startsWith('eme_profiles?'))return [{id:randomUUID()}];
  if(method==='DELETE'){assert.match(path,/kind=eq.site_analytics/);assert.match(path,/day=lt/);pruned=true;return [];}
  if(method==='POST'){if(records.has(body.id))throw Object.assign(Error('Conflict'),{status:409});records.set(body.id,{...body,version:1});return [body];}
  const id=path.match(/id=eq.([\w-]+)/)?.[1],row=records.get(id);
  if(method==='PATCH'){if(conflict){conflict=false;return [];}assert.match(path,new RegExp('version=eq.'+row.version));records.set(id,{...row,...body});return [body];}
  return row?[structuredClone(row)]:[];
 }};
 const service=attachCloudAnalytics({client}),req={method:'POST',headers:{}},data=input([event(),event('page_view',{page:'property',propertyId:reserved})]);
 await service.publicHandle('/api/public/analytics',req,data,()=>{});assert.equal(records.size,1);assert.equal(pruned,true);
 await service.publicHandle('/api/public/analytics',req,{...data,events:[event('page_view',{page:'property',propertyId:property})]},()=>{});
 const row=[...records.values()][0];assert.equal(row.data.pageViews,2);assert.equal(row.data.properties[reserved],undefined);assert.equal(row.version,2);assert.equal(conflict,false);
 await service.publicHandle('/api/public/analytics',req,data,()=>{});assert.equal([...records.values()][0].data.pageViews,2);
});

test('cloud analytics HTTP is authenticated and aggregates only the requested period',async t=>{
 const token='a'.repeat(43),brokerToken='b'.repeat(43),hash=s=>createHash('sha256').update(s).digest('hex');const admin={id:randomUUID(),name:'Admin',role:'admin',active:true,must_change:false};
 const measured=input([event(),event('page_view',{page:'property',propertyId:property})]),measuredAt=new Date(),stored=mergeAnalytics(null,measured,analyticsBucket(measured,measuredAt),catalog,measuredAt).data;
 const client={request:async()=>{throw Error('Unexpected request');},rpc:async()=>true,rest:async path=>{
  if(path.startsWith('eme_sessions?'))return [{eme_profiles:{...admin,role:path.includes(hash(token))?'admin':'corretor'},expires_at:new Date(Date.now()+3600000).toISOString(),last_seen:new Date().toISOString()}];
  if(path.startsWith('eme_cases?')){assert.match(path,/kind=eq.site_analytics/);assert.match(path,/day=gte/);assert.match(path,/day=lte/);return [Object.fromEntries(['day','startedAt','visits','pageViews','pages','properties','sections','devices','sources','limited'].map(key=>[key,stored[key]]))];}
  if(path.startsWith('eme_leads?')){assert.match(path,/created_at=gte/);assert.match(path,/created_at=lt/);assert.ok(!path.includes('select=*'));return [];}
  throw Error(path);
 }};
 let service;const server=http.createServer((req,res)=>service.handle(req,res));await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));const host='127.0.0.1:'+server.address().port,origin='http://'+host;service=createCloudApi({env:{EME_TEST_HOST:host},client});
 const request=session=>fetch(origin+'/api/analytics?days=7',{headers:{Cookie:session?'eme_cloud_session='+session:''}});
 assert.equal((await request('')).status,401);assert.equal((await request(brokerToken)).status,403);const response=await request(token);assert.equal(response.status,200);const report=await response.json();assert.equal(report.daily.length,7);assert.equal(report.visits,1);assert.equal(report.landingViews,1);assert.equal(report.propertyViews,1);assert.equal(report.properties[0].views,1);
 const malformed=await fetch(origin+'/api/public/analytics',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({events:[]})});assert.equal(malformed.status,400);
});
import {portalRequestUrl} from '../api/portal.js';
test('production rewrite preserves analytics period and other endpoint query parameters',()=>{assert.equal(portalRequestUrl('/api/portal?route=analytics&days=7'),'/api/analytics?days=7');assert.equal(portalRequestUrl('/api/analytics?days=90'),'/api/analytics?days=90');assert.equal(portalRequestUrl('/api/portal?route=photos%2Ftest&original=1'),'/api/photos/test?original=1');});
