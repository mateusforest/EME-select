import { test, expect } from '@playwright/test';
import { floorState } from '../src/developments/moradas';

const route = '/#/empreendimentos/moradas-da-serra';
test.beforeEach(async ({ page }) => { await page.route('**/api/public/properties', request => request.fulfill({ json: { properties: [] } })); });

test('unknown stock is not availability and sold-out floors cannot be offered', () => {
  expect(floorState('a', 6, [])).toBe('unknown');
  const sample = [{ id: '601', tower: 'a' as const, floor: 6, label: '601', typology: '2 dormitórios', status: 'sold' as const }];
  expect(floorState('a', 6, sample)).toBe('unavailable');
  expect(floorState('a', 6, [...sample, { ...sample[0], id: '602', status: 'reserved' }])).toBe('unavailable');
  expect(floorState('a', 6, [...sample, { ...sample[0], id: '602', status: 'available' }])).toBe('available');
  expect(floorState('b', 6, sample)).toBe('unknown');
});

test('official header, tower/floor selection, honest availability and source galleries', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Moradas da Serra.');
  await expect(page.locator('.brand-monogram')).toBeVisible();
  await expect(page.locator('.development-image-world>img')).toHaveJSProperty('complete', true);
  await expect(page.getByRole('button', { name: '6º andar, disponibilidade a confirmar', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Torre 2', exact: true }).click();
  await page.getByRole('button', { name: '3º andar, disponibilidade a confirmar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Torre 2 · 3º andar' })).toBeVisible();
  await page.getByLabel('Só disponibilidade confirmada').check();
  await expect(page.locator('.development-stock-empty')).toContainText('ainda não foi confirmado');
  await expect(page.getByRole('group', { name: 'Andares', exact: true }).getByRole('button')).toHaveCount(0);
  await page.getByLabel('Só disponibilidade confirmada').uncheck();
  await page.getByRole('button', { name: 'Torre 1', exact: true }).click();
  await page.getByRole('button', { name: '6º andar, disponibilidade a confirmar', exact: true }).click();
  await page.screenshot({ path: 'test-results/deville-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Conhecer os interiores', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByAltText('Estar e jantar integrados')).toBeVisible();
  await page.getByRole('button', { name: 'Próxima imagem', exact: true }).click();
  await expect(dialog.getByAltText('Cozinha integrada')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Conhecer os interiores', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Ver tipologias e plantas', exact: true }).click();
  await expect(dialog).toContainText('52 m²');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Lazer', exact: true }).first().click();
  await expect(dialog.getByAltText('Piscina e espaço de convivência')).toBeVisible();
  await page.keyboard.press('Escape');
  const link = page.getByRole('link', { name: 'Consultar a EME', exact: true });
  expect(await link.getAttribute('href')).toContain('5554991578029');
  expect(errors).toEqual([]);
});

test('real 3D camera, floor selection, lighting and context-loss fallback', async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(route);
  await page.getByRole('button', { name: 'Explorar em 3D', exact: true }).click();
  const model = page.getByTestId('development-model');
  await expect(model).toHaveAttribute('data-camera', /,/, { timeout: 45000 });
  await expect(model).toHaveAttribute('data-selected-floor', 'a-6');
  await expect(model).toHaveAttribute('data-active-lights', '6');
  await expect(model).toHaveAttribute('data-window-emission', '1.4');
  await page.getByRole('button', { name: 'Dia', exact: true }).click();
  await expect(model).toHaveAttribute('data-active-lights', '0');
  await expect(model).toHaveAttribute('data-window-emission', '0');
  const before = await model.getAttribute('data-camera');
  await model.locator('canvas').focus();
  await page.keyboard.press('ArrowRight');
  await expect(model).not.toHaveAttribute('data-camera', before!);
  await page.getByRole('button', { name: 'Torre 2', exact: true }).click();
  await page.getByRole('button', { name: '8º andar, disponibilidade a confirmar', exact: true }).click();
  await expect(model).toHaveAttribute('data-selected-floor', 'b-8');
  await page.getByRole('button', { name: 'Noite', exact: true }).click();
  await expect(model).toHaveAttribute('data-lighting', 'night');
  await expect(model).toHaveAttribute('data-active-lights', '6');
  await expect(model).toHaveAttribute('data-window-emission', '2.6');
  await page.screenshot({ path: 'test-results/deville-3d-night.png', fullPage: true });
  await page.getByRole('button', { name: 'Entardecer', exact: true }).click();
  await page.screenshot({ path: 'test-results/deville-3d.png', fullPage: true });
  await model.locator('canvas').dispatchEvent('webglcontextlost');
  await expect(page.getByText('Este navegador não conseguiu abrir a maquete 3D.')).toBeVisible();
  await page.getByRole('button', { name: 'Voltar à apresentação', exact: true }).click();
  await expect(page.locator('.development-image-world')).toBeVisible();
  expect(errors).toEqual([]);
});

