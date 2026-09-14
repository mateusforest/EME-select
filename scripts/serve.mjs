import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPortalApi } from '../server/portal-api.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.EME_PREVIEW_PORT || 4191);
const api = createPortalApi({ dbPath: process.env.EME_DB_PATH || resolve(dirname(fileURLToPath(import.meta.url)), '../.eme-private/portal.sqlite') });
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4' };
if (!existsSync(resolve(root, 'index.html'))) { console.error('Gere o site primeiro com npm run build.'); process.exit(1); }
const server = http.createServer(async (req, res) => {
  try {
    if (await api.handle(req, res)) return;
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
    const requested = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const portalRoute = /^\/portalselect(?:\/[a-z-]+){0,2}\/?$/.test(requested);
    const path = resolve(root, `.${requested === '/' || portalRoute ? '/index.html' : requested}`);
    if (!path.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const info = await stat(path);
    if (!info.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    if (req.method === 'HEAD') res.end(); else createReadStream(path).on('error', () => res.destroy()).pipe(res);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Arquivo não encontrado.'); }
});
server.on('error', error => { console.error(`Não foi possível iniciar a prévia na porta ${port}: ${error.message}`); process.exit(1); });
server.listen(port, '127.0.0.1', () => console.log(`EME Select · prévia local\nhttp://127.0.0.1:${port}\nUse Ctrl+C para encerrar.`));
server.requestTimeout = 15000;
const close = () => server.close(() => { api.close(); process.exit(0); });
process.on('SIGINT', close);
process.on('SIGTERM', close);
