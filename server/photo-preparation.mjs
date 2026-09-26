import sharp from 'sharp';
import {fail} from './cloud/domain.mjs';
let active=0;
export async function prepareEnlargement(bytes){
 if(active>=2)fail(503,'Há fotografias em preparação. Aguarde alguns segundos e tente novamente.');
 active++;
 try{
  const image=sharp(bytes,{limitInputPixels:20000000,failOn:'warning'}),meta=await image.metadata();
  if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1)fail(400,'Use uma fotografia JPEG, PNG ou WebP estática.');
  const edge=Math.min(3200,Math.max(meta.width,meta.height)*2);
  if(Math.max(meta.width,meta.height)>=3200)fail(400,'Esta foto já tem resolução suficiente. Use a versão atual.');
  let output;
  for(const quality of [92,86,80]){
   output=await image.clone().rotate().resize({width:edge,height:edge,fit:'inside',kernel:'lanczos3'}).webp({quality}).toBuffer({resolveWithObject:true});
   if(output.data.length<=1900000)break;
  }
  if(output.data.length>1900000)fail(400,'A imagem ficou muito pesada. Envie uma versão original com menor tamanho de arquivo.');
  return {content:'data:image/webp;base64,'+output.data.toString('base64'),width:output.info.width,height:output.info.height,method:'lanczos3-2x'};
 }catch(e){if(e.status)throw e;fail(400,'Não foi possível preparar esta fotografia. Reenvie o arquivo original.');}finally{active--;}
}
