import {expect,test} from '@playwright/test';
const admin={id:'00000000-0000-4000-8000-000000000001',name:'Admin Teste',email:'admin@example.test',role:'admin',active:true,mustChangePassword:false};
const caseId='00000000-0000-4000-8000-000000000010';

test('only admins can explicitly interrupt an old processing run; this never starts another paid analysis',async({page})=>{
  let role='admin',ageMinutes=2,abandoned=false;
  const writes:string[]=[];
  const snapshot=()=>({settings:{configured:false,enabled:false,model:'gpt-5-mini',version:0,canConfigure:role==='admin'},properties:[{id:caseId,title:'Imóvel cadastrado',version:1}],runs:[{id:'00000000-0000-4000-8000-000000000101',caseId,caseVersion:1,actorName:admin.name,status:abandoned?'failed':'processing',task:'curadoria',provider:'OpenAI',model:'gpt-5-mini',createdAt:new Date(Date.now()-ageMinutes*60000).toISOString(),reviewVersion:0,...(abandoned?{error:'Execução interrompida por confirmação do administrador.'}:{})}]});
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/auth/session')return route.fulfill({json:{user:{...admin,role},needsSetup:false}});
    if(path==='/api/evaluations')return route.fulfill({json:{evaluations:[]}});
    if(path==='/api/assignees')return route.fulfill({json:{members:[{...admin,role}]}});
    if(path==='/api/intelligence')return route.fulfill({json:snapshot()});
    if(route.request().method()==='POST')writes.push(path);
    if(path==='/api/intelligence/abandon'){abandoned=true;return route.fulfill({json:snapshot()});}
    return route.fulfill({status:404,json:{error:'Unexpected test API '+path}});
  });
  await page.goto('/portalselect/inteligencia');
  await expect(page.locator('.pi-run')).toContainText('Em processamento');
  await expect(page.getByRole('button',{name:'Registrar como interrompida',exact:true})).toHaveCount(0);
  ageMinutes=10;role='corretor';await page.reload();
  await expect(page.locator('.pi-run')).toContainText('Em processamento');
  await expect(page.getByRole('button',{name:'Registrar como interrompida',exact:true})).toHaveCount(0);
  role='admin';await page.reload();
  await page.getByRole('button',{name:'Registrar como interrompida',exact:true}).click();
  const confirmation=page.getByRole('form',{name:'Confirmar interrupção da análise'});
  await expect(confirmation).toBeVisible();expect(writes).toHaveLength(0);
  await confirmation.getByRole('button',{name:'Manter em processamento',exact:true}).click();
  expect(writes).toHaveLength(0);await expect(page.locator('.pi-run')).toContainText('Em processamento');
  await page.getByRole('button',{name:'Registrar como interrompida',exact:true}).click();
  await page.getByRole('form',{name:'Confirmar interrupção da análise'}).getByRole('button',{name:'Confirmar interrupção',exact:true}).click();
  await expect(page.locator('.pi-run')).toContainText('Não concluída');
  expect(writes).toEqual(['/api/intelligence/abandon']);
  expect(writes).not.toContain('/api/intelligence/analyses');
});
