import {test,expect} from '@playwright/test';
import {canWalk,clearWalk,nearestWalk,walkRoute,type PlanPoint} from '../src/developments/tipo5Navigation';
import {tipo5Stations} from '../src/developments/g400Residences';
const route='/#/empreendimentos/g400';
test('every room has a continuous route through free space and suite doors',()=>{
  for(const a of Object.values(tipo5Stations))for(const b of Object.values(tipo5Stations)){
    const path=walkRoute(a.eye,b.eye);expect(path.length).toBeGreaterThan(1);
    for(let i=1;i<path.length;i++){expect(clearWalk(path[i-1],path[i])).toBe(true);expect(canWalk(path[i])).toBe(true);}
  }
  expect(canWalk([940,353])).toBe(false); // sofa
  expect(canWalk([1155,440])).toBe(false); // solid shared wall
  const suitePath=walkRoute(tipo5Stations.living.eye,tipo5Stations['suite-1'].eye);
  expect(suitePath.some(([x,y])=>x>=1345&&y>=500)).toBe(true);
  expect(nearestWalk([1900,100],50)).toBeNull();
});
test.beforeEach(async({page})=>{await page.route('**/api/public/**',r=>r.fulfill({json:{properties:[],people:[]}}));});

test('walking follows a continuous route, can be interrupted, and floor/furniture clicks move the visitor',async({page})=>{
  test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(route);await page.getByRole('button',{name:'Explorar unidade 305',exact:true}).click();
  const model=page.getByTestId('g400-apartment-model'),dialog=page.getByRole('dialog'),nav=dialog.getByRole('navigation',{name:'Ambientes da unidade'});
  await dialog.getByRole('button',{name:'Dentro do ambiente',exact:true}).click();
  await expect.poll(async()=>Number((await model.getAttribute('data-camera'))!.split(',')[1])).toBe(1.6);
  const before=await model.getAttribute('data-camera');await nav.getByRole('button',{name:'Cozinha'}).click();
  await expect(model).toHaveAttribute('data-walking','true');await expect(model).not.toHaveAttribute('data-camera',before!);
  const samples:PlanPoint[]=[];for(let i=0;i<8;i++){samples.push((await model.getAttribute('data-position'))!.split(',').map(Number) as PlanPoint);await page.waitForTimeout(100);}
  expect(samples.every(canWalk)).toBe(true);expect(new Set(samples.map(p=>p.join(','))).size).toBeGreaterThan(4);
  for(let i=1;i<samples.length;i++)expect(Math.hypot(samples[i][0]-samples[i-1][0],samples[i][1]-samples[i-1][1])*.014).toBeLessThan(.65);
  await dialog.getByRole('button',{name:'Parar caminhada'}).click();await expect(model).toHaveAttribute('data-walking','false');
  const stopped=await model.getAttribute('data-camera');await page.waitForTimeout(200);await expect(model).toHaveAttribute('data-camera',stopped!);
  // A new destination during a walk replaces the old route without a teleport.
  await nav.getByRole('button',{name:'Suíte 2'}).click();await expect(model).toHaveAttribute('data-walking','true');
  await nav.getByRole('button',{name:'Living',exact:false}).click();await expect(model).toHaveAttribute('data-walking','false',{timeout:20000});
  await dialog.getByRole('button',{name:'Restaurar câmera do apartamento'}).click();await page.waitForTimeout(1200);
  const canvas=model.locator('canvas'),b=(await canvas.boundingBox())!;
  await page.mouse.click(b.x+b.width*.26,b.y+b.height*.63);
  await expect(model).toHaveAttribute('data-walking','true');await expect(model).toHaveAttribute('data-walking','false',{timeout:15000});
  await expect(model).toHaveAttribute('data-navigable','true');
  const atSofa=(await model.getAttribute('data-position'))!.split(',').map(Number);expect(Math.hypot(atSofa[0]-tipo5Stations.living.eye[0],atSofa[1]-tipo5Stations.living.eye[1])).toBeGreaterThan(15);
  // Looking around must not change position; walking into furniture must stop at its boundary.
  const position=await model.getAttribute('data-position'),heading=await model.getAttribute('data-heading');
  await page.mouse.move(b.x+b.width*.5,b.y+b.height*.5);await page.mouse.down();await page.mouse.move(b.x+b.width*.68,b.y+b.height*.53,{steps:8});await page.mouse.up();
  await expect(model).toHaveAttribute('data-position',position!);await expect(model).not.toHaveAttribute('data-heading',heading!);
  await canvas.focus();await page.keyboard.down('w');await page.waitForTimeout(1500);await page.keyboard.up('w');await expect(model).toHaveAttribute('data-navigable','true');
  await canvas.dispatchEvent('webglcontextlost');await expect(dialog.getByText('Continue pela planta.')).toBeVisible();expect(errors).toEqual([]);
});

test('touch controls move only while held, and reduced motion skips camera travel',async({page})=>{
  test.setTimeout(60000);await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto(route);
  await page.getByRole('button',{name:'Visitar um apartamento'}).click();const model=page.getByTestId('g400-apartment-model');
  await page.getByRole('button',{name:'Dentro do ambiente',exact:true}).click();await expect(model).toHaveAttribute('data-view','inside');
  await page.getByRole('navigation',{name:'Ambientes da unidade'}).getByRole('button',{name:'Suíte 2'}).click();await expect(model).toHaveAttribute('data-walking','false');
  const before=await model.getAttribute('data-position'),button=page.getByRole('button',{name:'Caminhar para a frente'});await button.scrollIntoViewIfNeeded();const b=(await button.boundingBox())!;
  await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(500);await page.mouse.up();
  await expect(model).not.toHaveAttribute('data-position',before!);const after=await model.getAttribute('data-position');await page.waitForTimeout(250);await expect(model).toHaveAttribute('data-position',after!);
  await expect(model).toHaveAttribute('data-navigable','true');expect(await page.getByRole('dialog').evaluate(d=>d.scrollWidth<=d.clientWidth)).toBe(true);
  const hint=page.locator('.residence-model-hint'),hintBounds=(await hint.boundingBox())!,viewer=(await model.boundingBox())!;expect(hintBounds.x).toBeGreaterThanOrEqual(viewer.x);expect(hintBounds.x+hintBounds.width).toBeLessThanOrEqual(viewer.x+viewer.width+1);
});
