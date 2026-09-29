import {randomUUID} from 'node:crypto';
import {validateSpatialProject} from '../shared/spatial-studio.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export function createSpatialApi({store,ai}){
 return {async handle(path,req,res,user,body,send){
  if(!path.startsWith('/api/spatial-studio'))return false;
  if(user.role!=='admin')fail(403,'O Spatial Studio é reservado aos administradores.');
  if(path==='/api/spatial-studio'&&req.method==='GET'){
   const projects=await store.list();let aiReady=false;try{const s=await ai.studioStatus(user);aiReady=!!(s.configured&&s.enabled);}catch{}
   send(200,{projects,aiReady,productionReady:false});return true;
  }
  if(path==='/api/spatial-studio'&&req.method==='POST'){
   const project=validateSpatialProject(body?.project);const saved=await store.save(req,user,randomUUID(),0,project);send(201,saved);return true;
  }
  const match=path.match(/^\/api\/spatial-studio\/([a-f0-9-]{36})(\/plan)?$/);
  if(!match)fail(404,'Projeto não encontrado.');
  const row=await store.find(match[1]);if(!row)fail(404,'Projeto não encontrado.');
  if(!Number.isInteger(body?.version)||body.version!==row.version)fail(409,'O projeto mudou. Recarregue antes de continuar.');
  if(match[2]&&req.method==='POST'){
   // The plan is returned for review. It neither replaces saved data nor starts a 3D job.
   const plan=await ai.studioPlan(user,row.project);send(200,{plan,sourceVersion:row.version});return true;
  }
  if(!match[2]&&req.method==='PATCH'){
   const project=validateSpatialProject(body?.project);send(200,await store.save(req,user,row.id,row.version,project));return true;
  }
  fail(405,'Operação indisponível.');
 }};
}
export function attachLocalSpatial({db,transaction,stamp,ai}){
 db.exec('CREATE TABLE IF NOT EXISTS spatial_projects(id TEXT PRIMARY KEY,version INTEGER NOT NULL,data TEXT NOT NULL,updated_at TEXT NOT NULL,actor_id TEXT NOT NULL) STRICT');
 const hydrate=r=>r?{id:r.id,version:r.version,project:JSON.parse(r.data),updatedAt:r.updated_at}:null;
 const store={list:()=>db.prepare('SELECT * FROM spatial_projects ORDER BY updated_at DESC LIMIT 100').all().map(hydrate),find:id=>hydrate(db.prepare('SELECT * FROM spatial_projects WHERE id=?').get(id)),save:(req,user,id,version,project)=>transaction(()=>{
  const row=db.prepare('SELECT version FROM spatial_projects WHERE id=?').get(id);if((row?.version||0)!==version)fail(409,'O projeto mudou. Recarregue antes de salvar.');
  db.prepare('INSERT INTO spatial_projects VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,data=excluded.data,updated_at=excluded.updated_at,actor_id=excluded.actor_id').run(id,version+1,JSON.stringify(project),stamp(),user.id);return store.find(id);
 })};return createSpatialApi({store,ai});
}
export function attachCloudSpatial({client,hashOf,ai}){
 const hydrate=r=>r?{id:r.id,version:r.version,project:r.data,updatedAt:r.updated_at}:null;
 const store={list:async()=>(await client.rest('eme_spatial_projects?order=updated_at.desc&limit=100')).map(hydrate),find:async id=>hydrate((await client.rest('eme_spatial_projects?id=eq.'+id))[0]),save:async(req,user,id,version,project)=>{
  const result=await client.rpc('eme_spatial_save',{p_session:hashOf(req),p_id:id,p_version:version,p_data:project});return hydrate(Array.isArray(result)?result[0]:result);
 }};return createSpatialApi({store,ai});
}
