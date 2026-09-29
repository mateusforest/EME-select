import {test,expect} from '@playwright/test';
import {PerspectiveCamera,Vector3} from 'three';
import {TIPO5_SCALE} from '../src/developments/tipo5Navigation';
import {canWalk,walkRoute,clearWalk} from '../src/developments/tipo5Navigation';
import {tipo5Stations} from '../src/developments/g400Residences';

test('corrected plan protects closed boundaries, kitchen and bathrooms',()=>{
 for(const point of [[809,440],[1162,801],[948,728],[770,774],[1414,463],[1291,772],[1568,591]] as [number,number][])expect(canWalk(point)).toBe(false);
 for(const room of ['cozinha','suite-1','suite-2','lavabo','banho-1','banho-2','servico']){
  const route=walkRoute(tipo5Stations.living.eye,tipo5Stations[room].eye);expect(route.length).toBeGreaterThan(1);
  route.slice(1).forEach((point,i)=>expect(clearWalk(route[i],point)).toBe(true));
 }
});

test('selecting the pilot reveals the third floor within the building',async({page},info)=>{
 test.setTimeout(90000);await page.goto('/apresentar/g400');
 await page.getByRole('button',{name:'Visitar Tipo 5',exact:true}).click();const model=page.getByTestId('g400-apartment-model');
 await expect(model).toHaveAttribute('data-prepared','true',{timeout:45000});
 await expect(model).toHaveAttribute('data-section','third-floor');
 await expect(model).toHaveAttribute('data-view','overview');await page.screenshot({path:info.outputPath('third-floor-context.png')});
 // Pick a visible living-room floor point, ignoring the wall faces removed by the cut.
 const bounds=(await model.locator('canvas').boundingBox())!,camera=new PerspectiveCamera(42,bounds.width/bounds.height,.045,450);
 camera.position.fromArray((await model.getAttribute('data-camera'))!.split(',').map(Number));camera.lookAt(0,.4,10*TIPO5_SCALE);camera.updateMatrixWorld();
 const floorPoint=new Vector3((1060-1200)*TIPO5_SCALE,.01,(520-530)*TIPO5_SCALE).project(camera);
 await page.mouse.click(bounds.x+(floorPoint.x+1)/2*bounds.width,bounds.y+(1-floorPoint.y)/2*bounds.height);
 await expect(model).toHaveAttribute('data-view','inside');await expect(model).toHaveAttribute('data-navigable','true');
 await page.getByRole('button',{name:'Plantas',exact:true}).click();await expect(page.locator('.sp-photo img')).toHaveAttribute('src',/planta-tipo-5\.webp$/);
});

test('pilot opens as a building section and each corrected room remains usable',async({page},info)=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/apresentar/g400');
 await page.getByRole('button',{name:'Visitar Tipo 5',exact:true}).click();
 const model=page.getByTestId('g400-apartment-model');
 await expect(model).toHaveAttribute('data-section','third-floor',{timeout:45000});await expect(page.getByRole('button',{name:'Caminhar',exact:true})).toBeEnabled({timeout:30000});
 await page.screenshot({path:info.outputPath('01-building-cut.png')});
 await page.getByRole('button',{name:'Caminhar',exact:true}).click();
 await expect(model).toHaveAttribute('data-ceiling','continuous');await expect(model).toHaveAttribute('data-entrance','common-hall');await expect(model).toHaveAttribute('data-glazing','frosted');await expect(model).toHaveAttribute('data-panorama','disabled');
 for(const label of ['Living','Cozinha','Serviço','Suíte 1','Banho da suíte 1','Suíte 2','Banho da suíte 2','Lavabo']){
  await page.getByRole('button',{name:'Ambientes',exact:true}).click();await page.getByRole('button',{name:label,exact:true}).click();
  await expect(model).toHaveAttribute('data-navigable','true');await expect.poll(async()=>Number((await model.getAttribute('data-camera'))!.split(',')[1])).toBe(1.6);
  await page.screenshot({path:info.outputPath(label.replaceAll(' ','-')+'.png')});
 }
 // Inspect upward inside the kitchen: the shell remains continuous on every side.
 await page.getByRole('button',{name:'Ambientes',exact:true}).click();await page.getByRole('button',{name:'Cozinha',exact:true}).click();
 const bounds=(await model.locator('canvas').boundingBox())!;
 await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2+170,{steps:10});await page.mouse.up();
 await page.screenshot({path:info.outputPath('ceiling.png')});expect(errors).toEqual([]);
});
