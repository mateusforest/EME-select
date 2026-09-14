import { test, expect, type Locator, type Page } from '@playwright/test';

interface PhotoPose {
  x: number; y: number; scale: number;
  imageWidth: number; imageHeight: number; viewportWidth: number; viewportHeight: number;
}

const photographicHome = (page: Page) => page.locator('[data-photographic-home]');

async function readyHome(page: Page) {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu próximo lugar.');
  const home = photographicHome(page);
  await expect(home).toHaveAttribute('data-status', 'ready', { timeout: 15_000 });
  await expect(home.locator('.photographic-home__image')).toBeVisible();
  return home;
}

async function pose(home: Locator): Promise<PhotoPose> {
  const value = JSON.parse((await home.getAttribute('data-photo-pose')) || '{}') as PhotoPose;
  expect(Object.values(value).every(Number.isFinite)).toBe(true);
  expect(value.viewportWidth).toBeGreaterThan(0);
  expect(value.viewportHeight).toBeGreaterThan(0);
  return value;
}

async function settled(home: Locator): Promise<PhotoPose> {
  let previous = await pose(home), stable = 0;
  await expect.poll(async () => {
    const next = await pose(home);
    stable = Math.hypot(next.x - previous.x, next.y - previous.y, next.scale - previous.scale) < .02 ? stable + 1 : 0;
    previous = next;
    return stable;
  }, { intervals: [150], timeout: 8_000 }).toBeGreaterThanOrEqual(3);
  return previous;
}

async function originalProportions(home: Locator) {
  const measured = await home.locator('.photographic-home__image').evaluate(node => {
    const image = node as HTMLImageElement, bounds = image.getBoundingClientRect();
    const viewport = image.closest('.photographic-home__viewport')!.getBoundingClientRect();
    const main = image.closest('main')!.getBoundingClientRect();
    const matrix = new DOMMatrixReadOnly(getComputedStyle(image).transform);
    return {
      source: new URL(image.currentSrc).pathname,
      naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
      aspect: bounds.width / bounds.height,
      scaleX: Math.hypot(matrix.m11, matrix.m12, matrix.m13),
      scaleY: Math.hypot(matrix.m21, matrix.m22, matrix.m23),
      imageGaps: [bounds.left - viewport.left, bounds.top - viewport.top, viewport.right - bounds.right, viewport.bottom - bounds.bottom],
      viewportGaps: [viewport.left - main.left, viewport.top - main.top, main.right - viewport.right, main.bottom - viewport.bottom],
    };
  });
  expect(measured.source).toBe('/assets/scene-home-v2.png');
  expect(measured.naturalWidth).toBe(1586);
  expect(measured.naturalHeight).toBe(992);
  expect(Math.abs(measured.aspect - 1586 / 992)).toBeLessThan(.003);
  expect(Math.abs(measured.scaleX - measured.scaleY)).toBeLessThan(.0001);
  expect(Math.max(...measured.imageGaps), 'A fotografia deve cobrir os quatro lados sem faixas vazias').toBeLessThanOrEqual(1);
  expect(Math.max(...measured.viewportGaps), 'O cenário deve ocupar toda a área principal da página').toBeLessThanOrEqual(1);
}

async function dragPoint(home: Locator) {
  const point = await home.locator('.photographic-home__viewport').evaluate(node => {
    const box = node.getBoundingClientRect();
    const controls = [...node.querySelectorAll('button, .photographic-home__label')].map(element => element.getBoundingClientRect()).filter(rect => rect.width && rect.height);
    for (const fy of [.3, .45, .72, .6, .82]) {
      for (const fx of [.66, .76, .5, .4]) {
        const x = box.x + box.width * fx, y = box.y + box.height * fy;
        const hit = document.elementFromPoint(x, y);
        const awayFromControls = !controls.some(rect => x > rect.left - 48 && x < rect.right + 48 && y > rect.top - 48 && y < rect.bottom + 48);
        if (awayFromControls && hit && node.contains(hit) && !hit.closest('button')) return { x, y };
      }
    }
    return null;
  });
  expect(point, 'A fotografia precisa ter superfície livre para o gesto').not.toBeNull();
  return point!;
}

