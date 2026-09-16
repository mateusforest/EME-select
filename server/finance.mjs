import {createHash} from 'node:crypto';
import {emptyFinance, applyFinanceCommand} from '../shared/finance.mjs';

const MAX_STATE_BYTES = 2_000_000;
const failWith = (status, message) => { const error = new Error(message); error.status = status; throw error; };
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const financeFingerprint = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function financeEnvelope(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['version','requestId','command'].includes(key))) failWith(400, 'Solicitação financeira inválida.');
  if (!Number.isSafeInteger(body.version) || body.version < 0) failWith(400, 'Informe a versão do financeiro.');
  if (typeof body.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(body.requestId)) failWith(400, 'Referência de envio inválida.');
  if (!body.command || typeof body.command !== 'object' || Array.isArray(body.command) || typeof body.command.type !== 'string' || body.command.type.length > 80) failWith(400, 'Comando financeiro inválido.');
  if (Buffer.byteLength(JSON.stringify(body.command)) > 30_000) failWith(413, 'Reduza o tamanho do lançamento.');
  return {version:body.version, requestId:body.requestId, command:body.command, fingerprint:financeFingerprint(body.command)};
}
export function financeStateSize(state) {
  if (Buffer.byteLength(JSON.stringify(state)) >= MAX_STATE_BYTES) failWith(413, 'A base financeira atingiu o limite desta versão. Contate a equipe antes de novos lançamentos.');
}
export function financeAdmin(user) {
  if (!user) failWith(401, 'Entre na sua conta para continuar.');
  if (!user.active || user.must_change || user.role !== 'admin') failWith(403, 'O financeiro é reservado aos administradores da EME.');
}

export function attachFinance({db, transaction, stamp, send}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS finance_state (
      id TEXT PRIMARY KEY CHECK(id='company'), version INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL, updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS finance_audit (
      id INTEGER PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL, command TEXT NOT NULL, state_version INTEGER NOT NULL,
      before_hash TEXT NOT NULL, after_hash TEXT NOT NULL, created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS finance_receipts (
      request_id TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, command TEXT NOT NULL,
      state_version INTEGER NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL
    ) STRICT;
    CREATE TRIGGER IF NOT EXISTS finance_audit_no_update BEFORE UPDATE ON finance_audit BEGIN SELECT RAISE(ABORT,'Financial audit is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS finance_audit_no_delete BEFORE DELETE ON finance_audit BEGIN SELECT RAISE(ABORT,'Financial audit is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS finance_receipts_no_update BEFORE UPDATE ON finance_receipts BEGIN SELECT RAISE(ABORT,'Financial receipts are immutable'); END;
    CREATE TRIGGER IF NOT EXISTS finance_receipts_no_delete BEFORE DELETE ON finance_receipts BEGIN SELECT RAISE(ABORT,'Financial receipts are immutable'); END;
  `);
  db.prepare("INSERT OR IGNORE INTO finance_state(id,data,updated_at) VALUES('company',?,?)").run(JSON.stringify(emptyFinance()),stamp());
  const row = () => db.prepare("SELECT * FROM finance_state WHERE id='company'").get();
  const metadata = () => ({
    members:db.prepare('SELECT id,name,role,active FROM users ORDER BY name').all().map(member => ({...member,active:Boolean(member.active)})),
    properties:db.prepare('SELECT id,title FROM evaluations ORDER BY title').all(),
  });
  const snapshot = () => {
    const current=row();
    return {version:current.version,state:JSON.parse(current.data),updatedAt:current.updated_at,...metadata(),history:db.prepare('SELECT f.id,f.action,f.state_version AS version,f.created_at AS createdAt,u.name AS author FROM finance_audit f JOIN users u ON u.id=f.actor_id ORDER BY f.id DESC LIMIT 100').all()};
  };
  function handle(path, req, res, user, body) {
    if (path !== '/api/finance' && path !== '/api/finance/commands') return false;
    financeAdmin(user);
    if (path === '/api/finance' && req.method === 'GET') { send(res,200,snapshot()); return true; }
    if (path !== '/api/finance/commands' || req.method !== 'POST') failWith(405, 'Operação financeira indisponível.');
    const input=financeEnvelope(body);
    transaction(() => {
      financeAdmin(db.prepare('SELECT * FROM users WHERE id=?').get(user.id));
      const receipt=db.prepare('SELECT * FROM finance_receipts WHERE request_id=?').get(input.requestId);
      if (receipt) {
        if (receipt.payload_hash !== input.fingerprint || receipt.actor_id !== user.id) failWith(409, 'Esta referência já foi usada em outro lançamento. Atualize a tela.');
        return;
      }
      const current=row();
      if (current.version !== input.version) failWith(409, 'O financeiro mudou. Atualize a tela antes de salvar.');
      const previous=JSON.parse(current.data),time=stamp();
      const next=applyFinanceCommand(previous,input.command,{...metadata(),actorId:user.id,now:time});
      financeStateSize(next);
      const version=current.version+1;
      db.prepare("UPDATE finance_state SET data=?,version=?,updated_at=? WHERE id='company'").run(JSON.stringify(next),version,time);
      db.prepare('INSERT INTO finance_audit(actor_id,action,command,state_version,before_hash,after_hash,created_at) VALUES(?,?,?,?,?,?,?)').run(user.id,input.command.type,JSON.stringify(input.command),version,financeFingerprint(previous),financeFingerprint(next),time);
      db.prepare('INSERT INTO finance_receipts(request_id,payload_hash,command,state_version,actor_id,created_at) VALUES(?,?,?,?,?,?)').run(input.requestId,input.fingerprint,JSON.stringify(input.command),version,user.id,time);
    });
    send(res,200,snapshot()); return true;
  }
  return {handle};
}
