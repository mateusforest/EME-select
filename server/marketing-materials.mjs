import {randomUUID} from 'node:crypto';
import {fail,fields} from './cloud/domain.mjs';
import {materialCategories,materialMimeTypes,materialMaxBytes} from '../shared/marketing-materials.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const text=(value,min,max)=>{if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail(400,'Confira o título e as informações do material.');return value.trim();};
export function materialUser(user){if(!user?.active||!['admin','corretor'].includes(user.role))fail(401,'Entre com sua conta da equipe.');if(user.must_change||user.mustChangePassword)fail(403,'Atualize sua senha inicial.');}
export function materialSignature(bytes,mime){
 if(mime==='image/png')return bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(mime==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(mime==='image/webp')return bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
 if(mime==='application/pdf')return bytes.toString('ascii',0,5)==='%PDF-';
 if(['video/mp4','video/quicktime'].includes(mime))return bytes.toString('ascii',4,8)==='ftyp';
 if(mime==='video/webm')return bytes.subarray(0,4).equals(Buffer.from([26,69,223,163]));
 if(mime==='application/zip')return bytes.subarray(0,4).equals(Buffer.from([80,75,3,4]))||bytes.subarray(0,4).equals(Buffer.from([80,75,5,6]));
 return false;
}
const editable=(row,user)=>user.role==='admin'||row.created_by===user.id;
export const presentMaterial=(row,user)=>({id:row.id,version:row.version,title:row.title,category:row.category,notes:row.notes,propertyId:row.property_id,brokerId:row.broker_id,filename:row.filename,mimeType:row.mime_type,sizeBytes:row.size_bytes,archived:row.archived,createdAt:row.created_at,updatedAt:row.updated_at,canEdit:editable(row,user)});
export function createMaterialsApi({store,storage,now=()=>Date.now()}){
 async function links(input,user){
  const meta=await store.metadata();const propertyId=input.propertyId||null,brokerId=input.brokerId||null;
  if(propertyId&&(!uuid.test(propertyId)||!meta.properties.some(p=>p.id===propertyId&&!p.archived)))fail(400,'Selecione um imóvel ativo da carteira.');
  if(brokerId&&(!uuid.test(brokerId)||!meta.members.some(m=>m.id===brokerId&&m.active)))fail(400,'Selecione uma pessoa ativa da equipe.');
  if(user.role!=='admin'&&brokerId&&brokerId!==user.id)fail(403,'Vincule seu próprio perfil. A gestão pode associar outros corretores.');
  return {property_id:propertyId,broker_id:brokerId};
 }
 function info(body){if(!materialCategories.includes(body.category))fail(400,'Escolha o tipo de material.');return {title:text(body.title,2,160),category:body.category,notes:text(body.notes??'',0,2000)};}
 async function rowFor(id,user,write=false){const row=await store.read(id);if(!row||row.status!=='ready'&&row.created_by!==user.id)fail(404,'Material não encontrado.');if(write&&!editable(row,user))fail(403,'Somente quem enviou ou a gestão pode alterar este material.');return row;}
 return {async handle(path,req,res,user,body,send){
  if(path!=='/api/marketing-materials'&&!path.startsWith('/api/marketing-materials/'))return false;
  materialUser(user);
  if(path==='/api/marketing-materials'&&req.method==='GET'){
   const [rows,metadata]=await Promise.all([store.list(),store.metadata()]);send(200,{materials:rows.filter(r=>r.status==='ready').map(r=>presentMaterial(r,user)),...metadata,maxBytes:materialMaxBytes});return true;
  }
  if(path==='/api/marketing-materials/uploads'&&req.method==='POST'){
   fields(body,['title','category','notes','propertyId','brokerId','filename','mimeType','sizeBytes']);
   if(!materialMimeTypes[body.mimeType]||!Number.isSafeInteger(body.sizeBytes)||body.sizeBytes<1||body.sizeBytes>materialMaxBytes)fail(400,'Envie imagens, PDF, vídeo ou ZIP de até 50 MB.');
   const filename=text(String(body.filename||'').split(/[\\/]/).at(-1).replace(/[\u0000-\u001f\u007f"<>:|?*]/g,''),1,180);
   const recent=await store.pendingCount(user.id,new Date(now()-86400000).toISOString());if(recent>=30)fail(429,'Há muitos envios em andamento. Aguarde antes de enviar novamente.');
   const id=randomUUID(),stamp=new Date(now()).toISOString(),row={id,version:1,...info(body),...await links(body,user),filename,mime_type:body.mimeType,size_bytes:body.sizeBytes,object_path:user.id+'/'+id+'.'+materialMimeTypes[body.mimeType],status:'uploading',archived:false,created_by:user.id,created_at:stamp,updated_at:stamp};
   await store.insert(row);const upload=await storage.begin(row);send(201,{id,upload});return true;
  }
  const match=path.match(/^\/api\/marketing-materials\/([a-f0-9-]{36})(?:\/(complete|file|archive))?$/);if(!match||!uuid.test(match[1]))fail(404,'Material não encontrado.');
  const row=await rowFor(match[1],user,req.method!=='GET');
  if(match[2]==='file'&&req.method==='GET'){
   if(row.status!=='ready')fail(409,'O envio deste arquivo ainda não foi concluído.');
   const download=new URL(req.url,'http://localhost').searchParams.get('download')==='1';await storage.serve(row,req,res,download);return true;
  }
  if(match[2]==='complete'&&req.method==='POST'){
   fields(body,[]);if(row.status==='ready'){send(200,presentMaterial(row,user));return true;}
   if(now()-Date.parse(row.created_at)>2*60*60*1000)fail(410,'O prazo do envio expirou. Selecione o arquivo novamente.');
   const file=await storage.inspect(row);if(file.size!==row.size_bytes||file.mime!==row.mime_type||!materialSignature(file.head,row.mime_type))fail(400,'O arquivo recebido não corresponde ao formato ou tamanho informado. Selecione o arquivo original e tente novamente.');
   const saved=await store.update(row,{status:'ready',updated_at:new Date(now()).toISOString()},user);send(200,presentMaterial(saved,user));return true;
  }
  if(row.status!=='ready')fail(409,'Conclua o envio antes de alterar o material.');
  if(req.method!=='PATCH')fail(405,'Operação indisponível.');
  fields(body,match[2]==='archive'?['version','archived']:['version','title','category','notes','propertyId','brokerId']);
  if(body.version!==row.version)fail(409,'O material mudou. Atualize a página antes de salvar.');
  let patch;
  if(match[2]==='archive'){if(typeof body.archived!=='boolean')fail(400,'Confira a situação do material.');patch={archived:body.archived};}
  else {
   // Existing links are kept when a property or team member is later archived.
   const sameLinks=body.propertyId===row.property_id&&body.brokerId===row.broker_id;
   patch={...info(body),...(sameLinks?{}:await links(body,user))};
  }
  const saved=await store.update(row,{...patch,updated_at:new Date(now()).toISOString()},user);send(200,presentMaterial(saved,user));return true;
 }};
}
