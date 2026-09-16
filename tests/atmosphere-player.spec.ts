import { expect, test, type Page } from '@playwright/test';

// Silent PCM data exercises the actual media element without shipping music or fixtures to the site.
function silentWav(seconds = 30) {
  const rate = 8000, size = seconds * rate * 2, wav = Buffer.alloc(44 + size);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + size, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(size, 40);
  return wav;
}
const tracks = [
  { id: 'first', title: 'Horizonte', artist: 'Áudio de teste', src: '/audio/first.wav' },
  { id: 'second', title: 'Brisa', artist: 'Áudio de teste', src: '/audio/second.wav' },
];
async function setup(page: Page, playlist = tracks) {
  await page.route('**/api/public/properties', route => route.fulfill({ json: { properties: [] } }));
  await page.route('**/audio/playlist.json', route => route.fulfill({ json: { tracks: playlist } }));
  await page.route('**/audio/*.wav', route => route.fulfill({ contentType: 'audio/wav', body: silentWav() }));
  await page.goto('/');
  await expect(page.locator('.site-header')).toBeVisible();
}

test('music keeps playing across closing controls, menus and public navigation; volume and track controls work', async ({ page }) => {
  let fileRequests = 0;
  page.on('request', r => { if (r.url().endsWith('.wav')) fileRequests++; });
  await setup(page);
  const audio = page.locator('.eme-atmosphere audio');
  const controls = page.getByRole('button', { name: 'Volume e playlist', exact: true });
  await expect(audio).toHaveCount(1);
  expect(fileRequests).toBe(0);
  await expect(audio).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: 'Reproduzir música', exact: true }).click();
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0.1);
  await controls.click();
  await page.getByRole('slider', { name: 'Volume da música' }).fill('22');
  await expect(audio).toHaveJSProperty('volume', 0.22);
  await page.getByRole('button', { name: 'Silenciar música' }).click();
  await expect(audio).toHaveJSProperty('muted', true);
  await page.getByRole('button', { name: 'Ativar som' }).click();
  await expect(audio).toHaveJSProperty('muted', false);
  await expect(audio).toHaveJSProperty('volume', 0.22);
  const element = await audio.elementHandle();
  await page.getByRole('button', { name: 'Fechar controles de música' }).click();
  await expect(controls).toBeFocused();
  await expect(audio).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect(audio).toHaveJSProperty('paused', false);
  await page.getByRole('link', { name: 'Explorar a coleção completa' }).click();
  await expect(page).toHaveURL(/colecao/);
  expect(await element!.evaluate(el => el.isConnected)).toBe(true);
  await expect(audio).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Próxima faixa', exact: true }).click();
  await expect(audio).toHaveAttribute('src', tracks[1].src);
  await expect(audio).toHaveJSProperty('paused', false);
  await controls.click();
  await page.getByRole('heading', { name: 'Brisa' }).waitFor();
  await page.getByRole('button', { name: 'Fechar controles de música' }).focus();
  await page.keyboard.press('Escape');
  await expect(audio).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Faixa anterior', exact: true }).click();
  await expect(audio).toHaveAttribute('src', tracks[0].src);
  await page.getByRole('button', { name: 'Pausar música' }).click();
  await expect(audio).toHaveJSProperty('paused', true);
  await page.getByRole('button', { name: 'Reproduzir música' }).click();
  await expect(audio).toHaveJSProperty('paused', false);
  await page.reload();
  await expect(audio).toHaveJSProperty('paused', true);
  await expect(audio).toHaveJSProperty('volume', 0.22);
});

test('empty playlist makes no Spotify requests and shows no inactive player', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', r => { if (/spotify|scdn|\.wav/.test(r.url())) requests.push(r.url()); });
  await setup(page, []);
  await expect(page.getByRole('group', { name: 'Música ambiente' })).toHaveCount(0);
  await expect(page.locator('iframe[src*="spotify"]')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('unavailable audio can be replaced with the next track; compact controls fit mobile', async ({ page }) => {
  await setup(page);
  await page.route('**/audio/first.wav', route => route.fulfill({ status: 404 }));
  await page.getByRole('button', { name: 'Reproduzir música' }).click();
  await expect(page.locator('.eme-atmosphere-error')).toContainText('Áudio indisponível');
  await page.getByRole('button', { name: 'Próxima faixa', exact: true }).click();
  await expect(page.locator('audio')).toHaveJSProperty('paused', false);
  for (const width of [1440, 1024, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole('button', { name: 'Volume e playlist', exact: true }).click();
    const panel = await page.locator('.eme-atmosphere-panel').boundingBox();
    expect(panel!.x).toBeGreaterThanOrEqual(0);
    expect(panel!.x + panel!.width).toBeLessThanOrEqual(width);
    expect(await page.locator('.site-header').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(width);
    if (width === 390 || width === 1440) await page.screenshot({ path: `test-results/atmosphere-${width}.png` });
    await page.getByRole('button', { name: 'Fechar controles de música' }).click();
    await expect(page.locator('audio')).toHaveJSProperty('paused', false);
  }
});

test('finishing audio advances to the next file without opening a panel', async ({ page }) => {
  await setup(page);
  await page.route('**/audio/first.wav', route => route.fulfill({ contentType: 'audio/wav', body: silentWav(2) }));
  await page.getByRole('button', { name: 'Reproduzir música' }).click();
  await expect(page.locator('audio')).toHaveAttribute('src', tracks[1].src, { timeout: 10000 });
  await expect.poll(() => page.locator('audio').evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0.1);
  await expect(page.locator('.eme-atmosphere-panel')).toHaveCount(0);
});
