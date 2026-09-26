import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import { g400UnitsOnFloor } from '../src/developments/g400';
const route='/#/empreendimentos/g400';
test.beforeEach(async({page})=>{
  await page.route('**/api/public/properties',r=>r.fulfill({json:{properties:[]}}));
  await page.route('**/api/public/people',r=>r.fulfill({json:{people:[]}}));
});
test('G400 floor mapping follows original sheets, including the sixth floor exceptions',()=>{
  expect(g400UnitsOnFloor(1).map(item=>item.unit)).toEqual(['101','102','103','104','105']);
  expect(g400UnitsOnFloor(6).map(item=>item.unit)).toEqual(['601','602','603']);
  expect(g400UnitsOnFloor(7).map(item=>item.unit)).toEqual(['703','704','705']);
  expect(g400UnitsOnFloor(8)).toEqual([]);
});
test('floor selection, original galleries, readable plans, lighting and contact context',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(route);
  await expect(page).toHaveTitle(/G400.*Yclodema/);
  await expect(page.getByRole('heading',{level:1})).toContainText('G400');
  await page.locator('.g400-view-layer[data-active=true] .development-image-world>img').evaluate((img:HTMLImageElement)=>img.decode());
  await page.screenshot({path:'test-results/g400-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'6º andar',exact:true}).click();
  await expect(page.getByTestId('g400-floor-band')).toHaveAttribute('data-floor','6');
  await expect(page.getByLabel('Unidades no projeto').getByRole('button')).toHaveCount(3);
  await expect(page.getByText('Disponibilidade a confirmar',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Ver planta da unidade 602',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByAltText('Tipo 2 · 209,30 m² privativos · 3 suítes')).toBeVisible();
  expect(decodeURIComponent(await dialog.getByRole('link',{name:'Conversar sobre o G400'}).getAttribute('href')||'')).toContain('unidade 602');
  await page.getByRole('button',{name:'Ampliar para ler os detalhes'}).click();
  await expect(dialog.locator('.g400-plan-enlarged')).toBeVisible();
  await page.getByRole('button',{name:'Ajustar planta à janela'}).click();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByAltText('Tipo 3 · 215,90 m² privativos · 3 suítes')).toBeVisible();
  expect(decodeURIComponent(await dialog.getByRole('link',{name:'Conversar sobre o G400'}).getAttribute('href')||'')).not.toContain('unidade 602');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Ver planta da unidade 602'})).toBeFocused();
  await page.getByRole('button',{name:'7º andar e coberturas',exact:true}).click();
  await page.getByRole('button',{name:'Ver planta da unidade 704'}).click();
  await expect(dialog.getByAltText('Triplex 1 · 444,56 m² privativos · 4 suítes')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Rooftop',exact:true}).click();
  await expect(dialog.getByAltText('Rooftop lounge')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Fachadas',exact:true}).click();
  await expect(dialog.getByAltText('Vista BR–Centro · Avenida Moreira Paz')).toBeVisible();
  for(let i=0;i<4;i++)await dialog.getByRole('button',{name:'Próxima imagem',exact:true}).click();
  await expect(dialog.getByAltText('Vista · Rua João Borges Pinto')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Noite',exact:true}).click();
  await expect(page.getByTestId('g400-stage')).toHaveClass(/--night/);
  await page.screenshot({path:'test-results/g400-night.png',fullPage:true});
  expect(errors).toEqual([]);
});
test('G400 mobile navigation, plan dialog and gallery have no horizontal overflow',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [820,390,320]){
    await page.setViewportSize({width,height:844});
    await page.goto(route);
    await expect(page.getByRole('heading',{level:1})).toContainText('G400');
    await page.locator('.g400-view-layer[data-active=true] .development-image-world>img').evaluate((img:HTMLImageElement)=>img.decode());
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/g400-mobile-${width}.png`,fullPage:true});
    await page.getByRole('button',{name:'Conhecer os interiores',exact:true}).click();
    await expect(page.getByRole('dialog').getByAltText('Salão de festas privativo · Triplex')).toBeVisible();
    await page.getByRole('button',{name:'Próxima imagem',exact:true}).click();
    await expect(page.getByRole('dialog').getByAltText('Suíte principal · Triplex 1')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Recolher andares e plantas'}).click();
    await expect(page.getByLabel('Andares e plantas do G400')).toHaveCount(0);
    await page.getByRole('button',{name:'Explorar andares e plantas'}).click();
    await expect(page.getByLabel('Andares e plantas do G400')).toBeVisible();
  }
});
test('G400 3D camera, floor, lighting and graceful WebGL fallback',async({page})=>{
  test.setTimeout(90000);
  await page.goto(route);
  await page.getByRole('button',{name:'Explorar em 3D',exact:true}).click();
  const model=page.getByTestId('g400-model');
  await expect(model).toHaveAttribute('data-camera',/,/,{timeout:45000});
  const camera=await model.getAttribute('data-camera');
  await model.locator('canvas').focus();await page.keyboard.press('ArrowRight');
  await expect(model).not.toHaveAttribute('data-camera',camera!);
  await page.getByRole('button',{name:'4º andar',exact:true}).click();
  await expect(model).toHaveAttribute('data-floor','4');
  await page.getByRole('button',{name:'Noite',exact:true}).click();
  await expect(model).toHaveAttribute('data-lighting','night');
  await page.screenshot({path:'test-results/g400-model.png',fullPage:true});
  await model.locator('canvas').dispatchEvent('webglcontextlost');
  await page.getByRole('button',{name:'Voltar ao cenário'}).click();
  await expect(page.locator('.g400-view-layer[data-active=true] .development-image-world')).toBeVisible();
});
test('G400 can be discovered from home and the official navigation',async({page})=>{
  await page.goto('/');
  await page.getByRole('button',{name:'Explorar',exact:true}).click();
  await page.getByRole('link',{name:'G400 · Yclodema',exact:true}).click();
  await expect(page).toHaveURL(/empreendimentos\/g400/);
  await page.getByRole('link',{name:'Voltar à coleção',exact:true}).click();
  await page.getByRole('link',{name:'Explorar G400',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toContainText('G400');
});

test('G400 facade markers stay on the raster at desktop/mobile sizes and zoom',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(route);
  await page.locator('.g400-view-layer[data-active=true] .development-image-world>img').evaluate((img:HTMLImageElement)=>img.decode());
  await page.getByRole('button',{name:'6º andar',exact:true}).click();
  for(const width of [1920,1440,820,390]){
    await page.setViewportSize({width,height:1000});
    await page.getByRole('button',{name:'Aproximar cenário',exact:true}).click();
    const error=await page.evaluate(()=>{
      const img=document.querySelector<HTMLImageElement>('.g400-view-layer[data-active=true] .development-image-world>img')!;
      const svg=document.querySelector<SVGSVGElement>('.g400-scene-overlay')!;
      const bounds=img.getBoundingClientRect(),scale=Math.max(bounds.width/img.naturalWidth,bounds.height/img.naturalHeight);
      // The corner of the sixth balcony in the source image.
      const point=svg.createSVGPoint();point.x=744;point.y=317;
      const actual=point.matrixTransform(svg.getScreenCTM()!);
      return Math.hypot(actual.x-(bounds.x+(bounds.width-img.naturalWidth*scale)/2+744*scale),actual.y-(bounds.y+(bounds.height-img.naturalHeight*scale)/2+317*scale));
    });
    expect(error).toBeLessThan(.1);
    await expect(page.getByTestId('g400-floor-band')).toHaveAttribute('data-floor','6');
    await page.getByRole('button',{name:'Restaurar visão geral',exact:true}).click();
    await page.getByRole('button',{name:'6º andar',exact:true}).click();
  }
  await page.getByRole('button',{name:'Noite',exact:true}).click();
  await expect(page.locator('.g400-view-layer[data-active=true]').getByTestId('g400-window-lights')).toHaveCSS('opacity','1');
  await page.getByRole('button',{name:'Dia',exact:true}).click();
  await expect(page.locator('.g400-view-layer[data-active=true]').getByTestId('g400-window-lights')).toHaveCSS('opacity','0');
});

test('mobile G400 3D keeps framing and lights only selected rooms at night',async({page})=>{
  test.setTimeout(60000);
  await page.setViewportSize({width:390,height:844});await page.goto(route);
  await page.getByRole('button',{name:'Explorar em 3D',exact:true}).click();
  const model=page.getByTestId('g400-model');await expect(model).toHaveAttribute('data-camera',/,/,{timeout:45000});
  await expect(model).toHaveAttribute('data-lit-windows','0');
  await page.getByRole('button',{name:'Noite',exact:true}).click();await expect(model).toHaveAttribute('data-lighting','night');
  const total=Number(await model.getAttribute('data-windows')),lit=Number(await model.getAttribute('data-lit-windows'));
  expect(lit).toBeGreaterThan(0);expect(lit).toBeLessThan(total*.6);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await model.screenshot({path:'test-results/g400-model-mobile-night.png'});
  await page.getByRole('button',{name:'Cenário',exact:true}).click();await expect(model).toHaveCount(0);
  await page.getByRole('button',{name:'Explorar em 3D',exact:true}).click();await expect(model).toHaveAttribute('data-camera',/,/,{timeout:45000});
});

test('G400 crosses the front between both lateral views and retains floor and lighting',async({page})=>{
  await page.goto(route);
  await page.getByRole('button',{name:'5º andar',exact:true}).click();
  await page.getByRole('button',{name:'Entardecer',exact:true}).click();
  await page.evaluate(()=>{const scene=document.querySelector('[data-testid="g400-scene"]')!;const history:string[]=[];(window as unknown as {g400Views:string[]}).g400Views=history;new MutationObserver(()=>{const view=scene.getAttribute('data-view')!;if(history.at(-1)!==view)history.push(view);}).observe(scene,{attributes:true,attributeFilter:['data-view']});});
  await page.getByRole('button',{name:'Ver lateral 2',exact:true}).click();
  const scene=page.getByTestId('g400-scene');
  await expect(scene).toHaveAttribute('data-view','right');await expect(scene).toHaveAttribute('data-moving','false');
  expect(await page.evaluate(()=>(window as unknown as {g400Views:string[]}).g400Views)).toEqual(['front','right']);
  await expect(page.getByRole('button',{name:'5º andar',exact:true})).toHaveAttribute('aria-pressed','true');
  const active=page.locator('.g400-view-layer[data-active=true]');
  await expect(active.getByTestId('g400-floor-band')).toHaveAttribute('data-floor','5');
  await expect(active.getByTestId('g400-window-lights')).toHaveCSS('opacity','0.74');
  await page.getByRole('button',{name:'Ver lateral 1',exact:true}).click();await expect(scene).toHaveAttribute('data-view','left');await expect(scene).toHaveAttribute('data-moving','false');
  expect(await page.evaluate(()=>(window as unknown as {g400Views:string[]}).g400Views)).toEqual(['front','right','front','left']);
  // A new request while the movement is running must not strand the scene inert.
  await page.getByRole('button',{name:'Ver lateral 2',exact:true}).click();await expect(scene).toHaveAttribute('data-moving','true');
  await page.getByRole('button',{name:'Ver lateral 1',exact:true}).click();await expect(scene).toHaveAttribute('data-moving','false');
  await expect(page.getByRole('button',{name:'Explorar 2º andar no cenário'})).toBeVisible();
});

test('hover and floor selection work on both ends of every G400 facade with visible night panes',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(route);
  for(const {view,label,points} of [
    {view:'left',label:'Ver lateral 1',points:[[780,510],[1078,567]]},
    {view:'front',label:'Ver frente',points:[[385,1030],[1180,1030]]},
    {view:'right',label:'Ver lateral 2',points:[[289,1080],[710,1045]]},
  ]){
    await page.getByRole('button',{name:label,exact:true}).click();await expect(page.getByTestId('g400-scene')).toHaveAttribute('data-view',view);await expect(page.getByTestId('g400-scene')).toHaveAttribute('data-moving','false');
    const active=page.locator('.g400-view-layer[data-active=true]');
    for(const [x,y] of points){
      const p=await active.locator('.development-floor-hit').first().evaluate((node:SVGGraphicsElement,coords)=>{const svg=node.ownerSVGElement!,p=svg.createSVGPoint();p.x=coords[0];p.y=coords[1];const result=p.matrixTransform(node.getScreenCTM()!);return {x:result.x,y:result.y};},[x,y]);
      await page.mouse.move(p.x,p.y);await expect(active.getByTestId('g400-floor-band')).toHaveAttribute('data-floor','2');
      await page.mouse.click(p.x,p.y);await expect(page.getByRole('button',{name:'2º andar',exact:true})).toHaveAttribute('aria-pressed','true');
    }
    await page.getByRole('button',{name:'Noite',exact:true}).click();await expect(active.getByTestId('g400-window-lights')).toHaveCSS('opacity','1');
    expect(await active.getByTestId('g400-window-lights').locator('polygon').count()).toBeGreaterThan(30);
    await page.screenshot({path:`test-results/g400-facade-${view}-night.png`});
    await page.getByRole('button',{name:'Dia',exact:true}).click();await expect(active.getByTestId('g400-window-lights')).toHaveCSS('opacity','0');
  }
});

test('G400 view changes remain usable on mobile with reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto(route);
  await page.getByRole('button',{name:'Ver lateral 2',exact:true}).click();await expect(page.getByTestId('g400-scene')).toHaveAttribute('data-view','right');await expect(page.getByTestId('g400-scene')).toHaveAttribute('data-moving','false');
  await page.getByRole('button',{name:'3º andar',exact:true}).click();await expect(page.getByTestId('g400-floor-band')).toHaveAttribute('data-floor','3');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Ver frente',exact:true}).click();await expect(page.getByTestId('g400-scene')).toHaveAttribute('data-view','front');
  await page.getByTestId('g400-stage').screenshot({path:'test-results/g400-front-mobile.png'});
});

test('G400 3D paints a full floor surface and hover restores the chosen floor',async({page})=>{
  test.setTimeout(60000);
  await page.setViewportSize({width:1440,height:1000});await page.goto(route);
  await page.getByRole('button',{name:'Explorar em 3D',exact:true}).click();
  const model=page.getByTestId('g400-model'),canvas=model.locator('canvas');
  await expect(model).toHaveAttribute('data-camera',/,/,{timeout:45000});
  await page.mouse.move(10,10);
  const before=await sharp(await canvas.screenshot()).removeAlpha().raw().toBuffer();
  await page.getByRole('button',{name:'2º andar',exact:true}).click();
  await expect(model).toHaveAttribute('data-highlight-floor','2');
  const {data:after,info}=await sharp(await canvas.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let changed=0;const rows=new Set<number>();
  for(let i=0;i<before.length;i+=3){
    if(Math.abs(after[i]-before[i])+Math.abs(after[i+1]-before[i+1])+Math.abs(after[i+2]-before[i+2])>25){changed++;rows.add(Math.floor(i/3/info.width));}
  }
  // A slab-level outline does not paint thousands of interior facade pixels.
  expect(changed).toBeGreaterThan(3000);expect(rows.size).toBeGreaterThan(20);
  const bounds=(await canvas.boundingBox())!;let hovered=false;
  for(const fy of [.32,.4,.48,.56]){
    await page.mouse.move(bounds.x+bounds.width*.55,bounds.y+bounds.height*fy);
    const floor=await model.getAttribute('data-highlight-floor');
    if(floor&&floor!=='2'){hovered=true;break;}
  }
  expect(hovered).toBe(true);await expect(model).toHaveAttribute('data-floor','2');
  await page.mouse.move(10,10);await expect(model).toHaveAttribute('data-highlight-floor','2');
  await page.getByRole('button',{name:'7º andar e coberturas',exact:true}).click();
  await expect(model).toHaveAttribute('data-highlight-floor','7');
  await canvas.screenshot({path:'test-results/g400-model-crown.png'});
});
