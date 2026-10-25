import {createHash} from 'node:crypto';
import {createInnovationApi} from './innovation.mjs';
import {fail} from './cloud/domain.mjs';
export function attachLocalInnovation({db,transaction,consume,audit}){
 db.exec('CREATE TABLE IF NOT EXISTS innovation_submissions(id TEXT PRIMARY KEY,version INTEGER NOT NULL,data TEXT NOT NULL)');
 const read=id=>{const row=db.prepare('SELECT * FROM innovation_submissions WHERE id=?').get(id);return row?{...row,data:JSON.parse(row.data)}:null;};
 return createInnovationApi({store:{
  read,
  list:(offset,limit)=>db.prepare("SELECT * FROM innovation_submissions WHERE json_extract(data,'$.status')!='deleted' ORDER BY json_extract(data,'$.submittedAt') DESC,id LIMIT ? OFFSET ?").all(limit,offset).map(row=>({...row,data:JSON.parse(row.data)})),
  receive:(id,data)=>transaction(()=>{const previous=read(id);if(previous){if(previous.data.hash!==data.hash)fail(409,'Esta apresentação mudou. Revise antes de enviar novamente.');return;}db.prepare('INSERT INTO innovation_submissions(id,version,data) VALUES(?,1,?)').run(id,JSON.stringify(data));}),
  update:(req,row,data,user)=>transaction(()=>{const changed=db.prepare('UPDATE innovation_submissions SET data=?,version=version+1 WHERE id=? AND version=?').run(JSON.stringify(data),row.id,row.version);if(!changed.changes)fail(409,'A apresentação mudou. Atualize a lista.');audit(user.id,data.status==='deleted'?'Ideia excluída':'Ideia revisada','Apresentação recebida pela página Inovação.');}),
 },rate:req=>{consume('innovation:'+createHash('sha256').update(req.socket.remoteAddress||'unknown').digest('hex'),6);consume('innovation:total',100);}});
}
