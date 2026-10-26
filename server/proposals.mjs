import {proposalKind,validateProposal} from '../shared/acquisition-proposal.mjs';
import {fail,fields,checkVersion} from './cloud/domain.mjs';
export function createProposalsApi({store,property}) {
 const visible=(row,user)=>row?.data.kind===proposalKind&&(user.role==='admin'||row.assignee_id===user.id);
 const present=row=>({id:row.id,version:row.version,...row.data.record});
 return {async handle(path,req,user,body,send){
  if(path==='/api/proposals'&&req.method==='GET'){
   const rows=[];for(let offset=0;;offset+=500){const page=await store.list(user,offset,500);rows.push(...page.filter(r=>visible(r,user)));if(page.length<500)break;}
   send(200,{proposals:rows.map(present)});return true;
  }
  const match=path.match(/^\/api\/proposals\/([a-f0-9-]{36})(\/archive)?$/);if(!match)return false;
  const id=match[1],row=await store.read(id);
  if(row&&!visible(row,user))fail(404,'Proposta não encontrada.');
  if(req.method==='GET'&&!match[2]){if(!row)fail(404,'Proposta não encontrada.');send(200,present(row));return true;}
  if(req.method!=='POST')fail(405,'Operação indisponível.');
  fields(body,match[2]?['version','archived']:['version','proposal']);checkVersion(row||{version:0},body);
  let record;
  if(match[2]){if(!row)fail(404,'Proposta não encontrada.');if(typeof body.archived!=='boolean')fail(400,'Confira a situação da proposta.');record={...row.data.record,archived:body.archived};}
  else {
   const proposal=validateProposal(body.proposal),listing=await property(proposal.propertyId,user);
   if(!listing||listing.archived)fail(409,'Escolha um imóvel ativo da carteira.');
   if(proposal.photoId&&!listing.photos.some(p=>p.id===proposal.photoId))fail(400,'A foto precisa pertencer ao imóvel escolhido.');
   const stamp=new Date().toISOString();record={reference:row?.data.record.reference||'SEL-'+stamp.slice(0,4)+'-'+id.slice(0,8).toUpperCase(),createdAt:row?.data.record.createdAt||stamp,updatedAt:stamp,archived:false,author:row?.data.record.author||user.name,proposal};
  }
  record.updatedAt=new Date().toISOString();
  const saved=await store.write(req,row||{id,version:0,assignee_id:user.id},{kind:proposalKind,record},user);
  send(row?200:201,present(saved));return true;
 }};
}
