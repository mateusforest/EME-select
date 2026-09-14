import { test, expect, type Page } from '@playwright/test';

const transition = (page: Page) => page.locator('html');
const environments = (page: Page) => page.getByRole('navigation', { name: 'Ambientes', exact: true });
const origin = (page: Page) => page.locator('#root [data-photographic-home]');
const phase = (page: Page, state: string) => expect(transition(page)).toHaveAttribute('data-page-transition', state, { timeout: 15_000 });

async function openHome(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(origin(page)).toHaveAttribute('data-status', 'ready');
  await phase(page, 'idle');
  await expect(origin(page).locator('.photographic-home__image')).toHaveCSS('opacity', '1');
}

test('imagem lenta mantém a origem visível até o destino terminar de carregar e decodificar', async ({ page }) => {
  let release!: () => void, requested = false;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/scene-litoral.png', async route => { requested = true; await gate; await route.continue().catch(() => {}); });
  try {
    await openHome(page);
    await environments(page).getByRole('link', { name: 'Litoral', exact: true }).click();
    await expect.poll(() => requested).toBe(true);
    await phase(page, 'loading');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu próximo lugar.');
    const image = origin(page).locator('.photographic-home__image');
    await expect(image).toBeVisible();
    expect(await image.evaluate(node => {
      let opacity = 1;
      for (let current: Element | null = node; current; current = current.parentElement) opacity *= Number(getComputedStyle(current).opacity);
      return opacity;
    })).toBeGreaterThan(.9);
    await expect(environments(page).getByRole('link', { name: 'Serra', exact: true })).toBeEnabled();
    release();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Um novo ritmo.');
    await phase(page, 'idle');
    const destination = page.locator('#root [data-photographic-scene][data-env-id="litoral"] img');
    expect(await destination.evaluate(node => { const img = node as HTMLImageElement; return img.complete && img.naturalWidth > 0; })).toBe(true);
  } finally { release(); }
});

test('trocas rápidas cancelam a seleção antiga e um carregamento atrasado não substitui a última rota', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/scene-litoral.png', async route => { await gate; await route.continue().catch(() => {}); });
  try {
    await openHome(page);
    await page.getByRole('button', { name: 'Casas em condomínio', exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Imóvel selecionado' })).toBeVisible();
    await environments(page).getByRole('link', { name: 'Litoral', exact: true }).click();
    await phase(page, 'loading');
    await environments(page).getByRole('link', { name: 'Serra', exact: true }).click();
    await environments(page).getByRole('link', { name: 'Urbano', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Perto de tudo.');
    await phase(page, 'idle');
    release();
    await page.evaluate(async () => {
      const image = new Image(); image.src = '/assets/scene-litoral.png'; await image.decode();
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    await expect(page).toHaveURL(/#\/ambientes\/urbano$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Perto de tudo.');
    await expect(page.locator('#root [data-photographic-scene]')).toHaveAttribute('data-env-id', 'urbano');
    await phase(page, 'idle');
    await expect(page.getByRole('complementary', { name: 'Imóvel selecionado' })).toHaveCount(0);
  } finally { release(); }
});

test('falha de imagem informa o problema e libera a próxima navegação', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/assets/scene-litoral.png', route => route.abort('failed'));
  await openHome(page);
  await environments(page).getByRole('link', { name: 'Litoral', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Um novo ritmo.');
  await phase(page, 'idle');
  await expect(page.locator('#root').getByRole('status').filter({ hasText: /imagem|fotografia|paisagem/i })).toBeVisible();
  await environments(page).getByRole('link', { name: 'Serra', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu refúgio.');
  await expect(page.locator('#root [data-photographic-scene]')).toHaveAttribute('data-status', 'ready');
  await phase(page, 'idle');
  expect(errors).toEqual([]);
});

test.describe('transições em tela móvel', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  test('movimento reduzido mantém cenas e controles disponíveis nas mudanças de ambiente', async ({ page }) => {
    await openHome(page);
    for (const [name, title] of [['Litoral', 'Um novo ritmo.'], ['Serra', 'Seu refúgio.'], ['Urbano', 'Perto de tudo.']]) {
      await environments(page).getByRole('link', { name, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
      await phase(page, 'idle');
      await expect(page.locator('#root [data-photographic-scene]')).toHaveAttribute('data-status', 'ready');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('#root canvas')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Aproximar cenário', exact: true })).toBeEnabled();
    }
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Menu móvel' }).getByRole('link', { name: 'A coleção completa', exact: true }).click();
    await expect(page).toHaveURL(/#\/colecao/);
    await phase(page, 'idle');
  });
});

test.describe('transição móvel após rolagem', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'no-preference' });
  test('o quadro anterior permanece alinhado ao novo ambiente durante a entrada e é removido ao terminar', async ({ page }) => {
    await openHome(page);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    await environments(page).getByRole('link', { name: 'Litoral', exact: true }).click();
    await expect(page.locator('#root [data-photographic-scene]')).toHaveAttribute('data-env-id', 'litoral');
    await phase(page, 'entering');
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    const alignment = await page.evaluate(() => {
      const previous = document.querySelector<HTMLElement>('body > .page-visual-snapshot');
      const current = document.querySelector<HTMLElement>('#root main');
      return {
        state: document.documentElement.dataset.pageTransition,
        previousTop: previous?.getBoundingClientRect().top,
        currentTop: current?.getBoundingClientRect().top,
        present: Boolean(previous),
      };
    });
    expect(alignment.state).toBe('entering');
    expect(alignment.present).toBe(true);
    expect(Math.abs(alignment.previousTop! - alignment.currentTop!)).toBeLessThanOrEqual(2);
    const [regionName, searchName] = await Promise.all([
      page.locator('#root #search-region').ariaSnapshot(),
      page.locator('#root #property-search').ariaSnapshot(),
    ]);
    // Immediate snapshots prevent a duplicate label from passing after the ghost disappears.
    expect(await transition(page).getAttribute('data-page-transition')).toBe('entering');
    expect(regionName.split('\n')[0]).toMatch(/^- combobox "Ambiente"(?::|$)/);
    expect(searchName.split('\n')[0]).toMatch(/^- textbox "O que você procura\?"(?::|$)/);
    await phase(page, 'idle');
    await expect(page.locator('body > .page-visual-snapshot')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Um novo ritmo.');
  });
});
