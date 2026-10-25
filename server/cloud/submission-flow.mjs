import {createSubmissionFlow} from '../submission-flow.mjs';
import {createHash} from 'node:crypto';
export function attachCloudSubmissionFlow({client,ai}){
 const {rest,request,rpc}=client;
 return createSubmissionFlow({ai,rate:async(req,action)=>{const key=createHash('sha256').update(String(req.headers['x-forwarded-for']||'unknown').split(',')[0]).digest('hex');await rpc('eme_limit',{p_key:'submission-'+action+':'+key,p_max:action==='review'?8:80});if(action==='review')await rpc('eme_limit',{p_key:'submission-review:total',p_max:20});},store:{
  read:async id=>(await rest('eme_cases?id=eq.'+id))[0]||null,
  update:async(row,data)=>(await rest('eme_cases?id=eq.'+row.id+'&version=eq.'+row.version,'PATCH',{data,version:row.version+1,updated_at:new Date().toISOString()}))[0]||null,
  putPhoto:(_row,photo,bytes)=>request('/storage/v1/object/eme-property-photos/'+photo.id+'.webp',{method:'POST',raw:true,body:bytes,headers:{'Content-Type':'image/webp','x-upsert':'false'}}),
  deletePhoto:id=>request('/storage/v1/object/eme-property-photos',{method:'DELETE',body:{prefixes:[id+'.webp']}}),
  photoInputs:row=>Promise.all(row.data.photos.map(async p=>({id:p.id,bytes:Buffer.from(await(await request('/storage/v1/object/authenticated/eme-property-photos/'+p.id+'.webp',{raw:true})).arrayBuffer())}))),
  list:()=>rest('eme_cases?data->submission=not.is.null&order=created_at.desc&limit=200'),
 }});
}
