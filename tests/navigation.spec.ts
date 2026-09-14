import { test, expect } from '@playwright/test';

test('navega pelos ambientes e abre a visita pelo cenário', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu próximo lugar.');
  for (const [name, title] of [['Litoral', 'Um novo ritmo.'], ['Serra', 'Seu refúgio.'], ['Urbano', 'Perto de tudo.']]) {
    await page.getByRole('navigation', { name: 'Ambientes', exact: true }).getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
    await expect(page.getByLabel('Ambiente', { exact: true })).toHaveValue(name.toLowerCase());
  }
  await page.getByRole('button', { name: 'Apartamentos', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Imóvel selecionado' })).toContainText('Apartamento com varanda');
  await page.getByRole('link', { name: 'Explorar imóvel', exact: true }).click();
  await expect(page).toHaveURL(/#\/visita\/urbano-01$/);
  await page.getByRole('button', { name: 'Varanda', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Varanda', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: 'Detalhes e curadoria', exact: true }).click();
  await expect(page).toHaveURL(/#\/imovel\/urbano-01$/);
  await expect(page.getByRole('heading', { name: 'Apartamento com varanda', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('busca com filtros, estado vazio, favoritos persistentes e privacidade', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Alugar', exact: true }).click();
  await page.getByLabel('Tipo de imóvel', { exact: true }).selectOption('Compacto');
  await page.getByRole('button', { name: 'Buscar imóveis', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Compacto junto à praça', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Salvar Compacto junto à praça nos favoritos', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Meus favoritos, 1 imóveis', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Compacto junto à praça', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByLabel('O que você procura?', { exact: true }).fill('castelo lunar');
  await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await expect(page.getByRole('heading', { level: 2 })).toContainText('Vamos abrir');
  await page.getByRole('button', { name: 'Privacidade', exact: true }).click();
  await page.getByRole('button', { name: 'Apagar meus favoritos', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Meus favoritos, 0 imóveis', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('eme-select:favorites') || '[]'))).toEqual([]);
});

test('documentação não declara verificações inexistentes e modal preserva foco', async ({ page }) => {
  await page.goto('/#/imovel/urbano-01');
  const trigger = page.getByRole('button', { name: 'Ver documentação e verificações', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Documentação e verificações', exact: true });
  await expect(dialog).toContainText('Não há certidões, matrícula ou parecer jurídico vinculado');
  await expect(dialog.getByText('A verificar', { exact: true })).toHaveCount(6);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBeTruthy();
  }
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: /Planta do imóvel/ }).click();
  await expect(page.getByRole('dialog')).toContainText('ainda não possui uma planta técnica');
});

test('navegação móvel, telas estreitas e rotas desconhecidas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menu móvel' }).getByRole('link', { name: 'Para proprietários', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Seu imóvel.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.goto('/#/imovel/urbano-01');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Agendar visita', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const bounds = await dialog.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  await page.keyboard.press('Escape');
  await page.goto('/#/imovel/inexistente');
  await expect(page.getByText('Esta página não está disponível.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar aos ambientes', exact: true }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test('movimento reduzido mantém conteúdo e apresentação opcional navegáveis', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apartamentos', exact: true })).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'A essência da EME', exact: true }).click();
  const frame = page.frameLocator('.motion-frame');
  await expect(frame.locator('body')).toBeVisible();
  await expect(frame.locator('iframe')).toHaveCount(1);
  await page.getByRole('button', { name: 'Fechar janela', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
