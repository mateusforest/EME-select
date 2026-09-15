import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { submission } from '../server/submission.mjs';
import { createPortalApi } from '../server/portal-api.mjs';

const fixture = () => ({
  requestId: randomUUID(), name: 'Pessoa de Teste', phone: '(54) 99990-0000', relationship: 'Proprietário',
  city: 'Cidade de Teste, RS', neighborhood: 'Bairro de Teste', type: 'Apartamento', operation: 'comprar',
  environment: 'litoral', area: 116, price: 3990000,
  description: 'Informações fictícias para validar o recebimento privado de uma ficha de imóvel.',
  occupancy: 'Não informado', documents: 'Ainda não conferidos', consent: true, website: '',
});

test('public submission validator requires explicit consent, valid fields and no privileged input', () => {
  const input = fixture();
  for (const consent of [false, undefined, null, 'true', 1]) {
    assert.throws(() => submission({ ...input, consent }), { status: 400 });
  }
  for (const [key, value] of Object.entries({
    stage: 'Entrada aprovada', photos: [{ id: randomUUID(), caption: 'Foto injetada' }], published: {},
    curation: { score: 100 }, assigneeId: randomUUID(), ownerContact: 'Contato injetado',
    authorizationStatus: 'Conferido', documentationStatus: 'Conferido',
  })) assert.throws(() => submission({ ...input, [key]: value }), { status: 400 }, key);
  for (const invalid of [
    { requestId: 'not-a-uuid' }, { name: 'X' }, { city: 'X' }, { phone: '99990000' },
    { relationship: 'Administrador' }, { type: 'Tipo inexistente' }, { operation: 'Venda' },
    { environment: 'todos' }, { description: 'x'.repeat(1501) }, { area: -1 }, { price: '1000' },
    { website: 'https://example.test/bot' },
  ]) assert.throws(() => submission({ ...input, ...invalid }), { status: 400 });
  for (const invalid of [null, [], 'input']) assert.throws(() => submission(invalid), { status: 400 });
});

test('public submission validator creates a pending private draft without certifying declarations', () => {
  const input = { ...fixture(), name: '  Pessoa de Teste  ', city: '  Cidade de Teste, RS  ', area: null, price: null, documents: 'O solicitante declara que tudo está regular.' };
  const result = submission(input);
  assert.equal(result.id, input.requestId);
  assert.equal(submission({ ...input, requestId: input.requestId.toUpperCase() }).id, input.requestId);
  assert.equal(result.data.stage, 'Recebido');
  assert.equal(result.data.operation, 'Venda');
  assert.deepEqual(result.data.photos, []);
  assert.equal(result.data.published, null);
  assert.equal(result.data.draft.ownerName, 'Pessoa de Teste');
  assert.equal(result.data.draft.ownerContact, input.phone);
  assert.equal(result.data.draft.city, 'Cidade de Teste, RS');
  assert.equal(result.data.draft.area, null);
  assert.equal(result.data.draft.price, null);
  assert.equal(result.data.draft.authorizationStatus, 'Pendente');
  assert.equal(result.data.draft.documentationStatus, 'Pendente');
  assert.equal(result.data.draft.requesterRole, 'Proprietário');
  assert.match(result.data.draft.sourceNotes, /Declaração do solicitante/);
  assert.match(result.data.draft.sourceNotes, /não constitui autorização de anúncio/);
  assert.match(result.data.curation.pending, /Confirmar disponibilidade/);
  assert.equal(result.data.curation.score, undefined);
  const rental = submission({ ...fixture(), operation: 'alugar', type: 'Casa em condomínio' });
  assert.equal(rental.data.operation, 'Locação');
  assert.equal(rental.data.draft.condominium, 'horizontal');
});

