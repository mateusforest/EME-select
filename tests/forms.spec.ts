import { test, expect, type Locator, type Page } from '@playwright/test';

const bookingDialogName = 'Agendar uma visita';
const consentName = 'Autorizo a EME Select a entrar em contato comigo sobre esta solicitação.';

async function openBooking(page: Page): Promise<Locator> {
  await page.goto('/#/imovel/urbano-01');
  await page.getByRole('button', { name: 'Agendar visita', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: bookingDialogName, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function dateOffset(page: Page, days: number): Promise<string> {
  return page.evaluate(offset => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }, days);
}

async function storageSnapshot(page: Page): Promise<{ local: string; session: string }> {
  return page.evaluate(() => ({ local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage) }));
}

async function fillContact(container: Locator, name = 'Pessoa de Teste', phone = '(54) 99990-2688'): Promise<void> {
  await container.getByLabel('Seu nome', { exact: true }).fill(name);
  await container.getByLabel('Telefone com DDD', { exact: true }).fill(phone);
  await container.getByRole('checkbox', { name: consentName, exact: true }).check();
}

async function whatsappMessage(container: Locator): Promise<string> {
  const link = container.getByRole('link', { name: 'Enviar pelo WhatsApp' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  const href = await link.getAttribute('href');
  expect(href).toBeTruthy();
  const url = new URL(href!);
  expect(url.origin).toBe('https://wa.me');
  expect(url.pathname).toBe('/5554999902688');
  const text = url.searchParams.get('text');
  expect(text).toBeTruthy();
  return text!;
}

test.describe('Solicitação de visita', () => {
  test('exige contato e consentimento com erros associados aos campos', async ({ page }) => {
    const dialog = await openBooking(page);
    await dialog.getByRole('button', { name: 'Revisar solicitação' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Revise os campos indicados para continuar.');
    const name = dialog.getByLabel('Seu nome', { exact: true });
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription('Informe seu nome, com pelo menos 2 caracteres.');
    await expect(dialog.getByLabel('Telefone com DDD', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByRole('checkbox', { name: consentName })).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByRole('link', { name: 'Enviar pelo WhatsApp' })).toHaveCount(0);

    await fillContact(dialog, 'Pessoa de Teste', '123');
    await dialog.getByRole('button', { name: 'Revisar solicitação' }).click();
    await expect(dialog.getByLabel('Telefone com DDD', { exact: true })).toBeFocused();
    await expect(dialog.getByRole('link', { name: 'Enviar pelo WhatsApp' })).toHaveCount(0);
  });

  test('bloqueia datas passadas e horários incompatíveis com o período', async ({ page }) => {
    const dialog = await openBooking(page);
    await fillContact(dialog);
    const date = dialog.getByLabel('Data sugerida');
    await expect(date).toHaveAttribute('min', await dateOffset(page, 0));
    await date.fill(await dateOffset(page, -1));
    await dialog.getByRole('button', { name: 'Revisar solicitação' }).click();
    await expect(date).toHaveAttribute('aria-invalid', 'true');
    await expect(date).toHaveAccessibleDescription('Escolha uma data válida a partir de hoje.');
    await expect(dialog.getByRole('link', { name: 'Enviar pelo WhatsApp' })).toHaveCount(0);

    await date.fill(await dateOffset(page, 1));
    await dialog.getByLabel('Período').selectOption('Manhã');
    const time = dialog.getByLabel('Horário', { exact: false });
    await time.fill('15:00');
    await dialog.getByRole('button', { name: 'Revisar solicitação' }).click();
    await expect(time).toHaveAccessibleDescription('Escolha um horário antes de 12h ou altere o período.');
    await expect(dialog.getByRole('link', { name: 'Enviar pelo WhatsApp' })).toHaveCount(0);
  });

  test('permite revisar e editar sem enviar nem persistir dados pessoais', async ({ page, context }) => {
    const whatsappRequests: string[] = [];
    page.on('request', request => { if (/https:\/\/(?:wa\.me|(?:api|web)\.whatsapp\.com)\//.test(request.url())) whatsappRequests.push(request.url()); });
    const dialog = await openBooking(page);
    const before = await storageSnapshot(page);
    await fillContact(dialog, 'Teste Visita & Família');
    await dialog.getByLabel('Data sugerida').fill(await dateOffset(page, 1));
    await dialog.getByLabel('Período').selectOption('Tarde');
    await dialog.getByLabel('Horário', { exact: false }).fill('15:30');
    await dialog.getByLabel('Algo que gostaria de nos contar?').fill('Gostaria de conhecer a varanda & a iluminação natural.');
    await dialog.getByRole('button', { name: 'Revisar solicitação' }).click();
    await expect(dialog.getByRole('heading', { name: 'Confira seu pedido.' })).toBeVisible();
    await expect(dialog.getByText('Horário sujeito à confirmação da equipe.', { exact: true })).toBeVisible();
    await expect(dialog.getByText(/A mensagem ainda não foi enviada/)).toBeVisible();
    const message = await whatsappMessage(dialog);
    expect(message).toContain('Nome: Teste Visita & Família');
    expect(message).toContain('Apartamento com varanda · urbano-01');
    expect(message).toContain('Período: Tarde');
    expect(message).toContain('Horário sugerido: 15:30');
    expect(message).toContain('varanda & a iluminação natural.');
    expect(await storageSnapshot(page)).toEqual(before);
    expect(whatsappRequests).toEqual([]);
    expect(context.pages()).toHaveLength(1);

    await dialog.getByRole('button', { name: 'Editar informações' }).click();
    await expect(dialog.getByLabel('Seu nome', { exact: true })).toHaveValue('Teste Visita & Família');
    await expect(dialog.getByRole('checkbox', { name: consentName })).toBeChecked();
    await dialog.getByRole('button', { name: 'Agora não' }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Agendar visita', exact: true }).first().click();
    await expect(dialog.getByLabel('Seu nome', { exact: true })).toHaveValue('');
    await expect(dialog.getByRole('checkbox', { name: consentName })).not.toBeChecked();
  });
});

test.describe('Apresentação do imóvel pelo proprietário', () => {
  test('solicita dados essenciais e prepara mensagem revisável para o contato correto', async ({ page, context }) => {
    const whatsappRequests: string[] = [];
    page.on('request', request => { if (request.url().startsWith('https://wa.me/')) whatsappRequests.push(request.url()); });
    await page.goto('/#/proprietarios');
    const form = page.locator('.form-shell').filter({ has: page.getByRole('heading', { name: 'Todo lugar tem uma história.' }) });
    await expect(form).toBeVisible();
    const before = await storageSnapshot(page);
    await form.getByRole('button', { name: 'Revisar apresentação' }).click();
    await expect(form.getByRole('alert')).toBeVisible();
    await expect(form.getByLabel('Cidade do imóvel', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByLabel('Tipo de imóvel', { exact: true })).toHaveAttribute('aria-invalid', 'true');

    await fillContact(form, 'Teste Proprietário');
    await form.getByLabel('Cidade do imóvel', { exact: true }).fill('Caxias do Sul');
    await form.getByLabel('Tipo de imóvel', { exact: true }).selectOption('Casa');
    await form.getByLabel('O que você pretende?', { exact: true }).selectOption('Alugar');
    await form.getByLabel('Conte um pouco sobre o imóvel').fill('Casa com jardim, 3 quartos e varanda.');
    await form.getByRole('button', { name: 'Revisar apresentação' }).click();
    const review = page.getByRole('region', { name: 'Revisão da solicitação' });
    await expect(review.getByRole('heading', { name: 'Confira seu pedido.' })).toBeVisible();
    const message = await whatsappMessage(review);
    expect(message).toContain('Nome: Teste Proprietário');
    expect(message).toContain('Cidade: Caxias do Sul');
    expect(message).toContain('Tipo de imóvel: Casa');
    expect(message).toContain('Interesse: Alugar');
    expect(message).toContain('Casa com jardim, 3 quartos e varanda.');
    expect(await storageSnapshot(page)).toEqual(before);
    expect(whatsappRequests).toEqual([]);
    expect(context.pages()).toHaveLength(1);

    await page.reload();
    await expect(page.getByLabel('Seu nome', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Telefone com DDD', { exact: true })).toHaveValue('');
    await expect(page.getByRole('checkbox', { name: consentName })).not.toBeChecked();
  });
});
