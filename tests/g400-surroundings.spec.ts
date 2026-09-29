import {test,expect} from '@playwright/test';

test('the refined third-floor pilot is offered only for unit 305',async({page})=>{
 await page.goto('/apresentar/g400');await page.getByRole('button',{name:'Andares',exact:true}).click();
 await page.getByRole('button',{name:'2º andar',exact:true}).click();
 await expect(page.getByRole('button',{name:/205 · Tipo 5/})).toContainText('Ver planta');
 await page.getByRole('button',{name:'3º andar',exact:true}).click();
 await expect(page.getByRole('button',{name:/305 · Tipo 5/})).toContainText('Caminhar');
 await page.goto('/#/empreendimentos/g400');await page.getByRole('button',{name:'2º andar',exact:true}).click();
 await page.getByRole('button',{name:'Explorar unidade 205',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('button',{name:/Visita 3D/})).toHaveCount(0);
});

test('pilot has a third-floor exterior through its windows and preserves walking and cutaway modes',async({page},info)=>{
 test.setTimeout(120000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/i.test(m.text()))errors.push(m.text());});
 await page.goto('/apresentar/g400');await page.getByRole('button',{name:'Visitar Tipo 5',exact:true}).click();
 await page.getByRole('button',{name:'Caminhar',exact:true}).click();
 const model=page.getByTestId('g400-apartment-model'),canvas=model.locator('canvas');
 await expect(model).toHaveAttribute('data-exterior','illustrative-third-floor');
 await expect(model).toHaveAttribute('data-panorama','ready',{timeout:30000});
 await expect.poll(async()=>Number((await model.getAttribute('data-camera'))!.split(',')[1])).toBe(1.6);
 await page.waitForTimeout(500);
 async function face(yaw:number,pitch=-.13){
  const box=(await canvas.boundingBox())!,current=Number(await model.getAttribute('data-heading')),delta=Math.atan2(Math.sin(yaw-current),Math.cos(yaw-current));
  const dx=-delta/.005,dy=(pitch-Number(await model.getAttribute('data-pitch')))/.004;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2+dy,{steps:12});await page.mouse.up();
 }
 await face(-Math.PI);await page.screenshot({path:info.outputPath('living-window-day.png')});
 await face(-Math.PI/2);await page.screenshot({path:info.outputPath('living-side-window.png')});
 await page.getByLabel('Luz da apresentação').selectOption({label:'Noite'});await expect(model).toHaveAttribute('data-hour','21');
 await face(-Math.PI);await page.screenshot({path:info.outputPath('living-window-night.png')});
 await page.getByLabel('Luz da apresentação').selectOption({label:'Dia'});
 await page.getByRole('button',{name:'Ambientes',exact:true}).click();await page.getByRole('button',{name:'Cozinha',exact:true}).click();
 await expect(model).toHaveAttribute('data-walking','true');await expect(model).toHaveAttribute('data-walking','false',{timeout:45000});await page.waitForTimeout(600);
 expect(Number(await model.getAttribute('data-pitch'))).toBeGreaterThan(-.3);await expect(model).toHaveAttribute('data-navigable','true');
 await page.screenshot({path:info.outputPath('kitchen-refined.png')});
 await page.getByRole('button',{name:'Vista completa',exact:true}).click();await expect(model).toHaveAttribute('data-exterior','hidden');
 await page.screenshot({path:info.outputPath('cutaway-refined.png')});
 expect(errors).toEqual([]);
});

test('pilot keeps walking available when the illustrated panorama cannot load',async({page})=>{
 test.setTimeout(60000);
 await page.route('**/surroundings/vacaria-illustrative-day.png',route=>route.abort());
 await page.goto('/apresentar/g400');await page.getByRole('button',{name:'Visitar Tipo 5',exact:true}).click();
 await page.getByRole('button',{name:'Caminhar',exact:true}).click();
 const model=page.getByTestId('g400-apartment-model');
 await expect(model).toHaveAttribute('data-panorama','fallback');
 await expect.poll(async()=>Number((await model.getAttribute('data-camera'))!.split(',')[1])).toBe(1.6);
 await expect(model).toHaveAttribute('data-navigable','true');
});
