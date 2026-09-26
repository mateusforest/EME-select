import {draft as validateDraft} from './cloud/domain.mjs';
import {photoPublicationIssues} from '../shared/photo-policy.mjs';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
const types=['Casa','Casa em condomínio','Apartamento','Compacto','Cabana','Cobertura','Sala comercial','Loja','Edifício corporativo','Galpão','Pavilhão','Centro de distribuição','Terreno urbano','Lote em condomínio','Terra agrícola'];
const environments=['litoral','serra','urbano','comercial','terrenos','industrial'];
const stringKeys=['privateAddress','ownerName','ownerContact','title','city','neighborhood','description','features','reasons','costNotes'];
const numberKeys=['price','area','bedrooms','suites','parking','condominiumFee','propertyTax'];
const blank={privateAddress:'',ownerName:'',ownerContact:'',title:'',city:'',neighborhood:'',type:'Casa',environment:'urbano',condominium:'',operation:'comprar',price:null,area:null,bedrooms:null,suites:null,parking:null,condominiumFee:null,propertyTax:null,description:'',features:'',reasons:'',costNotes:''};
export function attachListings({db,fail,text,fields,caseFor,transaction,audit,stamp,requireAdmin,send,session}) {
  db.exec(`BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS listings(id TEXT PRIMARY KEY REFERENCES evaluations(id),version INTEGER NOT NULL DEFAULT 1,data TEXT NOT NULL,published TEXT,published_version INTEGER) STRICT;
    CREATE TABLE IF NOT EXISTS listing_photos(id TEXT PRIMARY KEY,listing_id TEXT NOT NULL REFERENCES listings(id),data BLOB NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,caption TEXT NOT NULL,position INTEGER NOT NULL) STRICT;
    CREATE INDEX IF NOT EXISTS listing_photos_parent ON listing_photos(listing_id);
    PRAGMA user_version=3; COMMIT;`);
  if(!db.prepare('PRAGMA table_info(listing_photos)').all().some(c=>c.name==='room'))db.exec("ALTER TABLE listing_photos ADD COLUMN room TEXT NOT NULL DEFAULT ''");
  db.exec('PRAGMA user_version=4');
  let processing=0;
  for(const [name,type] of [['original_data','BLOB'],['enhancement',"TEXT NOT NULL DEFAULT ''"]])if(!db.prepare('PRAGMA table_info(listing_photos)').all().some(c=>c.name===name))db.exec('ALTER TABLE listing_photos ADD COLUMN '+name+' '+type);
  const photos=id=>db.prepare('SELECT id,width,height,caption,position,room,enhancement FROM listing_photos WHERE listing_id=? ORDER BY position,id').all(id).map(p=>({...p,url:'/api/photos/'+p.id}));
  function row(id,user){caseFor(id,user);const r=db.prepare('SELECT * FROM listings WHERE id=?').get(id);if(!r)fail(404,'Imóvel não encontrado.');return r;}
  const validate=validateDraft;
  function blockers(r){const d=JSON.parse(r.data), p=photos(r.id), reasons=[];
    if(!d.price||!d.area)reasons.push('Informe preço e área maiores que zero.');
    if(!d.neighborhood.trim())reasons.push('Informe bairro ou região pública.');
    if(d.description.trim().length<80)reasons.push('Descreva o imóvel com pelo menos 80 caracteres.');
    if(!d.reasons.trim())reasons.push('Registre os diferenciais selecionados pela EME.');
    reasons.push(...photoPublicationIssues(p));
    const e=db.prepare('SELECT stage FROM evaluations WHERE id=?').get(r.id);
    if(e.stage!=='Entrada aprovada')reasons.push('Conclua a curadoria e a aprovação de entrada.');
    return reasons;
  }
  function publicData(r){const d=JSON.parse(r.data),images=photos(r.id).map(({url,caption,room,width,height})=>({url,caption,room,width,height}));return {
    id:r.id,title:d.title,environment:d.environment,locationProfile:d.locationProfile||undefined,condominium:d.condominium||undefined,location:d.neighborhood+' · '+d.city,type:d.type==='Casa em condomínio'?'Casa':d.type,operation:d.operation,price:d.price,area:d.area,bedrooms:d.bedrooms,suites:d.suites,parking:d.parking,bathrooms:d.bathrooms,totalArea:d.totalArea,yearBuilt:d.yearBuilt,
    description:d.description,tags:d.features.split('\n').map(v=>v.trim()).filter(Boolean),reasons:d.reasons.split('\n').map(v=>v.trim()).filter(Boolean),costNotes:d.costNotes,condominiumFee:d.condominiumFee,propertyTax:d.propertyTax,image:images[0]?.url,images,isIllustrative:false,hasInterior:false};}
  const detail=(r,user)=>({id:r.id,version:r.version,draft:JSON.parse(r.data),photos:photos(r.id),stage:caseFor(r.id,user).stage,published:!!r.published&&caseFor(r.id,user).stage==='Entrada aprovada',publishedVersion:r.published_version,blockers:blockers(r)});
  function checkVersion(r,body){if(!Number.isInteger(body.version))fail(400,'Versão obrigatória.');if(r.version!==body.version)fail(409,'Este imóvel foi alterado. Reabra o cadastro antes de continuar.');}
  function changed(id,user,message){
    db.prepare('UPDATE listings SET version=version+1,published=NULL,published_version=NULL WHERE id=?').run(id);
    db.prepare("UPDATE evaluations SET stage='Em avaliação',version=version+1,updated_at=? WHERE id=?").run(stamp(),id);
    const c=db.prepare('SELECT data FROM curation WHERE evaluation_id=?').get(id);
    if(c){const data=JSON.parse(c.data);data.checks=data.checks.map(v=>({...v,state:'Em revisão',author:user.name,date:stamp()}));db.prepare('UPDATE curation SET data=? WHERE evaluation_id=?').run(JSON.stringify(data),id);}
    audit(user.id,message,'Alteração de anúncio: conferir novamente a curadoria. Qualquer publicação anterior foi retirada.',id);
  }
  async function publicHandle(path,req,res){
    if(path==='/api/public/properties'&&req.method==='GET'){
      const entries=db.prepare("SELECT published FROM listings JOIN evaluations ON evaluations.id=listings.id WHERE published IS NOT NULL AND evaluations.stage='Entrada aprovada'").all();send(res,200,{properties:entries.map(r=>JSON.parse(r.published))});return true;
    }
    const match=path.match(/^\/api\/photos\/([a-f0-9-]{36})$/);if(!match||req.method!=='GET')return false;
    const p=db.prepare('SELECT listing_photos.*,listings.published,evaluations.stage FROM listing_photos JOIN listings ON listings.id=listing_photos.listing_id JOIN evaluations ON evaluations.id=listings.id WHERE listing_photos.id=?').get(match[1]);
    if(!p)fail(404,'Fotografia não encontrada.');
    const originalRequested=new URL(req.url,'https://eme.local').searchParams.get('original')==='1';const published=!originalRequested&&p.published&&p.stage==='Entrada aprovada'&&JSON.parse(p.published).images.some(v=>v.url==='/api/photos/'+p.id);
    if(!published){const user=session(req);if(!user||user.must_change)fail(404,'Fotografia não encontrada.');caseFor(p.listing_id,user);}
    const bytes=originalRequested&&p.original_data?p.original_data:p.data;res.writeHead(200,{'Content-Type':'image/webp','Content-Length':bytes.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});res.end(Buffer.from(bytes));return true;
  }
  async function handle(path,req,res,user,body){
    if(path==='/api/listings'){
      if(req.method==='GET'){const rows=db.prepare('SELECT listings.*,evaluations.assignee_id FROM listings JOIN evaluations ON evaluations.id=listings.id ORDER BY evaluations.updated_at DESC').all().filter(r=>user.role==='admin'||r.assignee_id===user.id);send(res,200,{listings:rows.map(r=>detail(r,user))});return true;}
      if(req.method==='POST'){
        fields(body,['draft','evaluationId']);const d=validate(body.draft);const id=body.evaluationId||randomUUID();
        if(body.evaluationId){const evaluation=caseFor(id,user);if(['Entrada aprovada','Não selecionado'].includes(evaluation.stage))requireAdmin(user);if(db.prepare('SELECT id FROM listings WHERE id=?').get(id))fail(409,'Já existe anúncio para esta avaliação.');}
        transaction(()=>{
          if(!body.evaluationId)db.prepare('INSERT INTO evaluations(id,title,city,type,operation,owner,assignee_id,stage,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,d.title,d.city,d.type,d.operation==='comprar'?'Venda':'Locação','',user.id,'Recebido',stamp(),stamp());
          db.prepare('INSERT INTO listings(id,data) VALUES (?,?)').run(id,JSON.stringify(d));changed(id,user,'Cadastro de imóvel criado');
          db.prepare('UPDATE evaluations SET title=?,city=?,type=?,operation=? WHERE id=?').run(d.title,d.city,d.type,d.operation==='comprar'?'Venda':'Locação',id);
        });send(res,201,detail(row(id,user),user));return true;
      }
    }
    const match=path.match(/^\/api\/listings\/([a-f0-9-]{36})(?:\/(photos|publish|unpublish))?$/);if(!match)return false;
    const id=match[1],r=row(id,user);
    if(!match[2]&&req.method==='GET'){send(res,200,detail(r,user));return true;}
    if(req.method!=='POST'&&req.method!=='PATCH')fail(405,'Operação indisponível.');
    checkVersion(r,body);
    if(!['publish','unpublish'].includes(match[2])&&['Entrada aprovada','Não selecionado'].includes(caseFor(id,user).stage))requireAdmin(user);
    if(!match[2]&&req.method==='PATCH'){
      fields(body,['version','draft','photos']);const d=validate(body.draft),existing=photos(id);
      if(!Array.isArray(body.photos)||body.photos.length>20||new Set(body.photos.map(p=>p?.id)).size!==body.photos.length)fail(400,'Galeria inválida.');
      const ordered=body.photos.map(p=>{fields(p,['id','caption','room']);if(!existing.some(v=>v.id===p.id))fail(400,'Fotografia não pertence a este imóvel.');return {id:p.id,caption:text(p.caption,'Legenda',0,180),room:text(p.room??'','Ambiente',0,60)};});
      transaction(()=>{checkVersion(row(id,user),body);db.prepare('UPDATE listings SET data=? WHERE id=?').run(JSON.stringify(d),id);
        for(const photo of existing)if(!ordered.some(v=>v.id===photo.id))db.prepare('DELETE FROM listing_photos WHERE id=?').run(photo.id);
        ordered.forEach((photo,index)=>db.prepare('UPDATE listing_photos SET caption=?,position=?,room=? WHERE id=?').run(photo.caption,index,photo.room,photo.id));
        changed(id,user,'Informações e galeria atualizadas');db.prepare('UPDATE evaluations SET title=?,city=?,type=?,operation=? WHERE id=?').run(d.title,d.city,d.type,d.operation==='comprar'?'Venda':'Locação',id);
      });send(res,200,detail(row(id,user),user));return true;
    }
    if(match[2]==='photos'&&req.method==='POST'){
      fields(body,['version','content','caption','room','sourceId','method','reviewed']);const source=body.sourceId?db.prepare('SELECT * FROM listing_photos WHERE id=? AND listing_id=?').get(body.sourceId,id):null;if(body.sourceId&&(!source||body.method!=='esrgan-slim-2x'||body.reviewed!==true))fail(400,'Confira a foto de origem e confirme a fidelidade da ampliação.');if(!source&&photos(id).length>=20)fail(400,'Limite de 20 fotografias por imóvel.');
      if(typeof body.content!=='string'||body.content.length>11200000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(body.content))fail(400,'Envie JPEG, PNG ou WebP de até 8 MB.');
      const caption=text(body.caption??'','Legenda',0,180),room=text(body.room??'','Ambiente',0,60),buffer=Buffer.from(body.content.split(',')[1],'base64');if(buffer.length>8*1024*1024)fail(413,'Cada fotografia pode ter até 8 MB.');
      if(processing>=2)fail(503,'Há fotos em processamento. Aguarde e tente novamente.');processing++;
      let output;try{const pipeline=sharp(buffer,{limitInputPixels:20000000,failOn:'warning'});const meta=await pipeline.metadata();if(!['jpeg','png','webp'].includes(meta.format)||meta.pages>1||Math.max(meta.width,meta.height)<600||Math.min(meta.width,meta.height)<200)fail(400,'Use uma fotografia estática com pelo menos 600 pixels no lado maior e 200 no menor.');output=await pipeline.rotate().resize({width:3200,height:3200,fit:'inside',withoutEnlargement:true}).webp({quality:90}).toBuffer({resolveWithObject:true});}catch(e){if(e.status)throw e;fail(400,'Não foi possível ler esta fotografia. Use JPEG, PNG ou WebP válido, até 20 megapixels.');}finally{processing--;}
      const freshUser=session(req);if(!freshUser||freshUser.must_change)fail(401,'Entre novamente.');
      transaction(()=>{checkVersion(row(id,freshUser),body);if(['Entrada aprovada','Não selecionado'].includes(caseFor(id,freshUser).stage))requireAdmin(freshUser);if(!source&&photos(id).length>=20)fail(400,'Limite de 20 fotografias por imóvel.');if(source){db.prepare('UPDATE listing_photos SET id=?,data=?,width=?,height=?,original_data=?,enhancement=? WHERE id=?').run(randomUUID(),output.data,output.info.width,output.info.height,source.original_data||source.data,'ESRGAN Slim 2×',source.id);}else db.prepare('INSERT INTO listing_photos (id,listing_id,data,width,height,caption,position,room) VALUES (?,?,?,?,?,?,?,?)').run(randomUUID(),id,output.data,output.info.width,output.info.height,caption,photos(id).length,room);changed(id,freshUser,'Fotografia adicionada');});send(res,201,detail(row(id,freshUser),freshUser));return true;
    }
    if(['publish','unpublish'].includes(match[2])&&req.method==='POST'){
      fields(body,['version','confirmed']);requireAdmin(user);
      if(match[2]==='publish'){
        if(body.confirmed!==true)fail(400,'Confirme a autorização para divulgar as informações e fotografias.');
        const issues=blockers(r);if(issues.length)fail(409,issues.join(' '));
        transaction(()=>{checkVersion(row(id,user),body);db.prepare('UPDATE listings SET published=?,published_version=version,version=version+1 WHERE id=?').run(JSON.stringify(publicData(r)),id);audit(user.id,'Anúncio publicado','Administrador confirmou autorização e revisão do anúncio. Publicação no servidor conectado.',id);});
      }else transaction(()=>{db.prepare('UPDATE listings SET published=NULL,published_version=NULL,version=version+1 WHERE id=?').run(id);audit(user.id,'Anúncio retirado','Informações e fotografias deixaram de estar disponíveis no catálogo público.',id);});
      send(res,200,detail(row(id,user),user));return true;
    }
    fail(405,'Operação indisponível.');
  }
  return {handle,publicHandle};
}
