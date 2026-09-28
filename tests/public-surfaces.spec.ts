import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.route('**/api/public/properties', route => route.fulfill({json: {properties: []}}));
  await page.route('**/api/public/people', route => route.fulfill({json: {people: []}}));
});

test('styled pickers support pointer selection, Escape and dependent filter reset', async ({page}) => {
  await page.goto('/');
  const type = page.getByRole('combobox', {name: 'Tipo de imóvel', exact: true});
  await expect(type).toHaveCSS('appearance', 'base-select');
  await type.click();
  const option = page.getByRole('option', {name: 'Centro de distribuição', exact: true});
  await option.scrollIntoViewIfNeeded();
  await expect(option).toBeVisible();
  await option.click();
  await expect(type).toHaveValue('Centro de distribuição');
  await type.click();await page.keyboard.press('Escape');
  await expect(type).toBeFocused();
  await expect(type).toHaveValue('Centro de distribuição');
  const region = page.getByRole('combobox', {name: 'Ambiente', exact: true});
  await region.click();await page.getByRole('option', {name: 'Litoral Norte', exact: true}).click();
  await expect(type).toHaveValue('');
  await page.getByRole('button', {name: 'Buscar imóveis', exact: true}).click();
  await expect(page).toHaveURL(/regiao=litoral/);
});

test('catalog card gutters and expanded mobile filters contain every field', async ({page}) => {
  for (const width of [1440, 1024, 390, 320]) {
    await page.setViewportSize({width, height: 900});await page.goto('/#/colecao');
    const panel = page.getByRole('complementary', {name: 'Filtros da coleção'});
    if(width < 851) await page.getByRole('button', {name: 'Refinar minha busca'}).click();
    await expect(page.locator('#catalog-filters')).toBeVisible();
    const contained = await panel.evaluate(element => {
      const box = element.getBoundingClientRect();
      return [...element.querySelectorAll('input,select,.catalog-filter-heading,.catalog-filter-note,.catalog-apply,.catalog-reset')].every(child => {
        const r = child.getBoundingClientRect();
        return !r.width || (r.left >= box.left + 10 && r.right <= box.right - 10);
      });
    });
    expect(contained).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const type = page.getByRole('combobox', {name: 'Tipo de imóvel', exact: true});
    await type.click();await page.getByRole('option', {name: 'Terra agrícola', exact: true}).click();
    await expect(type).toHaveValue('Terra agrícola');
    await page.getByRole('button', {name: 'Aplicar filtros'}).click();
    await expect(page).toHaveURL(/tipo=Terra/);
    if(width < 851) await expect(page.locator('#catalog-filters')).toBeHidden();
  }
});

test('environment captions stay inside their cards at intermediate and mobile widths', async ({page}) => {
  for (const width of [1280, 1024, 390, 320]) {
    await page.setViewportSize({width, height: 900});await page.goto('/');
    await expect(page.locator('.explore-env-link')).toHaveCount(7);
    const contained = await page.locator('.explore-env-link').evaluateAll(cards => cards.every(card => {
      const box = card.getBoundingClientRect();
      return [...card.querySelectorAll('h3,p')].every(node => {
        const range = document.createRange();range.selectNodeContents(node);
        return [...range.getClientRects()].every(r => r.left >= box.left + 8 && r.right <= box.right - 8);
      });
    }));
    expect(contained).toBe(true);
  }
});
