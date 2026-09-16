import { readCuration, curationSnapshot } from './curation-policy.mjs';
const closed = ['Entrada aprovada','Não selecionado'];
export function attachCuration({db,fail,text,fields,caseFor,transaction,audit,stamp,requireAdmin,send}) {
  db.exec('BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS curation (evaluation_id TEXT PRIMARY KEY REFERENCES evaluations(id), data TEXT NOT NULL) STRICT; COMMIT;');
  if(db.prepare('PRAGMA user_version').get().user_version<2)db.exec('PRAGMA user_version=2;');
  function read(item) {
    const stored=db.prepare('SELECT data FROM curation WHERE evaluation_id=?').get(item.id);
    const saved=stored?JSON.parse(stored.data):null;
    return readCuration({saved,type:item.type,stage:item.stage});
  }
  function persist(id,data) {db.prepare('INSERT INTO curation VALUES (?,?) ON CONFLICT(evaluation_id) DO UPDATE SET data=excluded.data').run(id,JSON.stringify(data));}
  function version(item,body) {if(!Number.isInteger(body.version)) fail(400,'A versão do dossiê é obrigatória.');if(item.version!==body.version) fail(409,'O dossiê mudou. Recarregue antes de continuar.');}
  function bump(id,stage) {if(stage!=='Entrada aprovada'&&db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='listings'").get())db.prepare('UPDATE listings SET published=NULL,published_version=NULL,version=version+1 WHERE id=?').run(id);db.prepare('UPDATE evaluations SET stage=?,version=version+1,updated_at=? WHERE id=?').run(stage,stamp(),id);}
  function handle(path,req,res,user,body,details) {
    const match=path.match(/^\/api\/evaluations\/([a-f0-9-]{36})\/(curation|decision)$/);
    if(!match)return false;
    const item=caseFor(match[1],user);
    if(req.method!=='POST')fail(405,'Use uma operação de atualização do dossiê.');
    if(match[2]==='curation') {
      fields(body,['version','criteria','checks','pending']); version(item,body);
      if(closed.includes(item.stage))fail(409,'Reabra a decisão antes de editar a curadoria.');
      const previous=read(item);
      if(!Array.isArray(body.criteria)||body.criteria.length!==previous.criteria.length||!Array.isArray(body.checks)||body.checks.length!==previous.checks.length)fail(400,'Preencha os critérios e verificações esperados para esta versão da política.');
      const criteria=previous.criteria.map(c=>{
        const entries=body.criteria.filter(x=>x?.key===c.key);if(entries.length!==1)fail(400,'Critério inválido ou repetido.');
        const value=entries[0];fields(value,['key','score','note']);
        if(value.score!==null&&(!Number.isInteger(value.score)||value.score<0||value.score>5))fail(400,'Notas devem ser inteiras, de 0 a 5.');
        const note=text(value.note,'Evidência',0,1800);
        if(value.score!==null&&note.length<10)fail(400,'Toda nota exige uma evidência com pelo menos 10 caracteres.');
        return {key:c.key,score:value.score,note};
      });
      const checks=previous.checks.map(c=>{
        const entries=body.checks.filter(x=>x?.key===c.key);if(entries.length!==1)fail(400,'Verificação inválida ou repetida.');
        const value=entries[0];fields(value,['key','state','note']);
        if(!['Pendente','Em revisão','Conferido'].includes(value.state))fail(400,'Situação documental inválida.');
        const note=text(value.note,'Referência da verificação',0,1800);
        const changed=value.state!==c.state||note!==c.note;
        if(changed&&(value.state==='Conferido'||c.state==='Conferido'))requireAdmin(user);
        if(value.state==='Conferido'&&note.length<10)fail(400,'Informe responsável, fonte, data e escopo da conferência.');
        return {key:c.key,state:value.state,note,author:changed?user.name:c.author,date:changed?stamp():c.date};
      });
      const pending=text(body.pending,'Pendências',0,3000);
      transaction(()=>{
        version(caseFor(item.id,user),body);persist(item.id,curationSnapshot({...previous,criteria,checks,pending}));bump(item.id,'Em avaliação');
        audit(user.id,'Curadoria revisada · '+previous.policy,criteria.map((c,i)=>previous.criteria[i].label+': '+(c.score??'Não verificado')+'/5. '+c.note).join('\n')+'\n'+checks.map((c,i)=>previous.checks[i].label+': '+c.state+'. '+c.note).join('\n')+'\nPendências: '+(pending||'Nenhuma registrada.'),item.id);
      });
    } else {
      fields(body,['version','action','reason','acknowledged']);version(item,body);
      if(!['submit','approve','reject','adjust','reopen'].includes(body.action))fail(400,'Decisão inválida.');
      const reason=text(body.reason,'Motivo',10,3000), current=read(item);
      if(body.action!=='submit')requireAdmin(user);
      if(body.action==='reopen'&&!closed.includes(item.stage))fail(409,'Este dossiê não possui decisão encerrada.');
      if(body.action!=='reopen'&&closed.includes(item.stage))fail(409,'A decisão já foi registrada. Reabra para nova análise.');
      if(body.action==='submit'&&item.stage==='Aguardando decisão')fail(409,'O dossiê já está aguardando decisão.');
      if(body.action==='approve'&&item.stage!=='Aguardando decisão')fail(409,'Encaminhe o dossiê para decisão antes de aprovar.');
      if(['submit','approve'].includes(body.action)&&current.blockers.length)fail(409,current.blockers.join(' '));
      if(body.action==='approve'&&body.acknowledged!==true)fail(400,'Confirme a revisão humana e a aplicação da régua piloto a esta decisão.');
      const stage={submit:'Aguardando decisão',approve:'Entrada aprovada',reject:'Não selecionado',adjust:'Ajustes solicitados',reopen:'Em avaliação'}[body.action];
      transaction(()=>{
        version(caseFor(item.id,user),body);
        // Freeze the policy even when the first action is rejection. Reopening
        // preserves the policy and requires fresh human sign-offs.
        persist(item.id,curationSnapshot(body.action==='reopen'?{...current,checks:current.checks.map(c=>({...c,state:'Em revisão',author:user.name,date:stamp()}))}:current));
        bump(item.id,stage);
        audit(user.id,body.action==='reopen'?'Decisão reaberta':stage,reason+'\nRégua: '+current.policy+'. Nota: '+(current.score??'incompleta')+'.'+(body.action==='approve'?' Revisão humana confirmada. Entrada interna; sem publicação automática.':''),item.id);
      });
    }
    send(res,200,details(item.id,user));return true;
  }
  return {read,handle};
}
