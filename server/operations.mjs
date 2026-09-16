import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {emptyOperations,applyOperationsCommand,operationsScope,visibleOperations} from '../shared/operations.mjs';
import {financeFingerprint} from './finance.mjs';

const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
export function operationsUser(user){if(!user)fail(401,'Entre na sua conta para continuar.');if(!user.active||user.must_change||!['admin','corretor'].includes(user.role))fail(403,'Acesso operacional não permitido.');}
export function operationsEnvelope(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!['version','requestId','command'].includes(key)))fail(400,'Solicitação operacional inválida.');
 if(!Number.isSafeInteger(body.version)||body.version<0)fail(400,'Informe a versão atual da operação.');
 if(typeof body.requestId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(body.requestId))fail(400,'Referência de envio inválida.');
 if(!body.command||typeof body.command!=='object'||Array.isArray(body.command)||typeof body.command.type!=='string'||!body.command.data||typeof body.command.data!=='object'||Array.isArray(body.command.data))fail(400,'Comando operacional inválido.');
 const max=body.command.type==='document.upload'?2_850_000:30_000;if(Buffer.byteLength(JSON.stringify(body.command))>max)fail(413,'Reduza o tamanho do envio. Documentos aceitam até 2 MiB.');
 return {...body,fingerprint:financeFingerprint(body.command)};
}
export function operationsStateSize(state){if(Buffer.byteLength(JSON.stringify(state))>=3_000_000)fail(413,'A base operacional atingiu o limite desta versão. Contate a equipe antes de novos registros.');}
export async function prepareOperationsFile(command){
 if(command.type!=='document.upload')return null;
 const data=command.data,encoded=data.contentBase64;
 if(typeof encoded!=='string'||!encoded.length||encoded.length>2796204||encoded.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))fail(400,'Envie um arquivo em PDF, PNG, JPEG ou WebP de até 2 MiB.');
 const bytes=Buffer.from(encoded,'base64');if(!bytes.length||bytes.length>2097152||bytes.toString('base64')!==encoded)fail(413,'O documento deve ter até 2 MiB.');
 let mimeType=null;
 if(bytes.subarray(0,5).toString()==='%PDF-'&&bytes.subarray(Math.max(0,bytes.length-1024)).includes(Buffer.from('%%EOF')))mimeType='application/pdf';
 else {try{const meta=await sharp(bytes,{limitInputPixels:40_000_000,failOn:'error'}).metadata();mimeType={png:'image/png',jpeg:'image/jpeg',webp:'image/webp'}[meta.format];if(!meta.width||!meta.height)mimeType=null;}catch{mimeType=null;}}
 if(!mimeType||mimeType!==data.mimeType)fail(400,'O conteúdo do arquivo não corresponde ao formato informado. Use PDF, PNG, JPEG ou WebP.');
 const base=String(data.filename||'').split(/[\\/]/).at(-1).replace(/[\u0000-\u001f\u007f"<>:|?*]/g,'').trim();
 if(!base||base.length>180)fail(400,'Informe um nome de arquivo com até 180 caracteres.');
 const extension={ 'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'}[mimeType];
 const filename=base.replace(/\.[^.]+$/,'')+extension;
 return {filename,mimeType,sizeBytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),contentBase64:encoded};
}
export function auditOperationsCommand(command,file){if(!file)return structuredClone(command);const {contentBase64:_discard,...data}=command.data;return {type:command.type,data:{...data,filename:file.filename,mimeType:file.mimeType,sizeBytes:file.sizeBytes,sha256:file.sha256}};}
export function operationsSnapshot(current,meta,user,history){
 const context={...meta,actorId:user.id,role:user.role};const allowed=new Set(meta.properties.filter(item=>user.role==='admin'||item.assigneeId===user.id).map(item=>item.id));
 return {version:current.version,state:visibleOperations(typeof current.data==='string'?JSON.parse(current.data):current.data,context),updatedAt:current.updated_at,properties:meta.properties.filter(item=>allowed.has(item.id)),members:user.role==='admin'?meta.members:meta.members.filter(item=>item.id===user.id),history:history.filter(item=>user.role==='admin'||item.propertyId&&allowed.has(item.propertyId))};
}
export function sendOperationsFile(res,file){
 const encoded=encodeURIComponent(file.filename),plain=file.filename.replace(/[^a-zA-Z0-9._-]/g,'_');
 res.writeHead(200,{'Content-Type':file.mimeType,'Content-Disposition':`attachment; filename="${plain}"; filename*=UTF-8''${encoded}`,'Content-Length':file.sizeBytes,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});res.end(Buffer.from(file.contentBase64,'base64'));
}
export function attachOperations({db,transaction,stamp,send}){
 db.exec(`CREATE TABLE IF NOT EXISTS operations_state(id TEXT PRIMARY KEY CHECK(id='company'),version INTEGER NOT NULL DEFAULT 0,data TEXT NOT NULL,updated_at TEXT NOT NULL) STRICT;
 CREATE TABLE IF NOT EXISTS operations_audit(id INTEGER PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES users(id),property_id TEXT REFERENCES evaluations(id),action TEXT NOT NULL,command TEXT NOT NULL,state_version INTEGER NOT NULL,before_hash TEXT NOT NULL,after_hash TEXT NOT NULL,created_at TEXT NOT NULL) STRICT;
 CREATE TABLE IF NOT EXISTS operations_receipts(request_id TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,command TEXT NOT NULL,state_version INTEGER NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id),property_id TEXT REFERENCES evaluations(id),created_at TEXT NOT NULL) STRICT;
 CREATE TABLE IF NOT EXISTS operations_files(id TEXT PRIMARY KEY,property_id TEXT NOT NULL REFERENCES evaluations(id),filename TEXT NOT NULL,mime_type TEXT NOT NULL,size_bytes INTEGER NOT NULL CHECK(size_bytes>0 AND size_bytes<=2097152),sha256 TEXT NOT NULL,content_base64 TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL) STRICT;
 CREATE TRIGGER IF NOT EXISTS operations_audit_no_update BEFORE UPDATE ON operations_audit BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
 CREATE TRIGGER IF NOT EXISTS operations_audit_no_delete BEFORE DELETE ON operations_audit BEGIN SELECT RAISE(ABORT,'Audit is append-only'); END;
 CREATE TRIGGER IF NOT EXISTS operations_files_no_update BEFORE UPDATE ON operations_files BEGIN SELECT RAISE(ABORT,'Document versions are immutable'); END;
 CREATE TRIGGER IF NOT EXISTS operations_files_no_delete BEFORE DELETE ON operations_files BEGIN SELECT RAISE(ABORT,'Document versions are immutable'); END;`);
 db.prepare("INSERT OR IGNORE INTO operations_state(id,data,updated_at) VALUES('company',?,?)").run(JSON.stringify(emptyOperations()),stamp());
 const row=()=>db.prepare("SELECT * FROM operations_state WHERE id='company'").get();
 const metadata=()=>({members:db.prepare('SELECT id,name,role,active FROM users ORDER BY name').all().map(item=>({...item,active:Boolean(item.active)})),properties:db.prepare('SELECT id,title,assignee_id AS assigneeId FROM evaluations ORDER BY title').all()});
 const history=user=>db.prepare('SELECT a.id,a.action,a.property_id AS propertyId,a.created_at AS createdAt,u.name AS author FROM operations_audit a JOIN users u ON u.id=a.actor_id LEFT JOIN evaluations e ON e.id=a.property_id WHERE ?=1 OR e.assignee_id=? ORDER BY a.id DESC LIMIT 200').all(user.role==='admin'?1:0,user.id);
 const snapshot=user=>operationsSnapshot(row(),metadata(),user,history(user));
 async function handle(path,req,res,user,body){
  const fileMatch=path.match(/^\/api\/operations\/documents\/([a-f0-9-]{36})\/content$/);
  if(path!=='/api/operations'&&path!=='/api/operations/commands'&&!fileMatch)return false;
  operationsUser(user);
  if(fileMatch){if(req.method!=='GET')fail(405,'Operação indisponível.');const file=db.prepare('SELECT f.* FROM operations_files f JOIN evaluations e ON e.id=f.property_id WHERE f.id=? AND (?=1 OR e.assignee_id=?)').get(fileMatch[1],user.role==='admin'?1:0,user.id);if(!file)fail(404,'Documento indisponível.');sendOperationsFile(res,{filename:file.filename,mimeType:file.mime_type,sizeBytes:file.size_bytes,contentBase64:file.content_base64});return true;}
  if(path==='/api/operations'&&req.method==='GET'){send(res,200,snapshot(user));return true;}
  if(path!=='/api/operations/commands'||req.method!=='POST')fail(405,'Operação indisponível.');
  const input=operationsEnvelope(body),file=await prepareOperationsFile(input.command),auditCommand=auditOperationsCommand(input.command,file);
  transaction(()=>{
   const actor=db.prepare('SELECT * FROM users WHERE id=?').get(user.id);operationsUser(actor);
   const current=row(),previous=JSON.parse(current.data),context={...metadata(),actorId:actor.id,role:actor.role,now:stamp(),file};
   const scope=operationsScope(previous,input.command,context);
   const receipt=db.prepare('SELECT * FROM operations_receipts WHERE request_id=?').get(input.requestId);
   if(receipt){if(receipt.payload_hash!==input.fingerprint||receipt.actor_id!==actor.id)fail(409,'Esta referência já foi usada em outro registro.');return;}
   if(current.version!==input.version)fail(409,'A operação mudou. Atualize os dados antes de salvar.');
   const next=applyOperationsCommand(previous,input.command,context);operationsStateSize(next);
   if(file){const document=next.documents.find(item=>!previous.documents.some(old=>old.id===item.id));if(!document)fail(400,'Documento não gerado.');db.prepare('INSERT INTO operations_files(id,property_id,filename,mime_type,size_bytes,sha256,content_base64,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(document.id,document.propertyId,file.filename,file.mimeType,file.sizeBytes,file.sha256,file.contentBase64,actor.id,context.now);}
   const version=current.version+1;db.prepare("UPDATE operations_state SET data=?,version=?,updated_at=? WHERE id='company'").run(JSON.stringify(next),version,context.now);
   db.prepare('INSERT INTO operations_audit(actor_id,property_id,action,command,state_version,before_hash,after_hash,created_at) VALUES(?,?,?,?,?,?,?,?)').run(actor.id,scope.propertyId,input.command.type,JSON.stringify(auditCommand),version,financeFingerprint(previous),financeFingerprint(next),context.now);
   db.prepare('INSERT INTO operations_receipts(request_id,payload_hash,command,state_version,actor_id,property_id,created_at) VALUES(?,?,?,?,?,?,?)').run(input.requestId,input.fingerprint,JSON.stringify(auditCommand),version,actor.id,scope.propertyId,context.now);
  });
  send(res,200,snapshot(user));return true;
 }
 return {handle};
}
