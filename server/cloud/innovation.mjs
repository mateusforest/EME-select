import {createHash} from 'node:crypto';
import {createInnovationApi} from '../innovation.mjs';
import {fail} from './domain.mjs';
export function attachCloudInnovation({client,save}){
 const {rest,rpc}=client;
 const read=async id=>(await rest('eme_cases?id=eq.'+id+'&select=id,version,data,assignee_id'))[0];
 return createInnovationApi({store:{
  read,
  list:(offset,limit)=>rest('eme_cases?select=id,version,data&data->>kind=eq.innovation_submission&data->>status=neq.deleted&order=created_at.desc,id&offset='+offset+'&limit='+limit),
  async receive(id,data){
   const previous=await read(id);if(previous){if(previous.data.kind!=='innovation_submission'||previous.data.hash!==data.hash)fail(409,'Esta apresentação mudou. Revise antes de enviar novamente.');return;}
   const owner=(await rest('eme_profiles?role=eq.admin&active=eq.true&select=id&order=created_at&limit=1'))[0];if(!owner)fail(503,'A equipe está indisponível para receber ideias. Tente mais tarde.');
   try{await rest('eme_cases','POST',{id,assignee_id:owner.id,data});}catch(error){if(error.status!==409)throw error;const current=await read(id);if(current?.data.kind!=='innovation_submission'||current.data.hash!==data.hash)fail(409,'Não foi possível confirmar este envio. Revise a apresentação.');}
  },
  update:(req,row,data,user)=>save(req,row,data,data.status==='deleted'?'Ideia excluída':'Ideia revisada','Apresentação recebida pela página Inovação.',user.id),
 },rate:async req=>{
  const ip=createHash('sha256').update(String(req.headers['x-forwarded-for']||'unknown').split(',')[0]).digest('hex');
  await rpc('eme_limit',{p_key:'innovation:'+ip,p_max:6});await rpc('eme_limit',{p_key:'innovation:total',p_max:100});
 }});
}
