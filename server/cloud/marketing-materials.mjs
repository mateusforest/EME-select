import {createMaterialsApi} from '../marketing-materials.mjs';
import {propertyRecordsQuery} from '../../shared/portal-content.mjs';
import {fail} from './domain.mjs';
const bucket='eme-marketing-materials';
export function attachCloudMaterials({client,env=process.env}){
 const {rest,request}=client,base=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const pages=async query=>{const out=[];for(let offset=0;;offset+=500){const rows=await rest(query+'&offset='+offset+'&limit=500');out.push(...rows);if(rows.length<500)return out;}};
 const store={
  read:async id=>(await rest('eme_marketing_materials?id=eq.'+id+'&select=*'))[0],
  list:async()=>{try{return await pages('eme_marketing_materials?status=eq.ready&select=*&order=created_at.desc,id');}catch{fail(503,'Não foi possível abrir os materiais. Confira a conexão e a ativação de Materiais de divulgação no servidor.');}},
  pendingCount:async(id,since)=>(await rest('eme_marketing_materials?created_by=eq.'+id+'&status=eq.uploading&created_at=gte.'+encodeURIComponent(since)+'&select=id&limit=30')).length,
  metadata:async()=>{const [properties,members]=await Promise.all([pages('eme_cases?select=id,data->>title,data->>archived&order=id'+propertyRecordsQuery),pages('eme_profiles?select=id,name,role,active&order=name,id')]);return {properties:properties.map(p=>({id:p.id,title:p.title||'Imóvel sem título',archived:p.archived==='true'||p.archived===true})),members};},
  insert:row=>rest('eme_marketing_materials','POST',row),
  update:async(row,patch)=>{const saved=await rest('eme_marketing_materials?id=eq.'+row.id+'&version=eq.'+row.version,'PATCH',{...patch,version:row.version+1});if(!saved.length)fail(409,'O material mudou. Atualize antes de salvar.');return saved[0];}
 };
 function storageUrl(value){const url=new URL('/storage/v1'+value,base);if(url.origin!==new URL(base).origin)fail(503,'Endereço de armazenamento inválido.');return url.href;}
 const storage={
  begin:async row=>{try{const result=await request('/storage/v1/object/upload/sign/'+bucket+'/'+row.object_path,{method:'POST',body:{}});return {url:storageUrl(result.url),method:'PUT'};}catch{fail(503,'O armazenamento de materiais precisa estar ativado. Confira a configuração antes de reenviar.');}},
  inspect:async row=>{
   const info=await request('/storage/v1/object/info/'+bucket+'/'+row.object_path);
   const size=Number(info.metadata?.size??info.size),mime=info.metadata?.mimetype??info.content_type??info.contentType;
   // Read only a bounded signature; large videos never pass through the API.
   const response=await request('/storage/v1/object/authenticated/'+bucket+'/'+row.object_path,{raw:true,headers:{Range:'bytes=0-511'}});
   const reader=response.body.getReader(),parts=[];let count=0;try{while(count<512){const {done,value}=await reader.read();if(done)break;const part=Buffer.from(value).subarray(0,512-count);parts.push(part);count+=part.length;}}finally{await reader.cancel();}
   return {size,mime,head:Buffer.concat(parts)};
  },
  serve:async(row,req,res,download)=>{const result=await request('/storage/v1/object/sign/'+bucket+'/'+row.object_path,{method:'POST',body:{expiresIn:300}});const url=new URL(storageUrl(result.signedURL));if(download||['application/pdf','application/zip'].includes(row.mime_type))url.searchParams.set('download',row.filename);res.writeHead(302,{Location:url.href,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});res.end();}
 };
 return createMaterialsApi({store,storage});
}
