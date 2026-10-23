import {randomUUID} from 'node:crypto';
import {admin,fail,fields,text} from './cloud/domain.mjs';
import {defaultSiteContent,publicSiteContent,siteRecordId,initialRegions} from '../shared/portal-content.mjs';
import {prepareOperationsFile,sendOperationsFile} from './operations.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function createPortalContent({read,write,listDocuments,catalog}){
 const siteDetail=row=>({version:row?.version||0,config:row?.data.config||defaultSiteContent()});
 async function publicHandle(path,req,res,send){if(path!=='/api/public/site-content'||req.method!=='GET')return false;const config=publicSiteContent((await read(siteRecordId))?.data),ids=new Set((await catalog()).map(p=>p.id));send(200,{...config,opportunityIds:config.opportunityIds?.filter(id=>ids.has(id))??null,regionAssignments:Object.fromEntries(Object.entries(config.regionAssignments).filter(([id])=>ids.has(id)))});return true;}
 function validateConfig(config,published){
  fields(config,['regions','opportunityIds','regionAssignments']);
  if(!Array.isArray(config.regions)||config.regions.length>50)fail(400,'Cadastre até 50 regiões.');
  const regions=config.regions.map(r=>{
   fields(r,['id','stateId','stateName','city','name','context','asset','enabled','intro','collectionTitle','postcard','imageAlt','credit','license','licenseUrl','source']);
   if(!/^[a-z0-9-]{2,60}$/.test(r.id)||!/^[a-z]{2}$/.test(r.stateId)||typeof r.enabled!=='boolean')fail(400,'Confira a identificação da região.');
   const next={id:r.id,stateId:r.stateId,enabled:r.enabled};
   for(const key of ['stateName','city','name','context','intro','collectionTitle','postcard','imageAlt','credit','license','licenseUrl','source','asset'])next[key]=text(r[key]||'', ['stateName','city','name'].includes(key)?2:0,key==='intro'?700:key==='source'||key==='licenseUrl'?500:180);
   if(next.asset&&!initialRegions.some(x=>x.id===r.id&&x.asset===next.asset))fail(400,'Use o banner da própria região ou deixe sem imagem.');
   for(const key of ['source','licenseUrl'])if(next[key]&&!/^https:\/\//.test(next[key]))fail(400,'Informe um endereço https para os créditos.');
   return next;
  });
  if(new Set(regions.map(r=>r.id)).size!==regions.length)fail(400,'Cada região precisa de uma identificação única.');
  const ids=new Set(published.map(p=>p.id));
  if(config.opportunityIds!==null&&(!Array.isArray(config.opportunityIds)||config.opportunityIds.length>100||config.opportunityIds.some(id=>!ids.has(id))||new Set(config.opportunityIds).size!==config.opportunityIds.length))fail(400,'Selecione oportunidades entre os imóveis publicados.');
  const assignments=config.regionAssignments;if(!assignments||typeof assignments!=='object'||Array.isArray(assignments)||Object.keys(assignments).length>1000)fail(400,'Vínculos de região inválidos.');
  const regionIds=new Set(regions.map(r=>r.id));for(const [id,region]of Object.entries(assignments))if(!uuid.test(id)||!regionIds.has(region))fail(400,'Confira os vínculos entre imóveis e regiões.');
  return {regions,opportunityIds:config.opportunityIds,regionAssignments:assignments};
 }
 async function handle(path,req,res,user,body,send){
  if(path!=='/api/site-content'&&!path.startsWith('/api/company-documents'))return false;
  admin(user);
  if(path==='/api/site-content'){
   const row=await read(siteRecordId);const properties=await catalog();
   if(req.method==='GET'){send(200,{...siteDetail(row),properties:properties.map(({id,title,location,type,price})=>({id,title,location,type,price}))});return true;}
   if(req.method!=='PATCH')fail(405,'Operação indisponível.');fields(body,['version','config']);if(body.version!==(row?.version||0))fail(409,'O conteúdo mudou. Atualize antes de salvar.');
   const data={kind:'site_content',config:validateConfig(body.config,properties)};
   send(200,{...siteDetail(await write(req,siteRecordId,row,data,user,'Conteúdo do site atualizado')),properties:properties.map(({id,title,location,type,price})=>({id,title,location,type,price}))});return true;
  }
  if(path==='/api/company-documents'&&req.method==='GET'){send(200,{documents:await listDocuments()});return true;}
  if(path==='/api/company-documents'&&req.method==='POST'){
   fields(body,['id','title','category','expiresOn','previousId','filename','mimeType','contentBase64']);
   const id=body.id||randomUUID();if(!uuid.test(id))fail(400,'Referência inválida.');
   const title=text(body.title,2,160),category=text(body.category,2,50);
   if(!['Contratos','Societário','Fiscal','Administrativo','Outros'].includes(category))fail(400,'Categoria inválida.');
   const expiresOn=body.expiresOn||null;if(expiresOn&&(!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)||!Number.isFinite(Date.parse(expiresOn))||new Date(expiresOn).toISOString().slice(0,10)!==expiresOn))fail(400,'Validade inválida.');
   const file=await prepareOperationsFile({type:'document.upload',data:body});
   const existing=await read(id);if(existing){if(existing.data.kind==='company_document'&&existing.data.file.sha256===file.sha256&&existing.data.document.title===title&&existing.data.document.category===category&&existing.data.document.expiresOn===expiresOn&&existing.data.document.previousId===(body.previousId||null)){send(200,{document:{id,version:existing.version,...existing.data.document}});return true;}fail(409,'Esta referência já foi utilizada.');}
   if(body.previousId&&!uuid.test(body.previousId))fail(400,'Referência anterior inválida.');
   const previous=body.previousId?await read(body.previousId):null;
   if(body.previousId&&(!previous||previous.data.kind!=='company_document'))fail(404,'Documento anterior não encontrado.');
   const document={title,category,expiresOn,filename:file.filename,mimeType:file.mimeType,sizeBytes:file.sizeBytes,previousId:previous?.id||null,edition:previous?(previous.data.document.edition||1)+1:1,archived:false,createdAt:new Date().toISOString(),author:user.name};
   const saved=await write(req,id,null,{kind:'company_document',document,file},user,'Documento interno armazenado');send(201,{document:{id,version:saved.version,...document}});return true;
  }
  const match=path.match(/^\/api\/company-documents\/([a-f0-9-]{36})(?:\/(content))?$/);if(!match)fail(404,'Operação não encontrada.');
  const row=await read(match[1]);if(row?.data.kind!=='company_document')fail(404,'Documento não encontrado.');
  if(match[2]==='content'&&req.method==='GET'){sendOperationsFile(res,row.data.file);return true;}
  if(!match[2]&&req.method==='PATCH'){fields(body,['version','archived']);if(body.version!==row.version)fail(409,'O documento mudou. Atualize a lista.');if(typeof body.archived!=='boolean')fail(400,'Informe a situação.');const data={...row.data,document:{...row.data.document,archived:body.archived}};await write(req,row.id,row,data,user,body.archived?'Documento interno arquivado':'Documento interno restaurado');send(200,{ok:true});return true;}
  fail(405,'Operação indisponível.');
 }
 return {publicHandle,handle};
}
