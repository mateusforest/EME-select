import {test,expect} from '@playwright/test';
test('Spatial Studio saves a project, estimates a pilot and requests a reviewed plan',async({page},testInfo)=>{
 const projects:any[]=[];let aiCalls=0;
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),method=route.request().method();
  let data:any={};
  if(url.pathname==='/api/auth/session')data={needsSetup:false,user:{id:'admin',name:'Admin Teste',role:'admin',email:'test@example.invalid',active:true,mustChangePassword:false}};
  else if(url.pathname==='/api/spatial-studio'&&method==='GET')data={projects,aiReady:true,productionReady:false};
  else if(url.pathname==='/api/spatial-studio'&&method==='POST'){const body=route.request().postDataJSON();data={id:'00000000-0000-4000-8000-000000000001',version:1,project:body.project,updatedAt:new Date().toISOString()};projects.push(data);}
  else if(url.pathname.endsWith('/plan')){aiCalls++;data={sourceVersion:1,plan:{summary:'Plano de teste para revisão',steps:['Validar a escala da planta','Medir tempo e retrabalho no piloto'],risks:'Projeto executivo pendente'}};}
  else if(url.pathname.startsWith('/api/spatial-studio/')&&method==='PATCH'){const body=route.request().postDataJSON();data={...projects[0],version:2,project:body.project};projects[0]=data;}
  await route.fulfill({json:data});
 });
 await page.goto('/portalselect/spatial');await expect(page.getByRole('heading',{name:'EME Spatial',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Salvar projeto',exact:true}).click();await expect(page.getByText('Projeto salvo no servidor.')).toBeVisible();
 await page.getByRole('button',{name:'02 · Orçamento e prazo'}).click();await expect(page.getByText('3 semanas',{exact:true})).toBeVisible();await expect(page.getByText('R$ 0',{exact:true})).toBeVisible();
 await page.getByLabel('Pessoas equivalentes').fill('1');await expect(page.getByText('5 semanas',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Salvar projeto',exact:true}).click();
 await page.getByRole('button',{name:'03 · Cenário'}).click();await page.getByRole('button',{name:'Criar plano com IA'}).click();await expect(page.getByText('Plano de teste para revisão')).toBeVisible();expect(aiCalls).toBe(1);
 await expect(page.getByRole('button',{name:'Criar plano com IA'})).toBeDisabled();
 await page.getByRole('button',{name:'01 · Projeto'}).click();await page.screenshot({path:testInfo.outputPath('spatial-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:testInfo.outputPath('spatial-mobile.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
});
