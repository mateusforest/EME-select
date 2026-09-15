import { expect, test, type Locator, type Page } from '@playwright/test';

const protocol = 'fd518fc8-0f27-433a-9cbe-cfa7b201f74d';
const consent = 'Autorizo a EME Select a armazenar os dados desta ficha de forma privada';

async function openForm(page: Page): Promise<Locator> {
  await page.route('**/api/public/properties', route => route.fulfill({ json: { properties: [] } }));
  await page.goto('/#/proprietarios');
  const form = page.getByRole('region', { name: 'Envio de imóvel para avaliação' });
  await expect(form).toBeVisible();
  return form;
}

async function fillProperty(form: Locator) {
  await form.getByLabel('Cidade e estado', { exact: true }).fill('Cidade de Teste, RS');
  await form.getByLabel('Tipo de imóvel', { exact: true }).selectOption('Apartamento');
  await form.getByLabel('Ambiente', { exact: true }).selectOption('litoral');
  await form.getByLabel('Área do imóvel', { exact: false }).fill('116');
  await form.getByLabel('Preço pretendido', { exact: false }).fill('3990000');
  await form.getByRole('button', { name: 'Continuar', exact: true }).click();
}

async function fillContact(form: Locator) {
  await form.getByLabel('Seu nome', { exact: true }).fill('Pessoa de Teste');
  await form.getByLabel('Telefone com DDD', { exact: true }).fill('(54) 99990-0000');
  await form.getByLabel('Sua relação com o imóvel', { exact: true }).selectOption('Proprietário');
  await form.getByLabel('O que torna este imóvel especial?', { exact: false }).fill('Ficha fictícia usada apenas em teste automatizado.');
  await form.getByRole('button', { name: 'Revisar ficha', exact: true }).click();
}

test('valida campos, exige revisão e consentimento e confirma o registro pelo protocolo', async ({ page }) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/api/public/submissions', route => {
    requests.push(route.request().postDataJSON());
    return route.fulfill({ status: 201, json: { reference: protocol } });
  });
  const form = await openForm(page);
  await form.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(form.getByLabel('Cidade e estado', { exact: true })).toBeFocused();
  await expect(form.getByLabel('Tipo de imóvel', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await fillProperty(form);
  await form.getByRole('button', { name: 'Revisar ficha', exact: true }).click();
  await expect(form.getByLabel('Seu nome', { exact: true })).toBeFocused();
  await expect(form.getByLabel('Telefone com DDD', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await fillContact(form);
  await expect(form.getByRole('heading', { name: 'Confira antes de enviar.' })).toBeVisible();
  await expect(form.locator('dd').filter({ hasText: 'R$ 3.990.000,00' })).toBeVisible();
  expect(requests).toHaveLength(0);
  await form.getByRole('button', { name: 'Confirmar e enviar para avaliação' }).click();
  await expect(form.getByRole('checkbox', { name: new RegExp(consent) })).toBeFocused();
  await expect(form.getByRole('checkbox', { name: new RegExp(consent) })).toHaveAttribute('aria-invalid', 'true');
  expect(requests).toHaveLength(0);
  await form.getByRole('button', { name: 'Editar informações' }).click();
  await expect(form.getByLabel('Seu nome', { exact: true })).toHaveValue('Pessoa de Teste');
  await form.getByRole('button', { name: 'Revisar ficha', exact: true }).click();
  await form.getByRole('checkbox', { name: new RegExp(consent) }).check();
  await form.getByRole('button', { name: 'Confirmar e enviar para avaliação' }).click();
  await expect(page.getByRole('heading', { name: 'Recebemos seu imóvel.' })).toBeVisible();
  await expect(page.getByText(protocol, { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ name: 'Pessoa de Teste', phone: '(54) 99990-0000', relationship: 'Proprietário', city: 'Cidade de Teste, RS', type: 'Apartamento', environment: 'litoral', operation: 'comprar', area: 116, price: 3990000, consent: true, website: '' });
  expect(requests[0].requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  expect(stored).not.toContain('Pessoa de Teste');
  expect(stored).not.toContain('99990-0000');
});

test('no celular, mantém o pedido após falha e bloqueia envios concorrentes durante a tentativa', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests: Record<string, unknown>[] = [];
  let release: () => void = () => {};
  const responseReady = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/public/submissions', async route => {
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) return route.fulfill({ status: 503, json: { error: 'O serviço está temporariamente indisponível.' } });
    await responseReady;
    return route.fulfill({ status: 201, json: { reference: protocol } });
  });
  const form = await openForm(page);
  await fillProperty(form);
  await fillContact(form);
  await form.getByRole('checkbox', { name: new RegExp(consent) }).check();
  await form.getByRole('button', { name: 'Confirmar e enviar para avaliação' }).click();
  await expect(form.getByRole('alert')).toContainText('temporariamente indisponível');
  await expect(form.getByRole('button', { name: 'Editar informações' })).toHaveCount(0);
  await expect(form.getByRole('checkbox', { name: new RegExp(consent) })).toBeDisabled();
  await form.getByRole('button', { name: 'Tentar envio novamente' }).click();
  await expect(form.getByRole('button', { name: 'Enviando sua ficha…' })).toBeDisabled();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1]).toEqual(requests[0]);
  const bounds = await form.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  release();
  await expect(page.getByRole('heading', { name: 'Recebemos seu imóvel.' })).toBeVisible();
  expect(requests).toHaveLength(2);
});
