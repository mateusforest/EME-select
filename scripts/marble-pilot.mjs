import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(root, '.env.local');
if (existsSync(envFile)) process.loadEnvFile(envFile);
const requestFile = resolve(root, 'marble-pilot/home/request.json');
const stateFile = resolve(root, 'tmp/marble-home-operation.json');
const assetDir = resolve(root, 'tmp/marble-assets');
const mode = process.argv[2] || 'prepare';
const key = process.env.WORLDLABS_API_KEY;
const payload = JSON.parse(readFileSync(requestFile, 'utf8').replace(/^\uFEFF/, ''));

async function api(path, body) {
  if (!key) throw new Error('Defina WORLDLABS_API_KEY no .env.local. Não envie a chave pelo chat.');
  const response = await fetch('https://api.worldlabs.ai/marble/v1/' + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'WLT-Api-Key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error('World API retornou HTTP ' + response.status + '. Nenhuma tentativa automática será feita.');
  return response.json();
}
function save(data) {
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, JSON.stringify(data, null, 2) + '\n');
}
function summary(operation) {
  console.log(JSON.stringify({ operationId: operation.operation_id, done: operation.done, failed: Boolean(operation.error), worldId: operation.response?.world_id || operation.response?.id || operation.metadata?.world_id, creditsUsed: operation.cost?.total_credits, resultFile: 'tmp/marble-home-operation.json' }, null, 2));
}
function recordedOperation() {
  if (!existsSync(stateFile)) throw new Error('Nenhuma geração deste piloto foi registrada.');
  const state = JSON.parse(readFileSync(stateFile, 'utf8'));
  if (typeof state.operation_id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(state.operation_id)) throw new Error('Envio sem operação confirmada. Confira o painel da World Labs antes de tentar gerar novamente.');
  return state;
}
async function download(url, filename) {
  if (typeof url !== 'string' || new URL(url).protocol !== 'https:') return;
  // Asset URLs come from the authenticated world response. Never forward the API key to storage.
  const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error('Download de ' + filename + ' retornou HTTP ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  writeFileSync(resolve(assetDir, filename), bytes);
  console.log(JSON.stringify({ file: 'tmp/marble-assets/' + filename, bytes: bytes.length }));
}
try {
  if (mode === 'prepare') {
    console.log(JSON.stringify({ state: existsSync(stateFile) ? 'operation-recorded' : 'prepared-not-submitted', keyConfigured: Boolean(key), request: payload, next: existsSync(stateFile) ? 'node scripts/marble-pilot.mjs status' : 'node scripts/marble-pilot.mjs generate --submit (consome créditos da World API)' }, null, 2));
  } else if (mode === 'credits') {
    const credits = await api('credits');
    console.log(JSON.stringify({ remainingCredits: credits.remaining_credits }));
  } else if (mode === 'generate') {
    if (!process.argv.includes('--submit')) throw new Error('Revise request.json e use generate --submit para iniciar uma geração paga.');
    if (!key) throw new Error('Defina WORLDLABS_API_KEY no .env.local.');
    if (existsSync(stateFile)) throw new Error('Já existe um registro deste piloto. Use status; não será criada uma geração duplicada.');
    if (payload.model !== 'marble-1.1' || payload.world_prompt?.type !== 'image' || payload.permission?.public !== false) throw new Error('Este piloto exige marble-1.1, imagem e mundo privado. Revise o pedido.');
    const credits = await api('credits');
    if (!Number.isFinite(credits.remaining_credits) || credits.remaining_credits < 1580) throw new Error('Saldo insuficiente para este piloto de 1.580 créditos. Nenhuma geração foi enviada.');
    // Persist before sending. On timeout, inspect the provider dashboard before clearing the record.
    save({ state: 'submitting', createdAt: new Date().toISOString(), request: payload });
    const operation = await api('worlds:generate', payload);
    save(operation); summary(operation);
  } else if (mode === 'status') {
    const state = recordedOperation();
    const operation = await api('operations/' + state.operation_id);
    save(operation); summary(operation);
  } else if (mode === 'assets') {
    const operation = recordedOperation();
    if (!operation.done || operation.error) throw new Error('Use status até a geração terminar com sucesso.');
    const id = operation.response?.world_id || operation.response?.id || operation.metadata?.world_id;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('O resultado não contém world_id válido.');
    const result = await api('worlds/' + id);
    const world = result.world || result;
    mkdirSync(assetDir, { recursive: true });
    writeFileSync(resolve(assetDir, 'world.json'), JSON.stringify(world, null, 2) + '\n');
    const assets = world.assets || {};
    console.log(JSON.stringify({ worldId: world.world_id, public: world.permission?.public, assetTypes: Object.keys(assets), splatVersions: Object.keys(assets.splats?.spz_urls || {}) }));
    await download(assets.splats?.spz_urls?.['100k'], 'world-100k.spz');
    await download(assets.splats?.spz_urls?.['500k'], 'world-500k.spz');
    if (process.argv.includes('--full')) await download(assets.splats?.spz_urls?.full_res, 'world-full-res.spz');
    await download(assets.imagery?.pano_url, 'panorama.jpg');
    await download(assets.thumbnail_url, 'thumbnail.jpg');
  } else { throw new Error('Comandos: prepare | credits | generate --submit | status | assets'); }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Não foi possível concluir a operação.');
  process.exitCode = 1;
}
