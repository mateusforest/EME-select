import { expect, test, type Locator, type Page } from '@playwright/test';

const scopes = [
  { id: 'comercial', name: 'Comercial', navName: 'Comercial', title: 'Seu negócio.', image: '/assets/scene-comercial.png', landmarks: [
    ['Lojas', 'comercial-01', 'Loja com frente para a rua'],
    ['Salas comerciais', 'comercial-02', 'Sala comercial com luz natural'],
    ['Edifícios corporativos', 'comercial-03', 'Edifício para sede corporativa'],
  ] },
  { id: 'terrenos', name: 'Terrenos e Terras', navName: 'Terrenos', title: 'Espaço para crescer.', image: '/assets/scene-terrenos.png', landmarks: [
    ['Terrenos urbanos', 'terrenos-01', 'Terreno urbano em rua de bairro'],
    ['Lotes em condomínio', 'terrenos-02', 'Lote em condomínio arborizado'],
    ['Terras agrícolas', 'terrenos-03', 'Terras agrícolas no interior'],
  ] },
  { id: 'industrial', name: 'Industrial e Logístico', navName: 'Industrial', title: 'Espaço para operar.', image: '/assets/scene-industrial.png', landmarks: [
    ['Galpões', 'industrial-01', 'Galpão com área de apoio'],
    ['Pavilhões', 'industrial-02', 'Pavilhão para organizar sua operação'],
    ['Centros de distribuição', 'industrial-03', 'Centro de distribuição com docas'],
  ] },
];
const scene = (page: Page) => page.locator('#root [data-photographic-scene]');
const environmentNav = (page: Page) => page.getByRole('navigation', { name: 'Ambientes', exact: true });
const field = (page: Page, name: string) => page.getByRole('combobox', { name, exact: true });
const article = (page: Page, title: string) => page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
const params = (page: Page) => new URLSearchParams(new URL(page.url()).hash.split('?')[1] || '');
const apply = (page: Page) => page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();

async function idle(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-page-transition', 'idle', { timeout: 15_000 });
}

async function readyScene(page: Page, id: string) {
  await expect(scene(page)).toHaveAttribute('data-env-id', id);
  await expect(scene(page)).toHaveAttribute('data-status', 'ready');
  await idle(page);
}

async function eightDestinations(page: Page) {
  const links = environmentNav(page).getByRole('link');
  await expect(links).toHaveCount(8);
  expect(await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href')))).toEqual([
    '#/', '#/ambientes/litoral', '#/ambientes/serra', '#/ambientes/urbano',
    '#/ambientes/condominios', '#/ambientes/comercial', '#/ambientes/terrenos', '#/ambientes/industrial',
  ]);
}

async function checkImage(viewer: Locator, source: string) {
  const measured = await viewer.locator('.photographic-home__image').evaluate(node => {
    const img = node as HTMLImageElement, box = img.getBoundingClientRect();
    return { path: new URL(img.currentSrc).pathname, loaded: img.complete && img.naturalWidth > 0, actual: box.width / box.height, original: img.naturalWidth / img.naturalHeight };
  });
  expect(measured.path).toBe(source);
  expect(measured.loaded).toBe(true);
  expect(Math.abs(measured.actual - measured.original)).toBeLessThan(.003);
}

