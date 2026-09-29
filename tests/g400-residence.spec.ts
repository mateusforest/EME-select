import { test,expect } from '@playwright/test';
import { g400Residences } from '../src/developments/g400Residences';
import { g400Plans } from '../src/developments/g400';
const route='/#/empreendimentos/g400';
test.beforeEach(async({page})=>{
  await page.route('**/api/public/**',r=>r.fulfill({json:{properties:[],people:[]}}));
  await page.emulateMedia({reducedMotion:'reduce'});
});

test('each documented unit type exposes its own levels and rooms; returning preserves the floor',async({page})=>{
  await page.goto(route);
  for(const plan of g400Plans){
    const unit=plan.units[0];
    await page.getByRole('button',{name:unit[0]==='7'?'7º andar e coberturas':`${unit[0]}º andar`,exact:true}).click();
    const entry=page.getByRole('button',{name:`Explorar unidade ${unit}`,exact:true});await entry.click();
    const dialog=page.getByRole('dialog');
    await dialog.getByRole('button',{name:'Planta interativa',exact:true}).click();
    await expect(dialog.getByRole('heading',{name:`G400 · Unidade ${unit}`})).toBeVisible();
    for(const level of g400Residences[plan.id].levels){
      if(g400Residences[plan.id].levels.length>1)await dialog.getByRole('group',{name:'Níveis da unidade'}).getByRole('button',{name:level.name,exact:true}).click();
      await expect(dialog.locator('.residence-room-pin')).toHaveCount(level.rooms.length);
      const last=level.rooms.at(-1)!;await dialog.getByRole('button',{name:`Explorar ${last.name}`,exact:true}).click();
      await expect(dialog.locator('.residence-room-bar strong')).toHaveText(last.name);
      await expect(dialog.getByRole('navigation',{name:'Ambientes da unidade'}).getByRole('button',{name:last.name})).toHaveAttribute('aria-pressed','true');
    }
    expect(decodeURIComponent(await dialog.getByRole('link',{name:'Conversar sobre esta unidade'}).getAttribute('href')||'')).toContain(`unidade ${unit}`);
    if(plan.id!=='tipo-5')await expect(dialog.getByRole('button',{name:'Visita 3D'})).toHaveCount(0);
    await page.keyboard.press('Escape');await expect(entry).toBeFocused();
  }
});

test('plan hotspots track source pixels at desktop and mobile widths, including roof levels',async({page})=>{
  await page.goto(route);
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});
    for(const unit of ['305','704']){
      await page.getByRole('button',{name:unit[0]==='7'?'7º andar e coberturas':'3º andar',exact:true}).click();
      await page.getByRole('button',{name:`Explorar unidade ${unit}`,exact:true}).click();
      const dialog=page.getByRole('dialog');
      await dialog.getByRole('button',{name:'Planta interativa',exact:true}).click();
      const plan=g400Plans.find(p=>p.units.includes(unit))!;
      for(const level of g400Residences[plan.id].levels){
        if(unit==='704')await dialog.getByRole('button',{name:level.name,exact:true}).click();
        const errors=await dialog.locator('.residence-plan-canvas').evaluate((el,rooms)=>{
          const svg=el.querySelector('svg')!,matrix=svg.getScreenCTM()!;
          return rooms.map((room,i)=>{const point=svg.createSVGPoint();point.x=room.x;point.y=room.y;const transformed=point.matrixTransform(matrix);const r=el.querySelectorAll('button')[i].getBoundingClientRect();return Math.hypot(r.x+r.width/2-transformed.x,r.y+r.height/2-transformed.y);});
        },level.rooms);
        expect(Math.max(...errors)).toBeLessThan(1);
      }
      expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
      if(width===390)await dialog.screenshot({path:`test-results/g400-residence-${unit}-mobile.png`});
      await page.keyboard.press('Escape');
    }
  }
});

test('pilot opens from its unit, responds to room, camera and light controls, and recovers from context loss',async({page})=>{
  test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(route);await page.getByRole('button',{name:'Explorar unidade 305',exact:true}).click();
  const dialog=page.getByRole('dialog');
  const model=page.getByTestId('g400-apartment-model');await expect(model).toHaveAttribute('data-view','overview',{timeout:45000});
  const canvas=model.locator('canvas'),camera=await model.getAttribute('data-camera');
  await canvas.focus();await page.keyboard.press('ArrowLeft');await expect(model).not.toHaveAttribute('data-camera',camera!);
  await dialog.getByRole('button',{name:'Dentro do ambiente',exact:true}).click();await expect(model).toHaveAttribute('data-view','inside');
  await dialog.getByRole('navigation',{name:'Ambientes da unidade'}).getByRole('button',{name:'Suíte 2'}).click();await expect(model).toHaveAttribute('data-room','suite-2');
  await expect(dialog.locator('.residence-room-bar strong')).toHaveText('Suíte 2');
  await dialog.getByLabel('Luz do ambiente').fill('20');await expect(model).toHaveAttribute('data-hour','20');
  await dialog.screenshot({path:'test-results/g400-residence-night.png'});
  await canvas.dispatchEvent('webglcontextlost');await expect(dialog.getByText('Continue pela planta.')).toBeVisible();
  await dialog.getByRole('button',{name:'Explorar a planta',exact:true}).click();await expect(model).toHaveCount(0);
  await dialog.getByRole('button',{name:'Visita 3D Piloto'}).click();await expect(model).toHaveAttribute('data-view','inside',{timeout:45000});
  await page.keyboard.press('Escape');await expect(model).toHaveCount(0);expect(errors).toEqual([]);
});

test('mobile pilot keeps room controls visible and does not overflow the dialog',async({page})=>{
  test.setTimeout(60000);await page.setViewportSize({width:390,height:844});await page.goto(route);
  await page.getByRole('button',{name:'Visitar um apartamento'}).click();
  const dialog=page.getByRole('dialog'),model=page.getByTestId('g400-apartment-model');
  await expect(dialog.getByRole('heading',{name:'G400 · Unidade 305'})).toBeVisible();
  await expect(model).toHaveAttribute('data-view','overview',{timeout:45000});
  await dialog.getByRole('button',{name:'Dentro do ambiente',exact:true}).click();
  await dialog.getByRole('button',{name:'Próximo ambiente',exact:true}).click();await expect(model).toHaveAttribute('data-room','jantar');
  expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await dialog.screenshot({path:'test-results/g400-residence-mobile-3d.png'});
});
