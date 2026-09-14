import { test, expect, type Locator, type Page } from '@playwright/test';

interface Pose { x: number; y: number; scale: number; imageWidth: number; imageHeight: number; viewportWidth: number; viewportHeight: number }
const scene = (page: Page) => page.locator('#root [data-photographic-scene]');
const interior = (page: Page) => page.locator('#root [data-photo-explorer]');

async function pose(viewer: Locator): Promise<Pose> {
  const result = JSON.parse((await viewer.getAttribute('data-photo-pose')) || '{}') as Pose;
  expect(result.scale).toBeGreaterThan(0);
  expect(Object.values(result).every(Number.isFinite)).toBe(true);
  return result;
}

async function settled(viewer: Locator): Promise<Pose> {
  let last = await pose(viewer), unchanged = 0;
  await expect.poll(async () => {
    const current = await pose(viewer);
    unchanged = Math.hypot(last.x - current.x, last.y - current.y, last.scale - current.scale) < .02 ? unchanged + 1 : 0;
    last = current;
    return unchanged;
  }, { intervals: [150], timeout: 8_000 }).toBeGreaterThanOrEqual(3);
  return last;
}

async function imageIsProportional(image: Locator, expectedSource: string) {
  const measured = await image.evaluate(node => {
    const img = node as HTMLImageElement, bounds = img.getBoundingClientRect();
    const matrix = new DOMMatrixReadOnly(getComputedStyle(img).transform);
    return {
      source: new URL(img.currentSrc).pathname, complete: img.complete,
      width: img.naturalWidth, height: img.naturalHeight, aspect: bounds.width / bounds.height,
      scaleX: Math.hypot(matrix.m11, matrix.m12, matrix.m13),
      scaleY: Math.hypot(matrix.m21, matrix.m22, matrix.m23),
    };
  });
  expect(measured.source).toBe(expectedSource);
  expect(measured.complete).toBe(true);
  expect(measured.width).toBeGreaterThan(1000);
  expect(measured.height).toBeGreaterThan(600);
  expect(Math.abs(measured.aspect - measured.width / measured.height)).toBeLessThan(.003);
  expect(Math.abs(measured.scaleX - measured.scaleY)).toBeLessThan(.0001);
}

async function sceneCoversMain(viewer: Locator) {
  const measured = await viewer.evaluate(node => {
    const image = node.querySelector('.photographic-home__image')!.getBoundingClientRect();
    const viewport = node.querySelector('.photographic-home__viewport')!.getBoundingClientRect();
    const main = node.closest('main')!.getBoundingClientRect();
    return {
      imageGaps: [image.left - viewport.left, image.top - viewport.top, viewport.right - image.right, viewport.bottom - image.bottom],
      viewportGaps: [viewport.left - main.left, viewport.top - main.top, main.right - viewport.right, main.bottom - viewport.bottom],
    };
  });
  expect(Math.max(...measured.imageGaps), 'A fotografia deve preencher os quatro lados do cenário').toBeLessThanOrEqual(1);
  expect(Math.max(...measured.viewportGaps), 'O cenário deve ocupar toda a área principal, incluindo suas bordas').toBeLessThanOrEqual(1);
}

async function idle(page: Page) {
  await expect(page.locator('html')).toHaveAttribute('data-page-transition', 'idle', { timeout: 15_000 });
}

test('os oito ambientes cobrem a área principal proporcionalmente em desktop e celular, sem carregar 3D', async ({ page }) => {
  test.setTimeout(300_000);
  const requests: string[] = [], errors: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  const environments = [
    ['/', 'todos', 'Seu próximo lugar.', '/assets/scene-home-v2.png'],
    ['/#/ambientes/litoral', 'litoral', 'Um novo ritmo.', '/assets/scene-litoral.png'],
    ['/#/ambientes/serra', 'serra', 'Seu refúgio.', '/assets/scene-serra.png'],
    ['/#/ambientes/urbano', 'urbano', 'Perto de tudo.', '/assets/scene-urbano.png'],
    ['/#/ambientes/condominios', 'condominios', 'Seu espaço.', '/assets/scene-condominios.png'],
    ['/#/ambientes/comercial', 'comercial', 'Seu negócio.', '/assets/scene-comercial.png'],
    ['/#/ambientes/terrenos', 'terrenos', 'Espaço para crescer.', '/assets/scene-terrenos.png'],
    ['/#/ambientes/industrial', 'industrial', 'Espaço para operar.', '/assets/scene-industrial.png'],
  ];
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const [route, id, title, image] of environments) {
      await test.step(`${id} em ${viewport.width}×${viewport.height}`, async () => {
        await page.goto(route);
        // Route preload may keep the previous scene visible for up to eight seconds.
        await expect(scene(page)).toHaveAttribute('data-env-id', id, { timeout: 15_000 });
        await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
        await expect(scene(page)).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
        await idle(page);
        await settled(scene(page));
        await imageIsProportional(scene(page).locator('.photographic-home__image'), image);
        await sceneCoversMain(scene(page));
        await page.getByRole('button', { name: 'Aproximar cenário', exact: true }).click();
        expect((await settled(scene(page))).scale).toBeGreaterThan(1);
        await sceneCoversMain(scene(page));
        await imageIsProportional(scene(page).locator('.photographic-home__image'), image);
        await page.getByRole('button', { name: 'Afastar cenário', exact: true }).click();
        expect((await settled(scene(page))).scale).toBe(1);
        await sceneCoversMain(scene(page));
        await expect(page.getByRole('button', { name: 'Afastar cenário', exact: true })).toBeDisabled();
        await expect(page.locator('#root canvas')).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Explorar em 3D', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Buscar imóveis', exact: true })).toBeEnabled();
      });
    }
  }
  expect(requests.filter(url => /SpatialCanvas|\/three(?:\.js|\/)/i.test(url))).toEqual([]);
  expect(errors).toEqual([]);
});

