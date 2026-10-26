import {createProposalsApi} from './proposals.mjs';
import {fail} from './cloud/domain.mjs';
export function attachLocalProposals({db,transaction,audit,property}){
 db.exec('CREATE TABLE IF NOT EXISTS acquisition_proposals(id TEXT PRIMARY KEY,assignee_id TEXT NOT NULL,version INTEGER NOT NULL,data TEXT NOT NULL)');
 const decode=row=>row?{...row,data:JSON.parse(row.data)}:null;
 const read=id=>decode(db.prepare('SELECT * FROM acquisition_proposals WHERE id=?').get(id));
 return createProposalsApi({property,store:{read,
  list:(user,offset,limit)=>db.prepare('SELECT * FROM acquisition_proposals'+(user.role==='admin'?'':' WHERE assignee_id=?')+" ORDER BY json_extract(data,'$.record.updatedAt') DESC,id LIMIT ? OFFSET ?").all(...(user.role==='admin'?[]:[user.id]),limit,offset).map(decode),
  write:(req,row,data,user)=>transaction(()=>{
   const current=read(row.id);if((current?.version||0)!==row.version)fail(409,'A proposta mudou. Reabra antes de salvar.');
   db.prepare('INSERT INTO acquisition_proposals(id,assignee_id,version,data) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,data=excluded.data').run(row.id,row.assignee_id,row.version+1,JSON.stringify(data));
   audit(user.id,'Proposta salva','Condições comerciais registradas no portal.');return read(row.id);
  })
 }});
}
