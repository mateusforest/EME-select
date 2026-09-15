import {test, expect, type Page} from '@playwright/test';

const property = {
  id:'gallery-fixture',title:'Apartamento de teste do percurso',environment:'litoral',location:'Balneário Camboriú · SC',
  type:'Apartamento',operation:'comprar',price:3990000,area:116,bedrooms:3,suites:3,parking:2,
  tags:['Vista para o mar'],reasons:['Percurso de teste'],description:'Imóvel fictício para verificar a navegação fotográfica.',
  image:'/__gallery/1.svg',isIllustrative:false,
  images:[{url:'/__gallery/1.svg',caption:'Entrada da sala',room:'Área social'},
    {url:'/__gallery/2.svg',caption:'Jantar junto ao mar',room:'Área social'},
    {url:'/__gallery/3.svg',caption:'Suíte de teste',room:'Área íntima'}],
};
const photograph = (n: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="750"><rect width="1000" height="750" fill="${n==='1'?'#b9ac91':n==='2'?'#597f89':'#776c5c'}"/><rect x="100" y="100" width="800" height="550" fill="#e9e4d8"/><text x="500" y="380" text-anchor="middle" font-size="60">Fotografia ${n}</text></svg>`;
async function fixture(page: Page, beforeNavigation?:()=>Promise<void>) {
  await page.route('**/api/public/properties', route => route.fulfill({json:{properties:[property]}}));
  await page.route('**/__gallery/*.svg', route => route.fulfill({contentType:'image/svg+xml',body:photograph(route.request().url().match(/(\d)\.svg/)![1])}));
  await beforeNavigation?.();
  await page.goto('/#/imovel/gallery-fixture');
  await expect(page.locator('.pg-photo-current')).toBeVisible();
  await expect(page.locator('.pg-loading')).toHaveCount(0);
}

test('percurso abre a tela inteira, navega por ambientes e restaura o foco', async ({page}) => {
  const errors: string[]=[]; page.on('pageerror',error=>errors.push(error.message));
  await fixture(page);
  await expect(page.getByRole('button',{name:'Reproduzir apresentação'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Pausar apresentação'})).toHaveCount(0);
  await page.getByRole('button',{name:'Próxima foto',exact:true}).click();
  await expect(page.locator('.pg-caption')).toContainText('Jantar junto ao mar');
  const trigger=page.getByRole('button',{name:'Ampliar',exact:true}); await trigger.click();
  const modal=page.getByRole('dialog'); await expect(modal).toBeVisible();
  const dimensions=await modal.boundingBox(); expect(dimensions).toMatchObject({x:0,y:0,width:1440,height:1000});
  expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
  await expect(modal.getByRole('button',{name:'Fechar galeria'})).toBeFocused();
  await modal.getByRole('button',{name:/Área íntima/}).click();
  await expect(modal.locator('.pg-caption')).toContainText('Suíte de teste');
  await modal.getByRole('button',{name:'Foto inteira',exact:true}).click();
  await expect(modal.locator('.pg-photo-current')).toHaveCSS('object-fit','contain');
  await page.keyboard.press('Home');
  await expect(modal.locator('.pg-caption')).toContainText('Entrada da sala');
  await page.keyboard.press('Escape'); await expect(modal).not.toBeVisible(); await expect(trigger).toBeFocused();
  expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
  expect(errors).toEqual([]);
});

test('falha da próxima foto mantém a anterior e permite tentar novamente', async ({page}) => {
  let release!:()=>void; const gate=new Promise<void>(resolve=>{release=resolve;});
  await fixture(page,()=>page.route('**/__gallery/3.svg',async route=>{await gate;await route.fulfill({status:503,body:'unavailable'});}));
  try {
    await page.getByRole('button',{name:/Ver foto 3:/}).click();
    await expect(page.locator('.pg-loading')).toContainText('Preparando próxima fotografia');
    await expect(page.locator('.pg-photo-current')).toHaveAttribute('src','/__gallery/1.svg');
    await expect(page.locator('.pg-photo-current')).toHaveCSS('opacity','1');
    release(); await expect(page.getByRole('alert')).toContainText('A imagem anterior foi mantida');
    await expect(page.locator('.pg-caption')).toContainText('Entrada da sala');
    await page.unroute('**/__gallery/3.svg');
    await page.getByRole('alert').getByRole('button',{name:'Tentar novamente'}).click();
    await expect(page.locator('.pg-caption')).toContainText('Suíte de teste');
    await expect(page.getByRole('alert')).toHaveCount(0);
  } finally {release();}
});

test('celular aceita arraste, mantém controles na tela e respeita movimento reduzido', async ({page}) => {
  await page.setViewportSize({width:390,height:844}); await page.emulateMedia({reducedMotion:'reduce'}); await fixture(page);
  await expect(page.getByRole('button',{name:'Reproduzir apresentação'})).toHaveCount(0);
  await page.getByRole('button',{name:'Ampliar',exact:true}).click(); const modal=page.getByRole('dialog');
  expect(await modal.boundingBox()).toMatchObject({x:0,y:0,width:390,height:844});
  await page.mouse.move(300,380); await page.mouse.down(); await page.mouse.move(90,382,{steps:8}); await page.mouse.up();
  await expect(modal.locator('.pg-caption')).toContainText('Jantar junto ao mar');
  await expect(modal.locator('.pg-photo-incoming')).toHaveCount(0);
  for(const button of [modal.getByRole('button',{name:'Próxima foto',exact:true}),modal.getByRole('button',{name:'Fechar galeria'}),modal.getByRole('button',{name:'Foto inteira',exact:true})]) {
    const box=await button.boundingBox(); expect(box).not.toBeNull(); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x+box!.width).toBeLessThanOrEqual(390); expect(box!.y+box!.height).toBeLessThanOrEqual(844);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.keyboard.press('Escape'); await expect(modal).not.toBeVisible();
});
