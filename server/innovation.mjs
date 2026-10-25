import {createHash} from 'node:crypto';
import {fail,fields,text,admin,checkVersion} from './cloud/domain.mjs';
export const innovationFronts=['EME · Operação imobiliária','EME Spatial · Experiências 3D','Select · Experiência do cliente','Outra possibilidade'];
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function innovationInput(body){
 fields(body,['requestId','name','email','front','idea','url','consent']);
 if(!uuid.test(body.requestId)||body.consent!==true)fail(400,'Confira a autorização para enviar a ideia.');
 const name=text(body.name,2,100),email=text(body.email,5,180).toLowerCase(),idea=text(body.idea,20,800),url=text(body.url??'',0,500);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!innovationFronts.includes(body.front))fail(400,'Confira o e-mail e a frente escolhida.');
 if(url){let parsed;try{parsed=new URL(url);}catch{fail(400,'Informe um link de apresentação válido.');}if(parsed.protocol!=='https:'||parsed.username||parsed.password)fail(400,'Use um link HTTPS sem credenciais.');}
 return {id:body.requestId.toLowerCase(),name,email,front:body.front,idea,url,consent:true};
}
export function createInnovationApi({store,rate,now=()=>new Date()}){
 return {
  async publicHandle(path,req,body,send){
   if(path!=='/api/public/innovation')return false;
   if(req.method!=='POST')fail(405,'Envie a apresentação pelo formulário.');
   const input=innovationInput(body);await rate(req);
   const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
   await store.receive(input.id,{kind:'innovation_submission',hash,status:'new',submittedAt:now().toISOString(),entry:input});
   send(201,{reference:input.id});return true;
  },
  async handle(path,req,user,body,send){
   if(path!=='/api/innovation'&&!/^\/api\/innovation\/[a-f0-9-]{36}$/.test(path))return false;
   admin(user);
   if(path==='/api/innovation'&&req.method==='GET'){
    const query=new URL(req.url,'https://eme.local').searchParams,offset=Number(query.get('offset')||0);
    if(!Number.isInteger(offset)||offset<0||offset>100000)fail(400,'Página inválida.');
    const rows=await store.list(offset,51);send(200,{ideas:rows.slice(0,50).map(row=>({id:row.id,version:row.version,status:row.data.status,submittedAt:row.data.submittedAt,...row.data.entry})),hasMore:rows.length>50});return true;
   }
   if(req.method==='PATCH'){
    fields(body,['version','status']);if(!['new','reviewing','contacted','archived','deleted'].includes(body.status))fail(400,'Situação inválida.');
    const id=path.split('/').at(-1),row=await store.read(id);if(!row||row.data.kind!=='innovation_submission'||row.data.status==='deleted')fail(404,'Apresentação não encontrada.');
    checkVersion(row,body);
    const data=body.status==='deleted'?{kind:'innovation_submission',hash:row.data.hash,status:'deleted',deletedAt:now().toISOString()}:{...row.data,status:body.status,reviewedAt:now().toISOString()};
    await store.update(req,row,data,user);send(200,{ok:true});return true;
   }
   fail(405,'Método não permitido.');
  }
 };
}
