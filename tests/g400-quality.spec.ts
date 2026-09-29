import {test,expect} from '@playwright/test';

test('interior contact shading survives day, night, cutaway and mobile transitions',async({page},info)=>{
 test.setTimeout(120000);const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/THREE|WebGL|shader/i.test(message.text()))errors.push(message.text());});
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/apresentar/g400');await page.getByRole('button',{name:'Visitar Tipo 5',exact:true}).click();
 const model=page.getByTestId('g400-apartment-model');await expect(page.getByRole('button',{name:'Caminhar',exact:true})).toBeEnabled({timeout:45000});
 await expect(model).toHaveAttribute('data-shading','section');await page.getByRole('button',{name:'Caminhar',exact:true}).click();
 await expect(model).toHaveAttribute('data-shading','interior-contact');await page.screenshot({path:info.outputPath('living-day.png')});
 const intervals=await page.evaluate(()=>new Promise<number[]>(resolve=>{const samples:number[]=[];let last=performance.now();function frame(now:number){samples.push(now-last);last=now;if(samples.length<60)requestAnimationFrame(frame);else resolve(samples.slice(5));}requestAnimationFrame(frame);}));
 await info.attach('desktop-frame-intervals',{body:JSON.stringify(intervals),contentType:'application/json'});
 await page.getByLabel('Luz da apresentação').selectOption({label:'Noite'});await expect(model).toHaveAttribute('data-hour','21');await page.screenshot({path:info.outputPath('living-night.png')});
 await page.getByRole('button',{name:'Vista completa',exact:true}).click();await expect(model).toHaveAttribute('data-shading','section');
 await page.getByLabel('Luz da apresentação').selectOption({label:'Dia'});await page.getByRole('button',{name:'Caminhar',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await expect(model).toHaveAttribute('data-shading','interior-contact');
 await page.getByRole('button',{name:'Ambientes',exact:true}).click();await page.getByRole('button',{name:'Suíte 2',exact:true}).click();
 await expect(model).toHaveAttribute('data-navigable','true');expect(Number((await model.getAttribute('data-camera'))!.split(',')[1])).toBe(1.6);
 await page.screenshot({path:info.outputPath('suite-mobile.png')});expect(errors).toEqual([]);
});
