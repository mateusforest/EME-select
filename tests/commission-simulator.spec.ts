import { expect, test, type Page } from '@playwright/test';
import { emptyFinance } from '../shared/finance.mjs';

async function setup(page: Page, role = 'admin') {
  const requests: string[] = [];
  const admin = { id: 'a51dd98c-7f63-46a5-a1b3-bd0686129337', name: 'Gestão EME', email: 'admin@example.test', role, active: true, mustChangePassword: false };
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== 'GET') requests.push(path);
    if (path === '/api/auth/session') return route.fulfill({ json: { user: admin, needsSetup: false } });
    if (path === '/api/evaluations') return route.fulfill({ json: { evaluations: [] } });
    if (path === '/api/assignees') return route.fulfill({ json: { members: [admin] } });
    if (path === '/api/finance') return route.fulfill({ json: { version: 0, state: emptyFinance(), history: [], members: [admin], properties: [] } });
    return route.fulfill({ status: 404, json: { error: 'Unexpected API ' + path } });
  });
  await page.goto('/portalselect/financeiro');
  await expect(page.getByRole('navigation', { name: 'Navegação da equipe', includeHidden: true })).toHaveCount(1);
  if (role === 'admin') await page.getByRole('navigation', { name: 'Seções do financeiro' }).getByRole('button', { name: 'Comissão e caixa', exact: true }).click();
  return requests;
}

test('base and stress reconcile with editable inputs without creating real transactions', async ({ page }) => {
  const requests = await setup(page);
  await expect(page.getByTestId('simulation-low')).toContainText('16.600,00');
  await expect(page.getByTestId('simulation-required')).toContainText('34.600,00');
  await expect(page.getByTestId('simulation-final')).toContainText('150.200,00');
  await expect(page.getByRole('row', { name: /Contribuição para fixos e reserva/ })).toContainText('11.700,00');
  await page.getByLabel('Cenário', { exact: true }).selectOption('stress');
  await expect(page.getByTestId('simulation-required')).toContainText('61.000,00');
  await expect(page.getByTestId('simulation-final')).toContainText('8.200,00');
  await page.getByLabel('Aporte / caixa livre inicial (R$)', { exact: true }).fill('61.000,00');
  await expect(page.getByTestId('simulation-low')).toContainText('18.000,00');
  await expect(page.getByTestId('simulation-extra')).toHaveText(/R\$\s*0,00/);
  await page.getByRole('navigation', { name: 'Seções do financeiro' }).getByRole('button', { name: 'Contas', exact: true }).click();
  await page.getByRole('navigation', { name: 'Seções do financeiro' }).getByRole('button', { name: 'Comissão e caixa', exact: true }).click();
  await expect(page.getByLabel('Aporte / caixa livre inicial (R$)', { exact: true })).toHaveValue('61.000,00');
  expect(requests).toEqual([]);
});

test('invalid inputs suspend results, restore is usable, and mobile stays within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await setup(page);
  await page.getByLabel('Equipe sobre o líquido após parceiro (%)', { exact: true }).fill('101');
  await expect(page.getByRole('alert')).toContainText('resultados ficam suspensos');
  await expect(page.getByTestId('simulation-required')).toHaveCount(0);
  await page.getByLabel('Equipe sobre o líquido após parceiro (%)', { exact: true }).fill('50,5');
  await expect(page.getByTestId('simulation-required')).toBeVisible();
  await page.getByLabel('Urbanos · mês 1', { exact: true }).fill('1,5');
  await expect(page.getByLabel('Urbanos · mês 1', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Restaurar premissas', exact: true }).click();
  await expect(page.getByTestId('simulation-required')).toContainText('34.600,00');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: 'tmp/commission-simulator-mobile.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('export includes monthly composition and the broker cannot reach company simulator', async ({ page }) => {
  const requests = await setup(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar conferência CSV', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('eme-select-comissao-caixa-base.csv');
  const stream = await download.createReadStream();
  let csv = ''; for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain('Caixa antes de entradas');
  expect(csv).toContain('34600,00');
  expect(requests).toEqual([]);
  await page.screenshot({ path: 'tmp/commission-simulator-desktop.png', fullPage: true });
  await page.unroute('**/api/**');
  await setup(page, 'corretor');
  await expect(page.getByText('Esta área não está disponível para sua conta.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comissão boa. Caixa preparado.' })).toHaveCount(0);
});
