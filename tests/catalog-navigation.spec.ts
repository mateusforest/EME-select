import { expect, test, type Page } from '@playwright/test';

const compare = (page: Page, title: string) => page.getByRole('button', { name: `Comparar ${title}`, exact: true });
const row = (page: Page, title: string) => page.getByRole('article').filter({ has: compare(page, title) });
const filter = (page: Page, label: string) => {
  if (['Ambiente', 'Finalidade', 'Tipo de imóvel', 'Quartos', 'Ordenar por'].includes(label)) return page.getByRole('combobox', { name: label, exact: true });
  if (label === 'Área mínima') return page.getByRole('spinbutton', { name: /Área mínima/ });
  if (label === 'Valor mínimo' || label === 'Valor máximo') return page.getByRole('spinbutton', { name: label, exact: true });
  return page.getByRole('textbox', { name: label, exact: true });
};
const apply = async (page: Page) => page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
const routeParams = (url: string) => new URLSearchParams(new URL(url).hash.split('?')[1] || '');

test('filtros da coleção permanecem no endereço, no recarregamento e no voltar', async ({ page }) => {
  await page.goto('/#/colecao');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Encontre o seu lugar.');
  await filter(page, 'Ambiente').selectOption('serra');
  await filter(page, 'Finalidade').selectOption('comprar');
  await filter(page, 'Tipo de imóvel').selectOption('Casa');
  await filter(page, 'Valor mínimo').fill('1600000');
  await filter(page, 'Valor máximo').fill('2300000');
  await filter(page, 'Área mínima').fill('200');
  await filter(page, 'Quartos').selectOption('3');
  await apply(page);
  await expect(row(page, 'Casa entre as araucárias')).toBeVisible();
  await expect(compare(page, 'Casa no condomínio da serra')).toHaveCount(0);
  const firstUrl = page.url();
  expect(Object.fromEntries(routeParams(firstUrl))).toMatchObject({ regiao: 'serra', tipo: 'Casa', precoMin: '1600000', precoMax: '2300000', areaMin: '200', quartos: '3' });
  expect(routeParams(firstUrl).get('operacao') || 'comprar').toBe('comprar');

  await page.reload();
  await expect(filter(page, 'Área mínima')).toHaveValue('200');
  await expect(filter(page, 'Valor mínimo')).toHaveValue('1600000');
  await expect(row(page, 'Casa entre as araucárias')).toBeVisible();

  await filter(page, 'Valor mínimo').fill('1500000');
  await filter(page, 'Valor máximo').fill('2000000');
  await filter(page, 'Área mínima').fill('178');
  await apply(page);
  await expect(row(page, 'Casa no condomínio da serra')).toBeVisible();
  await expect(compare(page, 'Casa entre as araucárias')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(firstUrl);
  await expect(filter(page, 'Área mínima')).toHaveValue('200');
  await expect(row(page, 'Casa entre as araucárias')).toBeVisible();
});

test('coleção distingue condomínios horizontais e verticais', async ({ page }) => {
  await page.goto('/#/colecao');
  await filter(page, 'Finalidade').selectOption('comprar');
  await filter(page, 'Tipo de imóvel').selectOption('Condomínio horizontal');
  await apply(page);
  await expect(row(page, 'Casa no condomínio dos jardins')).toBeVisible();
  await expect(row(page, 'Casa no condomínio da serra')).toBeVisible();
  await expect(compare(page, 'Residência nas alturas')).toHaveCount(0);
  expect(routeParams(page.url()).get('tipo')).toBe('Condomínio horizontal');

  await filter(page, 'Tipo de imóvel').selectOption('Condomínio vertical');
  await apply(page);
  await expect(row(page, 'Residência nas alturas')).toBeVisible();
  await expect(compare(page, 'Casa no condomínio dos jardins')).toHaveCount(0);
  await expect(compare(page, 'Casa no condomínio da serra')).toHaveCount(0);
});

test('faixa de valor invertida informa o problema sem perder os filtros digitados', async ({ page }) => {
  await page.goto('/#/colecao');
  await filter(page, 'Valor mínimo').fill('2300000');
  await filter(page, 'Valor máximo').fill('1500000');
  await apply(page);
  await expect(page.getByRole('alert')).toContainText('O valor máximo precisa ser igual ou maior que o valor mínimo.');
  await expect(filter(page, 'Valor mínimo')).toHaveValue('2300000');
  await expect(filter(page, 'Valor máximo')).toHaveValue('1500000');
  await filter(page, 'Valor mínimo').fill('1500000');
  await filter(page, 'Valor máximo').fill('1600000');
  await apply(page);
  await expect(row(page, 'Casa no condomínio da serra')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('comparação exige dois imóveis e limita a três sem substituir a seleção', async ({ page }) => {
  await page.goto('/#/colecao?operacao=comprar');
  await compare(page, 'Apartamento com varanda').click();
  await expect(page.getByRole('button', { name: 'Comparar seleção', exact: true })).toBeDisabled();
  await compare(page, 'Casa entre jardins e mar').click();
  await expect(page.getByRole('button', { name: 'Comparar seleção', exact: true })).toBeEnabled();
  await compare(page, 'Casa entre as araucárias').click();
  await compare(page, 'Residência nas alturas').click();
  await expect(page.getByRole('status').filter({ hasText: 'Você pode comparar até 3 imóveis por vez.' })).toBeVisible();
  for (const title of ['Apartamento com varanda', 'Casa entre jardins e mar', 'Casa entre as araucárias']) {
    await expect(compare(page, title)).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(compare(page, 'Residência nas alturas')).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Comparar seleção', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/O que faz sentido\s*para você\./);
  expect(routeParams(page.url()).get('ids')?.split(',')).toEqual(['urbano-01', 'litoral-01', 'serra-01']);
  await page.reload();
  await expect(page.getByRole('link', { name: 'Apartamento com varanda', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Casa entre jardins e mar', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Casa entre as araucárias', exact: true })).toBeVisible();
});

test('seleção persiste ao trocar a finalidade e gera comparação compartilhável de compra e aluguel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/colecao?operacao=comprar');
  await compare(page, 'Apartamento com varanda').click();
  await filter(page, 'Finalidade').selectOption('alugar');
  await apply(page);
  await compare(page, 'Compacto junto à praça').click();
  await page.getByRole('button', { name: 'Comparar seleção', exact: true }).click();
  expect(routeParams(page.url()).get('ids')?.split(',')).toEqual(['urbano-01', 'urbano-02']);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/O que faz sentido\s*para você\./);
  await expect(page.getByRole('link', { name: 'Apartamento com varanda', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Compacto junto à praça', exact: true })).toBeVisible();
  const main = page.getByRole('main');
  await expect(main).toContainText('À venda');
  await expect(main).toContainText('Locação · mensal');
  await expect(main).toContainText(/1\.850\.000/);
  await expect(main).toContainText(/3\.200/);
  await expect(main).toContainText(/mês/);
  await expect(main).toContainText(/demonstrativo|ilustrativo/i);
  expect(errors).toEqual([]);
});

test('coleção e comparação mantêm a página dentro da largura móvel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/colecao');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Encontre o seu lugar.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Refinar minha busca', exact: true }).click();
  await filter(page, 'Tipo de imóvel').selectOption('Compacto');
  await filter(page, 'Finalidade').selectOption('alugar');
  await apply(page);
  await expect(row(page, 'Compacto junto à praça')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.goto('/#/comparar?ids=urbano-01,litoral-01,serra-01');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/O que faz sentido\s*para você\./);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('endereço de comparação ignora ids inválidos, repetidos e acima do limite', async ({ page }) => {
  await page.goto('/#/comparar?ids=inexistente,urbano-01,urbano-01,litoral-01,serra-01,urbano-03');
  const table = page.getByRole('table');
  await expect(table.getByRole('link', { name: 'Apartamento com varanda', exact: true })).toHaveCount(1);
  await expect(table.getByRole('link', { name: 'Casa entre jardins e mar', exact: true })).toHaveCount(1);
  await expect(table.getByRole('link', { name: 'Casa entre as araucárias', exact: true })).toHaveCount(1);
  await expect(table.getByRole('link', { name: 'Residência nas alturas', exact: true })).toHaveCount(0);
  await page.goto('/#/comparar?ids=inexistente');
  await expect(page.getByRole('heading', { name: 'Dê espaço às suas possibilidades.', exact: true })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});
