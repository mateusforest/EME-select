import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.env.EME_DB_PATH || join(root, '.eme-private/portal.sqlite'));
if (!existsSync(source)) throw new Error('O banco ainda não existe. Inicie o portal antes de criar uma cópia.');
const folder = join(dirname(source), 'backups');
mkdirSync(folder, { recursive: true, mode: 0o700 });
const target = join(folder, 'portal-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID() + '.sqlite');
const db = new DatabaseSync(source, { readOnly: true, timeout: 5000 });
try {
  await backup(db, target);
  const copy = new DatabaseSync(target, { timeout: 5000 });
  try {
    // A restored backup must require a new login, not revive old sessions.
    copy.exec('DELETE FROM sessions;');
    const check = copy.prepare('PRAGMA integrity_check').get();
    if (check.integrity_check !== 'ok') throw new Error('A cópia não passou na verificação de integridade.');
    // The optional private cipher key must travel with a restored SQLite database.
    if (existsSync(source + '.ai-key')) copyFileSync(source + '.ai-key', target + '.ai-key');
    console.log('Cópia verificada: ' + target);
  } finally { copy.close(); }
} finally { db.close(); }
