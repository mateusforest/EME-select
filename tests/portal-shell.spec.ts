import {test,expect,type Page} from '@playwright/test';
const user={id:'test-admin',name:'Mateus Exemplo',email:'admin@example.test',role:'admin',active:true,mustChangePassword:false};
async function setup(page:Page,market=true,role='admin'){
 await page.route('**/api.bcb.gov.br/**',route=>market?route.fulfill({json:[{data:'01/09/2026',valor:route.request().url().includes('432')?'14.25':'4.58'},{data:'01/01/2099',valor:'99'}]}):route.abort());
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth/session')return route.fulfill({json:{user:{...user,role},needsSetup:false}});
  if(path==='/api/evaluations')return route.fulfill({json:{evaluations:[]}});
  if(path==='/api/assignees')return route.fulfill({json:{members:[]}});
  if(path==='/api/listings')return route.fulfill({json:{listings:[]}});
  return route.fulfill({json:{leads:[],visits:[],commissions:[],items:[],people:[],properties:[],conversations:[],contacts:[],activities:[]}});
 });
 await page.goto('/portalselect');await expect(page.getByRole('heading',{name:'Seu próximo passo começa aqui.'})).toBeVisible();
}
test('green shell, official dated indicators, collapse persistence and account navigation',async({page})=>{
 await setup(page);
 const nav=page.getByRole('navigation',{name:'Navegação da equipe'});
 await expect(nav.getByRole('link',{name:'Meu dia',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.getByRole('button',{name:'Indicadores do mercado e fontes'})).toContainText('14,25%');
 await page.getByRole('button',{name:'Indicadores do mercado e fontes'}).click();await expect(page.getByRole('region',{name:'Referências dos indicadores'})).toContainText('01/09/2026');await page.keyboard.press('Escape');
 await page.screenshot({path:'test-results/select-shell-desktop.png',fullPage:false});
 await page.getByRole('button',{name:'Recolher menu'}).click();await expect(page.locator('.pt-live')).toHaveClass(/is-nav-collapsed/);await page.reload();await expect(page.locator('.pt-live')).toHaveClass(/is-nav-collapsed/);
 await page.getByRole('button',{name:'Expandir menu'}).click();await page.getByRole('button',{name:'Minha conta · Mateus Exemplo'}).click();await expect(page).toHaveURL(/\/conta$/);await expect(nav.getByRole('link',{name:'Minha conta',exact:true})).toHaveAttribute('aria-current','page');
});
test('calculator updates SAC and Price, validates values, preserves inputs and restores focus',async({page})=>{
 await setup(page);
 const trigger=page.getByRole('button',{name:'Abrir simulador de financiamento'});await trigger.click();const dialog=page.getByRole('dialog',{name:'Financiamento rápido'});
 await expect(dialog).toBeVisible();await expect(dialog).toContainText('400.000,00');
 await page.screenshot({path:'test-results/select-financing-desktop.png'});
 await dialog.getByLabel('Taxa efetiva anual (%)').fill('0');await dialog.getByLabel('Prazo (meses)').fill('100');await expect(dialog.locator('.sq-main-value')).toContainText('4.000,00');
 await dialog.getByRole('button',{name:/Price/}).click();await expect(dialog.locator('.sq-main-value')).toContainText('4.000,00');
 await dialog.getByLabel('Entrada (R$)').fill('600000');await expect(dialog).toContainText('Vamos ajustar os valores.');
 await dialog.getByLabel('Entrada (R$)').fill('100000');await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();await trigger.click();await expect(dialog.getByLabel('Prazo (meses)')).toHaveValue('100');
});
test('mobile drawer, small screen calculator and restricted role stay usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page,true,'corretor');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/select-shell-mobile.png'});
 await page.getByRole('button',{name:'Abrir navegação',exact:true}).click();const nav=page.getByRole('navigation',{name:'Navegação da equipe'});await expect(nav).toBeVisible();await expect(nav.getByRole('link',{name:'Central financeira'})).toHaveCount(0);
 await page.screenshot({path:'test-results/select-menu-mobile.png'});await page.getByRole('button',{name:'Fechar menu',exact:true}).click();
 await page.getByRole('button',{name:'Abrir simulador de financiamento'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:'test-results/select-financing-mobile.png'});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.keyboard.press('Escape');
});
test('indicator failure is explicit and does not prevent the calculator',async({page})=>{
 await setup(page,false);await expect(page.getByRole('button',{name:'Indicadores do mercado e fontes'})).toContainText('Indisponível');await page.getByRole('button',{name:'Abrir simulador de financiamento'}).click();await expect(page.getByRole('dialog')).toContainText('400.000,00');
});
