import {test,expect} from '@playwright/test';
import {presentationLink,readPresentation} from '../src/presentation/config';
import {defaultScene} from '../shared/spatial-scene.mjs';

test('presentation snapshots include only display configuration and reject unknown assets',()=>{
 const url=presentationLink('G400 · Cliente',defaultScene(),'https://example.com');
 expect(readPresentation(new URL(url).hash).title).toBe('G400 · Cliente');
 expect(Object.keys(readPresentation(new URL(url).hash))).toEqual(['version','title','scene']);
 expect(()=>readPresentation('#broken')).toThrow();
 expect(()=>presentationLink('x',{...defaultScene(),assets:['https://evil.example/image','living']},'https://example.com')).toThrow();
});

test('clean showroom supports floor selection, plans, fullscreen, and keyboard recovery',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/apresentar/g400');
 await expect(page.getByRole('heading',{name:'G400 · Geraldo Andreola'})).toBeVisible();
 await expect(page.locator('.site-header,.site-footer,.development-intro')).toHaveCount(0);
 await page.getByRole('button',{name:'Entrar em tela cheia',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(true);
 await page.getByRole('button',{name:'Explorar 3º andar no cenário',exact:true}).click();
 await expect(page.getByRole('complementary',{name:'Andares e unidades'})).toBeVisible();
 await page.getByRole('button',{name:/301 · Tipo 1/}).click();
 await expect(page.locator('.sp-show')).toHaveAttribute('data-mode','gallery');
 await page.getByRole('button',{name:'Ampliar planta',exact:true}).click();
 await expect(page.locator('.sp-photo img')).toHaveCSS('width',/\d+px/);
 await page.getByRole('button',{name:'Ocultar controles',exact:true}).click();
 await expect(page.locator('.sp-dock')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Mostrar controles',exact:true})).toBeVisible();
 await page.keyboard.press('h');
 await expect(page.locator('.sp-dock')).toBeVisible();
 await page.getByRole('button',{name:'Reiniciar apresentação',exact:true}).click();
 await expect(page.locator('.sp-show')).toHaveAttribute('data-mode','building');
 await page.screenshot({path:info.outputPath('showroom-desktop.png')});
 await page.getByRole('button',{name:'Sair da tela cheia',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement))).toBe(false);
 expect(errors).toEqual([]);
});

test('client snapshot opens without portal and supports touch-sized controls and live walk',async({page},info)=>{
 test.setTimeout(90000);
 const url=presentationLink('G400 · Sala de apresentação',{...defaultScene(),mode:'tipo5'},'http://127.0.0.1:4190');
 await page.goto(new URL(url).pathname+new URL(url).hash);
 await expect(page.getByRole('button',{name:'Caminhar',exact:true})).toBeEnabled({timeout:45000});
 await page.getByRole('button',{name:'Caminhar',exact:true}).click();
 await expect(page.getByRole('group',{name:'Caminhar pelo apartamento'})).toBeVisible();
 await page.getByRole('button',{name:'Ambientes',exact:true}).click();
 await page.getByRole('button',{name:'Cozinha',exact:true}).click();
 await expect(page.getByTestId('g400-apartment-model')).toHaveAttribute('data-walking','true');
 await page.getByRole('button',{name:'Reiniciar apresentação',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Plantas',exact:true}).click();
 await expect(page.locator('.sp-photo img')).toBeVisible();
 await expect.poll(()=>page.locator('.sp-photo img').evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);
 await page.screenshot({path:info.outputPath('showroom-mobile.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const box=await page.getByRole('button',{name:'Mostrar controles',exact:true}).count();expect(box).toBe(0);
 await page.goto('/apresentar/cenario#invalid');
 await expect(page.getByRole('heading',{name:'Apresentação indisponível'})).toBeVisible();
});

test('touch showroom fills a 4K display and can recover after fullscreen is denied',async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:3840,height:2160},hasTouch:true,deviceScaleFactor:1});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:4190/apresentar/g400');
 await page.getByRole('button',{name:'Explorar 2º andar no cenário',exact:true}).tap();
 await expect(page.getByRole('button',{name:/201 · Tipo 1/})).toBeVisible();
 await page.getByRole('button',{name:'Fechar painel',exact:true}).tap();
 await page.getByRole('button',{name:'Ocultar controles',exact:true}).tap();
 await expect(page.locator('.sp-top')).toHaveCount(0);
 await page.getByRole('button',{name:'Mostrar controles',exact:true}).tap();
 const target=await page.getByRole('button',{name:'Entrar em tela cheia',exact:true}).boundingBox();expect(target!.height).toBeGreaterThanOrEqual(64);
 await page.evaluate(()=>{HTMLElement.prototype.requestFullscreen=async()=>{throw Error('Unsupported');};});
 await page.getByRole('button',{name:'Entrar em tela cheia',exact:true}).tap();
 await expect(page.getByRole('status')).toContainText('já ocupa a janela');
 await page.screenshot({path:info.outputPath('showroom-4k.png')});
 await context.close();
});