test('home preenche a área principal com a fotografia original proporcional, sem carregar uma maquete', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const home = await readyHome(page);
  const initial = await settled(home);
  await originalProportions(home);
  expect(initial.scale).toBe(1);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('[data-spatial-viewer]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Explorar em 3D', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Conheça a coleção', exact: true }).click();
  await expect(page).toHaveURL(/#\/colecao/);
  await page.goBack();
  await readyHome(page);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('os quatro pontos selecionam os imóveis e a âncora acompanha a fotografia ampliada', async ({ page }) => {
  await page.goto('/');
  const home = await readyHome(page);
  await settled(home);
  const anchor = async (button: Locator) => button.locator('.photographic-home__dot').evaluate(node => {
    const image = document.querySelector<HTMLImageElement>('.photographic-home__image')!.getBoundingClientRect();
    const dot = node.getBoundingClientRect();
    return { x: (dot.x + dot.width / 2 - image.x) / image.width, y: (dot.y + dot.height / 2 - image.y) / image.height };
  });
  for (const [label, title] of [['Casas', 'Casa entre as araucárias'], ['Casas em condomínio', 'Casa no condomínio dos jardins'], ['Apartamentos', 'Apartamento com varanda'], ['Compactos', 'Compacto junto à praça']]) {
    const pin = home.getByRole('button', { name: label, exact: true });
    await expect(pin).toBeVisible();
    const before = await anchor(pin);
    await pin.click();
    await expect(pin).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('complementary', { name: 'Imóvel selecionado' })).toContainText(title);
    expect((await settled(home)).scale).toBeGreaterThan(1.5);
    const after = await anchor(pin);
    expect(Math.abs(after.x - before.x)).toBeLessThan(.003);
    expect(Math.abs(after.y - before.y)).toBeLessThan(.003);
    await originalProportions(home);
    await page.getByRole('button', { name: 'Fechar imóvel selecionado', exact: true }).click();
    await expect.poll(async () => (await pose(home)).scale, { timeout: 8_000 }).toBe(1);
  }
});

test('zoom e arraste respeitam os limites e visão ampla restaura a composição', async ({ page }) => {
  await page.goto('/');
  const home = await readyHome(page);
  const initial = await settled(home);
  await originalProportions(home);
  const closer = page.getByRole('button', { name: 'Aproximar cenário', exact: true });
  for (let i = 0; i < 12 && await closer.isEnabled(); i++) await closer.click();
  await expect(closer).toBeDisabled();
  const maximum = await settled(home);
  expect(maximum.scale).toBe(2.4);
  await originalProportions(home);
  const { x, y } = await dragPoint(home);
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x - 1800, y + 1500, { steps: 20 }); await page.mouse.up();
  const dragged = await settled(home);
  expect(Math.hypot(dragged.x - maximum.x, dragged.y - maximum.y)).toBeGreaterThan(50);
  expect(Math.abs(dragged.x)).toBeLessThanOrEqual(Math.max(0, (dragged.imageWidth * dragged.scale - dragged.viewportWidth) / 2) + .1);
  expect(Math.abs(dragged.y)).toBeLessThanOrEqual(Math.max(0, (dragged.imageHeight * dragged.scale - dragged.viewportHeight) / 2) + .1);
  await originalProportions(home);
  await page.getByRole('button', { name: 'Centralizar cenário', exact: true }).click();
  const restored = await settled(home);
  expect(restored.scale).toBe(1);
  expect(Math.hypot(restored.x - initial.x, restored.y - initial.y)).toBeLessThan(.1);
  await originalProportions(home);
  await expect(page.getByRole('button', { name: 'Afastar cenário', exact: true })).toBeDisabled();
  await expect(home.getByRole('button', { name: 'Casas', exact: true })).toBeVisible();
  await expect(home.getByRole('button', { name: 'Apartamentos', exact: true })).toBeVisible();
});

test.describe('home fotográfica móvel', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  test('toque, teclado e movimento reduzido preservam a imagem e o acesso à navegação', async ({ page }) => {
    await page.goto('/');
    const home = await readyHome(page);
    const initial = await settled(home);
    await originalProportions(home);
    const surface = home.getByRole('region', { name: 'Explorar o cenário em imagem', exact: true });
    await surface.scrollIntoViewIfNeeded();
    await surface.focus();
    await page.keyboard.press('+');
    await page.keyboard.press('ArrowLeft');
    const keyboardPose = await pose(home);
    expect(keyboardPose.scale).toBeGreaterThan(1);
    expect(Math.abs(keyboardPose.x)).toBeGreaterThan(1);
    await originalProportions(home);
    await page.keyboard.press('Home');
    expect((await pose(home)).scale).toBe(1);
    await page.getByRole('button', { name: 'Aproximar cenário', exact: true }).click();
    await page.getByRole('button', { name: 'Aproximar cenário', exact: true }).click();
    const before = await pose(home), point = await dragPoint(home);
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.x, y: point.y }] });
    for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.x - i * 9, y: point.y + i * 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
    await expect.poll(async () => {
      const after = await pose(home);
      return Math.hypot(after.x - before.x, after.y - before.y);
    }, { message: `Gesto móvel a partir de ${JSON.stringify({ before, point })}` }).toBeGreaterThan(10);
    await originalProportions(home);
    await page.getByRole('button', { name: 'Centralizar cenário', exact: true }).click();
    const restored = await settled(home);
    expect(restored.scale).toBe(1);
    expect(Math.hypot(restored.x - initial.x, restored.y - initial.y)).toBeLessThan(.1);
    await originalProportions(home);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
    await page.getByRole('navigation', { name: 'Menu móvel' }).getByRole('link', { name: 'A coleção completa', exact: true }).click();
    await expect(page).toHaveURL(/#\/colecao/);
  });
});
