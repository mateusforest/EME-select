import { expect, test } from '@playwright/test';

test('menu de exploração, diferenças, visita e retorno preservam a busca', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Condomínios horizontais', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Explorar', exact: true })).toBeFocused();
  await page.goto('/#/colecao?regiao=serra&tipo=Casa');
  await page.getByRole('button', { name: 'Comparar Casa entre as araucárias', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar Casa no condomínio da serra', exact: true }).click();
  await page.getByRole('button', { name: 'Comparar seleção', exact: true }).click();
  const route = page.url();
  await expect(page.getByRole('rowheader', { name: 'Quartos', exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Mostrar apenas diferenças', exact: true }).check();
  await expect(page.getByRole('rowheader', { name: 'Quartos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('rowheader', { name: 'Suítes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Solicitar visita', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Casa entre as araucárias');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page).toHaveURL(route);
  await page.getByRole('link', { name: 'Voltar à coleção', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Ambiente', exact: true })).toHaveValue('serra');
  await expect(page.getByRole('combobox', { name: 'Tipo de imóvel', exact: true })).toHaveValue('Casa');
});

