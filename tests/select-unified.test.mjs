import test from 'node:test';
import assert from 'node:assert/strict';
import {createSelectAccess} from '../server/select-access.mjs';
import {canonicalSelectPath} from '../shared/select-routes.mjs';

test('legacy bookmarks retain their destination under the single Select route',()=>{
 assert.equal(canonicalSelectPath('/acesso-select/equipe/carteira'),'/acesso-select/equipe/imoveis');
 for(const [from,to] of [['/portalselect','/acesso-select/equipe'],['/portalselect/imoveis','/acesso-select/equipe/imoveis'],['/portalselect/demo/carteira','/acesso-select/equipe/imoveis'],['/acesso-select','/acesso-select'],['/portalselect-other','/portalselect-other']])assert.equal(canonicalSelectPath(from),to);
});

const ownerId='11111111-1111-4111-8111-111111111111',propertyId='22222222-2222-4222-8222-222222222222',documentId='33333333-3333-4333-8333-333333333333';
function fixture(){
 let staff=null,member=null,identity={id:ownerId,email:'test@example.com',email_confirmed_at:'today',user_metadata:{intent:'owner'}};
 let profile={id:ownerId,version:1,data:{kind:'select_account',approval:{status:'approved'},name:'Pessoa teste',intent:'owner',favorites:[],search:{},events:[]}};
 let property={id:propertyId,version:1,data:{title:'Imóvel em preparação',city:'Vacaria',draft:{privateAddress:'NEVER EXPOSE',ownerContact:'NEVER EXPOSE'},published:null,access:{visibility:'individual',owners:[],allowed:[]},ownerUpdates:[{id:documentId,type:'document',text:'Documento compartilhado'}]}};
 const calls=[],headers={};
 const res={setHeader:(k,v)=>headers[k]=v,getHeader:k=>headers[k],end:()=>{}};
 const client={
  request:async(path,args)=>{calls.push(path);if(path.startsWith('/auth/v1/admin/users?'))return {users:[identity]};if(path==='/auth/v1/user')return identity;if(path.startsWith('/auth/v1/token'))return {user:identity,access_token:'test-token',expires_in:3600};if(path.startsWith('/storage/'))return new Response('test');if(path==='/auth/v1/logout')return {};throw Error(path);},
  rest:async(path,method,body)=>{
   if(path==='eme_profiles?select=id')return [];
   if(path.startsWith('eme_profiles?id='))return member?[member]:[];
   if(path.startsWith('eme_cases?id=eq.'+ownerId)){if(method==='PATCH')profile={...profile,...body};return [profile];}
   if(path.includes('kind=eq.select_account'))return [profile];
   if(path.includes('published=not.is.null'))return property.data.published?[property]:[];
   if(path.startsWith('eme_cases?select=*'))return [property];
   throw Error(path);
  }
 };
 const service=createSelectAccess({client,rate:async()=>{},staffSession:async()=>staff,openStaffSession:async(req,r)=>r.setHeader('Set-Cookie','staff=active'),closeStaffSession:async(req,r)=>r.setHeader('Set-Cookie','staff=; Max-Age=0'),saveCase:async(req,row,data)=>property={...row,data,version:row.version+1}});
 async function call(path,method='GET',body={}){let output;await service.handle('/api/select/'+path,{method,headers:{cookie:'eme_select_token=test'}},res,body,(_,v)=>output=v);return output;}
 return {call,headers,calls,get profile(){return profile;},get property(){return property;},staff:v=>staff=v,member:v=>member=v,owner:v=>property.data.access.owners=v};
}

test('login routes only authorized staff and clears the other session cookie',async()=>{
 const f=fixture();f.member({id:ownerId,role:'corretor',active:true});assert.deepEqual(await f.call('login','POST',{email:'test@example.com',password:'test-password'}),{staff:true});assert.ok(f.headers['Set-Cookie'].some(c=>c==='staff=active'));assert.ok(f.headers['Set-Cookie'].some(c=>c.includes('eme_select_token=;')&&c.includes('Max-Age=0')));
 f.member({id:ownerId,role:'admin',active:false});await assert.rejects(f.call('login','POST',{email:'test@example.com',password:'test-password'}),{status:403});
 f.member(null);assert.deepEqual(await f.call('login','POST',{email:'test@example.com',password:'test-password'}),{staff:false,pending:false});assert.ok(f.headers['Set-Cookie'].includes('staff=; Max-Age=0'));assert.ok(f.headers['Set-Cookie'].some(c=>c.includes('eme_select_token=test-token')));
});

test('owner intent and ownership requests never grant access; verified links do, even before publication',async()=>{
 const f=fixture();let space=await f.call('me');assert.equal(space.owned.length,0);
 await f.call('requests','POST',{type:'ownership',text:'Meu imóvel em Vacaria',owners:[ownerId],role:'admin'});
 assert.equal(f.profile.data.events[0].type,'ownership');assert.equal(f.property.data.access.owners.length,0);
 f.owner([ownerId]);space=await f.call('me');assert.equal(space.owned.length,1);assert.equal(space.owned[0].status,'Em preparação');assert.equal(space.properties.length,0);assert.ok(!JSON.stringify(space).includes('NEVER EXPOSE'));
 f.owner([]);assert.equal((await f.call('me')).owned.length,0);await assert.rejects(f.call('documents/'+documentId),{status:404});assert.ok(!f.calls.some(c=>c.startsWith('/storage/')));
});

test('only administrators can add verified owner links; concurrent edits remain guarded',async()=>{
 const f=fixture(),payload={action:'access',id:propertyId,version:1,visibility:'individual',allowed:[],owners:[ownerId]};
 await assert.rejects(f.call('admin','POST',payload),{status:404});
 f.staff({id:'staff',role:'corretor'});await assert.rejects(f.call('admin','POST',{...payload,ownershipVerified:true}),{status:404});
 f.staff({id:'staff',role:'admin',must_change:false});await assert.rejects(f.call('admin','POST',payload),{status:400});
 await f.call('admin','POST',{...payload,ownershipVerified:true});assert.deepEqual(f.property.data.access.owners,[ownerId]);
 await assert.rejects(f.call('admin','POST',{...payload,owners:[]}),{status:409});
 await f.call('admin','POST',{...payload,version:2,owners:[]});assert.deepEqual(f.property.data.access.owners,[]);
});

test('staff identity tokens cannot bypass suspension through the customer area',async()=>{
 const f=fixture();f.member({id:ownerId,role:'corretor',active:false});await assert.rejects(f.call('me'),{status:403});
});

test('logout expires both account sessions',async()=>{
 const f=fixture();await f.call('logout','POST');assert.ok(f.headers['Set-Cookie'].includes('staff=; Max-Age=0'));assert.ok(f.headers['Set-Cookie'].some(c=>c.includes('eme_select_token=;')&&c.includes('Max-Age=0')));
});