test('public submission HTTP endpoint stores one private case, contact and audit with safe retries', async t => {
  mkdirSync('tmp', { recursive: true });
  const dbPath = join(mkdtempSync(resolve('tmp/submission-api-')), 'portal.sqlite');
  let clock = Date.now();
  const api = createPortalApi({ dbPath, now: () => clock });
  const server = http.createServer((req, res) => api.handle(req, res));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); api.close(); });
  const administrator = { cookie: '' };
  async function request(path, body, who = null, extraHeaders = {}, method = body === undefined ? 'GET' : 'POST') {
    const response = await fetch(origin + '/api' + path, {
      method,
      headers: { Origin: origin, 'Content-Type': 'application/json', ...(who?.cookie ? { Cookie: who.cookie } : {}), ...extraHeaders },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (who && response.headers.get('set-cookie')) who.cookie = response.headers.get('set-cookie').split(';')[0];
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  const initial = await request('/auth/setup', { name: 'Administrador de Teste', email: 'submission-admin@example.test', password: 'Submission-test-only-2026!' }, administrator);
  assert.equal(initial.status, 201);
  const input = fixture();

  await t.test('anonymous callers cannot bypass origin, consent or publication controls', async () => {
    assert.equal((await request('/public/submissions', input, null, { Origin: 'https://other.example.test' })).status, 403);
    assert.equal((await request('/public/submissions', { ...input, consent: false })).status, 400);
    assert.equal((await request('/public/submissions', { ...input, stage: 'Entrada aprovada' })).status, 400);
    assert.equal((await request('/public/submissions', { ...input, photos: [] })).status, 400);
  });

  await t.test('the accepted request creates a received draft with privately stored contact', async () => {
    const response = await request('/public/submissions', input);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.deepEqual(response.body, { reference: input.requestId });
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal((await request('/listings/' + input.requestId)).status, 401);
    assert.equal((await request('/evaluations/' + input.requestId)).status, 401);
    assert.deepEqual((await request('/public/properties')).body.properties, []);
    const details = await request('/listings/' + input.requestId, undefined, administrator);
    assert.equal(details.status, 200);
    assert.equal(details.body.stage, 'Recebido');
    assert.equal(details.body.published, false);
    assert.deepEqual(details.body.photos, []);
    assert.equal(details.body.draft.ownerName, input.name);
    assert.equal(details.body.draft.ownerContact, input.phone);
    assert.equal(details.body.draft.requesterRole, input.relationship);
    assert.equal(details.body.draft.authorizationStatus, 'Pendente');
    assert.equal(details.body.draft.documentationStatus, 'Pendente');
    const evaluation = (await request('/evaluations/' + input.requestId, undefined, administrator)).body;
    assert.equal(evaluation.evaluation.assignee_id, initial.body.user.id);
    assert.equal(evaluation.evaluation.owner, input.name);
    assert.equal(evaluation.evaluation.version, 1);
    assert.equal(evaluation.curation.score, null);
    assert.ok(evaluation.curation.checks.every(check => check.state === 'Pendente'));
    assert.equal(evaluation.history.length, 1);
    assert.equal(evaluation.history[0].action, 'Envio pelo site');
    assert.equal(evaluation.history[0].author, 'Administrador de Teste');
  });

  await t.test('same UUID and content are idempotent; different content conflicts without changing the case', async () => {
    const replay = await request('/public/submissions', input);
    assert.equal(replay.status, 201);
    assert.deepEqual(replay.body, { reference: input.requestId });
    const conflict = await request('/public/submissions', { ...input, description: 'Outro conteúdo para a mesma referência.' });
    assert.equal(conflict.status, 409);
    const database = new DatabaseSync(dbPath, { readOnly: true });
    try {
      assert.equal(database.prepare('SELECT count(*) AS n FROM evaluations').get().n, 1);
      assert.equal(database.prepare('SELECT count(*) AS n FROM listings').get().n, 1);
      assert.equal(database.prepare('SELECT count(*) AS n FROM audit WHERE evaluation_id=?').get(input.requestId).n, 1);
      assert.equal(database.prepare('SELECT count(*) AS n FROM listing_photos').get().n, 0);
      const saved = JSON.parse(database.prepare('SELECT data FROM listings WHERE id=?').get(input.requestId).data);
      assert.equal(saved.description, input.description);
      assert.equal(saved.ownerContact, input.phone);
      assert.equal(database.prepare('SELECT stage FROM evaluations WHERE id=?').get(input.requestId).stage, 'Recebido');
    } finally { database.close(); }
  });

  await t.test('original receipt survives team edits and uppercase UUID retries do not overwrite them', async () => {
    clock += 16 * 60 * 1000;
    const before = (await request('/listings/' + input.requestId, undefined, administrator)).body;
    const revisedDescription = 'Texto atualizado pela equipe, preservado após uma repetição tardia do formulário público.';
    const update = await request('/listings/' + input.requestId, {
      version: before.version, draft: { ...before.draft, description: revisedDescription }, photos: [],
    }, administrator, {}, 'PATCH');
    assert.equal(update.status, 200, JSON.stringify(update.body));
    const replay = await request('/public/submissions', { ...input, requestId: input.requestId.toUpperCase() });
    assert.equal(replay.status, 201, JSON.stringify(replay.body));
    assert.deepEqual(replay.body, { reference: input.requestId });
    const after = (await request('/listings/' + input.requestId, undefined, administrator)).body;
    assert.equal(after.draft.description, revisedDescription);
    assert.equal(after.version, update.body.version);
    assert.equal(after.stage, 'Em avaliação');
    const database = new DatabaseSync(dbPath, { readOnly: true });
    try {
      assert.equal(database.prepare('SELECT count(*) AS n FROM submission_receipts WHERE request_id=?').get(input.requestId).n, 1);
      assert.equal(database.prepare("SELECT count(*) AS n FROM audit WHERE evaluation_id=? AND action='Envio pelo site'").get(input.requestId).n, 1);
      assert.equal(database.prepare('SELECT count(*) AS n FROM evaluations').get().n, 1);
    } finally { database.close(); }
  });
});