test('facade selection and lights share the image projection through resizing and zoom', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(route);
  const lights = page.getByTestId('scene-lights');
  await expect(lights).toHaveCSS('opacity', '0.74');
  await page.locator('.development-image-world>img').evaluate((image: HTMLImageElement) => image.decode());
  await page.screenshot({ path: 'test-results/deville-sunset-fixed.png' });
  await page.getByRole('button', { name: 'Noite', exact: true }).click();
  await expect(lights).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('apartment-lights').locator('g')).toHaveCount(62);
  await page.screenshot({ path: 'test-results/deville-night-fixed.png' });
  await page.getByRole('button', { name: 'Dia', exact: true }).click();
  await expect(lights).toHaveCSS('opacity', '0');
  for (const tower of ['Torre 1', 'Torre 2']) {
    await page.getByRole('button', { name: tower, exact: true }).click();
    for (const floor of [1, 6, 9]) {
      await page.getByRole('button', { name: `${floor}º andar, disponibilidade a confirmar`, exact: true }).click();
      await expect(page.getByTestId('floor-band')).toHaveAttribute('data-selected-floor', `${tower === 'Torre 1' ? 'a' : 'b'}-${floor}`);
      await page.screenshot({ path: `test-results/floor-${tower === 'Torre 1' ? 'a' : 'b'}-${floor}.png` });
    }
  }
  // Independent cover-projection calculation catches mismatched aspect ratio,
  // object-position, or zoom between the raster facade and its SVG selection.
  for (const width of [1920, 1440, 390]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.getByRole('button', { name: 'Aproximar cenário', exact: true }).click();
    const error = await page.evaluate(() => {
      const image = document.querySelector<HTMLImageElement>('.development-image-world>img')!;
      const overlay = document.querySelector<SVGSVGElement>('.development-scene-overlay')!;
      const bounds = image.getBoundingClientRect();
      const scale = Math.max(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
      const point = overlay.createSVGPoint(); point.x = 1012; point.y = 222;
      const actual = point.matrixTransform(overlay.getScreenCTM()!);
      const expected = { x: bounds.x + (bounds.width - image.naturalWidth * scale) / 2 + 1012 * scale, y: bounds.y + (bounds.height - image.naturalHeight * scale) / 2 + 222 * scale };
      return Math.hypot(actual.x - expected.x, actual.y - expected.y);
    });
    expect(error).toBeLessThan(.1);
    await expect(page.getByTestId('floor-band')).toBeAttached();
    await page.getByRole('button', { name: 'Restaurar visão geral', exact: true }).click();
  }
});

test('mobile scene, panels, galleries and reduced-motion layout stay usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Moradas da Serra.');
  await expect(page.locator('.development-image-world>img')).toHaveJSProperty('complete', true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/deville-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Torre 2', exact: true }).click();
  await page.getByRole('button', { name: '2º andar, disponibilidade a confirmar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Torre 2 · 2º andar' })).toBeVisible();
  await page.getByRole('button', { name: 'Conhecer os interiores', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar janela', exact: true }).click();
  await page.getByRole('button', { name: 'Recolher andares', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Escolher torre e andar' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Escolher andar', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Escolher torre e andar' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('home entry and official navigation open the development and back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await page.getByRole('link', { name: 'Moradas da Serra · DeVille', exact: true }).click();
  await expect(page).toHaveURL(/empreendimentos\/moradas-da-serra/);
  await page.getByRole('link', { name: 'Voltar à coleção', exact: true }).click();
  await page.getByRole('link', { name: 'Explorar Moradas da Serra', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Moradas da Serra.');
});
