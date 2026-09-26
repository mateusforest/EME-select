import {peopleRecordId} from '../people.mjs';
import {developmentRecordId} from '../../shared/development.mjs';
import { createHash } from 'node:crypto';
import { createIntelligence, aiFail } from '../intelligence.mjs';

export function attachCloudIntelligence({ client, hashOf, caseFor, env = process.env, fetcher }) {
  const { rest, rpc } = client;
  const encryptionKey = createHash('sha256').update('eme-ai-v1:' + (env.EME_AI_ENCRYPTION_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || '')).digest();
  const write = (req, action, data) => rpc('eme_ai_write', { p_session: hashOf(req), p_action: action, p_data: data });
  const hydrate = row => row && ({ ...row.data, id: row.id, caseId: row.case_id, actorId: row.actor_id, caseVersion: row.case_version, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, reviewVersion: row.review_version });
  const properties = user => rest('eme_cases?id=neq.'+peopleRecordId+'&id=neq.'+developmentRecordId+'&select=id,version,data->>title&order=updated_at.desc' + (user.role === 'admin' ? '' : '&assignee_id=eq.' + user.id));
  const store = {
    settings: async () => { const row = (await rest('eme_ai_settings?id=eq.company&select=version,model,enabled,secret'))[0]; if (!row) aiFail(503, 'A Central de IA ainda não foi ativada no servidor.'); return row; },
    saveSettings: (req, _user, value) => write(req, 'settings', value),
    properties,
    caseFor,
    find: async (id, user) => { const row = (await rest('eme_ai_runs?id=eq.' + id))[0]; if (!row) return null; await caseFor(row.case_id, user); return hydrate(row); },
    runs: async user => { const scope = user.role === 'admin' ? '' : '&eme_cases.assignee_id=eq.' + user.id; const rows = await rest('eme_ai_runs?select=*,eme_cases!inner(assignee_id)&order=created_at.desc&limit=100' + scope); return rows.map(row => { const { fingerprint, ...safe } = hydrate(row); return safe; }); },
    rate: user => rpc('eme_limit', { p_key: 'ai:' + user.id, p_max: 12 }),
    begin: async (req, _user, value) => { const result = await write(req, 'begin', value); return result?.inserted === true; },
    finish: (req, _user, id, result) => write(req, 'finish', { id, ...result }),
    abandon: (req, _user, id) => write(req, 'abandon', { id }),
    review: (req, _user, value) => write(req, 'review', value),
  };
  return createIntelligence({ store, encryptionKey, env, fetcher });
}
