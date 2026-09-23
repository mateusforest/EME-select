import { test, expect } from '@playwright/test';

test('public header has no ambient player or audio requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (/\/audio\//.test(request.url())) requests.push(request.url()); });
  await page.route('**/api/public/properties', route => route.fulfill({ json: { properties: [] } }));
  for (const width of [1920, 390]) {
    await page.setViewportSize({ width, height: 1080 });
    await page.goto('/#/empreendimentos/moradas-da-serra');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Moradas');
    await expect(page.locator('.eme-atmosphere, audio')).toHaveCount(0);
    await expect(page.locator('.brand--marble')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(page.locator('.brand--marble')).toHaveCSS('box-shadow', 'none');
    await page.screenshot({ path: `test-results/header-${width}.png` });
  }
  expect(requests).toEqual([]);
});
