import { expect, test, type Locator, type Page } from '@playwright/test';

const scene = (page: Page) => page.locator('#root [data-photographic-scene]');
const envNav = (page: Page) => page.getByRole('navigation', { name: 'Ambientes', exact: true });
const homePins = [
  ['Casas', 'Casa entre as araucárias', '#/imovel/serra-01'],
  ['Casas em condomínio', 'Casa no condomínio dos jardins', '#/imovel/litoral-02'],
  ['Apartamentos', 'Apartamento com varanda', '#/visita/urbano-01'],
  ['Compactos', 'Compacto junto à praça', '#/imovel/urbano-02'],
];
const destinations = [
  ['litoral', 'Litoral'], ['serra', 'Serra'], ['urbano', 'Urbano'], ['condominios', 'Condomínios'],
  ['comercial', 'Comercial'], ['terrenos', 'Terrenos'], ['industrial', 'Industrial'],
];

async function ready(page: Page, id: string) {
  await expect(scene(page)).toHaveAttribute('data-env-id', id, { timeout: 15_000 });
  await expect(scene(page)).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
  await expect(page.locator('html')).toHaveAttribute('data-page-transition', 'idle', { timeout: 15_000 });
}

async function pose(viewer: Locator) {
  return JSON.parse((await viewer.getAttribute('data-photo-pose')) || '{}') as {
    x: number; y: number; scale: number; imageWidth: number; imageHeight: number; viewportWidth: number; viewportHeight: number;
  };
}

async function dimensions(page: Page) {
  const image = await scene(page).locator('.photographic-home__image').evaluate(node => {
    const img = node as HTMLImageElement, box = img.getBoundingClientRect();
    return { actual: box.width / box.height, natural: img.naturalWidth / img.naturalHeight, loaded: img.complete && img.naturalWidth > 0 };
  });
  expect(image.loaded).toBe(true);
  expect(Math.abs(image.actual - image.natural)).toBeLessThan(.003);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('a home apresenta quatro escolhas distintas e cada uma abre o imóvel correspondente', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await ready(page, 'todos');
  await expect(scene(page).locator('.photographic-home__image')).toHaveAttribute('src', '/assets/scene-home-v2.png');
  await expect(scene(page).locator('.photographic-home__pin')).toHaveCount(4);
  for (const [label, title, href] of homePins) {
    await scene(page).getByRole('button', { name: label, exact: true }).click();
    const selected = page.getByRole('complementary', { name: 'Imóvel selecionado' });
    await expect(selected).toContainText(title);
    const explore = selected.getByRole('link', { name: 'Explorar imóvel', exact: true });
    await expect(explore).toHaveAttribute('href', href);
    await explore.click();
    await expect(page).toHaveURL(url => url.hash === href);
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'EME Select — início', exact: true }).click();
    await ready(page, 'todos');
  }
  await expect(page.locator('#root canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('o cenário Condomínios distingue horizontais e verticais mantendo a origem dos imóveis', async ({ page }) => {
  await page.goto('/');
  await ready(page, 'todos');
  await envNav(page).getByRole('link', { name: 'Condomínios', exact: true }).click();
  await ready(page, 'condominios');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu espaço.');
  await expect(scene(page).locator('.photographic-home__image')).toHaveAttribute('src', '/assets/scene-condominios.png');
  await expect(scene(page).locator('.photographic-home__pin')).toHaveCount(2);
  for (const [label, title, id, origin] of [
    ['Condomínios horizontais', 'Casa no condomínio dos jardins', 'litoral-02', 'Litoral'],
    ['Condomínios verticais', 'Residência nas alturas', 'urbano-03', 'Urbano'],
  ]) {
    await scene(page).getByRole('button', { name: label, exact: true }).click();
    const selected = page.getByRole('complementary', { name: 'Imóvel selecionado' });
    await expect(selected).toContainText(title);
    await expect(selected).toContainText(`Coleção ${origin}`);
    await selected.getByRole('link', { name: 'Explorar imóvel', exact: true }).click();
    await expect(page).toHaveURL(url => url.hash === `#/imovel/${id}`);
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    await page.goBack();
    await ready(page, 'condominios');
  }
});

