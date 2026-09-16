import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { aiFail, createIntelligence } from './intelligence.mjs';

export function attachIntelligence({ db, dbPath, transaction, stamp, caseFor, consume, send, env = process.env, fetcher }) {
  db.exec(`CREATE TABLE IF NOT EXISTS ai_settings(id TEXT PRIMARY KEY CHECK(id='company'),version INTEGER NOT NULL DEFAULT 0,model TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,secret TEXT NOT NULL DEFAULT '') STRICT;
    CREATE TABLE IF NOT EXISTS ai_runs(id TEXT PRIMARY KEY,case_id TEXT NOT NULL REFERENCES evaluations(id),actor_id TEXT NOT NULL REFERENCES users(id),case_version INTEGER NOT NULL,status TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,review_version INTEGER NOT NULL DEFAULT 0) STRICT;
    CREATE TABLE IF NOT EXISTS ai_events(id INTEGER PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,run_id TEXT,created_at TEXT NOT NULL) STRICT;`);
  db.prepare("INSERT OR IGNORE INTO ai_settings(id,model) VALUES('company','gpt-5-mini')").run();
  let rawKey;
  if (env.EME_AI_ENCRYPTION_KEY) rawKey = env.EME_AI_ENCRYPTION_KEY;
  else if (dbPath === ':memory:') rawKey = randomBytes(32);
  else { const keyPath = dbPath + '.ai-key'; try { writeFileSync(keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 }); } catch (error) { if (error.code !== 'EEXIST') throw error; } rawKey = readFileSync(keyPath); }
  const encryptionKey = createHash('sha256').update(rawKey).digest();
  const live = user => { const value = db.prepare('SELECT * FROM users WHERE id=?').get(user.id); if (!value?.active || value.must_change) aiFail(401, 'Entre novamente.'); return value; };
  const admin = user => { const value = live(user); if (value.role !== 'admin') aiFail(403, 'Acesso reservado ao administrador.'); return value; };
  const event = (user, action, runId = null) => db.prepare('INSERT INTO ai_events(actor_id,action,run_id,created_at) VALUES(?,?,?,?)').run(user.id, action, runId, stamp());
  const settings = () => { const row = db.prepare("SELECT * FROM ai_settings WHERE id='company'").get(); return { ...row, enabled: Boolean(row.enabled) }; };
  const hydrate = row => row && ({ ...JSON.parse(row.data), id: row.id, caseId: row.case_id, actorId: row.actor_id, caseVersion: row.case_version, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, reviewVersion: row.review_version });
  const safeRun = row => { const value = hydrate(row); const { fingerprint, ...safe } = value; return safe; };
  const context = (id, user) => { const row = caseFor(id, live(user)), listing = db.prepare('SELECT data FROM listings WHERE id=?').get(id), curation = db.prepare('SELECT data FROM curation WHERE evaluation_id=?').get(id); return { id: row.id, version: row.version, data: { ...row, draft: listing ? JSON.parse(listing.data) : null, curation: curation ? JSON.parse(curation.data) : null, photos: db.prepare('SELECT id FROM listing_photos WHERE listing_id=?').all(id) } }; };
  const store = {
    settings,
    saveSettings: (_req, user, value) => transaction(() => { admin(user); if (settings().version !== value.version) aiFail(409, 'A configuração mudou. Atualize a tela.'); db.prepare("UPDATE ai_settings SET version=version+1,model=?,enabled=?,secret=? WHERE id='company'").run(value.model, +value.enabled, value.secret); event(user, 'Configuração da IA atualizada'); }),
    properties: user => db.prepare('SELECT id,title,version FROM evaluations WHERE ?=1 OR assignee_id=? ORDER BY updated_at DESC').all(live(user).role === 'admin' ? 1 : 0, user.id),
    caseFor: context,
    find: (id, user) => { const row = db.prepare('SELECT * FROM ai_runs WHERE id=?').get(id); if (!row) return null; context(row.case_id, user); return hydrate(row); },
    runs: user => db.prepare('SELECT a.* FROM ai_runs a JOIN evaluations e ON e.id=a.case_id WHERE ?=1 OR e.assignee_id=? ORDER BY a.created_at DESC LIMIT 100').all(live(user).role === 'admin' ? 1 : 0, user.id).map(safeRun),
    rate: user => consume('ai:' + user.id, 12),
    begin: (_req, user, value) => transaction(() => { const row = context(value.caseId, user); if (row.version !== value.caseVersion) aiFail(409, 'O imóvel mudou. Atualize a tela.'); const existing = db.prepare('SELECT id FROM ai_runs WHERE id=?').get(value.id); if (existing) return false; const at = stamp(); db.prepare('INSERT INTO ai_runs(id,case_id,actor_id,case_version,status,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)').run(value.id, value.caseId, user.id, value.caseVersion, 'processing', JSON.stringify({ ...value, actorName: user.name, review: null }), at, at); event(user, 'Análise iniciada', value.id); return true; }),
    finish: (_req, user, id, result) => transaction(() => { const row = db.prepare('SELECT * FROM ai_runs WHERE id=?').get(id); if (!row || row.actor_id !== live(user).id) aiFail(404, 'Análise não encontrada.'); const current = context(row.case_id, user); if (row.status !== 'processing') aiFail(409, 'Análise já encerrada.'); const data = JSON.parse(row.data); const stale = current.version !== row.case_version; db.prepare('UPDATE ai_runs SET status=?,data=?,updated_at=? WHERE id=?').run(result.status, JSON.stringify({ ...data, ...result, stale }), stamp(), id); event(user, result.status === 'completed' ? 'Análise concluída para revisão humana' : 'Falha na análise', id); }),
    abandon: (_req, user, id) => transaction(() => { admin(user); const row = db.prepare('SELECT * FROM ai_runs WHERE id=?').get(id); if (!row || row.status !== 'processing') aiFail(409, 'A análise não está em processamento.'); context(row.case_id, user); const at = stamp(); if (Date.parse(at) - Date.parse(row.created_at) < 300000) aiFail(409, 'Aguarde cinco minutos antes de encerrar o processamento.'); const data = JSON.parse(row.data); db.prepare("UPDATE ai_runs SET status='failed',data=?,updated_at=? WHERE id=?").run(JSON.stringify({ ...data, error: 'Processamento interrompido. Nova solicitação requer ação da equipe.', abandonedBy: user.name, abandonedAt: at }), at, id); event(user, 'Processamento interrompido encerrado pelo administrador', id); }),
    review: (_req, user, value) => transaction(() => { admin(user); const row = db.prepare('SELECT * FROM ai_runs WHERE id=?').get(value.id); if (!row || row.status !== 'completed') aiFail(404, 'Análise concluída não encontrada.'); if (row.review_version !== value.version) aiFail(409, 'Esta revisão mudou. Atualize a tela.'); const current = context(row.case_id, user); if (value.status === 'accepted' && row.case_version !== current.version) aiFail(409, 'O imóvel mudou desde a análise. Faça uma nova análise antes de validar.'); const data = JSON.parse(row.data); const review = { status: value.status, note: value.note, author: user.name, at: stamp() }; db.prepare('UPDATE ai_runs SET data=?,updated_at=?,review_version=review_version+1 WHERE id=?').run(JSON.stringify({ ...data, review, reviews: [...(data.reviews || []), review] }), stamp(), value.id); event(user, 'Recomendação ' + value.status, value.id); }),
  };
  const service = createIntelligence({ store, encryptionKey, env, fetcher });
  return { handle: (path, req, res, user, body) => service.handle(path, req, res, user, body, (status, value) => send(res, status, value)) };
}
