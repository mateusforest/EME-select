import test from 'node:test';
import assert from 'node:assert/strict';
import {attachSwitchPortfolio} from '../server/cloud/switch-portfolio.mjs';
import {attachCloudSwitch} from '../server/cloud/switch.mjs';
const id='3e6ddfa5-8aaa-4e10-b6ac-d155c52f8476';
const admin={id,role:'admin',active:true,must_change:false};
const row=(extra={},property={})=>({id,data:{published:{id,title:'Casa sintética',operation:'comprar',isIllustrative:false,price:400000,type:'Casa',location:'Centro · Vacaria - RS',...property},...extra}});
test('live portfolio omits private, deleted, archived, illustrative, rental and unpriced listings',async()=>{
 let records=[row(),row({archived:true}),row({deletedAt:'today'}),row({access:{visibility:'reserved'}}),row({}, {price:null}),row({},{operation:'alugar'}),row({},{isIllustrative:true})];
 const client={rest:async path=>path.startsWith('eme_cases?')?records:[]};
 const portfolio=attachSwitchPortfolio({client,priceProperties:async rows=>rows.map(p=>({...p,price:p.price===400000?390000:p.price}))});
 const offers=await portfolio.offers();assert.equal(offers.length,1);assert.equal(offers[0].city,'Vacaria');assert.equal(offers[0].price_cents,39000000);
 records=[row({archived:true})];assert.equal(await portfolio.resolve(id),null,'an old match cannot revive an archived listing');
});
test('catalog pagination includes listings beyond the first page',async()=>{
 const records=Array.from({length:501},(_,i)=>({...row(),id:String(i),data:{...row().data,published:{...row().data.published,id:String(i)}}}));
 const client={rest:async path=>{const params=new URLSearchParams(path.split('?')[1]);return records.slice(Number(params.get('offset')),Number(params.get('offset'))+500);}};
 assert.equal((await attachSwitchPortfolio({client}).offers()).length,501);
});
test('CRM connection is admin-only, idempotent and requires contact review without enabling marketing',async()=>{
 const records=[],lead={id,status:'contacted',assignee_id:id,data:{name:'Contato sintético',phone:'5554999999999',qualification:{profile:{operation:'comprar',city:'Vacaria',propertyType:'Casa',budgetMax:500000,contactPermission:'granted'}}}};
 const client={rest:async path=>path.startsWith('eme_leads?')?[lead]:[],request:async(_,{body})=>{if(!records.some(r=>r.request_id===body.request_id))records.push(body);}};
 const portfolio=attachSwitchPortfolio({client}),body={leadId:id,reviewConfirmed:true},send=()=>{};
 await assert.rejects(portfolio.handle('/api/switch/portfolio/leads',{method:'POST'},{...admin,role:'corretor'},body,send),e=>e.status===403);
 await assert.rejects(portfolio.handle('/api/switch/portfolio/leads',{method:'POST'},admin,{leadId:id},send),e=>e.status===400);
 await portfolio.handle('/api/switch/portfolio/leads',{method:'POST'},admin,body,send);
 await portfolio.handle('/api/switch/portfolio/leads',{method:'POST'},admin,body,send);
 assert.equal(records.length,1);assert.equal(records[0].status,'reviewing');assert.equal(records[0].demand_reviewed,false);assert.equal(records[0].updates_opt_in,false);assert.equal(records[0].owner_id,id);assert.equal(records[0].consent_recorded_at,null);
 assert.ok(await portfolio.checkDemand(records[0]));
 lead.data.qualification.profile.contactPermission='declined';
 assert.equal(await portfolio.checkDemand(records[0]),null);
 await assert.rejects(portfolio.handle('/api/switch/portfolio/leads',{method:'POST'},admin,body,send),e=>e.status===409);
});
test('staff requests are not silently truncated after 300 records',async()=>{
 const data=Array.from({length:501},(_,i)=>({id:String(i)}));
 const service=attachCloudSwitch({client:{rest:async path=>{const p=new URLSearchParams(path.split('?')[1]);return data.slice(Number(p.get('offset')),Number(p.get('offset'))+500);}},rate:async()=>{}});
 let response;await service.handle('/api/switch',{method:'GET'},admin,null,(_status,value)=>{response=value;});
 assert.equal(response.requests.length,501);
});