test('seleção urbana abre o interior fotográfico original e os detalhes do mesmo imóvel', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/#/ambientes/urbano');
  await expect(scene(page)).toHaveAttribute('data-status', 'ready');
  await idle(page);
  await page.getByRole('button', { name: 'Apartamentos', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Imóvel selecionado' })).toContainText('Apartamento com varanda');
  await page.getByRole('link', { name: 'Explorar imóvel', exact: true }).click();
  await expect(page.locator('#root [data-photographic-interior]')).toBeVisible();
  await expect(interior(page)).toHaveAttribute('data-status', 'ready');
  await idle(page);
  await imageIsProportional(interior(page).locator('img'), '/assets/interior-living.png');
  await expect(page.locator('#root canvas')).toHaveCount(0);
  await page.getByRole('link', { name: 'Detalhes e curadoria', exact: true }).click();
  await expect(page).toHaveURL(/#\/imovel\/urbano-01$/);
  await expect(page.getByRole('heading', { name: 'Apartamento com varanda', exact: true })).toBeVisible();
  await idle(page);
  expect(requests.filter(url => /SpatialCanvas|\/three(?:\.js|\/)/i.test(url))).toEqual([]);
});

test('mudanças rápidas de foco terminam no último espaço e a tela cheia preserva a proporção', async ({ page }) => {
  await page.goto('/#/visita/urbano-01');
  await expect(interior(page)).toHaveAttribute('data-status', 'ready');
  await idle(page);
  const sala = await settled(interior(page));
  for (const room of ['Varanda', 'Cozinha', 'Sala', 'Varanda', 'Cozinha']) await page.getByRole('button', { name: room, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cozinha', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const cozinha = await settled(interior(page));
  expect(Math.hypot(cozinha.x - sala.x, cozinha.y - sala.y, cozinha.scale - sala.scale)).toBeGreaterThan(.2);
  await page.getByRole('button', { name: 'Sala', exact: true }).click();
  const restored = await settled(interior(page));
  expect(Math.hypot(restored.x - sala.x, restored.y - sala.y, restored.scale - sala.scale)).toBeLessThan(.1);
  await page.getByRole('button', { name: 'Tela cheia', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sair da tela cheia', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await settled(interior(page));
  await imageIsProportional(interior(page).locator('img'), '/assets/interior-living.png');
  await page.getByRole('button', { name: 'Sair da tela cheia', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tela cheia', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test.describe('interior em tela móvel', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  test('toque amplia e move a foto com limites e restauração sem transbordar a página', async ({ page }) => {
    await page.goto('/#/visita/urbano-01');
    await expect(interior(page)).toHaveAttribute('data-status', 'ready');
    await idle(page);
    const initial = await settled(interior(page));
    await page.getByRole('button', { name: 'Aproximar imagem', exact: true }).click();
    await page.getByRole('button', { name: 'Aproximar imagem', exact: true }).click();
    const before = await pose(interior(page));
    expect(before.scale).toBeGreaterThan(initial.scale);
    const point = await interior(page).evaluate(node => {
      const box = node.getBoundingClientRect();
      for (const fy of [.45, .55, .35, .65]) for (const fx of [.5, .35, .65]) {
        const x = box.x + box.width * fx, y = box.y + box.height * fy, hit = document.elementFromPoint(x, y);
        if (hit && node.contains(hit) && !hit.closest('button, a')) return { x, y };
      }
      return null;
    });
    expect(point).not.toBeNull();
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point!] });
    for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point!.x - 9 * i, y: point!.y + 2 * i }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
    await expect.poll(async () => { const current = await pose(interior(page)); return Math.hypot(current.x - before.x, current.y - before.y); }).toBeGreaterThan(10);
    const moved = await settled(interior(page));
    expect(Math.abs(moved.x)).toBeLessThanOrEqual(Math.max(0, (moved.imageWidth * moved.scale - moved.viewportWidth) / 2) + .2);
    expect(Math.abs(moved.y)).toBeLessThanOrEqual(Math.max(0, (moved.imageHeight * moved.scale - moved.viewportHeight) / 2) + .2);
    await page.getByRole('button', { name: 'Centralizar imagem', exact: true }).click();
    const restored = await settled(interior(page));
    expect(Math.hypot(restored.x - initial.x, restored.y - initial.y, restored.scale - initial.scale)).toBeLessThan(.1);
    await imageIsProportional(interior(page).locator('img'), '/assets/interior-living.png');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#root canvas')).toHaveCount(0);
  });
});
