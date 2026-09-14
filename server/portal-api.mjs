import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { attachCuration } from './curation.mjs';
import { attachListings } from './listings.mjs';
const scrypt = promisify(scryptCallback);
const COOKIE = 'eme_portal_session';
const MAX_AGE = 8 * 60 * 60 * 1000;
const IDLE = 30 * 60 * 1000;
const roles = ['admin', 'corretor'];
const types = ['Casa','Casa em condomínio','Apartamento','Compacto','Sala comercial','Loja','Galpão','Pavilhão','Terreno urbano','Terra agrícola'];
const stages = ['Recebido','Em avaliação','Ajustes solicitados'];
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => { const error = new Error(message); error.status = status; throw error; };
function text(value, name, min = 1, max = 120) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) fail(400, name + ': confira o tamanho e o conteúdo.');
  return value.trim();
}
function email(value) { const result = text(value, 'E-mail', 5, 180).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, 'Informe um e-mail válido.'); return result; }
function password(value) { if (typeof value !== 'string' || value.length < 12 || value.length > 128) fail(400, 'Use uma senha com 12 a 128 caracteres.'); return value; }
function fields(body, allowed) { if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !allowed.includes(k))) fail(400, 'Campos não permitidos nesta operação.'); }
async function hashPassword(value, salt = randomBytes(16).toString('hex')) {
  const result = await scrypt(value, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 });
  return salt + ':' + result.toString('hex');
}
async function verifyPassword(value, stored) {
  const [salt, expected] = stored.split(':');
  const actual = (await hashPassword(value, salt)).split(':')[1];
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'X-Frame-Options':'DENY' });
  res.end(JSON.stringify(body));
}
async function json(req, limit = 32768) {
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) fail(415, 'Formato de solicitação não permitido.');
  let size = 0; const chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > limit) fail(413, 'Solicitação muito grande.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail(400, 'Solicitação inválida.'); }
}
export function createPortalApi({ dbPath, now = () => Date.now() }) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(dbPath, { timeout: 5000 });
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;');
  if (db.prepare('PRAGMA user_version').get().user_version > 3) throw new Error('Database schema is newer than this server.');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','corretor')), active INTEGER NOT NULL DEFAULT 1,
      must_change INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL, last_seen INTEGER NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, city TEXT NOT NULL, type TEXT NOT NULL, operation TEXT NOT NULL,
      owner TEXT NOT NULL, assignee_id TEXT NOT NULL REFERENCES users(id), stage TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY, evaluation_id TEXT REFERENCES evaluations(id), actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until_at INTEGER NOT NULL) STRICT;
    CREATE INDEX IF NOT EXISTS evaluations_assignee ON evaluations(assignee_id);
    CREATE INDEX IF NOT EXISTS audit_evaluation ON audit(evaluation_id, id);
  `);
  const stamp = () => new Date(now()).toISOString();
  const transaction = fn => { db.exec('BEGIN IMMEDIATE'); try { const value = fn(); db.exec('COMMIT'); return value; } catch (error) { db.exec('ROLLBACK'); throw error; } };
  const safeUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: Boolean(u.active), mustChangePassword: Boolean(u.must_change) });
  const audit = (actor, action, detail, caseId = null) => db.prepare('INSERT INTO audit (evaluation_id, actor_id, action, detail, created_at) VALUES (?,?,?,?,?)').run(caseId, actor, action, detail, stamp());
  function consume(key, max = 8) {
    db.prepare('DELETE FROM limits WHERE until_at < ?').run(now());
    const current = db.prepare('SELECT * FROM limits WHERE key=?').get(key);
    if (current && current.count >= max) fail(429, 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.');
    db.prepare('INSERT INTO limits (key,count,until_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key, now() + 15 * 60 * 1000);
  }
  function cookie(res, token, expired = false) {
    res.setHeader('Set-Cookie', COOKIE + '=' + token + '; Path=/api; HttpOnly; SameSite=Strict; Max-Age=' + (expired ? 0 : MAX_AGE / 1000));
  }
  function openSession(res, userId) {
    db.prepare('DELETE FROM sessions WHERE expires_at < ? OR last_seen < ?').run(now(), now() - IDLE);
    const token = randomBytes(32).toString('base64url');
    db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(digest(token), userId, now() + MAX_AGE, now());
    cookie(res, token);
  }
  const tokenOf = req => (String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '=')) || '').slice(COOKIE.length + 1);
  function session(req) {
    const token = tokenOf(req);
    if (!/^[\w-]{43}$/.test(token)) return null;
    const hash = digest(token);
    const row = db.prepare('SELECT users.*, sessions.expires_at, sessions.last_seen FROM sessions JOIN users ON users.id=sessions.user_id WHERE token_hash=?').get(hash);
    if (!row || !row.active || row.expires_at < now() || row.last_seen < now() - IDLE) {
      db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash); return null;
    }
    db.prepare('UPDATE sessions SET last_seen=? WHERE token_hash=?').run(now(), hash);
    return row;
  }
  const requireAdmin = user => { if (user.role !== 'admin') fail(403, 'Esta ação é reservada ao administrador.'); };
  function assigned(id) { const user = db.prepare('SELECT * FROM users WHERE id=? AND active=1').get(id); if (!user) fail(400, 'Escolha um responsável ativo.'); return user; }
  const caseQuery = 'SELECT evaluations.*, users.name AS assignee FROM evaluations JOIN users ON users.id=evaluations.assignee_id';
  function caseFor(id, user) {
    const row = db.prepare(caseQuery + ' WHERE evaluations.id=?').get(id);
    if (!row || user.role !== 'admin' && row.assignee_id !== user.id) fail(404, 'Avaliação não encontrada.');
    return row;
  }
  const curation = attachCuration({db,fail,text,fields,caseFor,transaction,audit,stamp,requireAdmin,send});
  const caseDetails = (id,user) => ({
    evaluation: caseFor(id,user),
    curation: curation.read(caseFor(id,user)),
    history: db.prepare('SELECT audit.id, audit.action, audit.detail, audit.created_at, users.name AS author FROM audit JOIN users ON users.id=audit.actor_id WHERE evaluation_id=? ORDER BY audit.id DESC').all(id)
  });
  const listings = attachListings({db,fail,text,fields,caseFor,transaction,audit,stamp,requireAdmin,send,session});
  let hashing = 0;
  async function passwordJob(fn) {
    if (hashing >= 2) fail(503, 'O acesso está ocupado. Tente novamente em alguns instantes.');
    hashing++;
    try { return await fn(); } finally { hashing--; }
  }
  async function handle(req, res) {
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    if (!path.startsWith('/api/')) return false;
    try {
      const host = new URL('http://' + req.headers.host);
      if (!['127.0.0.1','localhost'].includes(host.hostname)) fail(403, 'Host não permitido.');
      if (!['GET','POST','PATCH'].includes(req.method)) fail(405, 'Método não permitido.');
      if (req.method !== 'GET') {
        if (req.headers.origin !== host.origin || req.headers['sec-fetch-site'] === 'cross-site') fail(403, 'Origem não permitida.');
      }
      if (await listings.publicHandle(path,req,res)) return true;
      const isPhotoUpload = /^\/api\/listings\/[a-f0-9-]{36}\/photos$/.test(path);
      if (isPhotoUpload) { const access=session(req); if(!access||access.must_change)fail(401,'Entre para enviar fotografias.'); }
      const requestBody = req.method === 'GET' ? null : await json(req,isPhotoUpload?11300000:32768);
      const user = session(req);
      if (path === '/api/auth/session' && req.method === 'GET') {
        send(res, 200, { user: user ? safeUser(user) : null, needsSetup: db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0 }); return true;
      }
      if (path === '/api/auth/setup' && req.method === 'POST') {
        if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count !== 0) fail(409, 'O acesso inicial já foi configurado.');
        consume('setup', 10);
        const body = requestBody; fields(body, ['name','email','password']);
        const name = text(body.name, 'Nome', 2, 80), address = email(body.email), secret = password(body.password);
        const stored = await passwordJob(() => hashPassword(secret));
        const id = randomUUID();
        transaction(() => {
          if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count !== 0) fail(409, 'O acesso inicial já foi configurado.');
          db.prepare('INSERT INTO users (id,name,email,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').run(id,name,address,stored,'admin',stamp());
          audit(id, 'Conta inicial criada', 'Administrador configurou o acesso local.');
          openSession(res,id);
        });
        send(res,201,{ user: safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(id)) }); return true;
      }
      if (path === '/api/auth/login' && req.method === 'POST') {
        const body = requestBody; fields(body,['email','password']);
        const address = email(body.email);
        if (typeof body.password !== 'string' || body.password.length > 128) fail(400,'Confira os dados de acesso.');
        const key = 'login:' + digest(address);
        consume('login-total',100); consume(key,8);
        const account = db.prepare('SELECT * FROM users WHERE email=?').get(address);
        const dummy = '00000000000000000000000000000000:' + '00'.repeat(64);
        const matches = await passwordJob(() => verifyPassword(body.password, account?.password_hash || dummy));
        const fresh = account && db.prepare('SELECT * FROM users WHERE id=?').get(account.id);
        if (!matches || !fresh?.active || fresh.password_hash !== account.password_hash) fail(401, 'E-mail ou senha inválidos.');
        db.prepare('DELETE FROM limits WHERE key=?').run(key);
        db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(tokenOf(req)));
        openSession(res, fresh.id);
        send(res,200,{ user:safeUser(fresh) }); return true;
      }
      if (!user) fail(401, 'Entre na sua conta para continuar.');
      if (path === '/api/auth/logout' && req.method === 'POST') {
        db.prepare('DELETE FROM sessions WHERE token_hash=?').run(digest(tokenOf(req)));
        cookie(res,'',true); send(res,200,{ ok:true }); return true;
      }
      if (path === '/api/auth/password' && req.method === 'POST') {
        const body = requestBody; fields(body,['currentPassword','newPassword']);
        password(body.currentPassword); password(body.newPassword);
        if (body.currentPassword === body.newPassword) fail(400,'Escolha uma senha diferente da atual.');
        consume('password:' + user.id,8);
        const result = await passwordJob(async () => {
          if (!await verifyPassword(body.currentPassword,user.password_hash)) fail(400,'A senha atual não confere.');
          return hashPassword(body.newPassword);
        });
        transaction(() => {
          const fresh = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
          if (!fresh.active || fresh.password_hash !== user.password_hash) fail(409,'O acesso foi alterado. Entre novamente.');
          db.prepare('UPDATE users SET password_hash=?, must_change=0 WHERE id=?').run(result,user.id);
          db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
          db.prepare('DELETE FROM limits WHERE key=?').run('password:' + user.id);
          audit(user.id,'Senha alterada','Sessões anteriores encerradas.');
          openSession(res,user.id);
        });
        send(res,200,{ user:safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(user.id)) }); return true;
      }
      if (user.must_change) fail(403,'Altere a senha inicial antes de continuar.');
      if (await listings.handle(path,req,res,user,requestBody)) return true;
      if (curation.handle(path,req,res,user,requestBody,caseDetails)) return true;
      if (path === '/api/assignees' && req.method === 'GET') {
        const members = user.role === 'admin' ? db.prepare('SELECT id,name,role FROM users WHERE active=1 ORDER BY name').all() : [{id:user.id,name:user.name,role:user.role}];
        send(res,200,{ members }); return true;
      }
      if (path === '/api/users') {
        requireAdmin(user);
        if (req.method === 'GET') { send(res,200,{ users:db.prepare('SELECT * FROM users ORDER BY created_at').all().map(safeUser) }); return true; }
        if (req.method === 'POST') {
          const body = requestBody; fields(body,['name','email','password','role']);
          const name = text(body.name,'Nome',2,80), address=email(body.email), secret=password(body.password);
          if (!roles.includes(body.role)) fail(400,'Perfil inválido.');
          if (db.prepare('SELECT id FROM users WHERE email=?').get(address)) fail(409,'Este e-mail já está cadastrado.');
          consume('create-user:' + user.id,20);
          const stored = await passwordJob(() => hashPassword(secret));
          const id = randomUUID();
          transaction(() => {
            const actor = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
            if (!actor.active || actor.role !== 'admin') fail(403,'O acesso foi alterado.');
            if (db.prepare('SELECT id FROM users WHERE email=?').get(address)) fail(409,'Este e-mail já está cadastrado.');
            db.prepare('INSERT INTO users (id,name,email,password_hash,role,must_change,created_at) VALUES (?,?,?,?,?,1,?)').run(id,name,address,stored,body.role,stamp());
            audit(user.id,'Pessoa adicionada à equipe',name + ' · ' + body.role);
          });
          send(res,201,{ user:safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(id)) }); return true;
        }
      }
      const userMatch=path.match(/^\/api\/users\/([a-f0-9-]{36})$/);
      if (userMatch && req.method === 'PATCH') {
        requireAdmin(user); const body=requestBody; fields(body,['active']);
        if (typeof body.active !== 'boolean') fail(400,'Informe a situação de acesso.');
        if (userMatch[1] === user.id) fail(400,'Você não pode desativar a própria conta.');
        const member = db.prepare('SELECT * FROM users WHERE id=?').get(userMatch[1]);
        if (!member) fail(404,'Pessoa não encontrada.');
        transaction(() => {
          if (!body.active && member.role === 'admin' && db.prepare("SELECT COUNT(*) AS count FROM users WHERE role='admin' AND active=1").get().count <= 1) fail(400,'Mantenha um administrador ativo.');
          db.prepare('UPDATE users SET active=? WHERE id=?').run(Number(body.active),member.id);
          if (!body.active) db.prepare('DELETE FROM sessions WHERE user_id=?').run(member.id);
          audit(user.id,body.active ? 'Acesso reativado' : 'Acesso desativado',member.name);
        });
        send(res,200,{ ok:true }); return true;
      }
      if (path === '/api/evaluations') {
        if (req.method === 'GET') {
          const items = user.role === 'admin' ? db.prepare(caseQuery + ' ORDER BY evaluations.updated_at DESC').all() : db.prepare(caseQuery + ' WHERE assignee_id=? ORDER BY evaluations.updated_at DESC').all(user.id);
          send(res,200,{ evaluations:items }); return true;
        }
        if (req.method === 'POST') {
          const body = requestBody; fields(body,['title','city','type','operation','owner','assigneeId']);
          const title=text(body.title,'Nome do imóvel'), city=text(body.city,'Cidade'), owner=text(body.owner ?? '', 'Solicitante',0,120);
          if (!types.includes(body.type) || !['Venda','Locação','Venda e locação'].includes(body.operation)) fail(400,'Tipo ou finalidade inválidos.');
          const assigneeId = body.assigneeId || user.id;
          if (user.role !== 'admin' && assigneeId !== user.id) fail(403,'Atribua o cadastro à sua própria carteira.');
          assigned(assigneeId);
          const id=randomUUID(), time=stamp();
          transaction(() => {
            db.prepare('INSERT INTO evaluations (id,title,city,type,operation,owner,assignee_id,stage,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,title,city,body.type,body.operation,owner,assigneeId,'Recebido',time,time);
            audit(user.id,'Cadastro criado','Candidatura recebida; avaliação e documentação ainda não iniciadas.',id);
          });
          send(res,201,caseDetails(id,user)); return true;
        }
      }
      const match=path.match(/^\/api\/evaluations\/([a-f0-9-]{36})$/);
      if (match) {
        const item=caseFor(match[1],user);
        if (req.method === 'GET') { send(res,200,caseDetails(item.id,user)); return true; }
        if (req.method === 'PATCH') {
          const body=requestBody; fields(body,['version','stage','note','assigneeId']);
          if (['Entrada aprovada','Não selecionado','Aguardando decisão'].includes(item.stage)) fail(409,'Use o fluxo de decisão da curadoria para alterar esta etapa.');
          if (!Number.isInteger(body.version)) fail(400,'A versão do cadastro é obrigatória.');
          const note=text(body.note,'Observação',5,3000);
          if (body.stage !== undefined && !stages.includes(body.stage)) fail(400,'Etapa inválida. A liberação de entrada ainda não está habilitada.');
          const assigneeId=body.assigneeId || item.assignee_id;
          if (assigneeId !== item.assignee_id) { requireAdmin(user); assigned(assigneeId); }
          transaction(() => {
            const fresh=caseFor(item.id,user);
            if (fresh.version !== body.version) fail(409,'Este cadastro mudou. Reabra o dossiê para conferir a versão atual antes de salvar.');
            db.prepare('UPDATE evaluations SET stage=?, assignee_id=?, version=version+1, updated_at=? WHERE id=?').run(body.stage || fresh.stage,assigneeId,stamp(),item.id);
            const assignment = assigneeId !== fresh.assignee_id ? ' Responsável: ' + assigned(assigneeId).name + '.' : '';
            audit(user.id,body.stage && body.stage !== fresh.stage ? 'Etapa: ' + body.stage : 'Acompanhamento registrado',note + assignment,item.id);
          });
          send(res,200,caseDetails(item.id,user)); return true;
        }
      }
      fail(404,'Operação não encontrada.');
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error('Portal API failure:', error.code || error.name);
      send(res,status,{ error:status === 500 ? 'Não foi possível concluir. Tente novamente.' : error.message });
    }
    return true;
  }
  return { handle, close: () => db.close() };
}
