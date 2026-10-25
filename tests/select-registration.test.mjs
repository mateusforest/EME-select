import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '../server/cloud/client.mjs';
import {createSelectAccess} from '../server/select-access.mjs';
const id='11111111-1111-4111-8111-111111111111',adminId='22222222-2222-4222-8222-222222222222',pendingId='33333333-3333-4333-8333-333333333333';
const env={SUPABASE_URL:'https://auth.example.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-secret',VITE_SUPABASE_PUBLISHABLE_KEY:'test-public'};
test('confirmation failures distinguish provider email quota, SMTP configuration and user attempts',async()=>{
 for(const [code,status,expected,retry]of [['over_email_send_rate_limit',429,'confirmation_limit',3600],['email_address_not_authorized',400,'confirmation_unavailable',undefined],['email_not_confirmed',400,'email_unconfirmed',undefined],['signup_disabled',422,'signup_unavailable',undefined],['over_request_rate_limit',429,'attempt_limit',900]]){
  const client=createClient(env,async()=>Response.json({code,msg:'provider diagnostic'},{status}));await assert.rejects(client.request('/auth/v1/signup'),e=>{assert.equal(e.code,expected);assert.equal(e.retryAfter,retry);assert.ok(!e.message.includes('provider diagnostic'));return true;});
 }
 const client=createClient(env,async()=>Response.json({message:'RATE_LIMIT'},{status:400}));await assert.rejects(client.rpc('eme_limit',{}),{status:429,code:'attempt_limit',retryAfter:900});
});
function fixture(){
 const user={id,email:'client@example.invalid',created_at:'2026-10-24T00:00:00Z',email_confirmed_at:null,identities:[{id:'identity'}],user_metadata:{name:'Cliente',intent:'buyer'},confirmation_token:'DO NOT EXPOSE'};
 let profile=null,staff={id:adminId,role:'admin',must_change:false},duplicate=false,direct=false;const calls=[],limits=[];
 const client={request:async(path,args)=>{calls.push({path,args});if(path==='/auth/v1/admin/users'){if(duplicate)throw Object.assign(new Error('Duplicate'),{code:'account_exists'});return direct?user:{user};}if(path==='/auth/v1/resend')return {};if(path.startsWith('/auth/v1/admin/users?'))return {users:[user,{id:adminId,email:'admin@example.invalid'},{id:pendingId,email:'owner@example.invalid',user_metadata:{intent:'owner'},email_confirmed_at:'today'}]};if(path.startsWith('/auth/v1/admin/users/'))return {user};throw Error(path);},rest:async(path,method,body)=>{
  if(path==='eme_profiles?select=id')return [{id:adminId}];if(path.includes('role=eq.admin'))return [{id:adminId}];if(path.startsWith('eme_cases?id=eq.')){if(method==='PATCH')profile={...profile,...body};return profile?[profile]:[];}
  if(path==='eme_cases'&&method==='POST'){profile={...body,version:1};return [profile];}if(path.includes('kind=eq.select_account'))return profile?[profile]:[];if(path.startsWith('eme_cases?select='))return [];throw Error(path);
 }};
 const service=createSelectAccess({client,rate:async(k,max)=>limits.push({k,max}),staffSession:async()=>staff});
 const call=async(path,method='GET',body={})=>{let result;await service.handle('/api/select/'+path,{method,headers:{'x-forwarded-for':'192.0.2.1'}},{setHeader:()=>{}},body,(_,v)=>result=v);return result;};
 return {call,calls,limits,get profile(){return profile;},direct:()=>direct=true,duplicate:()=>duplicate=true,staff:v=>staff=v};
}
const payload={name:'Cliente',email:'client@example.invalid',password:'long-test-password',phone:'54999999999',document:'52998224725',privacyAccepted:true,contactConsent:true,intent:'buyer',role:'admin',owners:['all']};
test('successful registration creates the portal profile before confirmation or first login, without grants',async()=>{
 const f=fixture(),result=await f.call('register','POST',payload);assert.equal(result.authenticated,false);assert.equal(f.profile.id,id);assert.equal(f.profile.data.intent,'buyer');assert.equal(f.profile.data.role,undefined);assert.equal(f.profile.data.owners,undefined);assert.equal(f.profile.data.approval.status,'pending');assert.equal(f.profile.data.phone,'5554999999999');assert.equal(f.profile.data.document,'52998224725');assert.equal(f.profile.data.whatsapp,false);assert.equal(f.profile.data.contactConsent,true);assert.equal(f.profile.data.privacyConsent.accepted,true);assert.equal(f.profile.data.privacyConsent.version,'2026-10-25');assert.equal(f.limits.length,1);assert.equal(f.calls[0].args.body.email_confirm,true);assert.equal(f.calls[0].args.body.user_metadata.document,undefined);
});
test('invalid input does not consume registration quota and duplicate signup does not create a fake profile',async()=>{
 const f=fixture();await assert.rejects(f.call('register','POST',{...payload,password:'short'}),{status:400});assert.equal(f.limits.length,0);f.duplicate();await f.call('register','POST',payload);assert.equal(f.profile,null);
});
test('administrator sees accounts missing a portal profile, confirmation and intent, but never staff or auth secrets',async()=>{
 const f=fixture(),result=await f.call('admin');assert.equal(result.accounts.length,2);assert.equal(result.accounts[0].confirmed,false);assert.equal(result.accounts[0].version,0);assert.equal(result.accounts[0].lastSignIn,null);assert.equal(result.accounts[1].intent,'owner');assert.ok(!JSON.stringify(result).includes('DO NOT EXPOSE'));assert.ok(!result.accounts.some(a=>a.id===adminId));
});
test('legacy resend does not send mail or grant access',async()=>{const f=fixture();const result=await f.call('resend','POST',{email:'CLIENT@example.invalid'});assert.match(result.message,/liberado pela equipe/);assert.equal(f.calls.length,0);assert.equal(f.profile,null);});

test('reply to a legacy account creates its portal profile without approving identity or ownership',async()=>{
 const f=fixture();await f.call('admin','POST',{action:'reply',id,version:0,message:'Informe a referência do imóvel.'});assert.equal(f.profile.data.events[0].type,'reply');assert.equal(f.profile.data.owners,undefined);assert.ok(!f.calls.some(c=>c.args?.body?.email_confirm));
});

test('raw identity-provider user responses also create the portal record',async()=>{const f=fixture();f.direct();await f.call('register','POST',payload);assert.equal(f.profile.id,id);});