for (const scope of scopes) {
  test(`${scope.name}: os três pontos abrem o imóvel certo, com dados próprios do segmento`, async ({ page }) => {
    test.setTimeout(75_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    if (scope.id === 'comercial') await page.setViewportSize({ width: 1908, height: 884 });
    await page.goto(`/#/ambientes/${scope.id}`);
    await readyScene(page, scope.id);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(scope.title);
    await eightDestinations(page);
    await page.getByRole('button', { name: 'Explorar', exact: true }).click();
    await expect(page.locator('.desktop-explore-menu').getByRole('link', { name: scope.navName, exact: true })).toHaveAttribute('href', `#/ambientes/${scope.id}`);
    await page.keyboard.press('Escape');
    await checkImage(scene(page), scope.image);
    await expect(page.locator('#root canvas')).toHaveCount(0);
    for (const [label, id, title] of scope.landmarks) {
      await test.step(label, async () => {
        const marker = scene(page).getByRole('button', { name: label, exact: true });
        if (scope.id === 'comercial') {
          const dot = await marker.locator('.photographic-home__dot').boundingBox();
          const navigation = await environmentNav(page).boundingBox();
          expect(dot).not.toBeNull();
          expect(navigation).not.toBeNull();
          const overlaps = dot!.x < navigation!.x + navigation!.width
            && dot!.x + dot!.width > navigation!.x
            && dot!.y < navigation!.y + navigation!.height
            && dot!.y + dot!.height > navigation!.y;
          expect(overlaps, `${label}: o ponto da fotografia não pode cobrir a navegação em 1908×884`).toBe(false);
        }
        await marker.click();
        const selected = page.getByRole('complementary', { name: 'Imóvel selecionado' });
        await expect(selected).toContainText(title);
        await expect(selected).not.toContainText(/quartos?|suítes?/i);
        const explore = selected.getByRole('link', { name: 'Explorar imóvel', exact: true });
        await expect(explore).toHaveAttribute('href', `#/imovel/${id}`);
        await explore.click();
        await expect(page).toHaveURL(new RegExp(`#/imovel/${id}$`));
        await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
        const facts = page.locator('.details-facts');
        await expect(facts).not.toContainText(/quartos?|suítes?|null|undefined/i);
        if (scope.id === 'terrenos') await expect(facts).not.toContainText(/vagas?/i);
        if (id === 'terrenos-03') await expect(facts).toContainText('12,5 ha (125.000 m²)');
        if (id === 'industrial-01') { await expect(facts).toContainText('Pé-direito'); await expect(facts).toContainText('7 m'); await expect(facts).toContainText('Doca'); }
        if (id === 'industrial-02') await expect(facts).not.toContainText(/docas?/i);
        if (id === 'industrial-03') { await expect(facts).toContainText('11,5 m'); await expect(facts).toContainText('Docas'); }
        await page.getByRole('link', { name: `Voltar para ${scope.navName}`, exact: true }).click();
        await readyScene(page, scope.id);
      });
    }
    expect(errors).toEqual([]);
  });
}

test('novos filtros percorrem a busca inicial, URL e recarregamento, sem conservar quartos incompatíveis', async ({ page }) => {
  await page.goto('/');
  await readyScene(page, 'todos');
  await field(page, 'Ambiente').selectOption('comercial');
  await field(page, 'Tipo de imóvel').selectOption('Sala comercial');
  await page.getByLabel('O que você procura?', { exact: true }).fill('salas comerciais');
  await page.getByRole('button', { name: 'Buscar imóveis', exact: true }).click();
  await expect(article(page, 'Sala comercial com luz natural')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);
  expect(Object.fromEntries(params(page))).toMatchObject({ regiao: 'comercial', tipo: 'Sala comercial', busca: 'salas comerciais' });
  await page.reload();
  await expect(field(page, 'Ambiente')).toHaveValue('comercial');
  await expect(field(page, 'Tipo de imóvel')).toHaveValue('Sala comercial');
  await expect(field(page, 'Quartos')).toHaveCount(0);
  await field(page, 'Ambiente').selectOption('terrenos');
  await expect(field(page, 'Tipo de imóvel')).toHaveValue('');
  await page.getByLabel('O que você procura?', { exact: true }).fill('');
  await field(page, 'Tipo de imóvel').selectOption('Terra agrícola');
  await page.getByRole('spinbutton', { name: 'Área mínima', exact: true }).fill('120000');
  await apply(page);
  await expect(article(page, 'Terras agrícolas no interior')).toBeVisible();
  await expect(article(page, 'Terras agrícolas no interior')).toContainText('12,5 ha (125.000 m²)');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.reload();
  await expect(field(page, 'Tipo de imóvel')).toHaveValue('Terra agrícola');
  await expect(page.getByRole('spinbutton', { name: 'Área mínima', exact: true })).toHaveValue('120000');
  await field(page, 'Ambiente').selectOption('urbano');
  await field(page, 'Quartos').selectOption('3');
  await field(page, 'Tipo de imóvel').selectOption('Apartamento');
  await field(page, 'Ambiente').selectOption('industrial');
  await expect(field(page, 'Quartos')).toHaveCount(0);
  await expect(field(page, 'Tipo de imóvel')).toHaveValue('');
  await field(page, 'Tipo de imóvel').selectOption('Galpão');
  await field(page, 'Finalidade').selectOption('alugar');
  await page.getByRole('spinbutton', { name: 'Área mínima', exact: true }).fill('900');
  await apply(page);
  await expect(article(page, 'Galpão com área de apoio')).toBeVisible();
  expect(Object.fromEntries(params(page))).toMatchObject({ regiao: 'industrial', tipo: 'Galpão', operacao: 'alugar', areaMin: '900' });
  expect(params(page).has('quartos')).toBe(false);
  await page.reload();
  await expect(article(page, 'Galpão com área de apoio')).toBeVisible();
  await expect(field(page, 'Quartos')).toHaveCount(0);
});

test('atalhos por tipo abrem lojas, salas comerciais e galpões com a finalidade disponível', async ({ page }) => {
  await page.goto('/');
  await readyScene(page, 'todos');
  for (const [label, type, operation, title] of [
    ['Lojas', 'Loja', 'alugar', 'Loja com frente para a rua'],
    ['Salas comerciais', 'Sala comercial', 'comprar', 'Sala comercial com luz natural'],
    ['Galpões', 'Galpão', 'alugar', 'Galpão com área de apoio'],
  ]) {
    await page.getByRole('button', { name: 'Explorar', exact: true }).click();
    await page.locator('.desktop-explore-menu').getByRole('link', { name: label, exact: true }).click();
    await expect(article(page, title)).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(field(page, 'Tipo de imóvel')).toHaveValue(type);
    await expect(field(page, 'Finalidade')).toHaveValue(operation);
    expect(params(page).get('operacao') || 'comprar').toBe(operation);
  }
});

test('favoritos e comparação combinam apartamento, terra agrícola e galpão sem inventar valores ausentes', async ({ page }) => {
  await page.goto('/#/colecao?regiao=urbano&tipo=Apartamento');
  const selected = [['urbano-01', 'Apartamento com varanda'], ['terrenos-03', 'Terras agrícolas no interior'], ['industrial-01', 'Galpão com área de apoio']];
  for (const [index, [, title]] of selected.entries()) {
    if (index) {
      await field(page, 'Ambiente').selectOption(index === 1 ? 'terrenos' : 'industrial');
      await field(page, 'Tipo de imóvel').selectOption(index === 1 ? 'Terra agrícola' : 'Galpão');
      await field(page, 'Finalidade').selectOption(index === 1 ? 'comprar' : 'alugar');
      await apply(page);
    }
    const card = article(page, title);
    await card.getByRole('button', { name: `Salvar ${title} nos favoritos`, exact: true }).click();
    await card.getByRole('button', { name: `Comparar ${title}`, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Comparar seleção', exact: true }).click();
  expect(params(page).get('ids')).toBe('urbano-01,terrenos-03,industrial-01');
  await page.reload();
  const table = page.getByRole('table');
  const values = (name: string) => table.getByRole('row').filter({ has: page.getByRole('rowheader', { name, exact: true }) }).getByRole('cell');
  await expect(values('Quartos')).toHaveText(['3', 'Não se aplica', 'Não se aplica']);
  await expect(values('Suítes')).toHaveText(['2', 'Não se aplica', 'Não se aplica']);
  await expect(values('Vagas')).toHaveText(['2', 'Não informado', '8']);
  await expect(values('Pé-direito')).toHaveText(['Não se aplica', 'Não se aplica', '7 m']);
  await expect(values('Docas')).toHaveText(['Não se aplica', 'Não se aplica', '1']);
  await expect(table).toContainText('12,5 ha (125.000 m²)');
  await expect(table).not.toContainText(/null|undefined/);
  await expect(page.getByRole('main')).toContainText('Sua seleção reúne compra e locação.');
  await page.getByRole('button', { name: 'Meus favoritos, 3 imóveis', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('article')).toHaveCount(3);
  for (const [, title] of selected) await expect(dialog.getByRole('heading', { name: title, exact: true })).toBeVisible();
  for (const [, title] of selected.slice(1)) {
    const row = dialog.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await expect(row).not.toContainText(/quartos?|suítes?/i);
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('eme-select:favorites') || '[]'))).toEqual(['urbano-01', 'terrenos-03', 'industrial-01']);
});

test('proprietário pode apresentar os novos tipos e revisar a mensagem sem transmissão automática', async ({ page, context }) => {
  const outbound: string[] = [];
  page.on('request', request => { if (/https:\/\/(?:wa\.me|(?:api|web)\.whatsapp\.com)\//.test(request.url())) outbound.push(request.url()); });
  await page.goto('/#/proprietarios');
  const types = ['Loja', 'Sala comercial', 'Edifício corporativo', 'Terreno urbano', 'Lote em condomínio', 'Terra agrícola', 'Galpão', 'Pavilhão', 'Centro de distribuição'];
  await expect(field(page, 'Tipo de imóvel')).toBeVisible();
  const options = await field(page, 'Tipo de imóvel').locator('option').allTextContents();
  for (const type of types) expect(options).toContain(type);
  await page.getByLabel('Seu nome', { exact: true }).fill('Teste dos novos ambientes');
  await page.getByLabel('Telefone com DDD', { exact: true }).fill('(54) 99990-2688');
  await page.getByLabel('Cidade do imóvel', { exact: true }).fill('Caxias do Sul');
  await page.getByRole('checkbox', { name: 'Autorizo a EME Select a entrar em contato comigo sobre esta solicitação.', exact: true }).check();
  for (const type of ['Sala comercial', 'Terra agrícola', 'Galpão']) {
    await field(page, 'Tipo de imóvel').selectOption(type);
    await page.getByRole('button', { name: 'Revisar apresentação', exact: true }).click();
    const review = page.getByRole('region', { name: 'Revisão da solicitação' });
    const href = await review.getByRole('link', { name: 'Enviar pelo WhatsApp', exact: true }).getAttribute('href');
    const url = new URL(href!);
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/5554999902688');
    expect(url.searchParams.get('text')).toContain(`Tipo de imóvel: ${type}`);
    await review.getByRole('button', { name: 'Editar informações', exact: true }).click();
  }
  expect(outbound).toEqual([]);
  expect(context.pages()).toHaveLength(1);
});

test.describe('novos ambientes no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  test('os oito links permanecem acessíveis, cenas preservam proporção e a busca industrial funciona', async ({ page }) => {
    test.setTimeout(75_000);
    await page.goto('/');
    await readyScene(page, 'todos');
    await eightDestinations(page);
    for (const scope of scopes) {
      await environmentNav(page).getByRole('link', { name: scope.navName, exact: true }).click();
      await readyScene(page, scope.id);
      await checkImage(scene(page), scope.image);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const [label, id, title] = scope.landmarks[0];
      await scene(page).getByRole('button', { name: label, exact: true }).click();
      const selected = page.getByRole('complementary', { name: 'Imóvel selecionado' });
      await expect(selected).toContainText(title);
      await selected.getByRole('link', { name: 'Explorar imóvel', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#/imovel/${id}$`));
      await expect(page.locator('.details-facts')).not.toContainText(/quartos?|suítes?/i);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('link', { name: `Voltar para ${scope.navName}`, exact: true }).click();
      await readyScene(page, scope.id);
    }
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    const menu = page.getByRole('navigation', { name: 'Menu móvel' });
    for (const scope of scopes) await expect(menu.getByRole('link', { name: scope.navName, exact: true })).toBeVisible();
    await menu.getByRole('link', { name: 'A coleção completa', exact: true }).click();
    await page.getByRole('button', { name: 'Refinar minha busca', exact: true }).click();
    await field(page, 'Ambiente').selectOption('industrial');
    await field(page, 'Tipo de imóvel').selectOption('Centro de distribuição');
    await field(page, 'Finalidade').selectOption('alugar');
    await expect(field(page, 'Quartos')).toHaveCount(0);
    await apply(page);
    await expect(article(page, 'Centro de distribuição com docas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});
