import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {admin,fail,fields,text} from './cloud/domain.mjs';
export const peopleRecordId='eae00000-0000-4000-8000-000000000001';
const route='/api/people';
export function createPeopleApi({read,write,putImage,getImage,deleteImage}){
 const detail=row=>({version:row?.version||0,people:row?.data.people||[],published:!!row?.data.live,publishedAt:row?.data.publishedAt||null});
 function validate(value,images){
  if(!Array.isArray(value)||value.length>30)fail(400,'Cadastre até 30 pessoas.');
  const people=value.map(p=>{fields(p,['id','name','role','bio','photoUrl','registration']);
   if(!/^[a-f0-9-]{36}$/.test(p.id))fail(400,'Identificação inválida.');
   const photoUrl=text(p.photoUrl||'',0,100);
   if(photoUrl&&(!/^\/api\/people-images\/[a-f0-9-]{36}$/.test(photoUrl)||!images.includes(photoUrl.split('/').pop())))fail(400,'A fotografia não pertence a este cadastro.');
   return {id:p.id,name:text(p.name,2,80),role:text(p.role,2,80),bio:text(p.bio||'',0,500),registration:text(p.registration||'',0,60),photoUrl};
  });
  if(new Set(people.map(p=>p.id)).size!==people.length)fail(400,'Há pessoas duplicadas.');return people;
 }
 async function publicHandle(path,req,res,send){
  if(path==='/api/public/people'&&req.method==='GET'){const row=await read();send(200,{people:row?.data.live||[]});return true;}
  const match=path.match(/^\/api\/people-images\/([a-f0-9-]{36})$/);
  if(match&&req.method==='GET'){const row=await read();if(!row?.data.live?.some(p=>p.photoUrl===path))return false;res.setHeader('Content-Type','image/webp');res.end(await getImage(match[1]));return true;}return false;
 }
 async function handle(path,req,res,user,body,send){
  if(path!==route&&!path.startsWith(route+'/')&&!path.startsWith('/api/people-images/'))return false;
  admin(user);const row=await read();const match=path.match(/^\/api\/people-images\/([a-f0-9-]{36})$/);
  if(match&&req.method==='GET'){if(!row?.data.images?.includes(match[1]))fail(404,'Retrato não encontrado.');res.setHeader('Content-Type','image/webp');res.end(await getImage(match[1]));return true;}
  if(path===route&&req.method==='GET'){send(200,detail(row));return true;}
  if(body?.version!==(row?.version||0))fail(409,'O cadastro mudou. Recarregue antes de continuar.');
  let data={kind:'directory',...(row?.data||{}),people:row?.data.people||[],images:row?.data.images||[]};let action='Perfis públicos atualizados';
  if(path===route&&req.method==='PATCH'){fields(body,['version','people']);data.people=validate(body.people,data.images);}
  else if(path===route+'/publish'&&req.method==='POST'){
   fields(body,['version','confirmed']);if(body.confirmed!==true)fail(400,'Confirme a autorização para divulgar os perfis.');data.live=validate(data.people,data.images);
   if(!data.live.length||data.live.some(p=>!p.photoUrl))fail(400,'Adicione nome, cargo e fotografia de cada pessoa antes de publicar.');
   data.publishedAt=new Date().toISOString();action='Perfis publicados na página inicial';
  }else if(path===route+'/unpublish'&&req.method==='POST'){fields(body,['version']);data.live=null;data.publishedAt=null;action='Perfis retirados da página inicial';}
  else if(path===route+'/images'&&req.method==='POST'){
   fields(body,['version','content']);if(data.images.length>=150)fail(400,'Limite de retratos atingido.');
   if(typeof body.content!=='string'||body.content.length>2800000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(body.content))fail(400,'Envie uma fotografia JPEG, PNG ou WebP de até 2 MB.');
   let bytes;try{const photo=sharp(Buffer.from(body.content.split(',')[1],'base64'),{limitInputPixels:20000000});const meta=await photo.metadata();if(meta.pages>1||Math.min(meta.width,meta.height)<240)throw Error();bytes=await photo.rotate().resize({width:1000,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();}catch{fail(400,'Use uma fotografia estática com pelo menos 240 px em cada lado.');}
   const id=randomUUID();await putImage(id,bytes);data.images=[...data.images,id];
   try{const saved=await write(req,row,data,user,'Retrato recebido');send(201,{...detail(saved),imageUrl:'/api/people-images/'+id});}catch(e){await deleteImage(id).catch(()=>{});throw e;}return true;
  }else fail(404,'Operação não encontrada.');
  send(200,detail(await write(req,row,data,user,action)));return true;
 }
 return {publicHandle,handle};
}
