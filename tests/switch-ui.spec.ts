import {SWITCH_CONSENT_VERSION} from '../shared/switch-consent.mjs';
import {test,expect} from '@playwright/test';

test('cadastro público de comprador mantém opt-in separado e confirma recebimento',async({page})=>{
 let submitted:Record<string,unknown>|null=null;
 await page.route('**/api/public/switch',route=>{
  submitted=route.request().postDataJSON();
  return route.fulfill({status:201,json:{received:true,requestId:(submitted as Record<string,unknown>).requestId}});
 });
 await page.goto('/switch');
 await expect(page.getByRole('heading',{level:1})).toContainText('Seu próximo imóvel');
 await page.getByRole('button',{name:/Quero comprar/}).click();
 await page.getByLabel('Seu nome').fill('Compradora Sintética');
 await page.getByLabel('WhatsApp com DDD').fill('(54) 99999-9999');
 await page.getByLabel('Cidade onde deseja comprar').fill('Caxias do Sul');
 await page.getByLabel('Orçamento máximo previsto').fill('450000');
 await page.getByText('Li e concordo com o uso dos dados informados',{exact:false}).click();
 await page.getByText('Autorizo o contato da equipe M Select',{exact:false}).click();
 await page.getByRole('button',{name:'Solicitar análise'}).click();
 await expect(page.getByRole('heading',{name:'Agora temos um ponto de partida.'})).toBeVisible();
 expect(submitted).toMatchObject({
  kind:'buy',city:'Caxias do Sul',askingCents:45000000,
  privacyAccepted:true,contactConsent:true,updatesOptIn:false,consentVersion:SWITCH_CONSENT_VERSION
 });
});

test('página pública no celular evita rolagem horizontal',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/switch');
 await expect(page.getByRole('button',{name:/Quero trocar/})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test('profissional escolhe consentimentos desmarcados e envia a versão apresentada',async({page})=>{
 let submitted:Record<string,unknown>|null=null;
 await page.route('**/api/public/switch/professionals',route=>{
  submitted=route.request().postDataJSON();
  return route.fulfill({status:201,json:{received:true}});
 });
 await page.goto('/switch/profissionais');
 const optIn=page.getByRole('checkbox').nth(0),privacy=page.getByRole('checkbox').nth(1);
 await expect(optIn).not.toBeChecked();await expect(privacy).not.toBeChecked();
 await page.getByLabel('Nome completo').fill('Corretor Sintético');
 await page.getByLabel('WhatsApp com DDD').fill('(54) 99999-9999');
 await page.getByLabel('CRECI para conferência').fill('RS TESTE');
 await optIn.check();await privacy.check();
 await page.getByRole('button',{name:'Solicitar participação na rede'}).click();
 await expect(page.getByRole('heading',{name:'Cadastro recebido.'})).toBeVisible();
 expect(submitted).toMatchObject({whatsappOptIn:true,privacyAccepted:true,consentVersion:SWITCH_CONSENT_VERSION});
});

test('convite só mostra condições, exige ciência e não divulga contatos de comprador',async({page})=>{
 const token='A'.repeat(43);
 const payload={
  reference:'ABC123',city:'Vacaria',propertyType:'Casa',opportunity:'Conexão possível',
  estimatedSaleCents:60000000,brokerageBps:500,switchShareBps:3000,
  quoted:{grossCommissionCents:3000000,switchShareCents:900000,partnerShareCents:2100000},
  disclaimer:'Proposta indicativa',validUntil:new Date(Date.now()+86400000).toISOString(),state:'pending'
 };
 let response:Record<string,unknown>|null=null;
 await page.route('**/api/public/switch/offers/**',route=>{
   if(route.request().method()==='GET')return route.fulfill({status:200,json:{offer:payload}});
   response=route.request().postDataJSON();
   return route.fulfill({status:200,json:{registered:true}});
 });
 await page.goto('/switch/convite/'+token);
 await expect(page.getByText('R$ 9.000')).toBeVisible();
 await expect(page.getByText('Casa · Vacaria')).toBeVisible();
 await expect(page.getByText('Comprador Secreto')).toHaveCount(0);
 await page.getByLabel('Nome completo').fill('Corretor Sintético');
 await page.getByLabel('WhatsApp com DDD').fill('(54) 99999-9999');
 await page.getByLabel('Inscrição CRECI para conferência').fill('RS 12345');
 await page.getByText('Li os valores indicativos',{exact:false}).click();
 await page.getByText('Autorizo o tratamento das informações acima',{exact:false}).click();
 await page.getByRole('button',{name:/Registrar interesse/}).click();
 await expect(page.getByRole('heading',{name:'Interesse registrado.'})).toBeVisible();
 expect(response).toMatchObject({creci:'RS 12345',acknowledge:true,privacyAccepted:true,marketingOptIn:false});
});

test('cancelamento de avisos fica disponível sem exigir outro cadastro',async({page})=>{
 const token='B'.repeat(43);let sent=false;
 await page.route('**/api/public/switch/professionals/stop',route=>{
  sent=true;expect(route.request().postDataJSON()).toMatchObject({token});
  return route.fulfill({status:200,json:{ok:true}});
 });
 await page.goto('/switch/sair/'+token);
 await page.getByRole('button',{name:'Interromper mensagens'}).click();
 await expect(page.getByRole('heading',{name:'Avisos interrompidos.'})).toBeVisible();
 expect(sent).toBe(true);
});
