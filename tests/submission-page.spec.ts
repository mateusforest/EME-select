import { expect, test } from '@playwright/test';

test('o link público abre a ficha sem login e confirma envio privado com protocolo', async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/public/submissions', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { reference: 'fd518fc8-0f27-433a-9cbe-cfa7b201f74d' } });
  });
  await page.goto('/enviar-imovel');
  await expect(page).toHaveTitle('Apresente seu imóvel — EME Select');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu imóvel.');
  await expect(page.getByText('O envio não cria uma conta nem libera acesso', { exact: false })).toBeVisible();
  const form = page.getByRole('region', { name: 'Envio de imóvel para avaliação' });
  await form.getByLabel('Cidade e estado', { exact: true }).fill('Cidade de Teste, RS');
  await form.getByLabel('Tipo de imóvel', { exact: true }).selectOption('Apartamento');
  await form.getByRole('button', { name: 'Continuar', exact: true }).click();
  await form.getByLabel('Seu nome', { exact: true }).fill('Pessoa de Teste');
  await form.getByLabel('Telefone com DDD', { exact: true }).fill('(54) 99990-0000');
  await form.getByLabel('Sua relação com o imóvel', { exact: true }).selectOption('Proprietário');
  await form.getByRole('button', { name: 'Revisar ficha', exact: true }).click();
  expect(requests).toHaveLength(0);
  await form.getByRole('checkbox', { name: /Autorizo a EME Select a armazenar os dados/ }).check();
  await form.getByRole('button', { name: 'Confirmar e enviar para avaliação' }).click();
  await expect(page.getByRole('heading', { name: 'Recebemos seu imóvel.' })).toBeVisible();
  await expect(page.getByText('fd518fc8-0f27-433a-9cbe-cfa7b201f74d', { exact: true })).toBeVisible();
  await expect(page.getByText('O recebimento não representa aprovação na curadoria nem publicação de um anúncio.')).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ city: 'Cidade de Teste, RS', name: 'Pessoa de Teste', relationship: 'Proprietário', consent: true });
  expect(requests[0]).not.toHaveProperty('photos');
  expect(requests[0]).not.toHaveProperty('role');
  await page.getByRole('button', { name: 'Concluir', exact: true }).click();
  await expect(page).toHaveURL(/\/#\/$/);
});

test('orientações ficam acessíveis no celular e o formulário não oferece upload nem acesso de proprietário', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/enviar-imovel/');
  await expect(page.getByRole('heading', { name: 'O que preparar.' })).toBeVisible();
  await expect(page.getByText('2.000 px no lado maior e 1.200 px no menor', { exact: true })).toBeVisible();
  await expect(page.getByText('3.000 px ou mais no lado maior', { exact: true })).toBeVisible();
  await expect(page.getByText('Esta página recebe somente dados e contato.', { exact: false })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'EME Select — início', exact: true })).toHaveAttribute('href', '/#/');
  await expect(page.getByRole('link', { name: /Precisa de ajuda/ })).toHaveAttribute('href', /^https:\/\/wa\.me\/5554991578029\?/);
  await page.getByRole('link', { name: 'Preencher minha ficha', exact: true }).click();
  const form = page.getByRole('region', { name: 'Envio de imóvel para avaliação' });
  await expect(form.getByLabel('Cidade e estado', { exact: true })).toBeInViewport();
  const dimensions = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('a navegação pública leva à página de envio no desktop e no celular', async ({ page }) => {
  await page.route('**/api/public/properties', route => route.fulfill({ json: { properties: [] } }));
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Para proprietários', exact: true }).click();
  await expect(page).toHaveURL(/\/enviar-imovel$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu imóvel.');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menu móvel' }).getByRole('link', { name: 'Para proprietários', exact: true }).click();
  await expect(page).toHaveURL(/\/enviar-imovel$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu imóvel.');
});
