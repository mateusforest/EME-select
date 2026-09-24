import {developmentRecordId} from '../../shared/development.mjs';
import {applyOperationsCommand,operationsScope} from '../../shared/operations.mjs';
import {financeFingerprint} from '../finance.mjs';
import {operationsUser,operationsEnvelope,operationsStateSize,prepareOperationsFile,auditOperationsCommand,operationsSnapshot,sendOperationsFile} from '../operations.mjs';
const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
export function attachCloudOperations({client,hashOf}){
 const {rest,rpc}=client;
 const metadata=async user=>{const [members,properties]=await Promise.all([rest('eme_profiles?select=id,name,role,active&order=name'+(user.role==='admin'?'':'&id=eq.'+user.id)),rest('eme_cases?id=neq.'+developmentRecordId+'&select=id,assignee_id,data->>title&order=created_at.desc'+(user.role==='admin'?'':'&assignee_id=eq.'+user.id))]);return {members,properties:properties.map(item=>({id:item.id,title:item.title||'Imóvel sem título',assigneeId:item.assignee_id}))};};
 const row=async()=>{const current=(await rest('eme_operations_state?id=eq.company&select=version,data,updated_at'))[0];if(!current)fail(503,'Os módulos operacionais ainda não foram ativados no servidor.');return current;};
 const snapshot=async user=>{const [current,meta]=await Promise.all([row(),metadata(user)]);const scope=user.role==='admin'?'':'&property_id=in.('+meta.properties.map(item=>item.id).join(',')+')';const history=user.role!=='admin'&&!meta.properties.length?[]:await rest('eme_operations_audit?select=id,action,property_id,created_at,eme_profiles(name)&order=id.desc&limit=200'+scope);return operationsSnapshot(current,meta,user,history.map(item=>({id:item.id,action:item.action,propertyId:item.property_id,createdAt:item.created_at,author:item.eme_profiles?.name||'Equipe EME'})));};
 async function handle(path,req,res,user,body,send){
  const fileMatch=path.match(/^\/api\/operations\/documents\/([a-f0-9-]{36})\/content$/);if(path!=='/api/operations'&&path!=='/api/operations/commands'&&!fileMatch)return false;
  operationsUser(user);
  if(fileMatch){if(req.method!=='GET')fail(405,'Operação indisponível.');const scope=user.role==='admin'?'':'&eme_cases.assignee_id=eq.'+user.id;const file=(await rest('eme_operations_files?id=eq.'+fileMatch[1]+'&select=id,property_id,filename,mime_type,size_bytes,content_base64,eme_cases!inner(assignee_id)'+scope))[0];if(!file)fail(404,'Documento indisponível.');sendOperationsFile(res,{filename:file.filename,mimeType:file.mime_type,sizeBytes:file.size_bytes,contentBase64:file.content_base64});return true;}
  if(path==='/api/operations'&&req.method==='GET'){send(200,await snapshot(user));return true;}
  if(path!=='/api/operations/commands'||req.method!=='POST')fail(405,'Operação indisponível.');
  const input=operationsEnvelope(body),[current,meta]=await Promise.all([row(),metadata(user)]),context={...meta,actorId:user.id,role:user.role,now:new Date().toISOString()};
  const scope=operationsScope(current.data,input.command,context);
  const receipt=(await rest('eme_operations_receipts?request_id=eq.'+input.requestId+'&select=actor_id,payload_hash'))[0];
  if(receipt){if(receipt.actor_id!==user.id||receipt.payload_hash!==input.fingerprint)fail(409,'Esta referência já foi usada em outro registro.');send(200,await snapshot(user));return true;}
  if(current.version<input.version)fail(409,'A operação mudou. Atualize os dados antes de salvar.');
  const file=await prepareOperationsFile(input.command),auditCommand=auditOperationsCommand(input.command,file);
  const next=current.version===input.version?applyOperationsCommand(current.data,input.command,{...context,file}):null;if(next)operationsStateSize(next);
  const document=file&&next?next.documents.find(item=>!current.data.documents.some(old=>old.id===item.id)):null;
  await rpc('eme_save_operations',{p_session:hashOf(req),p_version:input.version,p_request_id:input.requestId,p_payload_hash:input.fingerprint,p_command:auditCommand,p_data:next,p_property_id:scope.propertyId,p_file:document?{...file,id:document.id,propertyId:document.propertyId}:null,p_before_hash:financeFingerprint(current.data),p_after_hash:financeFingerprint(next)});
  send(200,await snapshot(user));return true;
 }
 return {handle};
}
