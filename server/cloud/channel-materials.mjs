import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {draft} from './domain.mjs';
export const materialLimit=2_000_000;
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export async function decodeMaterial(input){
 if(!input||typeof input.content!=='string'||input.content.length>2800000||!/^[A-Za-z0-9+/]+={0,2}$/.test(input.content))fail('Arquivo inválido. Envie JPG, PNG, WEBP, PDF ou TXT de até 2 MB.');
 let bytes=Buffer.from(input.content,'base64');if(bytes.length>materialLimit||!bytes.length)fail('Envie um arquivo de até 2 MB.');
 let mime=input.mime,metadata={};const filename=String(input.name||'arquivo').replace(/[\x00-\x1f\\/"<>]/g,'_').slice(0,120);
 if(['image/jpeg','image/png','image/webp'].includes(mime)){
  try{const image=sharp(bytes,{limitInputPixels:20000000,failOn:'warning'}),m=await image.metadata();if(m.pages>1||!['jpeg','png','webp'].includes(m.format))fail('Imagem inválida.');const output=await image.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true});bytes=output.data;mime='image/webp';metadata={width:output.info.width,height:output.info.height};}catch(e){fail(e.status?e.message:'Não consegui abrir esta imagem. Envie JPG, PNG ou WEBP.');}
 }else if(mime==='application/pdf'){if(bytes.subarray(0,5).toString()!=='%PDF-')fail('O conteúdo não é um PDF válido.');}
 else if(mime==='text/plain'){try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('Envie o TXT em UTF-8.');}if(bytes.includes(0))fail('Arquivo de texto inválido.');}
 else fail('Formato não suportado. Envie JPG, PNG, WEBP, PDF ou TXT, até 2 MB.');
 return {filename,mime_type:mime,content_base64:bytes.toString('base64'),metadata};
}
export function materialId(phone,event){const h=createHash('sha256').update(phone+':'+event).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
export function propertyDraft(values,existing={}){return draft({...existing,...values.extracted,title:values.title,city:values.city,type:values.type,operation:values.operation==='Locação'?'alugar':'comprar',ownerName:values.owner||existing.ownerName||'',environment:existing.environment||'urbano',condominium:existing.condominium||'',locationProfile:existing.locationProfile||''});}
export function attachChannelMaterials({client,caseFor}){return {async handle(path,req,res,user,send){
 const m=path.match(/^\/api\/listings\/([a-f0-9-]{36})\/whatsapp-materials(?:\/([a-f0-9-]{36}))?$/);if(!m)return false;
 if(req.method!=='GET')throw Object.assign(Error('Método inválido.'),{status:405});const property=await caseFor(m[1],user);
 if(!m[2]){send(200,{sourceText:property.data.whatsappSourceText||'',materials:await client.rest('eme_channel_materials?case_id=eq.'+m[1]+'&select=id,filename,mime_type,created_at&order=created_at')});return true;}
 const row=(await client.rest('eme_channel_materials?id=eq.'+m[2]+'&case_id=eq.'+m[1]))[0];if(!row)throw Object.assign(Error('Arquivo não encontrado.'),{status:404});res.setHeader('Content-Type',row.mime_type);res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(row.filename));res.end(Buffer.from(row.content_base64,'base64'));return true;
 }};}
