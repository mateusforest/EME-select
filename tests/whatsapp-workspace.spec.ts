import {test,expect} from '@playwright/test';
const admin={id:'00000000-0000-4000-8000-000000000001',name:'Administrador',email:'admin@example.test',role:'admin',active:true,mustChangePassword:false};
test('administrator sees server-key Astra and truthful WhatsApp setup on desktop and mobile',async({page})=>{
 let role='admin';const writes:string[]=[];
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;if(route.request().method()!=='GET')writes.push(path);
  if(path==='/api/auth/session')return route.fulfill({json:{user:{...admin,role},needsSetup:false}});
  if(path==='/api/intelligence')return route.fulfill({json:{settings:{configured:true,enabled:true,model:'gpt-6-astra',version:0,canConfigure:role==='admin',credentialSource:'server'},properties:[],runs:[]}});
  if(path==='/api/whatsapp/connection')return route.fulfill({json:{configured:false,enabled:false,receivingReady:false,storageReady:false,automaticReplies:false,expectedNumber:'5554991578029',callbackUrl:'https://www.emeselect.com/api/webhooks/whatsapp',fields:[{name:'WHATSAPP_BUSINESS_ACCOUNT_ID',label:'Conta empresarial do WhatsApp',configured:false},{name:'META_APP_SECRET',label:'Segredo do aplicativo Meta',configured:false}]}});
  return route.fulfill({status:404,json:{error:'Unexpected '+path}});
 });
 await page.goto('/portalselect/inteligencia');await page.getByRole('button',{name:'Configurar IA',exact:true}).click();await expect(page.getByLabel('Modelo',{exact:true})).toHaveValue('gpt-6-astra');await expect(page.getByText('Chave da OpenAI detectada na hospedagem.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Preparar WhatsApp',exact:true}).click();await expect(page.getByLabel('Endereço de retorno')).toHaveValue('https://www.emeselect.com/api/webhooks/whatsapp');await expect(page.getByRole('button',{name:'Testar conta e número'})).toBeDisabled();await expect(page.getByText('Respostas automáticas não estão ativadas.',{exact:false})).toBeVisible();
 await page.screenshot({path:'tmp/astra-whatsapp-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'tmp/astra-whatsapp-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(writes).toHaveLength(0);
 role='corretor';await page.reload();await expect(page.getByRole('button',{name:'Preparar WhatsApp'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Configurar IA'})).toHaveCount(0);
});
