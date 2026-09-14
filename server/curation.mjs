const policy = 'EME-piloto-01';
const closed = ['Entrada aprovada','Não selecionado'];
const common = [
  ['physical','Condição física',30,'Estado observado, manutenção e limitações verificadas.'],
  ['use','Adequação ao uso',25,'Distribuição, acessos e infraestrutura para o uso proposto.'],
  ['context','Contexto do local',20,'Entorno, acessibilidade e condicionantes observadas.'],
  ['market','Coerência de mercado',25,'Preço pedido, despesas e comparáveis identificados e datados.'],
];
function definitions(type) {
  const rows=common.map(row=>[...row]);
  if(type.includes('Terreno')||type==='Terra agrícola') {
    rows[0][1]='Condição do terreno'; rows[0][3]='Topografia, limites e condições observadas. Não equivale a laudo técnico.';
    rows[1][3]='Acesso, infraestrutura e viabilidade do uso pretendido a conferir com os responsáveis.';
  } else if(['Galpão','Pavilhão'].includes(type)) rows[1][3]='Circulação, acessos, instalações e adequação operacional ao uso proposto.';
  else if(['Sala comercial','Loja'].includes(type)) rows[1][3]='Acesso, visibilidade quando pertinente e adequação ao uso comercial proposto.';
  return rows.map(([key,label,weight,help])=>({key,label,weight,help,score:null,note:''}));
}
const checkDefinitions=[
  ['authorization','Autorização e vínculo do solicitante'],
  ['description','Características, áreas e uso informado'],
  ['market','Fontes e comparáveis de mercado'],
  ['documents','Revisão documental pelo responsável'],
];
export function attachCuration({db,fail,text,fields,caseFor,transaction,audit,stamp,requireAdmin,send}) {
  db.exec('BEGIN IMMEDIATE; CREATE TABLE IF NOT EXISTS curation (evaluation_id TEXT PRIMARY KEY REFERENCES evaluations(id), data TEXT NOT NULL) STRICT; COMMIT;');
  if(db.prepare('PRAGMA user_version').get().user_version<2)db.exec('PRAGMA user_version=2;');
  function read(item) {
    const stored=db.prepare('SELECT data FROM curation WHERE evaluation_id=?').get(item.id);
    const saved=stored?JSON.parse(stored.data):null;
    const criteria=definitions(item.type).map(c=>({...c,...saved?.criteria.find(x=>x.key===c.key)}));
    const checks=checkDefinitions.map(([key,label])=>({key,label,state:'Pendente',note:'',author:null,date:null,...saved?.checks.find(x=>x.key===key)}));
    const complete=criteria.every(c=>c.score!==null&&c.note.trim().length>=10);
    const score=complete?Math.round(criteria.reduce((sum,c)=>sum+c.score*c.weight/5,0)):null;
    const blockers=[];
    if(!complete) blockers.push('Complete as quatro notas e suas evidências.');
    if(score!==null&&(score<80||criteria.some(c=>c.score<3))) blockers.push('A avaliação está abaixo da régua piloto: 80/100 e mínimo 3 por dimensão.');
    for(const c of checks) if(c.state!=='Conferido'||c.note.trim().length<10) blockers.push(c.label+': conferência pendente.');
    if(saved?.pending?.trim()) blockers.push('Resolva as pendências abertas antes da decisão.');
    return {policy,criteria,checks,pending:saved?.pending||'',score,blockers,coverage:criteria.filter(c=>c.score!==null&&c.note.trim().length>=10).length,locked:closed.includes(item.stage)};
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
      if(!Array.isArray(body.criteria)||body.criteria.length!==4||!Array.isArray(body.checks)||body.checks.length!==4)fail(400,'Preencha os critérios e verificações esperados.');
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
        version(caseFor(item.id,user),body);persist(item.id,{criteria,checks,pending});bump(item.id,'Em avaliação');
        audit(user.id,'Curadoria revisada · '+policy,criteria.map((c,i)=>previous.criteria[i].label+': '+(c.score??'Não verificado')+'/5. '+c.note).join('\n')+'\n'+checks.map((c,i)=>previous.checks[i].label+': '+c.state+'. '+c.note).join('\n')+'\nPendências: '+(pending||'Nenhuma registrada.'),item.id);
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
        if(body.action==='reopen') {
          // Prior sign-offs cannot silently authorize a revised submission.
          persist(item.id,{...current,checks:current.checks.map(c=>({...c,state:'Em revisão',author:user.name,date:stamp()}))});
        }
        bump(item.id,stage);
        audit(user.id,body.action==='reopen'?'Decisão reaberta':stage,reason+'\nRégua: '+policy+'. Nota: '+(current.score??'incompleta')+'.'+(body.action==='approve'?' Revisão humana confirmada. Entrada interna; sem publicação automática.':''),item.id);
      });
    }
    send(res,200,details(item.id,user));return true;
  }
  return {read,handle};
}
