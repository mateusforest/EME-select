import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {emptyDevelopment,validateDevelopment,developmentPublicationIssues} from '../shared/development.mjs';
import {admin,fail,fields} from './cloud/domain.mjs';
const route='/api/developments/moradas-da-serra';
export function createDevelopmentApi({read,write,putImage,getImage,deleteImage}) {
 const detail=row=>({version:row?.version||0,config:row?.data.config||emptyDevelopment(),published:!!row?.data.live,publishedAt:row?.data.publishedAt||null});
 async function publicHandle(path,req,res,send){
  if(path==='/api/public/developments/moradas-da-serra'&&req.method==='GET'){
   const row=await read();send(200,{config:row?.data.live||emptyDevelopment(),published:!!row?.data.live});return true;
  }
  const match=path.match(/^\/api\/development-images\/([a-f0-9-]{36})$/);
  if(match&&req.method==='GET'){
   const row=await read();if(!row?.data.live?.plans.some(p=>p.imageUrl===path))return false;
   const bytes=await getImage(match[1]);res.setHeader('Content-Type','image/webp');res.end(bytes);return true;
  }
  return false;
 }
 async function handle(path,req,res,user,body,send){
  if(!path.startsWith(route)&&!path.startsWith('/api/development-images/'))return false;
  admin(user);
  const row=await read();
  const photo=path.match(/^\/api\/development-images\/([a-f0-9-]{36})$/);
  if(photo&&req.method==='GET'){if(!row?.data.images?.includes(photo[1]))fail(404,'Planta não encontrada.');res.setHeader('Content-Type','image/webp');res.end(await getImage(photo[1]));return true;}
  if(path===route&&req.method==='GET'){send(200,detail(row));return true;}
  if(!['POST','PATCH'].includes(req.method))fail(405,'Operação indisponível.');
  if(!Number.isInteger(body?.version)||body.version!==(row?.version||0))fail(409,'O empreendimento mudou. Recarregue antes de salvar.');
  let data={kind:'development',...(row?.data||{}),config:row?.data.config||emptyDevelopment(),images:row?.data.images||[]};
  let action='Empreendimento atualizado';
  if(path===route&&req.method==='PATCH'){fields(body,['version','config']);data.config=validateDevelopment(body.config);}
  else if(path===route+'/publish'&&req.method==='POST'){
   fields(body,['version','confirmed']);if(body.confirmed!==true)fail(400,'Confirme a revisão das informações antes de publicar.');
   const config=validateDevelopment(data.config),issues=developmentPublicationIssues(config);if(issues.length)fail(409,issues.join(' '));
   if(config.plans.some(p=>p.imageUrl.startsWith('/api/')&&!data.images.includes(p.imageUrl.split('/').pop())))fail(400,'A planta não pertence ao empreendimento.');
   data.live=config;data.publishedAt=new Date().toISOString();action='Empreendimento publicado';
  }else if(path===route+'/unpublish'&&req.method==='POST'){fields(body,['version']);data.live=null;data.publishedAt=null;action='Dados comerciais do empreendimento retirados';}
  else if(path===route+'/images'&&req.method==='POST'){
   fields(body,['version','content']);if(data.images.length>=100)fail(400,'Limite de 100 plantas recebidas.');
   if(typeof body.content!=='string'||body.content.length>2800000||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(body.content))fail(400,'Envie uma imagem JPEG, PNG ou WebP de até 2 MB.');
   let bytes;try{bytes=await sharp(Buffer.from(body.content.split(',')[1],'base64'),{limitInputPixels:20000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer();}catch{fail(400,'Imagem inválida.');}
   const id=randomUUID();await putImage(id,bytes);data.images=[...data.images,id];
   try{const saved=await write(req,row,data,user,'Planta recebida');send(201,{...detail(saved),imageUrl:'/api/development-images/'+id});}catch(e){await deleteImage(id).catch(()=>{});throw e;}return true;
  }else fail(404,'Operação não encontrada.');
  send(200,detail(await write(req,row,data,user,action)));return true;
 }
 return {publicHandle,handle};
}
