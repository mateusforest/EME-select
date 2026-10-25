import test from 'node:test';
import assert from 'node:assert/strict';
import {createSelectAccess,canRead,publicAccess} from '../server/select-access.mjs';
import {validDocument,cleanPhone} from '../shared/select-approval.mjs';
const customer='11111111-1111-4111-8111-111111111111',admin='22222222-2222-4222-8222-222222222222',property='33333333-3333-4333-8333-333333333333';
function fixture(){
 let actor=null,profile={id:customer,version:1,assignee_id:admin,data:{kind:'select_account',name:'Pessoa teste',email:'test@example.test',document:'52998224725',phone:'5554999999999',contactConsent:true,favorites:[],search:{},events:[],approval:{status:'pending'}}};
 const auth={id:customer,email:'test@example.test',user_metadata:{name:'Pessoa teste',approval:{status:'approved'},role:'admin'},email_confirmed_at:null};
 let listing={id:property,version:1,data:{title:'Resort de teste',published:{id:property,title:'Resort de teste',price:1000,image:'/api/photos/test'},access:{visibility:'reserved',allowed:[],owners:[]},ownerUpdates:[]}};
 const calls=[],audits=[];
 const client={request:async(path,args)=>{calls.push({path,args});if(path==='/auth/v1/user')return auth;if(path.startsWith('/auth/v1/admin/users?'))return {users:[auth]};if(path==='/auth/v1/admin/users/'+customer){if(args?.method==='PUT')auth.email_confirmed_at='confirmed-by-review';return auth;}if(path.startsWith('/auth/v1/token'))return {user:auth,access_token:'private-token'};throw Error(path);},rest:async(path,method,data)=>{if(path==='eme_profiles?select=id')return [{id:admin}];if(path.startsWith('eme_profiles?id='))return [];if(path.startsWith('eme_cases?id=eq.'+customer)){if(method==='PATCH'){if(!path.endsWith('version=eq.'+profile.version))return [];profile={...profile,...data};}return [profile];}if(path.includes('kind=eq.select_account'))return [profile];if(path.startsWith('eme_cases?select='))return [listing];throw Error(path);}};
 const service=createSelectAccess({client,staffSession:async()=>actor,rate:async()=>{},closeStaffSession:async()=>{},saveCase:async(req,row,data,action)=>{const current=row.id===customer?profile:listing;if(current.version!==row.version)throw Object.assign(Error('stale'),{status:409});const updated={...row,data,version:row.version+1};if(row.id===customer)profile=updated;else listing=updated;audits.push(action);return updated;}});
 const req={headers:{cookie:'eme_select_token=private-token'}};
 async function call(path,method='GET',body={}){let result;await service.handle('/api/select/'+path,{...req,method},{setHeader:()=>{}},body,(_,v)=>result=v);return result;}
 return {service,req,call,calls,audits,get profile(){return profile;},get listing(){return listing;},staff:role=>actor=role?{id:admin,name:'Gestão',role,active:true,must_change:false}:null,legacy:()=>delete profile.data.approval};
}
test('documents are validated without transmitting them to any provider',()=>{assert.ok(validDocument('529.982.247-25'));assert.ok(validDocument('11.222.333/0001-81'));for(const v of ['11111111111','52998224724','',null])assert.equal(validDocument(v),false);assert.equal(cleanPhone('(54) 99999-9999'),'5554999999999');assert.equal(cleanPhone('123'),null);});
test('pending and legacy accounts get only a status screen; claims in auth metadata do not grant access',async()=>{const f=fixture();for(let i=0;i<2;i++){const result=await f.call('me');assert.equal(result.pending,true);for(const key of ['properties','owned','profile','document'])assert.equal(result[key],undefined);assert.equal(await f.service.identity(f.req),null);await assert.rejects(f.call('requests','POST',{type:'message',text:'Test'}),{status:403});await assert.rejects(f.call('documents/'+property),{status:403});f.legacy();}assert.equal(f.calls.some(c=>c.path.startsWith('/storage/')),false);});
test('approval is admin-only, versioned and explicitly reviewed; suspension revokes private inventory and photo identity immediately',async()=>{
 const f=fixture(),decision={action:'approval',id:customer,version:1,status:'approved',reviewed:true,note:'Conferido pelo canal informado'};
 await assert.rejects(f.call('admin','POST',decision),{status:403});f.staff('corretor');await assert.rejects(f.call('admin','POST',decision),{status:403});f.staff('admin');await assert.rejects(f.call('admin','POST',{...decision,reviewed:false}),{status:400});await f.call('admin','POST',decision);assert.equal(f.profile.data.approval.status,'approved');assert.equal(f.calls.filter(c=>c.args?.body?.email_confirm).length,1);await assert.rejects(f.call('admin','POST',decision),{status:409});f.staff(null);
 const space=await f.call('me');assert.equal(space.properties[0].id,property);assert.equal(space.profile.document,undefined);assert.equal(space.profile.approval,undefined);assert.equal((await f.service.identity(f.req)).id,customer);
 await f.call('me','PATCH',{version:2,search:{region:'Vacaria'},approval:{status:'approved'},role:'admin'});assert.equal(f.profile.data.role,undefined);
 f.staff('admin');await f.call('admin','POST',{...decision,version:3,status:'suspended'});f.staff(null);assert.equal((await f.call('me')).pending,true);assert.equal(await f.service.identity(f.req),null);assert.equal(f.audits.length,2);
});
test('reserved inventory and ownership grants require approved accounts, and archived records never become readable',async()=>{
 const f=fixture();f.staff('admin');const access={action:'access',id:property,version:1,visibility:'individual',allowed:[customer],owners:[],publicAt:null};await assert.rejects(f.call('admin','POST',access),{status:400});await f.call('admin','POST',{action:'approval',id:customer,version:1,status:'approved',reviewed:true});await f.call('admin','POST',access);assert.equal(publicAccess(f.listing),false);assert.ok(canRead(f.listing,customer));assert.equal(canRead(f.listing,admin),false);assert.equal(canRead({...f.listing,data:{...f.listing.data,archived:true}},customer),false);assert.equal(publicAccess({...f.listing,data:{...f.listing.data,deletedAt:'today',access:{visibility:'public'}}}),false);
});

// Suspending a customer revokes access without forcing property links to be erased.
test('existing grants can be retained or removed during suspension, but new grants are refused',async()=>{
 const f=fixture();f.staff('admin');await f.call('admin','POST',{action:'approval',id:customer,version:1,status:'approved',reviewed:true});
 const access={action:'access',id:property,version:1,visibility:'individual',allowed:[customer],owners:[],publicAt:null};await f.call('admin','POST',access);
 await f.call('admin','POST',{action:'approval',id:customer,version:2,status:'suspended'});
 await f.call('admin','POST',{...access,version:2});assert.deepEqual(f.listing.data.access.allowed,[customer]);
 await assert.rejects(f.call('admin','POST',{...access,version:3,owners:[customer],ownershipVerified:true}),{status:400});
 await f.call('admin','POST',{...access,version:3,allowed:[]});
 await assert.rejects(f.call('admin','POST',{...access,version:4}),{status:400});
 f.staff(null);assert.equal(await f.service.identity(f.req),null);
});
