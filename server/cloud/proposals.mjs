import {createProposalsApi} from '../proposals.mjs';
export function attachCloudProposals({client,save,property}){
 return createProposalsApi({property,store:{
  read:async id=>(await client.rest('eme_cases?id=eq.'+id+'&select=id,version,data,assignee_id'))[0],
  list:(user,offset,limit)=>client.rest('eme_cases?select=id,version,data,assignee_id&data->>kind=eq.acquisition_proposal'+(user.role==='admin'?'':'&assignee_id=eq.'+user.id)+'&order=updated_at.desc,id&offset='+offset+'&limit='+limit),
  write:(req,row,data)=>save(req,row,data,'Proposta salva','Condições comerciais registradas no portal.'),
 }});
}