test('a coleção de condomínios reúne três imóveis existentes e preserva horizontal ou vertical na URL', async ({ page }) => {
  await page.goto('/#/ambientes/condominios');
  await ready(page, 'condominios');
  await page.getByRole('link', { name: 'Conheça a coleção', exact: true }).click();
  const listedIds = async () => page.locator('.catalog-property h2 a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!.split('/').at(-1)).sort());
  await expect(page.getByRole('article')).toHaveCount(3);
  expect(await listedIds()).toEqual(['litoral-02', 'serra-03', 'urbano-03']);
  const env = page.getByRole('combobox', { name: 'Ambiente', exact: true });
  const type = page.getByRole('combobox', { name: 'Tipo de imóvel', exact: true });
  await expect(env).toHaveValue('condominios');
  for (const [kind, ids] of [
    ['Condomínio horizontal', ['litoral-02', 'serra-03']],
    ['Condomínio vertical', ['urbano-03']],
  ] as const) {
    await type.selectOption(kind);
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await expect(page.getByRole('article')).toHaveCount(ids.length);
    expect(await listedIds()).toEqual([...ids]);
    const params = new URLSearchParams(new URL(page.url()).hash.split('?')[1]);
    expect(params.get('regiao')).toBe('condominios');
    expect(params.get('tipo')).toBe(kind);
    await page.reload();
    await expect(env).toHaveValue('condominios');
    await expect(type).toHaveValue(kind);
    await expect(page.getByRole('article')).toHaveCount(ids.length);
    expect(await listedIds()).toEqual([...ids]);
  }
});

test('Explore os ambientes apresenta sete destinos e permite voltar à home depois de cada escolha', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await ready(page, 'todos');
  const explore = page.locator('#explore-ambientes');
  await expect(explore.getByRole('heading', { level: 2 })).toContainText('Explore os ambientes.');
  await expect(explore.getByRole('link')).toHaveCount(7);
  for (const [id, name] of destinations) {
    const link = explore.getByRole('link', { name: `Explorar ${name}`, exact: true });
    await expect(link).toHaveAttribute('href', `#/ambientes/${id}`);
    await link.click();
    await ready(page, id);
    await expect(explore).toHaveCount(0);
    await page.goBack();
    await ready(page, 'todos');
    await expect(explore.getByRole('link')).toHaveCount(7);
  }
});

for (const width of [320, 390]) {
  test.describe(`home e condomínios em ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    test('oito destinos, toque, arraste e zoom preservam a paisagem e o acesso à seção seguinte', async ({ page }) => {
      await page.goto('/');
      await ready(page, 'todos');
      await dimensions(page);
      await expect(envNav(page).getByRole('link')).toHaveCount(8);
      await scene(page).getByRole('button', { name: 'Casas em condomínio', exact: true }).tap();
      await expect(page.getByRole('complementary', { name: 'Imóvel selecionado' })).toContainText('Casa no condomínio dos jardins');
      await page.getByRole('button', { name: 'Fechar imóvel selecionado', exact: true }).click();
      await envNav(page).getByRole('link', { name: 'Condomínios', exact: true }).tap();
      await ready(page, 'condominios');
      await dimensions(page);
      await expect(envNav(page).getByRole('link')).toHaveCount(8);
      await scene(page).getByRole('button', { name: 'Condomínios horizontais', exact: true }).tap();
      await expect(page.getByRole('complementary', { name: 'Imóvel selecionado' })).toContainText('Casa no condomínio dos jardins');
      await page.getByRole('button', { name: 'Fechar imóvel selecionado', exact: true }).click();
      const initial = await pose(scene(page));
      await page.getByRole('button', { name: 'Aproximar cenário', exact: true }).click();
      const before = await pose(scene(page));
      expect(before.scale).toBeGreaterThan(initial.scale);
      const point = await scene(page).locator('.photographic-home__viewport').evaluate(node => {
        const box = node.getBoundingClientRect();
        const controls = [...document.querySelectorAll('button, a, input, select')].map(control => control.getBoundingClientRect());
        // Leave room for the whole drag and mobile browsers' enlarged touch targets.
        for (const y of [240, 320, 400, 480, 560, 640]) for (const fraction of [.65, .5, .35]) {
          const x = innerWidth * fraction, hit = document.elementFromPoint(x, y);
          const nearControl = controls.some(control => control.width > 0 && control.height > 0
            && x > control.left - 48 && x - 56 < control.right + 48 && y + 16 > control.top - 48 && y < control.bottom + 48);
          if (y > box.top + 24 && y + 16 < box.bottom - 24 && hit && node.contains(hit) && !nearControl) return { x, y };
        }
        return null;
      });
      expect(point).not.toBeNull();
      const session = await page.context().newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point!] });
      await expect(scene(page).locator('.photographic-home__viewport')).toHaveClass(/is-dragging/);
      for (let step = 1; step <= 8; step++) {
        await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point!.x - 7 * step, y: point!.y + 2 * step }] });
        await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
      }
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
      await expect.poll(async () => { const moved = await pose(scene(page)); return Math.hypot(moved.x - before.x, moved.y - before.y); }).toBeGreaterThan(10);
      const moved = await pose(scene(page));
      expect(Math.abs(moved.x)).toBeLessThanOrEqual(Math.max(0, (moved.imageWidth * moved.scale - moved.viewportWidth) / 2) + .2);
      expect(Math.abs(moved.y)).toBeLessThanOrEqual(Math.max(0, (moved.imageHeight * moved.scale - moved.viewportHeight) / 2) + .2);
      await page.getByRole('button', { name: 'Centralizar cenário', exact: true }).click();
      const restored = await pose(scene(page));
      expect(restored.scale).toBe(1);
      expect(Math.hypot(restored.x - initial.x, restored.y - initial.y)).toBeLessThan(.1);
      await envNav(page).getByRole('link', { name: 'Todos', exact: true }).tap();
      await ready(page, 'todos');
      await page.locator('#explore-ambientes').scrollIntoViewIfNeeded();
      await expect(page.locator('#explore-ambientes').getByRole('link')).toHaveCount(7);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator('#explore-ambientes').getByRole('link', { name: 'Explorar Condomínios', exact: true }).tap();
      await ready(page, 'condominios');
      await dimensions(page);
    });
  });
}
